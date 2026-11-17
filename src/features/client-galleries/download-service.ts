import type { D1Database } from "@cloudflare/workers-types";
import { getRuntimeValue, type RuntimeEnvironment } from "../../lib/env";

const DOWNLOAD_SIGNING_SECRET_FALLBACK = "lumio_client_download_signing_secret_2026";
const DEFAULT_DOWNLOAD_TOKEN_TTL_SECONDS = 60 * 15; // 15 minutes

export interface DownloadTokenPayload {
  galleryId: string;
  artworkId: string;
  resolution: "web" | "full_res";
  exp: number;
}

function base64UrlEncode(value: string): string {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string): string {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createAuthorizedDownloadToken(
  params: {
    galleryId: string;
    artworkId: string;
    resolution: "web" | "full_res";
  },
  runtimeEnv?: RuntimeEnvironment,
  ttlSeconds = DEFAULT_DOWNLOAD_TOKEN_TTL_SECONDS,
): Promise<string> {
  const secret = getRuntimeValue("SESSION_SECRET", runtimeEnv) || DOWNLOAD_SIGNING_SECRET_FALLBACK;
  const payload: DownloadTokenPayload = {
    ...params,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmacSha256(body, secret);
  return `${body}.${signature}`;
}

export async function verifyAuthorizedDownloadToken(
  token: string,
  runtimeEnv?: RuntimeEnvironment,
): Promise<DownloadTokenPayload | null> {
  if (!token || !token.includes(".")) {
    return null;
  }
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const secret = getRuntimeValue("SESSION_SECRET", runtimeEnv) || DOWNLOAD_SIGNING_SECRET_FALLBACK;
  const expectedSignature = await hmacSha256(body, secret);

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as DownloadTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function logDownloadEvent(
  db: D1Database,
  params: {
    collectionId: string;
    artworkId?: string | null;
    photographerId: string;
    storefrontId: string;
    visitorEmail?: string | null;
    downloadType: "single_web" | "single_full" | "full_gallery_zip";
  },
): Promise<void> {
  const id = `dl_${crypto.randomUUID()}`;
  await db
    .prepare(
      `INSERT INTO gallery_download_events (id, collection_id, artwork_id, photographer_id, storefront_id, visitor_email, download_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      params.collectionId,
      params.artworkId ?? null,
      params.photographerId,
      params.storefrontId,
      params.visitorEmail ?? null,
      params.downloadType,
    )
    .run()
    .catch(() => {
      // Non-blocking
    });
}

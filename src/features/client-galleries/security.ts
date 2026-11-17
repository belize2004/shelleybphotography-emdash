import type { APIContext } from "astro";
import { getRuntimeValue, type RuntimeEnvironment } from "../../lib/env";
import type { GallerySessionPayload } from "./types";

const SESSION_SIGNING_SECRET_FALLBACK = "lumio_client_gallery_signing_secret_2026";
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function generateRandomSalt(length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateAccessToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashGalleryPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password.trim()),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    256,
  );

  return [...new Uint8Array(derivedBits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyGalleryPassword(
  providedPassword: string,
  storedHash: string,
  storedSalt: string,
): Promise<boolean> {
  if (!providedPassword || !storedHash || !storedSalt) {
    return false;
  }
  const computedHash = await hashGalleryPassword(providedPassword, storedSalt);
  return computedHash === storedHash;
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
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getGallerySessionCookieName(galleryId: string): string {
  return `lumio_cg_${galleryId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)}`;
}

export async function createGallerySessionToken(
  payload: GallerySessionPayload,
  runtimeEnv?: RuntimeEnvironment,
  ttlSeconds = DEFAULT_SESSION_TTL_SECONDS,
): Promise<string> {
  const secret = getRuntimeValue("SESSION_SECRET", runtimeEnv) || SESSION_SIGNING_SECRET_FALLBACK;
  const tokenData = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = base64UrlEncode(JSON.stringify(tokenData));
  const signature = await hmacSha256(body, secret);
  return `${body}.${signature}`;
}

export async function verifyGallerySessionToken(
  token: string,
  expectedGalleryId: string,
  runtimeEnv?: RuntimeEnvironment,
): Promise<GallerySessionPayload | null> {
  if (!token || !token.includes(".")) {
    return null;
  }
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const secret = getRuntimeValue("SESSION_SECRET", runtimeEnv) || SESSION_SIGNING_SECRET_FALLBACK;
  const expectedSignature = await hmacSha256(body, secret);

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const data = JSON.parse(base64UrlDecode(body)) as GallerySessionPayload & { exp?: number };
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (data.galleryId !== expectedGalleryId) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setGallerySessionCookie(
  context: APIContext,
  galleryId: string,
  token: string,
  expiresInDays = 7,
): void {
  const cookieName = getGallerySessionCookieName(galleryId);
  const isLocal =
    context.url.hostname === "localhost" ||
    context.url.hostname === "127.0.0.1" ||
    context.url.hostname === "::1";

  const expires = new Date();
  expires.setDate(expires.getDate() + expiresInDays);

  context.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !isLocal,
    path: "/",
    expires,
  });
}

export async function resolveGallerySessionFromRequest(
  context: APIContext,
  galleryId: string,
): Promise<GallerySessionPayload | null> {
  const cookieName = getGallerySessionCookieName(galleryId);
  let cookieVal = context.cookies.get(cookieName)?.value;

  if (!cookieVal && context.request) {
    const rawCookies = context.request.headers.get("cookie") || "";
    const match = rawCookies.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
    if (match) {
      cookieVal = decodeURIComponent(match[1]);
    }
  }

  if (!cookieVal) {
    return null;
  }
  return verifyGallerySessionToken(cookieVal, galleryId, context.locals.runtime?.env);
}

export function getGalleryPinCookieName(galleryId: string): string {
  return `lumio_cg_pin_${galleryId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)}`;
}

export async function createGalleryPinToken(
  galleryId: string,
  runtimeEnv?: RuntimeEnvironment,
  ttlSeconds = DEFAULT_SESSION_TTL_SECONDS,
): Promise<string> {
  const secret = getRuntimeValue("SESSION_SECRET", runtimeEnv) || SESSION_SIGNING_SECRET_FALLBACK;
  const tokenData = {
    galleryId,
    pinVerified: true,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = base64UrlEncode(JSON.stringify(tokenData));
  const signature = await hmacSha256(body, secret);
  return `${body}.${signature}`;
}

export async function verifyGalleryPinToken(
  token: string,
  expectedGalleryId: string,
  runtimeEnv?: RuntimeEnvironment,
): Promise<boolean> {
  if (!token || !token.includes(".")) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;

  const secret = getRuntimeValue("SESSION_SECRET", runtimeEnv) || SESSION_SIGNING_SECRET_FALLBACK;
  const expectedSignature = await hmacSha256(body, secret);
  if (signature !== expectedSignature) return false;

  try {
    const data = JSON.parse(base64UrlDecode(body)) as { galleryId: string; pinVerified: boolean; exp?: number };
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return false;
    return data.galleryId === expectedGalleryId && Boolean(data.pinVerified);
  } catch {
    return false;
  }
}

export function setGalleryPinCookie(
  context: APIContext,
  galleryId: string,
  token: string,
  expiresInDays = 7,
): void {
  const cookieName = getGalleryPinCookieName(galleryId);
  const isLocal =
    context.url.hostname === "localhost" ||
    context.url.hostname === "127.0.0.1" ||
    context.url.hostname === "::1";

  const expires = new Date();
  expires.setDate(expires.getDate() + expiresInDays);

  context.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !isLocal,
    path: "/",
    expires,
  });
}

export async function resolveGalleryPinSession(
  context: APIContext,
  galleryId: string,
): Promise<boolean> {
  const cookieName = getGalleryPinCookieName(galleryId);
  let cookieVal = context.cookies.get(cookieName)?.value;

  if (!cookieVal && context.request) {
    const rawCookies = context.request.headers.get("cookie") || "";
    const match = rawCookies.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
    if (match) {
      cookieVal = decodeURIComponent(match[1]);
    }
  }

  if (!cookieVal) return false;
  return verifyGalleryPinToken(cookieVal, galleryId, context.locals.runtime?.env);
}

export function isGalleryExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  if (isNaN(expiry.getTime())) return false;
  return expiry.getTime() < Date.now();
}

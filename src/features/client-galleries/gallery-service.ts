import type { D1Database } from "@cloudflare/workers-types";
import type {
  ClientGalleryRecord,
  GalleryAccessType,
  GalleryType,
  GalleryPrivacyMode,
  GalleryDownloadResolution,
  WatermarkStyle,
  DigitalAllotmentSummary,
} from "./types";

interface RawCollectionRow {
  id: string;
  photographer_id: string;
  storefront_id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  cover_artwork_id: string | null;
  gallery_type: string | null;
  client_name: string | null;
  client_email: string | null;
  event_date: string | null;
  privacy_mode: string | null;
  password_hash: string | null;
  password_salt: string | null;
  access_token: string | null;
  require_email: number | null;
  favorites_enabled: number | null;
  downloads_enabled: number | null;
  download_resolution: string | null;
  download_pin_enabled: number | null;
  download_pin: string | null;
  full_gallery_download_enabled: number | null;
  store_enabled: number | null;
  sharing_enabled: number | null;
  watermark_enabled: number | null;
  watermark_style: string | null;
  watermark_custom_text: string | null;
  expires_at: string | null;
  digital_allotment_enabled?: number | null;
  digital_allotment_count?: number | null;
  digital_extra_price_cents?: number | null;
  allow_pose_tagging?: number | null;
  require_package_first?: number | null;
  min_spend_for_digitals_cents?: number | null;
  slideshow_enabled?: number | null;
  slideshow_music_track?: string | null;
  slideshow_curated_artwork_ids_json?: string | null;
  reveal_countdown_hours?: number | null;
  print_credit_balance_cents?: number | null;
  created_at: string;
  updated_at: string;
}

export function mapRawCollectionToClientGallery(row: RawCollectionRow): ClientGalleryRecord {
  let curatedArtworkIds: string[] = [];
  if (row.slideshow_curated_artwork_ids_json) {
    try {
      curatedArtworkIds = JSON.parse(row.slideshow_curated_artwork_ids_json);
    } catch {
      curatedArtworkIds = [];
    }
  }

  return {
    id: row.id,
    photographerId: row.photographer_id,
    storefrontId: row.storefront_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    coverArtworkId: row.cover_artwork_id,
    galleryType: (row.gallery_type as GalleryType) || "fine_art",
    clientName: row.client_name,
    clientEmail: row.client_email,
    eventDate: row.event_date,
    visibility: (row.privacy_mode as GalleryPrivacyMode) || "public",
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    accessToken: row.access_token,
    requirePassword: Boolean(row.password_hash && row.password_salt),
    requireEmail: Boolean(row.require_email),
    favoritesEnabled: row.favorites_enabled !== 0,
    downloadsEnabled: Boolean(row.downloads_enabled),
    downloadResolution: (row.download_resolution as GalleryDownloadResolution) || "web",
    downloadPinEnabled: Boolean(row.download_pin_enabled),
    downloadPin: row.download_pin,
    fullGalleryDownloadEnabled: Boolean(row.full_gallery_download_enabled),
    storeEnabled: row.store_enabled !== 0,
    sharingEnabled: row.sharing_enabled !== 0,
    watermarkEnabled: Boolean(row.watermark_enabled),
    watermarkStyle: (row.watermark_style as WatermarkStyle) || "standard",
    watermarkCustomText: row.watermark_custom_text,
    expiresAt: row.expires_at,
    digitalAllotmentEnabled: Boolean(row.digital_allotment_enabled),
    digitalAllotmentCount: row.digital_allotment_count ?? 0,
    digitalExtraPriceCents: row.digital_extra_price_cents ?? 0,
    allowPoseTagging: row.allow_pose_tagging !== 0,
    requirePackageFirst: Boolean(row.require_package_first),
    minSpendForDigitalsCents: row.min_spend_for_digitals_cents ?? 0,
    slideshowEnabled: row.slideshow_enabled !== 0,
    slideshowMusicTrack: row.slideshow_music_track ?? "cinematic_strings",
    slideshowCuratedArtworkIds: curatedArtworkIds,
    revealCountdownHours: row.reveal_countdown_hours ?? 0,
    printCreditBalanceCents: row.print_credit_balance_cents ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadClientGalleryBySlug(
  db: D1Database,
  storefrontId: string,
  slug: string,
): Promise<ClientGalleryRecord | null> {
  const row = await db
    .prepare(
      `SELECT * FROM collections WHERE storefront_id = ? AND slug = ? AND status != 'archived' LIMIT 1`,
    )
    .bind(storefrontId, slug)
    .first<RawCollectionRow>();

  if (!row) {
    return null;
  }

  return mapRawCollectionToClientGallery(row);
}

export async function loadClientGalleryById(
  db: D1Database,
  galleryId: string,
  photographerId?: string,
): Promise<ClientGalleryRecord | null> {
  const query = photographerId
    ? `SELECT * FROM collections WHERE id = ? AND photographer_id = ? LIMIT 1`
    : `SELECT * FROM collections WHERE id = ? LIMIT 1`;

  const stmt = photographerId
    ? db.prepare(query).bind(galleryId, photographerId)
    : db.prepare(query).bind(galleryId);

  const row = await stmt.first<RawCollectionRow>();
  if (!row) {
    return null;
  }

  return mapRawCollectionToClientGallery(row);
}

export async function listClientGalleriesForStorefront(
  db: D1Database,
  storefrontId: string,
  photographerId: string,
): Promise<ClientGalleryRecord[]> {
  const { results = [] } = await db
    .prepare(
      `SELECT * FROM collections 
       WHERE storefront_id = ? AND photographer_id = ? AND gallery_type = 'client' AND status != 'archived'
       ORDER BY COALESCE(event_date, created_at) DESC`,
    )
    .bind(storefrontId, photographerId)
    .all<RawCollectionRow>();

  return results.map(mapRawCollectionToClientGallery);
}

export async function logGalleryAccessEvent(
  db: D1Database,
  params: {
    collectionId: string;
    photographerId: string;
    storefrontId: string;
    visitorSessionId: string;
    visitorEmail?: string | null;
    accessType: GalleryAccessType;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const id = `evt_${crypto.randomUUID()}`;
    await db
      .prepare(
        `INSERT INTO gallery_access_events (id, collection_id, photographer_id, storefront_id, visitor_session_id, visitor_email, access_type, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        params.collectionId,
        params.photographerId,
        params.storefrontId,
        params.visitorSessionId,
        params.visitorEmail ?? null,
        params.accessType,
        params.metadata ? JSON.stringify(params.metadata) : null,
      )
      .run();
  } catch {
    // Non-blocking log
  }
}

export async function getDigitalAllotmentSummary(
  db: D1Database,
  galleryId: string,
  visitorSessionId: string,
): Promise<DigitalAllotmentSummary> {
  const gallery = await loadClientGalleryById(db, galleryId);
  if (!gallery || !gallery.digitalAllotmentEnabled || gallery.digitalAllotmentCount <= 0) {
    return {
      allotmentEnabled: false,
      allotmentLimit: 0,
      claimedCount: 0,
      totalFavoritesCount: 0,
      remainingFreeCount: 0,
      extraCount: 0,
      extraPriceCents: 0,
      extraTotalCents: 0,
    };
  }

  const limit = gallery.digitalAllotmentCount;
  const extraPriceCents = gallery.digitalExtraPriceCents;

  const countRow = await db
    .prepare(
      `SELECT 
        COUNT(*) as total_favorites,
        SUM(CASE WHEN is_allotment_claimed = 1 THEN 1 ELSE 0 END) as claimed_count
       FROM gallery_favorites 
       WHERE collection_id = ? AND visitor_session_id = ?`,
    )
    .bind(galleryId, visitorSessionId)
    .first<{ total_favorites: number; claimed_count: number | null }>();

  const totalFavoritesCount = countRow?.total_favorites ?? 0;
  const claimedCount = countRow?.claimed_count ?? Math.min(totalFavoritesCount, limit);
  const remainingFreeCount = Math.max(0, limit - claimedCount);
  const extraCount = Math.max(0, totalFavoritesCount - limit);
  const extraTotalCents = extraCount * extraPriceCents;

  return {
    allotmentEnabled: true,
    allotmentLimit: limit,
    claimedCount,
    totalFavoritesCount,
    remainingFreeCount,
    extraCount,
    extraPriceCents,
    extraTotalCents,
  };
}

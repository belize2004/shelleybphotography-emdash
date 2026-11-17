import type { D1Database } from "@cloudflare/workers-types";
import type { GalleryFavoriteItem, GallerySelectionSubmission, PoseTag } from "./types";

interface RawFavoriteRow {
  id: string;
  collection_id: string;
  artwork_id: string;
  photographer_id: string;
  storefront_id: string;
  visitor_session_id: string;
  visitor_email: string | null;
  visitor_name: string | null;
  selection_set_name: string;
  pose_tag: string | null;
  is_allotment_claimed: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RawSelectionRow {
  id: string;
  collection_id: string;
  photographer_id: string;
  storefront_id: string;
  visitor_email: string;
  visitor_name: string | null;
  selection_set_name: string;
  status: "submitted" | "in_review" | "completed";
  artwork_ids_json: string;
  notes: string | null;
  submitted_at: string;
}

export async function listFavoritesForVisitor(
  db: D1Database,
  collectionId: string,
  visitorSessionId: string,
): Promise<GalleryFavoriteItem[]> {
  const { results = [] } = await db
    .prepare(
      `SELECT * FROM gallery_favorites WHERE collection_id = ? AND visitor_session_id = ? ORDER BY created_at ASC`,
    )
    .bind(collectionId, visitorSessionId)
    .all<RawFavoriteRow>();

  return results.map((row) => ({
    id: row.id,
    collectionId: row.collection_id,
    artworkId: row.artwork_id,
    photographerId: row.photographer_id,
    storefrontId: row.storefront_id,
    visitorSessionId: row.visitor_session_id,
    visitorEmail: row.visitor_email,
    visitorName: row.visitor_name,
    selectionSetName: row.selection_set_name,
    poseTag: (row.pose_tag as PoseTag) || "standard",
    isAllotmentClaimed: Boolean(row.is_allotment_claimed),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function toggleFavorite(
  db: D1Database,
  params: {
    collectionId: string;
    artworkId: string;
    photographerId: string;
    storefrontId: string;
    visitorSessionId: string;
    visitorEmail?: string | null;
    visitorName?: string | null;
    selectionSetName?: string;
    poseTag?: PoseTag;
    notes?: string | null;
  },
): Promise<{ isFavorited: boolean; favoriteCount: number }> {
  const existing = await db
    .prepare(
      `SELECT id FROM gallery_favorites WHERE collection_id = ? AND artwork_id = ? AND visitor_session_id = ? LIMIT 1`,
    )
    .bind(params.collectionId, params.artworkId, params.visitorSessionId)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare(`DELETE FROM gallery_favorites WHERE id = ?`)
      .bind(existing.id)
      .run();
  } else {
    const id = `fav_${crypto.randomUUID()}`;
    await db
      .prepare(
        `INSERT INTO gallery_favorites (id, collection_id, artwork_id, photographer_id, storefront_id, visitor_session_id, visitor_email, visitor_name, selection_set_name, pose_tag, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        params.collectionId,
        params.artworkId,
        params.photographerId,
        params.storefrontId,
        params.visitorSessionId,
        params.visitorEmail ?? null,
        params.visitorName ?? null,
        params.selectionSetName ?? "Favorites",
        params.poseTag ?? "standard",
        params.notes ?? null,
      )
      .run();
  }

  const countResult = await db
    .prepare(
      `SELECT COUNT(*) as count FROM gallery_favorites WHERE collection_id = ? AND visitor_session_id = ?`,
    )
    .bind(params.collectionId, params.visitorSessionId)
    .first<{ count: number }>();

  return {
    isFavorited: !existing,
    favoriteCount: countResult?.count ?? 0,
  };
}

export async function updateFavoritePoseTag(
  db: D1Database,
  params: {
    collectionId: string;
    artworkId: string;
    visitorSessionId: string;
    poseTag: PoseTag;
  },
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE gallery_favorites SET pose_tag = ?, updated_at = CURRENT_TIMESTAMP
       WHERE collection_id = ? AND artwork_id = ? AND visitor_session_id = ?`,
    )
    .bind(params.poseTag, params.collectionId, params.artworkId, params.visitorSessionId)
    .run();

  return Boolean(result.success);
}

export async function updateFavoriteNotes(
  db: D1Database,
  params: {
    collectionId: string;
    artworkId: string;
    visitorSessionId: string;
    notes: string;
  },
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE gallery_favorites SET notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE collection_id = ? AND artwork_id = ? AND visitor_session_id = ?`,
    )
    .bind(params.notes, params.collectionId, params.artworkId, params.visitorSessionId)
    .run();

  return Boolean(result.success);
}

export async function setAllotmentClaimed(
  db: D1Database,
  params: {
    collectionId: string;
    visitorSessionId: string;
    artworkIds: string[];
    isClaimed: boolean;
  },
): Promise<boolean> {
  if (!params.artworkIds.length) return true;
  const placeholders = params.artworkIds.map(() => "?").join(",");
  const result = await db
    .prepare(
      `UPDATE gallery_favorites 
       SET is_allotment_claimed = ?, updated_at = CURRENT_TIMESTAMP
       WHERE collection_id = ? AND visitor_session_id = ? AND artwork_id IN (${placeholders})`,
    )
    .bind(params.isClaimed ? 1 : 0, params.collectionId, params.visitorSessionId, ...params.artworkIds)
    .run();

  return Boolean(result.success);
}

export async function submitClientSelection(
  db: D1Database,
  params: {
    collectionId: string;
    photographerId: string;
    storefrontId: string;
    visitorEmail: string;
    visitorName?: string | null;
    selectionSetName?: string;
    artworkIds: string[];
    notes?: string | null;
  },
): Promise<string> {
  const id = `sel_${crypto.randomUUID()}`;
  await db
    .prepare(
      `INSERT INTO gallery_selections (id, collection_id, photographer_id, storefront_id, visitor_email, visitor_name, selection_set_name, status, artwork_ids_json, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)`,
    )
    .bind(
      id,
      params.collectionId,
      params.photographerId,
      params.storefrontId,
      params.visitorEmail,
      params.visitorName ?? null,
      params.selectionSetName ?? "Favorites",
      JSON.stringify(params.artworkIds),
      params.notes ?? null,
    )
    .run();

  return id;
}

export async function listSelectionsForGallery(
  db: D1Database,
  collectionId: string,
  photographerId: string,
): Promise<GallerySelectionSubmission[]> {
  const { results = [] } = await db
    .prepare(
      `SELECT * FROM gallery_selections WHERE collection_id = ? AND photographer_id = ? ORDER BY submitted_at DESC`,
    )
    .bind(collectionId, photographerId)
    .all<RawSelectionRow>();

  return results.map((row) => {
    let artworkIds: string[] = [];
    try {
      artworkIds = JSON.parse(row.artwork_ids_json);
    } catch {
      artworkIds = [];
    }
    return {
      id: row.id,
      collectionId: row.collection_id,
      photographerId: row.photographer_id,
      storefrontId: row.storefront_id,
      visitorEmail: row.visitor_email,
      visitorName: row.visitor_name,
      selectionSetName: row.selection_set_name,
      status: row.status,
      artworkIds,
      notes: row.notes,
      submittedAt: row.submitted_at,
    };
  });
}

/**
 * Format filenames for Lightroom Classic or Capture One text filter search.
 * Generates comma-separated or space-separated list without extension or with extension.
 */
export function formatLightroomFilterString(
  filenames: (string | null | undefined)[],
  options: { stripExtension?: boolean; separator?: ", " | " " } = {},
): string {
  const { stripExtension = false, separator = ", " } = options;
  const cleaned = filenames
    .filter((name): name is string => Boolean(name && name.trim()))
    .map((name) => {
      const trimmed = name.trim();
      return stripExtension ? trimmed.replace(/\.[^/.]+$/, "") : trimmed;
    });

  return Array.from(new Set(cleaned)).join(separator);
}

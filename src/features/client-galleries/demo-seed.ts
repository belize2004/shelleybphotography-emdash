import type { D1Database } from "@cloudflare/workers-types";

export async function ensureDemoClientGalleries(
  db: D1Database,
  photographerId: string,
  storefrontId: string,
): Promise<void> {
  if (!db || !photographerId || !storefrontId) return;

  try {
    await db.batch([
      // 1. Ensure Collections
      db.prepare(
        `INSERT OR IGNORE INTO collections (
          id, photographer_id, storefront_id, slug, title, description, status,
          gallery_type, client_name, client_email, event_date, privacy_mode,
          access_token, require_email, favorites_enabled, downloads_enabled,
          download_resolution, download_pin_enabled, download_pin, store_enabled,
          sharing_enabled, watermark_enabled, slideshow_enabled, slideshow_music_track
        ) VALUES (
          'cg_sample_wedding', ?, ?, 'sarah-michael-wedding',
          'Sarah & Michael — Big Sur Wedding', 'Private viewing, proofing hearts, and archival fine-art print store for Sarah & Michael wedding ceremony.',
          'published', 'client', 'Sarah & Michael', 'sarah.michael@example.com', '2026-08-15', 'private',
          'token_sarah_michael_wedding_2026', 0, 1, 1,
          'both', 1, '4829', 1,
          1, 0, 1, 'cinematic_strings'
        )`,
      ).bind(photographerId, storefrontId),

      db.prepare(
        `INSERT OR IGNORE INTO collections (
          id, photographer_id, storefront_id, slug, title, description, status,
          gallery_type, client_name, client_email, event_date, privacy_mode,
          access_token, require_email, favorites_enabled, downloads_enabled,
          download_resolution, download_pin_enabled, download_pin, store_enabled,
          sharing_enabled, watermark_enabled, slideshow_enabled, slideshow_music_track
        ) VALUES (
          'cg_sample_family', ?, ?, 'kensington-family-aspen',
          'The Kensington Family — Aspen Portrait Session', 'Autumn family portrait session in Aspen, Colorado. Proofing selections for holiday cards and archival wall art.',
          'published', 'client', 'Eleanor & James Kensington', 'eleanor.kensington@example.com', '2026-10-04', 'private',
          'token_kensington_family_2026', 0, 1, 1,
          'both', 1, '7193', 1,
          1, 0, 1, 'acoustic_warmth'
        )`,
      ).bind(photographerId, storefrontId),

      // 2. Wedding Artworks
      db.prepare(
        `INSERT OR IGNORE INTO artworks (
          id, photographer_id, storefront_id, title, slug, description, alt_text, location, category, orientation,
          status, original_file_name, original_file_size_bytes, width_px, height_px
        ) VALUES
          ('art_cg_1', ?, ?, 'Ceremony at Big Sur Cliffs', 'ceremony-at-big-sur-cliffs', 'Sarah & Michael exchanging vows over the Pacific cliffs.', 'Bride and groom holding hands during wedding ceremony at Big Sur cliffs', 'Big Sur, California', 'Wedding', 'landscape', 'published', 'DSC_8492.RAW', 45200000, 6000, 4000),
          ('art_cg_2', ?, ?, 'Golden Hour Vows', 'golden-hour-vows', 'Golden light washing over the coastline as vows are read.', 'Golden hour sunlight illuminating bride and groom near coastal overlook', 'Big Sur, California', 'Wedding', 'landscape', 'published', 'DSC_8510.RAW', 46100000, 6000, 4000),
          ('art_cg_3', ?, ?, 'First Dance in the Redwoods', 'first-dance-in-the-redwoods', 'First dance surrounded by ancient California redwoods.', 'Newlyweds first dance under towering redwood trees with string lights', 'Big Sur, California', 'Wedding', 'portrait', 'published', 'DSC_8622.RAW', 44800000, 4000, 6000),
          ('art_cg_4', ?, ?, 'Bridal Portrait in Pacific Mist', 'bridal-portrait-pacific-mist', 'Editorial bridal portrait with soft ocean breeze.', 'Cinematic bridal portrait in natural ocean breeze and evening fog', 'Big Sur, California', 'Wedding', 'portrait', 'published', 'DSC_8640.RAW', 47200000, 4000, 6000),
          ('art_cg_5', ?, ?, 'Archival Keepsake & Rings Detail', 'archival-keepsake-rings-detail', 'Macro detail of platinum wedding bands on handmade linen.', 'Macro close up of wedding rings resting on fine art archival textured linen', 'Big Sur, California', 'Wedding', 'landscape', 'published', 'DSC_8702.RAW', 42100000, 6000, 4000),
          ('art_cg_6', ?, ?, 'Sunset Sea Stacks & Reception', 'sunset-sea-stacks-reception', 'Twilight setting in over the Pacific during the dinner reception.', 'Sunset purple sky and dramatic sea stacks backdrop during outdoor dinner', 'Big Sur, California', 'Wedding', 'landscape', 'published', 'DSC_8790.RAW', 48900000, 6000, 4000),
          ('art_cg_7', ?, ?, 'Bridal Party on the Overlook', 'bridal-party-on-the-overlook', 'Celebration with closest friends above the Pacific ocean.', 'Wedding party smiling together along the scenic coastal bluff', 'Big Sur, California', 'Wedding', 'landscape', 'published', 'DSC_8834.RAW', 45600000, 6000, 4000),
          ('art_cg_8', ?, ?, 'Sparkler Farewell', 'sparkler-farewell', 'End of the evening sparkler exit under the night sky.', 'Bride and groom walking through glowing sparkler archway at night', 'Big Sur, California', 'Wedding', 'landscape', 'published', 'DSC_8912.RAW', 43800000, 6000, 4000)
        `,
      ).bind(photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId),

      // 3. Family Artworks
      db.prepare(
        `INSERT OR IGNORE INTO artworks (
          id, photographer_id, storefront_id, title, slug, description, alt_text, location, category, orientation,
          status, original_file_name, original_file_size_bytes, width_px, height_px
        ) VALUES
          ('art_cg_fam_1', ?, ?, 'Aspen Grove Family Stroll', 'aspen-grove-family-stroll', 'The Kensington family walking through golden fall foliage.', 'Family of four walking through vibrant yellow aspen trees in Colorado mountains', 'Aspen, Colorado', 'Portrait', 'landscape', 'published', 'IMG_4102.RAW', 46000000, 6000, 4000),
          ('art_cg_fam_2', ?, ?, 'Children in Autumn Leaves', 'children-in-autumn-leaves', 'Siblings playing with fallen leaves in warm sunlight.', 'Two children smiling and playing with golden autumn leaves in the forest', 'Aspen, Colorado', 'Portrait', 'landscape', 'published', 'IMG_4155.RAW', 44000000, 6000, 4000),
          ('art_cg_fam_3', ?, ?, 'Parent Portrait by Mountain Stream', 'parent-portrait-mountain-stream', 'Quiet moment beside roaring alpine waters.', 'Parents embracing next to crystal clear mountain stream with autumn background', 'Aspen, Colorado', 'Portrait', 'portrait', 'published', 'IMG_4210.RAW', 48000000, 4000, 6000),
          ('art_cg_fam_4', ?, ?, 'Sunset Mountain Ridgeline', 'sunset-mountain-ridgeline', 'Family silhouetted against dramatic Rocky Mountain peaks.', 'Scenic Rocky Mountain vista during golden hour with warm sunset glow', 'Aspen, Colorado', 'Portrait', 'landscape', 'published', 'IMG_4288.RAW', 51000000, 6000, 4000)
        `,
      ).bind(photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId),

      // 4. Artwork Display Variants
      db.prepare(
        `INSERT OR IGNORE INTO artwork_variants (id, artwork_id, variant_type, storage_key, width_px, height_px, file_size_bytes) VALUES
          ('var_cg_1', 'art_cg_1', 'display', '/assets/lumio/mock/photo-1518562180175-34a163b1a9a6.jpg', 2400, 1600, 540768),
          ('var_cg_2', 'art_cg_2', 'display', '/assets/lumio/mock/photo-1519681393784-d120267933ba.jpg', 2400, 1600, 448476),
          ('var_cg_3', 'art_cg_3', 'display', '/assets/lumio/mock/photo-1517841905240-472988babdf9.jpg', 1600, 2400, 752518),
          ('var_cg_4', 'art_cg_4', 'display', '/assets/lumio/mock/photo-1500648767791-00dcc994a43e.jpg', 1600, 2400, 1132737),
          ('var_cg_5', 'art_cg_5', 'display', '/assets/lumio/mock/photo-1516035069371-29a1b244cc32.jpg', 2400, 1600, 366097),
          ('var_cg_6', 'art_cg_6', 'display', '/assets/lumio/mock/photo-1507525428034-b723cf961d3e.jpg', 2400, 1600, 282900),
          ('var_cg_7', 'art_cg_7', 'display', '/assets/lumio/mock/photo-1469854523086-cc02fe5d8800.jpg', 2400, 1600, 624150),
          ('var_cg_8', 'art_cg_8', 'display', '/assets/lumio/mock/photo-1518005020951-eccb494ad742.jpg', 2400, 1600, 540064),
          ('var_cg_fam_1', 'art_cg_fam_1', 'display', '/assets/lumio/mock/photo-1508193638397-1c4234db14d8.jpg', 2400, 1600, 1238131),
          ('var_cg_fam_2', 'art_cg_fam_2', 'display', '/assets/lumio/mock/photo-1500530855697-b586d89ba3ee.jpg', 2400, 1600, 914015),
          ('var_cg_fam_3', 'art_cg_fam_3', 'display', '/assets/lumio/mock/photo-1501785888041-af3ef285b470.jpg', 1600, 2400, 586446),
          ('var_cg_fam_4', 'art_cg_fam_4', 'display', '/assets/lumio/mock/photo-1506286738626-2bce5253381d.jpg', 2400, 1600, 583672)
        `,
      ),

      // 5. Link Artworks to Collections
      db.prepare(
        `INSERT OR IGNORE INTO collection_artworks (collection_id, artwork_id, photographer_id, storefront_id, sort_order) VALUES
          ('cg_sample_wedding', 'art_cg_1', ?, ?, 1),
          ('cg_sample_wedding', 'art_cg_2', ?, ?, 2),
          ('cg_sample_wedding', 'art_cg_3', ?, ?, 3),
          ('cg_sample_wedding', 'art_cg_4', ?, ?, 4),
          ('cg_sample_wedding', 'art_cg_5', ?, ?, 5),
          ('cg_sample_wedding', 'art_cg_6', ?, ?, 6),
          ('cg_sample_wedding', 'art_cg_7', ?, ?, 7),
          ('cg_sample_wedding', 'art_cg_8', ?, ?, 8),
          ('cg_sample_family', 'art_cg_fam_1', ?, ?, 1),
          ('cg_sample_family', 'art_cg_fam_2', ?, ?, 2),
          ('cg_sample_family', 'art_cg_fam_3', ?, ?, 3),
          ('cg_sample_family', 'art_cg_fam_4', ?, ?, 4)
        `,
      ).bind(photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId),

      // 6. Client Proofing Favorites & Notes
      db.prepare(
        `INSERT OR IGNORE INTO gallery_favorites (
          id, collection_id, artwork_id, photographer_id, storefront_id,
          visitor_session_id, visitor_email, visitor_name, selection_set_name, pose_tag, notes
        ) VALUES
          ('fav_demo_1', 'cg_sample_wedding', 'art_cg_1', ?, ?, 'session_sarah', 'sarah@example.com', 'Sarah', 'Album Picks', 'favorite', 'Love the natural lighting on this frame for our living room wall!'),
          ('fav_demo_2', 'cg_sample_wedding', 'art_cg_4', ?, ?, 'session_sarah', 'sarah@example.com', 'Sarah', 'Album Picks', 'favorite', 'My favorite bridal portrait by far.'),
          ('fav_demo_3', 'cg_sample_wedding', 'art_cg_7', ?, ?, 'session_michael', 'michael@example.com', 'Michael', 'Wall Art Selections', 'favorite', 'Ordering a 24x36 metal print of the cliffside party.'),
          ('fav_demo_4', 'cg_sample_family', 'art_cg_fam_1', ?, ?, 'session_eleanor', 'eleanor.kensington@example.com', 'Eleanor', 'Holiday Cards', 'favorite', 'This is the winning shot for our holiday card cover!'),
          ('fav_demo_5', 'cg_sample_family', 'art_cg_fam_3', ?, ?, 'session_eleanor', 'eleanor.kensington@example.com', 'Eleanor', 'Framed Prints', 'favorite', 'Ordering a 20x30 framed canvas for above the fireplace.')
        `,
      ).bind(photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId, photographerId, storefrontId),
    ]);
  } catch (err) {
    console.error("ensureDemoClientGalleries error:", err);
  }
}

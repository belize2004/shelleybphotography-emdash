export function getArtworkR2Bucket(locals: App.Locals): R2Bucket {
  // In instagraminspo wrangler.jsonc, the R2 bucket binding is named "MEDIA" (or fallback to R2_ARTWORKS)
  const bucket = locals.runtime?.env?.MEDIA || (locals.runtime?.env as any)?.R2_ARTWORKS;

  if (!bucket) {
    throw new Error("MEDIA / R2 bucket binding is not configured.");
  }

  return bucket;
}

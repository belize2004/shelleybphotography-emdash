export type GalleryType = "fine_art" | "client";
export type GalleryPrivacyMode = "public" | "unlisted" | "private";
export type GalleryDownloadResolution = "web" | "full_res" | "both";
export type WatermarkStyle = "subtle" | "standard" | "maximum_protection";
export type PoseTag = "standard" | "yearbook" | "retouch_request" | "album_selection" | "social_share";

export type GalleryAccessType =
  | "view"
  | "password_success"
  | "password_failure"
  | "favorite"
  | "selection_submit"
  | "download_single"
  | "download_full";

export interface ClientGallerySettings {
  galleryType: GalleryType;
  visibility: GalleryPrivacyMode;
  clientName: string | null;
  clientEmail: string | null;
  eventDate: string | null;
  requirePassword: boolean;
  requireEmail: boolean;
  favoritesEnabled: boolean;
  downloadsEnabled: boolean;
  downloadResolution: GalleryDownloadResolution;
  downloadPinEnabled: boolean;
  downloadPin: string | null;
  fullGalleryDownloadEnabled: boolean;
  storeEnabled: boolean;
  sharingEnabled: boolean;
  watermarkEnabled: boolean;
  watermarkStyle: WatermarkStyle;
  watermarkCustomText: string | null;
  expiresAt: string | null;
  digitalAllotmentEnabled: boolean;
  digitalAllotmentCount: number;
  digitalExtraPriceCents: number;
  allowPoseTagging: boolean;
  requirePackageFirst: boolean;
  minSpendForDigitalsCents: number;
  slideshowEnabled: boolean;
  slideshowMusicTrack: string | null;
  slideshowCuratedArtworkIds: string[];
  revealCountdownHours: number;
  printCreditBalanceCents: number;
}

export interface ClientGalleryRecord extends ClientGallerySettings {
  id: string;
  photographerId: string;
  storefrontId: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  coverArtworkId: string | null;
  passwordHash: string | null;
  passwordSalt: string | null;
  accessToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryFavoriteItem {
  id: string;
  collectionId: string;
  artworkId: string;
  photographerId: string;
  storefrontId: string;
  visitorSessionId: string;
  visitorEmail: string | null;
  visitorName: string | null;
  selectionSetName: string;
  poseTag: PoseTag;
  isAllotmentClaimed: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GallerySelectionSubmission {
  id: string;
  collectionId: string;
  photographerId: string;
  storefrontId: string;
  visitorEmail: string;
  visitorName: string | null;
  selectionSetName: string;
  status: "submitted" | "in_review" | "completed";
  artworkIds: string[];
  notes: string | null;
  submittedAt: string;
}

export interface GallerySessionPayload {
  galleryId: string;
  visitorSessionId: string;
  visitorEmail?: string | null;
  visitorName?: string | null;
  authenticatedAt: number;
}

export interface DigitalAllotmentSummary {
  allotmentEnabled: boolean;
  allotmentLimit: number;
  claimedCount: number;
  totalFavoritesCount: number;
  remainingFreeCount: number;
  extraCount: number;
  extraPriceCents: number;
  extraTotalCents: number;
}

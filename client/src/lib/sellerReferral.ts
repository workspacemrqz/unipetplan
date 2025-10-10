/**
 * Utility for managing seller referral tracking
 * Persists seller referrals across page navigation
 */

const REFERRAL_KEY = "unipet_seller_referral";
const REFERRAL_EXPIRY_DAYS = 7; // Referência válida por 7 dias

export interface SellerReferral {
  sellerId: string;
  sellerSlug: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * Set a seller referral in localStorage
 * This persists the referral across page navigation
 */
export function setSellerReferral(sellerId: string, sellerSlug: string): void {
  const now = Date.now();
  const expiresAt = now + (REFERRAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  
  const referral: SellerReferral = {
    sellerId,
    sellerSlug,
    timestamp: now,
    expiresAt,
  };
  
  try {
    localStorage.setItem(REFERRAL_KEY, JSON.stringify(referral));
    console.log(`[Referral] Seller referral set: ${sellerSlug} (ID: ${sellerId})`);
  } catch (error) {
    console.error("[Referral] Failed to set seller referral:", error);
  }
}

/**
 * Get the current active seller referral
 * Returns null if no referral exists or if it has expired
 */
export function getSellerReferral(): SellerReferral | null {
  try {
    const stored = localStorage.getItem(REFERRAL_KEY);
    if (!stored) {
      return null;
    }
    
    const referral: SellerReferral = JSON.parse(stored);
    const now = Date.now();
    
    // Check if referral has expired
    if (now > referral.expiresAt) {
      console.log("[Referral] Seller referral expired, removing");
      clearSellerReferral();
      return null;
    }
    
    console.log(`[Referral] Active referral found: ${referral.sellerSlug} (ID: ${referral.sellerId})`);
    return referral;
  } catch (error) {
    console.error("[Referral] Failed to get seller referral:", error);
    return null;
  }
}

/**
 * Clear the seller referral from localStorage
 */
export function clearSellerReferral(): void {
  try {
    localStorage.removeItem(REFERRAL_KEY);
    console.log("[Referral] Seller referral cleared");
  } catch (error) {
    console.error("[Referral] Failed to clear seller referral:", error);
  }
}

/**
 * Get the seller ID from the current referral (if any)
 * This is a convenience function for checkout/payment flows
 */
export function getSellerIdFromReferral(): string | null {
  const referral = getSellerReferral();
  return referral?.sellerId || null;
}

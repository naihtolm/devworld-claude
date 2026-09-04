// Pure copy/threshold logic, deliberately separated from the DB queries in
// platformTrust.ts (same reasoning as modules/payments/fees.ts vs
// stripe.ts) so it can be unit tested without a live database connection.

export function shouldShowTrustSection(totalReviews: number): boolean {
  return totalReviews > 0;
}

// True at any volume — doesn't need to change wording as the number grows,
// just the count baked into it.
export function trustSectionSubcopy(totalReviews: number): string {
  return `Every review on Devworld comes from a real completed project — ${totalReviews} so far.`;
}

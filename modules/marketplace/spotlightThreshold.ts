// Pure threshold logic, deliberately separated from the DB queries in
// spotlight.ts (same reasoning as modules/reviews/trustCopy.ts vs
// platformTrust.ts) so it can be unit tested without a live database.

export function meetsFeaturedThreshold(count: number, min: number): boolean {
  return count >= min;
}

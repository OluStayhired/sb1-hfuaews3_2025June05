// src/utils/tokenUtils.ts (or similar utility file)
import { addSeconds, differenceInDays, format } from 'date-fns';

/**
 * Calculates the number of days remaining until a LinkedIn access token expires.
 *
 * @param expiresInSeconds The 'expires_in' value (in seconds) from the LinkedIn OAuth response.
 * @returns The number of full days remaining until the token expires. Returns 0 if already expired.
 */
export function getLinkedInTokenDaysRemaining(expiresInSeconds: number): number {
  // LinkedIn's expires_in is typically a number of seconds from the moment the token is issued.
  // We'll subtract a small buffer (e.g., 60 seconds) to account for network latency and processing time,
  // ensuring we consider the token "expired" slightly before its absolute last second.
  const bufferSeconds = 60; // 1 minute buffer

  if (expiresInSeconds <= bufferSeconds) {
    return 0; // Token is already expired or will expire very soon
  }

  const now = new Date();
  // Calculate the exact expiration moment
  const expirationDate = addSeconds(now, expiresInSeconds);

  // Subtract the buffer from the expiration date
  const effectiveExpirationDate = addSeconds(expirationDate, -bufferSeconds);

  // Calculate the difference in full days
  const daysRemaining = differenceInDays(effectiveExpirationDate, now);

  // Ensure the result is not negative (e.g., if it expired within the last day)
  return Math.max(0, daysRemaining);
}

/**
 * Calculates the exact UTC timestamp when a LinkedIn access token will expire.
 * This is useful for storing in the database.
 *
 * @param expiresInSeconds The 'expires_in' value (in seconds) from the LinkedIn OAuth response.
 * @returns An ISO 8601 string representing the UTC expiration timestamp.
 */
export function getLinkedInTokenExpiresAt(expiresInSeconds: number): string {
  const now = new Date();
  const expirationDate = addSeconds(now, expiresInSeconds);
  return expirationDate.toISOString(); // Returns UTC timestamp
}

// Example Usage (for testing purposes, not part of the main function)
// const expiresIn = 86400; // 24 hours in seconds
// const daysLeft = getLinkedInTokenDaysRemaining(expiresIn);
// console.log(`Days remaining: ${daysLeft}`); // Output: Days remaining: 0 (if less than 1 day) or 1 (if exactly 24 hours)

// const expiresAt = getLinkedInTokenExpiresAt(expiresIn);
// console.log(`Expires at: ${expiresAt}`);

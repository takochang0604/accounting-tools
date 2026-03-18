/**
 * Lightweight page-view counter using CounterAPI (counterapi.dev).
 * No Firebase, no sign-up, no config needed.
 * Same visitor can count multiple times (no dedup by IP).
 *
 * API docs: https://counterapi.dev/
 * Endpoint:
 *   GET  https://api.counterapi.dev/v1/{namespace}/{key}/up   → increment & return new total
 *   GET  https://api.counterapi.dev/v1/{namespace}/{key}      → read current total (no increment)
 */

const COUNTER_NAMESPACE = 'twai-accounting-tools';
const COUNTER_KEY       = 'visits';
const BASE_URL          = `https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}`;

/**
 * Increment the counter by 1 and return the new total.
 * Call this once when a user successfully logs in.
 * @returns {Promise<number|null>} current count, or null on failure
 */
export async function hitCounter() {
  try {
    const res  = await fetch(`${BASE_URL}/up`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.count === 'number' ? data.count : null;
  } catch {
    return null;
  }
}

/**
 * Read the current counter value WITHOUT incrementing.
 * Use this to display the count on the login page.
 * @returns {Promise<number|null>} current count, or null on failure
 */
export async function getCounter() {
  try {
    const res  = await fetch(BASE_URL);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.count === 'number' ? data.count : null;
  } catch {
    return null;
  }
}

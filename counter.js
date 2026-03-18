/**
 * Lightweight page-view counter using CounterAPI (counterapi.dev).
 * No Firebase, no sign-up, no config needed.
 * Same visitor can count multiple times (no dedup by IP).
 *
 * API docs: https://counterapi.dev/
 * Endpoint: GET https://api.counterapi.dev/v1/{namespace}/{key}/up
 */

const COUNTER_URL =
  'https://api.counterapi.dev/v1/twai-accounting-tools/visits/up';

/**
 * Increment the counter by 1 and return the new total.
 * @returns {Promise<number|null>} current count, or null on failure
 */
export async function hitCounter() {
  try {
    const res  = await fetch(COUNTER_URL);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.count === 'number' ? data.count : null;
  } catch {
    return null;
  }
}

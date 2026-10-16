import Stripe from 'stripe';

// Pin the API version explicitly. Your account also has a default version
// (Dashboard > Developers), but requests from this SDK always send this one,
// so response shapes match the SDK's TypeScript types.
export const API_VERSION = '2026-09-30.endive' as const;

let client: Stripe | undefined;

export function stripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_...') {
    throw new Error('STRIPE_SECRET_KEY is not set. Copy .env.example to .env and add a test key.');
  }
  if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
    throw new Error('Refusing to run with a non-test key. These labs create and delete real objects.');
  }

  client = new Stripe(key, {
    apiVersion: API_VERSION,
    // The SDK retries network errors and 409/5xx responses, and reuses one
    // idempotency key across retries so a retried POST can't double-charge.
    maxNetworkRetries: 2,
    appInfo: { name: 'stripe-labs' },
  });
  return client;
}

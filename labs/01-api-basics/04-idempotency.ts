// Lab 1.4 — Idempotency keys make POSTs safe to retry.
// Run: npm run lab labs/01-api-basics/04-idempotency.ts
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { stripe } from '../../src/lib/stripe.ts';
import { describeError, heading, run, RUN_ID } from '../../src/lib/cli.ts';

run(async () => {
  const s = stripe();
  // In a real app, derive the key from your own state, such as `order_123:create_payment`.
  // A random key per attempt is no better than no key.
  const key = randomUUID();
  const params = { name: 'Idempotent Ian', metadata: { lab: '01', run: RUN_ID } };

  heading('Same key, same params → the original response is replayed');
  const a = await s.customers.create(params, { idempotencyKey: key });
  const b = await s.customers.create(params, { idempotencyKey: key });
  console.log({ first: a.id, second: b.id, same: a.id === b.id });
  // Stripe marks replays with this response header:
  console.log('Idempotent-Replayed header:', b.lastResponse.headers['idempotent-replayed']);

  heading('Same key, different params → rejected');
  try {
    await s.customers.create({ ...params, name: 'Someone Else' }, { idempotencyKey: key });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) console.log(describeError(err)); // type: idempotency_error
    else throw err;
  }

  heading('No key → two distinct customers');
  const c = await s.customers.create(params);
  const d = await s.customers.create(params);
  console.log({ c: c.id, d: d.id, same: c.id === d.id });

  // Notes:
  // - Keys expire after 24h.
  // - A replay returns the saved response, errors included: a 400 stays a 400 for that key.
  // - GET and DELETE are idempotent already and ignore the header.
});

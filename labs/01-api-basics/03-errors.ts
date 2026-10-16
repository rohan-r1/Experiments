// Lab 1.3 — The error taxonomy. Production integrations branch on err.type / err.code,
// never on err.message.
// Run: npm run lab labs/01-api-basics/03-errors.ts
import Stripe from 'stripe';
import { stripe, API_VERSION } from '../../src/lib/stripe.ts';
import { describeError, heading, run } from '../../src/lib/cli.ts';

async function attempt(label: string, fn: () => Promise<unknown>) {
  heading(label);
  try {
    await fn();
    console.log('(no error?)');
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) console.log(describeError(err));
    else throw err;
  }
}

run(async () => {
  const s = stripe();

  // 404, StripeInvalidRequestError, code=resource_missing
  await attempt('Retrieve an object that does not exist', () => s.customers.retrieve('cus_doesnotexist'));

  // 400, StripeInvalidRequestError, code=parameter_missing; err.param names the field
  await attempt('Missing a required parameter', () =>
    s.paymentIntents.create({ currency: 'usd' } as Stripe.PaymentIntentCreateParams),
  );

  // 401, StripeAuthenticationError
  await attempt('Bad API key', () =>
    new Stripe('sk_test_invalid', { apiVersion: API_VERSION }).customers.list({ limit: 1 }),
  );

  // 402, StripeCardError. The request was valid; the card was declined.
  // decline_code gives the issuer's reason. Show customers a generic message for
  // codes like fraudulent or stolen_card.
  await attempt('Card declined (insufficient funds)', () =>
    s.paymentIntents.create({
      amount: 1000,
      currency: 'usd',
      payment_method: 'pm_card_chargeDeclinedInsufficientFunds',
      allowed_payment_method_types: ['card'],
      confirm: true,
    }),
  );

  // Not demonstrated, but worth knowing:
  //   StripeRateLimitError (429): back off and retry. The SDK retries for you up to maxNetworkRetries.
  //   StripeConnectionError: network failure. Retrying with the same idempotency key is safe.
  //   StripeAPIError (5xx): retry with the same idempotency key.
  //   StripePermissionError (403): a restricted key lacks the needed permission.
});

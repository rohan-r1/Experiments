// Lab 2.2 — What happens with each kind of test card.
// Run: npm run lab labs/02-payments/02-declines-and-3ds.ts
// Full list: https://docs.stripe.com/testing
import Stripe from 'stripe';
import { stripe } from '../../src/lib/stripe.ts';
import { heading, run, RUN_ID } from '../../src/lib/cli.ts';

const CASES = [
  ['pm_card_visa', 'succeeds'],
  ['pm_card_chargeDeclined', 'generic decline'],
  ['pm_card_chargeDeclinedInsufficientFunds', 'insufficient funds'],
  ['pm_card_chargeDeclinedFraudulent', 'issuer says fraud: show the customer a generic message'],
  ['pm_card_chargeDeclinedIncorrectCvc', 'incorrect CVC'],
  ['pm_card_radarBlock', 'blocked by Radar (Stripe, not the issuer)'],
  ['pm_card_threeDSecure2Required', '3DS required → requires_action'],
] as const;

run(async () => {
  const s = stripe();

  for (const [pm, expectation] of CASES) {
    heading(`${pm} (${expectation})`);
    try {
      const pi = await s.paymentIntents.create({
        amount: 1500,
        currency: 'usd',
        payment_method: pm,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        confirm: true,
        metadata: { lab: '02', run: RUN_ID },
      });
      console.log({ status: pi.status, next_action: pi.next_action?.type });
      // requires_action is NOT an error: the API call succeeded, but the customer has to
      // authenticate in the browser, which Stripe.js handles via handleNextAction().
      // A server-only flow can't finish this payment.
    } catch (err) {
      if (!(err instanceof Stripe.errors.StripeCardError)) throw err;
      // On a decline the PaymentIntent survives with status=requires_payment_method,
      // so the customer can retry with another card on the same PI. Don't create a new one.
      console.log({
        code: err.code,
        decline_code: err.decline_code,
        message: err.message, // written to be safe to show a customer
        pi_status: err.payment_intent?.status,
      });
    }
  }
});

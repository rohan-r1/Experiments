// Lab 2.3 — Separate authorization from capture: place a hold now, take the money later.
// Common in marketplaces (capture on shipment) and hotels/rentals.
// Run: npm run lab labs/02-payments/03-auth-and-capture.ts
import { stripe } from '../../src/lib/stripe.ts';
import { heading, run, show, RUN_ID } from '../../src/lib/cli.ts';

run(async () => {
  const s = stripe();
  const base = {
    currency: 'usd',
    payment_method: 'pm_card_visa',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' as const },
    capture_method: 'manual' as const,
    confirm: true,
    metadata: { lab: '02', run: RUN_ID },
  };

  heading('Authorize $50');
  const pi = await s.paymentIntents.create({ ...base, amount: 5000 });
  show('authorized', pi, ['id', 'status', 'amount', 'amount_capturable', 'amount_received']);
  // Card authorizations usually expire after about 7 days. Capture before then
  // or the hold drops off and the funds are released.

  heading('Capture only $35, e.g. one item was out of stock');
  const captured = await s.paymentIntents.capture(pi.id, { amount_to_capture: 3500 });
  show('captured', captured, ['status', 'amount', 'amount_received', 'amount_capturable']);
  // The remaining $15 goes back to the customer automatically.

  heading('Authorize, then cancel (void) instead of capturing');
  const pi2 = await s.paymentIntents.create({ ...base, amount: 2500 });
  const canceled = await s.paymentIntents.cancel(pi2.id, { cancellation_reason: 'abandoned' });
  show('canceled', canceled, ['status', 'cancellation_reason']);
  // Voiding a hold costs nothing and never shows on the statement as a charge
  // and refund. Cancel instead of refunding whenever you can.
});

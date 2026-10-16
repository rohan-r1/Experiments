// Lab 2.4 — Refunds are separate objects that point at a payment.
// Run: npm run lab labs/02-payments/04-refunds.ts
import Stripe from 'stripe';
import { stripe } from '../../src/lib/stripe.ts';
import { heading, run, show, RUN_ID } from '../../src/lib/cli.ts';

run(async () => {
  const s = stripe();

  heading('Charge $80');
  const pi = await s.paymentIntents.create({
    amount: 8000,
    currency: 'usd',
    payment_method: 'pm_card_visa',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    confirm: true,
    metadata: { lab: '02', run: RUN_ID },
  });

  heading('Partial refund: $30');
  const r1 = await s.refunds.create(
    { payment_intent: pi.id, amount: 3000, reason: 'requested_by_customer', metadata: { lab: '02' } },
    // Refunds move money, so give them an idempotency key tied to your own refund record.
    { idempotencyKey: `${pi.id}:refund:1` },
  );
  show('refund 1', r1, ['id', 'amount', 'status', 'reason']);

  heading('Refund the rest (omit amount)');
  const r2 = await s.refunds.create({ payment_intent: pi.id }, { idempotencyKey: `${pi.id}:refund:2` });
  show('refund 2', r2, ['id', 'amount', 'status']);

  heading('Over-refund attempt');
  try {
    await s.refunds.create({ payment_intent: pi.id, amount: 100 });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) console.log({ code: err.code, message: err.message });
    else throw err;
  }

  heading('State of the charge');
  const charge = await s.charges.retrieve(
    (await s.paymentIntents.retrieve(pi.id)).latest_charge as string,
  );
  show('charge', charge, ['amount', 'amount_refunded', 'refunded']);
  const refunds = await s.refunds.list({ payment_intent: pi.id });
  console.log('refunds:', refunds.data.map((r) => `${r.id} ${r.amount} ${r.status}`));
  // Stripe keeps its processing fee on refunded card payments. Check the refund's
  // balance_transaction to see the exact amounts.
  // Test-mode PMs for async refund outcomes: pm_card_refundFail
});

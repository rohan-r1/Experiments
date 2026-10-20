// Lab 2.1 — The PaymentIntent state machine, and where the money ends up.
// Run: npm run lab labs/02-payments/01-payment-intent-lifecycle.ts
//
//   requires_payment_method ──attach PM──▶ requires_confirmation ──confirm──▶ processing ──▶ succeeded
//                         ▲                                           │
//                         └──────── decline ◀─────────────────────────┤
//                                                                     └──▶ requires_action (3DS, redirects)
//                                                                     └──▶ requires_capture (manual capture)
import { setTimeout as sleep } from 'node:timers/promises';
import Stripe from 'stripe';
import { stripe } from '../../src/lib/stripe.ts';
import { formatMoney, heading, run, show, RUN_ID } from '../../src/lib/cli.ts';

run(async () => {
  const s = stripe();

  heading('1. Create: no payment method yet');
  // Amounts are integers in the currency's smallest unit (2000 = $20.00).
  // Zero-decimal currencies such as JPY are the exception: 2000 = ¥2000.
  let pi = await s.paymentIntents.create({
    amount: 2000,
    currency: 'usd',
    // Stripe decides which payment methods to offer, based on your Dashboard settings.
    // allow_redirects=never filters out methods such as iDEAL that need a browser redirect,
    // because this script confirms server-side with no browser.
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: { lab: '02', run: RUN_ID, order_id: 'order_1001' },
  });
  show('created', pi, ['id', 'status', 'amount']);
  // pi.client_secret is what a browser would use to confirm with Stripe.js. Treat it
  // like a password for this one payment: don't log it or put it in URLs.

  heading('2. Attach a test PaymentMethod');
  // pm_card_visa is a test PaymentMethod that always succeeds. In a real flow the
  // browser creates the PaymentMethod and your server never sees card numbers.
  pi = await s.paymentIntents.update(pi.id, { payment_method: 'pm_card_visa' });
  show('updated', pi, ['status', 'payment_method']);

  heading('3. Confirm');
  pi = await s.paymentIntents.confirm(pi.id);
  show('confirmed', pi, ['status', 'amount_received', 'latest_charge']);

  heading('4. Follow the money: expand Charge → BalanceTransaction');
  // expand swaps ID strings for full objects in a single request. It reaches up to
  // 4 levels deep, which saves you separate retrieve calls.
  //
  // charge.balance_transaction can be null right after the payment succeeds: Stripe may
  // create the BalanceTransaction a moment later. The type says so
  // (`string | BalanceTransaction | null`). A real app waits for the charge.updated webhook
  // (Lab 3); this script just polls for a few seconds.
  let charge!: Stripe.Charge;
  for (let i = 0; i < 10; i++) {
    pi = await s.paymentIntents.retrieve(pi.id, { expand: ['latest_charge.balance_transaction'] });
    charge = pi.latest_charge as Stripe.Charge;
    if (charge.balance_transaction) break;
    console.log('balance_transaction is still null, waiting...');
    await sleep(1000);
  }
  if (!charge.balance_transaction) throw new Error('balance_transaction still null after 10s; run again later');
  const bt = charge.balance_transaction as Stripe.BalanceTransaction;
  console.log({
    charge: charge.id,
    card: `${charge.payment_method_details?.card?.brand} •••• ${charge.payment_method_details?.card?.last4}`,
    gross: formatMoney(bt.amount, bt.currency),
    stripe_fee: formatMoney(bt.fee, bt.currency),
    net: formatMoney(bt.net, bt.currency),
    available_on: new Date(bt.available_on * 1000).toISOString().slice(0, 10),
  });
  // The net amount stays "pending" until available_on, then becomes "available"
  // and can be paid out. See it with: s.balance.retrieve()

  heading('Shortcut: create + confirm in one call');
  const quick = await s.paymentIntents.create({
    amount: 500,
    currency: 'usd',
    payment_method: 'pm_card_mastercard',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    confirm: true,
    metadata: { lab: '02', run: RUN_ID },
  });
  show('quick', quick, ['id', 'status']);
});

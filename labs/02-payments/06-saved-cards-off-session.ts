// Lab 2.6 — Save a card on a Customer, then charge it later with no customer present.
// Run: npm run lab labs/02-payments/06-saved-cards-off-session.ts
import Stripe from 'stripe';
import { stripe } from '../../src/lib/stripe.ts';
import { heading, run, show, RUN_ID } from '../../src/lib/cli.ts';

run(async () => {
  const s = stripe();
  const customer = await s.customers.create({ name: 'Repeat Buyer', metadata: { lab: '02', run: RUN_ID } });

  heading('SetupIntent: save a card without charging it');
  // usage=off_session asks the issuer to approve future merchant-initiated charges.
  // A real customer might complete 3DS at this step. Doing it now makes later
  // charges much less likely to need the customer.
  const si = await s.setupIntents.create({
    customer: customer.id,
    payment_method: 'pm_card_visa',
    usage: 'off_session',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    confirm: true,
  });
  show('setup intent', si, ['id', 'status', 'payment_method']);
  // You can also save a card during a payment with setup_future_usage: 'off_session'.

  const pms = await s.customers.listPaymentMethods(customer.id);
  console.log('saved PMs:', pms.data.map((pm) => `${pm.id} ${pm.card?.brand} ${pm.card?.last4}`));

  heading('Off-session charge (e.g. a monthly box)');
  const pi = await s.paymentIntents.create({
    amount: 1999,
    currency: 'usd',
    customer: customer.id,
    payment_method: pms.data[0].id,
    off_session: true, // the customer isn't here: Stripe fails instead of returning requires_action
    confirm: true,
    metadata: { lab: '02', run: RUN_ID },
  });
  show('charged', pi, ['id', 'status']);

  heading('Off-session charge where the bank demands authentication');
  // Save a card that always requires authentication, then try to charge it off-session.
  const pm = await s.paymentMethods.attach('pm_card_authenticationRequired', { customer: customer.id });
  try {
    await s.paymentIntents.create({
      amount: 1999,
      currency: 'usd',
      customer: customer.id,
      payment_method: pm.id,
      off_session: true,
      confirm: true,
      metadata: { lab: '02', run: RUN_ID },
    });
  } catch (err) {
    if (!(err instanceof Stripe.errors.StripeCardError)) throw err;
    console.log({ code: err.code, pi: err.payment_intent?.id, pi_status: err.payment_intent?.status });
    // code=authentication_required. The usual recovery: email the customer a link to
    // a page that confirms THIS PaymentIntent on-session with Stripe.js.
  }
});

// SPOT THE BUG (C): a monthly job charges each subscriber's saved card. 3 bugs.
import Stripe from 'stripe';
import { stripe } from '../../../src/lib/stripe.ts';

type Subscriber = { id: string; stripe_customer_id: string; email: string };
declare const db: { activeSubscribers(): Promise<Subscriber[]>; recordCharge(subId: string, piId: string): Promise<void> };
declare function emailCustomer(to: string, msg: string): Promise<void>;

export async function chargeMonthlyBoxes(month: string) {
  for (const sub of await db.activeSubscribers()) {
    const pms = await stripe().customers.listPaymentMethods(sub.stripe_customer_id);
    try {
      const pi = await stripe().paymentIntents.create({
        amount: 2999,
        currency: 'usd',
        customer: sub.stripe_customer_id,
        payment_method: pms.data[0].id,
        confirm: true,
        metadata: { subscriber: sub.id, month },
      });
      await db.recordCharge(sub.id, pi.id);
    } catch (err) {
      if (err instanceof Stripe.errors.StripeCardError) {
        await emailCustomer(sub.email, `Your payment failed: ${err.message}. Please update your card.`);
      }
    }
  }
}

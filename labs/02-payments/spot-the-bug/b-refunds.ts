// SPOT THE BUG (B): a support tool's "refund order" button. 3 bugs.
//
// Context: orders are paid with capture_method 'manual'. The order is captured when it
// ships, so an order that hasn't shipped is still only an authorization (a hold).
import Stripe from 'stripe';
import { stripe } from '../../../src/lib/stripe.ts';

type Order = { id: string; payment_intent_id: string; shipped: boolean };
declare const db: { getOrder(id: string): Promise<Order>; markRefunded(id: string): Promise<void> };

export async function refundOrder(orderId: string) {
  const order = await db.getOrder(orderId);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await stripe().refunds.create({ payment_intent: order.payment_intent_id });
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      if (err instanceof Stripe.errors.StripeError) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  await db.markRefunded(order.id);
}

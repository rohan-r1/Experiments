// SPOT THE BUG (A): a checkout handler, the kind an AI assistant writes on the first try.
// It compiles and the happy path works, but it has 4 bugs. Answers are in the lab README.
//
// Context: the browser sends { orderId, price, paymentMethodId }. `price` is in dollars,
// for example 19.99. The handler should charge the order and mark it paid.
import { stripe } from '../../../src/lib/stripe.ts';

type Order = { id: string; total_cents: number; status: 'open' | 'paid'; payment_intent_id?: string };
declare const db: {
  getOrder(id: string): Promise<Order>;
  markPaid(id: string): Promise<void>;
  savePaymentIntent(orderId: string, piId: string): Promise<void>;
};

export async function checkout(body: { orderId: string; price: number; paymentMethodId: string }) {
  const order = await db.getOrder(body.orderId);

  const pi = await stripe().paymentIntents.create({
    amount: body.price * 100,
    currency: 'usd',
    payment_method: body.paymentMethodId,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    confirm: true,
    metadata: { order_id: order.id },
  });
  await db.savePaymentIntent(order.id, pi.id);

  await db.markPaid(order.id);
  return { ok: true, clientSecret: pi.client_secret };
}

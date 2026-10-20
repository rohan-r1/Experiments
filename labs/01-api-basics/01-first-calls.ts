// Lab 1.1 — CRUD on a Customer: the request/response cycle every Stripe resource shares.
// Run: npm run lab labs/01-api-basics/01-first-calls.ts
import { stripe } from '../../src/lib/stripe.ts';
import { heading, run, show, RUN_ID } from '../../src/lib/cli.ts';

run(async () => {
  const s = stripe();

  heading('Create');
  const customer = await s.customers.create({
    email: `ada+${RUN_ID}@example.com`,
    name: 'Ada Lovelace',
    // metadata: up to 50 string key/values that Stripe stores but never interprets.
    // Use it to link Stripe objects back to IDs in your own database.
    metadata: { lab: '01', run: RUN_ID, internal_user_id: 'user_42' },
  });
  show('customer', customer, ['id', 'object', 'email', 'livemode', 'created', 'metadata']);
  // Every response carries the request ID; it's what Stripe support asks for, and
  // you can look it up at https://dashboard.stripe.com/test/logs or in the Dashboard search bar.
  console.log('request id:', customer.lastResponse.requestId);

  heading('Retrieve');
  const fetched = await s.customers.retrieve(customer.id);
  // retrieve() can return a DeletedCustomer, so TypeScript makes you narrow the type.
  if (fetched.deleted) throw new Error('unexpected: customer deleted');
  show('fetched', fetched, ['id', 'name', 'balance', 'currency']);

  heading('Update');
  // Updates are partial: omitted fields keep their values. To unset a metadata
  // key, set it to an empty string.
  const updated = await s.customers.update(customer.id, {
    name: 'Augusta Ada King',
    metadata: { internal_user_id: '', tier: 'gold' },
  });
  show('updated', updated, ['name', 'metadata']);

  heading('List with a filter');
  const list = await s.customers.list({ email: customer.email!, limit: 3 });
  console.log(`found ${list.data.length} (has_more=${list.has_more})`, list.data.map((c) => c.id));

  heading('Delete');
  const deleted = await s.customers.del(customer.id);
  console.log(deleted); // { id, object: 'customer', deleted: true }
});

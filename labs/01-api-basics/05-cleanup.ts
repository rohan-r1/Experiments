// Lab 1.5 — Delete customers created by the labs (metadata.lab is set).
// You can also wipe ALL test data: Dashboard > Developers > "Delete all test data".
// Run: npm run lab labs/01-api-basics/05-cleanup.ts
import { stripe } from '../../src/lib/stripe.ts';
import { run } from '../../src/lib/cli.ts';

run(async () => {
  const s = stripe();
  let n = 0;
  // Collect the IDs first, then delete, so the list isn't changing while we walk it.
  const ids: string[] = [];
  for await (const c of s.customers.list({ limit: 100 })) {
    if (c.metadata.lab) ids.push(c.id);
  }
  for (const id of ids) {
    await s.customers.del(id);
    n++;
  }
  console.log(`deleted ${n} lab customers`);
});

// Lab 1.2 — Lists are cursor-paginated; Search is a separate, eventually consistent index.
// Run: npm run lab labs/01-api-basics/02-pagination-and-search.ts
import { stripe } from '../../src/lib/stripe.ts';
import { heading, run, RUN_ID } from '../../src/lib/cli.ts';

run(async () => {
  const s = stripe();

  heading(`Seed 5 customers tagged ${RUN_ID}`);
  for (let i = 1; i <= 5; i++) {
    await s.customers.create({ name: `Pager ${i}`, metadata: { lab: '01', run: RUN_ID } });
  }

  heading('Manual cursor pagination (limit=2)');
  // Lists come newest first. To get the next page, pass the last ID you saw as
  // starting_after. Pages are anchored to objects, not offsets, so items created
  // while you paginate don't shift the pages.
  let startingAfter: string | undefined;
  let page = 0;
  do {
    const res = await s.customers.list({ limit: 2, starting_after: startingAfter });
    console.log(`page ${++page}:`, res.data.map((c) => `${c.id} (${c.name})`));
    startingAfter = res.has_more ? res.data.at(-1)!.id : undefined;
  } while (startingAfter && page < 3); // stop after 3 pages; your account may hold more

  heading('Auto-pagination');
  // The SDK follows the cursors for you. `for await` streams page by page.
  let count = 0;
  for await (const c of s.customers.list({ limit: 100, created: { gte: Math.floor(Date.now() / 1000) - 600 } })) {
    if (c.metadata.run === RUN_ID) count++;
  }
  console.log(`customers from this run found by walking the list: ${count}`);

  heading('Search API');
  // Search uses a query language over an index that can lag writes by about a minute,
  // so newly created objects may not show up yet. Never use search in a
  // read-after-write path such as "create, then find it again".
  const found = await s.customers.search({ query: `metadata['run']:'${RUN_ID}'` });
  console.log(`search found ${found.data.length}/5 right now. Run it again in a minute to see the lag.`);
  console.log(`  npm run lab labs/01-api-basics/05-cleanup.ts  # removes lab customers`);
});

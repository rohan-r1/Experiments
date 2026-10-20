# Lab 1: API basics

Every Stripe resource follows the same patterns, so learn them once here.

## Concepts

- **Objects and IDs.** The ID prefix tells you the type: `cus_`, `pi_`, `ch_`, `pm_`,
  `re_`, `evt_`, `acct_`. Every object has `object`, `livemode`, `created` (unix seconds),
  and usually `metadata`.
- **Test vs. live mode** are fully separate datasets. The key you use selects the mode.
- **Requests** are form-encoded POST/GET/DELETE. The SDK hides the encoding, but the
  Dashboard logs show the raw form.
- **Lists** use cursors (`starting_after` / `ending_before`, `limit` ≤ 100) and run newest
  first. **Search** is a separate, eventually consistent index with its own query language.
- **`expand`** replaces an ID with the full object (Lab 2 uses it).
- **Errors** have a `type` (`card_error`, `invalid_request_error`, `api_error`, …), a
  `code`, and for cards a `decline_code`. Branch on those, never on `message`.
- **Idempotency keys** make POSTs safe to retry: same key + same params = the same
  response, replayed.

## Run

```sh
npm run lab labs/01-api-basics/01-first-calls.ts
npm run lab labs/01-api-basics/02-pagination-and-search.ts
npm run lab labs/01-api-basics/03-errors.ts
npm run lab labs/01-api-basics/04-idempotency.ts
npm run lab labs/01-api-basics/05-cleanup.ts
```

After each one, find its requests at https://dashboard.stripe.com/test/logs (Workbench → Logs).
GETs are hidden by default. Tell creates from updates by path: `POST /v1/customers` creates,
`POST /v1/customers/cus_...` updates.

## Exercises

1. **Raw HTTP.** Redo the create-customer call with plain `fetch` (no SDK): form-encode
   `metadata[lab]=01`, set `Authorization: Bearer`, and send `Stripe-Version`. What happens
   if you leave out `Stripe-Version`?
2. **Find by your ID.** Write `findCustomerByInternalId(userId)`. Should it use search,
   list + filter, or something else? (Hint: what should your *own* database store?)
3. **Retry wrapper.** Set `maxNetworkRetries: 0`, then write `withRetry(fn, key)` that
   retries `StripeConnectionError` and `StripeAPIError` with backoff and *reuses the same
   idempotency key*. Explain why a card error must never be retried automatically.
4. **Pagination edge.** Using `ending_before`, walk the customer list *backwards* from the
   oldest page.

## Check yourself

- Why is a random UUID per attempt a useless idempotency key?
- A customer was created 5 seconds ago and `customers.search` can't find it. Is that a bug?
- What does `retrieve()` return for a deleted customer, and why does TypeScript make you
  handle it?

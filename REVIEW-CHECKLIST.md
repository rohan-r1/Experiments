# Reviewing Stripe code

What to check in any Stripe code, especially code an AI assistant wrote. Each lab adds a
section. Most real bugs come from **untrusted inputs**, **unhandled states**, and
**unsafe retries**, not syntax.

## Money and inputs

- [ ] Amounts come from **server-side data** (DB, Price objects), never from the request body.
- [ ] Amounts are **integers in the smallest unit** end to end. No `price * 100` on floats.
- [ ] The currency is explicit, and matches how the amount was computed (watch zero-decimal
      currencies such as JPY).
- [ ] The secret key stays on the server. Only `client_secret` and the publishable key reach
      the browser, and neither is logged.

## States

- [ ] Only `status === 'succeeded'` counts as paid. `requires_action`, `processing` and
      `requires_capture` are handled explicitly.
- [ ] Declines (`StripeCardError`) are caught, and the customer sees `err.message` (or a
      generic message). Other error types aren't shown to customers.
- [ ] After a decline, the **same PaymentIntent** is reused, not replaced with a new one.
- [ ] Holds that won't be captured are **canceled**, not refunded.
- [ ] Off-session charges pass `off_session: true` and handle `authentication_required`.
- [ ] Async objects (refunds, disputes, some payment methods) are tracked by status, not
      assumed final when created.

## Retries and duplicates

- [ ] Every POST that moves money has an **idempotency key derived from your own IDs**
      (`order_123:pay`), not a random one per attempt.
- [ ] Retries reuse the same key, and only retry connection/API errors, never
      `card_error` or `invalid_request_error`.
- [ ] Running the handler twice (double-click, job re-run, crash and restart) can't charge or
      refund twice.
- [ ] Batch jobs handle errors per item and keep going; one bad record doesn't stop the rest.
- [ ] Stripe IDs (`pi_...`, `cus_...`) are stored in **your** DB, so you never need search to
      find them again.

## Debuggability

- [ ] The API version is pinned. (Example code online may target an older version with
      different field names.)
- [ ] Your IDs go into `metadata`, so a Dashboard object leads back to your records.
- [ ] Errors are logged with `err.requestId`, which finds the exact request in Workbench → Logs.

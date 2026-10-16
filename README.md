# Stripe Labs

A hands-on path to working fluency with the Stripe API, in TypeScript. The labs build toward
one capstone, **Bazaar**: a small multi-seller marketplace where sellers onboard with
Connect, buyers check out with the Payment Element and Link, and webhooks drive every
order state change.

## Roadmap

| # | Lab | You learn | Runs as |
|---|-----|-----------|---------|
| 1 | [API basics](labs/01-api-basics) | Objects, IDs, metadata, pagination, search vs. list, the error taxonomy, idempotency, API versions | Scripts |
| 2 | [Payments core](labs/02-payments) | PaymentIntent state machine, declines and 3DS, auth & capture, refunds, disputes, saved cards & off-session | Scripts |
| 3 | Webhooks & reliability | Signature verification, raw bodies, an event store with dedupe, out-of-order events, re-fetching vs. trusting payloads, `stripe listen` / `stripe trigger`, replay | Server + offline tests |
| 4 | Checkout & Payment Element + Link | Hosted Checkout, then a custom Payment Element flow, Link Authentication Element, returning Link users, Express Checkout Element, deferred intent creation | Server + browser |
| 5 | Connect | Connected accounts and onboarding (Account Links), capabilities & requirements, destination charges vs. separate charges & transfers, application fees, `on_behalf_of`, refunds with `reverse_transfer`, payouts, Connect webhooks | Scripts + server |
| 6 | Capstone: Bazaar | Everything above in one app, plus a reconciliation job that compares the local ledger with Balance Transactions | Full app |

Each lab has a README with the concepts, the scripts to run in order, and **exercises**:
small changes that are yours to write. The scripts are the worked examples; the exercises
are where the learning happens.

## Setup

1. Create a Stripe account at https://dashboard.stripe.com/register (no business details
   are needed for test mode).
2. `cp .env.example .env` and paste your **test** secret key (`sk_test_...`). The client
   refuses live keys.
3. `npm install`
4. Run a lab script: `npm run lab labs/01-api-basics/01-first-calls.ts`
5. From Lab 3 on: install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run
   `stripe login`.

Useful commands:

```sh
npm run typecheck   # tsc. The SDK's types track the pinned API version.
npm test            # vitest (offline tests, from Lab 3)
```

## Conventions

- **API version is pinned** in `src/lib/stripe.ts` (`2026-09-30.endive`, matching
  `stripe@23`). Stripe changes field names between versions. For example, `endive` renamed
  `payment_method_types` to `allowed_payment_method_types` on PaymentIntents. When code
  examples online don't type-check, the API version is usually why.
- Everything the labs create is tagged `metadata.lab` (and `metadata.run`), so it can be
  found and cleaned up. Dashboard → Developers → "Delete all test data" resets everything.
- To dig into any request, find its `requestId` under Dashboard → Developers → Logs.

# Lab 2: Payments core

The PaymentIntent is the center of Stripe payments. This lab drives it entirely from the
server, using test PaymentMethods (`pm_card_*`), so it needs no browser yet. Lab 4 adds the
browser side.

## Concepts

- **PaymentIntent** tracks one attempt to collect one amount, across retries, declines and
  authentication. Statuses: `requires_payment_method` → `requires_confirmation` →
  (`requires_action`) → `processing` → `succeeded`, plus `requires_capture` and `canceled`.
- **Charge** is the record of one attempt to move money (`pi.latest_charge`). A PI can have
  several charges if earlier attempts were declined.
- **BalanceTransaction** records money in and out of your Stripe balance: gross, fee, net,
  and the date it becomes available.
- **PaymentMethod** is a reusable payment instrument. **SetupIntent** saves one for later
  without charging it.
- **`automatic_payment_methods`** lets Stripe choose the eligible payment methods from your
  Dashboard settings. Since API version `endive`, restricting them explicitly uses
  `allowed_payment_method_types` (formerly `payment_method_types`).
- **On-session vs. off-session**: whether the customer is present to authenticate.

## Run

```sh
npm run lab labs/02-payments/01-payment-intent-lifecycle.ts
npm run lab labs/02-payments/02-declines-and-3ds.ts
npm run lab labs/02-payments/03-auth-and-capture.ts
npm run lab labs/02-payments/04-refunds.ts
npm run lab labs/02-payments/05-disputes.ts
npm run lab labs/02-payments/06-saved-cards-off-session.ts
```

Then open Dashboard → Payments and click into a few payments. The timeline shows the same
state changes you saw in the scripts.

## Exercises

1. **Balance.** Call `s.balance.retrieve()` before and after a payment. Which bucket did
   the money land in, `pending` or `available`? Then list `balanceTransactions` and match
   each one to its source (charge, refund, dispute, fee).
2. **Retry after decline.** Create a PI and confirm it with `pm_card_chargeDeclined`, catch
   the error, then confirm the *same* PI with `pm_card_visa`. How many charges does the PI
   have now? (List charges with `payment_intent`.)
3. **Multi-currency.** Charge `jpy` 2000 and `eur` 2000. Compare the BalanceTransactions:
   look at `exchange_rate`, and at what "2000" means in each currency.
4. **Capture timing.** Write `captureOrder(piId, shippedItems)` that captures only the
   shipped total and voids the PI when nothing shipped. What's the difference between
   `cancel` and a full refund, for the customer and for your fees?
5. **Lost dispute.** Repeat 2.5 with `losing_evidence`. Trace every BalanceTransaction the
   dispute created.

## Check yourself

- Why does `requires_action` come back as a successful API response but a decline throws?
- After a decline, should you create a new PaymentIntent or reuse the old one? Why?
- When would you choose `capture_method: 'manual'` for a marketplace?

# Lab 2: Payments core

The PaymentIntent is the center of Stripe payments. This lab drives it entirely from the
server, using test PaymentMethods (`pm_card_*`), so it needs no browser yet. Lab 4 adds the
browser side.

**How this lab works.** The goal isn't to memorize code. It's to build the mental model you
need to *direct* an AI assistant and *catch its mistakes*:

1. **Run** the scripts and read what they print.
2. **Check** your understanding with the questions (answers are hidden under each one).
3. **Spot the bug** in plausible-looking code, the kind assistants really write.
4. **Spec and review**: describe a feature, have Claude build it, review it against the checklist.

## Key ideas

- **PaymentIntent (PI)** tracks one attempt to collect one amount, across retries, declines
  and authentication. Statuses: `requires_payment_method` → `requires_confirmation` →
  (`requires_action`) → `processing` → `succeeded`, plus `requires_capture` and `canceled`.
- **Charge** is the record of one attempt to move money (`pi.latest_charge`). One PI can have
  several charges if earlier attempts were declined.
- **BalanceTransaction** records money moving in or out of your Stripe balance: gross, fee,
  net, and the date it becomes available.
- **PaymentMethod (PM)** is a reusable payment instrument. **SetupIntent** saves one for later
  without charging it.
- **On-session vs. off-session**: whether the customer is present to authenticate if their
  bank asks.
- Amounts are **integers in the smallest currency unit**: 2000 = $20.00, but 2000 = ¥2000.

## 1. Run, and what to notice

Run each script with `npm run lab labs/02-payments/<file>`, then find the same payment under
**Payments** in the Dashboard. Its timeline shows the same state changes.

| Script | Notice |
|---|---|
| `01-payment-intent-lifecycle.ts` | The status changes at each step. The fee and net amount in the BalanceTransaction. `expand` reaching two levels deep in one request. |
| `02-declines-and-3ds.ts` | Declines **throw**, but 3DS returns normally with `status: requires_action`. After a decline, the PI still exists. |
| `03-auth-and-capture.ts` | `amount_capturable` vs. `amount_received`. A partial capture releases the rest. Canceling an authorization is free. |
| `04-refunds.ts` | A refund is its own object (`re_...`). Two partial refunds, then the over-refund error. `amount_refunded` on the charge. |
| `05-disputes.ts` | The dispute appears a moment after the payment. The `due_by` date. Your balance drops when the dispute opens, not when you lose it. |
| `06-saved-cards-off-session.ts` | SetupIntent saves without charging. `off_session: true` makes the bank-wants-authentication case **throw** `authentication_required` instead of waiting. |

## 2. Concept checks

<details><summary><b>Q1.</b> A decline throws an error, but "3DS required" comes back as a normal response. Why the difference, and what does each mean for your code?</summary>

A decline is a final "no" for that card, so Stripe reports it as an error (`card_error`).
`requires_action` isn't a failure: the payment is paused, waiting for the customer to
authenticate in their browser. Your code must not treat it as paid *or* as failed. Send the
`client_secret` to the browser so Stripe.js can show the 3DS challenge. **The bug to
watch for:** code that marks an order paid whenever the create call doesn't throw.
</details>

<details><summary><b>Q2.</b> After a decline, should you create a new PaymentIntent or reuse the old one?</summary>

Reuse it. The PI is "the attempt to collect this amount for this order". It keeps every
failed charge in its history, which matters for reporting and for Radar's fraud model.
Store the PI's ID on your order and confirm the same PI with the new card. Creating a new
PI on every attempt is a common source of duplicate charges.
</details>

<details><summary><b>Q3.</b> Where should the payment amount come from?</summary>

From your server's own data, such as the order total in your database, and **never** from
the browser's request. Anyone can edit a request and pay $0.01 for a $500 order. Keep it
as integer cents end to end, because `19.99 * 100` in JavaScript is `1998.9999999999998`.
</details>

<details><summary><b>Q4.</b> An order won't ship, and you only placed a hold (manual capture). Refund or cancel?</summary>

**Cancel** the PaymentIntent. That voids the hold: no money moved, no fee, and nothing on
the customer's statement except a pending hold that disappears. A refund is for money that
was actually captured. Stripe keeps its processing fee, and the customer sees a charge and
then a refund.
</details>

<details><summary><b>Q5.</b> What's the difference between <code>pending</code> and <code>available</code> balance?</summary>

Money from a payment lands in **pending** first. After the payout schedule delay (around 2
days in the US; see the BalanceTransaction's `available_on`), it becomes **available** and
can be paid out to your bank. Refunds and disputes are taken from your balance immediately.
</details>

<details><summary><b>Q6.</b> When would a marketplace use manual capture?</summary>

When there's a gap between "the customer commits" and "we know we can fulfill": a seller
has to accept the order, stock must be confirmed, or the final amount changes (tips,
weight-based shipping). Authorize at checkout and capture when it ships, within about 7
days, or the hold expires.
</details>

<details><summary><b>Q7.</b> A charge job runs off-session and a card needs authentication. What happens and what should you do?</summary>

With `off_session: true`, Stripe fails fast with `authentication_required` (a card error),
and the PI stays in `requires_payment_method`. Email the customer a link to a page that
confirms **that same PI** on-session with Stripe.js. Without `off_session: true`, the PI
would quietly sit in `requires_action` with nobody there to finish it.
</details>

## 3. Spot the bug

Read each file in [`spot-the-bug/`](spot-the-bug) and write down every problem you find
before opening the answers. All three compile, and the happy path works in each.

<details><summary><b>A. <code>a-checkout.ts</code>: 4 bugs</b></summary>

1. **Trusts the client's price.** `amount` comes from `body.price`. Use `order.total_cents`.
2. **Float math.** `19.99 * 100` isn't an integer, and Stripe rejects it (`invalid_integer`).
   Store and pass integer cents.
3. **Marks the order paid without checking `pi.status`.** A card needing 3DS returns
   `requires_action` without throwing, so the order is marked paid with no money collected.
   Only `succeeded` means paid. Better still, mark it paid from the
   `payment_intent.succeeded` webhook (Lab 3).
4. **A new PaymentIntent on every call.** A double-click or retry charges twice. Check
   `order.status`, reuse `order.payment_intent_id` if there is one, and pass an idempotency
   key such as `` `${order.id}:pay` ``.
</details>

<details><summary><b>B. <code>b-refunds.ts</code>: 3 bugs</b></summary>

1. **Refunds orders that haven't shipped.** Those are still only holds, so cancel the PI
   (`paymentIntents.cancel`) instead of refunding.
2. **Retries without an idempotency key.** If the first attempt succeeds but the response is
   lost, the retry is a brand-new request. That's harmless for a full refund (it fails as
   already refunded) but double-refunds a partial one. Reuse one key, such as
   `` `${order.id}:refund` ``, on every attempt. (The SDK already retries network errors
   with a shared key, so this loop isn't even needed.)
3. **Retries errors that will never succeed.** An `invalid_request_error`, such as
   `charge_already_refunded`, fails identically every time. Retry only connection and API
   errors.

Bonus: `markRefunded` runs as soon as the refund is *created*, but a refund can be
`pending` and fail later (`refund.failed` webhook). Track the refund's status instead.
</details>

<details><summary><b>C. <code>c-subscription-box.ts</code>: 3 bugs</b></summary>

1. **No `off_session: true`.** A card needing authentication returns `requires_action`
   instead of throwing, so the job records a charge that never happened. The code doesn't
   check `pi.status` either.
2. **No idempotency key.** If the job crashes halfway and is re-run, everyone already
   charged gets charged again. Key it per subscriber per month:
   `` `${sub.id}:${month}` ``.
3. **`pms.data[0]` can be undefined**, if a customer has no saved card. That throws a
   `TypeError`, not a card error, which aborts the loop, so every later subscriber goes
   uncharged. It's also an arbitrary card: use the customer's chosen default
   (`invoice_settings.default_payment_method`).

Bonus: any other error (rate limit, network) also stops the whole job. Handle errors per
subscriber and continue.
</details>

Notice the pattern. None of these are syntax problems; they're all about **which states
exist, who controls the inputs, and what happens on a retry**. That's what to check in
code an assistant writes. The full list is in [`REVIEW-CHECKLIST.md`](../../REVIEW-CHECKLIST.md).

## 4. Spec and review

Have Claude build a feature, then review its code yourself.

**Feature:** `captureOrder(orderId, shippedItemIds)` for a shop that authorizes at checkout
and captures at shipping.

1. **Write the spec yourself first**, in 5–10 lines of plain English. Cover: where the
   amount comes from, what happens if nothing shipped, partial shipments, calling it twice,
   and what to store afterward.
2. Give the spec to Claude (a new session, or here) and ask it to implement the function in
   `labs/02-payments/my-capture-order.ts`.
3. **Review the result** against [`REVIEW-CHECKLIST.md`](../../REVIEW-CHECKLIST.md) before
   running anything. Note what it got wrong *and* what your spec forgot to say.
4. Optional: run it against a real held payment (create one with script 03).

<details><summary>An example spec (read it after writing your own)</summary>

> Implement `captureOrder(orderId, shippedItemIds)`. Load the order from our DB, which
> stores its `payment_intent_id` and item prices in integer cents. Compute the capture
> amount from our DB prices of the shipped items; never accept an amount as input. If no
> items shipped, cancel the PaymentIntent instead of capturing. If the PI is already
> `succeeded` or `canceled`, return its current state without calling Stripe again. Pass
> an idempotency key of `${orderId}:capture`. Treat only `succeeded` as captured. Store the
> captured amount and the PI's status on the order. Let card and invalid-request errors
> propagate; don't retry them.
</details>

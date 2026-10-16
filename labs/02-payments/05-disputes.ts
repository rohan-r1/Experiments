// Lab 2.5 — Disputes (chargebacks): the customer's bank pulls the money back,
// and you can respond with evidence.
// Run: npm run lab labs/02-payments/05-disputes.ts
import { setTimeout as sleep } from 'node:timers/promises';
import { stripe } from '../../src/lib/stripe.ts';
import { heading, run, show, RUN_ID } from '../../src/lib/cli.ts';

run(async () => {
  const s = stripe();

  heading('Pay with a card that always gets disputed');
  const pi = await s.paymentIntents.create({
    amount: 4200,
    currency: 'usd',
    payment_method: 'pm_card_createDispute',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    confirm: true,
    metadata: { lab: '02', run: RUN_ID },
  });
  console.log('payment status:', pi.status);

  heading('Wait for the dispute to appear (it is created asynchronously)');
  // In production, don't poll: listen for the charge.dispute.created webhook (Lab 3).
  let dispute;
  for (let i = 0; i < 10 && !dispute; i++) {
    await sleep(1500);
    dispute = (await s.disputes.list({ payment_intent: pi.id })).data[0];
  }
  if (!dispute) throw new Error('dispute did not appear; try again');
  show('dispute', dispute, ['id', 'status', 'reason', 'amount']);
  console.log('respond by:', new Date(dispute.evidence_details.due_by! * 1000).toISOString());
  // The disputed amount plus a dispute fee leave your balance as soon as the
  // dispute is created, whether you go on to win or lose.

  heading('Submit evidence');
  // In test mode, the string "winning_evidence" wins the dispute and "losing_evidence" loses it.
  const updated = await s.disputes.update(dispute.id, {
    evidence: {
      uncategorized_text: 'winning_evidence',
      customer_email_address: 'ada@example.com',
    },
    submit: true,
  });
  show('after submit', updated, ['status']);
  console.log('Re-run disputes.retrieve in a few seconds: the status should move to "won".');
});

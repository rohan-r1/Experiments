import Stripe from 'stripe';

/** Run a lab script's main(), printing Stripe errors in a readable form. */
export function run(main: () => Promise<void>): void {
  main().catch((err: unknown) => {
    if (err instanceof Stripe.errors.StripeError) {
      console.error('\n✖ Stripe error');
      console.error(describeError(err));
    } else {
      console.error(err);
    }
    process.exitCode = 1;
  });
}

export function describeError(err: InstanceType<typeof Stripe.errors.StripeError>) {
  return {
    class: err.constructor.name,
    type: err.type,
    code: err.code,
    decline_code: err.decline_code,
    statusCode: err.statusCode,
    message: err.message,
    requestId: err.requestId,
    doc_url: err.doc_url,
  };
}

export function heading(text: string): void {
  console.log(`\n── ${text} ${'─'.repeat(Math.max(0, 60 - text.length))}`);
}

/** Print selected fields of an object, so output stays readable. */
export function show<T extends object>(label: string, obj: T, fields: (keyof T)[]): void {
  const picked = Object.fromEntries(fields.map((f) => [f, obj[f]]));
  console.log(label, picked);
}

/** A tag shared by everything one script run creates, so cleanup can find it. */
export const RUN_ID = `run_${Date.now().toString(36)}`;

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
}

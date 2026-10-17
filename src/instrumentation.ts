export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.BILLING_PROVIDER !== "stripe"
  ) {
    return;
  }

  const { validateStripeConfiguration } = await import(
    "@/lib/billing/stripe-provider"
  );
  validateStripeConfiguration();
}

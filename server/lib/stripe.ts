import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export function isStripeConfigured(): boolean {
  return !!stripe;
}

export function getStripe(): Stripe | null {
  return stripe;
}

export default stripe;

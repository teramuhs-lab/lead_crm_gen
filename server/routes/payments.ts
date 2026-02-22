import { Router, Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { invoices, subscriptions, paymentMethods, contacts, users } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { getStripe, isStripeConfigured } from '../lib/stripe.js';

const router = Router();
router.use(requireAuth);

// Plan price IDs from environment (Stripe Price objects)
const PLAN_PRICES: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
  agency: process.env.STRIPE_PRICE_AGENCY || '',
};

// ── GET /api/payments/status ──
// Returns whether Stripe is configured for this instance.
router.get('/status', async (_req: Request, res: Response) => {
  res.json({ configured: isStripeConfigured() });
});

// ── GET /api/payments/subscription ──
// Returns the current user's subscription, or null.
router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    res.json(subscription ?? null);
  } catch (err) {
    console.error('[payments] Get subscription error:', err);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// ── POST /api/payments/create-checkout ──
// Creates a Stripe Checkout Session for a subscription plan.
router.post('/create-checkout', async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ error: 'Stripe is not configured' });
      return;
    }

    const userId = req.user!.userId;
    const { plan } = req.body as { plan: string };

    const priceId = PLAN_PRICES[plan];
    if (!priceId) {
      res.status(400).json({ error: `Invalid plan: ${plan}` });
      return;
    }

    // Look up the user to get their email
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if user already has a subscription with a Stripe customer
    const [existingSub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    let customerId: string;

    if (existingSub?.stripeCustomerId) {
      customerId = existingSub.stripeCustomerId;
    } else {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings/billing?success=true`,
      cancel_url: `${baseUrl}/settings/billing?canceled=true`,
      metadata: { userId, plan },
    });

    // Upsert a subscription record so we track the Stripe customer ID
    if (!existingSub) {
      await db.insert(subscriptions).values({
        userId,
        stripeCustomerId: customerId,
        plan: plan as 'starter' | 'pro' | 'agency',
        status: 'incomplete',
      });
    }

    res.json({ url: session.url });
  } catch (err) {
    console.error('[payments] Create checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ── POST /api/payments/customer-portal ──
// Creates a Stripe Customer Portal session for managing billing.
router.post('/customer-portal', async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ error: 'Stripe is not configured' });
      return;
    }

    const userId = req.user!.userId;

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      res.status(404).json({ error: 'No subscription found' });
      return;
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:5173';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${baseUrl}/settings/billing`,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    console.error('[payments] Customer portal error:', err);
    res.status(500).json({ error: 'Failed to create customer portal session' });
  }
});

// ── POST /api/payments/create-invoice ──
// Creates an invoice for a contact (stores amount in cents in DB).
router.post('/create-invoice', async (req: Request, res: Response) => {
  try {
    const { contactId, subAccountId, amount, description, dueDate } = req.body as {
      contactId: string;
      subAccountId: string;
      amount: number; // dollars from frontend
      description?: string;
      dueDate?: string;
    };

    if (!contactId || !subAccountId || amount == null) {
      res.status(400).json({ error: 'contactId, subAccountId, and amount are required' });
      return;
    }

    // Fetch the contact for the name and email
    const [contact] = await db
      .select({ id: contacts.id, name: contacts.name, email: contacts.email })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    const amountInCents = Math.round(amount * 100);

    let stripeInvoiceId: string | null = null;
    let stripeHostedUrl: string | null = null;

    // Optionally create a Stripe invoice if Stripe is configured and contact has email
    const stripe = getStripe();
    if (stripe && contact.email) {
      try {
        // Get or create a Stripe customer for this contact
        const customers = await stripe.customers.list({ email: contact.email, limit: 1 });
        let stripeCustomer;

        if (customers.data.length > 0) {
          stripeCustomer = customers.data[0];
        } else {
          stripeCustomer = await stripe.customers.create({
            email: contact.email,
            name: contact.name,
          });
        }

        const stripeInvoice = await stripe.invoices.create({
          customer: stripeCustomer.id,
          collection_method: 'send_invoice',
          days_until_due: dueDate
            ? Math.max(1, Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000))
            : 30,
          description: description || undefined,
        });

        // Add a line item for the amount
        await stripe.invoiceItems.create({
          customer: stripeCustomer.id,
          invoice: stripeInvoice.id,
          amount: amountInCents,
          currency: 'usd',
          description: description || 'Invoice',
        });

        // Finalize and send the invoice
        const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
        await stripe.invoices.sendInvoice(finalized.id);

        stripeInvoiceId = finalized.id;
        stripeHostedUrl = finalized.hosted_invoice_url || null;
      } catch (stripeErr) {
        // Stripe invoice creation failed — still create local record
        console.error('[payments] Stripe invoice creation failed:', stripeErr);
      }
    }

    const [invoice] = await db
      .insert(invoices)
      .values({
        subAccountId,
        contactId,
        contactName: contact.name,
        amount: amountInCents,
        currency: 'usd',
        status: stripeInvoiceId ? 'open' : 'draft',
        description: description || '',
        dueDate: dueDate ? new Date(dueDate) : null,
        stripeInvoiceId,
        stripeHostedUrl,
      })
      .returning();

    // Return with amount converted back to dollars for frontend
    res.json({
      ...invoice,
      amount: invoice.amount / 100,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('[payments] Create invoice error:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// ── GET /api/payments/invoices?subAccountId=X ──
// Lists invoices for a sub-account, ordered by creation date descending.
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;

    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId query parameter is required' });
      return;
    }

    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.subAccountId, subAccountId))
      .orderBy(desc(invoices.createdAt));

    const result = rows.map((inv) => ({
      ...inv,
      amount: inv.amount / 100,
      dueDate: inv.dueDate?.toISOString() ?? null,
      paidAt: inv.paidAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    console.error('[payments] Get invoices error:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// ── GET /api/payments/payment-methods ──
// Returns payment methods for the current user.
router.get('/payment-methods', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const methods = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, userId));

    res.json(methods);
  } catch (err) {
    console.error('[payments] Get payment methods error:', err);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

export default router;

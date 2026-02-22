
import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import { Subscription, PaymentMethod } from '../types';
import { api } from '../lib/api';
import { NexusHeader } from './NexusUI';

const Billing: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isStripeConfigured, setIsStripeConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBillingData = async () => {
      setIsLoading(true);
      try {
        const [subData, pmData, statusData] = await Promise.all([
          api.get<Subscription>('/payments/subscription').catch(() => null),
          api.get<PaymentMethod[]>('/payments/payment-methods').catch(() => [] as PaymentMethod[]),
          api.get<{ configured: boolean }>('/payments/status').catch(() => ({ configured: false })),
        ]);
        setSubscription(subData);
        setPaymentMethods(pmData || []);
        setIsStripeConfigured(statusData.configured);
      } catch {
        // keep defaults on failure
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  // Determine current plan: use subscription if available, otherwise default to 'pro'
  const currentPlanKey = subscription?.plan || 'pro';

  const plans = [
    { key: 'starter', name: 'Starter', price: '97', features: ['3 Sub-accounts', 'Email Sequences', 'Landing Pages'] },
    { key: 'pro', name: 'Professional', price: '297', features: ['10 Sub-accounts', 'SMS Automation', 'Workflow Builder', 'CRM Analytics'] },
    { key: 'agency', name: 'Agency Pro', price: '497', features: ['Unlimited Sub-accounts', 'White Labeling', 'Custom API Access', 'Priority Support'] },
  ];

  const handleUpgrade = async (planName: string) => {
    if (!isStripeConfigured) {
      // No notify available here, use alert as fallback or show inline message
      alert('Stripe is not configured. Please set STRIPE_SECRET_KEY to enable payments.');
      return;
    }

    try {
      const response = await api.post<{ url: string }>('/payments/create-checkout', { plan: planName });
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start checkout');
    }
  };

  const handleUpdatePaymentMethod = async () => {
    try {
      const response = await api.post<{ url: string }>('/payments/customer-portal');
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (err: any) {
      alert(err.message || 'Failed to open customer portal');
    }
  };

  // Build payment method display text
  const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault) || paymentMethods[0];
  const paymentMethodText = defaultPaymentMethod
    ? `${defaultPaymentMethod.brand.charAt(0).toUpperCase() + defaultPaymentMethod.brand.slice(1)} ending in ${defaultPaymentMethod.last4}${defaultPaymentMethod.expMonth && defaultPaymentMethod.expYear ? ` (Exp ${String(defaultPaymentMethod.expMonth).padStart(2, '0')}/${String(defaultPaymentMethod.expYear).slice(-2)})` : ''}`
    : 'No payment method on file';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <NexusHeader title="Billing" subtitle="Manage your subscription plan, payment methods, and invoices" />
      {/* Demo mode banner */}
      {!isStripeConfigured && !isLoading && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-xs font-medium mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Payment system is in demo mode. Configure STRIPE_SECRET_KEY to enable real payments.
        </div>
      )}

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900">Choose Your Agency Path</h2>
        <p className="text-slate-500">Scale your marketing automation business with the right tier.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlanKey;
          return (
            <div key={plan.name} className={`relative bg-white rounded-xl p-8 border ${isCurrent ? 'border-brand ring-4 ring-brand ring-opacity-10' : 'border-slate-200'} shadow-xl`}>
              {isCurrent && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand text-white text-xs font-semibold rounded-full">Current Plan</span>
              )}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-semibold text-slate-900">${plan.price}</span>
                    <span className="text-slate-500 font-medium">/month</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => !isCurrent && handleUpgrade(plan.key)}
                  className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${isCurrent ? 'bg-slate-100 text-slate-500 cursor-default' : 'bg-brand text-white shadow-lg hover:opacity-90'}`}
                >
                  {isCurrent ? 'Current Plan' : 'Upgrade Now'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 text-center md:text-left">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-brand">
              <CreditCard className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900">Payment Method</h4>
              <p className="text-slate-500 font-medium mt-1">{paymentMethodText}</p>
            </div>
          </div>
          <button
            onClick={handleUpdatePaymentMethod}
            className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Update Method
          </button>
        </div>
      </div>
    </div>
  );
};

export default Billing;

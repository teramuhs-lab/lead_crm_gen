
import React from 'react';
import { CreditCard, CheckCircle2, Zap, Shield, Rocket, ArrowRight } from 'lucide-react';

const Billing: React.FC = () => {
  const plans = [
    { name: 'Starter', price: '97', features: ['3 Sub-accounts', 'Email Sequences', 'Landing Pages'], current: false },
    { name: 'Professional', price: '297', features: ['10 Sub-accounts', 'SMS Automation', 'Workflow Builder', 'CRM Analytics'], current: true },
    { name: 'Agency Pro', price: '497', features: ['Unlimited Sub-accounts', 'White Labeling', 'Custom API Access', 'Priority Support'], current: false },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900">Choose Your Agency Path</h2>
        <p className="text-slate-500">Scale your marketing automation business with the right tier.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.name} className={`relative bg-white rounded-xl p-8 border ${plan.current ? 'border-brand ring-4 ring-brand ring-opacity-10' : 'border-slate-200'} shadow-xl`}>
            {plan.current && (
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

              <button className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${plan.current ? 'bg-slate-100 text-slate-500 cursor-default' : 'bg-brand text-white shadow-lg hover:opacity-90'}`}>
                {plan.current ? 'Current Plan' : 'Upgrade Now'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 text-center md:text-left">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-brand">
              <CreditCard className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900">Payment Method</h4>
              <p className="text-slate-500 font-medium mt-1">Visa ending in 4242 (Exp 12/26)</p>
            </div>
          </div>
          <button className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors">Update Method</button>
        </div>
      </div>
    </div>
  );
};

export default Billing;

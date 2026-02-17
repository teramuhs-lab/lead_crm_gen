
import React, { useState } from 'react';
import { Rocket, DollarSign, CheckCircle2, Shield, Settings2, RefreshCw, BarChart3, Plus, ChevronRight } from 'lucide-react';
import { SaaSPlan } from '../types';

const SaaSMode: React.FC = () => {
  const [markup, setMarkup] = useState(20);
  const [plans, setPlans] = useState<SaaSPlan[]>([
    { id: '1', name: 'Starter SaaS', price: 97, features: ['Unlimited Contacts', 'Form Builder', 'Funnel Basics'], isDefault: true },
    { id: '2', name: 'Agency Pro SaaS', price: 297, features: ['Automated Workflows', 'Reputation Manager', 'SaaS Rebilling'], isDefault: false },
  ]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 bg-brand/10 text-brand rounded-xl flex items-center justify-center">
              <Rocket className="w-10 h-10" />
           </div>
           <div>
              <h2 className="text-2xl font-semibold text-slate-900">SaaS Mode Settings</h2>
              <p className="text-sm text-slate-500">Resell Nexus under your own brand and keep 100% of the profits</p>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="px-3 py-1.5 bg-brand text-white rounded-full text-xs font-semibold">SaaS Enabled</span>
           <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand transition-colors"><Settings2 className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
               <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Resale Plans</h3>
                  <button className="flex items-center gap-2 text-xs font-bold text-brand hover:underline">
                     <Plus className="w-4 h-4" /> Create New Plan
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map(plan => (
                    <div key={plan.id} className="p-6 border border-slate-100 bg-slate-50 rounded-xl hover:border-brand transition-all group cursor-pointer">
                       <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-slate-900">{plan.name}</h4>
                          <span className="text-xl font-semibold text-brand">${plan.price}</span>
                       </div>
                       <ul className="space-y-2 mb-6">
                          {plan.features.slice(0, 3).map(f => (
                            <li key={f} className="flex items-center gap-2 text-xs font-medium text-slate-500">
                               <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {f}
                            </li>
                          ))}
                       </ul>
                       <button className="w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium group-hover:bg-brand group-hover:text-white transition-all">Edit Features</button>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                     <RefreshCw className="w-6 h-6" />
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-900">Twilio & Email Rebilling</h3>
                     <p className="text-xs text-slate-500 font-medium">Earn profit on every text, call, and email your sub-accounts send</p>
                  </div>
               </div>

               <div className="space-y-6 pt-4">
                  <div>
                     <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-semibold text-slate-400">Global Rebilling Markup</label>
                        <span className="text-sm font-semibold text-emerald-600">{markup}% Markup</span>
                     </div>
                     <input
                       type="range"
                       min="1"
                       max="300"
                       value={markup}
                       onChange={(e) => setMarkup(parseInt(e.target.value))}
                       className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand"
                     />
                     <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
                        <span>1% (COST)</span>
                        <span>300% (MAX)</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                        <p className="text-xs font-medium text-slate-400 mb-1">Nexus Cost (SMS)</p>
                        <p className="text-sm font-semibold text-slate-900">$0.0079</p>
                     </div>
                     <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <p className="text-xs font-medium text-emerald-600 mb-1">Your Price (SMS)</p>
                        <p className="text-sm font-semibold text-emerald-700">${(0.0079 * (1 + markup/100)).toFixed(4)}</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-8 text-white shadow-md relative overflow-hidden">
               <div className="relative z-10">
                  <BarChart3 className="w-8 h-8 mb-4 text-brand" />
                  <h4 className="text-xl font-semibold mb-1">SaaS Economics</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">Based on your current plan adoption and markup settings.</p>

                  <div className="space-y-4">
                     <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-slate-400">Subscription Rev</span>
                        <span className="text-xs font-semibold text-emerald-400">+$12,400</span>
                     </div>
                     <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-slate-400">Rebilling Margin</span>
                        <span className="text-xs font-semibold text-emerald-400">+$2,150</span>
                     </div>
                     <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-slate-400">Platform Cost</span>
                        <span className="text-xs font-semibold text-rose-400">-$497</span>
                     </div>
                     <div className="pt-2 flex justify-between">
                        <span className="text-sm font-semibold">Net Profit</span>
                        <span className="text-sm font-semibold text-brand">$14,053</span>
                     </div>
                  </div>
               </div>
               <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand/10 blur-3xl rounded-full"></div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
               <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand" /> Auto-Setup
               </h4>
               <p className="text-xs text-slate-500 leading-relaxed">Nexus automatically creates the sub-account and Stripe subscription when a client signs up through your link.</p>
               <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-medium text-slate-400 mb-2">Checkout URL</p>
                  <div className="flex gap-2">
                     <input type="text" value="nexus.io/signup/alex" readOnly className="flex-1 bg-transparent border-none text-xs font-bold outline-none" />
                     <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SaaSMode;

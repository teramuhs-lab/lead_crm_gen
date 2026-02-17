
import React from 'react';
import { Users2, DollarSign, TrendingUp, Plus, ArrowRight, UserPlus, FileText, CheckCircle2 } from 'lucide-react';
import { Affiliate } from '../types';

const AffiliateManager: React.FC = () => {
  const affiliates: Affiliate[] = [
    { id: 'af1', name: 'Digital Growth Agency', commission: 4500.00, referrals: 124, payoutStatus: 'pending' },
    { id: 'af2', name: 'Marketer Mike', commission: 1200.00, referrals: 42, payoutStatus: 'paid' },
    { id: 'af3', name: 'SaaS Partner Pro', commission: 850.00, referrals: 15, payoutStatus: 'pending' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Affiliate Manager</h2>
          <p className="text-sm text-slate-500">Manage partners, track commissions, and automate payouts</p>
        </div>
        <button className="px-6 py-3 bg-brand text-white rounded-xl font-semibold shadow-lg flex items-center gap-2 hover:opacity-90 transition-all">
          <UserPlus className="w-4 h-4" /> Recruit Affiliate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-medium text-slate-400">Unpaid Commissions</p>
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><DollarSign className="w-4 h-4" /></div>
           </div>
           <p className="text-3xl font-semibold text-slate-900">$5,350.00</p>
           <p className="text-xs text-amber-600 font-medium mt-2">Due in 5 days</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-medium text-slate-400">Active Partners</p>
              <div className="p-2 bg-indigo-50 rounded-xl text-brand"><Users2 className="w-4 h-4" /></div>
           </div>
           <p className="text-3xl font-semibold text-slate-900">181</p>
           <p className="text-xs text-emerald-600 font-medium mt-2">+12 this week</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-medium text-slate-400">Partner Revenue</p>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><TrendingUp className="w-4 h-4" /></div>
           </div>
           <p className="text-3xl font-semibold text-slate-900">$42,900.00</p>
           <p className="text-xs text-slate-400 font-medium mt-2">Lifetime Value</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Top Performing Partners</h3>
            <button className="text-xs font-semibold text-brand hover:underline">View All Affiliates</button>
         </div>
         <div className="divide-y divide-slate-50">
            {affiliates.map(af => (
              <div key={af.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-semibold text-slate-400">
                       {af.name.charAt(0)}
                    </div>
                    <div>
                       <h4 className="font-semibold text-slate-900 text-sm group-hover:text-brand transition-colors">{af.name}</h4>
                       <p className="text-xs text-slate-400 font-medium mt-0.5">{af.referrals} Active Referrals</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="text-right">
                       <p className="text-xs text-slate-400 font-medium">Earned</p>
                       <p className="text-sm font-semibold text-slate-900">${af.commission.toLocaleString()}</p>
                    </div>
                    <div className="text-right min-w-[100px]">
                       <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${af.payoutStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {af.payoutStatus}
                       </span>
                    </div>
                    <button className="p-2 text-slate-300 hover:text-slate-900 transition-colors"><ArrowRight className="w-4 h-4" /></button>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default AffiliateManager;

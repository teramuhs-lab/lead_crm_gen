
import React from 'react';
import { DollarSign, Plus, ArrowUpRight, ArrowDownRight, FileText, Clock, CheckCircle2, MoreHorizontal, CreditCard } from 'lucide-react';
import { Invoice } from '../types';

const PaymentsManager: React.FC = () => {
  const invoices: Invoice[] = [
    { id: 'inv1', contactName: 'Acme Growth Co', amount: 1250.00, status: 'paid', date: 'Oct 15, 2023' },
    { id: 'inv2', contactName: 'Zane Legal', amount: 3400.00, status: 'pending', date: 'Oct 12, 2023' },
    { id: 'inv3', contactName: 'Fresh Fitness', amount: 150.00, status: 'overdue', date: 'Oct 01, 2023' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Payments</h2>
          <p className="text-slate-500 text-sm">Manage invoices, subscriptions, and revenue tracking</p>
        </div>
        <button className="px-6 py-3 bg-brand text-white rounded-xl font-semibold shadow-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <span className="text-xs font-medium text-slate-400">Revenue</span>
             <div className="p-1 bg-emerald-50 text-emerald-600 rounded"><ArrowUpRight className="w-4 h-4" /></div>
          </div>
          <span className="text-3xl font-semibold text-slate-900">$12,450.00</span>
          <p className="text-xs text-emerald-600 mt-2 font-semibold">+12.4% vs last month</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <span className="text-xs font-medium text-slate-400">Outstanding</span>
             <div className="p-1 bg-amber-50 text-amber-600 rounded"><Clock className="w-4 h-4" /></div>
          </div>
          <span className="text-3xl font-semibold text-slate-900">$4,800.00</span>
          <p className="text-xs text-slate-500 mt-2 font-medium">8 pending invoices</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <span className="text-xs font-medium text-slate-400">Payment Methods</span>
             <CreditCard className="w-5 h-5 text-brand" />
          </div>
          <span className="text-3xl font-semibold text-slate-900">Stripe</span>
          <p className="text-xs text-emerald-600 mt-2 font-semibold">Account Connected</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <h3 className="font-semibold text-slate-900">Recent Invoices</h3>
           <button className="text-xs font-semibold text-brand hover:underline">View All</button>
        </div>
        <div className="divide-y divide-slate-100">
           {invoices.map(inv => (
             <div key={inv.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <FileText className="w-6 h-6" />
                   </div>
                   <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{inv.contactName}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{inv.date} • {inv.id.toUpperCase()}</p>
                   </div>
                </div>
                <div className="flex items-center gap-8">
                   <span className="text-sm font-semibold text-slate-900">${inv.amount.toLocaleString()}</span>
                   <span className={`
                      inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold
                      ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : inv.status === 'overdue' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}
                   `}>
                      {inv.status}
                   </span>
                   <button className="p-2 text-slate-400 hover:text-slate-900"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentsManager;

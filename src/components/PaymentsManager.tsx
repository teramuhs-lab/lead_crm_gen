
import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, ArrowUpRight, Clock, FileText, MoreHorizontal, CreditCard, User } from 'lucide-react';
import { Invoice } from '../types';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import { NexusCard, NexusButton, NexusInput, NexusTextArea, NexusModal, NexusSelect, NexusHeader } from './NexusUI';

const PaymentsManager: React.FC = () => {
  const { activeSubAccount, contacts, notify } = useNexus();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isStripeConnected, setIsStripeConnected] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form fields for creating an invoice
  const [formContactId, setFormContactId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  // Fetch invoices and stripe status on mount / when sub-account changes
  useEffect(() => {
    if (!activeSubAccount?.id) return;

    const fetchData = async () => {
      try {
        const [invoicesData, statusData] = await Promise.all([
          api.get<Invoice[]>(`/payments/invoices?subAccountId=${activeSubAccount.id}`).catch(() => [] as Invoice[]),
          api.get<{ configured: boolean }>('/payments/status').catch(() => ({ configured: false })),
        ]);
        setInvoices(invoicesData);
        setIsStripeConnected(statusData.configured);
      } catch {
        // keep defaults on failure
      }
    };

    fetchData();
  }, [activeSubAccount?.id]);

  // Computed stats from real invoices
  const revenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const outstanding = invoices
    .filter(inv => inv.status === 'open' || inv.status === 'draft')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const outstandingCount = invoices.filter(inv => inv.status === 'open' || inv.status === 'draft').length;

  const resetForm = () => {
    setFormContactId('');
    setFormAmount('');
    setFormDescription('');
    setFormDueDate('');
  };

  const handleCreateInvoice = async () => {
    if (!formContactId || !formAmount) {
      notify('Please select a contact and enter an amount', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const newInvoice = await api.post<Invoice>('/payments/create-invoice', {
        contactId: formContactId,
        subAccountId: activeSubAccount.id,
        amount: parseFloat(formAmount),
        description: formDescription,
        dueDate: formDueDate || undefined,
      });
      setInvoices(prev => [newInvoice, ...prev]);
      notify('Invoice created successfully');
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      notify(err.message || 'Failed to create invoice', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const statusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-600';
      case 'open': return 'bg-amber-50 text-amber-600';
      case 'draft': return 'bg-slate-100 text-slate-600';
      case 'void': return 'bg-rose-50 text-rose-600';
      case 'uncollectible': return 'bg-rose-50 text-rose-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <NexusHeader title="Payments" subtitle="Process payments, manage invoices, and track revenue">
        <NexusButton icon={Plus} onClick={() => setShowCreateModal(true)}>
          Create Invoice
        </NexusButton>
      </NexusHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <span className="text-xs font-medium text-slate-400">Revenue</span>
             <div className="p-1 bg-emerald-50 text-emerald-600 rounded"><ArrowUpRight className="w-4 h-4" /></div>
          </div>
          <span className="text-3xl font-semibold text-slate-900">${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <p className="text-xs text-emerald-600 mt-2 font-semibold">From {invoices.filter(i => i.status === 'paid').length} paid invoice{invoices.filter(i => i.status === 'paid').length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <span className="text-xs font-medium text-slate-400">Outstanding</span>
             <div className="p-1 bg-amber-50 text-amber-600 rounded"><Clock className="w-4 h-4" /></div>
          </div>
          <span className="text-3xl font-semibold text-slate-900">${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <p className="text-xs text-slate-500 mt-2 font-medium">{outstandingCount} pending invoice{outstandingCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <span className="text-xs font-medium text-slate-400">Payment Methods</span>
             <CreditCard className="w-5 h-5 text-brand" />
          </div>
          <span className="text-3xl font-semibold text-slate-900">Stripe</span>
          {isStripeConnected ? (
            <p className="text-xs text-emerald-600 mt-2 font-semibold">Connected</p>
          ) : (
            <p className="text-xs text-amber-600 mt-2 font-semibold">Not configured</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <h3 className="font-semibold text-slate-900">Recent Invoices</h3>
           <button className="text-xs font-semibold text-brand hover:underline">View All</button>
        </div>
        <div className="divide-y divide-slate-100">
           {invoices.length === 0 && (
             <div className="p-12 text-center text-slate-400 text-sm">No invoices yet. Create your first invoice to get started.</div>
           )}
           {invoices.map(inv => (
             <div key={inv.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <FileText className="w-6 h-6" />
                   </div>
                   <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{inv.contactName}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(inv.createdAt)} {inv.description ? `\u2022 ${inv.description}` : ''}</p>
                   </div>
                </div>
                <div className="flex items-center gap-8">
                   <span className="text-sm font-semibold text-slate-900">${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                   <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${statusColor(inv.status)}`}>
                      {inv.status}
                   </span>
                   <button className="p-2 text-slate-400 hover:text-slate-900"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* Create Invoice Modal */}
      <NexusModal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); resetForm(); }} title="Create Invoice" subtitle="Send an invoice to a contact">
        <div className="space-y-4">
          <NexusSelect label="Contact" icon={User} value={formContactId} onChange={e => setFormContactId(e.target.value)}>
            <option value="">Select a contact...</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
            ))}
          </NexusSelect>

          <NexusInput
            label="Amount ($)"
            type="number"
            placeholder="0.00"
            icon={DollarSign}
            value={formAmount}
            onChange={e => setFormAmount(e.target.value)}
            min="0"
            step="0.01"
          />

          <NexusTextArea
            label="Description"
            placeholder="Invoice description..."
            value={formDescription}
            onChange={e => setFormDescription(e.target.value)}
            rows={3}
          />

          <NexusInput
            label="Due Date"
            type="date"
            value={formDueDate}
            onChange={e => setFormDueDate(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <NexusButton variant="ghost" onClick={() => { setShowCreateModal(false); resetForm(); }}>
              Cancel
            </NexusButton>
            <NexusButton onClick={handleCreateInvoice} loading={isCreating} disabled={isCreating}>
              Create Invoice
            </NexusButton>
          </div>
        </div>
      </NexusModal>
    </div>
  );
};

export default PaymentsManager;

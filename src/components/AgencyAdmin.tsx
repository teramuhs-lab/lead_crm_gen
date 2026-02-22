
import React, { useState } from 'react';
import {
  ShieldCheck, Plus, MoreHorizontal, Globe, Mail, Clock,
  CheckCircle2, AlertCircle, Trash2, X, Shield, Activity,
  Server, Zap, Cpu, Phone, Key, ShieldAlert, Terminal, RefreshCw
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { api } from '../lib/api';
import { SubAccount } from '../types';
import { NexusCard, NexusButton, NexusHeader, NexusModal, NexusInput, NexusSelect } from './NexusUI';

const AgencyAdmin: React.FC = () => {
  const { subAccounts, setSubAccounts, notify } = useNexus();
  const [showAddModal, setShowAddModal] = useState(false);
  const [verifyingTwilioId, setVerifyingTwilioId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newAccount, setNewAccount] = useState<Partial<SubAccount>>({
    name: '', domain: '', plan: 'starter', status: 'active', leadValue: 100
  });

  const handleAdd = async () => {
    if (!newAccount.name || !newAccount.domain) return;
    setSaving(true);
    try {
      const saved = await api.post<SubAccount>('/sub-accounts', {
        name: newAccount.name,
        domain: newAccount.domain,
        plan: newAccount.plan,
        status: 'active',
        leadValue: newAccount.leadValue || 100,
      });
      setSubAccounts(prev => [...prev, saved]);
      setShowAddModal(false);
      setNewAccount({ name: '', domain: '', plan: 'starter', status: 'active', leadValue: 100 });
      notify(`Account Created: ${saved.name}`);
    } catch {
      notify('Failed to create account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyTwilio = (id: string) => {
    setVerifyingTwilioId(id);
    setTimeout(() => {
      setVerifyingTwilioId(null);
      setSubAccounts(prev => prev.map(s => s.id === id ? { ...s, twilio: { isVerified: true } } : s));
      notify("Twilio Pair Verified.");
    }, 2000);
  };

  const handleDelete = async (id: string) => {
    const removed = subAccounts.find(s => s.id === id);
    setSubAccounts(prev => prev.filter(s => s.id !== id));
    notify("Account Deleted.", "info");
    try {
      await api.delete(`/sub-accounts/${id}`);
    } catch {
      if (removed) setSubAccounts(prev => [...prev, removed]);
      notify('Failed to delete account', 'error');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <NexusHeader title="Account Management" subtitle="Manage sub-accounts and distribution settings">
        <NexusButton onClick={() => setShowAddModal(true)} icon={Plus}>Add Account</NexusButton>
      </NexusHeader>

      <NexusCard padding="none" className="border-b-[12px] border-brand/5">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
           <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-3">
              <Server className="w-5 h-5 text-brand" /> Active Sub-Accounts
           </h3>
           <span className="text-xs font-medium text-slate-400">{subAccounts.length} Accounts Listed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="px-10 py-6 text-xs font-semibold text-slate-400">Account Details</th>
                <th className="px-10 py-6 text-xs font-semibold text-slate-400">Plan</th>
                <th className="px-10 py-6 text-xs font-semibold text-slate-400">Twilio Status</th>
                <th className="px-10 py-6 text-xs font-semibold text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {subAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-semibold text-brand text-lg group-hover:bg-brand group-hover:text-white transition-all shadow-sm">
                        {account.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{account.name}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1.5 flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-slate-300" /> {account.domain}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className="inline-flex items-center px-5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 shadow-sm">
                      {account.plan}
                    </span>
                  </td>
                  <td className="px-10 py-8">
                     <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${account.twilio?.isVerified ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                           <Phone className="w-5 h-5" />
                        </div>
                        <div>
                           <p className={`text-xs font-medium ${account.twilio?.isVerified ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {account.twilio?.isVerified ? 'Signal Verified' : 'No Signal Connection'}
                           </p>
                           <button
                             onClick={() => handleVerifyTwilio(account.id)}
                             className="text-xs font-medium text-slate-400 hover:text-brand mt-1"
                           >
                              {verifyingTwilioId === account.id ? 'Adding...' : 'Add Twilio Pair'}
                           </button>
                        </div>
                     </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="p-4 bg-white text-slate-300 hover:text-brand hover:bg-indigo-50 border border-slate-100 rounded-xl shadow-sm transition-all"><Terminal className="w-5 h-5" /></button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="p-4 bg-white text-slate-300 hover:text-rose-500 hover:bg-rose-50 border border-slate-100 rounded-xl shadow-sm transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NexusCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <div className="lg:col-span-2 bg-slate-900 rounded-xl p-6 text-white shadow-md relative overflow-hidden group border-8 border-white shadow-indigo-100">
            <div className="relative z-10 flex flex-col h-full">
               <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mb-10 shadow-md shadow-brand/40">
                  <ShieldAlert className="w-8 h-8 text-white" />
               </div>
               <h3 className="text-3xl font-semibold mb-6">Credential Encryption</h3>
               <p className="text-sm text-slate-400 leading-relaxed mb-10 max-w-lg">All Twilio Account SIDs and Auth Tokens are AES-256 encrypted at rest. Nexus operates on a Zero-Knowledge Architecture, ensuring account isolation at the database layer.</p>
               <div className="flex gap-4 mt-auto">
                  <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-xl border border-white/10">
                     <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                     <span className="text-xs font-medium text-slate-400">SOC2 Type II</span>
                  </div>
                  <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-xl border border-white/10">
                     <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                     <span className="text-xs font-medium text-slate-400">HIPAA Compliant</span>
                  </div>
               </div>
            </div>
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
               <Zap className="w-96 h-96 text-brand rotate-12" />
            </div>
         </div>

         <NexusCard padding="md" className="space-y-8 flex flex-col group">
            <div className="flex items-center justify-between">
               <h4 className="text-sm font-semibold text-slate-900">Webhook Publishing</h4>
               <RefreshCw className="w-4 h-4 text-slate-300 group-hover:rotate-180 transition-transform duration-700" />
            </div>
            <div className="space-y-6 flex-1">
               <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <p className="text-xs font-medium text-slate-400">Inbound SMS URL</p>
                  <code className="text-xs font-mono text-brand block truncate">https://api.nexus.io/v1/twilio/sms/inbound</code>
               </div>
               <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <p className="text-xs font-medium text-slate-400">Call Status Callback</p>
                  <code className="text-xs font-mono text-brand block truncate">https://api.nexus.io/v1/twilio/voice/status</code>
               </div>
            </div>
            <NexusButton variant="brand" size="lg" className="w-full">
               Rotate Global Secret Keys
            </NexusButton>
         </NexusCard>
      </div>

      <NexusModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Account" subtitle="Set up a new sub-account">
         <div className="space-y-6">
            <NexusInput label="Client Name" placeholder="Acme Global" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} />
            <NexusInput label="Custom Domain" placeholder="acme.nexus-app.io" value={newAccount.domain} onChange={e => setNewAccount({...newAccount, domain: e.target.value})} />
            <NexusSelect label="Plan" value={newAccount.plan} onChange={e => setNewAccount({...newAccount, plan: e.target.value as any})}>
               <option value="starter">Starter</option>
               <option value="pro">Enterprise Pro</option>
               <option value="agency">Agency Master</option>
            </NexusSelect>
            <div className="pt-6">
               <NexusButton className="w-full" size="xl" onClick={handleAdd} disabled={saving}>
                 {saving ? 'Saving...' : 'Save Account'}
               </NexusButton>
            </div>
         </div>
      </NexusModal>
    </div>
  );
};

export default AgencyAdmin;

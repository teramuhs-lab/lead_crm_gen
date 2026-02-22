
import React, { useState, useEffect, useCallback } from 'react';
import {
  Rocket, DollarSign, CheckCircle2, Shield, Settings2,
  RefreshCw, BarChart3, Plus, ChevronRight, X, Loader2,
  Trash2, Edit3, Cpu,
} from 'lucide-react';
import { SaaSPlan, TenantAIUsage } from '../types';
import { NexusHeader } from './NexusUI';

interface Economics {
  subscriptionRevenue: number;
  rebillingMargin: number;
  platformCost: number;
  netProfit: number;
  subAccountCount: number;
  planBreakdown: { plan: string; count: number; revenue: number }[];
}

interface PlanFormData {
  name: string;
  price: string;
  features: string[];
  rebillingMarkup: number;
  isDefault: boolean;
}

interface TenantUsageData {
  tenants: TenantAIUsage[];
  aggregated: {
    totalCallsAllTenants: number;
    avgCallsPerTenant: number;
    heaviestUser: { name: string; calls: number } | null;
  };
}

const emptyForm: PlanFormData = {
  name: '',
  price: '',
  features: [''],
  rebillingMarkup: 20,
  isDefault: false,
};

const SaaSMode: React.FC = () => {
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [economics, setEconomics] = useState<Economics | null>(null);
  const [tenantUsage, setTenantUsage] = useState<TenantUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markup, setMarkup] = useState(20);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaaSPlan | null>(null);
  const [form, setForm] = useState<PlanFormData>(emptyForm);
  const [newFeature, setNewFeature] = useState('');

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/saas/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        // Use the first plan's rebilling markup as global default
        if (data.length > 0) {
          setMarkup(data[0].rebillingMarkup ?? 20);
        }
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  }, []);

  // Fetch economics
  const fetchEconomics = useCallback(async () => {
    try {
      const res = await fetch('/api/saas/economics');
      if (res.ok) {
        const data = await res.json();
        setEconomics(data);
      }
    } catch (err) {
      console.error('Failed to fetch economics:', err);
    }
  }, []);

  // Fetch tenant AI usage
  const fetchTenantUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/saas/ai-usage');
      if (res.ok) {
        const data = await res.json();
        setTenantUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch tenant AI usage:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPlans(), fetchEconomics(), fetchTenantUsage()]);
      setLoading(false);
    };
    load();
  }, [fetchPlans, fetchEconomics, fetchTenantUsage]);

  // Open create modal
  const openCreateModal = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setNewFeature('');
    setModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (plan: SaaSPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      price: String(plan.price),
      features: plan.features.length > 0 ? [...plan.features] : [''],
      rebillingMarkup: plan.rebillingMarkup ?? 20,
      isDefault: plan.isDefault,
    });
    setNewFeature('');
    setModalOpen(true);
  };

  // Add feature
  const addFeature = () => {
    const val = newFeature.trim();
    if (val) {
      setForm(prev => ({ ...prev, features: [...prev.features, val] }));
      setNewFeature('');
    }
  };

  // Remove feature
  const removeFeature = (index: number) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  // Save plan (create or update)
  const savePlan = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        price: parseInt(form.price, 10),
        features: form.features.filter(f => f.trim() !== ''),
        rebillingMarkup: form.rebillingMarkup,
        isDefault: form.isDefault,
      };

      const url = editingPlan
        ? `/api/saas/plans/${editingPlan.id}`
        : '/api/saas/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        setEditingPlan(null);
        await Promise.all([fetchPlans(), fetchEconomics()]);
      }
    } catch (err) {
      console.error('Failed to save plan:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete plan
  const deletePlan = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      const res = await fetch(`/api/saas/plans/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await Promise.all([fetchPlans(), fetchEconomics()]);
      }
    } catch (err) {
      console.error('Failed to delete plan:', err);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <NexusHeader title="SaaS Mode Settings" subtitle="Configure and manage your white-label SaaS platform for clients">
          <span className="px-3 py-1.5 bg-brand text-white rounded-full text-xs font-semibold">SaaS Enabled</span>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand transition-colors">
            <Settings2 className="w-5 h-5" />
          </button>
      </NexusHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Plans + Rebilling */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resale Plans */}
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Resale Plans</h3>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 text-xs font-bold text-brand hover:underline"
              >
                <Plus className="w-4 h-4" /> Create New Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map(plan => (
                <div
                  key={plan.id}
                  className="p-6 border border-slate-100 bg-slate-50 rounded-xl hover:border-brand transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900">{plan.name}</h4>
                      {plan.isDefault && (
                        <span className="text-[10px] font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-xl font-semibold text-brand">${plan.price}<span className="text-xs text-slate-400 font-medium">/mo</span></span>
                  </div>

                  <ul className="space-y-2 mb-4">
                    {plan.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {f}
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-xs text-slate-400 font-medium pl-5">
                        +{plan.features.length - 4} more
                      </li>
                    )}
                  </ul>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                    <DollarSign className="w-3 h-3" />
                    <span className="font-medium">{plan.rebillingMarkup ?? 20}% rebilling markup</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium hover:bg-brand hover:text-white hover:border-brand transition-all flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => deletePlan(plan.id)}
                      className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              {plans.length === 0 && (
                <div className="col-span-2 text-center py-12 text-slate-400">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No plans yet. Create your first resale plan.</p>
                </div>
              )}
            </div>
          </div>

          {/* Rebilling Section */}
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
                  <p className="text-sm font-semibold text-emerald-700">
                    ${(0.0079 * (1 + markup / 100)).toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Economics Panel */}
          <div className="bg-slate-900 rounded-xl p-8 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <BarChart3 className="w-8 h-8 mb-4 text-brand" />
              <h4 className="text-xl font-semibold mb-1">SaaS Economics</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Based on your current plan adoption and markup settings.
              </p>

              {economics ? (
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-slate-400">Subscription Rev</span>
                    <span className="text-xs font-semibold text-emerald-400">
                      +{formatCurrency(economics.subscriptionRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-slate-400">Rebilling Margin</span>
                    <span className="text-xs font-semibold text-emerald-400">
                      +{formatCurrency(economics.rebillingMargin)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-slate-400">Platform Cost</span>
                    <span className="text-xs font-semibold text-rose-400">
                      -{formatCurrency(economics.platformCost)}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-sm font-semibold">Net Profit</span>
                    <span className="text-sm font-semibold text-brand">
                      {formatCurrency(economics.netProfit)}
                    </span>
                  </div>

                  {economics.planBreakdown.length > 0 && (
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-wider">Plan Breakdown</p>
                      {economics.planBreakdown.map((b, i) => (
                        <div key={i} className="flex justify-between text-xs mb-2">
                          <span className="text-slate-400 capitalize">{b.plan} ({b.count})</span>
                          <span className="text-slate-300 font-medium">{formatCurrency(b.revenue)}</span>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-xs">
                        <span className="text-slate-400">Total Sub-Accounts</span>
                        <span className="text-white font-semibold">{economics.subAccountCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand/10 blur-3xl rounded-full"></div>
          </div>

          {/* Auto-Setup Section */}
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand" /> Auto-Setup
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nexus automatically creates the sub-account and Stripe subscription when a client signs up through your link.
            </p>
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-medium text-slate-400 mb-2">Checkout URL</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="nexus.io/signup/alex"
                  readOnly
                  className="flex-1 bg-transparent border-none text-xs font-bold outline-none"
                />
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Usage by Tenant */}
      {tenantUsage && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">AI Usage by Tenant</h3>
              <p className="text-xs text-slate-500 font-medium">Current month AI call metrics across all sub-accounts</p>
            </div>
          </div>

          {/* Aggregate Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl">
              <p className="text-xs font-medium text-violet-600 mb-1">Total AI Calls</p>
              <p className="text-xl font-bold text-violet-700">
                {new Intl.NumberFormat('en-US').format(tenantUsage.aggregated.totalCallsAllTenants)}
              </p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs font-medium text-blue-600 mb-1">Avg per Tenant</p>
              <p className="text-xl font-bold text-blue-700">
                {tenantUsage.aggregated.avgCallsPerTenant.toFixed(1)}
              </p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-xs font-medium text-amber-600 mb-1">Heaviest User</p>
              <p className="text-xl font-bold text-amber-700">
                {tenantUsage.aggregated.heaviestUser
                  ? `${tenantUsage.aggregated.heaviestUser.name} (${tenantUsage.aggregated.heaviestUser.calls})`
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Tenant Table */}
          {tenantUsage.tenants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Calls</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quota Used</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Feature</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantUsage.tenants.map(tenant => {
                    const quotaColor =
                      tenant.quotaUsedPercent >= 90
                        ? 'text-rose-600 bg-rose-50'
                        : tenant.quotaUsedPercent >= 70
                          ? 'text-amber-600 bg-amber-50'
                          : 'text-emerald-600 bg-emerald-50';

                    return (
                      <tr key={tenant.subAccountId} className="border-b border-slate-50 hover:bg-slate-25 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900">{tenant.subAccountName}</td>
                        <td className="py-3 px-4">
                          <span className="capitalize text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {tenant.plan}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-700">
                          {new Intl.NumberFormat('en-US').format(tenant.totalAiCalls)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${quotaColor}`}>
                            {tenant.quotaUsedPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 font-medium">
                          {tenant.topFeature.replace(/^ai_/, '').replace(/_/g, ' ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Cpu className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No AI usage data yet</p>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Plan Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Starter SaaS"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Price ($/mo)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="97"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Features</label>
                <div className="space-y-2">
                  {form.features.map((feature, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="text-slate-700">{feature}</span>
                      </div>
                      <button
                        onClick={() => removeFeature(i)}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={e => setNewFeature(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                      placeholder="Add a feature..."
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    />
                    <button
                      onClick={addFeature}
                      className="px-3 py-2 bg-brand/10 text-brand rounded-xl text-sm font-medium hover:bg-brand/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Markup Slider */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-500">Rebilling Markup</label>
                  <span className="text-xs font-semibold text-emerald-600">{form.rebillingMarkup}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="300"
                  value={form.rebillingMarkup}
                  onChange={e => setForm(prev => ({ ...prev, rebillingMarkup: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand"
                />
                <div className="flex justify-between mt-1 text-[10px] font-bold text-slate-400">
                  <span>1%</span>
                  <span>300%</span>
                </div>
              </div>

              {/* Default Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500">Set as Default Plan</label>
                <button
                  onClick={() => setForm(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.isDefault ? 'bg-brand' : 'bg-slate-200'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isDefault ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePlan}
                disabled={saving || !form.name || !form.price}
                className="flex-1 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSMode;

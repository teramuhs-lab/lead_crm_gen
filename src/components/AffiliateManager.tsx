
import React, { useState, useCallback, useEffect } from 'react';
import {
  Users2, DollarSign, TrendingUp, Plus, Search, Trash2,
  Loader2, X, UserPlus, Edit3, CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import { Affiliate, AffiliateStatus, PayoutStatus } from '../types';
import { NexusHeader } from './NexusUI';

// ── Stats shape returned by /api/affiliates/stats ──
interface AffiliateStats {
  unpaidCommissions: number;   // cents
  activePartners: number;
  totalReferrals: number;
}

const DEFAULT_STATS: AffiliateStats = {
  unpaidCommissions: 0,
  activePartners: 0,
  totalReferrals: 0,
};

const PAYOUT_COLORS: Record<PayoutStatus, string> = {
  paid: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-amber-50 text-amber-600',
  processing: 'bg-blue-50 text-blue-600',
};

const STATUS_COLORS: Record<AffiliateStatus, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  inactive: 'bg-slate-100 text-slate-500',
  pending: 'bg-amber-50 text-amber-600',
};

/** Convert cents to formatted USD string */
const centsToUSD = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const AffiliateManager: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();

  // ── Data state ──
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [stats, setStats] = useState<AffiliateStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('');

  // ── Recruit modal state ──
  const [showRecruitModal, setShowRecruitModal] = useState(false);
  const [newAffiliate, setNewAffiliate] = useState({
    name: '',
    email: '',
    commissionRate: 10,
  });
  const [saving, setSaving] = useState(false);

  // ── Edit modal state ──
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    commissionRate: 0,
    status: 'active' as AffiliateStatus,
  });
  const [editSaving, setEditSaving] = useState(false);

  // ── Fetch helpers ──
  const fetchAffiliates = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<Affiliate[]>(`/affiliates?subAccountId=${activeSubAccountId}`);
      setAffiliates(data);
    } catch {
      notify('Failed to load affiliates', 'error');
    }
  }, [activeSubAccountId, notify]);

  const fetchStats = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<AffiliateStats>(`/affiliates/stats?subAccountId=${activeSubAccountId}`);
      setStats(data);
    } catch {
      setStats(DEFAULT_STATS);
    }
  }, [activeSubAccountId, notify]);

  // ── Mount + activeSubAccountId change ──
  useEffect(() => {
    if (!activeSubAccountId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchAffiliates(), fetchStats()]);
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [activeSubAccountId, fetchAffiliates, fetchStats]);

  // ── Filtered affiliates ──
  const filteredAffiliates = affiliates.filter((a) => {
    const q = searchQuery.toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  // ── Actions ──
  const handleRecruit = useCallback(async () => {
    if (!newAffiliate.name.trim() || !newAffiliate.email.trim()) {
      notify('Name and email are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const created = await api.post<Affiliate>('/affiliates', {
        subAccountId: activeSubAccountId,
        name: newAffiliate.name,
        email: newAffiliate.email,
        commissionRate: newAffiliate.commissionRate,
      });
      setAffiliates((prev) => [created, ...prev]);
      setShowRecruitModal(false);
      setNewAffiliate({ name: '', email: '', commissionRate: 10 });
      notify('Affiliate recruited');
      fetchStats();
    } catch {
      notify('Failed to recruit affiliate', 'error');
    } finally {
      setSaving(false);
    }
  }, [newAffiliate, activeSubAccountId, notify, fetchStats]);

  const handleMarkAsPaid = useCallback(async (affiliate: Affiliate) => {
    try {
      const updated = await api.put<Affiliate>(`/affiliates/${affiliate.id}`, {
        payoutStatus: 'paid',
      });
      setAffiliates((prev) => prev.map((a) => (a.id === affiliate.id ? updated : a)));
      notify('Marked as paid');
      fetchStats();
    } catch {
      notify('Failed to update payout status', 'error');
    }
  }, [notify, fetchStats]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/affiliates/${id}`);
      setAffiliates((prev) => prev.filter((a) => a.id !== id));
      notify('Affiliate deleted');
      fetchStats();
    } catch {
      notify('Failed to delete affiliate', 'error');
    }
  }, [notify, fetchStats]);

  const openEditModal = useCallback((affiliate: Affiliate) => {
    setEditingAffiliate(affiliate);
    setEditForm({
      name: affiliate.name,
      email: affiliate.email,
      commissionRate: affiliate.commissionRate,
      status: affiliate.status,
    });
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingAffiliate) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      notify('Name and email are required', 'error');
      return;
    }
    setEditSaving(true);
    try {
      const updated = await api.put<Affiliate>(`/affiliates/${editingAffiliate.id}`, {
        name: editForm.name,
        email: editForm.email,
        commissionRate: editForm.commissionRate,
        status: editForm.status,
      });
      setAffiliates((prev) => prev.map((a) => (a.id === editingAffiliate.id ? updated : a)));
      setEditingAffiliate(null);
      notify('Affiliate updated');
      fetchStats();
    } catch {
      notify('Failed to update affiliate', 'error');
    } finally {
      setEditSaving(false);
    }
  }, [editingAffiliate, editForm, notify, fetchStats]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="pb-20 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 space-y-6 animate-in fade-in duration-700">
      <NexusHeader title="Affiliate Manager" subtitle="Set up and track affiliate partnerships, commissions, and referral links">
        <button
          onClick={() => setShowRecruitModal(true)}
          className="px-6 py-3 bg-brand text-white rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <UserPlus className="w-4 h-4" /> Recruit Affiliate
        </button>
      </NexusHeader>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Unpaid Commissions */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Unpaid Commissions</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-semibold text-slate-900">
            {centsToUSD(stats.unpaidCommissions)}
          </span>
        </div>

        {/* Active Partners */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Active Partners</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-brand">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-semibold text-slate-900">
            {stats.activePartners}
          </span>
        </div>

        {/* Total Referrals */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Total Referrals</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-semibold text-slate-900">
            {stats.totalReferrals}
          </span>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search affiliates by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
      </div>

      {/* ── Affiliate List ── */}
      {filteredAffiliates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Users2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-700 text-lg">No affiliates found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {affiliates.length === 0
              ? 'Recruit your first affiliate partner to get started.'
              : 'Try adjusting your search query.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAffiliates.map((affiliate) => (
            <div
              key={affiliate.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center justify-between gap-4 group"
            >
              {/* Left: Avatar + Info */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-semibold text-slate-400 shrink-0">
                  {affiliate.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-slate-900 text-sm group-hover:text-brand transition-colors truncate">
                    {affiliate.name}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                    {affiliate.email}
                  </p>
                </div>
              </div>

              {/* Middle: Metrics */}
              <div className="hidden md:flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-medium">Referrals</p>
                  <p className="text-sm font-semibold text-slate-900">{affiliate.referrals}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-medium">Earned</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {centsToUSD(affiliate.totalEarned)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 font-medium">Commission</p>
                  <p className="text-sm font-semibold text-slate-900">{affiliate.commissionRate}%</p>
                </div>
              </div>

              {/* Right: Status + Payout Badge + Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`hidden sm:inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[affiliate.status]}`}
                >
                  {affiliate.status}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${PAYOUT_COLORS[affiliate.payoutStatus]}`}
                >
                  {affiliate.payoutStatus}
                </span>

                {/* Edit */}
                <button
                  onClick={() => openEditModal(affiliate)}
                  title="Edit affiliate"
                  className="p-2 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {/* Mark as Paid */}
                {affiliate.payoutStatus !== 'paid' && (
                  <button
                    onClick={() => handleMarkAsPaid(affiliate)}
                    title="Mark as paid"
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(affiliate.id)}
                  title="Delete affiliate"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Recruit Modal ── */}
      {showRecruitModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in duration-700">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Recruit Affiliate</h3>
              <button
                onClick={() => setShowRecruitModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={newAffiliate.name}
                  onChange={(e) =>
                    setNewAffiliate((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Affiliate name"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={newAffiliate.email}
                  onChange={(e) =>
                    setNewAffiliate((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="affiliate@example.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>

              {/* Commission Rate */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newAffiliate.commissionRate}
                  onChange={(e) =>
                    setNewAffiliate((prev) => ({
                      ...prev,
                      commissionRate: Number(e.target.value),
                    }))
                  }
                  placeholder="10"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
              <button
                onClick={() => setShowRecruitModal(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecruit}
                disabled={saving}
                className="px-6 py-2.5 bg-brand text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Recruiting...' : 'Recruit Affiliate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingAffiliate && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in duration-700">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Affiliate</h3>
              <button
                onClick={() => setEditingAffiliate(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>

              {/* Commission Rate */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editForm.commissionRate}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      commissionRate: Number(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      status: e.target.value as AffiliateStatus,
                    }))
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
              <button
                onClick={() => setEditingAffiliate(null)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="px-6 py-2.5 bg-brand text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AffiliateManager;

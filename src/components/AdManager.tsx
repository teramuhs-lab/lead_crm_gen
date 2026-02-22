
import React, { useState, useCallback, useEffect } from 'react';
import {
  Plus, Search, Loader2, Sparkles, DollarSign, Users, TrendingUp,
  BarChart3, Pause, Play, Pencil, Trash2, X, Facebook, Linkedin,
  Monitor, Music2, Target,
} from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import { AdCampaign, AdPlatform, AdCampaignStatus } from '../types';
import { NexusHeader } from './NexusUI';

/* ─── helpers ─── */

interface AdStats {
  totalSpend: number;
  totalLeads: number;
  avgRoas: number;
  activeCampaigns: number;
}

const fmtCurrency = (cents: number) =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtRoas = (raw: number) => (raw / 100).toFixed(2) + 'x';

const platformMeta: Record<AdPlatform, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  facebook: { label: 'Facebook', icon: <Facebook className="w-5 h-5" />, bg: 'bg-blue-50', text: 'text-blue-600' },
  google:   { label: 'Google',   icon: <Monitor className="w-5 h-5" />,  bg: 'bg-red-50',  text: 'text-red-500' },
  linkedin: { label: 'LinkedIn', icon: <Linkedin className="w-5 h-5" />, bg: 'bg-blue-50', text: 'text-blue-700' },
  tiktok:   { label: 'TikTok',   icon: <Music2 className="w-5 h-5" />,   bg: 'bg-slate-50', text: 'text-slate-700' },
};

const statusBadge: Record<AdCampaignStatus, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  paused:    'bg-amber-100 text-amber-700',
  completed: 'bg-slate-100 text-slate-600',
  draft:     'bg-slate-50 text-slate-400',
};

/* ─── component ─── */

const AdManager: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();

  /* state */
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [stats, setStats] = useState<AdStats>({ totalSpend: 0, totalLeads: 0, avgRoas: 0, activeCampaigns: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  /* modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdCampaign | null>(null);
  const [form, setForm] = useState({
    name: '',
    platform: 'facebook' as AdPlatform,
    budget: '',
    startDate: '',
    endDate: '',
    status: 'draft' as AdCampaignStatus,
  });
  const [saving, setSaving] = useState(false);

  /* ai creative */
  const [aiPlatform, setAiPlatform] = useState<AdPlatform>('facebook');
  const [aiGoal, setAiGoal] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ headline: string; description: string; callToAction: string } | null>(null);
  const [applyTarget, setApplyTarget] = useState('');

  /* data fetching */
  const fetchCampaigns = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<AdCampaign[]>(`/ads?subAccountId=${activeSubAccountId}`);
      setCampaigns(data);
    } catch {
      notify('Failed to load campaigns', 'error');
    }
  }, [activeSubAccountId, notify]);

  const fetchStats = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<AdStats>(`/ads/stats?subAccountId=${activeSubAccountId}`);
      setStats(data);
    } catch {
      // keep defaults
    }
  }, [activeSubAccountId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCampaigns(), fetchStats()]);
      setLoading(false);
    };
    load();
  }, [fetchCampaigns, fetchStats]);

  /* filtered list */
  const filtered = campaigns.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()),
  );

  /* ── actions ── */

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', platform: 'facebook', budget: '', startDate: '', endDate: '', status: 'draft' });
    setModalOpen(true);
  };

  const openEdit = (c: AdCampaign) => {
    setEditing(c);
    setForm({
      name: c.name,
      platform: c.platform,
      budget: (c.budget / 100).toFixed(2),
      startDate: c.startDate || '',
      endDate: c.endDate || '',
      status: c.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.put<AdCampaign>(`/ads/${editing.id}`, {
          name: form.name,
          status: form.status,
          budget: Math.round(parseFloat(form.budget || '0') * 100),
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
        });
        setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        notify('Campaign updated');
      } else {
        const created = await api.post<AdCampaign>('/ads', {
          subAccountId: activeSubAccountId,
          platform: form.platform,
          name: form.name,
          budget: Math.round(parseFloat(form.budget || '0') * 100),
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
        });
        setCampaigns((prev) => [created, ...prev]);
        fetchStats();
        notify('Campaign created');
      }
      setModalOpen(false);
    } catch {
      notify('Failed to save campaign', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async (c: AdCampaign) => {
    const newStatus: AdCampaignStatus = c.status === 'active' ? 'paused' : 'active';
    try {
      const updated = await api.put<AdCampaign>(`/ads/${c.id}`, { status: newStatus });
      setCampaigns((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      fetchStats();
      notify(`Campaign ${newStatus === 'active' ? 'resumed' : 'paused'}`);
    } catch {
      notify('Failed to update campaign', 'error');
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      await api.delete(`/ads/${id}`);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      fetchStats();
      notify('Campaign deleted');
    } catch {
      notify('Failed to delete campaign', 'error');
    }
  };

  /* ai creative */
  const generateCreative = async () => {
    if (!aiGoal.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await api.post<{ headline: string; description: string; callToAction: string }>(
        '/ads/ai-creative',
        { platform: aiPlatform, campaignName: aiGoal, goal: aiGoal },
      );
      setAiResult(result);
    } catch {
      notify('Failed to generate creative', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const applyCreative = async () => {
    if (!applyTarget || !aiResult) return;
    try {
      const updated = await api.put<AdCampaign>(`/ads/${applyTarget}`, {
        adCopy: {
          headline: aiResult.headline,
          description: aiResult.description,
          callToAction: aiResult.callToAction,
        },
      });
      setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      notify('Creative applied to campaign');
    } catch {
      notify('Failed to apply creative', 'error');
    }
  };

  /* ── computed stats display ── */
  const cpl = stats.totalLeads > 0 ? fmtCurrency(Math.round(stats.totalSpend / stats.totalLeads)) : '--';

  /* ── render ── */

  if (loading) {
    return (
      <div className="pb-20 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="pb-20 space-y-8 max-w-7xl mx-auto">
      <NexusHeader title="Ad Manager" subtitle="Create, manage, and track your paid advertising campaigns">
        <button
          onClick={openCreate}
          className="px-6 py-3 bg-brand text-white rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90 text-sm"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </NexusHeader>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-400">Total Ad Spend</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{fmtCurrency(stats.totalSpend)}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-400">Attributed Leads</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{stats.totalLeads.toLocaleString()}</p>
          <p className="text-xs text-brand font-medium mt-1">{cpl} CPL</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-400">Average ROAS</p>
          </div>
          <p className="text-2xl font-semibold text-emerald-600">{fmtRoas(stats.avgRoas)}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-400">Active Campaigns</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{stats.activeCampaigns}</p>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Campaign list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {/* Campaign cards */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-1">No campaigns yet</h3>
              <p className="text-sm text-slate-400 mb-6">Create your first ad campaign to start tracking performance.</p>
              <button
                onClick={openCreate}
                className="px-6 py-3 bg-brand text-white rounded-2xl font-bold text-sm hover:opacity-90"
              >
                <Plus className="w-4 h-4 inline mr-1" /> New Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((c) => {
                const pm = platformMeta[c.platform];
                const spendPct = c.budget > 0 ? Math.min((c.spend / c.budget) * 100, 100) : 0;
                const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00';

                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${pm.bg} ${pm.text}`}>{pm.icon}</div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">{pm.label}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[c.status]}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </div>

                    {/* spend / budget progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500">Spend: {fmtCurrency(c.spend)}</span>
                        <span className="text-slate-400">Budget: {fmtCurrency(c.budget)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full transition-all"
                          style={{ width: `${spendPct}%` }}
                        />
                      </div>
                    </div>

                    {/* metrics row */}
                    <div className="flex items-center gap-6 text-xs mb-4">
                      <div>
                        <span className="text-slate-400">Leads</span>
                        <p className="font-semibold text-slate-900">{c.leads.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">ROAS</span>
                        <p className={`font-semibold ${(c.roas / 100) >= 2 ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {fmtRoas(c.roas)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">CTR</span>
                        <p className="font-semibold text-slate-900">{ctr}%</p>
                      </div>
                    </div>

                    {/* actions */}
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                      <button
                        onClick={() => openEdit(c)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 flex items-center gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => togglePause(c)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 flex items-center gap-1"
                      >
                        {c.status === 'active' ? (
                          <><Pause className="w-3.5 h-3.5" /> Pause</>
                        ) : (
                          <><Play className="w-3.5 h-3.5" /> Resume</>
                        )}
                      </button>
                      <button
                        onClick={() => deleteCampaign(c.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: AI Ad Creative */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">AI Ad Creative</h3>
            </div>

            {/* campaign name / goal */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Campaign Name or Goal</label>
              <input
                type="text"
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
                placeholder="e.g. Drive demo signups"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>

            {/* platform select */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Platform</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(platformMeta) as AdPlatform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setAiPlatform(p)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-2 ${
                      aiPlatform === p
                        ? 'border-brand bg-brand/5 text-brand'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {platformMeta[p].icon}
                    {platformMeta[p].label}
                  </button>
                ))}
              </div>
            </div>

            {/* generate */}
            <button
              onClick={generateCreative}
              disabled={aiLoading || !aiGoal.trim()}
              className="w-full py-3 bg-brand text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiLoading ? 'Generating...' : 'Generate Creative'}
            </button>

            {/* result */}
            {aiResult && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-brand mb-0.5">Headline</p>
                    <p className="text-sm font-bold text-slate-800">{aiResult.headline}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand mb-0.5">Description</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{aiResult.description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand mb-0.5">Call to Action</p>
                    <p className="text-sm font-semibold text-slate-700">{aiResult.callToAction}</p>
                  </div>
                </div>

                {/* apply to campaign */}
                {campaigns.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-500">Apply to Campaign</label>
                    <select
                      value={applyTarget}
                      onChange={(e) => setApplyTarget(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    >
                      <option value="">Select a campaign...</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={applyCreative}
                      disabled={!applyTarget}
                      className="w-full py-2.5 bg-slate-900 text-white rounded-2xl font-semibold text-xs hover:bg-slate-800 disabled:opacity-50"
                    >
                      Apply to Campaign
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editing ? 'Edit Campaign' : 'New Campaign'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* body */}
            <div className="p-6 space-y-5">
              {/* name */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Summer Sale - Facebook"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* platform */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Platform</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(platformMeta) as AdPlatform[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm({ ...form, platform: p })}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors flex flex-col items-center gap-1.5 ${
                        form.platform === p
                          ? 'border-brand bg-brand/5 text-brand'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {platformMeta[p].icon}
                      {platformMeta[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* budget */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Budget ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>

              {/* dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>

              {/* status toggle (edit only) */}
              {editing && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['draft', 'active', 'paused', 'completed'] as AdCampaignStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setForm({ ...form, status: s })}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          form.status === s
                            ? 'border-brand bg-brand/5 text-brand'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-6 py-2.5 bg-brand text-white rounded-2xl font-semibold text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdManager;

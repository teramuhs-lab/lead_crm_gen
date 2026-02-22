import React, { useState, useCallback, useEffect } from 'react';
import {
  BarChart3, Activity, Zap, Calendar, RefreshCw, Loader2,
  MessageSquare, Mail, UserSearch, Lightbulb, BrainCircuit,
  Wand2, Map, Search, Eye, Star, Share2, Megaphone,
  ChevronDown, ChevronRight, Clock, Mic, Database
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { api } from '../lib/api';
import { UsageOverview, UsageLog, SearchResultEntry, UsageType } from '../types';
import { NexusHeader } from './NexusUI';

// ── Type config: icon, label, color per usage type ──

const TYPE_CONFIG: Record<UsageType, { icon: React.ElementType; label: string; color: string }> = {
  ai_chat:              { icon: MessageSquare,  label: 'AI Chat',            color: 'text-indigo-600' },
  ai_draft_message:     { icon: Mail,           label: 'Draft Message',      color: 'text-blue-600' },
  ai_contact_insight:   { icon: UserSearch,     label: 'Contact Insight',    color: 'text-violet-600' },
  ai_suggestions:       { icon: Lightbulb,      label: 'AI Suggestions',     color: 'text-amber-600' },
  ai_briefing:          { icon: BrainCircuit,   label: 'Daily Briefing',     color: 'text-emerald-600' },
  ai_generate_content:  { icon: Wand2,          label: 'Content Generation', color: 'text-pink-600' },
  ai_local_seo:         { icon: Map,            label: 'Local SEO',          color: 'text-teal-600' },
  ai_market_research:   { icon: Search,         label: 'Market Research',    color: 'text-cyan-600' },
  ai_proactive_insights:{ icon: Eye,            label: 'Proactive Insights', color: 'text-purple-600' },
  ai_review_reply:      { icon: Star,           label: 'Review Reply',       color: 'text-yellow-600' },
  ai_social_caption:    { icon: Share2,         label: 'Social Caption',     color: 'text-rose-600' },
  ai_ad_creative:       { icon: Megaphone,      label: 'Ad Creative',        color: 'text-orange-600' },
  ai_lead_enrichment:   { icon: Database,       label: 'Lead Enrichment',    color: 'text-lime-600' },
  ai_voice_call:        { icon: Mic,            label: 'Voice AI Call',      color: 'text-fuchsia-600' },
};

// ── Helpers ──

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
  return `${sMonth} ${s.getDate()} \u2013 ${eMonth} ${e.getDate()}, ${e.getFullYear()}`;
}

function daysUntilEndOfMonth(): number {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const diffMs = endOfMonth.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function progressBarColor(percent: number, isUnlimited: boolean): string {
  if (isUnlimited) return 'bg-brand';
  if (percent >= 90) return 'bg-rose-500';
  if (percent >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

// ── Component ──

const UsageDashboard: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();

  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [searches, setSearches] = useState<SearchResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSearchId, setExpandedSearchId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!activeSubAccountId) return;
    setLoading(true);
    try {
      const [overviewData, logsData, searchesData] = await Promise.all([
        api.get<UsageOverview>(`/usage?subAccountId=${activeSubAccountId}`),
        api.get<UsageLog[]>(`/usage/history?subAccountId=${activeSubAccountId}&limit=20`),
        api.get<SearchResultEntry[]>(`/usage/searches?subAccountId=${activeSubAccountId}&limit=20`),
      ]);
      setOverview(overviewData);
      setLogs(logsData);
      setSearches(searchesData);
    } catch {
      notify('Failed to load usage data', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeSubAccountId, notify]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="pb-20 animate-in fade-in duration-500">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  const quotas = overview?.quotas || [];
  const totalCalls = overview?.totalCalls || 0;

  const remainingCalls = quotas.reduce((sum, q) => {
    if (q.limit === -1) return sum;
    return sum + Math.max(0, q.limit - q.used);
  }, 0);

  const daysLeft = daysUntilEndOfMonth();

  const periodLabel = overview?.periodStart && overview?.periodEnd
    ? formatPeriod(overview.periodStart, overview.periodEnd)
    : '';

  return (
    <div className="pb-20 animate-in fade-in duration-500 space-y-8">
      <NexusHeader title="Usage" subtitle="Monitor your API usage, quotas, and consumption across features">
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </NexusHeader>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total AI Calls */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Total AI Calls</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalCalls.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">This month</p>
        </div>

        {/* Remaining Calls */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Remaining Calls</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{remainingCalls.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Across metered quotas</p>
        </div>

        {/* Days Until Reset */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-slate-500">Days Until Reset</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{daysLeft}</p>
          <p className="text-xs text-slate-400 mt-1">End of billing period</p>
        </div>
      </div>

      {/* ── Quota bars ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-5">AI Feature Quotas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {quotas.map((q) => {
            const config = TYPE_CONFIG[q.type];
            if (!config) return null;
            const Icon = config.icon;
            const isUnlimited = q.limit === -1;
            const percent = isUnlimited ? 100 : Math.min(100, q.percentUsed);
            const barColor = progressBarColor(percent, isUnlimited);

            return (
              <div key={q.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className="text-sm font-medium text-slate-700">{config.label}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {isUnlimited
                      ? 'Unlimited'
                      : `${q.used.toLocaleString()} / ${q.limit.toLocaleString()} used`}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {!isUnlimited && (
                  <p className="text-[11px] text-slate-400">{Math.round(q.percentUsed)}% of quota used</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-5">Recent AI Activity</h2>
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No AI activity this month</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const config = TYPE_CONFIG[log.type];
                  const Icon = config?.icon || Activity;
                  return (
                    <tr key={log.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-xs">{formatDateTime(log.createdAt)}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config ? config.color : 'text-slate-600'} bg-slate-50`}>
                          <Icon className="w-3 h-3" />
                          {config?.label || log.type}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {log.tokens != null ? (
                          <span className="text-xs font-mono text-slate-600">{log.tokens.toLocaleString()}</span>
                        ) : (
                          <span className="text-xs text-slate-300">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Search History ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-5">Search History</h2>
        {searches.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No saved searches</p>
          </div>
        ) : (
          <div className="space-y-3">
            {searches.map((entry) => {
              const isExpanded = expandedSearchId === entry.id;
              const isSEO = entry.searchType === 'local_seo';
              return (
                <div key={entry.id} className="border border-slate-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSearchId(isExpanded ? null : entry.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${isSEO ? 'bg-teal-50 text-teal-700' : 'bg-cyan-50 text-cyan-700'}`}>
                        {isSEO ? <Map className="w-3 h-3" /> : <Search className="w-3 h-3" />}
                        {isSEO ? 'Local SEO' : 'Market Research'}
                      </span>
                      <span className="text-sm text-slate-700 truncate">{entry.query}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-xs text-slate-400">{formatDateTime(entry.createdAt)}</span>
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-slate-400" />
                        : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {entry.result?.text || 'No result text available.'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageDashboard;

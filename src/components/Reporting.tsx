import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useNexus } from '../context/NexusContext';
import { api } from '../lib/api';
import {
  BarChart3, TrendingUp, TrendingDown, Users, MessageSquare,
  Calendar, DollarSign, Download, Filter, Loader2,
  ArrowUpRight, ArrowDownRight, Cpu, Eye, MousePointerClick, Send,
} from 'lucide-react';
import { NexusHeader } from './NexusUI';
import type {
  ReportingOverview, PipelineStage, ActivityDataPoint, SourceBreakdown,
  AIUsageReport,
} from '../types';

// ── Date Range Helpers ──

type PresetKey = '7d' | '30d' | '90d' | 'custom';

interface DateRange {
  from: string;
  to: string;
}

function getPresetRange(preset: PresetKey): DateRange {
  const to = new Date();
  const from = new Date();
  switch (preset) {
    case '7d':
      from.setDate(from.getDate() - 7);
      break;
    case '90d':
      from.setDate(from.getDate() - 90);
      break;
    case '30d':
    default:
      from.setDate(from.getDate() - 30);
      break;
  }
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function computeTrend(current: number, previous: number): { value: number; up: boolean } {
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, up: current >= 0 };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(pct), up: pct >= 0 };
}

// ── Subcomponents ──

const PIPELINE_COLORS: Record<string, string> = {
  Lead: '#6366f1',
  Interested: '#f59e0b',
  Appointment: '#3b82f6',
  Closed: '#10b981',
};

const SOURCE_COLORS = [
  '#6366f1', '#f59e0b', '#3b82f6', '#10b981',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
];

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  trend: { value: number; up: boolean };
  iconColor: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, trend, iconColor }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className={`p-2 rounded-lg ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="flex items-end gap-3">
      <span className="text-2xl font-bold text-slate-900 leading-none">{value}</span>
      <div className={`flex items-center gap-0.5 text-xs font-medium ${trend.up ? 'text-emerald-600' : 'text-rose-500'}`}>
        {trend.up
          ? <ArrowUpRight className="w-3.5 h-3.5" />
          : <ArrowDownRight className="w-3.5 h-3.5" />}
        {trend.value}%
      </div>
    </div>
  </div>
);

// ── Main Component ──

const Reporting: React.FC = () => {
  const { activeSubAccountId } = useNexus();

  // Date range state
  const [preset, setPreset] = useState<PresetKey>('30d');
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('30d'));
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Data state
  const [overview, setOverview] = useState<ReportingOverview | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [activity, setActivity] = useState<ActivityDataPoint[]>([]);
  const [sources, setSources] = useState<SourceBreakdown[]>([]);
  const [aiUsage, setAiUsage] = useState<(AIUsageReport & { previousPeriodTotal: number }) | null>(null);
  const [outreach, setOutreach] = useState<{
    funnel: { sent: number; opened: number; clicked: number; replied: number };
    rates: { openRate: number; clickRate: number; replyRate: number };
    activeSequences: number;
    conversions: number;
    dailyStats: { date: string; sent: number; opened: number; clicked: number }[];
    sequencePerformance: { name: string; enrollments: number; opens: number; clicks: number; replies: number; openRate: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Export dropdown
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Handle preset changes
  const handlePreset = useCallback((key: PresetKey) => {
    setPreset(key);
    if (key !== 'custom') {
      setDateRange(getPresetRange(key));
    }
  }, []);

  // Handle custom date apply
  const applyCustomRange = useCallback(() => {
    if (customFrom && customTo) {
      setDateRange({ from: customFrom, to: customTo });
    }
  }, [customFrom, customTo]);

  // Fetch all reporting data
  const fetchAll = useCallback(async () => {
    if (!activeSubAccountId) return;

    setLoading(true);
    const qs = `subAccountId=${activeSubAccountId}&from=${dateRange.from}&to=${dateRange.to}`;

    try {
      const [overviewData, pipelineData, activityData, sourcesData, aiUsageData, outreachData] = await Promise.all([
        api.get<ReportingOverview>(`/reporting/overview?${qs}`),
        api.get<PipelineStage[]>(`/reporting/pipeline?${qs}`),
        api.get<ActivityDataPoint[]>(`/reporting/activity?${qs}`),
        api.get<SourceBreakdown[]>(`/reporting/sources?${qs}`),
        api.get<AIUsageReport & { previousPeriodTotal: number }>(`/reporting/ai-usage?${qs}`),
        api.get<typeof outreach>(`/reporting/outreach?${qs}`).catch(() => null),
      ]);

      setOverview(overviewData);
      setPipeline(pipelineData);
      setActivity(activityData);
      setSources(sourcesData);
      setAiUsage(aiUsageData);
      setOutreach(outreachData);
    } catch (err) {
      console.error('Failed to fetch reporting data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeSubAccountId, dateRange]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Export handler
  const handleExport = useCallback((type: 'contacts' | 'messages') => {
    setExportOpen(false);
    const qs = `subAccountId=${activeSubAccountId}&from=${dateRange.from}&to=${dateRange.to}&type=${type}`;
    window.open(`/api/reporting/export?${qs}`, '_blank');
  }, [activeSubAccountId, dateRange]);

  // ── Trend calculations ──
  const contactsTrend = overview
    ? computeTrend(overview.newContacts, overview.previousPeriod.newContacts)
    : { value: 0, up: true };
  const conversionTrend = overview
    ? computeTrend(overview.conversionRate, overview.previousPeriod.conversionRate)
    : { value: 0, up: true };
  const messageTrend = overview
    ? computeTrend(overview.totalMessages, overview.previousPeriod.totalMessages)
    : { value: 0, up: true };
  // Pipeline value trend: approximate from new contacts trend
  const pipelineTrend = contactsTrend;
  const aiUsageTrend = aiUsage
    ? computeTrend(aiUsage.totalAiCalls, aiUsage.previousPeriodTotal)
    : { value: 0, up: true };

  // ── Render ──

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <NexusHeader title="Business Analytics" subtitle="Track your sales, marketing, and engagement metrics across all channels">
          {/* Date Range Presets */}
          <div className="flex items-center gap-1">
            {([
              { key: '7d' as PresetKey, label: '7 Days' },
              { key: '30d' as PresetKey, label: '30 Days' },
              { key: '90d' as PresetKey, label: '90 Days' },
              { key: 'custom' as PresetKey, label: 'Custom' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handlePreset(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  preset === key
                    ? 'bg-brand text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-brand hover:text-brand'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {preset === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand"
              />
              <button
                onClick={applyCustomRange}
                className="px-3 py-1.5 text-xs font-medium bg-brand text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Apply
              </button>
            </div>
          )}

          {/* Export Dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg shadow-sm hover:bg-slate-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => handleExport('contacts')}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Export Contacts
                </button>
                <button
                  onClick={() => handleExport('messages')}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Export Messages
                </button>
              </div>
            )}
          </div>
      </NexusHeader>

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="New Contacts"
            value={formatNumber(overview.newContacts)}
            icon={Users}
            trend={contactsTrend}
            iconColor="bg-indigo-50 text-indigo-600"
          />
          <KpiCard
            label="Conversion Rate"
            value={`${overview.conversionRate}%`}
            icon={TrendingUp}
            trend={conversionTrend}
            iconColor="bg-emerald-50 text-emerald-600"
          />
          <KpiCard
            label="Messages Sent"
            value={formatNumber(overview.totalMessages)}
            icon={MessageSquare}
            trend={messageTrend}
            iconColor="bg-blue-50 text-blue-600"
          />
          <KpiCard
            label="Pipeline Value"
            value={formatCurrency(overview.pipelineValue)}
            icon={DollarSign}
            trend={pipelineTrend}
            iconColor="bg-amber-50 text-amber-600"
          />
          <KpiCard
            label="AI Calls"
            value={formatNumber(aiUsage?.totalAiCalls ?? 0)}
            icon={Cpu}
            trend={aiUsageTrend}
            iconColor="bg-violet-50 text-violet-600"
          />
        </div>
      )}

      {/* Charts Row 1: Pipeline + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900 text-sm">Pipeline Distribution</h3>
            <BarChart3 className="w-5 h-5 text-brand" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipeline}>
              <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="stage"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={50}>
                {pipeline.map((entry) => (
                  <Cell
                    key={entry.stage}
                    fill={PIPELINE_COLORS[entry.stage] || '#6366f1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources (Donut) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900 text-sm">Lead Sources</h3>
            <Filter className="w-5 h-5 text-brand" />
          </div>
          {sources.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sources}
                  dataKey="count"
                  nameKey="source"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                  stroke="none"
                >
                  {sources.map((_, index) => (
                    <Cell
                      key={`source-${index}`}
                      fill={SOURCE_COLORS[index % SOURCE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-slate-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">
              No source data for this period
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Activity Over Time (full width) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-slate-900 text-sm">Activity Over Time</h3>
          <Calendar className="w-5 h-5 text-brand" />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={activity}>
            <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
              dy={10}
              tickFormatter={(value: string) => {
                const d = new Date(value);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
              }}
              labelFormatter={(label: string) => {
                const d = new Date(label);
                return d.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingBottom: '16px' }}
            />
            <Line
              type="monotone"
              dataKey="contacts"
              name="Contacts"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1' }}
            />
            <Line
              type="monotone"
              dataKey="messages"
              name="Messages"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#10b981' }}
            />
            <Line
              type="monotone"
              dataKey="appointments"
              name="Appointments"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#f59e0b' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* AI Feature Usage */}
      {aiUsage && aiUsage.callsByType.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900 text-sm">AI Feature Usage</h3>
            <Cpu className="w-5 h-5 text-violet-500" />
          </div>
          <ResponsiveContainer width="100%" height={Math.max(250, aiUsage.callsByType.length * 40)}>
            <BarChart data={aiUsage.callsByType} layout="vertical">
              <CartesianGrid strokeDasharray="8 8" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="type"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                width={140}
                tickFormatter={(value: string) => value.replace(/^ai_/, '').replace(/_/g, ' ')}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
                labelFormatter={(label: string) => label.replace(/^ai_/, '').replace(/_/g, ' ')}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                {aiUsage.callsByType.map((_, index) => (
                  <Cell
                    key={`ai-bar-${index}`}
                    fill={SOURCE_COLORS[index % SOURCE_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Outreach Reporting */}
      {outreach && (
        <>
          {/* Outreach KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-sky-50">
                <Eye className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Open Rate</p>
                <p className="text-2xl font-bold text-slate-900">{outreach.rates.openRate}%</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-50">
                <MousePointerClick className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Click Rate</p>
                <p className="text-2xl font-bold text-slate-900">{outreach.rates.clickRate}%</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-50">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Reply Rate</p>
                <p className="text-2xl font-bold text-slate-900">{outreach.rates.replyRate}%</p>
              </div>
            </div>
          </div>

          {/* Outreach Funnel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-900 text-sm">Outreach Funnel</h3>
              <Send className="w-5 h-5 text-brand" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { stage: 'Sent', count: outreach.funnel.sent },
                { stage: 'Opened', count: outreach.funnel.opened },
                { stage: 'Clicked', count: outreach.funnel.clicked },
                { stage: 'Replied', count: outreach.funnel.replied },
              ]}>
                <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={50}>
                  <Cell fill="#6366f1" />
                  <Cell fill="#0ea5e9" />
                  <Cell fill="#8b5cf6" />
                  <Cell fill="#10b981" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sequence Performance Table */}
          {outreach.sequencePerformance.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-4">Sequence Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-xs font-semibold text-slate-500">Sequence</th>
                      <th className="pb-3 text-xs font-semibold text-slate-500 text-center">Enrolled</th>
                      <th className="pb-3 text-xs font-semibold text-slate-500 text-center">Opens</th>
                      <th className="pb-3 text-xs font-semibold text-slate-500 text-center">Clicks</th>
                      <th className="pb-3 text-xs font-semibold text-slate-500 text-center">Replies</th>
                      <th className="pb-3 text-xs font-semibold text-slate-500 text-center">Open Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {outreach.sequencePerformance.map((seq, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 text-sm font-medium text-slate-900">{seq.name}</td>
                        <td className="py-3 text-sm text-slate-600 text-center">{seq.enrollments}</td>
                        <td className="py-3 text-sm text-slate-600 text-center">{seq.opens}</td>
                        <td className="py-3 text-sm text-slate-600 text-center">{seq.clicks}</td>
                        <td className="py-3 text-sm text-slate-600 text-center">{seq.replies}</td>
                        <td className="py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            seq.openRate > 50 ? 'bg-emerald-50 text-emerald-600' :
                            seq.openRate > 20 ? 'bg-amber-50 text-amber-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {seq.openRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading overlay for refetches */}
      {loading && overview && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-40 pointer-events-none">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      )}
    </div>
  );
};

export default Reporting;

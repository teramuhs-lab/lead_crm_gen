
import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, Target, DollarSign, Activity, Zap, Eye,
  PieChart as PieChartIcon, BarChart3, CheckCircle2,
  BrainCircuit, AlertTriangle, Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNexus } from '../context/NexusContext';
import { NexusCard, NexusButton, NexusBadge, NexusHeader } from './NexusUI';
import { api } from '../lib/api';
import { useAIQueue } from '../context/AIActionQueueContext';
import { AIBriefing } from '../types';

const Dashboard: React.FC = () => {
  const { contacts, activeSubAccount, setActiveView, workflowLogs, isSyncing, messages, appointments } = useNexus();
  const { addProposal, refreshProposals } = useAIQueue();
  const [briefing, setBriefing] = useState<AIBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [outreachStats, setOutreachStats] = useState<{
    rates: { openRate: number };
    dailyStats: { date: string; sent: number; opened: number; clicked: number }[];
  } | null>(null);

  // Auto-trigger proactive AI insights on dashboard mount
  useEffect(() => {
    if (!activeSubAccount?.id) return;

    let isCancelled = false;

    const fetchProactiveInsights = async () => {
      try {
        await api.post('/ai/proactive-insights', { subAccountId: activeSubAccount.id });
        if (!isCancelled) {
          refreshProposals();
        }
      } catch {
        // Proactive insights are non-critical — silently ignore failures
      }
    };

    const fetchOutreach = async () => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        const data = await api.get<typeof outreachStats>(`/reporting/outreach?subAccountId=${activeSubAccount.id}&from=${thirtyDaysAgo}&to=${today}`);
        if (!isCancelled) setOutreachStats(data);
      } catch {
        // silently fail
      }
    };

    fetchProactiveInsights();
    fetchOutreach();

    return () => {
      isCancelled = true;
    };
  }, [activeSubAccount?.id, refreshProposals]);

  const metrics = useMemo(() => {
    const activeContacts = contacts.filter(c => !c.isArchived);
    const totalLeads = activeContacts.length;
    const closedWon = activeContacts.filter(c => c.status === 'Closed').length;
    const actualRevenue = closedWon * activeSubAccount.leadValue;
    const bookingRatio = totalLeads > 0 ? ((activeContacts.filter(c => c.status === 'Appointment').length / totalLeads) * 100).toFixed(1) : '0';

    return { totalLeads, closedWon, actualRevenue, bookingRatio };
  }, [contacts, activeSubAccount]);

  const stats = [
    { label: 'Total Contacts', value: metrics.totalLeads.toString(), icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', trend: '+12.5%' },
    { label: 'Open Rate', value: outreachStats ? `${outreachStats.rates.openRate}%` : '--', icon: Eye, color: 'text-brand', bg: 'bg-indigo-50', trend: outreachStats && outreachStats.rates.openRate > 20 ? '+' + outreachStats.rates.openRate + '%' : '0%' },
    { label: 'Booking Rate', value: `${metrics.bookingRatio}%`, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50', trend: '+2.1%' },
    { label: 'Revenue', value: `$${metrics.actualRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', trend: '+18.2%' },
  ];

  const fetchBriefing = async () => {
    setBriefingLoading(true);
    try {
      const result = await api.post<AIBriefing>('/ai/daily-briefing', {
        subAccountId: activeSubAccount?.id,
        contacts: contacts.filter(c => !c.isArchived).slice(0, 30).map(c => ({
          id: c.id, name: c.name, email: c.email, status: c.status,
          leadScore: c.leadScore, lastActivity: c.lastActivity, tags: c.tags,
        })),
        messages: messages.slice(0, 20).map(m => ({
          contactId: m.contactId, direction: m.direction, channel: m.channel,
          content: m.content, timestamp: m.timestamp,
        })),
        appointments: appointments.slice(0, 10).map(a => ({
          contactName: a.contactName, title: a.title, startTime: a.startTime, status: a.status,
        })),
      });
      setBriefing(result);
    } catch {
      // silently fail
    } finally {
      setBriefingLoading(false);
    }
  };

  const handleDraftFollowUp = async (contactId: string, contactName: string, suggestedAction: string) => {
    try {
      const result = await api.post<{ draft: string; subject?: string }>('/ai/draft-message', {
        subAccountId: activeSubAccount?.id,
        contactName,
        channel: 'email',
        tone: 'professional and friendly',
        purpose: suggestedAction,
      });
      addProposal({
        type: 'send_message',
        title: `Send follow-up to ${contactName}`,
        description: result.draft.slice(0, 150) + '...',
        module: 'dashboard',
        contactId,
        contactName,
        payload: { content: result.draft, channel: 'email', subject: result.subject },
      });
    } catch {
      // silently fail
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <NexusHeader title="Dashboard" subtitle="Overview of your sales and marketing performance">
        <NexusButton variant="ghost" loading={briefingLoading} onClick={fetchBriefing} icon={BrainCircuit}>AI Briefing</NexusButton>
        <NexusButton variant="ghost" onClick={() => setActiveView('reporting')} icon={PieChartIcon}>Reports</NexusButton>
        <NexusButton variant="brand" onClick={() => setActiveView('contacts')} icon={Zap}>Add Contact</NexusButton>
      </NexusHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <NexusCard key={i} className="hover:border-brand/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <NexusBadge variant={stat.trend.startsWith('+') ? 'emerald' : 'rose'}>{stat.trend}</NexusBadge>
            </div>
            <div className="mt-4">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </NexusCard>
        ))}
      </div>

      {briefing && (
        <NexusCard padding="lg" className="border-indigo-100 bg-gradient-to-r from-indigo-50/30 to-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">AI Daily Briefing</h3>
              <p className="text-xs text-slate-400">Powered by Gemini</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-5 leading-relaxed">{briefing.summary}</p>

          {briefing.followUps.length > 0 && (
            <div className="mb-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Needs Follow-Up</h4>
              <div className="space-y-2">
                {briefing.followUps.map((fu, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-bold text-brand shrink-0">{fu.contactName.charAt(0)}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{fu.contactName}</p>
                        <p className="text-xs text-slate-400 truncate">{fu.reason}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDraftFollowUp(fu.contactId, fu.contactName, fu.suggestedAction)}
                      className="px-3 py-1.5 bg-indigo-50 text-brand text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors shrink-0 ml-3"
                    >
                      Draft
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {briefing.atRiskDeals.length > 0 && (
            <div className="mb-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">At-Risk Deals</h4>
              <div className="space-y-2">
                {briefing.atRiskDeals.map((deal, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{deal.contactName}</p>
                      <p className="text-xs text-slate-500">{deal.reason}</p>
                    </div>
                    <NexusBadge variant={deal.riskLevel === 'high' ? 'rose' : 'amber'}>{deal.riskLevel}</NexusBadge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {briefing.todaysPriorities.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Today's Priorities</h4>
              <div className="space-y-2">
                {briefing.todaysPriorities.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${p.priority === 'high' ? 'bg-rose-500' : p.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.title}</p>
                      <p className="text-xs text-slate-400">{p.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </NexusCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NexusCard padding="lg">
            <div className="flex items-center justify-between mb-6">
               <div>
                  <h3 className="text-base font-semibold text-slate-900">Outreach Activity</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Email sends and opens over time</p>
               </div>
               <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={outreachStats?.dailyStats?.length ? outreachStats.dailyStats : [{ date: 'No data', sent: 0, opened: 0 }]}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} tickFormatter={(v: string) => { const d = new Date(v); return `${d.getMonth()+1}/${d.getDate()}`; }} interval="preserveStartEnd" />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '13px' }} />
                  <Area type="monotone" dataKey="sent" name="Sent" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
                  <Area type="monotone" dataKey="opened" name="Opened" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorOpened)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </NexusCard>
        </div>

        <div>
          <NexusCard padding="md" className="h-full">
            <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-brand" /> Recent Activity
            </h4>
            <div className="space-y-3 max-h-80 overflow-y-auto thin-scrollbar pr-1">
               {workflowLogs.length > 0 ? workflowLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-white hover:border-slate-200 transition-all">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-sm font-semibold text-brand">{log.contactName.charAt(0)}</div>
                        <div>
                           <p className="text-sm font-medium text-slate-900">{log.contactName}</p>
                           <p className="text-xs text-slate-500">{log.workflowName}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end mb-0.5">
                           <NexusBadge variant="emerald">Success</NexusBadge>
                        </div>
                        <p className="text-xs text-slate-400">{log.timestamp}</p>
                     </div>
                  </div>
               )) : (
                 <div className="py-8 text-center text-sm text-slate-400">No recent activity</div>
               )}
            </div>
          </NexusCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

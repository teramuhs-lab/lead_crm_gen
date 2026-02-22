
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Zap, Database, ShieldCheck, BrainCircuit, Workflow,
  ArrowRight, CheckCircle2, Loader2, Sparkles, Server,
  MousePointer2, Network, Radio, Activity, Terminal,
  Users, UserPlus, TrendingUp, DollarSign, Signal
} from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import { ReportingOverview, ActivityDataPoint } from '../types';
import { NexusHeader } from './NexusUI';

const LeadProcessingBlueprint: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();

  const [activeStep, setActiveStep] = useState(0);
  const [overview, setOverview] = useState<ReportingOverview | null>(null);
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const cycleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const testTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch reporting data ──
  const fetchReportingData = useCallback(async () => {
    if (!activeSubAccountId) {
      setIsLoadingStats(false);
      return;
    }
    setIsLoadingStats(true);
    try {
      const [overviewData, activity] = await Promise.all([
        api.get<ReportingOverview>(`/reporting/overview?subAccountId=${activeSubAccountId}`),
        api.get<ActivityDataPoint[]>(`/reporting/activity?subAccountId=${activeSubAccountId}&days=7`),
      ]);
      setOverview(overviewData);
      setActivityData(activity);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoadingStats(false);
    }
  }, [activeSubAccountId]);

  // Fetch on mount + when subaccount changes
  useEffect(() => {
    fetchReportingData();
  }, [fetchReportingData]);

  // ── Auto-cycling animation ──
  const startNormalCycle = useCallback(() => {
    if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    cycleIntervalRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 5);
    }, 4000);
  }, []);

  useEffect(() => {
    startNormalCycle();
    return () => {
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
      if (testTimeoutRef.current) clearTimeout(testTimeoutRef.current);
    };
  }, [startNormalCycle]);

  // ── Run Test handler ──
  const handleRunTest = useCallback(() => {
    if (isTestRunning) return;
    setIsTestRunning(true);

    // Reset to step 0 and speed up cycle
    setActiveStep(0);
    if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);

    let testStep = 0;
    cycleIntervalRef.current = setInterval(() => {
      testStep += 1;
      if (testStep >= 5) {
        // Test pass complete
        if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
        setIsTestRunning(false);
        notify('Pipeline test completed successfully');
        // Resume normal cycle
        startNormalCycle();
      } else {
        setActiveStep(testStep);
      }
    }, 1000);
  }, [isTestRunning, notify, startNormalCycle]);

  // ── Format helpers ──
  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };

  const formatNumber = (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  // ── Build activity log entries from real data ──
  const activityLogEntries = activityData.length > 0
    ? activityData.slice(-5).reverse().map((point) => {
        const d = new Date(point.date);
        const timeStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `[${timeStr}] ${point.contacts} contacts, ${point.messages} msgs, ${point.appointments} appts`;
      })
    : null;

  // ── System nodes (unchanged visual identity) ──
  const systemNodes = [
    {
      id: 0,
      title: 'Lead Capture',
      subtitle: 'Form Submission',
      icon: MousePointer2,
      description: 'Incoming lead data detected from web form.',
      telemetry: 'Latency: 14ms \u2022 Method: POST',
      color: 'border-indigo-500',
      glow: 'shadow-indigo-500/20'
    },
    {
      id: 1,
      title: 'Data Validation',
      subtitle: 'Nexus Sanitizer',
      icon: ShieldCheck,
      description: 'Verifying data integrity & deduplicating email identity.',
      telemetry: 'Integrity: 100% \u2022 Group: Default',
      color: 'border-emerald-500',
      glow: 'shadow-emerald-500/20'
    },
    {
      id: 2,
      title: 'AI Enrichment',
      subtitle: 'Gemini Profiler',
      icon: BrainCircuit,
      description: 'AI analyzing intent, website, and sentiment scoring.',
      telemetry: 'Heat: 84% \u2022 Score: HIGH_INTENT',
      color: 'border-brand',
      glow: 'shadow-brand/20'
    },
    {
      id: 3,
      title: 'Pipeline Distribution',
      subtitle: 'Nexus Router',
      icon: Network,
      description: 'Routing contact to Sales Pipeline & Sub-account instance.',
      telemetry: 'Path: /leads/qualified \u2022 Map: SaaS',
      color: 'border-amber-500',
      glow: 'shadow-amber-500/20'
    },
    {
      id: 4,
      title: 'Workflow Execution',
      subtitle: 'Workflow Engine',
      icon: Workflow,
      description: 'Triggering multi-step nurture & omnichannel dispatch.',
      telemetry: 'Steps: 12 \u2022 Firing: SMS_01',
      color: 'border-rose-500',
      glow: 'shadow-rose-500/20'
    }
  ];

  return (
    <div className="h-full flex flex-col space-y-5 animate-in fade-in duration-700 pb-20 overflow-hidden">
      <NexusHeader title="Lead Processing Blueprint" subtitle="Visual overview of how leads flow through your CRM from capture to conversion">
          <div className="px-6 py-3 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 shadow-sm">
            {isConnected ? (
              <>
                <Signal className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-600">Live Data Connected</span>
              </>
            ) : (
              <>
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-500">Recent Activity</span>
              </>
            )}
          </div>
      </NexusHeader>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total Contacts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-slate-400 truncate">Total Contacts</span>
            {isLoadingStats ? (
              <Loader2 className="w-4 h-4 text-slate-300 animate-spin mt-1" />
            ) : (
              <span className="text-lg font-bold text-slate-900 leading-tight">
                {overview ? formatNumber(overview.totalContacts) : '\u2014'}
              </span>
            )}
          </div>
        </div>

        {/* New This Week */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-slate-400 truncate">New This Week</span>
            {isLoadingStats ? (
              <Loader2 className="w-4 h-4 text-slate-300 animate-spin mt-1" />
            ) : (
              <span className="text-lg font-bold text-slate-900 leading-tight">
                {overview ? formatNumber(overview.newContacts) : '\u2014'}
              </span>
            )}
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-slate-400 truncate">Conversion Rate</span>
            {isLoadingStats ? (
              <Loader2 className="w-4 h-4 text-slate-300 animate-spin mt-1" />
            ) : (
              <span className="text-lg font-bold text-slate-900 leading-tight">
                {overview ? `${overview.conversionRate.toFixed(1)}%` : '\u2014'}
              </span>
            )}
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-rose-600" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-slate-400 truncate">Pipeline Value</span>
            {isLoadingStats ? (
              <Loader2 className="w-4 h-4 text-slate-300 animate-spin mt-1" />
            ) : (
              <span className="text-lg font-bold text-slate-900 leading-tight">
                {overview ? formatCurrency(overview.pipelineValue) : '\u2014'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Pipeline Visualization ── */}
      <div className="flex-1 bg-slate-900 rounded-2xl border-8 border-white shadow-md p-8 relative overflow-hidden flex items-center justify-center">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 2px, transparent 2px)', backgroundSize: '60px 60px' }}></div>

        {/* Test Running Overlay */}
        {isTestRunning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-2 bg-brand/90 backdrop-blur-md rounded-full flex items-center gap-2 shadow-lg shadow-brand/30">
            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            <span className="text-xs font-semibold text-white tracking-wide">Running Pipeline Test...</span>
          </div>
        )}

        <div className="relative z-10 w-full flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-0">
          {systemNodes.map((node, i) => (
            <React.Fragment key={node.id}>
              <div className={`
                w-64 p-8 rounded-xl bg-slate-800/80 backdrop-blur-xl border-4 transition-all duration-700 relative group
                ${activeStep === node.id ? `${node.color} scale-110 ${node.glow} shadow-md` : 'border-slate-700 scale-100 opacity-40'}
              `}>
                {/* Activation Ring */}
                {activeStep === node.id && (
                  <div className="absolute -inset-2 rounded-xl border-2 border-white/10 animate-ping opacity-20"></div>
                )}

                <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center shadow-lg transition-transform ${activeStep === node.id ? 'bg-white text-slate-900' : 'bg-slate-700 text-slate-400'}`}>
                  <node.icon className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-white font-semibold text-sm">{node.title}</h3>
                  <p className={`text-xs font-medium ${activeStep === node.id ? 'text-brand' : 'text-slate-500'}`}>{node.subtitle}</p>
                </div>

                <div className="mt-6">
                  <p className="text-xs text-slate-400 leading-relaxed font-medium h-10">{node.description}</p>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-slate-600" />
                    <span className="text-xs font-mono text-slate-500">{node.telemetry}</span>
                  </div>
                </div>
              </div>

              {i < systemNodes.length - 1 && (
                <div className="flex-1 flex items-center justify-center relative min-w-[40px]">
                  <ArrowRight className={`w-8 h-8 transition-all duration-1000 ${activeStep === node.id ? 'text-brand scale-125 translate-x-4' : 'text-slate-700'}`} />
                  {activeStep === node.id && (
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-brand/20 overflow-hidden rounded-full">
                      <div className="h-full bg-brand animate-progress-flow"></div>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Internal Logs View Overlay ── */}
        <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end">
          {/* Activity Log Panel */}
          <div className="bg-slate-950/80 backdrop-blur-md p-6 rounded-xl border border-white/10 max-w-sm w-full font-mono text-xs text-brand/80 space-y-1">
            <p className="text-slate-500 mb-2 flex items-center gap-2"><Terminal className="w-3 h-3" /> Activity Log</p>
            {activityLogEntries ? (
              <>
                {activityLogEntries.map((entry, idx) => (
                  <p key={idx}>{entry}</p>
                ))}
                <p className="animate-pulse">_ Awaiting next lead...</p>
              </>
            ) : (
              <>
                <p>[{new Date().toLocaleTimeString()}] LEAD_STREAM_OPEN</p>
                <p>[{new Date().toLocaleTimeString()}] VALIDATING_DATA... OK</p>
                <p>[{new Date().toLocaleTimeString()}] SYNCING_GROUP_A2... DONE</p>
                <p className="animate-pulse">_ Awaiting next lead...</p>
              </>
            )}
          </div>

          {/* Stats + Run Test */}
          <div className="flex flex-col items-end gap-4">
            <div className="bg-white/5 backdrop-blur-xl px-6 py-4 rounded-xl border border-white/10 flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-slate-500">Leads Processed</span>
                <span className="text-lg font-semibold text-white">{overview ? formatNumber(overview.totalContacts) : '\u2014'}</span>
              </div>
              <div className="w-[1px] h-8 bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-slate-500">Conversion</span>
                <span className={`text-lg font-semibold ${overview && overview.conversionRate > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>{overview ? `${overview.conversionRate.toFixed(1)}%` : '\u2014'}</span>
              </div>
              <div className="w-[1px] h-8 bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-slate-500">Messages Sent</span>
                <span className="text-lg font-semibold text-white">{overview ? formatNumber(overview.totalMessages) : '\u2014'}</span>
              </div>
            </div>
            <button
              onClick={handleRunTest}
              disabled={isTestRunning}
              className={`px-10 py-5 rounded-xl font-semibold text-xs shadow-md transition-all ${
                isTestRunning
                  ? 'bg-slate-600 text-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-brand text-white shadow-brand/40 hover:shadow-lg hover:shadow-brand/50 active:scale-95'
              }`}
            >
              {isTestRunning ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Testing...
                </span>
              ) : (
                'Run Test'
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress-flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-flow {
          animation: progress-flow 2s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default LeadProcessingBlueprint;

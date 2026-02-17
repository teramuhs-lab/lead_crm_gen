
import React, { useState, useEffect } from 'react';
import {
  Zap, Database, ShieldCheck, BrainCircuit, Workflow,
  ArrowRight, CheckCircle2, Loader2, Sparkles, Server,
  MousePointer2, Network, Radio, Activity, Terminal
} from 'lucide-react';

const LeadProcessingBlueprint: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  // Auto-cycle for visualization
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 5);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const systemNodes = [
    {
      id: 0,
      title: 'Lead Capture',
      subtitle: 'Form Submission',
      icon: MousePointer2,
      description: 'Incoming lead data detected from web form.',
      telemetry: 'Latency: 14ms • Method: POST',
      color: 'border-indigo-500',
      glow: 'shadow-indigo-500/20'
    },
    {
      id: 1,
      title: 'Data Validation',
      subtitle: 'Nexus Sanitizer',
      icon: ShieldCheck,
      description: 'Verifying data integrity & deduplicating email identity.',
      telemetry: 'Integrity: 100% • Group: Default',
      color: 'border-emerald-500',
      glow: 'shadow-emerald-500/20'
    },
    {
      id: 2,
      title: 'AI Enrichment',
      subtitle: 'Gemini Profiler',
      icon: BrainCircuit,
      description: 'AI analyzing intent, website, and sentiment scoring.',
      telemetry: 'Heat: 84% • Score: HIGH_INTENT',
      color: 'border-brand',
      glow: 'shadow-brand/20'
    },
    {
      id: 3,
      title: 'Pipeline Distribution',
      subtitle: 'Nexus Router',
      icon: Network,
      description: 'Routing contact to Sales Pipeline & Sub-account instance.',
      telemetry: 'Path: /leads/qualified • Map: SaaS',
      color: 'border-amber-500',
      glow: 'shadow-amber-500/20'
    },
    {
      id: 4,
      title: 'Workflow Execution',
      subtitle: 'Workflow Engine',
      icon: Workflow,
      description: 'Triggering multi-step nurture & omnichannel dispatch.',
      telemetry: 'Steps: 12 • Firing: SMS_01',
      color: 'border-rose-500',
      glow: 'shadow-rose-500/20'
    }
  ];

  return (
    <div className="h-full flex flex-col space-y-5 animate-in fade-in duration-700 pb-20 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-3xl font-semibold text-slate-900 leading-none">Lead Processing</h2>
          <p className="text-xs font-medium text-slate-400 mt-3">Visual representation of inbound lead processing flow</p>
        </div>
        <div className="flex gap-4">
           <div className="px-6 py-3 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 shadow-sm">
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-500">Recent Activity</span>
           </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 rounded-2xl border-8 border-white shadow-md p-8 relative overflow-hidden flex items-center justify-center">
         {/* Background Grid */}
         <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle, #6366f1 2px, transparent 2px)', backgroundSize: '60px 60px'}}></div>

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

         {/* Internal Logs View Overlay */}
         <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end">
            <div className="bg-slate-950/80 backdrop-blur-md p-6 rounded-xl border border-white/10 max-w-sm w-full font-mono text-xs text-brand/80 space-y-1">
               <p className="text-slate-500 mb-2 flex items-center gap-2"><Terminal className="w-3 h-3" /> Activity Log</p>
               <p>[{new Date().toLocaleTimeString()}] LEAD_STREAM_OPEN</p>
               <p>[{new Date().toLocaleTimeString()}] VALIDATING_DATA... OK</p>
               <p>[{new Date().toLocaleTimeString()}] SYNCING_GROUP_A2... DONE</p>
               <p className="animate-pulse">_ Awaiting next lead...</p>
            </div>

            <div className="flex flex-col items-end gap-4">
               <div className="bg-white/5 backdrop-blur-xl px-6 py-4 rounded-xl border border-white/10 flex items-center gap-6">
                  <div className="flex flex-col items-center">
                     <span className="text-xs font-semibold text-slate-500">Avg. Inbound</span>
                     <span className="text-lg font-semibold text-white">0.42s</span>
                  </div>
                  <div className="w-[1px] h-8 bg-white/10"></div>
                  <div className="flex flex-col items-center">
                     <span className="text-xs font-semibold text-slate-500">Error Rate</span>
                     <span className="text-lg font-semibold text-emerald-400">0.0%</span>
                  </div>
               </div>
               <button className="px-10 py-5 bg-brand text-white rounded-xl font-semibold text-xs shadow-md shadow-brand/40 transition-all">
                  Run Test
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

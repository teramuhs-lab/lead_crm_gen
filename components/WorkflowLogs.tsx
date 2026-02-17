
import React from 'react';
import { History as HistoryIcon, CheckCircle2, XCircle, Clock, Search, RefreshCw, MoreVertical, Filter, Zap } from 'lucide-react';
import { WorkflowLog } from '../types';

const WorkflowLogs: React.FC = () => {
  const logs: WorkflowLog[] = [
    { id: 'l1', contactName: 'John Doe', workflowName: 'Smart Nurture Sequence', currentStep: 'Email #1 Sent', status: 'success', timestamp: '2 mins ago' },
    { id: 'l2', contactName: 'Rachel Zane', workflowName: 'VIP Onboarding', currentStep: 'SMS Branching', status: 'success', timestamp: '15 mins ago' },
    { id: 'l3', contactName: 'Mike Ross', workflowName: 'Lead Qualification AI', currentStep: 'Wait for Response', status: 'waiting', timestamp: '1 hour ago' },
    { id: 'l4', contactName: 'Harvey Specter', workflowName: 'Direct Booking Flow', currentStep: 'Calendar Sync', status: 'failed', timestamp: 'Yesterday' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-brand/10 text-brand rounded-2xl">
              <HistoryIcon className="w-6 h-6" />
           </div>
           <div>
              <h2 className="text-2xl font-semibold text-slate-900 leading-tight">Workflow Logs</h2>
              <p className="text-sm text-slate-500">Track every step your leads take through your marketing workflows</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand transition-colors"><RefreshCw className="w-5 h-5" /></button>
           <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"><Filter className="w-4 h-4" /> Filter Events</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search logs by contact or workflow..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/20" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400">Workflow</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400">Last Step</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{log.contactName.charAt(0)}</div>
                       <span className="text-sm font-bold text-slate-900">{log.contactName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className="text-xs font-medium text-slate-600">{log.workflowName}</span>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <Zap className="w-3.5 h-3.5 text-brand" />
                        {log.currentStep}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-1.5">
                        {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {log.status === 'failed' && <XCircle className="w-4 h-4 text-rose-500" />}
                        {log.status === 'waiting' && <Clock className="w-4 h-4 text-amber-500" />}
                        <span className={`text-xs font-semibold ${log.status === 'success' ? 'text-emerald-600' : log.status === 'failed' ? 'text-rose-600' : 'text-amber-600'}`}>
                           {log.status}
                        </span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                     <span className="text-xs font-medium text-slate-400">{log.timestamp}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
           <p className="text-xs font-medium text-slate-400 italic">Live audit active</p>
           <button className="text-xs font-bold text-brand hover:underline">Clear History</button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowLogs;


import React, { useState } from 'react';
import { History as HistoryIcon, CheckCircle2, XCircle, Clock, Search, RefreshCw, Filter, Zap, Inbox } from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { api } from '../lib/api';
import { WorkflowLog } from '../types';
import { NexusHeader } from './NexusUI';

const WorkflowLogs: React.FC = () => {
  const { workflowLogs, notify } = useNexus();
  const [search, setSearch] = useState('');

  const filtered = workflowLogs.filter(log =>
    !search || log.contactName.toLowerCase().includes(search.toLowerCase()) || log.workflowName.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = async () => {
    try {
      const fresh = await api.get<WorkflowLog[]>('/workflow-logs');
      // Context doesn't expose a setter for workflowLogs, so we just notify
      notify('Logs refreshed');
      window.location.reload();
    } catch {
      notify('Failed to refresh logs', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <NexusHeader title="Workflow Logs" subtitle="Monitor the execution history and status of your automated workflows">
           <button onClick={handleRefresh} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand transition-colors"><RefreshCw className="w-5 h-5" /></button>
      </NexusHeader>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search logs by contact or workflow..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/20"
              />
           </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Inbox className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">{search ? 'No matching logs found' : 'No workflow logs yet'}</p>
            <p className="text-xs mt-1">Run a workflow to see execution logs here</p>
          </div>
        ) : (
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
                {filtered.map((log) => (
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
        )}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
           <p className="text-xs font-medium text-slate-400">{filtered.length} log{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  );
};

export default WorkflowLogs;

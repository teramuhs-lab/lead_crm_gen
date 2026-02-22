import React, { useState } from 'react';
import { X, BrainCircuit, Trash2, Inbox, Settings, CheckCheck, XCircle } from 'lucide-react';
import { useAIQueue } from '../../context/AIActionQueueContext';
import AIProposalCard from './AIProposalCard';
import AIAutonomySettings from './AIAutonomySettings';
import type { AIProposalStat } from '../../types';

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  contacts: 'Contacts',
  messages: 'Messages',
  contact_detail: 'Contact Detail',
  pipeline: 'Pipeline',
  calendar: 'Calendar',
  ai_employee: 'AI Employee',
};

const AIActionPanel: React.FC = () => {
  const { proposals, isQueueOpen, toggleQueue, approveProposal, dismissProposal, bulkApprove, bulkDismiss, clearAll, pendingCount, proposalStats } = useAIQueue();
  const [showSettings, setShowSettings] = useState(false);

  if (!isQueueOpen) return null;

  const pending = proposals.filter(p => p.status === 'pending');
  const processed = proposals.filter(p => p.status !== 'pending');

  // Separate proactive proposals from manual ones
  const proactive = pending.filter(p => p.source === 'proactive');
  const manual = pending.filter(p => p.source !== 'proactive');

  // Group manual pending by module
  const groupedManual = manual.reduce<Record<string, typeof manual>>((acc, p) => {
    const key = p.module || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Compute aggregate stats
  const totalApproved = proposalStats.reduce((sum: number, s: AIProposalStat) => sum + s.approvedCount + s.autoApprovedCount, 0);
  const totalDismissed = proposalStats.reduce((sum: number, s: AIProposalStat) => sum + s.dismissedCount, 0);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={toggleQueue} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[380px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">AI Action Queue</h2>
              <p className="text-xs text-slate-400">{pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(prev => !prev)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={toggleQueue} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings Panel (inline) */}
        {showSettings && (
          <div className="border-b border-slate-100">
            <AIAutonomySettings />
          </div>
        )}

        {/* Bulk Actions */}
        {pending.length > 1 && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <button
              onClick={() => bulkApprove(pending.map(p => p.id))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Approve All ({pending.length})
            </button>
            <button
              onClick={() => bulkDismiss(pending.map(p => p.id))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-500 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> Dismiss All
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-slate-50 rounded-2xl mb-4">
                <Inbox className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No pending actions</p>
              <p className="text-xs text-slate-400 mt-1">AI suggestions will appear here for your approval</p>
            </div>
          ) : (
            <>
              {/* Proactive Suggestions group */}
              {proactive.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">
                    Proactive Suggestions
                  </h3>
                  {proactive.map(p => (
                    <AIProposalCard
                      key={p.id}
                      proposal={p}
                      onApprove={approveProposal}
                      onDismiss={dismissProposal}
                    />
                  ))}
                </div>
              )}

              {/* Manual proposals grouped by module */}
              {Object.entries(groupedManual).map(([module, items]: [string, typeof manual]) => (
                <div key={module} className="mb-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {MODULE_LABELS[module] || module}
                  </h3>
                  {items.map(p => (
                    <AIProposalCard
                      key={p.id}
                      proposal={p}
                      onApprove={approveProposal}
                      onDismiss={dismissProposal}
                    />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Stats Summary */}
        {(totalApproved > 0 || totalDismissed > 0) && (
          <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center justify-center gap-4 text-xs">
              <span className="text-emerald-600 font-medium">{totalApproved} approved</span>
              <span className="text-slate-300">|</span>
              <span className="text-amber-600 font-medium">{totalDismissed} dismissed</span>
            </div>
          </div>
        )}

        {/* Footer */}
        {processed.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100">
            <button
              onClick={clearAll}
              className="flex items-center gap-2 w-full justify-center py-2 text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear {processed.length} processed item{processed.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default AIActionPanel;

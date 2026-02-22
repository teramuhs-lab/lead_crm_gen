import React, { useEffect, useState } from 'react';
import { Undo2, Check, X } from 'lucide-react';
import { useAIQueue } from '../../context/AIActionQueueContext';
import type { AIProposalType } from '../../types';

const TOAST_DURATION = 5000;

const TYPE_LABELS: Record<AIProposalType, string> = {
  send_message: 'Message',
  update_lead_score: 'Score',
  book_appointment: 'Booking',
  run_workflow: 'Workflow',
  update_contact_status: 'Status',
  add_tag: 'Tag',
  add_task: 'Task',
};

interface ToastItemProps {
  id: string;
  proposalId: string;
  title: string;
  type: AIProposalType;
  expiresAt: number;
  onUndo: (proposalId: string) => void;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ id, proposalId, title, type, expiresAt, onUndo, onDismiss }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = expiresAt - Date.now();
      const pct = Math.max(0, (remaining / TOAST_DURATION) * 100);
      setProgress(pct);
      if (pct <= 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="relative bg-white border border-emerald-200 rounded-xl shadow-lg overflow-hidden mb-2 w-80 animate-in slide-in-from-right">
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-emerald-400 transition-all ease-linear" style={{ width: `${progress}%` }} />

      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Green check icon */}
          <div className="p-1 rounded-full bg-emerald-100 shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-emerald-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-emerald-600">Auto-approved</span>
              <span className="text-xs text-slate-400">{TYPE_LABELS[type] || type}</span>
            </div>
            <p className="text-sm text-slate-700 mt-0.5 leading-snug truncate">{title}</p>
          </div>

          {/* Close button */}
          <button
            onClick={() => onDismiss(id)}
            className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Undo button */}
        <div className="mt-2 ml-7">
          <button
            onClick={() => onUndo(proposalId)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </button>
        </div>
      </div>
    </div>
  );
};

const AutoApproveToast: React.FC = () => {
  const { autoApproveEvents, undoAutoApprove, dismissAutoApproveEvent } = useAIQueue();

  if (autoApproveEvents.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col-reverse items-end gap-0">
      {autoApproveEvents.map(event => (
        <ToastItem
          key={event.id}
          id={event.id}
          proposalId={event.proposalId}
          title={event.title}
          type={event.type}
          expiresAt={event.expiresAt}
          onUndo={undoAutoApprove}
          onDismiss={dismissAutoApproveEvent}
        />
      ))}
    </div>
  );
};

export default AutoApproveToast;

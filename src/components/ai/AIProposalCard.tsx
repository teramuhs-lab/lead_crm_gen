import React, { useState } from 'react';
import { Check, X, Pencil, Mail, TrendingUp, CalendarPlus, Play, Tag, ListTodo, User, ChevronDown, ChevronUp } from 'lucide-react';
import type { AIProposal } from '../../types';

const TYPE_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  send_message: { color: 'border-l-indigo-500 bg-indigo-50/50', icon: Mail, label: 'Message' },
  update_lead_score: { color: 'border-l-amber-500 bg-amber-50/50', icon: TrendingUp, label: 'Score' },
  book_appointment: { color: 'border-l-emerald-500 bg-emerald-50/50', icon: CalendarPlus, label: 'Booking' },
  run_workflow: { color: 'border-l-purple-500 bg-purple-50/50', icon: Play, label: 'Workflow' },
  update_contact_status: { color: 'border-l-cyan-500 bg-cyan-50/50', icon: User, label: 'Status' },
  add_tag: { color: 'border-l-rose-500 bg-rose-50/50', icon: Tag, label: 'Tag' },
  add_task: { color: 'border-l-orange-500 bg-orange-50/50', icon: ListTodo, label: 'Task' },
};

interface AIProposalCardProps {
  proposal: AIProposal;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onEdit?: (id: string) => void;
  compact?: boolean;
}

const AIProposalCard: React.FC<AIProposalCardProps> = ({ proposal, onApprove, onDismiss, onEdit, compact }) => {
  const [expanded, setExpanded] = useState(!compact);
  const config = TYPE_CONFIG[proposal.type] || TYPE_CONFIG.send_message;
  const Icon = config.icon;

  if (proposal.status !== 'pending') return null;

  return (
    <div className={`border-l-4 rounded-xl p-3 mb-2 transition-all ${config.color}`}>
      <div className="flex items-start gap-2">
        <div className="p-1.5 rounded-lg bg-white/80 shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">{config.label}</span>
            {proposal.source === 'proactive' && (
              <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">Proactive</span>
            )}
            {proposal.contactName && (
              <span className="text-xs text-slate-500 truncate">• {proposal.contactName}</span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-800 mt-0.5 leading-snug">{proposal.title}</p>
          {compact && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-slate-400 hover:text-slate-600 mt-1 flex items-center gap-1">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Less' : 'More'}
            </button>
          )}
          {expanded && proposal.description && (
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{proposal.description}</p>
          )}
          {expanded && proposal.type === 'send_message' && proposal.payload?.content && (
            <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Message Preview</p>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
                {proposal.payload.content}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 ml-8">
        <button
          onClick={() => onApprove(proposal.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <Check className="w-3 h-3" /> Approve
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(proposal.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
        <button
          onClick={() => onDismiss(proposal.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-400 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors"
        >
          <X className="w-3 h-3" /> Dismiss
        </button>
      </div>
    </div>
  );
};

export default AIProposalCard;

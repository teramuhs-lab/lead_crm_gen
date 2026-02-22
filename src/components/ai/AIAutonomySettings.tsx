import React from 'react';
import { Shield, ShieldCheck, Eye } from 'lucide-react';
import { useAIQueue } from '../../context/AIActionQueueContext';
import type { AIProposalType, AIAutonomyTier } from '../../types';

const PROPOSAL_TYPE_META: Record<AIProposalType, { label: string; description: string }> = {
  add_tag: { label: 'Add Tag', description: 'Apply tags to contacts' },
  add_task: { label: 'Add Task', description: 'Create follow-up tasks' },
  update_lead_score: { label: 'Update Score', description: 'Adjust lead scoring' },
  book_appointment: { label: 'Book Appointment', description: 'Schedule meetings' },
  update_contact_status: { label: 'Update Status', description: 'Change pipeline stage' },
  run_workflow: { label: 'Run Workflow', description: 'Trigger automations' },
  send_message: { label: 'Send Message', description: 'Send emails/SMS to contacts' },
};

const TIER_OPTIONS: { tier: AIAutonomyTier; label: string; icon: React.ElementType; activeClasses: string }[] = [
  {
    tier: 'auto_approve',
    label: 'Auto',
    icon: ShieldCheck,
    activeClasses: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
  {
    tier: 'require_approval',
    label: 'Approve',
    icon: Shield,
    activeClasses: 'bg-amber-100 text-amber-700 border-amber-300',
  },
  {
    tier: 'require_approval_preview',
    label: 'Preview',
    icon: Eye,
    activeClasses: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  },
];

const AIAutonomySettings: React.FC = () => {
  const { autonomyConfig, updateAutonomySetting, proposalStats } = useAIQueue();

  const getStatLabel = (type: AIProposalType): { text: string; color: string } => {
    const stat = proposalStats.find(s => s.proposalType === type);
    if (!stat) return { text: 'No data', color: 'text-slate-400' };

    const total = stat.approvedCount + stat.autoApprovedCount + stat.dismissedCount;
    if (total === 0) return { text: 'No data', color: 'text-slate-400' };

    const approvedRate = Math.round(((stat.approvedCount + stat.autoApprovedCount) / total) * 100);
    const dismissedRate = 100 - approvedRate;

    if (approvedRate >= dismissedRate) {
      return { text: `${approvedRate}% approved`, color: 'text-emerald-600' };
    }
    return { text: `${dismissedRate}% dismissed`, color: 'text-amber-600' };
  };

  return (
    <div className="px-4 py-4 max-h-[50vh] overflow-y-auto">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Autonomy Settings</h3>
      <div className="space-y-2">
        {(Object.keys(PROPOSAL_TYPE_META) as AIProposalType[]).map(type => {
          const meta = PROPOSAL_TYPE_META[type];
          const currentTier = autonomyConfig[type];
          const statLabel = getStatLabel(type);

          return (
            <div
              key={type}
              className="bg-slate-50 rounded-xl p-3 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{meta.label}</span>
                    <span className={`text-[10px] font-medium ${statLabel.color}`}>{statLabel.text}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">{meta.description}</p>
                </div>
              </div>

              <div className="flex gap-1.5">
                {TIER_OPTIONS.map(({ tier, label, icon: Icon, activeClasses }) => {
                  const isActive = currentTier === tier;
                  return (
                    <button
                      key={tier}
                      onClick={() => updateAutonomySetting(type, tier)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                        isActive
                          ? activeClasses
                          : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-500'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIAutonomySettings;

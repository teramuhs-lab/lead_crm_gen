import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNexus } from './NexusContext';
import { api } from '../lib/api';
import type { AIProposal, AIProposalType, AIAutonomyTier, AIAutonomyConfig, AIProposalStat } from '../types';

const DEFAULT_AUTONOMY: AIAutonomyConfig = {
  add_tag: 'auto_approve',
  add_task: 'auto_approve',
  update_lead_score: 'auto_approve',
  book_appointment: 'require_approval',
  update_contact_status: 'require_approval',
  run_workflow: 'require_approval',
  send_message: 'require_approval_preview',
};

interface AutoApproveEvent {
  id: string;
  proposalId: string;
  title: string;
  type: AIProposalType;
  expiresAt: number;
}

interface AIActionQueueContextType {
  proposals: AIProposal[];
  isQueueOpen: boolean;
  pendingCount: number;
  autonomyConfig: AIAutonomyConfig;
  proposalStats: AIProposalStat[];
  autoApproveEvents: AutoApproveEvent[];
  addProposal: (partial: Omit<AIProposal, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  approveProposal: (id: string, updatedPayload?: Record<string, any>) => Promise<void>;
  dismissProposal: (id: string) => Promise<void>;
  bulkApprove: (ids: string[]) => Promise<void>;
  bulkDismiss: (ids: string[]) => Promise<void>;
  undoAutoApprove: (proposalId: string) => Promise<void>;
  updateAutonomySetting: (type: AIProposalType, tier: AIAutonomyTier) => Promise<void>;
  toggleQueue: () => void;
  clearAll: () => void;
  refreshProposals: () => Promise<void>;
  dismissAutoApproveEvent: (id: string) => void;
}

const AIActionQueueContext = createContext<AIActionQueueContextType | undefined>(undefined);

export const AIActionQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [proposals, setProposals] = useState<AIProposal[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [autonomyConfig, setAutonomyConfig] = useState<AIAutonomyConfig>(DEFAULT_AUTONOMY);
  const [proposalStats, setProposalStats] = useState<AIProposalStat[]>([]);
  const [autoApproveEvents, setAutoApproveEvents] = useState<AutoApproveEvent[]>([]);
  const initDone = useRef(false);

  const { activeSubAccountId, notify } = useNexus();

  const pendingCount = useMemo(
    () => proposals.filter(p => p.status === 'pending').length,
    [proposals]
  );

  // Load proposals, autonomy config, and stats on mount
  useEffect(() => {
    if (!activeSubAccountId || initDone.current) return;
    initDone.current = true;

    const load = async () => {
      try {
        const [proposalsData, configData, statsData] = await Promise.all([
          api.get<AIProposal[]>(`/ai/proposals?subAccountId=${activeSubAccountId}&status=pending`),
          api.get<Record<string, string>>(`/ai/autonomy-settings?subAccountId=${activeSubAccountId}`),
          api.get<AIProposalStat[]>(`/ai/proposal-stats?subAccountId=${activeSubAccountId}`),
        ]);
        setProposals(proposalsData);
        setAutonomyConfig(configData as AIAutonomyConfig);
        setProposalStats(statsData);
      } catch {
        // Silent — non-critical
      }
    };
    load();
  }, [activeSubAccountId]);

  // Auto-dismiss expired undo events
  useEffect(() => {
    if (autoApproveEvents.length === 0) return;
    const timer = setInterval(() => {
      setAutoApproveEvents(prev => prev.filter(e => e.expiresAt > Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [autoApproveEvents.length]);

  const refreshProposals = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<AIProposal[]>(`/ai/proposals?subAccountId=${activeSubAccountId}&status=pending`);
      setProposals(data);
    } catch {
      // Silent
    }
  }, [activeSubAccountId]);

  const addProposal = useCallback(async (partial: Omit<AIProposal, 'id' | 'status' | 'createdAt'>) => {
    if (!activeSubAccountId) return;
    try {
      const result = await api.post<AIProposal & { autoApproved: boolean; tier: string }>('/ai/proposals', {
        ...partial,
        subAccountId: activeSubAccountId,
      });

      if ((result as any).duplicate) {
        // Already exists in queue — skip silently
        return;
      } else if (result.autoApproved) {
        // Show undo toast instead of adding to queue
        setAutoApproveEvents(prev => [...prev, {
          id: 'ae-' + Date.now(),
          proposalId: result.id,
          title: result.title,
          type: result.type,
          expiresAt: Date.now() + 5000,
        }]);
        notify(`Auto-approved: ${partial.title}`, 'success');
      } else {
        setProposals(prev => [result, ...prev]);
        notify(`AI suggestion queued: ${partial.title}`, 'info');
      }
    } catch {
      notify('Failed to queue AI suggestion', 'error');
    }
  }, [activeSubAccountId, notify]);

  const approveProposal = useCallback(async (id: string, updatedPayload?: Record<string, any>) => {
    const proposal = proposals.find(p => p.id === id);
    if (!proposal || proposal.status !== 'pending') return;

    // Optimistic update
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' as const } : p));
    notify(`Approved: ${proposal.title}`, 'success');

    try {
      await api.put(`/ai/proposals/${id}/approve`, updatedPayload ? { payload: updatedPayload } : {});
    } catch {
      // Rollback
      setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'pending' as const } : p));
      notify('Failed to approve action', 'error');
    }
  }, [proposals, notify]);

  const dismissProposal = useCallback(async (id: string) => {
    const proposal = proposals.find(p => p.id === id);
    if (!proposal || proposal.status !== 'pending') return;

    // Optimistic update
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'dismissed' as const } : p));

    try {
      await api.put(`/ai/proposals/${id}/dismiss`, {});
    } catch {
      // Rollback
      setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'pending' as const } : p));
      notify('Failed to dismiss action', 'error');
    }
  }, [proposals, notify]);

  const bulkApprove = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setProposals(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'approved' as const } : p));
    notify(`Approved ${ids.length} action${ids.length > 1 ? 's' : ''}`, 'success');
    try {
      await api.put('/ai/proposals/bulk-approve', { ids });
    } catch {
      setProposals(prev => prev.map(p => ids.includes(p.id) && p.status === 'approved' ? { ...p, status: 'pending' as const } : p));
      notify('Bulk approve failed', 'error');
    }
  }, [notify]);

  const bulkDismiss = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setProposals(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'dismissed' as const } : p));
    notify(`Dismissed ${ids.length} action${ids.length > 1 ? 's' : ''}`, 'info');
    try {
      await api.put('/ai/proposals/bulk-dismiss', { ids });
    } catch {
      setProposals(prev => prev.map(p => ids.includes(p.id) && p.status === 'dismissed' ? { ...p, status: 'pending' as const } : p));
      notify('Bulk dismiss failed', 'error');
    }
  }, [notify]);

  const undoAutoApprove = useCallback(async (proposalId: string) => {
    try {
      await api.put(`/ai/proposals/${proposalId}/undo`, {});
      setAutoApproveEvents(prev => prev.filter(e => e.proposalId !== proposalId));
      notify('Action undone', 'info');
    } catch {
      notify('Failed to undo action', 'error');
    }
  }, [notify]);

  const dismissAutoApproveEvent = useCallback((id: string) => {
    setAutoApproveEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateAutonomySetting = useCallback(async (type: AIProposalType, tier: AIAutonomyTier) => {
    if (!activeSubAccountId) return;
    setAutonomyConfig(prev => ({ ...prev, [type]: tier }));
    try {
      await api.put('/ai/autonomy-settings', { subAccountId: activeSubAccountId, proposalType: type, tier });
    } catch {
      notify('Failed to update setting', 'error');
    }
  }, [activeSubAccountId, notify]);

  const toggleQueue = useCallback(() => setIsQueueOpen(prev => !prev), []);

  const clearAll = useCallback(() => {
    setProposals(prev => prev.filter(p => p.status === 'pending'));
  }, []);

  const value = useMemo(() => ({
    proposals, isQueueOpen, pendingCount, autonomyConfig, proposalStats, autoApproveEvents,
    addProposal, approveProposal, dismissProposal, bulkApprove, bulkDismiss, undoAutoApprove,
    updateAutonomySetting, toggleQueue, clearAll, refreshProposals, dismissAutoApproveEvent,
  }), [proposals, isQueueOpen, pendingCount, autonomyConfig, proposalStats, autoApproveEvents,
    addProposal, approveProposal, dismissProposal, bulkApprove, bulkDismiss, undoAutoApprove,
    updateAutonomySetting, toggleQueue, clearAll, refreshProposals, dismissAutoApproveEvent]);

  return (
    <AIActionQueueContext.Provider value={value}>
      {children}
    </AIActionQueueContext.Provider>
  );
};

export const useAIQueue = () => {
  const context = useContext(AIActionQueueContext);
  if (!context) throw new Error('useAIQueue must be used within AIActionQueueProvider');
  return context;
};

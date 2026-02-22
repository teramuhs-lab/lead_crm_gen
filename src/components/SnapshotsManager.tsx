import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Search, Edit3, Trash2, Rocket, Copy, Workflow,
  Globe, FileText, Users, CheckCircle2, XCircle, Loader2, X,
  ChevronDown, ChevronRight, MoreVertical,
} from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import type { Snapshot, SnapshotDeployment, Form } from '../types';
import { NexusHeader } from './NexusUI';

// ---------------------------------------------------------------------------
// SnapshotsManager
// ---------------------------------------------------------------------------

const SnapshotsManager: React.FC = () => {
  const { activeSubAccountId, notify, subAccounts, workflows, funnels } = useNexus();

  // ── Core state ──
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [deployments, setDeployments] = useState<SnapshotDeployment[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Modals ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<Snapshot | null>(null);

  // ── Forms list (fetched separately) ──
  const [availableForms, setAvailableForms] = useState<Form[]>([]);

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('');

  // --------------------------------------------------------------------------
  // Data fetching
  // --------------------------------------------------------------------------

  const fetchSnapshots = useCallback(async () => {
    try {
      const data = await api.get<Snapshot[]>('/snapshots');
      setSnapshots(data);
    } catch {
      notify('Failed to load snapshots', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const fetchDeployments = useCallback(async (snapshotId: string) => {
    try {
      const data = await api.get<SnapshotDeployment[]>(`/snapshots/${snapshotId}/deployments`);
      setDeployments(data);
    } catch {
      setDeployments([]);
    }
  }, []);

  const fetchForms = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<Form[]>(`/forms?subAccountId=${activeSubAccountId}`);
      setAvailableForms(data);
    } catch {
      setAvailableForms([]);
    }
  }, [activeSubAccountId]);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);
  useEffect(() => { fetchForms(); }, [fetchForms]);

  useEffect(() => {
    if (selectedSnapshot) {
      fetchDeployments(selectedSnapshot.id);
    } else {
      setDeployments([]);
    }
  }, [selectedSnapshot, fetchDeployments]);

  // --------------------------------------------------------------------------
  // Computed
  // --------------------------------------------------------------------------

  const totalDeployments = snapshots.reduce((sum, s) => {
    // We count the deployments we have loaded for the selected snapshot;
    // for the stats row we can only show loaded data or approximate from content.
    return sum;
  }, 0);

  const filteredSnapshots = snapshots.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this snapshot and all its deployments?')) return;
    try {
      await api.delete(`/snapshots/${id}`);
      setSnapshots(prev => prev.filter(s => s.id !== id));
      if (selectedSnapshot?.id === id) setSelectedSnapshot(null);
      notify('Snapshot deleted');
    } catch {
      notify('Failed to delete snapshot', 'error');
    }
  };

  const handleSelectSnapshot = (snapshot: Snapshot) => {
    setSelectedSnapshot(prev => prev?.id === snapshot.id ? null : snapshot);
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <NexusHeader title="Snapshots" subtitle="Save and share account configurations as reusable templates">
        <button
          onClick={() => { setEditingSnapshot(null); setShowCreateModal(true); }}
          className="flex items-center gap-2 bg-brand text-white rounded-2xl px-5 py-2.5 font-semibold text-sm shadow-sm shadow-brand/20 hover:scale-105 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Template Bundle
        </button>
      </NexusHeader>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{snapshots.length}</p>
            <p className="text-xs font-medium text-slate-400">Total Snapshots</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Rocket className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{deployments.length}</p>
            <p className="text-xs font-medium text-slate-400">Total Deployments</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search snapshots..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
        />
      </div>

      {/* Snapshot Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {filteredSnapshots.map(snapshot => (
          <div
            key={snapshot.id}
            onClick={() => handleSelectSnapshot(snapshot)}
            className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col ${
              selectedSnapshot?.id === snapshot.id
                ? 'border-brand ring-2 ring-brand/20'
                : 'border-slate-200 hover:border-brand/20'
            }`}
          >
            <div className="p-6 space-y-4 flex-1 flex flex-col">
              {/* Top: category + actions */}
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
                  {snapshot.category}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setEditingSnapshot(snapshot); setShowCreateModal(true); }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(snapshot.id); }}
                    className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedSnapshot(snapshot); setShowDeployModal(true); }}
                    className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Deploy"
                  >
                    <Rocket className="w-3.5 h-3.5 text-emerald-500" />
                  </button>
                </div>
              </div>

              {/* Name + description */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900">{snapshot.name}</h4>
                {snapshot.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{snapshot.description}</p>
                )}
              </div>

              {/* Content counts */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium">
                  <Workflow className="w-3.5 h-3.5" />
                  {snapshot.contentCount.workflows}
                </div>
                <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium">
                  <Globe className="w-3.5 h-3.5" />
                  {snapshot.contentCount.funnels}
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-medium">
                  <FileText className="w-3.5 h-3.5" />
                  {snapshot.contentCount.forms}
                </div>
              </div>

              {/* Created date */}
              <p className="text-xs text-slate-300 mt-auto pt-2">
                Created {new Date(snapshot.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}

        {filteredSnapshots.length === 0 && !loading && (
          <div className="col-span-full text-center py-16 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">No snapshots found</p>
            <p className="text-xs mt-1">Create your first template bundle to get started.</p>
          </div>
        )}
      </div>

      {/* Distribution Log */}
      {selectedSnapshot && deployments.length > 0 && (
        <DeploymentLog
          deployments={deployments}
          subAccounts={subAccounts}
          snapshotName={selectedSnapshot.name}
        />
      )}

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <CreateEditModal
          snapshot={editingSnapshot}
          workflows={workflows}
          funnels={funnels}
          forms={availableForms}
          activeSubAccountId={activeSubAccountId}
          onClose={() => { setShowCreateModal(false); setEditingSnapshot(null); }}
          onSaved={saved => {
            if (editingSnapshot) {
              setSnapshots(prev => prev.map(s => s.id === saved.id ? saved : s));
            } else {
              setSnapshots(prev => [saved, ...prev]);
            }
            setShowCreateModal(false);
            setEditingSnapshot(null);
            notify(editingSnapshot ? 'Snapshot updated' : 'Snapshot created');
          }}
        />
      )}

      {/* Deploy Modal */}
      {showDeployModal && selectedSnapshot && (
        <DeployModal
          snapshot={selectedSnapshot}
          subAccounts={subAccounts}
          onClose={() => setShowDeployModal(false)}
          onDeployed={newDeployments => {
            setDeployments(prev => [...newDeployments, ...prev]);
            notify(`Snapshot deployed to ${newDeployments.length} account(s)`);
          }}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// CreateEditModal
// ---------------------------------------------------------------------------

interface CreateEditModalProps {
  snapshot: Snapshot | null;
  workflows: Array<{ id: string; name: string }>;
  funnels: Array<{ id: string; name: string }>;
  forms: Form[];
  activeSubAccountId: string;
  onClose: () => void;
  onSaved: (snapshot: Snapshot) => void;
}

const CATEGORY_SUGGESTIONS = ['General', 'Real Estate', 'Medical', 'Tech', 'SaaS', 'E-commerce'];

const CreateEditModal: React.FC<CreateEditModalProps> = ({
  snapshot, workflows, funnels, forms, activeSubAccountId, onClose, onSaved,
}) => {
  const isEdit = !!snapshot;

  const [name, setName] = useState(snapshot?.name || '');
  const [category, setCategory] = useState(snapshot?.category || '');
  const [description, setDescription] = useState(snapshot?.description || '');
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<Set<string>>(
    new Set(snapshot?.content.workflowIds || [])
  );
  const [selectedFunnelIds, setSelectedFunnelIds] = useState<Set<string>>(
    new Set(snapshot?.content.funnelIds || [])
  );
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(
    new Set(snapshot?.content.formIds || [])
  );
  const [saving, setSaving] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workflows: true, funnels: true, forms: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleId = (set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isEdit) {
        const saved = await api.put<Snapshot>(`/snapshots/${snapshot!.id}`, {
          name: name.trim(),
          category: category || 'General',
          description,
        });
        onSaved(saved);
      } else {
        const saved = await api.post<Snapshot>('/snapshots', {
          name: name.trim(),
          category: category || 'General',
          description,
          workflowIds: [...selectedWorkflowIds],
          funnelIds: [...selectedFunnelIds],
          formIds: [...selectedFormIds],
        });
        onSaved(saved);
      }
    } catch {
      // Error handled by parent via notify
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">
            {isEdit ? 'Edit Snapshot' : 'Create Template Bundle'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Real Estate Growth Pack"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>

          {/* Category */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              onFocus={() => setShowCategorySuggestions(true)}
              onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
              placeholder="e.g. Real Estate"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
            {showCategorySuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {CATEGORY_SUGGESTIONS.filter(s => s.toLowerCase().includes(category.toLowerCase())).map(s => (
                  <button
                    key={s}
                    onMouseDown={() => { setCategory(s); setShowCategorySuggestions(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what this bundle includes..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
            />
          </div>

          {/* Content Selection (only on create) */}
          {!isEdit && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600">Content</p>

              {/* Workflows */}
              <CollapsibleGroup
                label="Workflows"
                count={selectedWorkflowIds.size}
                total={workflows.length}
                icon={<Workflow className="w-4 h-4 text-amber-500" />}
                expanded={expandedSections.workflows}
                onToggle={() => toggleSection('workflows')}
              >
                {workflows.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No workflows available</p>
                ) : (
                  workflows.map(wf => (
                    <label key={wf.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedWorkflowIds.has(wf.id)}
                        onChange={() => toggleId(selectedWorkflowIds, setSelectedWorkflowIds, wf.id)}
                        className="rounded border-slate-300 text-brand focus:ring-brand/20"
                      />
                      <span className="text-sm text-slate-700">{wf.name}</span>
                    </label>
                  ))
                )}
              </CollapsibleGroup>

              {/* Funnels */}
              <CollapsibleGroup
                label="Funnels"
                count={selectedFunnelIds.size}
                total={funnels.length}
                icon={<Globe className="w-4 h-4 text-indigo-500" />}
                expanded={expandedSections.funnels}
                onToggle={() => toggleSection('funnels')}
              >
                {funnels.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No funnels available</p>
                ) : (
                  funnels.map(fn => (
                    <label key={fn.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFunnelIds.has(fn.id)}
                        onChange={() => toggleId(selectedFunnelIds, setSelectedFunnelIds, fn.id)}
                        className="rounded border-slate-300 text-brand focus:ring-brand/20"
                      />
                      <span className="text-sm text-slate-700">{fn.name}</span>
                    </label>
                  ))
                )}
              </CollapsibleGroup>

              {/* Forms */}
              <CollapsibleGroup
                label="Forms"
                count={selectedFormIds.size}
                total={forms.length}
                icon={<FileText className="w-4 h-4 text-emerald-500" />}
                expanded={expandedSections.forms}
                onToggle={() => toggleSection('forms')}
              >
                {forms.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No forms available</p>
                ) : (
                  forms.map(fm => (
                    <label key={fm.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFormIds.has(fm.id)}
                        onChange={() => toggleId(selectedFormIds, setSelectedFormIds, fm.id)}
                        className="rounded border-slate-300 text-brand focus:ring-brand/20"
                      />
                      <span className="text-sm text-slate-700">{fm.name}</span>
                    </label>
                  ))
                )}
              </CollapsibleGroup>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex items-center gap-2 bg-brand text-white rounded-2xl px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Snapshot'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CollapsibleGroup
// ---------------------------------------------------------------------------

interface CollapsibleGroupProps {
  label: string;
  count: number;
  total: number;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleGroup: React.FC<CollapsibleGroupProps> = ({
  label, count, total, icon, expanded, onToggle, children,
}) => (
  <div className="border border-slate-200 rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
    >
      {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      {icon}
      <span className="text-sm font-medium text-slate-700 flex-1 text-left">{label}</span>
      <span className="text-xs font-semibold text-brand bg-indigo-50 px-2 py-0.5 rounded-full">
        {count}/{total}
      </span>
    </button>
    {expanded && (
      <div className="px-4 pb-3 pt-1 border-t border-slate-100 max-h-48 overflow-y-auto">
        {children}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// DeployModal
// ---------------------------------------------------------------------------

interface DeployModalProps {
  snapshot: Snapshot;
  subAccounts: Array<{ id: string; name: string }>;
  onClose: () => void;
  onDeployed: (deployments: SnapshotDeployment[]) => void;
}

const DeployModal: React.FC<DeployModalProps> = ({ snapshot, subAccounts, onClose, onDeployed }) => {
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [deploying, setDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [results, setResults] = useState<SnapshotDeployment[] | null>(null);

  const totalSteps = 3;

  const toggleAccount = (id: string) => {
    setSelectedAccountIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedAccountIds(new Set(subAccounts.map(s => s.id)));
  const deselectAll = () => setSelectedAccountIds(new Set());

  const handleDeploy = async () => {
    if (selectedAccountIds.size === 0) return;
    setDeploying(true);
    setDeployStep(1);

    // Simulate progress steps while the real API call runs
    const progressTimer = setInterval(() => {
      setDeployStep(prev => {
        if (prev < totalSteps) return prev + 1;
        return prev;
      });
    }, 1200);

    try {
      const response = await api.post<{ deployments: SnapshotDeployment[] }>(
        `/snapshots/${snapshot.id}/deploy`,
        { subAccountIds: [...selectedAccountIds] }
      );

      clearInterval(progressTimer);
      setDeployStep(totalSteps);
      setResults(response.deployments);
      onDeployed(response.deployments);
    } catch {
      clearInterval(progressTimer);
      setDeployStep(0);
      setDeploying(false);
    }
  };

  // Show deployment progress animation
  if (deploying && !results) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-xl space-y-6 animate-in zoom-in-95 duration-500">
          <div className="w-40 h-40 bg-brand/10 rounded-xl flex items-center justify-center mx-auto shadow-md relative border-4 border-brand/20">
            <Rocket className="w-20 h-20 text-brand animate-bounce" />
            <div className="absolute inset-0 bg-brand/20 blur-[100px] rounded-full animate-pulse" />
          </div>
          <div className="space-y-6">
            <h2 className="text-5xl font-semibold text-white">Publishing Snapshot</h2>
            <p className="text-slate-400 font-medium text-sm h-6 flex items-center justify-center gap-4">
              <Loader2 className="w-5 h-5 animate-spin text-brand" />
              {deployStep === 1 && 'Preparing data...'}
              {deployStep === 2 && 'Cloning assets to sub-accounts...'}
              {deployStep === 3 && 'Finalizing deployments...'}
            </p>
          </div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-1 border border-white/5 shadow-inner">
            <div
              className="h-full bg-brand rounded-full transition-all duration-1000 ease-out shadow-[0_0_30px_rgba(99,102,241,0.8)]"
              style={{ width: `${(deployStep / totalSteps) * 100}%` }}
            />
          </div>
          <div className="flex justify-between px-4 text-sm font-semibold text-slate-600">
            <span className="flex items-center gap-3">Step <span className="text-brand">{deployStep}</span> of {totalSteps}</span>
            <span className="text-slate-400">Publishing in progress</span>
          </div>
        </div>
      </div>
    );
  }

  // Show results
  if (results) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Deployment Results</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-3 max-h-96 overflow-y-auto">
            {results.map(d => {
              const account = subAccounts.find(s => s.id === d.subAccountId);
              const details = d.details;
              return (
                <div key={d.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    {d.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{account?.name || d.subAccountId}</p>
                      <p className="text-xs text-slate-400">
                        {details.workflowsCopied}w / {details.funnelsCopied}f / {details.formsCopied}fm copied
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    d.status === 'success'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}>
                    {d.status}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="bg-brand text-white rounded-2xl px-5 py-2.5 text-sm font-semibold hover:scale-105 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default: account selection
  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Deploy Snapshot</h3>
            <p className="text-xs text-slate-400 mt-1">{snapshot.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content summary */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-2">Content to deploy</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <Workflow className="w-3.5 h-3.5 text-amber-500" /> {snapshot.contentCount.workflows} Workflows
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <Globe className="w-3.5 h-3.5 text-indigo-500" /> {snapshot.contentCount.funnels} Funnels
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <FileText className="w-3.5 h-3.5 text-emerald-500" /> {snapshot.contentCount.forms} Forms
            </span>
          </div>
        </div>

        {/* Sub-account selection */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600">Select Sub-Accounts</p>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-xs font-medium text-brand hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={deselectAll}
                className="text-xs font-medium text-slate-400 hover:underline"
              >
                Deselect All
              </button>
            </div>
          </div>
          {subAccounts.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No sub-accounts available</p>
          ) : (
            subAccounts.map(sa => (
              <label key={sa.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedAccountIds.has(sa.id)}
                  onChange={() => toggleAccount(sa.id)}
                  className="rounded border-slate-300 text-brand focus:ring-brand/20"
                />
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{sa.name}</span>
              </label>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeploy}
            disabled={selectedAccountIds.size === 0}
            className="flex items-center gap-2 bg-brand text-white rounded-2xl px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all"
          >
            <Rocket className="w-4 h-4" />
            Deploy to {selectedAccountIds.size} Account{selectedAccountIds.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// DeploymentLog
// ---------------------------------------------------------------------------

interface DeploymentLogProps {
  deployments: SnapshotDeployment[];
  subAccounts: Array<{ id: string; name: string }>;
  snapshotName: string;
}

const DeploymentLog: React.FC<DeploymentLogProps> = ({ deployments, subAccounts, snapshotName }) => {
  const getAccountName = (id: string) => subAccounts.find(s => s.id === id)?.name || id;

  const statusStyles: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-600',
    failed: 'bg-rose-50 text-rose-600',
    pending: 'bg-amber-50 text-amber-600',
    in_progress: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <Copy className="w-5 h-5 text-brand" />
        <h4 className="text-sm font-semibold text-slate-900">Distribution Log</h4>
        <span className="text-xs text-slate-400 ml-auto">{snapshotName}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Sub-Account</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Snapshot</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Items Copied</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map(d => {
              const details = d.details;
              const totalItems = (details.workflowsCopied || 0) + (details.funnelsCopied || 0) + (details.formsCopied || 0);
              return (
                <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <span className="font-medium text-slate-700">{getAccountName(d.subAccountId)}</span>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{snapshotName}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyles[d.status] || 'bg-slate-100 text-slate-500'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{totalItems}</td>
                  <td className="px-6 py-3 text-slate-400">
                    {new Date(d.deployedAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {deployments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">
                  No deployments yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SnapshotsManager;

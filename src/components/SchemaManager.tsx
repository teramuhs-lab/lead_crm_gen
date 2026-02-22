
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Type, Hash, Calendar, ChevronDown,
  X, Database, Loader2, AlertTriangle
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { CustomFieldDefinition } from '../types';
import { api } from '../lib/api';
import { NexusHeader } from './NexusUI';

const TYPE_CONFIG: Record<
  CustomFieldDefinition['type'],
  { icon: React.ElementType; badgeBg: string; badgeText: string }
> = {
  text:     { icon: Type,        badgeBg: 'bg-indigo-50',  badgeText: 'text-brand' },
  number:   { icon: Hash,        badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-600' },
  date:     { icon: Calendar,    badgeBg: 'bg-amber-50',   badgeText: 'text-amber-600' },
  dropdown: { icon: ChevronDown, badgeBg: 'bg-rose-50',    badgeText: 'text-rose-600' },
};

const SchemaManager: React.FC = () => {
  const { activeSubAccountId, notify, fieldDefinitions, setFieldDefinitions } = useNexus();

  // ── Local state ──
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── New field form ──
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CustomFieldDefinition['type']>('text');
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState('');

  // ── Fetch on mount + when sub-account changes ──
  const fetchFields = useCallback(async () => {
    if (!activeSubAccountId) return;
    setLoading(true);
    try {
      const data = await api.get<CustomFieldDefinition[]>(
        `/field-definitions?subAccountId=${activeSubAccountId}`
      );
      setFieldDefinitions(data);
    } catch {
      notify('Failed to load field definitions', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeSubAccountId, setFieldDefinitions, notify]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // ── Computed stats ──
  const totalFields = fieldDefinitions.length;
  const textCount = fieldDefinitions.filter(f => f.type === 'text').length;
  const numberCount = fieldDefinitions.filter(f => f.type === 'number').length;

  // ── Add option chip ──
  const handleAddOption = useCallback(() => {
    const trimmed = optionInput.trim();
    if (!trimmed) return;
    if (newOptions.includes(trimmed)) {
      notify('Duplicate option', 'error');
      return;
    }
    setNewOptions(prev => [...prev, trimmed]);
    setOptionInput('');
  }, [optionInput, newOptions, notify]);

  const handleRemoveOption = useCallback((opt: string) => {
    setNewOptions(prev => prev.filter(o => o !== opt));
  }, []);

  // ── Reset modal form ──
  const resetForm = useCallback(() => {
    setNewLabel('');
    setNewType('text');
    setNewOptions([]);
    setOptionInput('');
  }, []);

  const openModal = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    resetForm();
  }, [resetForm]);

  // ── Save new field via API ──
  const handleSaveField = useCallback(async () => {
    if (!newLabel.trim()) {
      notify('Field name is required', 'error');
      return;
    }
    if (!activeSubAccountId) {
      notify('No sub-account selected', 'error');
      return;
    }
    if (newType === 'dropdown' && newOptions.length === 0) {
      notify('Dropdown fields need at least one option', 'error');
      return;
    }

    setSaving(true);
    try {
      const created = await api.post<CustomFieldDefinition>('/field-definitions', {
        subAccountId: activeSubAccountId,
        label: newLabel.trim(),
        type: newType,
        options: newType === 'dropdown' ? newOptions : undefined,
      });
      setFieldDefinitions(prev => [...prev, created]);
      notify(`Field "${created.label}" created`);
      closeModal();
    } catch {
      notify('Failed to create field', 'error');
    } finally {
      setSaving(false);
    }
  }, [newLabel, newType, newOptions, activeSubAccountId, setFieldDefinitions, notify, closeModal]);

  // ── Delete field via API ──
  const handleDeleteField = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/field-definitions/${id}`);
      setFieldDefinitions(prev => prev.filter(f => f.id !== id));
      notify('Field deleted');
    } catch {
      notify('Failed to delete field', 'error');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }, [setFieldDefinitions, notify]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <NexusHeader title="Schema Manager" subtitle="Define and manage custom data fields and object schemas">
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 hover:shadow-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Field
        </button>
      </NexusHeader>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Fields', value: totalFields, color: 'text-brand' },
          { label: 'Text Fields', value: textCount, color: 'text-brand' },
          { label: 'Number Fields', value: numberCount, color: 'text-emerald-600' },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Field list ── */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="text-sm font-medium">Loading fields...</p>
        </div>
      ) : fieldDefinitions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-20 text-center">
          <Database className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="text-sm text-slate-400 italic">
            No custom fields defined. Add your first field to extend the CRM schema.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fieldDefinitions.map(field => {
            const cfg = TYPE_CONFIG[field.type];
            const Icon = cfg.icon;
            const isConfirming = confirmDeleteId === field.id;
            const isDeleting = deletingId === field.id;

            return (
              <div
                key={field.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center justify-between group hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-5">
                  {/* Type icon */}
                  <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Label and metadata */}
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{field.label}</h4>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Type badge */}
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}
                      >
                        {field.type}
                      </span>

                      {/* Dropdown options */}
                      {field.type === 'dropdown' && field.options && field.options.length > 0 && (
                        <>
                          {field.options.map(opt => (
                            <span
                              key={opt}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500"
                            >
                              {opt}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete button (hover reveal) */}
                <div className="opacity-0 group-hover:opacity-100 transition-all">
                  {isConfirming ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        disabled={isDeleting}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(field.id)}
                      className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Field Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Custom Field</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Extend the schema with a new field
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {/* Field Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Field Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Property Address"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  autoFocus
                />
              </div>

              {/* Data Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Data Type
                </label>
                <select
                  value={newType}
                  onChange={e => {
                    setNewType(e.target.value as CustomFieldDefinition['type']);
                    if (e.target.value !== 'dropdown') {
                      setNewOptions([]);
                      setOptionInput('');
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all appearance-none"
                >
                  <option value="text">Single Line Text</option>
                  <option value="number">Numeric Value</option>
                  <option value="date">Date</option>
                  <option value="dropdown">Dropdown</option>
                </select>
              </div>

              {/* Dropdown options (conditional) */}
              {newType === 'dropdown' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Options
                  </label>

                  {/* Option chips */}
                  {newOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {newOptions.map(opt => (
                        <span
                          key={opt}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-brand text-xs font-semibold rounded-lg"
                        >
                          {opt}
                          <button
                            onClick={() => handleRemoveOption(opt)}
                            className="text-indigo-300 hover:text-indigo-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add option input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type an option and press Add"
                      value={optionInput}
                      onChange={e => setOptionInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                    />
                    <button
                      onClick={handleAddOption}
                      type="button"
                      className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-6 pt-0">
              <button
                onClick={handleSaveField}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-brand text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 hover:shadow-xl transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Field'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchemaManager;

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Search, Edit3, Trash2, Settings, Code2, ClipboardList,
  Loader2, X, Save, ArrowLeft, CheckCircle2, Copy, Type, Mail, Phone,
  Hash, AlignLeft, ChevronDown, ToggleLeft,
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { api } from '../lib/api';
import { Form, FormField, FormSettings, FormSubmission } from '../types';
import { NexusHeader } from './NexusUI';

// ── Field type configuration ────────────────────────────────────────────────────
const FIELD_TYPES: { type: FormField['type']; label: string; icon: React.FC<{ className?: string }>; color: string }[] = [
  { type: 'text', label: 'Text', icon: Type, color: 'text-indigo-500' },
  { type: 'email', label: 'Email', icon: Mail, color: 'text-emerald-500' },
  { type: 'phone', label: 'Phone', icon: Phone, color: 'text-rose-500' },
  { type: 'number', label: 'Number', icon: Hash, color: 'text-amber-500' },
  { type: 'textarea', label: 'Textarea', icon: AlignLeft, color: 'text-sky-500' },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, color: 'text-violet-500' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckCircle2, color: 'text-teal-500' },
];

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-50 text-emerald-600',
  archived: 'bg-amber-50 text-amber-600',
};

// ── Component ───────────────────────────────────────────────────────────────────
const FormBuilder: React.FC = () => {
  const { activeSubAccountId, notify, workflows, fieldDefinitions } = useNexus();

  // List state
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'settings' | 'embed' | 'submissions'>('settings');
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchForms = useCallback(async () => {
    if (!activeSubAccountId) return;
    setIsLoading(true);
    try {
      const data = await api.get<Form[]>(`/forms?subAccountId=${activeSubAccountId}`);
      setForms(data);
    } catch {
      // keep existing state
    } finally {
      setIsLoading(false);
    }
  }, [activeSubAccountId]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const fetchSubmissions = useCallback(async (formId: string) => {
    setSubmissionsLoading(true);
    try {
      const result = await api.get<{ submissions: FormSubmission[]; total: number }>(`/forms/${formId}/submissions?limit=50`);
      setSubmissions(result.submissions);
    } catch {
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  // ── Filtered and computed ───────────────────────────────────────────────────
  const filteredForms = forms.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalForms = forms.length;
  const activeForms = forms.filter(f => f.status === 'active').length;
  const totalSubmissions = forms.reduce((sum, f) => sum + (f.submissionCount || 0), 0);

  // ── CRUD operations ─────────────────────────────────────────────────────────
  const createForm = async () => {
    if (!activeSubAccountId) return;
    try {
      const created = await api.post<Form>('/forms', {
        name: 'Untitled Form',
        subAccountId: activeSubAccountId,
        fields: [
          { id: crypto.randomUUID(), type: 'text', label: 'Full Name', placeholder: 'Enter your name', required: true },
          { id: crypto.randomUUID(), type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
        ],
        settings: { buttonText: 'Submit', successMessage: 'Thank you for your submission!' },
      });
      setForms(prev => [created, ...prev]);
      openEditor(created);
      notify('Form created');
    } catch {
      notify('Failed to create form', 'error');
    }
  };

  const saveForm = async () => {
    if (!editingForm) return;
    setIsSaving(true);
    try {
      const updated = await api.put<Form>(`/forms/${editingForm.id}`, {
        name: editingForm.name,
        fields: editingForm.fields,
        settings: editingForm.settings,
        status: editingForm.status,
        description: editingForm.description,
      });
      setForms(prev => prev.map(f => f.id === updated.id ? updated : f));
      setEditingForm(updated);
      notify('Form saved');
    } catch {
      notify('Failed to save form', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteForm = async (id: string) => {
    try {
      await api.delete(`/forms/${id}`);
      setForms(prev => prev.filter(f => f.id !== id));
      notify('Form deleted');
    } catch {
      notify('Failed to delete form', 'error');
    }
  };

  // ── Editor helpers ──────────────────────────────────────────────────────────
  const openEditor = (form: Form) => {
    setEditingForm({ ...form });
    setSettingsTab('settings');
    setSubmissions([]);
    setShowEditor(true);
  };

  const closeEditor = async () => {
    if (editingForm) {
      await saveForm();
    }
    setShowEditor(false);
    setEditingForm(null);
  };

  const addField = (type: FormField['type'], label?: string) => {
    if (!editingForm) return;
    const newField: FormField = {
      id: crypto.randomUUID(),
      type,
      label: label || `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder: '',
      required: false,
      options: type === 'dropdown' ? ['Option 1', 'Option 2'] : undefined,
    };
    setEditingForm({
      ...editingForm,
      fields: [...editingForm.fields, newField],
    });
  };

  const removeField = (fieldId: string) => {
    if (!editingForm) return;
    setEditingForm({
      ...editingForm,
      fields: editingForm.fields.filter(f => f.id !== fieldId),
    });
  };

  const updateSettings = (patch: Partial<FormSettings>) => {
    if (!editingForm) return;
    setEditingForm({
      ...editingForm,
      settings: { ...editingForm.settings, ...patch },
    });
  };

  const toggleStatus = () => {
    if (!editingForm) return;
    setEditingForm({
      ...editingForm,
      status: editingForm.status === 'active' ? 'draft' : 'active',
    });
  };

  const copyEmbedCode = () => {
    if (!editingForm) return;
    const code = `<iframe src="${window.location.origin}/api/forms/${editingForm.id}/submit" width="100%" height="600" frameborder="0" style="border:none;border-radius:12px;"></iframe>`;
    navigator.clipboard.writeText(code);
    setCopiedEmbed(true);
    notify('Embed code copied');
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  // ── Field type icon lookup ──────────────────────────────────────────────────
  const getFieldIcon = (type: string) => {
    const match = FIELD_TYPES.find(ft => ft.type === type);
    if (match) return match.icon;
    return Type;
  };

  // ── Render: Loading ─────────────────────────────────────────────────────────
  if (isLoading && forms.length === 0) {
    return (
      <div className="h-full flex items-center justify-center pb-20">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-brand animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-400">Loading forms...</p>
        </div>
      </div>
    );
  }

  // ── Render: Form Editor (full-screen overlay) ──────────────────────────────
  if (showEditor && editingForm) {
    return (
      <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-xl flex flex-col">
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0">
          <button
            onClick={closeEditor}
            className="p-2 text-slate-400 hover:text-brand transition-all rounded-lg hover:bg-slate-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="h-8 w-px bg-slate-200" />

          <input
            type="text"
            value={editingForm.name}
            onChange={e => setEditingForm({ ...editingForm, name: e.target.value })}
            className="text-lg font-semibold text-slate-900 bg-transparent outline-none flex-1 min-w-0"
            placeholder="Form name..."
          />

          <button
            onClick={toggleStatus}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              editingForm.status === 'active'
                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <ToggleLeft className="w-4 h-4" />
            {editingForm.status === 'active' ? 'Active' : 'Draft'}
          </button>

          <button
            onClick={saveForm}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-2xl text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Three-column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Field Library */}
          <div className="w-72 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" /> Field Library
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider px-2 mb-2">Standard Fields</p>
              {FIELD_TYPES.map(ft => (
                <button
                  key={ft.type}
                  onClick={() => addField(ft.type)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-brand hover:bg-white transition-all group text-left"
                >
                  <ft.icon className={`w-4 h-4 ${ft.color}`} />
                  <span className="text-xs font-semibold text-slate-500 group-hover:text-brand">{ft.label}</span>
                </button>
              ))}

              {fieldDefinitions.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider px-2 mt-6 mb-2">Custom Fields</p>
                  {fieldDefinitions.map(fd => (
                    <button
                      key={fd.id}
                      onClick={() => addField(fd.type as FormField['type'], fd.label)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-brand hover:bg-white transition-all group text-left"
                    >
                      <Hash className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-semibold text-slate-500 group-hover:text-brand truncate">{fd.label}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Center: Live Form Preview */}
          <div className="flex-1 bg-slate-100 overflow-y-auto p-8">
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-brand h-2 w-full" />
                <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-semibold text-slate-900">{editingForm.name}</h2>
                    {editingForm.description && (
                      <p className="text-slate-400 text-xs font-medium">{editingForm.description}</p>
                    )}
                  </div>

                  {editingForm.fields.length === 0 && (
                    <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl">
                      <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-xs font-medium text-slate-300">No fields yet. Add fields from the library.</p>
                    </div>
                  )}

                  <div className="space-y-5">
                    {editingForm.fields.map(field => {
                      const FieldIcon = getFieldIcon(field.type);
                      return (
                        <div key={field.id} className="relative group animate-in fade-in duration-300">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FieldIcon className="w-3.5 h-3.5 text-slate-300" />
                              <label className="text-xs font-semibold text-slate-500">{field.label}</label>
                              {field.required && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-500">Required</span>
                              )}
                            </div>
                            <button
                              onClick={() => removeField(field.id)}
                              className="p-1.5 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {field.type === 'textarea' ? (
                            <div className="h-24 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-300 text-xs font-medium italic select-none">
                              {field.placeholder || 'Enter text...'}
                            </div>
                          ) : field.type === 'dropdown' ? (
                            <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between px-4 text-slate-300 text-xs font-medium italic select-none">
                              <span>{field.placeholder || 'Select an option...'}</span>
                              <ChevronDown className="w-4 h-4 text-slate-300" />
                            </div>
                          ) : field.type === 'checkbox' ? (
                            <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3 px-4 text-slate-300 text-xs font-medium select-none">
                              <div className="w-5 h-5 border-2 border-slate-200 rounded-md" />
                              <span className="italic">{field.label}</span>
                            </div>
                          ) : (
                            <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center px-4 text-slate-300 text-xs font-medium italic select-none">
                              {field.placeholder || 'Enter value...'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {editingForm.fields.length > 0 && (
                    <button className="w-full py-4 bg-brand text-white rounded-xl text-sm font-semibold shadow-sm mt-4">
                      {editingForm.settings.buttonText || 'Submit'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Settings Panel */}
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              {([
                { key: 'settings' as const, label: 'Settings', icon: Settings },
                { key: 'embed' as const, label: 'Embed', icon: Code2 },
                { key: 'submissions' as const, label: 'Submissions', icon: ClipboardList },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setSettingsTab(tab.key);
                    if (tab.key === 'submissions' && editingForm) {
                      fetchSubmissions(editingForm.id);
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-4 text-xs font-semibold transition-all border-b-2 ${
                    settingsTab === tab.key
                      ? 'text-brand border-brand'
                      : 'text-slate-400 border-transparent hover:text-slate-600'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {settingsTab === 'settings' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 ml-1">Form Name</label>
                    <input
                      type="text"
                      value={editingForm.name}
                      onChange={e => setEditingForm({ ...editingForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 ml-1">Description</label>
                    <textarea
                      value={editingForm.description || ''}
                      onChange={e => setEditingForm({ ...editingForm, description: e.target.value })}
                      rows={3}
                      placeholder="Optional form description..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 ml-1">Button Text</label>
                    <input
                      type="text"
                      value={editingForm.settings.buttonText || ''}
                      onChange={e => updateSettings({ buttonText: e.target.value })}
                      placeholder="Submit"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 ml-1">Success Message</label>
                    <input
                      type="text"
                      value={editingForm.settings.successMessage || ''}
                      onChange={e => updateSettings({ successMessage: e.target.value })}
                      placeholder="Thank you for your submission!"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 ml-1">Workflow</label>
                    <select
                      value={editingForm.settings.workflowId || ''}
                      onChange={e => updateSettings({ workflowId: e.target.value || undefined })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all appearance-none"
                    >
                      <option value="">No workflow</option>
                      {workflows.map(wf => (
                        <option key={wf.id} value={wf.id}>{wf.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 ml-1">Redirect URL</label>
                    <input
                      type="text"
                      value={editingForm.settings.redirectUrl || ''}
                      onChange={e => updateSettings({ redirectUrl: e.target.value || undefined })}
                      placeholder="https://..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>
                </>
              )}

              {settingsTab === 'embed' && (
                <>
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-400 ml-1">Embed Code</label>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      Copy and paste this code into your website to embed this form.
                    </p>
                    <div className="relative">
                      <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
{`<iframe
  src="${window.location.origin}/api/forms/${editingForm.id}/submit"
  width="100%"
  height="600"
  frameborder="0"
  style="border:none;border-radius:12px;">
</iframe>`}
                      </pre>
                      <button
                        onClick={copyEmbedCode}
                        className={`absolute top-3 right-3 p-2 rounded-lg text-xs font-semibold transition-all ${
                          copiedEmbed
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                        }`}
                      >
                        {copiedEmbed ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-[11px] text-indigo-600 font-medium leading-relaxed">
                      Make sure the form status is set to <strong>Active</strong> before sharing the embed code with visitors.
                    </p>
                  </div>
                </>
              )}

              {settingsTab === 'submissions' && (
                <>
                  {submissionsLoading ? (
                    <div className="py-12 text-center">
                      <Loader2 className="w-6 h-6 text-brand animate-spin mx-auto" />
                      <p className="text-xs text-slate-400 mt-3">Loading submissions...</p>
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="py-12 text-center">
                      <ClipboardList className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                      <p className="text-xs font-medium text-slate-300">No submissions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {submissions.map(sub => {
                        const contactName = sub.data?.name || sub.data?.Name || sub.data?.email || sub.data?.Email || 'Anonymous';
                        const dataKeys = Object.keys(sub.data || {}).slice(0, 3);
                        return (
                          <div key={sub.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-700 truncate">{contactName}</span>
                              <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                {new Date(sub.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {dataKeys.map(key => (
                                <p key={key} className="text-[10px] text-slate-400 truncate">
                                  <span className="font-semibold text-slate-500">{key}:</span> {sub.data[key]}
                                </p>
                              ))}
                              {Object.keys(sub.data || {}).length > 3 && (
                                <p className="text-[10px] text-slate-300 italic">
                                  +{Object.keys(sub.data).length - 3} more fields
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Form List ───────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-700 pb-20">
      <NexusHeader title="Form Builder" subtitle="Build custom forms to capture leads and collect data from your website">
        <button
          onClick={createForm}
          className="px-10 py-4 bg-brand text-white rounded-2xl text-xs font-semibold shadow-xl shadow-brand/20 transition-all flex items-center gap-3 hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5" /> New Form
        </button>
      </NexusHeader>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Forms', value: totalForms.toLocaleString(), icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Active Forms', value: activeForms.toLocaleString(), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Total Submissions', value: totalSubmissions.toLocaleString(), icon: ClipboardList, color: 'text-brand', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-brand/20 transition-all">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-sm`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">{stat.label}</p>
              <p className="text-xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input
            type="text"
            placeholder="Search forms..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-8 focus:ring-brand/5 focus:border-brand transition-all"
          />
        </div>
      </div>

      {/* Form Grid */}
      {filteredForms.length === 0 && !isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="w-10 h-10 text-slate-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400">
                {searchQuery ? 'No forms match your search' : 'No forms yet'}
              </p>
              <p className="text-xs text-slate-300 mt-1">
                {searchQuery ? 'Try a different search term' : 'Create your first form to start capturing leads'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={createForm}
                className="px-6 py-3 bg-brand text-white rounded-2xl text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Form
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map(form => (
            <div
              key={form.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-brand/30 transition-all group flex flex-col"
            >
              {/* Card Header */}
              <div className="p-6 space-y-4 flex-1">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-lg font-semibold text-slate-900 truncate">{form.name}</h4>
                    <p className="text-xs font-medium text-slate-400 mt-1">
                      {new Date(form.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[form.status] || STATUS_STYLES.draft}`}>
                    {form.status}
                  </span>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{form.submissionCount || 0} submissions</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{(form.fields || []).length} fields</span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={() => openEditor(form)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold hover:bg-brand hover:text-white transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => deleteForm(form.id)}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-50 text-slate-400 rounded-xl text-xs font-semibold hover:bg-rose-50 hover:text-rose-500 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormBuilder;

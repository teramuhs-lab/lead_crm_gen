
import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Plus, Search, Edit3, Send, Eye, Target, Users, Zap, Mail, X, Loader2, Trash2, CheckCircle2, Clock, MoreVertical } from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { EmailTemplate, EmailBlock } from '../types';
import { api } from '../lib/api';
import { NexusHeader } from './NexusUI';

const EmailTemplates: React.FC = () => {
  const { activeSubAccountId, smartLists, notify } = useNexus();

  // State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedList, setSelectedList] = useState<string>('all');
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<EmailTemplate[]>(`/templates?subAccountId=${activeSubAccountId}`);
      setTemplates(data);
    } catch {
      // keep existing state
    }
  }, [activeSubAccountId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Filtered templates
  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalTemplates = templates.length;
  const totalSent = templates.reduce((acc, t) => acc + (t.stats?.sent || 0), 0);

  // Open create modal
  const openCreateModal = () => {
    setEditingTemplate({
      name: '',
      subject: '',
      blocks: [],
    });
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (template: EmailTemplate) => {
    setEditingTemplate({ ...template });
    setShowCreateModal(true);
  };

  // Close create/edit modal
  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingTemplate(null);
  };

  // Add block
  const addBlock = (type: EmailBlock['type']) => {
    if (!editingTemplate) return;
    const newBlock: EmailBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
    };
    setEditingTemplate({
      ...editingTemplate,
      blocks: [...(editingTemplate.blocks || []), newBlock],
    });
  };

  // Update block content
  const updateBlockContent = (blockId: string, content: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      blocks: (editingTemplate.blocks || []).map((b) =>
        b.id === blockId ? { ...b, content } : b
      ),
    });
  };

  // Delete block
  const deleteBlock = (blockId: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      blocks: (editingTemplate.blocks || []).filter((b) => b.id !== blockId),
    });
  };

  // Save template (create or update)
  const saveTemplate = async () => {
    if (!editingTemplate || !activeSubAccountId) return;
    setIsSaving(true);
    try {
      if (editingTemplate.id) {
        // Update
        const updated = await api.put<EmailTemplate>(`/templates/${editingTemplate.id}`, {
          name: editingTemplate.name,
          subject: editingTemplate.subject,
          blocks: editingTemplate.blocks,
        });
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        notify('Template updated successfully', 'success');
      } else {
        // Create
        const created = await api.post<EmailTemplate>('/templates', {
          name: editingTemplate.name,
          subject: editingTemplate.subject,
          blocks: editingTemplate.blocks,
          subAccountId: activeSubAccountId,
        });
        setTemplates((prev) => [created, ...prev]);
        notify('Template created successfully', 'success');
      }
      closeCreateModal();
    } catch {
      notify('Failed to save template', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete template
  const deleteTemplate = async (id: string) => {
    try {
      await api.delete(`/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      notify('Template deleted', 'success');
    } catch {
      notify('Failed to delete template', 'error');
    }
  };

  // Open send modal
  const openSendModal = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setSelectedList('all');
    setShowLaunchModal(true);
  };

  // Send campaign
  const sendCampaign = async () => {
    if (!selectedTemplate || !activeSubAccountId) return;
    setIsSending(true);
    try {
      const result = await api.post<{ sent: number }>(`/templates/${selectedTemplate.id}/send`, {
        subAccountId: activeSubAccountId,
        smartListId: selectedList !== 'all' ? selectedList : undefined,
      });
      notify(`Campaign sent to ${result.sent} contacts.`, 'success');
      setShowLaunchModal(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch {
      notify('Failed to send campaign', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-700 pb-20">
      <NexusHeader title="Email Templates" subtitle="Design and manage reusable email templates for campaigns and automations">
          <button
            onClick={openCreateModal}
            className="px-10 py-4 bg-brand text-white rounded-2xl text-xs font-semibold shadow-xl shadow-brand/20 transition-all flex items-center gap-3"
          >
            <Plus className="w-5 h-5" /> New Template
          </button>
      </NexusHeader>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Templates', value: totalTemplates.toLocaleString(), icon: Layout, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Total Sent', value: totalSent.toLocaleString(), icon: Send, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Avg Open Rate', value: '\u2014', icon: Eye, color: 'text-brand', bg: 'bg-indigo-50' },
          { label: 'Engagement', value: '\u2014', icon: Target, color: 'text-rose-500', bg: 'bg-rose-50' },
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
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-8 focus:ring-brand/5 focus:border-brand transition-all"
          />
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((tmp) => (
          <div key={tmp.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-brand transition-all group flex flex-col relative border-b-8 border-brand/5">
            {/* Preview Area */}
            <div className="h-56 bg-slate-50 relative flex items-center justify-center p-10 overflow-hidden border-b border-slate-100">
              <div className="w-full h-full bg-white border-2 border-slate-200 rounded-2xl shadow-xl flex flex-col p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-2.5 bg-slate-100 rounded-full"></div>
                  <div className="w-6 h-2.5 bg-slate-100 rounded-full opacity-50"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-4 bg-slate-50 rounded-lg"></div>
                  <div className="w-full h-4 bg-slate-50 rounded-lg opacity-60"></div>
                  <div className="w-2/3 h-4 bg-slate-50 rounded-lg opacity-40"></div>
                </div>
                <div className="mt-auto flex justify-center">
                  <div className="w-24 h-8 bg-brand/10 border border-brand/20 rounded-xl"></div>
                </div>
              </div>
              <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
                <div className="flex gap-4">
                  <button
                    onClick={() => openEditModal(tmp)}
                    className="p-4 bg-brand text-white rounded-xl shadow-md"
                  >
                    <Edit3 className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(tmp.id)}
                    className="p-4 bg-white text-rose-500 rounded-xl shadow-md"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
                <button
                  onClick={() => openSendModal(tmp)}
                  className="px-8 py-3.5 bg-white text-slate-900 rounded-xl text-xs font-semibold hover:bg-brand hover:text-white transition-all shadow-md"
                >
                  Send Campaign
                </button>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-8 space-y-8 flex-1 flex flex-col">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <h4 className="text-xl font-semibold text-slate-900 truncate">{tmp.name}</h4>
                  <p className="text-xs font-medium text-slate-400 mt-2 truncate">{tmp.subject}</p>
                  <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> {new Date(tmp.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button className="p-3 bg-slate-50 text-slate-300 hover:text-brand rounded-2xl transition-all">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group-hover:border-brand/20 transition-all">
                  <p className="text-xs font-medium text-slate-400 mb-1">Sent</p>
                  <p className="text-lg font-semibold text-slate-900">{tmp.stats?.sent || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group-hover:border-brand/20 transition-all">
                  <p className="text-xs font-medium text-slate-400 mb-1">Opened</p>
                  <p className="text-lg font-semibold text-slate-900">{tmp.stats?.opened || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group-hover:border-brand/20 transition-all">
                  <p className="text-xs font-medium text-slate-400 mb-1">Clicked</p>
                  <p className="text-lg font-semibold text-slate-900">{tmp.stats?.clicked || 0}</p>
                </div>
              </div>

              {/* Send Campaign Button */}
              <button
                onClick={() => openSendModal(tmp)}
                className="w-full mt-auto py-5 border-2 border-slate-200 text-slate-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-3 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all group/btn"
              >
                Send Campaign <Send className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
              </button>
            </div>
          </div>
        ))}

        {/* New Template Card */}
        <button
          onClick={openCreateModal}
          className="border-4 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-300 hover:text-brand hover:border-brand hover:bg-white transition-all group space-y-6 shadow-inner"
        >
          <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
            <Mail className="w-10 h-10" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">New Template</p>
            <p className="text-xs font-medium mt-2 opacity-50">Create a new email campaign</p>
          </div>
        </button>
      </div>

      {/* Create / Edit Modal */}
      {showCreateModal && editingTemplate && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-4xl font-semibold text-slate-900">
                    {editingTemplate.id ? 'Edit Template' : 'New Template'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-3">
                    {editingTemplate.id ? 'Update your email template' : 'Create a new email template'}
                  </p>
                </div>
                <button onClick={closeCreateModal} className="p-4 bg-slate-50 rounded-xl text-slate-300 hover:text-rose-500 transition-all">
                  <X className="w-8 h-8" />
                </button>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 ml-1">Template Name</label>
                <input
                  type="text"
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="e.g. Monthly Newsletter"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-8 focus:ring-brand/5 focus:border-brand transition-all"
                />
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 ml-1">Subject Line</label>
                <input
                  type="text"
                  value={editingTemplate.subject || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="e.g. Your weekly update is here"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-8 focus:ring-brand/5 focus:border-brand transition-all"
                />
              </div>

              {/* Blocks */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 ml-1">Content Blocks</label>
                  <div className="flex gap-2">
                    {(['header', 'text', 'image', 'button', 'divider'] as EmailBlock['type'][]).map((type) => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-500 hover:border-brand hover:text-brand transition-all capitalize"
                      >
                        + {type}
                      </button>
                    ))}
                  </div>
                </div>

                {(editingTemplate.blocks || []).length === 0 && (
                  <div className="py-12 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
                    <Layout className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p className="text-xs font-medium">No blocks yet. Add one above.</p>
                  </div>
                )}

                {(editingTemplate.blocks || []).map((block, idx) => (
                  <div key={block.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 capitalize bg-white px-3 py-1 rounded-lg border border-slate-100">
                        {block.type}
                      </span>
                      <button
                        onClick={() => deleteBlock(block.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={block.content}
                      onChange={(e) => updateBlockContent(block.id, e.target.value)}
                      placeholder={`Enter ${block.type} content...`}
                      rows={block.type === 'divider' ? 1 : 3}
                      className="w-full px-4 py-3 bg-white border border-slate-100 rounded-lg text-xs font-medium outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-slate-100 flex gap-6">
              <button
                onClick={closeCreateModal}
                className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-xl font-semibold text-xs hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={isSaving || !editingTemplate.name}
                className="flex-1 py-5 bg-brand text-white rounded-xl font-semibold text-xs shadow-md shadow-brand/40 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {isSaving ? 'Saving...' : editingTemplate.id ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Send Modal */}
      {showLaunchModal && selectedTemplate && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-8 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-4xl font-semibold text-slate-900">Send Campaign</h3>
                  <p className="text-xs text-slate-400 font-medium mt-3">
                    Sending: <span className="text-slate-600">{selectedTemplate.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => { setShowLaunchModal(false); setSelectedTemplate(null); }}
                  className="p-4 bg-slate-50 rounded-xl text-slate-300 hover:text-rose-500 transition-all"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              {/* Audience */}
              <div className="space-y-4">
                <label className="text-xs font-semibold text-slate-400 ml-4">Audience</label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setSelectedList('all')}
                    className={`flex items-center justify-between p-6 rounded-xl border-2 transition-all ${selectedList === 'all' ? 'bg-indigo-50 border-brand' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-4">
                      <Users className={`w-6 h-6 ${selectedList === 'all' ? 'text-brand' : 'text-slate-300'}`} />
                      <span className={`text-sm font-semibold ${selectedList === 'all' ? 'text-brand' : 'text-slate-700'}`}>All Contacts</span>
                    </div>
                    {selectedList === 'all' && <CheckCircle2 className="w-6 h-6 text-brand" />}
                  </button>
                  {smartLists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => setSelectedList(list.id)}
                      className={`flex items-center justify-between p-6 rounded-xl border-2 transition-all ${selectedList === list.id ? 'bg-indigo-50 border-brand' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center gap-4">
                        <Target className={`w-6 h-6 ${selectedList === list.id ? 'text-brand' : 'text-slate-300'}`} />
                        <span className={`text-sm font-semibold ${selectedList === list.id ? 'text-brand' : 'text-slate-700'}`}>{list.name}</span>
                      </div>
                      {selectedList === list.id && <CheckCircle2 className="w-6 h-6 text-brand" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-6">
                <button
                  onClick={() => { setShowLaunchModal(false); setSelectedTemplate(null); }}
                  className="flex-1 py-7 bg-slate-100 text-slate-400 rounded-xl font-semibold text-xs hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={sendCampaign}
                  disabled={isSending}
                  className="flex-1 py-7 bg-brand text-white rounded-xl font-semibold text-xs shadow-md shadow-brand/40 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {isSending ? 'Sending...' : 'Send Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;

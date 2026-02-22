
import React, { useState, useMemo, useRef } from 'react';
import {
  Plus, Search, Database, Zap, Tag as TagIcon, Upload,
  RefreshCcw, Archive, FileDown, ChevronRight, ChevronLeft, AlertTriangle,
  Sparkles, Loader2, CheckCircle2, Columns3,
  LayoutGrid, List, Globe, Phone, MapPin, Mail, Users, TrendingUp,
  Clock, Star
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { api } from '../lib/api';
import { useAIQueue } from '../context/AIActionQueueContext';
import { Contact, AIContactInsight } from '../types';
import { NexusCard, NexusButton, NexusBadge, NexusInput, NexusModal, NexusHeader } from './NexusUI';
import KanbanBoard from './KanbanBoard';

interface ContactManagerProps {
  onContactClick?: (id: string) => void;
}

const ContactManager: React.FC<ContactManagerProps> = ({ onContactClick }) => {
  const { contacts, messages, smartLists, bulkAddTag, bulkChangeStatus, deleteContacts, restoreContacts, addContact, notify, activeSubAccount } = useNexus();
  const { addProposal } = useAIQueue();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSegmentId, setActiveSegmentId] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [insightContactId, setInsightContactId] = useState<string | null>(null);
  const [insight, setInsight] = useState<AIContactInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newLead, setNewLead] = useState({ name: '', email: '' });

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const isCorrectView = showTrash ? c.isArchived : !c.isArchived;
      if (!isCorrectView) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const cf = (c.customFields || {}) as Record<string, any>;
        const matchesSearch = c.name.toLowerCase().includes(q) ||
                            c.email.toLowerCase().includes(q) ||
                            (c.phone || '').toLowerCase().includes(q) ||
                            (c.source || '').toLowerCase().includes(q) ||
                            String(cf.industry || '').toLowerCase().includes(q) ||
                            String(cf.website || '').toLowerCase().includes(q) ||
                            String(cf.city || '').toLowerCase().includes(q) ||
                            String(cf.owner_name || '').toLowerCase().includes(q) ||
                            c.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      if (scoreFilter === 'high' && c.leadScore < 60) return false;
      if (scoreFilter === 'medium' && (c.leadScore < 40 || c.leadScore >= 60)) return false;
      if (scoreFilter === 'low' && c.leadScore >= 40) return false;

      if (sourceFilter !== 'all' && (c.source || '') !== sourceFilter) return false;

      if (activeSegmentId !== 'all') {
        const list = smartLists.find(l => l.id === activeSegmentId);
        if (list) {
          return list.conditions.every(cond => {
            const val = c[cond.field as keyof Contact];
            if (cond.operator === 'gt') return Number(val) > Number(cond.value);
            if (cond.operator === 'lt') return Number(val) < Number(cond.value);
            if (cond.operator === 'eq') return val === cond.value;
            if (cond.operator === 'contains') return String(val).toLowerCase().includes(String(cond.value).toLowerCase());
            if (cond.operator === 'exists') return !!val;
            return true;
          });
        }
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [contacts, searchTerm, activeSegmentId, smartLists, showTrash, statusFilter, scoreFilter, sourceFilter]);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    contacts.filter(c => !c.isArchived && c.source).forEach(c => sources.add(c.source!));
    return Array.from(sources).sort();
  }, [contacts]);

  const totalPages = Math.ceil(filteredContacts.length / pageSize);
  const paginatedContacts = useMemo(() => {
    return filteredContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  const stats = useMemo(() => {
    const total = filteredContacts.length;
    const withEmail = filteredContacts.filter(c => c.email && c.email.trim() !== '').length;
    const withPhone = filteredContacts.filter(c => c.phone && c.phone.trim() !== '').length;
    const avgScore = total > 0
      ? Math.round(filteredContacts.reduce((sum, c) => sum + c.leadScore, 0) / total)
      : 0;
    const enrichedCount = filteredContacts.filter(c =>
      c.customFields?.enriched_at || c.customFields?.enrichment_source
    ).length;
    const statusCounts = filteredContacts.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { total, withEmail, withPhone, avgScore, enrichedCount, statusCounts };
  }, [filteredContacts]);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      const headers = "Name,Email,Phone,Status,Score,Source,Tags,Created\n";
      const rows = filteredContacts.map(c => `"${c.name}","${c.email}","${c.phone}","${c.status}",${c.leadScore},"${c.source}","${c.tags.join(';')}",${c.createdAt}`).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `nexus_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      setIsExporting(false);
      notify("Contacts exported successfully.");
    }, 1200);
  };

  const handleBulkAction = (action: 'delete' | 'restore' | 'add_tag' | 'change_status', value?: string) => {
    if (action === 'delete') deleteContacts(selectedIds, showTrash);
    else if (action === 'restore') restoreContacts(selectedIds);
    else if (action === 'add_tag' && value) bulkAddTag(selectedIds, value);
    else if (action === 'change_status' && value) bulkChangeStatus(selectedIds, value as any);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length && filteredContacts.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredContacts.map(c => c.id)));
  };

  const handleGetInsight = async (contact: Contact) => {
    setInsightContactId(contact.id);
    setInsight(null);
    setInsightLoading(true);
    try {
      const result = await api.post<AIContactInsight>('/ai/contact-insight', {
        contactId: contact.id,
        subAccountId: activeSubAccount?.id,
        contact: {
          name: contact.name, email: contact.email, status: contact.status,
          leadScore: contact.leadScore, source: contact.source, tags: contact.tags,
          createdAt: contact.createdAt, lastActivity: contact.lastActivity,
        },
        activities: contact.activities.slice(0, 10),
        messages: messages.filter(m => m.contactId === contact.id).slice(0, 10).map(m => ({
          channel: m.channel, direction: m.direction, content: m.content, timestamp: m.timestamp,
        })),
      });
      setInsight(result);
    } catch {
      notify('Failed to get AI insights', 'error');
      setInsightContactId(null);
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-full flex flex-col pb-20 animate-in fade-in duration-500">

      <NexusHeader title={showTrash ? 'Archived Contacts' : 'Contacts'} subtitle="View, search, and manage all your contacts, leads, and customers in one place">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setShowTrash(false); setActiveSegmentId('all'); setCurrentPage(1); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${!showTrash ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Users className="w-3.5 h-3.5" /> Active
            </button>
            <button
              onClick={() => { setShowTrash(true); setActiveSegmentId('all'); setCurrentPage(1); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${showTrash ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Archive className="w-3.5 h-3.5" /> Archived
            </button>
          </div>
          <NexusButton onClick={() => setShowAddModal(true)} icon={Plus}>Add Contact</NexusButton>
      </NexusHeader>

      {/* ── Kanban View ── */}
      {viewMode === 'kanban' && !showTrash ? (
        <>
          {/* Minimal toolbar with view toggle for Kanban */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" /> Pipeline View
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {filteredContacts.length} contacts
              </span>
            </h3>
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => { setViewMode('grid'); setExpandedRow(null); }} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Grid view">
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setViewMode('list'); setExpandedRow(null); }} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="List view">
                <List className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Pipeline view">
                <Columns3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <KanbanBoard onContactClick={onContactClick} />
        </>
      ) : (
        <>
          {/* ── Title + Search Bar ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 shrink-0">
              <Database className="w-4 h-4 text-indigo-500" />
              {showTrash ? 'Archived' : 'All Contacts'}
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {filteredContacts.length} found
              </span>
            </h3>
            <div className="flex items-center gap-2">
              {!showTrash && (
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button onClick={() => { setViewMode('grid'); setExpandedRow(null); }} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Grid view">
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setViewMode('list'); setExpandedRow(null); }} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="List view">
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Pipeline view">
                    <Columns3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {filteredContacts.length > pageSize && (
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="text-[11px] font-bold text-slate-600 bg-slate-100 border-0 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                >
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-brand rounded-lg hover:bg-slate-50 transition-all" title="Import">
                <Upload className="w-4 h-4" />
              </button>
              <button onClick={handleExport} disabled={isExporting} className="p-2 text-slate-400 hover:text-brand rounded-lg hover:bg-slate-50 transition-all" title="Export CSV">
                {isExporting ? <RefreshCcw className="w-4 h-4 animate-spin text-brand" /> : <FileDown className="w-4 h-4" />}
              </button>
              <NexusInput
                placeholder="Search contacts..."
                icon={Search}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-48 md:w-64"
              />
            </div>
          </div>

          {/* ── Filter Bar ── */}
          {!showTrash && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Filter</span>

              {/* Status pills */}
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                {['all', 'Lead', 'Interested', 'Appointment', 'Closed'].map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                      statusFilter === s
                        ? 'bg-white shadow-sm text-slate-900'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {s === 'all' ? 'All Status' : s}
                  </button>
                ))}
              </div>

              <span className="w-px h-5 bg-slate-200" />

              {/* Score filter */}
              <select
                value={scoreFilter}
                onChange={(e) => { setScoreFilter(e.target.value); setCurrentPage(1); }}
                className={`text-xs font-bold border rounded-lg px-3 py-1.5 outline-none cursor-pointer transition-all ${
                  scoreFilter !== 'all' ? 'bg-indigo-50 text-brand border-indigo-200' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <option value="all">Any Score</option>
                <option value="high">High (60+)</option>
                <option value="medium">Medium (40-59)</option>
                <option value="low">Low (&lt;40)</option>
              </select>

              {/* Source filter */}
              {uniqueSources.length > 1 && (
                <select
                  value={sourceFilter}
                  onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
                  className={`text-xs font-bold border rounded-lg px-3 py-1.5 outline-none cursor-pointer transition-all ${
                    sourceFilter !== 'all' ? 'bg-indigo-50 text-brand border-indigo-200' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <option value="all">Any Source</option>
                  {uniqueSources.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}

              {/* Clear filters */}
              {(statusFilter !== 'all' || scoreFilter !== 'all' || sourceFilter !== 'all') && (
                <button
                  onClick={() => { setStatusFilter('all'); setScoreFilter('all'); setSourceFilter('all'); setCurrentPage(1); }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-all ml-auto"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* ── Grid View ── */}
          {viewMode === 'grid' && (
            <>
              {paginatedContacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                  {paginatedContacts.map((contact, idx) => {
                    const globalIdx = (currentPage - 1) * pageSize + idx;
                    const cf = contact.customFields || {};
                    const isSelected = selectedIds.has(contact.id);
                    const website = (cf.website as string) || '';
                    const industry = (cf.industry as string) || '';
                    const hasEnrichment = !!(cf.enriched_at || cf.enrichment_source);

                    return (
                      <div
                        key={contact.id}
                        className={`bg-white rounded-2xl border shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group overflow-hidden cursor-pointer ${
                          isSelected ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'
                        }`}
                        onClick={() => !showTrash && onContactClick?.(contact.id)}
                      >
                        <div className="p-4 pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2.5 mb-1">
                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                                  {globalIdx + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-bold text-slate-900 truncate">{contact.name}</h4>
                                  {contact.email && (
                                    <p className="text-[11px] text-slate-400 truncate">{contact.email}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <div onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const next = new Set(selectedIds);
                                    if (next.has(contact.id)) next.delete(contact.id); else next.add(contact.id);
                                    setSelectedIds(next);
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                                />
                              </div>
                              {!showTrash && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleGetInsight(contact); }}
                                  className="p-1.5 text-slate-400 hover:text-brand hover:bg-indigo-50 rounded-xl transition-all"
                                  title="AI Insights"
                                >
                                  <Sparkles className="w-4 h-4" />
                                </button>
                              )}
                              {showTrash && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); restoreContacts(new Set([contact.id])); }}
                                  className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                  title="Restore"
                                >
                                  <RefreshCcw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="px-4 pb-4 space-y-2.5">
                          {/* Score + Status */}
                          <div className="ml-[42px] flex items-center gap-2 flex-wrap">
                            <NexusBadge variant={contact.leadScore > 80 ? 'rose' : contact.leadScore > 40 ? 'brand' : 'slate'}>
                              Score: {contact.leadScore}
                            </NexusBadge>
                            <NexusBadge variant={contact.status === 'Closed' ? 'emerald' : contact.status === 'Appointment' ? 'amber' : 'brand'}>
                              {contact.status}
                            </NexusBadge>
                            {cf.google_rating && (
                              <span className="flex items-center gap-0.5 text-[11px]">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="font-bold text-slate-700">{cf.google_rating as string}</span>
                              </span>
                            )}
                          </div>

                          {/* Contact info */}
                          <div className="ml-[42px] space-y-1.5">
                            {contact.phone && (
                              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                                <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                            {website && (
                              <a
                                href={website.startsWith('http') ? website : `https://${website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-[11px] text-indigo-500 hover:text-indigo-700 group/link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Globe className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                                <span className="truncate group-hover/link:underline">
                                  {website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/?\?.*$/, '').replace(/\/$/, '')}
                                </span>
                              </a>
                            )}
                            {contact.source && contact.source !== 'Direct' && (
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate">{contact.source}</span>
                              </div>
                            )}
                          </div>

                          {/* Industry pill */}
                          {industry && (
                            <div className="ml-[42px]">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                {industry}
                              </span>
                            </div>
                          )}

                          {/* Tags */}
                          {contact.tags.length > 0 && (
                            <div className="ml-[42px] flex flex-wrap gap-1.5">
                              {contact.tags.slice(0, 4).map((tag, i) => (
                                <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                  {tag}
                                </span>
                              ))}
                              {contact.tags.length > 4 && (
                                <span className="text-[9px] text-slate-400">+{contact.tags.length - 4}</span>
                              )}
                            </div>
                          )}

                          {/* Data presence micro-badges */}
                          <div className="ml-[42px] flex flex-wrap gap-1.5 pt-1">
                            {hasEnrichment && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Enriched</span>}
                            {(contact.email) && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Email</span>}
                            {contact.phone && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Phone</span>}
                            {website && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Website</span>}
                            {!hasEnrichment && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-400 border border-red-100">Not Enriched</span>}
                            {contact.lastActivity && (
                              <span className="text-[9px] text-slate-400 flex items-center gap-0.5 ml-auto">
                                <Clock className="w-2.5 h-2.5" />
                                {contact.lastActivity}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center opacity-60 select-none space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <Database className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">{showTrash ? 'No archived contacts' : 'No contacts found'}</p>
                    <p className="text-xs mt-1 text-slate-400">Try adjusting your search or filters.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── List View ── */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto animate-in fade-in">
              {/* Table header */}
              <div className="grid grid-cols-[36px_1.5fr_1.2fr_56px_80px_120px_44px] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredContacts.length}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                  />
                </span>
                <span>Contact</span>
                <span>Email</span>
                <span>Score</span>
                <span>Status</span>
                <span>Phone</span>
                <span></span>
              </div>

              {/* Table rows */}
              {paginatedContacts.length > 0 ? (
                paginatedContacts.map((contact, idx) => {
                  const isExpanded = expandedRow === contact.id;
                  const isSelected = selectedIds.has(contact.id);
                  const cf = contact.customFields || {};

                  return (
                    <div key={contact.id} className={`border-b border-slate-100 last:border-b-0 transition-all ${isExpanded ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'} ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                      {/* Compact row */}
                      <div
                        className="grid grid-cols-[36px_1.5fr_1.2fr_56px_80px_120px_44px] gap-2 px-4 py-2.5 items-center cursor-pointer"
                        onClick={() => setExpandedRow(isExpanded ? null : contact.id)}
                      >
                        <span className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const next = new Set(selectedIds);
                              if (next.has(contact.id)) next.delete(contact.id); else next.add(contact.id);
                              setSelectedIds(next);
                            }}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                          />
                        </span>
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-semibold text-brand shrink-0">
                            {contact.name.charAt(0)}
                          </div>
                          <p className="text-xs font-bold text-slate-900 truncate min-w-0">{contact.name}</p>
                        </div>
                        <span className="text-[11px] text-slate-500 truncate">{contact.email || '--'}</span>
                        <span>
                          <NexusBadge variant={contact.leadScore > 80 ? 'rose' : contact.leadScore > 40 ? 'brand' : 'slate'}>
                            {contact.leadScore}
                          </NexusBadge>
                        </span>
                        <span>
                          <NexusBadge variant={contact.status === 'Closed' ? 'emerald' : contact.status === 'Appointment' ? 'amber' : 'brand'}>
                            {contact.status}
                          </NexusBadge>
                        </span>
                        <span className="text-[11px] text-slate-600 truncate">{contact.phone || '--'}</span>
                        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                          {!showTrash ? (
                            <>
                              <button
                                onClick={() => handleGetInsight(contact)}
                                className="p-1 text-slate-400 hover:text-brand rounded-lg transition-all"
                                title="AI Insights"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onContactClick?.(contact.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                                title="View detail"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => restoreContacts(new Set([contact.id]))}
                              className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Restore"
                            >
                              <RefreshCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded detail panel */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 ml-[72px] space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="flex items-center gap-3 flex-wrap">
                            {cf.website && (
                              <a href={String(cf.website).startsWith('http') ? String(cf.website) : `https://${cf.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-indigo-500 hover:text-indigo-700">
                                <Globe className="w-3.5 h-3.5" />
                                <span className="hover:underline">{String(cf.website).replace(/^https?:\/\/(www\.)?/, '').replace(/\/?\?.*$/, '').replace(/\/$/, '')}</span>
                              </a>
                            )}
                            {contact.phone && (
                              <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                <Phone className="w-3.5 h-3.5 text-slate-400" /> {contact.phone}
                              </a>
                            )}
                            {cf.address && (
                              <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {String(cf.address)}
                              </span>
                            )}
                            {contact.source && (
                              <span className="flex items-center gap-1.5 text-[11px] text-indigo-500">
                                <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {contact.source}
                              </span>
                            )}
                            {cf.google_rating && (
                              <span className="flex items-center gap-0.5 text-[11px]">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="font-bold text-slate-700">{String(cf.google_rating)}</span>
                              </span>
                            )}
                          </div>

                          {/* Tags */}
                          {contact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {contact.tags.map((tag, i) => (
                                <NexusBadge key={i} variant="slate">{tag}</NexusBadge>
                              ))}
                            </div>
                          )}

                          {/* Enrichment details */}
                          {cf.enrichment_source && (
                            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                              <p className="text-[10px] font-bold text-emerald-700 mb-0.5 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Enrichment Data
                              </p>
                              <p className="text-[11px] text-emerald-600 leading-relaxed">
                                Source: {String(cf.enrichment_source)}
                                {cf.enriched_at && ` | Enriched: ${new Date(String(cf.enriched_at)).toLocaleDateString()}`}
                                {cf.enriched_email && ` | Email: ${String(cf.enriched_email)}`}
                                {cf.owner_name && ` | Owner: ${String(cf.owner_name)}`}
                              </p>
                            </div>
                          )}

                          {/* AI insight teaser */}
                          {contact.lastAiInsight && (
                            <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                              <p className="text-[10px] font-bold text-indigo-700 mb-0.5 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> AI Insight
                              </p>
                              <p className="text-[11px] text-indigo-600 leading-relaxed line-clamp-2">{contact.lastAiInsight.summary}</p>
                            </div>
                          )}

                          {/* Micro-badges */}
                          <div className="flex flex-wrap gap-1.5">
                            {(cf.enriched_at || cf.enrichment_source) && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Enriched</span>}
                            {contact.email && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Email</span>}
                            {contact.phone && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Phone</span>}
                            {cf.website && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Website</span>}
                            {!(cf.enriched_at || cf.enrichment_source) && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-400 border border-red-100">Not Enriched</span>}
                          </div>

                          {/* Open detail */}
                          {!showTrash && (
                            <button
                              onClick={() => onContactClick?.(contact.id)}
                              className="text-xs font-bold text-brand hover:text-indigo-700 flex items-center gap-1 mt-1"
                            >
                              View Full Detail <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center flex flex-col items-center">
                  <Database className="w-12 h-12 text-slate-200 mb-4" />
                  <p className="text-sm text-slate-400">{showTrash ? 'No archived contacts' : 'No contacts found'}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Pagination ── */}
          {filteredContacts.length > pageSize && (
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
              <span className="text-[11px] text-slate-500">
                Showing <span className="font-bold text-slate-700">{(currentPage - 1) * pageSize + 1}&ndash;{Math.min(currentPage * pageSize, filteredContacts.length)}</span> of <span className="font-bold text-slate-700">{filteredContacts.length}</span> contacts
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setCurrentPage(1); setExpandedRow(null); }}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-50 transition-all"
                >First</button>
                <button
                  onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); setExpandedRow(null); }}
                  disabled={currentPage === 1}
                  className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-50 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {(() => {
                  const pages: (number | 'dots')[] = [];
                  if (totalPages <= 7) {
                    for (let p = 1; p <= totalPages; p++) pages.push(p);
                  } else {
                    pages.push(1);
                    if (currentPage > 3) pages.push('dots');
                    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) pages.push(p);
                    if (currentPage < totalPages - 2) pages.push('dots');
                    pages.push(totalPages);
                  }
                  return pages.map((p, pidx) =>
                    p === 'dots' ? (
                      <span key={`dots-${pidx}`} className="px-1 text-slate-300 text-xs">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => { setCurrentPage(p as number); setExpandedRow(null); }}
                        className={`w-8 h-8 text-[11px] font-bold rounded-lg transition-all ${
                          currentPage === p
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  );
                })()}

                <button
                  onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); setExpandedRow(null); }}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-50 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setCurrentPage(totalPages); setExpandedRow(null); }}
                  disabled={currentPage >= totalPages}
                  className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-50 transition-all"
                >Last</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Bulk Actions Toolbar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-300">
           <NexusCard variant="slate" padding="none" className="flex items-center gap-6 px-6 py-4">
              <div className="flex items-center gap-4 border-r border-slate-700 pr-6">
                 <div className={`w-8 h-8 ${showTrash ? 'bg-rose-600' : 'bg-brand'} rounded-lg flex items-center justify-center text-sm font-semibold text-white`}>{selectedIds.size}</div>
                 <div>
                    <p className="text-xs text-slate-400">selected</p>
                    <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-500 hover:text-white transition-colors">Clear</button>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 {showTrash ? (
                   <>
                     <NexusButton variant="success" size="sm" icon={RefreshCcw} onClick={() => handleBulkAction('restore')}>Restore</NexusButton>
                     <NexusButton variant="danger" size="sm" icon={AlertTriangle} onClick={() => handleBulkAction('delete')}>Delete</NexusButton>
                   </>
                 ) : (
                   <>
                     <NexusButton variant="brand" size="sm" icon={Zap} onClick={() => handleBulkAction('change_status', 'Interested')}>Mark Interested</NexusButton>
                     <NexusButton variant="ghost" size="sm" icon={TagIcon} onClick={() => handleBulkAction('add_tag', 'Segment_Alpha')}>Add Tag</NexusButton>
                     <NexusButton variant="danger" size="sm" icon={Archive} onClick={() => handleBulkAction('delete')}>Archive</NexusButton>
                   </>
                 )}
              </div>
           </NexusCard>
        </div>
      )}

      {/* ── Add Contact Modal ── */}
      <NexusModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Contact" subtitle="Create a new contact record">
        <div className="space-y-4">
           <NexusInput label="Full Name" placeholder="Jane Smith" value={newLead.name} onChange={(e) => setNewLead({...newLead, name: e.target.value})} />
           <NexusInput label="Email Address" placeholder="jane@company.com" value={newLead.email} onChange={(e) => setNewLead({...newLead, email: e.target.value})} />
           <div className="flex gap-3 pt-2">
              <NexusButton variant="ghost" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</NexusButton>
              <NexusButton variant="brand" className="flex-1" disabled={!newLead.name || !newLead.email} onClick={() => { addContact(newLead); setShowAddModal(false); }}>Add Contact</NexusButton>
           </div>
        </div>
      </NexusModal>

      {/* ── AI Insight Modal ── */}
      <NexusModal isOpen={!!insightContactId} onClose={() => { setInsightContactId(null); setInsight(null); }} title="AI Contact Insight" subtitle="Powered by Gemini">
        {insightLoading ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-8 h-8 text-brand animate-spin mb-3" />
            <p className="text-sm text-slate-400">Analyzing contact...</p>
          </div>
        ) : insight ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">{insight.summary}</p>
            <div className="flex gap-3">
              <NexusBadge variant={insight.riskLevel === 'high' ? 'rose' : insight.riskLevel === 'medium' ? 'amber' : 'emerald'}>
                Risk: {insight.riskLevel}
              </NexusBadge>
              <NexusBadge variant="brand">Predicted Score: {insight.predictedScore}</NexusBadge>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Key Insights</h4>
              <ul className="space-y-1.5">
                {insight.keyInsights.map((ki, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" /> {ki}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommended Action</h4>
              <p className="text-sm text-slate-700 mb-3">{insight.nextAction}</p>
              <div className="flex gap-2">
                <NexusButton variant="brand" size="sm" icon={Sparkles} onClick={() => {
                  const c = contacts.find(ct => ct.id === insightContactId);
                  addProposal({
                    type: 'send_message',
                    title: `Follow up: ${insight.nextAction}`,
                    description: insight.summary,
                    module: 'contacts',
                    contactId: insightContactId!,
                    contactName: c?.name || '',
                    payload: { purpose: insight.nextAction, channel: 'email' },
                  });
                  setInsightContactId(null);
                  setInsight(null);
                }}>Queue Action</NexusButton>
                {insight.predictedScore !== contacts.find(c => c.id === insightContactId)?.leadScore && (
                  <NexusButton variant="ghost" size="sm" onClick={() => {
                    const c = contacts.find(ct => ct.id === insightContactId);
                    addProposal({
                      type: 'update_lead_score',
                      title: `Update score to ${insight.predictedScore}`,
                      description: `AI predicts score of ${insight.predictedScore} based on engagement`,
                      module: 'contacts',
                      contactId: insightContactId!,
                      contactName: c?.name || '',
                      payload: { newScore: insight.predictedScore },
                    });
                  }}>Queue Score Update</NexusButton>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </NexusModal>
    </div>
  );
};

export default ContactManager;

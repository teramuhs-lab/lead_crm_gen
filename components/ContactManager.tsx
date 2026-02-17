
import React, { useState, useMemo, useRef } from 'react';
import {
  Plus, Search, Database, Trash2, Zap, Tag as TagIcon, Upload,
  RefreshCcw, Filter, Archive, FileDown, ChevronRight, X, AlertTriangle
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { Contact } from '../types';
import { NexusCard, NexusButton, NexusBadge, NexusHeader, NexusInput, NexusModal } from './NexusUI';

interface ContactManagerProps {
  onContactClick?: (id: string) => void;
}

const ContactManager: React.FC<ContactManagerProps> = ({ onContactClick }) => {
  const { contacts, smartLists, bulkAddTag, bulkChangeStatus, deleteContacts, restoreContacts, addContact, notify } = useNexus();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSegmentId, setActiveSegmentId] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newLead, setNewLead] = useState({ name: '', email: '' });

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const isCorrectView = showTrash ? c.isArchived : !c.isArchived;
      if (!isCorrectView) return false;

      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

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
    });
  }, [contacts, searchTerm, activeSegmentId, smartLists, showTrash]);

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

  return (
    <div className="h-full flex flex-col space-y-4">
      <NexusHeader
        title={showTrash ? 'Archived Contacts' : 'Contacts'}
        subtitle={showTrash ? 'Archived contacts pending deletion' : 'Manage your leads and customers'}
      >
        <div className="bg-white border border-slate-200 rounded-lg p-0.5 flex mr-2">
           <button onClick={() => { setShowTrash(false); setActiveSegmentId('all'); }} className={`px-3 py-1.5 rounded-md text-sm transition-all ${!showTrash ? 'bg-indigo-50 text-brand font-medium' : 'text-slate-400 hover:text-slate-600'}`}>Active</button>
           <button onClick={() => { setShowTrash(true); setActiveSegmentId('all'); }} className={`px-3 py-1.5 rounded-md text-sm transition-all ${showTrash ? 'bg-rose-50 text-rose-600 font-medium' : 'text-slate-400 hover:text-slate-600'}`}>Archived</button>
        </div>
        <NexusButton onClick={() => setShowAddModal(true)} icon={Plus}>Add Contact</NexusButton>
      </NexusHeader>

      <NexusCard padding="none" className="flex flex-col flex-1 relative min-h-[500px]">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1.5 overflow-x-auto flex-1 px-1">
            {!showTrash && (
              <>
                <button
                  onClick={() => setActiveSegmentId('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap ${activeSegmentId === 'all' ? 'bg-indigo-50 text-brand font-medium' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                >All Contacts</button>
                {smartLists.map(list => (
                  <button key={list.id} onClick={() => setActiveSegmentId(list.id)} className={`px-3 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap ${activeSegmentId === list.id ? 'bg-indigo-50 text-brand font-medium' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                  >{list.name}</button>
                ))}
              </>
            )}
          </div>

          <div className="flex items-center gap-3 border-l border-slate-100 pl-3">
             <div className="flex items-center gap-1.5">
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-brand rounded-lg hover:bg-slate-50 transition-all" title="Import"><Upload className="w-4 h-4" /></button>
                <button onClick={handleExport} disabled={isExporting} className="p-2 text-slate-400 hover:text-brand rounded-lg hover:bg-slate-50 transition-all" title="Export CSV">
                  {isExporting ? <RefreshCcw className="w-4 h-4 animate-spin text-brand" /> : <FileDown className="w-4 h-4" />}
                </button>
             </div>
             <NexusInput
               placeholder="Search contacts..."
               icon={Search}
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-56 md:w-72"
             />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto thin-scrollbar">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 w-12 text-center">
                   <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === filteredContacts.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer" />
                </th>
                <th className="px-4 py-3 w-1/3 text-xs font-semibold text-slate-500">Name</th>
                <th className="px-4 py-3 w-24 text-xs font-semibold text-slate-500 text-center">Score</th>
                <th className="px-4 py-3 w-32 text-xs font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">Tags</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selectedIds.has(contact.id) ? 'bg-indigo-50/50' : ''}`} onClick={() => !showTrash && onContactClick?.(contact.id)}>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                     <input type="checkbox" checked={selectedIds.has(contact.id)} onChange={() => {
                        const next = new Set(selectedIds);
                        if (next.has(contact.id)) next.delete(contact.id); else next.add(contact.id);
                        setSelectedIds(next);
                      }} className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-semibold text-brand shrink-0">
                        {contact.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{contact.name}</p>
                        <p className="text-xs text-slate-400 truncate">{contact.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                     <NexusBadge variant={contact.leadScore > 80 ? 'rose' : contact.leadScore > 40 ? 'brand' : 'slate'}>{contact.leadScore}</NexusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <NexusBadge variant={contact.status === 'Closed' ? 'emerald' : 'brand'}>{contact.status}</NexusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5 overflow-hidden max-h-8">
                      {contact.tags.map((tag, i) => (
                        <NexusBadge key={i} variant="slate">{tag}</NexusBadge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                       {showTrash ? (
                         <button onClick={(e) => { e.stopPropagation(); restoreContacts(new Set([contact.id])); }} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"><RefreshCcw className="w-4 h-4" /></button>
                       ) : (
                         <ChevronRight className="w-4 h-4 text-slate-300" />
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredContacts.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center">
               <Database className="w-12 h-12 text-slate-200 mb-4" />
               <p className="text-sm text-slate-400">{showTrash ? 'No archived contacts' : 'No contacts found'}</p>
            </div>
          )}
        </div>
      </NexusCard>

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
    </div>
  );
};

export default ContactManager;

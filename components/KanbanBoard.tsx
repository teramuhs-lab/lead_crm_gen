
import React, { useState, useMemo } from 'react';
import { Plus, Clock, TrendingUp, Sparkles, BrainCircuit, Loader2, Target, DollarSign, ChevronRight } from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { Contact } from '../types';
import { NexusCard, NexusButton, NexusBadge, NexusHeader } from './NexusUI';

interface KanbanBoardProps {
  onContactClick?: (id: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ onContactClick }) => {
  const { contacts, updateContact, addContact, activeSubAccount, notify } = useNexus();
  const [isPrioritizing, setIsPrioritizing] = useState(false);

  const columns = [
    { id: 'Lead', title: 'New Leads', color: 'bg-indigo-500', icon: Target },
    { id: 'Interested', title: 'Interested', color: 'bg-brand', icon: Sparkles },
    { id: 'Appointment', title: 'Appointments', color: 'bg-amber-500', icon: Clock },
    { id: 'Closed', title: 'Closed Won', color: 'bg-emerald-500', icon: DollarSign },
  ];

  const getColumnStats = (status: string) => {
    const colContacts = contacts.filter(c => c.status === status && !c.isArchived);
    const totalValue = colContacts.length * activeSubAccount.leadValue;
    const weightedValue = colContacts.reduce((acc, c) => acc + (c.leadScore / 100 * activeSubAccount.leadValue), 0);
    return { count: colContacts.length, total: totalValue, weighted: weightedValue };
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, status: Contact['status']) => {
    const id = e.dataTransfer.getData('contactId');
    const contact = contacts.find(c => c.id === id);
    if (contact) {
      updateContact({
        ...contact,
        status,
        activities: [{ id: Date.now().toString(), type: 'note', content: `Moved to ${status}`, timestamp: new Date().toISOString() }, ...contact.activities]
      });
      notify(`Contact moved to ${status}`);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('contactId', id);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleAiPrioritize = async () => {
    setIsPrioritizing(true);
    await new Promise(r => setTimeout(r, 2000));
    notify("AI prioritization complete. High-intent leads moved to top.");
    setIsPrioritizing(false);
  };

  const globalTotal = useMemo(() => contacts.filter(c => !c.isArchived).length * activeSubAccount.leadValue, [contacts, activeSubAccount]);

  return (
    <div className="h-full flex flex-col space-y-4 pb-6">
      <NexusHeader title="Pipeline" subtitle="Manage your sales pipeline and deals">
        <NexusButton variant="ghost" loading={isPrioritizing} onClick={handleAiPrioritize} icon={BrainCircuit}>AI Prioritize</NexusButton>
        <div className="px-4 py-2 bg-slate-900 rounded-lg flex items-center gap-3">
           <div className="flex flex-col">
              <span className="text-xs text-slate-400">Pipeline Value</span>
              <span className="text-sm font-semibold text-white">${globalTotal.toLocaleString()}</span>
           </div>
           <TrendingUp className="w-4 h-4 text-brand" />
        </div>
        <NexusButton onClick={() => addContact({ name: prompt("Contact name:") || '' })} icon={Plus}>Add Deal</NexusButton>
      </NexusHeader>

      <div className="flex-1 overflow-x-auto thin-scrollbar pb-4">
        <div className="flex gap-4 min-h-full">
          {columns.map((col) => {
            const stats = getColumnStats(col.id);
            return (
              <div key={col.id} className="w-72 shrink-0 flex flex-col" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id as Contact['status'])}>
                <div className="mb-3 px-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${col.color} text-white`}>
                        <col.icon className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">{col.title}</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{stats.count}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                     <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Total</span><span className="text-xs font-semibold text-slate-900">${stats.total.toLocaleString()}</span></div>
                     <div className="flex justify-between items-center"><span className="text-xs text-emerald-600">Weighted</span><span className="text-xs font-semibold text-emerald-600">${Math.floor(stats.weighted).toLocaleString()}</span></div>
                     <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-brand rounded-full transition-all duration-1000" style={{ width: `${(stats.weighted / (stats.total || 1)) * 100}%` }}></div></div>
                  </div>
                </div>

                <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-200/50 space-y-3 thin-scrollbar overflow-y-auto min-h-[400px]">
                  {contacts.filter(c => c.status === col.id && !c.isArchived).map((lead) => (
                    <NexusCard key={lead.id} padding="none" className="bg-white p-4 cursor-grab active:cursor-grabbing hover:border-brand/30 hover:shadow-md group" draggable onDragStart={(e) => handleDragStart(e, lead.id)} onClick={() => onContactClick?.(lead.id)}>
                      {lead.leadScore > 85 && <div className="absolute top-3 right-3"><div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div></div>}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-medium text-slate-500 group-hover:bg-brand group-hover:text-white transition-all shrink-0">{lead.name.charAt(0)}</div>
                        <div className="min-w-0">
                           <h4 className="text-sm font-medium text-slate-900 truncate">{lead.name}</h4>
                           <div className="flex items-center gap-1.5 mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div><p className="text-xs text-slate-400 truncate">{lead.source}</p></div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {lead.tags.slice(0, 2).map((tag, i) => <NexusBadge key={i} variant="slate">{tag}</NexusBadge>)}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400"><Clock className="w-3 h-3" />{lead.lastActivity}</div>
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-medium text-slate-700">{lead.leadScore}%</span>
                           <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand transition-colors" />
                        </div>
                      </div>
                    </NexusCard>
                  ))}
                  <button onClick={() => addContact({ name: prompt("Contact name:") || '', status: col.id as any })} className="w-full py-6 flex items-center justify-center gap-2 text-slate-400 hover:text-brand hover:bg-white rounded-xl border-2 border-dashed border-slate-200 hover:border-brand/30 transition-all">
                    <Plus className="w-4 h-4" /><span className="text-sm">Add deal</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;

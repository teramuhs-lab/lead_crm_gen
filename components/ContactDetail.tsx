
import React, { useState } from 'react';
import {
  X, Mail, Phone, Tag, Calendar, Clock, Plus,
  MessageSquare, History, CheckCircle2, FileText,
  User, Send, Trash2, Edit2, ChevronDown, MoreHorizontal,
  TrendingUp, Hash, Globe, MousePointer2, Database, BrainCircuit, Sparkles, Loader2, Box, Search
} from 'lucide-react';
import { Contact, Activity, Task, CustomFieldDefinition } from '../types';
import { useNexus } from '../context/NexusContext';
import { analyzeLeadHistory } from '../services/geminiService';
import { enrichLeadDomain } from '../services/apifyService';

interface ContactDetailProps {
  contact: Contact;
  onClose: () => void;
  onUpdate: (contact: Contact) => void;
  fieldDefinitions: CustomFieldDefinition[];
}

const ContactDetail: React.FC<ContactDetailProps> = ({ contact, onClose, onUpdate, fieldDefinitions }) => {
  const { addTask, toggleTask, logActivity, notify } = useNexus();
  const [activeTab, setActiveTab] = useState<'timeline' | 'tasks' | 'fields'>('timeline');
  const [newNote, setNewNote] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [editingCustomFieldId, setEditingCustomFieldId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  if (!contact) return null;

  const handleEnrichment = async () => {
    setIsEnriching(true);
    try {
      const result = await enrichLeadDomain(contact.email.split('@')[1], "mock_token");
      logActivity(contact.id, {
        type: 'scraping_event',
        content: `Enrichment: ${result.data.estimated_employees} employees, tech stack: ${result.data.tech_stack.join(', ')}`
      });
      notify("Contact enriched successfully.");
    } catch (err) {
      notify("Enrichment failed. Check API token.", "error");
    }
    setIsEnriching(false);
  };

  const handleAiProfiler = async () => {
    setIsAnalyzing(true);
    const result = await analyzeLeadHistory(contact.name, contact.activities);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    addTask(contact.id, { title: newTaskTitle });
    setNewTaskTitle('');
  };

  const addNote = () => {
    if (!newNote) return;
    logActivity(contact.id, { type: 'note', content: newNote });
    setNewNote('');
  };

  const handleUpdateCustomField = (id: string, value: any) => {
    onUpdate({
      ...contact,
      customFields: {
        ...contact.customFields,
        [id]: value
      }
    });
    setEditingCustomFieldId(null);
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'email': return <Mail className="w-3.5 h-3.5" />;
      case 'sms': return <MessageSquare className="w-3.5 h-3.5" />;
      case 'form_submission': return <FileText className="w-3.5 h-3.5" />;
      case 'page_visit': return <Globe className="w-3.5 h-3.5" />;
      case 'scraping_event': return <Box className="w-3.5 h-3.5" />;
      case 'note': return <Edit2 className="w-3.5 h-3.5" />;
      case 'task': return <CheckCircle2 className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'email': return 'bg-indigo-50 text-indigo-500 border-indigo-100';
      case 'sms': return 'bg-emerald-50 text-emerald-500 border-emerald-100';
      case 'form_submission': return 'bg-amber-50 text-amber-500 border-amber-100';
      case 'scraping_event': return 'bg-orange-50 text-orange-600 border-orange-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center font-semibold text-brand text-lg">
            {contact.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{contact.name}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              contact.status === 'Closed' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-brand'
            }`}>
              {contact.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
           <button
             onClick={handleEnrichment}
             disabled={isEnriching}
             className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
             title="Enrich contact"
           >
              {isEnriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
           </button>
           <button onClick={handleAiProfiler} className="p-2 text-brand hover:bg-indigo-50 rounded-lg transition-all" title="AI analysis">
              <Sparkles className="w-4 h-4" />
           </button>
           <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
              <X className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-slate-100 grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-2 py-2 bg-brand text-white rounded-lg text-sm font-medium transition-all hover:bg-indigo-700">
          <Send className="w-4 h-4" /> Send Email
        </button>
        <button className="flex items-center justify-center gap-2 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium transition-all hover:bg-slate-800">
          <Phone className="w-4 h-4" /> Call
        </button>
      </div>

      <div className="flex border-b border-slate-100">
        {[
          { id: 'timeline', label: 'Timeline', icon: History },
          { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
          { id: 'fields', label: 'Custom Fields', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === tab.id ? 'text-brand border-b-2 border-brand font-medium' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-5 thin-scrollbar relative">
        {(isAnalyzing || isEnriching) && (
           <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-200">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center animate-pulse ${isEnriching ? 'bg-orange-50 text-orange-500' : 'bg-indigo-50 text-brand'}`}>
                 {isEnriching ? <Box className="w-6 h-6" /> : <BrainCircuit className="w-6 h-6" />}
              </div>
              <p className="text-sm text-slate-500">{isEnriching ? 'Enriching contact...' : 'Running AI analysis...'}</p>
           </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-4 relative">
            <div className="absolute left-[15px] top-2 bottom-0 w-px bg-slate-200"></div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 relative z-10 ml-8">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none placeholder:text-slate-400"
                rows={2}
              />
              <div className="flex justify-end border-t border-slate-100 pt-2">
                <button onClick={addNote} className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-all">Add Note</button>
              </div>
            </div>

            <div className="space-y-4">
              {contact.activities.map((act) => (
                <div key={act.id} className="relative z-10">
                  <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${getActivityColor(act.type)}`}>
                    {getActivityIcon(act.type)}
                  </div>
                  <div className="ml-10">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-slate-500 capitalize">{act.type.replace('_', ' ')}</span>
                        <span className="text-xs text-slate-400">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm text-slate-700">{act.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex gap-2">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add a task..."
                className="flex-1 text-sm outline-none placeholder:text-slate-400"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              />
              <button onClick={handleAddTask} className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-all">Add</button>
            </div>
            {contact.tasks.map((task) => (
              <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                <button onClick={() => toggleTask(contact.id, task.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-brand'}`}>
                  {task.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                </button>
                <span className={`text-sm ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'fields' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-500" /> Custom Fields
              </h4>
              <div className="space-y-3">
                {fieldDefinitions.map(field => (
                  <div key={field.id}>
                    <p className="text-xs font-medium text-slate-500 mb-1 ml-1">{field.label}</p>
                    {editingCustomFieldId === field.id ? (
                      <input
                        autoFocus
                        type={field.type === 'number' ? 'number' : 'text'}
                        defaultValue={contact.customFields[field.id] || ''}
                        onBlur={(e) => handleUpdateCustomField(field.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-brand rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/10"
                      />
                    ) : (
                      <div
                        onClick={() => setEditingCustomFieldId(field.id)}
                        className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between cursor-pointer hover:bg-white hover:border-slate-200 transition-all"
                      >
                        <span className="text-sm text-slate-700">
                          {contact.customFields[field.id] || <span className="text-slate-400 italic">Empty</span>}
                        </span>
                        <Edit2 className="w-3 h-3 text-slate-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactDetail;

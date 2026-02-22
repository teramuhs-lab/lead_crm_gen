
import React, { useState, useEffect } from 'react';
import { Search, Users, Globe, Zap, X, Command, MessageSquare, ShieldCheck, Mail, Database, Target } from 'lucide-react';
import { Contact, ViewType } from '../types';
import { useNexus } from '../context/NexusContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onNavigate: (view: ViewType) => void;
  onContactClick: (id: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, contacts, onNavigate, onContactClick }) => {
  const [query, setQuery] = useState('');
  const { setActiveView } = useNexus();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle handled by parent
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const filteredContacts = contacts.filter(c =>
    !c.isArchived && (
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase())
    )
  ).slice(0, 5);

  const navigation = [
    { label: 'Sales Dashboard', view: 'dashboard', icon: Target },
    { label: 'Contacts (CRM)', view: 'contacts', icon: Users },
    { label: 'Site & Funnel Builder', view: 'sites', icon: Globe },
    { label: 'Automation Workflows', view: 'automations', icon: Zap },
    { label: 'Communications', view: 'conversations', icon: MessageSquare },
    { label: 'Agency Dashboard (SaaS)', view: 'agency', icon: ShieldCheck },
    { label: 'Database Settings', view: 'schema_manager', icon: Database },
  ].filter(n => n.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center px-8 py-6 border-b border-slate-100">
          <Search className="w-6 h-6 text-brand mr-4" />
          <input
            autoFocus
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-xl font-semibold text-slate-800 placeholder:text-slate-300"
          />
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-rose-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-8 thin-scrollbar">
          {navigation.length > 0 && (
            <div>
              <h3 className="px-6 py-2 text-xs font-semibold text-slate-400">Pages</h3>
              <div className="space-y-1">
                {navigation.map((nav) => (
                  <button
                    key={nav.view}
                    onClick={() => { setActiveView(nav.view as ViewType); onClose(); }}
                    className="w-full flex items-center gap-4 px-6 py-4 rounded-xl hover:bg-indigo-50 transition-all text-left group"
                  >
                    <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-brand group-hover:text-white transition-all shadow-sm">
                      <nav.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{nav.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredContacts.length > 0 && (
            <div>
              <h3 className="px-6 py-2 text-xs font-semibold text-slate-400">Contacts</h3>
              <div className="space-y-1">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => { onContactClick(contact.id); onClose(); }}
                    className="w-full flex items-center gap-4 px-6 py-4 rounded-xl hover:bg-indigo-50 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center font-semibold text-brand text-sm shadow-sm transition-transform">
                      {contact.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{contact.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-xs font-medium text-slate-400 truncate max-w-[150px]">{contact.email}</span>
                         <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${contact.leadScore > 80 ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>{contact.leadScore}% HOT</span>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                       <Users className="w-4 h-4 text-brand" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && filteredContacts.length === 0 && navigation.length === 0 && (
            <div className="py-20 text-center text-slate-400 space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                 <Command className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-sm font-semibold">No results found for "{query}"</p>
            </div>
          )}
        </div>

        <div className="px-10 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-2"><span className="px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">↑↓</span> Navigate</span>
            <span className="flex items-center gap-2"><span className="px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">↵</span> Select</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand animate-pulse">
             Nexus Search Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;

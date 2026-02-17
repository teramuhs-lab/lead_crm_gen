
import React, { useState, useMemo } from 'react';
import {
  Send, Phone, Video, Search, Paperclip, Zap, MessageSquare,
  Sparkles, Loader2, Braces, ChevronDown, CheckCircle2,
  Mail, Clock, Filter, PhoneIncoming, PhoneOutgoing,
  ShieldCheck, Target, TrendingUp, Tag, Plus, X
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { Message, Contact, MessageChannel } from '../types';
import { NexusCard, NexusButton, NexusBadge, NexusInput, NexusTextArea } from './NexusUI';

const CommunicationHub: React.FC = () => {
  const { contacts, messages, sendMessage, notify } = useNexus();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(contacts[0]?.id || null);
  const [messageText, setMessageText] = useState('');
  const [activeChannel, setActiveChannel] = useState<MessageChannel>('sms');

  const selectedContact = useMemo(() => contacts.find(c => c.id === selectedContactId), [contacts, selectedContactId]);

  // Fix: Ensure comparison is safe for null and sort returns a number.
  const filteredMessages = useMemo(() =>
    messages.filter(m => selectedContactId !== null && m.contactId === selectedContactId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
  [messages, selectedContactId]);

  const handleSend = async () => {
    if (!messageText.trim() || !selectedContactId) return;
    await sendMessage({
      contactId: selectedContactId,
      content: messageText,
      channel: activeChannel,
    });
    setMessageText('');
  };

  return (
    <div className="h-full flex gap-6 animate-in fade-in duration-500 overflow-hidden pb-10">
      <NexusCard padding="none" className="w-80 flex flex-col shrink-0 border-b-8 border-brand/5">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold text-slate-900 text-xs">Messages</h3>
             <Filter className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <NexusInput placeholder="Search contacts..." icon={Search} size="sm" className="py-2.5 px-4" />
        </div>
        <div className="flex-1 overflow-y-auto thin-scrollbar">
          {contacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => setSelectedContactId(contact.id)}
              className={`w-full flex items-center gap-4 p-5 transition-all border-b border-slate-50 ${selectedContactId === contact.id ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'}`}
            >
              <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-semibold text-sm ${selectedContactId === contact.id ? 'bg-brand text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                   {contact.name.charAt(0)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`font-semibold text-sm truncate ${selectedContactId === contact.id ? 'text-brand' : 'text-slate-900'}`}>{contact.name}</span>
                  <span className="text-xs text-slate-300 font-medium">2m</span>
                </div>
                <p className="text-xs text-slate-400 font-medium truncate">Ready for outreach...</p>
              </div>
            </button>
          ))}
        </div>
      </NexusCard>

      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative">
        {selectedContact ? (
          <>
            <div className="h-20 border-b border-slate-100 px-8 flex items-center justify-between bg-white/80 backdrop-blur z-20">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-semibold text-lg shadow-lg">{selectedContact.name.charAt(0)}</div>
                <div>
                   <h3 className="font-semibold text-sm text-slate-900">{selectedContact.name}</h3>
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-xs font-medium text-emerald-600">Active {activeChannel.toUpperCase()}</span>
                   </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <button className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-brand transition-all"><Phone className="w-4 h-4" /></button>
                 <button className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-brand transition-all"><Video className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/20 thin-scrollbar">
              {filteredMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${msg.direction === 'outbound' ? 'order-2' : 'order-1'}`}>
                    <div className={`p-6 rounded-xl shadow-sm text-xs font-medium ${
                      msg.direction === 'outbound'
                        ? 'bg-brand text-white rounded-tr-none shadow-brand/20'
                        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                    <div className={`mt-3 flex items-center gap-2 px-4 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                       <span className="text-xs font-medium text-slate-300">{msg.channel} • {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                       {msg.direction === 'outbound' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    </div>
                  </div>
                </div>
              ))}
              {filteredMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none space-y-4">
                   <MessageSquare className="w-20 h-20 text-slate-200" />
                   <p className="text-xl font-semibold">No messages yet</p>
                </div>
              )}
            </div>

            <div className="p-10 bg-white border-t border-slate-100">
              <div className="flex gap-2 mb-6">
                 {(['sms', 'email', 'whatsapp'] as MessageChannel[]).map(ch => (
                   <button
                    key={ch}
                    onClick={() => setActiveChannel(ch)}
                    className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all ${activeChannel === ch ? 'bg-brand text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                   >
                     {ch}
                   </button>
                 ))}
              </div>
              <div className="relative group">
                <NexusTextArea
                  rows={2}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Message ${selectedContact.name.split(' ')[0]}...`}
                  className="pr-20 py-6"
                />
                <div className="absolute right-4 bottom-4 flex items-center gap-2">
                   <button className="p-3 text-slate-300 hover:text-brand transition-colors"><Paperclip className="w-5 h-5" /></button>
                   <NexusButton onClick={handleSend} variant="brand" size="md" icon={Send} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 select-none space-y-6">
             <MessageSquare className="w-32 h-32 text-slate-300" />
             <p className="text-2xl font-semibold">Select a contact</p>
          </div>
        )}
      </div>

      {selectedContact && (
        <NexusCard padding="none" className="w-80 flex flex-col shrink-0 border-b-8 border-brand/5">
           <div className="p-6 text-center space-y-6">
              <div className="w-24 h-24 rounded-xl bg-indigo-50 border-4 border-white shadow-md flex items-center justify-center mx-auto relative group overflow-hidden">
                 <span className="text-4xl font-semibold text-brand">{selectedContact.name.charAt(0)}</span>
              </div>
              <div>
                 <h4 className="font-semibold text-slate-900 text-lg">{selectedContact.name}</h4>
                 <p className="text-xs font-medium text-slate-400 mt-1">{selectedContact.status}</p>
              </div>
              <div className="flex justify-center gap-2">
                 <NexusBadge variant="emerald">Active</NexusBadge>
                 <NexusBadge variant="brand">{selectedContact.source}</NexusBadge>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-10 thin-scrollbar">
              <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100 space-y-6">
                 <h5 className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-brand" /> Contact Details
                 </h5>
                 <div className="space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="p-2 bg-white rounded-xl shadow-sm text-slate-300"><Mail className="w-4 h-4" /></div>
                       <span className="text-sm font-medium text-slate-600 truncate">{selectedContact.email}</span>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="p-2 bg-white rounded-xl shadow-sm text-slate-300"><Phone className="w-4 h-4" /></div>
                       <span className="text-sm font-medium text-slate-600">{selectedContact.phone}</span>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-xl text-white shadow-md relative overflow-hidden group">
                 <div className="relative z-10">
                    <h5 className="text-xs font-semibold text-brand mb-4">Attribution</h5>
                    <div className="space-y-2">
                       <p className="text-sm font-medium"><span className="text-slate-500 mr-3">Source:</span> {selectedContact.source}</p>
                       <p className="text-sm font-medium"><span className="text-slate-500 mr-3">Score:</span> {selectedContact.leadScore}%</p>
                    </div>
                 </div>
                 <Zap className="absolute top-[-20px] right-[-20px] w-24 h-24 text-brand/10 rotate-12" />
              </div>

              <div className="p-4 space-y-4">
                 <h5 className="text-xs font-semibold text-slate-400 ml-2">Tags</h5>
                 <div className="flex flex-wrap gap-2">
                    {selectedContact.tags.map(t => (
                      <NexusBadge key={t} variant="slate">{t}</NexusBadge>
                    ))}
                    <button className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-brand hover:bg-indigo-50 transition-all"><Plus className="w-3 h-3" /></button>
                 </div>
              </div>
           </div>
        </NexusCard>
      )}
    </div>
  );
};

export default CommunicationHub;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BrainCircuit, Send, Sparkles, MessageSquare, CalendarPlus, TrendingUp,
  Target, Lightbulb, Settings2, Zap, BarChart3, User, Bot, Loader2,
  ChevronRight, AlertTriangle, CheckCircle2, ArrowUpRight, RefreshCw,
  Plus, X, MessageCircle, Clock
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { api } from '../lib/api';
import { AIMessage, AIAction, AISuggestion, AIAgentConfig, AIChatSession } from '../types';
import { NexusHeader } from './NexusUI';

const defaultConfig: AIAgentConfig = {
  name: 'Nexus AI',
  goal: 'Help manage the CRM and provide actionable insights',
  instructions: '',
};

function parseActions(text: string): { cleanText: string; actions: AIAction[] } {
  const actions: AIAction[] = [];
  const regex = /\[ACTION:(\w+)\|([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const type = match[1] as AIAction['type'];
    const paramsStr = match[2];
    const params: Record<string, string> = {};
    paramsStr.split('|').forEach(p => {
      const [key, ...rest] = p.split('=');
      if (key && rest.length) params[key.trim()] = rest.join('=').trim();
    });

    const labelMap: Record<string, string> = {
      DRAFT_MESSAGE: `Draft message for ${params.contactName || 'contact'}`,
      BOOK_APPOINTMENT: `Book: ${params.title || 'appointment'}`,
      UPDATE_LEAD_SCORE: `Update score for ${params.contactName || 'contact'} → ${params.newScore || '?'}`,
      SUGGEST_WORKFLOW: `Run workflow for ${params.contactName || 'contact'}`,
      CONTACT_SUMMARY: `View insights for ${params.contactName || 'contact'}`,
    };

    actions.push({ type, params, label: labelMap[type] || type });
  }

  const cleanText = text.replace(regex, '').trim();
  return { cleanText, actions };
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const AIEmployee: React.FC = () => {
  const { contacts, messages: crmMessages, appointments, addAppointment, updateContact, notify, agencySettings, activeSubAccount } = useNexus();

  const [chatMessages, setChatMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AIAgentConfig>(defaultConfig);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [rightTab, setRightTab] = useState<'insights' | 'settings'>('insights');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Session state
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Track whether first user message title has been set for current session
  const titleSetRef = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking]);

  // Load sessions on mount (or when activeSubAccount changes)
  useEffect(() => {
    if (!activeSubAccount?.id) return;
    let cancelled = false;

    const loadSessions = async () => {
      setSessionsLoading(true);
      try {
        const res = await api.get<{ sessions: { id: string; title: string; updatedAt: string }[] }>(
          `/ai/chat-sessions?subAccountId=${activeSubAccount.id}`
        );
        if (cancelled) return;

        if (res.sessions.length > 0) {
          // Map to full AIChatSession shape (messages/agentConfig will be filled on load)
          const sessionList: AIChatSession[] = res.sessions.map(s => ({
            id: s.id,
            subAccountId: activeSubAccount.id,
            title: s.title,
            messages: [],
            agentConfig: defaultConfig,
            createdAt: s.updatedAt,
            updatedAt: s.updatedAt,
          }));
          setSessions(sessionList);

          // Load the most recent session
          const mostRecent = res.sessions[0];
          await loadSession(mostRecent.id);
        } else {
          // No sessions, create a new one
          await createNewSession();
        }
      } catch {
        // If sessions fail to load, just start fresh with empty state
        setSessions([]);
        setChatMessages([]);
        setAgentConfig(defaultConfig);
        setActiveSessionId(null);
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    };

    loadSessions();
    return () => { cancelled = true; };
  }, [activeSubAccount?.id]);

  const loadSession = async (sessionId: string) => {
    try {
      const session = await api.get<AIChatSession>(`/ai/chat-sessions/${sessionId}`);
      setActiveSessionId(session.id);
      setChatMessages(session.messages || []);
      const config = session.agentConfig;
      if (config && config.name) {
        setAgentConfig(config);
      } else {
        setAgentConfig(defaultConfig);
      }
      titleSetRef.current = session.title !== 'New Chat';
    } catch {
      // Failed to load session
    }
  };

  const createNewSession = async () => {
    if (!activeSubAccount?.id) return;
    try {
      const session = await api.post<AIChatSession>('/ai/chat-sessions', {
        subAccountId: activeSubAccount.id,
        title: 'New Chat',
        agentConfig: defaultConfig,
      });
      setActiveSessionId(session.id);
      setChatMessages([]);
      setAgentConfig(session.agentConfig && session.agentConfig.name ? session.agentConfig : defaultConfig);
      titleSetRef.current = false;

      // Add to sessions list at the top
      setSessions(prev => [{
        id: session.id,
        subAccountId: session.subAccountId,
        title: session.title,
        messages: [],
        agentConfig: session.agentConfig && session.agentConfig.name ? session.agentConfig : defaultConfig,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }, ...prev]);
    } catch {
      // Failed to create session
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await api.delete(`/ai/chat-sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      if (activeSessionId === sessionId) {
        // Switch to another session or create new
        const remaining = sessions.filter(s => s.id !== sessionId);
        if (remaining.length > 0) {
          await loadSession(remaining[0].id);
        } else {
          await createNewSession();
        }
      }
    } catch {
      // Failed to delete
    }
  };

  const saveSessionMessages = async (msgs: AIMessage[], titleUpdate?: string) => {
    if (!activeSessionId) return;
    try {
      const body: Record<string, unknown> = { messages: msgs };
      if (titleUpdate) body.title = titleUpdate;
      const updated = await api.put<AIChatSession>(`/ai/chat-sessions/${activeSessionId}`, body);

      // Update sessions list
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? { ...s, title: updated.title, updatedAt: updated.updatedAt }
          : s
      ));
    } catch {
      // Silently fail — the messages are still in local state
    }
  };

  const saveSessionConfig = async (config: AIAgentConfig) => {
    if (!activeSessionId) return;
    try {
      await api.put(`/ai/chat-sessions/${activeSessionId}`, { agentConfig: config });
    } catch {
      // Silently fail
    }
  };

  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const res = await api.post<{ suggestions: AISuggestion[] }>('/ai/suggestions', {
        subAccountId: activeSubAccount?.id,
        contacts: contacts.slice(0, 30).map(c => ({
          id: c.id, name: c.name, email: c.email, status: c.status,
          leadScore: c.leadScore, lastActivity: c.lastActivity, tags: c.tags,
        })),
        messages: crmMessages.slice(0, 20).map(m => ({
          contactId: m.contactId, direction: m.direction, channel: m.channel,
          content: m.content, timestamp: m.timestamp,
        })),
        appointments: appointments.slice(0, 10).map(a => ({
          contactName: a.contactName, title: a.title,
          startTime: a.startTime, status: a.status,
        })),
      });
      setSuggestions(res.suggestions || []);
    } catch {
      // silently fail — suggestions are non-critical
    } finally {
      setLoadingSuggestions(false);
    }
  }, [contacts, crmMessages, appointments]);

  // Only fetch suggestions when user opens insights tab — avoids wasting API calls
  const suggestionsLoaded = useRef(false);
  useEffect(() => {
    if (rightTab === 'insights' && !suggestionsLoaded.current && contacts.length > 0) {
      suggestionsLoaded.current = true;
      fetchSuggestions();
    }
  }, [rightTab, contacts.length]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isThinking) return;

    const userMsg: AIMessage = {
      id: 'u-' + Date.now(),
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setInput('');
    setIsThinking(true);

    // Auto-title: after the first user message, update the session title
    let titleUpdate: string | undefined;
    if (!titleSetRef.current) {
      titleUpdate = msg.slice(0, 50);
      titleSetRef.current = true;
    }

    try {
      const history = chatMessages.slice(-6).map(m => ({
        role: m.role, content: m.content,
      }));

      const res = await api.post<{ reply: string }>('/ai/chat', {
        subAccountId: activeSubAccount?.id,
        message: msg,
        context: {
          contacts: contacts.slice(0, 15).map(c => ({
            name: c.name, email: c.email, status: c.status,
            leadScore: c.leadScore, lastActivity: c.lastActivity, tags: c.tags,
          })),
          recentMessages: crmMessages.slice(0, 10).map(m => {
            const contact = contacts.find(c => c.id === m.contactId);
            return {
              contactName: contact?.name || 'Unknown',
              channel: m.channel, direction: m.direction,
              content: m.content, timestamp: m.timestamp,
            };
          }),
          appointments: appointments.slice(0, 10).map(a => ({
            title: a.title, contactName: a.contactName,
            startTime: a.startTime, endTime: a.endTime, status: a.status,
          })),
          agentName: agentConfig.name,
          agentGoal: agentConfig.goal,
          agentInstructions: agentConfig.instructions,
        },
        history,
      });

      const { cleanText, actions } = parseActions(res.reply);

      const aiMsg: AIMessage = {
        id: 'a-' + Date.now(),
        role: 'assistant',
        content: cleanText,
        timestamp: new Date().toISOString(),
        actions: actions.length > 0 ? actions : undefined,
      };
      const finalMessages = [...updatedMessages, aiMsg];
      setChatMessages(finalMessages);

      // Auto-save after AI response
      saveSessionMessages(finalMessages, titleUpdate);
    } catch (err: any) {
      const is429 = err?.response?.status === 429 || err?.message?.includes('429');
      const retrySeconds = err?.response?.data?.retryAfterMs
        ? Math.ceil(err.response.data.retryAfterMs / 1000)
        : null;

      const errorMsg: AIMessage = {
        id: 'e-' + Date.now(),
        role: 'assistant',
        content: is429
          ? `I'm cooling down to stay within API limits. Please wait ${retrySeconds ? `~${retrySeconds} seconds` : 'a moment'} and try again.`
          : 'Sorry, I encountered an error. Please check that the Gemini API key is configured in your environment variables and try again.',
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...updatedMessages, errorMsg];
      setChatMessages(finalMessages);

      // Save even error messages to preserve context
      saveSessionMessages(finalMessages, titleUpdate);
    } finally {
      setIsThinking(false);
    }
  };

  const handleAction = (action: AIAction) => {
    switch (action.type) {
      case 'BOOK_APPOINTMENT': {
        const contact = contacts.find(c => c.name === action.params.contactName);
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 1);
        startTime.setHours(14, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(15);
        addAppointment({
          title: action.params.title || 'AI-Suggested Meeting',
          contactName: action.params.contactName || 'Unknown',
          contactId: contact?.id || '',
          calendarId: '',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          notes: 'Booked via AI Employee',
        });
        notify(`Appointment booked: ${action.params.title || 'Meeting'}`);
        break;
      }
      case 'UPDATE_LEAD_SCORE': {
        const contact = contacts.find(c => c.name === action.params.contactName);
        if (contact && action.params.newScore) {
          updateContact({ ...contact, leadScore: parseInt(action.params.newScore, 10) });
          notify(`Lead score updated for ${contact.name}`);
        }
        break;
      }
      case 'DRAFT_MESSAGE': {
        sendMessage(`Draft a ${action.params.purpose || 'follow-up'} ${action.params.channel || 'email'} for ${action.params.contactName}`);
        break;
      }
      case 'CONTACT_SUMMARY': {
        sendMessage(`Give me a detailed analysis of ${action.params.contactName}`);
        break;
      }
      default:
        notify(`Action: ${action.type}`);
    }
  };

  const handleConfigChange = (updater: (prev: AIAgentConfig) => AIAgentConfig) => {
    setAgentConfig(prev => {
      const updated = updater(prev);
      return updated;
    });
  };

  const handleSaveConfig = () => {
    saveSessionConfig(agentConfig);
    notify('Agent configuration saved', 'success');
  };

  const quickActions = [
    { label: 'Analyze Leads', icon: BarChart3, prompt: 'Analyze my current leads and tell me which ones need attention.' },
    { label: 'Draft Message', icon: MessageSquare, prompt: 'Help me draft a follow-up message for my highest-scoring lead.' },
    { label: "Today's Focus", icon: Target, prompt: "What should I focus on today? What are my priorities?" },
    { label: 'Pipeline Summary', icon: TrendingUp, prompt: 'Summarize my current sales pipeline. How are my leads distributed?' },
  ];

  const priorityColors: Record<string, string> = {
    high: 'bg-rose-50 text-rose-700 border-rose-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-100',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };

  const suggestionIcons: Record<string, React.ReactNode> = {
    follow_up: <MessageSquare className="w-4 h-4" />,
    at_risk: <AlertTriangle className="w-4 h-4" />,
    opportunity: <TrendingUp className="w-4 h-4" />,
    reminder: <CalendarPlus className="w-4 h-4" />,
    insight: <Lightbulb className="w-4 h-4" />,
  };

  return (
    <div className="max-w-[1600px] mx-auto flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
      <NexusHeader title="AI Agent" subtitle="Your AI-powered assistant for CRM tasks, lead analysis, and smart recommendations" />
      <div className="flex gap-0 flex-1 min-h-0">
      {/* Session Sidebar */}
      <div className="w-64 shrink-0 flex flex-col bg-slate-50 border border-slate-200 rounded-2xl mr-4 overflow-hidden">
        {/* New Chat Button */}
        <div className="p-3 border-b border-slate-200">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessionsLoading && sessions.length === 0 && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin mb-2" />
              <p className="text-[10px] text-slate-400">Loading chats...</p>
            </div>
          )}

          {!sessionsLoading && sessions.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center px-4">
              <MessageCircle className="w-6 h-6 text-slate-300 mb-2" />
              <p className="text-[10px] text-slate-400">No chat history yet</p>
            </div>
          )}

          {sessions.map(session => (
            <div
              key={session.id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                activeSessionId === session.id
                  ? 'bg-white border border-brand/20 shadow-sm'
                  : 'hover:bg-white/70 border border-transparent'
              }`}
              onClick={() => {
                if (session.id !== activeSessionId) {
                  loadSession(session.id);
                }
              }}
            >
              <MessageCircle className={`w-3.5 h-3.5 shrink-0 ${
                activeSessionId === session.id ? 'text-brand' : 'text-slate-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${
                  activeSessionId === session.id ? 'text-slate-900' : 'text-slate-600'
                }`}>
                  {session.title}
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {timeAgo(session.updatedAt)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 rounded-lg transition-all"
                title="Delete session"
              >
                <X className="w-3 h-3 text-slate-400 hover:text-rose-500" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Left Column — Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <BrainCircuit className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{agentConfig.name}</h2>
            <p className="text-xs text-slate-400">{agentConfig.goal}</p>
          </div>
          <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold border border-emerald-100">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Online
          </span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 mb-4">
          {chatMessages.length === 0 && !isThinking && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-brand" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Hi! I'm {agentConfig.name}</h3>
              <p className="text-sm text-slate-400 max-w-md mb-8">
                I'm your AI CRM copilot. I can analyze your leads, draft messages, book appointments, and help you stay on top of your pipeline. Ask me anything!
              </p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {quickActions.map(qa => (
                  <button
                    key={qa.label}
                    onClick={() => sendMessage(qa.prompt)}
                    className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-xl transition-all text-left group"
                  >
                    <qa.icon className="w-5 h-5 text-slate-400 group-hover:text-brand shrink-0" />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-brand">{qa.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.role === 'user' ? '' : 'flex gap-3'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-brand text-white rounded-br-md'
                      : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-bl-md'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.actions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleAction(action)}
                          className="flex items-center gap-2 px-3 py-2 bg-white border border-indigo-200 hover:border-brand hover:bg-indigo-50 rounded-xl text-xs font-semibold text-brand transition-all w-full text-left"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          {action.label}
                          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                        </button>
                      ))}
                    </div>
                  )}
                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-right text-slate-300' : 'text-slate-300 ml-1'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-brand animate-spin" />
                  <span className="text-xs text-slate-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Actions Bar */}
        {chatMessages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {quickActions.map(qa => (
              <button
                key={qa.label}
                onClick={() => sendMessage(qa.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-brand hover:bg-indigo-50 rounded-lg text-xs font-semibold text-slate-500 hover:text-brand transition-all whitespace-nowrap shrink-0"
              >
                <qa.icon className="w-3.5 h-3.5" />
                {qa.label}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={`Ask ${agentConfig.name} anything about your CRM...`}
            className="w-full px-5 py-4 pr-14 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand shadow-sm transition-all"
            disabled={isThinking}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isThinking || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Column — Insights & Config */}
      <div className="w-[340px] shrink-0 flex flex-col ml-6">
        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4">
          <button
            onClick={() => setRightTab('insights')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              rightTab === 'insights' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" /> Insights
          </button>
          <button
            onClick={() => setRightTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              rightTab === 'settings' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" /> Agent Config
          </button>
        </div>

        {/* Insights Tab */}
        {rightTab === 'insights' && (
          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">AI Recommendations</h3>
              <button
                onClick={fetchSuggestions}
                disabled={loadingSuggestions}
                className="p-1.5 text-slate-400 hover:text-brand transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSuggestions ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingSuggestions && suggestions.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <Loader2 className="w-8 h-8 text-brand animate-spin mb-3" />
                <p className="text-xs text-slate-400">Analyzing your CRM data...</p>
              </div>
            )}

            {!loadingSuggestions && suggestions.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <Sparkles className="w-8 h-8 text-slate-200 mb-3" />
                <p className="text-xs text-slate-400">No suggestions yet. Add more contacts and data to get AI-powered recommendations.</p>
              </div>
            )}

            {suggestions.map((s, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => sendMessage(s.description)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    s.priority === 'high' ? 'bg-rose-50 text-rose-500' :
                    s.priority === 'medium' ? 'bg-amber-50 text-amber-500' :
                    'bg-emerald-50 text-emerald-500'
                  }`}>
                    {suggestionIcons[s.type] || <Lightbulb className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{s.title}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${priorityColors[s.priority] || priorityColors.low}`}>
                        {s.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.description}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-brand transition-colors shrink-0 mt-0.5" />
                </div>
              </div>
            ))}

            {/* CRM Quick Stats */}
            <div className="mt-6 bg-slate-900 rounded-xl p-5 text-white">
              <h4 className="text-xs font-bold text-slate-400 mb-4">CRM SNAPSHOT</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{contacts.length}</p>
                  <p className="text-xs text-slate-400">Total Contacts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{contacts.filter(c => c.status === 'Lead').length}</p>
                  <p className="text-xs text-slate-400">Active Leads</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{appointments.length}</p>
                  <p className="text-xs text-slate-400">Appointments</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{contacts.length > 0 ? Math.round(contacts.reduce((sum, c) => sum + c.leadScore, 0) / contacts.length) : 0}</p>
                  <p className="text-xs text-slate-400">Avg Lead Score</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {rightTab === 'settings' && (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-2">Agent Name</label>
                <input
                  type="text"
                  value={agentConfig.name}
                  onChange={e => handleConfigChange(c => ({ ...c, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/20"
                  placeholder="e.g. Sarah, CRM Assistant"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-2">Primary Goal</label>
                <select
                  value={agentConfig.goal}
                  onChange={e => handleConfigChange(c => ({ ...c, goal: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="Help manage the CRM and provide actionable insights">General CRM Assistant</option>
                  <option value="Qualify leads by understanding their needs and budget">Lead Qualification</option>
                  <option value="Book appointments and manage the calendar">Appointment Booking</option>
                  <option value="Draft and optimize outbound messages">Message Optimization</option>
                  <option value="Analyze pipeline health and predict outcomes">Pipeline Analysis</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-2">Custom Instructions</label>
                <textarea
                  value={agentConfig.instructions}
                  onChange={e => handleConfigChange(c => ({ ...c, instructions: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                  placeholder="Add custom behavior instructions for your AI agent..."
                />
              </div>

              <button
                onClick={handleSaveConfig}
                className="w-full py-3 bg-brand text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all"
              >
                Save Configuration
              </button>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-5 h-5 text-brand" />
                <h4 className="text-sm font-bold text-slate-900">Capabilities</h4>
              </div>
              <ul className="space-y-2.5">
                {[
                  'Contextual CRM conversations',
                  'Smart message drafting',
                  'Lead scoring recommendations',
                  'Appointment scheduling',
                  'Pipeline analysis & insights',
                  'Proactive action suggestions',
                ].map(cap => (
                  <li key={cap} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {cap}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default AIEmployee;

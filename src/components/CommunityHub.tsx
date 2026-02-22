
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Hash, Plus, Trash2, X, Loader2, Users, MessageCircle,
  Send, MessageSquare, TrendingUp,
} from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import type { Channel, CommunityMessage } from '../types';
import { NexusHeader } from './NexusUI';

// ── Component ──

const CommunityHub: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();

  // ── Channel state ──
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // ── Message state ──
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ── Compose state ──
  const [composeText, setComposeText] = useState('');
  const [sending, setSending] = useState(false);

  // ── Create channel modal state ──
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);

  // ── Delete in-progress tracking ──
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch channels ──
  const fetchChannels = useCallback(async () => {
    if (!activeSubAccountId) return;
    setLoadingChannels(true);
    try {
      const data = await api.get<Channel[]>(`/community/channels?subAccountId=${activeSubAccountId}`);
      setChannels(data);
      // Auto-select first channel if none selected
      if (data.length > 0 && !selectedChannelId) {
        setSelectedChannelId(data[0].id);
      }
    } catch {
      notify('Failed to load channels', 'error');
    } finally {
      setLoadingChannels(false);
    }
  }, [activeSubAccountId, notify, selectedChannelId]);

  useEffect(() => {
    setSelectedChannelId(null);
    setMessages([]);
    fetchChannels();
  }, [activeSubAccountId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch messages when channel changes ──
  const fetchMessages = useCallback(async (channelId: string) => {
    setLoadingMessages(true);
    try {
      const data = await api.get<CommunityMessage[]>(`/community/messages/${channelId}`);
      setMessages(data);
    } catch {
      notify('Failed to load messages', 'error');
    } finally {
      setLoadingMessages(false);
    }
  }, [notify]);

  useEffect(() => {
    if (selectedChannelId) {
      fetchMessages(selectedChannelId);
    } else {
      setMessages([]);
    }
  }, [selectedChannelId, fetchMessages]);

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Select channel ──
  const selectChannel = useCallback((channelId: string) => {
    setSelectedChannelId(channelId);
    setComposeText('');
  }, []);

  // ── Create channel ──
  const handleCreateChannel = useCallback(async () => {
    if (!formName.trim()) {
      notify('Channel name is required', 'error');
      return;
    }
    setCreatingChannel(true);
    try {
      const created = await api.post<Channel>('/community/channels', {
        subAccountId: activeSubAccountId,
        name: formName.trim(),
        description: formDescription.trim(),
      });
      setChannels(prev => [...prev, created]);
      setSelectedChannelId(created.id);
      setModalOpen(false);
      setFormName('');
      setFormDescription('');
      notify('Channel created');
    } catch {
      notify('Failed to create channel', 'error');
    } finally {
      setCreatingChannel(false);
    }
  }, [formName, formDescription, activeSubAccountId, notify]);

  // ── Delete channel ──
  const deleteChannel = useCallback(async (id: string) => {
    setDeletingChannelId(id);
    try {
      await api.delete(`/community/channels/${id}`);
      setChannels(prev => prev.filter(c => c.id !== id));
      if (selectedChannelId === id) {
        setSelectedChannelId(null);
        setMessages([]);
      }
      notify('Channel deleted');
    } catch {
      notify('Failed to delete channel', 'error');
    } finally {
      setDeletingChannelId(null);
    }
  }, [selectedChannelId, notify]);

  // ── Send message ──
  const handleSendMessage = useCallback(async () => {
    if (!composeText.trim() || !selectedChannelId) return;
    setSending(true);
    try {
      const created = await api.post<CommunityMessage>('/community/messages', {
        channelId: selectedChannelId,
        authorName: 'You',
        content: composeText.trim(),
      });
      setMessages(prev => [...prev, created]);
      setComposeText('');
    } catch {
      notify('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  }, [composeText, selectedChannelId, notify]);

  // ── Delete message ──
  const deleteMessage = useCallback(async (id: string) => {
    setDeletingMessageId(id);
    try {
      await api.delete(`/community/messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
      notify('Message deleted');
    } catch {
      notify('Failed to delete message', 'error');
    } finally {
      setDeletingMessageId(null);
    }
  }, [notify]);

  // ── Modal helpers ──
  const openCreateModal = useCallback(() => {
    setFormName('');
    setFormDescription('');
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setFormName('');
    setFormDescription('');
  }, []);

  // ── Derived data ──
  const selectedChannel = channels.find(c => c.id === selectedChannelId) || null;

  // ── Format timestamp ──
  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // ── Render ──
  return (
    <div className="pb-20 animate-in fade-in duration-700">
      <NexusHeader title="Communities" subtitle="Build and engage communities with forums, groups, and discussions" />

      {/* ── Two-panel layout ── */}
      <div className="h-[calc(100vh-220px)] flex gap-6">
        {/* ── Left sidebar: channel list ── */}
        <div className="w-64 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm">Channels</h3>
            <button
              onClick={openCreateModal}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400 hover:text-brand"
              title="Add Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingChannels ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-brand animate-spin" />
              </div>
            ) : channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <Hash className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 font-medium">No channels yet</p>
                <p className="text-xs text-slate-400 mt-1">Create your first channel to get started</p>
              </div>
            ) : (
              channels.map(channel => (
                <div
                  key={channel.id}
                  className="group relative"
                >
                  <button
                    onClick={() => selectChannel(channel.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      selectedChannelId === channel.id
                        ? 'bg-indigo-50 text-brand font-bold'
                        : 'hover:bg-slate-50 text-slate-500 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Hash className={`w-4 h-4 shrink-0 ${
                        selectedChannelId === channel.id ? 'text-brand' : 'text-slate-300'
                      }`} />
                      <span className="text-xs truncate">{channel.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-normal">{channel.memberCount}</span>
                      {selectedChannelId === channel.id && (
                        <div className="w-1.5 h-1.5 bg-brand rounded-full shrink-0" />
                      )}
                    </div>
                  </button>

                  {/* Delete button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChannel(channel.id);
                    }}
                    disabled={deletingChannelId === channel.id}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-rose-500 hover:border-rose-200 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="Delete channel"
                  >
                    {deletingChannelId === channel.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Main panel: messages ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {selectedChannel ? (
            <>
              {/* Channel header */}
              <div className="h-16 border-b border-slate-100 px-8 flex items-center justify-between bg-white/80 backdrop-blur shrink-0">
                <div className="flex items-center gap-4">
                  <h3 className="font-semibold text-slate-900 text-lg"># {selectedChannel.name}</h3>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {selectedChannel.memberCount} Members
                  </span>
                </div>
              </div>

              {/* Message list */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-brand animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-slate-400" />
                    </div>
                    <h4 className="font-bold text-slate-800">No messages yet</h4>
                    <p className="text-sm text-slate-500 max-w-xs mt-2">
                      Be the first to start a conversation in #{selectedChannel.name}
                    </p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className="flex gap-4 group">
                      {/* Avatar placeholder */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-indigo-600">
                          {msg.authorName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-semibold text-slate-900 text-sm">{msg.authorName}</span>
                          <span className="text-xs text-slate-400">{formatTime(msg.createdAt)} &middot; {formatDate(msg.createdAt)}</span>
                        </div>
                        <div className="relative">
                          <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl rounded-tl-none border border-slate-100 shadow-sm">
                            {msg.content}
                          </p>
                          {/* Delete message on hover */}
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            disabled={deletingMessageId === msg.id}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-rose-500 hover:border-rose-200 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Delete message"
                          >
                            {deletingMessageId === msg.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <TrendingUp className="w-3.5 h-3.5" /> {msg.likes} Likes
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <MessageSquare className="w-3.5 h-3.5" /> {msg.replies} Replies
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose bar */}
              <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    value={composeText}
                    onChange={e => setComposeText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Message #${selectedChannel.name}...`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all pr-16"
                    disabled={sending}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !composeText.trim()}
                      className="p-2 bg-brand text-white rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition"
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // No channel selected empty state
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-slate-400" />
              </div>
              <h4 className="font-bold text-slate-800 text-lg">Welcome to Community Hub</h4>
              <p className="text-sm text-slate-500 max-w-sm mt-2">
                {channels.length === 0
                  ? 'Create your first channel to start building your community.'
                  : 'Select a channel from the sidebar to view and participate in conversations.'}
              </p>
              {channels.length === 0 && !loadingChannels && (
                <button
                  onClick={openCreateModal}
                  className="mt-6 px-6 py-3 bg-brand text-white rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90 transition"
                >
                  <Plus className="w-5 h-5" /> Create First Channel
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Channel Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Create Channel</h3>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-slate-100 transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Channel name */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Channel Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. General Discussion"
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateChannel();
                    }
                  }}
                />
              </div>

              {/* Channel description */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Description</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="What is this channel about?"
                  rows={3}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 rounded-2xl hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={creatingChannel || !formName.trim()}
                className="px-6 py-2.5 bg-brand text-white rounded-2xl font-bold text-sm shadow-lg hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
              >
                {creatingChannel && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityHub;


import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Search, Grid, Mic, MicOff, Trash2, MoreHorizontal, X, Loader2,
  AlertCircle, Delete, Clock, Play, Voicemail,
} from 'lucide-react';
import { CallLog } from '../types';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import { NexusHeader } from './NexusUI';

// ── Helpers ──

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function statusBadgeClasses(status: CallLog['status']): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'missed':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'failed':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'initiated':
    case 'ringing':
    case 'in_progress':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'voicemail':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function directionIcon(direction: CallLog['direction'], status: CallLog['status']) {
  if (status === 'missed') {
    return <PhoneMissed className="w-5 h-5" />;
  }
  return direction === 'inbound'
    ? <PhoneIncoming className="w-5 h-5" />
    : <PhoneOutgoing className="w-5 h-5" />;
}

function parseNotes(notes: string): { display: string; summary?: string; outcome?: string; keyPoints?: string[]; nextAction?: string; raw: string } {
  if (!notes) return { display: '', raw: '' };
  try {
    const parsed = JSON.parse(notes);
    return {
      display: parsed.summary || notes,
      summary: parsed.summary,
      outcome: parsed.outcome,
      keyPoints: parsed.keyPoints,
      nextAction: parsed.nextAction,
      raw: notes,
    };
  } catch {
    return { display: notes, raw: notes };
  }
}

// ── Component ──

const PhoneSystem: React.FC = () => {
  const { activeSubAccountId, notify, contacts } = useNexus();

  // Data state
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [voiceStatus, setVoiceStatus] = useState<{ configured: boolean; phoneNumber: string | null }>({
    configured: false,
    phoneNumber: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [dialerOpen, setDialerOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  // ── Fetch data on mount / sub-account change ──

  useEffect(() => {
    if (!activeSubAccountId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [logsData, statusData] = await Promise.all([
          api.get<CallLog[]>(`/phone/logs?subAccountId=${activeSubAccountId}`).catch(() => [] as CallLog[]),
          api.get<{ configured: boolean; phoneNumber: string | null }>('/phone/status').catch(() => ({
            configured: false,
            phoneNumber: null,
          })),
        ]);
        setCallLogs(logsData);
        setVoiceStatus(statusData);
      } catch {
        // keep defaults on failure
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeSubAccountId]);

  // ── Filtered logs ──

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return callLogs;
    const q = searchQuery.toLowerCase();
    return callLogs.filter(
      (log) => log.contactName.toLowerCase().includes(q) || log.contactPhone.includes(q),
    );
  }, [callLogs, searchQuery]);

  // ── Stats ──

  const stats = useMemo(() => {
    const total = callLogs.length;
    const completed = callLogs.filter((l) => l.status === 'completed').length;
    const missed = callLogs.filter((l) => l.status === 'missed').length;
    const completedLogs = callLogs.filter((l) => l.status === 'completed' && l.duration > 0);
    const avgDuration = completedLogs.length > 0
      ? Math.round(completedLogs.reduce((sum, l) => sum + l.duration, 0) / completedLogs.length)
      : 0;
    return { total, completed, missed, avgDuration };
  }, [callLogs]);

  // ── Contact quick-search for dialer ──

  const matchedContacts = useMemo(() => {
    if (!contactSearch.trim()) return [];
    const q = contactSearch.toLowerCase();
    return contacts
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 5);
  }, [contacts, contactSearch]);

  // ── Actions ──

  const handleDial = (num: string) => {
    setDialNumber((prev) => prev + num);
  };

  const handleBackspace = () => {
    setDialNumber((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDialNumber('');
    setSelectedContactId(null);
    setContactSearch('');
  };

  const handleSelectContact = (contactId: string, phone: string) => {
    setSelectedContactId(contactId);
    setDialNumber(phone);
    setContactSearch('');
  };

  const handleCall = async () => {
    if (!selectedContactId || !activeSubAccountId) {
      notify('Please select a contact to call', 'error');
      return;
    }

    setIsCalling(true);
    try {
      const newLog = await api.post<CallLog>('/phone/call', {
        contactId: selectedContactId,
        subAccountId: activeSubAccountId,
      });
      setCallLogs((prev) => [newLog, ...prev]);
      notify(`Call initiated to ${newLog.contactName}`);
      setDialNumber('');
      setSelectedContactId(null);
      setContactSearch('');
    } catch (err: any) {
      notify(err.message || 'Failed to initiate call', 'error');
    } finally {
      setIsCalling(false);
    }
  };

  const handleSaveNotes = async (logId: string) => {
    const notes = editingNotes[logId];
    if (notes === undefined) return;

    try {
      const updated = await api.put<CallLog>(`/phone/logs/${logId}`, { notes });
      setCallLogs((prev) => prev.map((l) => (l.id === logId ? updated : l)));
      setEditingNotes((prev) => {
        const next = { ...prev };
        delete next[logId];
        return next;
      });
      notify('Notes saved');
    } catch {
      notify('Failed to save notes', 'error');
    }
  };

  // ── Render ──

  return (
    <div className="pb-20">
      <NexusHeader title="Phone System" subtitle="Make calls, view call history, and manage your phone communications" />
      {/* Twilio configuration banner */}
      {!voiceStatus.configured && !isLoading && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">Voice calling requires Twilio configuration</h3>
            <p className="text-xs text-blue-700 mt-1">
              Add <code className="rounded bg-blue-100 px-1 py-0.5 text-xs font-mono">TWILIO_ACCOUNT_SID</code>,{' '}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-xs font-mono">TWILIO_AUTH_TOKEN</code>, and{' '}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-xs font-mono">TWILIO_PHONE_NUMBER</code> to your environment.
            </p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Calls', value: stats.total, icon: Phone },
          { label: 'Completed', value: stats.completed, icon: PhoneCall },
          { label: 'Missed', value: stats.missed, icon: PhoneMissed },
          { label: 'Avg Duration', value: formatDuration(stats.avgDuration), icon: Clock },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50">
              <stat.icon className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Call History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Call History</h2>
            <p className="text-xs text-slate-500 mt-1">
              {voiceStatus.phoneNumber
                ? `Outbound from ${voiceStatus.phoneNumber}`
                : 'Unified logs for outbound and inbound calls'}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50" style={{ maxHeight: '60vh' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              <span className="ml-2 text-sm text-slate-400">Loading call logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Phone className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">
                {searchQuery ? 'No calls match your search' : 'No call history yet'}
              </p>
              <p className="text-xs mt-1">
                {searchQuery ? 'Try a different search term' : 'Use the dialer to make your first call'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="group">
                <div className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Direction icon */}
                    <div
                      className={`p-3 rounded-xl flex-shrink-0 ${
                        log.status === 'missed'
                          ? 'bg-rose-50 text-rose-500'
                          : log.status === 'failed'
                            ? 'bg-amber-50 text-amber-500'
                            : 'bg-emerald-50 text-emerald-500'
                      }`}
                    >
                      {directionIcon(log.direction, log.status)}
                    </div>

                    {/* Contact info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          className="font-bold text-slate-900 text-sm hover:text-brand transition-colors truncate"
                        >
                          {log.contactName}
                        </button>
                        {log.recordingUrl && (
                          <span title="Recording available"><Play className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /></span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium text-slate-400">{log.contactPhone}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="text-xs font-medium text-slate-400">
                          {new Date(log.startedAt).toLocaleString()}
                        </span>
                        {log.duration > 0 && (
                          <>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-xs font-medium text-slate-400">
                              {formatDuration(log.duration)}
                            </span>
                          </>
                        )}
                      </div>
                      {log.notes && expandedLogId !== log.id && (
                        <p className="text-xs text-slate-400 mt-1 truncate max-w-md">{parseNotes(log.notes).display}</p>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeClasses(log.status)}`}
                    >
                      {log.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                      className="p-2 text-slate-400 hover:text-brand hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {expandedLogId === log.id && (
                  <div className="px-4 pb-4 pt-0 bg-slate-50 border-t border-slate-100">
                    <div className="rounded-lg bg-white border border-slate-200 p-4">
                      <div className="grid grid-cols-3 gap-4 text-xs mb-4">
                        <div>
                          <span className="text-slate-400 font-medium">Direction</span>
                          <p className="text-slate-700 font-semibold capitalize mt-0.5">{log.direction}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium">Duration</span>
                          <p className="text-slate-700 font-semibold mt-0.5">{formatDuration(log.duration)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium">Started</span>
                          <p className="text-slate-700 font-semibold mt-0.5">
                            {new Date(log.startedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {log.endedAt && (
                        <div className="text-xs mb-4">
                          <span className="text-slate-400 font-medium">Ended</span>
                          <p className="text-slate-700 font-semibold mt-0.5">
                            {new Date(log.endedAt).toLocaleString()}
                          </p>
                        </div>
                      )}

                      {log.recordingUrl && (
                        <div className="mb-4">
                          <a
                            href={log.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline font-medium"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Listen to recording
                          </a>
                        </div>
                      )}

                      {/* Notes / AI Summary */}
                      <div>
                        <label className="text-xs text-slate-400 font-medium block mb-1">Notes</label>
                        {(() => {
                          const parsed = parseNotes(log.notes);
                          if (parsed.summary) {
                            return (
                              <div className="space-y-2">
                                <p className="text-xs text-slate-700 leading-relaxed">{parsed.summary}</p>
                                {parsed.outcome && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">Outcome:</span>
                                    <span className="text-xs font-semibold text-slate-700 capitalize">{parsed.outcome.replace(/_/g, ' ')}</span>
                                  </div>
                                )}
                                {parsed.keyPoints && parsed.keyPoints.length > 0 && (
                                  <div>
                                    <span className="text-xs text-slate-400">Key Points:</span>
                                    <ul className="mt-1 space-y-0.5">
                                      {parsed.keyPoints.map((point, i) => (
                                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                                          <span className="text-slate-300 mt-0.5">•</span>{point}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {parsed.nextAction && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">Next Action:</span>
                                    <span className="text-xs font-medium text-brand">{parsed.nextAction}</span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return (
                            <>
                              <textarea
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                                rows={3}
                                placeholder="Add notes about this call..."
                                value={editingNotes[log.id] !== undefined ? editingNotes[log.id] : log.notes}
                                onChange={(e) =>
                                  setEditingNotes((prev) => ({ ...prev, [log.id]: e.target.value }))
                                }
                              />
                              {editingNotes[log.id] !== undefined && editingNotes[log.id] !== log.notes && (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleSaveNotes(log.id)}
                                    className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() =>
                                      setEditingNotes((prev) => {
                                        const next = { ...prev };
                                        delete next[log.id];
                                        return next;
                                      })
                                    }
                                    className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Dialer Panel */}
      <div
        className={`
          fixed bottom-24 right-8 w-80 z-40 transition-all duration-300 transform
          ${dialerOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95 pointer-events-none'}
        `}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-900">Dialer</span>
            <button
              onClick={() => setDialerOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contact quick-search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={contactSearch}
              onChange={(e) => {
                setContactSearch(e.target.value);
                setSelectedContactId(null);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
            {matchedContacts.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                {matchedContacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectContact(c.id, c.phone)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <span className="text-xs font-medium text-slate-700 truncate">{c.name}</span>
                    <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Number display */}
          <div className="mb-4 text-center bg-slate-50 rounded-xl py-3 px-4">
            <input
              type="text"
              value={dialNumber}
              readOnly
              className="bg-transparent border-none text-slate-900 text-2xl font-bold w-full text-center focus:outline-none focus:ring-0"
              placeholder="Enter number"
            />
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((num) => (
              <button
                key={num}
                onClick={() => handleDial(num.toString())}
                className="w-14 h-14 rounded-full bg-slate-50 text-slate-900 text-lg font-bold hover:bg-slate-100 transition-all mx-auto border border-slate-200"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleClear}
              className="p-3 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
              title="Clear"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <button
              onClick={handleCall}
              disabled={!voiceStatus.configured || isCalling || !selectedContactId}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500"
              title={!voiceStatus.configured ? 'Voice calling not configured' : 'Call'}
            >
              {isCalling ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Phone className="w-6 h-6 fill-current" />
              )}
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-full transition-colors ${
                isMuted
                  ? 'bg-rose-100 text-rose-500 hover:bg-rose-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={handleBackspace}
              className="p-3 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
              title="Backspace"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Selected contact indicator */}
          {selectedContactId && (
            <div className="mt-3 text-center">
              <span className="text-xs text-emerald-600 font-medium">
                Calling: {contacts.find((c) => c.id === selectedContactId)?.name || 'Contact'}
              </span>
            </div>
          )}

          {!voiceStatus.configured && (
            <p className="mt-3 text-center text-xs text-amber-600">
              Configure Twilio to enable calling
            </p>
          )}
        </div>
      </div>

      {/* Floating toggle button */}
      <button
        onClick={() => setDialerOpen(!dialerOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-brand text-white rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center transition-transform hover:scale-105 z-50"
      >
        {dialerOpen ? <X className="w-7 h-7" /> : <Grid className="w-7 h-7" />}
      </button>
    </div>
  );
};

export default PhoneSystem;

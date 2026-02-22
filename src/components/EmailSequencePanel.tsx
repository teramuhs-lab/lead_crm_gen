import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Sparkles, Settings, Edit2, Loader2, Play, Pause, CheckCircle2, X,
  Send, Clock, Eye, MousePointerClick, MessageSquare,
} from 'lucide-react';
import { Contact, EmailSequence, SequenceEnrollment, SequenceEmail } from '../types';
import { api } from '../lib/api';

interface EmailSequencePanelProps {
  contact: Contact;
  subAccountId: string;
}

const EmailSequencePanel: React.FC<EmailSequencePanelProps> = ({ contact, subAccountId }) => {
  const [sequence, setSequence] = useState<EmailSequence | null>(null);
  const [enrollment, setEnrollment] = useState<SequenceEnrollment | null>(null);
  const [activeEmailIndex, setActiveEmailIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editChannel, setEditChannel] = useState<'email' | 'sms'>('email');
  const [editDelay, setEditDelay] = useState(0);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!contact?.id || !subAccountId) return;
    setIsLoading(true);
    try {
      // Check if contact has an existing enrollment
      const enrollments = await api.get<any[]>(`/sequences/contact/${contact.id}`);
      const active = enrollments.find(e => e.status === 'active' || e.status === 'completed' || e.status === 'paused');

      if (active && active.sequence) {
        setEnrollment(active);
        setSequence(active.sequence);
      } else {
        // Check for existing sequences in this sub-account
        const sequences = await api.get<EmailSequence[]>(`/sequences?subAccountId=${subAccountId}`);
        if (sequences.length > 0) {
          setSequence(sequences[0]);
        } else {
          // Auto-create a default sequence
          const newSeq = await api.post<EmailSequence>('/sequences', { subAccountId });
          setSequence(newSeq);
        }
        setEnrollment(null);
      }
    } catch (err) {
      console.error('Failed to load sequence data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contact?.id, subAccountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for WebSocket sequence events
  useEffect(() => {
    const handleWsMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'sequence:email_sent' && data.payload?.contactId === contact.id) {
          loadData();
        }
      } catch { /* ignore non-JSON */ }
    };

    // Find existing WebSocket connection
    const ws = (window as any).__nexusWs;
    if (ws) {
      ws.addEventListener('message', handleWsMessage);
      return () => ws.removeEventListener('message', handleWsMessage);
    }
  }, [contact.id, loadData]);

  const activeEmail: SequenceEmail | null = sequence?.emails?.[activeEmailIndex] ?? null;

  const handleGenerateEmails = async () => {
    if (!sequence || isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await api.post<{ emails: SequenceEmail[] }>(`/sequences/${sequence.id}/generate`, {
        contactId: contact.id,
        subAccountId,
      });
      setSequence(prev => prev ? { ...prev, emails: result.emails } : prev);
      setActiveEmailIndex(0);
    } catch (err) {
      console.error('Failed to generate emails:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartSequence = async () => {
    if (!sequence || isEnrolling) return;
    setIsEnrolling(true);
    setEnrollError(null);
    try {
      const newEnrollment = await api.post<SequenceEnrollment>(`/sequences/${sequence.id}/enroll`, {
        contactId: contact.id,
      });
      setEnrollment(newEnrollment);
    } catch (err: any) {
      const message = err?.message || 'Failed to start sequence';
      setEnrollError(message);
      console.error('Failed to start sequence:', err);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (!sequence || !enrollment) return;
    try {
      await api.delete(`/sequences/${sequence.id}/enrollments/${enrollment.id}`);
      setEnrollment(null);
      loadData();
    } catch (err) {
      console.error('Failed to unenroll:', err);
    }
  };

  const handleSaveEmail = async () => {
    if (!sequence || !activeEmail) return;
    try {
      const updated = await api.put<SequenceEmail>(`/sequences/${sequence.id}/emails/${activeEmail.id}`, {
        subject: editSubject,
        body: editBody,
        channel: editChannel,
        delayMinutes: editDelay,
      });
      setSequence(prev => {
        if (!prev) return prev;
        const emails = [...prev.emails];
        emails[activeEmailIndex] = updated;
        return { ...prev, emails };
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save email:', err);
    }
  };

  const startEditing = () => {
    if (!activeEmail) return;
    setEditSubject(activeEmail.subject);
    setEditBody(activeEmail.body);
    setEditChannel(activeEmail.channel || 'email');
    setEditDelay(activeEmail.delayMinutes);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const sentCount = enrollment?.sentCount ?? 0;
  const totalEmails = sequence?.emailCount ?? 3;
  const hasContent = sequence?.emails?.some(e => e.body) ?? false;
  const isActive = enrollment?.status === 'active';
  const isCompleted = enrollment?.status === 'completed';

  if (isLoading) {
    return (
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="w-4 h-4 animate-spin text-brand" />
          <span className="text-sm text-slate-400">Loading sequence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-b border-slate-100 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-brand" />
          <h4 className="text-sm font-semibold text-slate-900">Email Sequence</h4>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isCompleted ? 'bg-emerald-50 text-emerald-600' :
            isActive ? 'bg-amber-50 text-amber-600' :
            'bg-indigo-50 text-brand'
          }`}>
            {sentCount}/{totalEmails} sent
          </span>
          {(enrollment?.openCount ?? 0) > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100 flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" /> {enrollment!.openCount}
            </span>
          )}
          {(enrollment?.clickCount ?? 0) > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 flex items-center gap-0.5">
              <MousePointerClick className="w-2.5 h-2.5" /> {enrollment!.clickCount}
            </span>
          )}
          {(enrollment?.replyCount ?? 0) > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-0.5">
              <MessageSquare className="w-2.5 h-2.5" /> {enrollment!.replyCount}
            </span>
          )}
        </div>
      </div>

      {/* Generate + Settings */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerateEmails}
          disabled={isGenerating || isActive}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isGenerating ? 'Generating...' : 'Generate AI Emails'}
        </button>
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Email Tabs */}
      <div className="flex gap-1">
        {sequence?.emails?.map((email, i) => {
          const isSent = i < sentCount;
          const isCurrent = i === activeEmailIndex;

          return (
            <button
              key={email.id}
              onClick={() => { setActiveEmailIndex(i); setIsEditing(false); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all relative ${
                isCurrent
                  ? 'bg-brand text-white shadow-sm'
                  : isSent
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isSent && !isCurrent && (
                <CheckCircle2 className="w-3 h-3 absolute top-0.5 right-0.5" />
              )}
              {email.channel === 'sms' ? <MessageSquare className="w-3 h-3 inline mr-0.5" /> : <Mail className="w-3 h-3 inline mr-0.5" />}
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Active Email Content */}
      {activeEmail && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-brand">
                {activeEmail.label}
              </span>
              {activeEmail.delayMinutes > 0 && (
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {activeEmail.delayMinutes >= 1440
                    ? `${Math.round(activeEmail.delayMinutes / 1440)}d delay`
                    : `${activeEmail.delayMinutes}m delay`}
                </span>
              )}
            </div>
            {!isActive && !isCompleted && (
              <button
                onClick={isEditing ? cancelEditing : startEditing}
                className="text-xs text-brand hover:underline flex items-center gap-1"
              >
                {isEditing ? (
                  <><X className="w-3 h-3" /> Cancel</>
                ) : (
                  <><Edit2 className="w-3 h-3" /> Edit</>
                )}
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-500 mb-1 block">Channel</label>
                  <select
                    value={editChannel}
                    onChange={(e) => setEditChannel(e.target.value as 'email' | 'sms')}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 mb-1 block">Delay</label>
                  <select
                    value={editDelay}
                    onChange={(e) => setEditDelay(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                  >
                    <option value={0}>Immediately</option>
                    <option value={60}>1 hour</option>
                    <option value={240}>4 hours</option>
                    <option value={480}>8 hours</option>
                    <option value={1440}>1 day</option>
                    <option value={2880}>2 days</option>
                    <option value={4320}>3 days</option>
                    <option value={7200}>5 days</option>
                    <option value={10080}>7 days</option>
                  </select>
                </div>
              </div>
              {editChannel === 'email' && (
                <div>
                  <label className="text-[10px] font-medium text-slate-500 mb-1 block">Subject</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                    placeholder="Email subject..."
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-medium text-slate-500 mb-1 block">
                  {editChannel === 'sms' ? 'Message' : 'Body'}
                  {editChannel === 'sms' && <span className="text-slate-400 ml-1">({editBody.length}/480)</span>}
                </label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(editChannel === 'sms' ? e.target.value.slice(0, 480) : e.target.value)}
                  rows={editChannel === 'sms' ? 3 : 5}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none"
                  placeholder={editChannel === 'sms' ? 'SMS message...' : 'Email body...'}
                />
              </div>
              <button
                onClick={handleSaveEmail}
                className="px-4 py-1.5 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Save
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium text-slate-500">
                Subject: <span className="text-slate-700">{activeEmail.subject || 'No subject'}</span>
              </p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {activeEmail.body || 'No content yet. Click "Generate AI Emails" to create personalized emails.'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Enrollment Error */}
      {enrollError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-3 h-3 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700">{enrollError}</span>
        </div>
      )}

      {/* Action Buttons */}
      {!enrollment && hasContent && (
        <button
          onClick={handleStartSequence}
          disabled={isEnrolling}
          className="w-full py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isEnrolling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isEnrolling ? 'Starting...' : 'Start Sequence'}
        </button>
      )}

      {isActive && (
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-amber-700">Sequence active</span>
          </div>
          <button
            onClick={handleUnenroll}
            className="px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
          >
            <Pause className="w-3 h-3" /> Stop
          </button>
        </div>
      )}

      {enrollment?.status === 'paused' && (
        <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg space-y-1">
          <div className="flex items-center gap-2">
            <Pause className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium text-orange-700">
              Sequence paused
              {enrollment.pausedReason === 'reply_detected' && ' — reply detected'}
              {enrollment.pausedReason === 'no_delivery_address' && ' — missing contact info'}
              {enrollment.pausedReason === 'no_sequence_emails' && ' — no emails configured'}
              {enrollment.pausedReason === 'empty_email_body' && ' — email content is empty'}
              {enrollment.pausedReason === 'contact_deleted' && ' — contact was deleted'}
            </span>
          </div>
          {enrollment.pausedReason === 'no_delivery_address' && (
            <p className="text-[10px] text-orange-600 ml-6">
              Add an email address to this contact, then re-enroll to resume.
            </p>
          )}
          {enrollment.pausedReason === 'no_sequence_emails' && (
            <p className="text-[10px] text-orange-600 ml-6">
              This sequence has no email steps. Add emails to the sequence first.
            </p>
          )}
          {enrollment.pausedReason === 'empty_email_body' && (
            <p className="text-[10px] text-orange-600 ml-6">
              Generate or write email content, then re-enroll the contact.
            </p>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700">Sequence completed</span>
        </div>
      )}
    </div>
  );
};

export default EmailSequencePanel;

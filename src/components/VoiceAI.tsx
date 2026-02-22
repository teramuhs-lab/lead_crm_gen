
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Mic, Phone, X, Activity, BrainCircuit, Waves, Zap, Loader2, Trash2, Clock, Wifi, Settings2, User, Volume2, Timer, Search, CheckCircle2, ArrowRight, RotateCcw, FileText } from 'lucide-react';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { useNexus } from '../context/NexusContext';
import { Contact } from '../types';
import { api } from '../lib/api';
import { NexusHeader } from './NexusUI';

interface CallSummary {
  summary: string;
  outcome: string;
  keyPoints: string[];
  nextAction: string;
  sentiment: string;
}

const OUTCOME_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  appointment_booked: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Appointment Booked' },
  lead_qualified: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Lead Qualified' },
  information_provided: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Information Provided' },
  follow_up_needed: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Follow-up Needed' },
  no_action: { bg: 'bg-slate-50', text: 'text-slate-500', label: 'No Action' },
};

const VoiceAI: React.FC = () => {
  const { contacts, activeSubAccount, notify } = useNexus();

  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState('Standby');
  const [transcription, setTranscription] = useState('');
  const [callDuration, setCallDuration] = useState(0);

  // CRM integration state
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [callSummary, setCallSummary] = useState<CallSummary | null>(null);
  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const transcriptionEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptionRef = useRef('');
  const callDurationRef = useRef(0);

  // Keep refs in sync with state for use in endCall
  useEffect(() => { transcriptionRef.current = transcription; }, [transcription]);
  useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);

  // Contact search
  const matchedContacts = useMemo(() => {
    if (!contactSearch.trim()) return [];
    const q = contactSearch.toLowerCase();
    return contacts
      .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 5);
  }, [contacts, contactSearch]);

  // Auto-scroll transcription to bottom
  useEffect(() => {
    if (transcriptionEndRef.current) {
      transcriptionEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcription]);

  // Call duration timer
  useEffect(() => {
    if (isCalling && status === 'Live Interaction Active') {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else if (!isCalling) {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [isCalling, status]);

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const wordCount = transcription.trim() ? transcription.trim().split(/\s+/).length : 0;

  const clearTranscription = useCallback(() => {
    setTranscription('');
  }, []);

  const getStatusColor = () => {
    if (status === 'Standby') return { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' };
    if (status.includes('Initializ') || status.includes('Loading') || status.includes('Logging')) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-400' };
    if (status === 'Live Interaction Active') return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-500' };
    if (status === 'Call Logged') return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' };
    if (status.includes('Error') || status.includes('not configured')) return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', dot: 'bg-rose-500' };
    return { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200', dot: 'bg-slate-400' };
  };

  const statusStyle = getStatusColor();

  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encodeBase64 = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const startCall = async () => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      alert('Web Audio API is not supported in this browser');
      return;
    }

    setIsCalling(true);
    setCallSummary(null);
    setShowSummary(false);
    setStatus('Loading CRM context...');

    try {
      // Fetch CRM-aware system prompt from server
      setIsLoadingPrompt(true);
      let systemPrompt = 'You are Sarah, a professional agency assistant for Nexus CRM. You help clients book appointments and qualify leads with a cheerful and professional tone.';

      if (activeSubAccount?.id) {
        try {
          const promptRes = await api.post<{ systemPrompt: string; contactName: string | null }>('/ai/voice-prompt', {
            subAccountId: activeSubAccount.id,
            contactId: selectedContact?.id || undefined,
          });
          systemPrompt = promptRes.systemPrompt;
        } catch (err) {
          console.warn('Failed to fetch voice prompt, using fallback:', err);
        }
      }
      setIsLoadingPrompt(false);

      setStatus('Initializing Nexus Live...');

      // Fetch API key from server (security: not exposed in frontend bundle)
      let apiKey = '';
      try {
        const tokenRes = await api.get<{ apiKey: string }>(`/ai/voice-token?subAccountId=${activeSubAccount?.id || ''}`);
        apiKey = tokenRes.apiKey;
      } catch {
        // Fallback to env var if server endpoint not available
        apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      }

      if (!apiKey) { setStatus('AI not configured'); setIsCalling(false); return; }
      const ai = new GoogleGenAI({ apiKey });

      // Initialize Contexts
      audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
      inputContextRef.current = new AudioCtx({ sampleRate: 16000 });

      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      if (inputContextRef.current.state === 'suspended') await inputContextRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('Live Interaction Active');
            if (inputContextRef.current) {
              const source = inputContextRef.current.createMediaStreamSource(stream);
              const scriptProcessor = inputContextRef.current.createScriptProcessor(4096, 1, 1);

              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  int16[i] = inputData[i] * 32768;
                }
                const pcmBlob = {
                  data: encodeBase64(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromise.then(session => {
                  if (session) session.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(inputContextRef.current.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              const ctx = audioContextRef.current;
              if (ctx) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

                const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
                const sourceNode = ctx.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(ctx.destination);
                sourceNode.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(sourceNode);
                sourceNode.onended = () => sourcesRef.current.delete(sourceNode);
              }
            }

            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => (prev + ' ' + message.serverContent?.outputTranscription?.text).trim());
            }
          },
          onerror: (e) => {
            console.error('Voice Error:', e);
            endCall();
          },
          onclose: () => endCall(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          outputAudioTranscription: {},
          systemInstruction: systemPrompt,
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      endCall();
    }
  };

  const endCall = async () => {
    // Capture values before state reset
    const finalTranscription = transcriptionRef.current;
    const finalDuration = callDurationRef.current;

    // Clean up audio resources
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    nextStartTimeRef.current = 0;

    setIsCalling(false);
    // Do NOT clear transcription — keep it visible for review

    // Post-call logging
    if (finalTranscription.trim() && activeSubAccount?.id) {
      setStatus('Logging call to CRM...');
      setIsLoggingCall(true);
      try {
        const result = await api.post<{ callLogId: string; summary: CallSummary | null }>('/ai/voice-log', {
          subAccountId: activeSubAccount.id,
          contactId: selectedContact?.id || undefined,
          transcription: finalTranscription,
          durationSeconds: finalDuration,
        });
        if (result.summary) {
          setCallSummary(result.summary);
          setShowSummary(true);
        }
        setStatus('Call Logged');
        notify('Voice call logged to CRM');
      } catch (err) {
        console.error('Failed to log call:', err);
        setStatus('Standby');
        notify('Call ended but failed to save to CRM', 'error');
      } finally {
        setIsLoggingCall(false);
      }
    } else {
      setStatus('Standby');
    }
  };

  const resetForNewCall = () => {
    setTranscription('');
    setCallSummary(null);
    setShowSummary(false);
    setCallDuration(0);
    setStatus('Standby');
  };

  useEffect(() => {
    return () => {
      if (isCalling) endCall();
    };
  }, [isCalling]);

  // Bar heights for the audio visualizer - deterministic per bar, animated via CSS
  const barConfigs = [
    { minH: 16, maxH: 40, duration: '0.4s', delay: '0s' },
    { minH: 24, maxH: 56, duration: '0.55s', delay: '0.1s' },
    { minH: 20, maxH: 64, duration: '0.35s', delay: '0.05s' },
    { minH: 24, maxH: 48, duration: '0.5s', delay: '0.15s' },
    { minH: 16, maxH: 36, duration: '0.45s', delay: '0.08s' },
  ];

  const outcomeStyle = callSummary ? (OUTCOME_STYLES[callSummary.outcome] || OUTCOME_STYLES.no_action) : null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto h-full flex flex-col pb-20">
      <NexusHeader title="Nexus Live Voice AI" subtitle="Have real-time voice conversations with your AI assistant powered by Gemini">
          {/* Call duration timer */}
          {isCalling && status === 'Live Interaction Active' && (
            <div className="px-4 py-1.5 rounded-full text-xs font-mono font-semibold bg-slate-900 text-white border border-slate-700 flex items-center gap-2">
              <Timer className="w-3 h-3 text-rose-400" />
              {formatDuration(callDuration)}
            </div>
          )}
          {/* Status badge with dynamic colors */}
          <div className={`px-4 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 transition-all ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
            {(status.includes('Initializ') || status.includes('Loading') || status.includes('Logging')) ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Activity className={`w-3 h-3 ${isCalling ? 'animate-pulse' : ''}`} />
            )}
            {status === 'Live Interaction Active' ? 'Active Session' : status === 'Standby' ? 'Ready to Connect' : status}
          </div>
          {/* Connection quality indicator */}
          <div className="relative" title={isCalling ? 'Connected' : 'Disconnected'}>
            <Wifi className={`w-4 h-4 ${isCalling ? 'text-emerald-500' : 'text-slate-300'}`} />
            <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${statusStyle.dot} ${isCalling && status === 'Live Interaction Active' ? 'animate-pulse' : ''}`}></div>
          </div>
      </NexusHeader>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Left Panel - Voice Interface (dark) */}
        <div className="lg:col-span-1 bg-slate-900 rounded-xl shadow-md overflow-hidden relative flex flex-col p-6 text-white border-8 border-white shadow-indigo-100/50">
          <div className="flex-1 flex flex-col items-center justify-center relative z-10">
            <div className={`
              w-44 h-44 rounded-full border-[10px] flex items-center justify-center transition-all duration-1000
              ${isCalling ? 'border-brand shadow-[0_0_80px_rgba(99,102,241,0.4)] scale-110' : 'border-slate-800 scale-100'}
            `}>
              <div className={`w-28 h-28 rounded-full bg-slate-800 flex items-center justify-center transition-transform ${isCalling ? 'scale-90' : 'scale-100'}`}>
                {isCalling ? (
                  <div className="flex gap-1 items-end">
                    {barConfigs.map((bar, i) => (
                      <div
                        key={i}
                        className="w-2 bg-brand rounded-full"
                        style={{
                          animation: `voiceBar-${i} ${bar.duration} ease-in-out ${bar.delay} infinite alternate`,
                          height: `${bar.minH}px`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Mic className="w-10 h-10 text-slate-600" />
                )}
              </div>
            </div>

            <div className="mt-10 text-center space-y-3">
              <h3 className="text-2xl font-semibold">{isCalling ? 'Sarah Agent' : 'Voice Sandbox'}</h3>
              {selectedContact && (
                <p className="text-xs text-slate-400">
                  Speaking with <span className="text-white font-medium">{selectedContact.name}</span>
                </p>
              )}
              <div className="flex items-center justify-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${statusStyle.dot} ${isCalling && status === 'Live Interaction Active' ? 'animate-ping' : ''}`}></div>
                <span className="text-sm font-semibold text-slate-400 leading-none">{status}</span>
              </div>
              {/* Inline call duration for left panel */}
              {isCalling && status === 'Live Interaction Active' && (
                <div className="flex items-center justify-center gap-2 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-mono font-semibold">{formatDuration(callDuration)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto flex justify-center gap-6 relative z-10">
            {!isCalling && !showSummary ? (
              <button
                onClick={startCall}
                disabled={isLoadingPrompt}
                className="px-6 py-5 bg-brand text-white rounded-xl font-semibold text-xs flex items-center gap-4 hover:bg-indigo-700 shadow-md shadow-indigo-500/30 transition-all transform group disabled:opacity-50"
              >
                {isLoadingPrompt ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Loading CRM context...</>
                ) : (
                  <><Phone className="w-5 h-5 fill-white transition-transform" /> Connect to Sarah</>
                )}
              </button>
            ) : isCalling ? (
              <button
                onClick={endCall}
                className="px-6 py-5 bg-rose-600 text-white rounded-xl font-semibold text-xs flex items-center gap-4 hover:bg-rose-700 shadow-md shadow-rose-500/30 transition-all transform"
              >
                <X className="w-5 h-5" /> End Session
              </button>
            ) : (
              <button
                onClick={resetForNewCall}
                className="px-6 py-5 bg-brand text-white rounded-xl font-semibold text-xs flex items-center gap-4 hover:bg-indigo-700 shadow-md shadow-indigo-500/30 transition-all transform"
              >
                <RotateCcw className="w-5 h-5" /> New Call
              </button>
            )}
          </div>

          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent"></div>
          </div>
        </div>

        {/* Middle Panel - Transcription + Summary */}
        <div className="lg:col-span-1 space-y-4 flex flex-col">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                <Waves className="w-5 h-5 text-brand" /> Live Transcription
              </h3>
              <div className="flex items-center gap-3">
                {transcription && !isCalling && (
                  <button
                    onClick={clearTranscription}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-500 transition-colors"
                    title="Clear transcription"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
                <div className={`w-2.5 h-2.5 rounded-full ${isCalling ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`}></div>
              </div>
            </div>
            <div className="flex-1 bg-slate-50 rounded-xl p-5 overflow-y-auto font-medium text-slate-700 leading-relaxed text-sm italic min-h-[200px] max-h-[400px]">
              {transcription ? (
                <div>
                  {transcription}
                  <div ref={transcriptionEndRef} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 select-none space-y-3">
                  <BrainCircuit className="w-16 h-16 text-slate-300" />
                  <p className="text-xs font-semibold">Awaiting Audio Stream</p>
                </div>
              )}
            </div>
            {/* Word count footer */}
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-[11px] text-slate-400 font-medium">
                {wordCount > 0 ? `${wordCount} word${wordCount !== 1 ? 's' : ''}` : 'No words yet'}
              </span>
              {isCalling && (
                <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  Streaming
                </span>
              )}
              {isLoggingCall && (
                <span className="text-[11px] text-amber-500 font-medium flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving to CRM...
                </span>
              )}
            </div>
          </div>

          {/* Post-Call Summary */}
          {showSummary && callSummary && outcomeStyle && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                  <FileText className="w-5 h-5 text-brand" /> Call Summary
                </h3>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${outcomeStyle.bg} ${outcomeStyle.text}`}>
                  {outcomeStyle.label}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{callSummary.summary}</p>
              {callSummary.keyPoints?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 mb-2">Key Points</h4>
                  <ul className="space-y-1.5">
                    {callSummary.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {callSummary.nextAction && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                  <ArrowRight className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-semibold text-indigo-600">Next Action</span>
                    <p className="text-xs text-slate-700 mt-0.5">{callSummary.nextAction}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Latency card — hide when summary is showing to save space */}
          {!showSummary && (
            <div className="bg-slate-900 p-6 rounded-xl text-white flex items-center gap-5 shadow-xl relative overflow-hidden group">
              <div className="w-14 h-14 bg-white/10 text-brand rounded-2xl flex items-center justify-center shrink-0">
                <Zap className="w-7 h-7 fill-brand" />
              </div>
              <div className="relative z-10">
                <h4 className="font-semibold text-sm mb-1">Latency Optimization</h4>
                <p className="text-xs text-slate-400 leading-snug">Sarah uses the 2.5 native audio core. No text-to-speech middle-man. Just raw, human-like sound.</p>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand/10 blur-3xl rounded-full"></div>
            </div>
          )}
        </div>

        {/* Right Panel - Contact Selector + Configuration */}
        <div className="lg:col-span-1 space-y-4 flex flex-col">
          {/* Contact Selector Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-brand" />
                <h3 className="font-semibold text-slate-900 text-sm">Caller Context</h3>
              </div>
              {selectedContact && !isCalling && (
                <button
                  onClick={() => { setSelectedContact(null); setContactSearch(''); }}
                  className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {selectedContact ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">
                      {selectedContact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{selectedContact.name}</p>
                      <p className="text-[11px] text-slate-500">{selectedContact.email || selectedContact.phone || 'No contact info'}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 block">Status</span>
                    <span className="text-xs font-semibold text-slate-700">{selectedContact.status}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 block">Lead Score</span>
                    <span className="text-xs font-semibold text-slate-700">{selectedContact.leadScore}</span>
                  </div>
                </div>
                {selectedContact.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedContact.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search contacts by name, phone, or email..."
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    disabled={isCalling}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:opacity-50"
                  />
                </div>
                {matchedContacts.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    {matchedContacts.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedContact(c); setContactSearch(''); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{c.phone || c.email}</p>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">{c.leadScore}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!contactSearch && (
                  <p className="text-[11px] text-slate-400 text-center py-2">
                    Select a contact to give Sarah CRM context, or start without one
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Voice Agent Configuration Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex-1">
            <div className="flex items-center gap-2 mb-5">
              <Settings2 className="w-5 h-5 text-brand" />
              <h3 className="font-semibold text-slate-900 text-sm">Voice Agent Configuration</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Agent Name', value: 'Sarah', icon: User },
                { label: 'Voice', value: 'Zephyr', icon: Volume2 },
                { label: 'Response Mode', value: 'Native Audio', icon: Waves },
                { label: 'Latency', value: '< 200ms', icon: Zap },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500">{label}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Session Status Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wifi className="w-5 h-5 text-brand" />
              <h3 className="font-semibold text-slate-900 text-sm">Session Status</h3>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Connection</span>
                <span className={`text-xs font-semibold ${isCalling ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {isCalling ? 'WebSocket Active' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Protocol</span>
                <span className="text-xs font-semibold text-slate-800">Gemini Live API</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">CRM Context</span>
                <span className={`text-xs font-semibold ${selectedContact ? 'text-brand' : 'text-slate-400'}`}>
                  {selectedContact ? selectedContact.name : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Input</span>
                <span className="text-xs font-semibold text-slate-800">PCM 16kHz</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Output</span>
                <span className="text-xs font-semibold text-slate-800">PCM 24kHz</span>
              </div>
              {(isCalling && status === 'Live Interaction Active' || callDuration > 0) && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Duration</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{formatDuration(callDuration)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animations for audio bars - per-bar min/max heights */}
      <style>{barConfigs.map((bar, i) => `
        @keyframes voiceBar-${i} {
          0% { height: ${bar.minH}px; }
          100% { height: ${bar.maxH}px; }
        }
      `).join('')}</style>
    </div>
  );
};

export default VoiceAI;

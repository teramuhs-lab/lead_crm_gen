
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Phone, X, Activity, BrainCircuit, Waves, Zap } from 'lucide-react';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';

const VoiceAI: React.FC = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState('Standby');
  const [transcription, setTranscription] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

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
    setStatus('Initializing Nexus Live...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Initialize Contexts
      audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
      inputContextRef.current = new AudioCtx({ sampleRate: 16000 });

      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      if (inputContextRef.current.state === 'suspended') await inputContextRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        // Fix: Use the correct model name for real-time conversation as per instructions.
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
          systemInstruction: 'You are Sarah, a professional agency assistant for Nexus CRM. You help clients book appointments and qualify leads with a cheerful and professional tone.',
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      endCall();
    }
  };

  const endCall = () => {
    setIsCalling(false);
    setStatus('Standby');
    setTranscription('');
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
  };

  useEffect(() => {
    return () => {
      if (isCalling) endCall();
    };
  }, [isCalling]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto h-full flex flex-col pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 leading-tight">Nexus Live Voice AI</h2>
          <p className="text-sm text-slate-500">Sub-200ms real-time conversational intelligence for high-ticket agencies</p>
        </div>
        <div className="flex items-center gap-3">
           <div className={`px-4 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 transition-all ${isCalling ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              <Activity className={`w-3 h-3 ${isCalling ? 'animate-pulse' : ''}`} />
              {isCalling ? 'Active Session' : 'Ready to Connect'}
           </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
         <div className="bg-slate-900 rounded-xl shadow-md overflow-hidden relative flex flex-col p-6 text-white border-8 border-white shadow-indigo-100/50">
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
               <div className={`
                 w-56 h-56 rounded-full border-[12px] flex items-center justify-center transition-all duration-1000
                 ${isCalling ? 'border-brand shadow-[0_0_100px_rgba(99,102,241,0.4)] scale-110' : 'border-slate-800 scale-100'}
               `}>
                  <div className={`w-36 h-36 rounded-full bg-slate-800 flex items-center justify-center transition-transform ${isCalling ? 'scale-90' : 'scale-100'}`}>
                     {isCalling ? (
                        <div className="flex gap-1.5 items-center">
                           {[1,2,3,4,5].map(i => (
                             <div key={i} className={`w-2 bg-brand rounded-full animate-bounce`} style={{height: `${Math.random() * 40 + 20}px`, animationDelay: `${i * 0.1}s`}}></div>
                           ))}
                        </div>
                     ) : (
                        <Mic className="w-12 h-12 text-slate-600" />
                     )}
                  </div>
               </div>

               <div className="mt-16 text-center space-y-4">
                  <h3 className="text-3xl font-semibold">{isCalling ? 'Sarah Agent' : 'Voice Sandbox'}</h3>
                  <div className="flex items-center justify-center gap-3">
                     <div className={`w-2.5 h-2.5 rounded-full ${isCalling ? 'bg-emerald-500 animate-ping' : 'bg-slate-700'}`}></div>
                     <span className="text-sm font-semibold text-slate-400 leading-none">{status}</span>
                  </div>
               </div>
            </div>

            <div className="mt-auto flex justify-center gap-6 relative z-10">
               {!isCalling ? (
                 <button
                   onClick={startCall}
                   className="px-6 py-6 bg-brand text-white rounded-xl font-semibold text-xs flex items-center gap-4 hover:bg-indigo-700 shadow-md shadow-indigo-500/30 transition-all transform group"
                 >
                    <Phone className="w-5 h-5 fill-white transition-transform" /> Connect to Sarah
                 </button>
               ) : (
                 <button
                   onClick={endCall}
                   className="px-6 py-6 bg-rose-600 text-white rounded-xl font-semibold text-xs flex items-center gap-4 hover:bg-rose-700 shadow-md shadow-rose-500/30 transition-all transform"
                 >
                    <X className="w-5 h-5" /> End Session
                 </button>
               )}
            </div>

            <div className="absolute inset-0 opacity-10 pointer-events-none">
               <div className="h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent"></div>
            </div>
         </div>

         <div className="space-y-6 flex flex-col">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-3"><Waves className="w-6 h-6 text-brand" /> Live Transcription</h3>
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
               </div>
               <div className="flex-1 bg-slate-50 rounded-xl p-8 overflow-y-auto font-medium text-slate-700 leading-relaxed text-sm italic">
                  {transcription || (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 select-none space-y-4">
                       <BrainCircuit className="w-20 h-20 text-slate-300" />
                       <p className="text-sm font-semibold">Awaiting Audio Stream</p>
                    </div>
                  )}
               </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-xl text-white flex items-center gap-6 shadow-xl relative overflow-hidden group">
               <div className="w-16 h-16 bg-white/10 text-brand rounded-2xl flex items-center justify-center shrink-0">
                  <Zap className="w-8 h-8 fill-brand" />
               </div>
               <div className="relative z-10">
                  <h4 className="font-semibold text-sm mb-1">Latency Optimization</h4>
                  <p className="text-xs text-slate-400 leading-snug"> Sarah uses the 2.5 native audio core. No text-to-speech middle-man. Just raw, human-like sound.</p>
               </div>
               <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand/10 blur-3xl rounded-full"></div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default VoiceAI;

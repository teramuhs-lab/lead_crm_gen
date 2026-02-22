
import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquareCode, Palette, MessageSquare, Save, Settings, Phone,
  Send, X, Loader2, Copy, CheckCircle2, Code2,
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { api } from '../lib/api';
import { ChatWidget } from '../types';
import { NexusHeader } from './NexusUI';

// ── Preset color palette ────────────────────────────────────────────────────────
const PRESET_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f43f5e', '#f59e0b', '#000000'];

// ── Component ───────────────────────────────────────────────────────────────────
const ChatWidgetBuilder: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();

  // Form state
  const [widgetName, setWidgetName] = useState('Nexus Chat');
  const [bubbleColor, setBubbleColor] = useState('#6366f1');
  const [greeting, setGreeting] = useState('Hi! How can we help you today?');
  const [position, setPosition] = useState('bottom-right');
  const [autoOpen, setAutoOpen] = useState(true);
  const [mobileOnly, setMobileOnly] = useState(false);
  const [customColor, setCustomColor] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [isLoadingEmbed, setIsLoadingEmbed] = useState(false);

  // ── Load existing config on mount ─────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    if (!activeSubAccountId) return;
    setIsLoading(true);
    try {
      const data = await api.get<ChatWidget | null>(
        `/chat-widgets?subAccountId=${activeSubAccountId}`
      );
      if (data) {
        setWidgetName(data.name || 'Nexus Chat');
        setBubbleColor(data.bubbleColor || '#6366f1');
        setGreeting(data.greeting || 'Hi! How can we help you today?');
        setPosition(data.position || 'bottom-right');
        setAutoOpen(data.autoOpen ?? true);
        setMobileOnly(data.mobileOnly ?? false);
      }
    } catch {
      // No existing config — keep defaults
    } finally {
      setIsLoading(false);
    }
  }, [activeSubAccountId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // ── Save config ───────────────────────────────────────────────────────────────
  const saveConfig = async () => {
    if (!activeSubAccountId) return;
    setIsSaving(true);
    try {
      await api.post('/chat-widgets', {
        subAccountId: activeSubAccountId,
        name: widgetName,
        bubbleColor,
        greeting,
        position,
        autoOpen,
        mobileOnly,
      });
      notify('Widget settings saved');
    } catch {
      notify('Failed to save widget settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Get embed code ────────────────────────────────────────────────────────────
  const fetchEmbedCode = async () => {
    if (!activeSubAccountId) return;
    setIsLoadingEmbed(true);
    setShowEmbedModal(true);
    try {
      const data = await api.get<{ code: string }>(
        `/chat-widgets/embed-code?subAccountId=${activeSubAccountId}`
      );
      setEmbedCode(data.code || '');
    } catch {
      setEmbedCode('<!-- Failed to load embed code. Save your widget first. -->');
      notify('Failed to load embed code', 'error');
    } finally {
      setIsLoadingEmbed(false);
    }
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    notify('Embed code copied to clipboard');
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  // ── Handle custom color input ─────────────────────────────────────────────────
  const applyCustomColor = () => {
    if (/^#[0-9a-fA-F]{6}$/.test(customColor)) {
      setBubbleColor(customColor);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center pb-20">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-brand animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-400">Loading widget settings...</p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <NexusHeader title="Chat Widget" subtitle="Build and customize a live chat widget for your website">
          <button
            onClick={fetchEmbedCode}
            className="px-5 py-3 bg-slate-100 text-slate-700 rounded-2xl font-semibold text-xs flex items-center gap-2 hover:bg-slate-200 transition-all"
          >
            <Code2 className="w-4 h-4" /> Get Embed Code
          </button>
          <button
            onClick={saveConfig}
            disabled={isSaving}
            className="px-6 py-3 bg-brand text-white rounded-2xl font-semibold text-xs shadow-lg shadow-brand/20 flex items-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
      </NexusHeader>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: Settings (1/3) ──────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Visual Styling card */}
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-brand" /> Visual Styling
            </h3>

            {/* Widget Name */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-2">Widget Name</label>
              <input
                type="text"
                value={widgetName}
                onChange={(e) => setWidgetName(e.target.value)}
                placeholder="My Chat Widget"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
              />
            </div>

            {/* Bubble Color */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-2">Bubble Color</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setBubbleColor(c)}
                    className={`w-10 h-10 rounded-full border-4 transition-all ${
                      bubbleColor === c
                        ? 'border-white ring-2 ring-brand scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="#custom"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyCustomColor()}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all font-mono"
                />
                <button
                  onClick={applyCustomColor}
                  className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-all"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Welcome Greeting */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-2">Welcome Greeting</label>
              <textarea
                rows={3}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="Type your welcome message..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
              />
            </div>
          </div>

          {/* Advanced Behavior card */}
          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 space-y-4">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-brand" />
              <h4 className="font-bold text-indigo-900">Advanced Behavior</h4>
            </div>

            {/* Mobile Only toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-indigo-700">Mobile Only</span>
              <button
                onClick={() => setMobileOnly(!mobileOnly)}
                className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${
                  mobileOnly ? 'bg-brand' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    mobileOnly ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>

            {/* Auto-Open Popup toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-indigo-700">Auto-Open Popup</span>
              <button
                onClick={() => setAutoOpen(!autoOpen)}
                className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${
                  autoOpen ? 'bg-brand' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    autoOpen ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* ── Right column: Live Preview (2/3) ─────────────────────────────────── */}
        <div className="lg:col-span-2 bg-slate-100 rounded-xl p-6 border-8 border-white shadow-md relative overflow-hidden flex items-center justify-center min-h-[600px]">
          {/* Mock website background text */}
          <div className="text-center space-y-4 opacity-20 select-none">
            <h4 className="text-3xl font-semibold text-slate-400">Mock Website Preview</h4>
            <p className="text-sm font-bold text-slate-400">The chat bubble appears in the bottom right corner</p>
          </div>

          {/* Live Widget Preview */}
          <div className="absolute bottom-8 right-8 flex flex-col items-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Chat window */}
            <div className="w-80 bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100">
              {/* Header */}
              <div
                className="p-4 flex items-center justify-between text-white"
                style={{ backgroundColor: bubbleColor }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-semibold">
                    {widgetName.charAt(0).toUpperCase() || 'N'}
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-none">{widgetName}</p>
                    <p className="text-xs opacity-80 mt-1">Online & Ready</p>
                  </div>
                </div>
                <X className="w-4 h-4 opacity-50" />
              </div>

              {/* Messages area */}
              <div className="p-6 bg-slate-50 h-48 flex flex-col justify-end gap-4 overflow-y-auto thin-scrollbar">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm self-start">
                  <p className="text-xs text-slate-700">{greeting}</p>
                </div>
              </div>

              {/* Input area */}
              <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-xs outline-none"
                  readOnly
                />
                <button
                  className="p-2 text-white rounded-xl shadow-lg"
                  style={{ backgroundColor: bubbleColor }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Floating bubble */}
            <button
              className="w-16 h-16 rounded-full shadow-md flex items-center justify-center text-white transform transition-transform hover:scale-105"
              style={{ backgroundColor: bubbleColor }}
            >
              <MessageSquare className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Embed Code Modal ───────────────────────────────────────────────────── */}
      {showEmbedModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Embed Code</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Copy and paste this into your website</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmbedModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4">
              {isLoadingEmbed ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 text-brand animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 mt-3">Loading embed code...</p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all max-h-64 overflow-y-auto thin-scrollbar">
                      {embedCode}
                    </pre>
                    <button
                      onClick={copyEmbedCode}
                      className={`absolute top-3 right-3 p-2 rounded-lg text-xs font-semibold transition-all ${
                        copiedEmbed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                      }`}
                    >
                      {copiedEmbed ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-[11px] text-indigo-600 font-medium leading-relaxed">
                      Paste this snippet before the closing <code className="bg-indigo-100 px-1 py-0.5 rounded text-[10px]">&lt;/body&gt;</code> tag of your website. The widget will appear automatically for visitors.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowEmbedModal(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-semibold hover:bg-slate-200 transition-all"
              >
                Close
              </button>
              {!isLoadingEmbed && (
                <button
                  onClick={copyEmbedCode}
                  className="px-5 py-2.5 bg-brand text-white rounded-2xl text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  {copiedEmbed ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedEmbed ? 'Copied!' : 'Copy Code'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidgetBuilder;

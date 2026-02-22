
import React, { useState, useEffect, useCallback } from 'react';
import { Palette, Globe, Save, Plus, Zap, CheckCircle2, Shield, Loader2, Image } from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import { AgencySettings } from '../types';
import { NexusHeader } from './NexusUI';

const PRESET_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#1e293b', '#000000'];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
];

interface SettingsApiResponse {
  settings: AgencySettings;
  fieldDefinitions: Array<unknown>;
}

const WhiteLabelSettings: React.FC = () => {
  const { activeSubAccountId, agencySettings, setAgencySettings, notify } = useNexus();

  // ── Local form state ──
  const [platformName, setPlatformName] = useState(agencySettings.platformName);
  const [logoUrl, setLogoUrl] = useState(agencySettings.logoUrl);
  const [primaryColor, setPrimaryColor] = useState(agencySettings.primaryColor);
  const [customDomain, setCustomDomain] = useState(agencySettings.customDomain);

  // Advanced settings (local-only, not in AgencySettings type)
  const [faviconUrl, setFaviconUrl] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [defaultTimezone, setDefaultTimezone] = useState('America/New_York');

  // UI state
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [domainVerified, setDomainVerified] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // ── Fetch settings on mount ──
  useEffect(() => {
    if (!activeSubAccountId) return;

    let cancelled = false;

    const fetchSettings = async () => {
      try {
        const data = await api.get<SettingsApiResponse>(
          `/settings?subAccountId=${activeSubAccountId}`,
        );
        if (cancelled) return;

        const s = data.settings;
        setPlatformName(s.platformName ?? '');
        setLogoUrl(s.logoUrl ?? '');
        setPrimaryColor(s.primaryColor ?? '#6366f1');
        setCustomDomain(s.customDomain ?? '');
      } catch {
        // Fall back to context values (already seeded above)
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    fetchSettings();
    return () => { cancelled = true; };
  }, [activeSubAccountId]);

  // ── Sync context values into form when context changes externally ──
  useEffect(() => {
    if (loaded) return; // once we've fetched from API, ignore context updates
    setPlatformName(agencySettings.platformName);
    setLogoUrl(agencySettings.logoUrl);
    setPrimaryColor(agencySettings.primaryColor);
    setCustomDomain(agencySettings.customDomain);
  }, [agencySettings, loaded]);

  // ── Save handler ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    const settings: AgencySettings = { platformName, logoUrl, primaryColor, customDomain };
    try {
      await api.put('/settings', { subAccountId: activeSubAccountId, settings });
      setAgencySettings(settings);
      notify('Settings saved successfully', 'success');
    } catch {
      notify('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }, [platformName, logoUrl, primaryColor, customDomain, activeSubAccountId, setAgencySettings, notify]);

  // ── Simulated domain verification ──
  const handleVerifyDomain = useCallback(() => {
    if (!customDomain.trim()) return;
    setVerifying(true);
    setDomainVerified(false);
    setTimeout(() => {
      setVerifying(false);
      setDomainVerified(true);
      notify('Domain verified successfully', 'success');
    }, 1500);
  }, [customDomain, notify]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <NexusHeader title="Settings" subtitle="Configure your account preferences, branding, and white-label options">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-4 bg-brand text-white font-semibold text-xs rounded-2xl shadow-md shadow-brand/40 flex items-center gap-3 hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </NexusHeader>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left column: Settings forms ── */}
        <div className="space-y-5">
          {/* Visual Settings Card */}
          <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm space-y-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand/10 text-brand rounded-xl shadow-sm">
                <Palette className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900">Visual Settings</h3>
            </div>

            <div className="space-y-8">
              {/* Platform Name */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 block ml-2">Platform Name</label>
                <input
                  type="text"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all"
                  placeholder="Nexus Enterprise"
                />
              </div>

              {/* Logo URL */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 block ml-2">Logo URL</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all"
                  placeholder="https://example.com/logo.png"
                />
                {logoUrl && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Image className="w-4 h-4 text-slate-400 shrink-0" />
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="h-10 max-w-[200px] object-contain rounded"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }}
                    />
                  </div>
                )}
              </div>

              {/* Brand Color Palette */}
              <div className="space-y-4">
                <label className="text-xs font-semibold text-slate-400 block ml-2">Brand Color Palette</label>
                <div className="flex flex-wrap gap-4">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setPrimaryColor(color)}
                      className={`w-12 h-12 rounded-xl border-4 transition-all ${
                        primaryColor === color
                          ? 'border-white ring-4 ring-brand shadow-xl'
                          : 'border-transparent shadow-sm'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <div className="relative group">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 rounded-xl overflow-hidden opacity-0 absolute inset-0 cursor-pointer z-10"
                    />
                    <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 bg-white group-hover:border-brand group-hover:text-brand transition-all">
                      <Plus className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Domain Configuration Card */}
          <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand/10 text-brand rounded-xl shadow-sm">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900">Domain Configuration</h3>
            </div>
            <div className="space-y-4">
              <label className="text-xs font-semibold text-slate-400 block ml-2">Agency Custom CNAME</label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => {
                    setCustomDomain(e.target.value);
                    setDomainVerified(false);
                  }}
                  className="flex-1 px-8 py-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-4 focus:ring-brand/10 transition-all"
                  placeholder="app.agency.io"
                />
                <button
                  onClick={handleVerifyDomain}
                  disabled={verifying || !customDomain.trim()}
                  className="px-8 py-5 bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-brand transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {verifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
              {domainVerified && (
                <div className="flex items-center gap-2 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <p className="text-xs font-medium text-emerald-700 leading-none">Domain verified successfully</p>
                </div>
              )}
              <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-medium text-amber-700 leading-none">
                  Point CNAME records to <span className="font-bold">proxy-live.nexus.io</span>
                </p>
              </div>
            </div>
          </div>

          {/* Advanced Settings Card */}
          <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand/10 text-brand rounded-xl shadow-sm">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900">Advanced Settings</h3>
            </div>
            <div className="space-y-8">
              {/* Favicon URL */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 block ml-2">Favicon URL</label>
                <input
                  type="text"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all"
                  placeholder="https://example.com/favicon.ico"
                />
              </div>

              {/* Support Email */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 block ml-2">Support Email</label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all"
                  placeholder="support@youragency.com"
                />
              </div>

              {/* Default Timezone */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 block ml-2">Default Timezone</label>
                <select
                  value={defaultTimezone}
                  onChange={(e) => setDefaultTimezone(e.target.value)}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all appearance-none cursor-pointer"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column: Live preview + Save ── */}
        <div className="space-y-5 flex flex-col">
          <div className="bg-slate-900 rounded-2xl p-10 shadow-md relative overflow-hidden flex-1 border-[10px] border-white shadow-brand/10">
            <div className="absolute top-0 right-0 p-6 opacity-[0.05]">
              <Zap className="w-80 h-80 text-brand rotate-12" />
            </div>
            <p className="text-xs font-medium text-slate-500 mb-8 text-center leading-none">
              Real-time Interface Preview
            </p>

            <div className="w-full flex flex-col gap-10">
              {/* Preview header */}
              <div className="flex items-center gap-5 px-6">
                {logoUrl ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0" style={{ backgroundColor: primaryColor }}>
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent && !parent.querySelector('svg')) {
                          // Fallback handled by the alt-icon below
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all animate-pulse"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Zap className="w-7 h-7 text-white fill-white" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-semibold text-2xl text-white leading-none">
                    {platformName || 'Your Platform'}
                  </span>
                  <span className="text-xs font-medium text-slate-500 mt-1">Enterprise Console</span>
                </div>
              </div>

              {/* Preview nav items */}
              <div className="space-y-4 px-6">
                <div
                  className="h-14 w-full rounded-xl flex items-center px-6 shadow-md"
                  style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}33` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-white mr-4" />
                  <div className="w-32 h-2.5 bg-white/30 rounded-full" />
                </div>
                <div className="h-14 w-full bg-slate-800 rounded-xl opacity-50 flex items-center px-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700 mr-4" />
                  <div className="w-24 h-2.5 bg-slate-700 rounded-full" />
                </div>
                <div className="h-14 w-full bg-slate-800 rounded-xl opacity-30 flex items-center px-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700 mr-4" />
                  <div className="w-40 h-2.5 bg-slate-700 rounded-full" />
                </div>
              </div>

              {/* Preview cards */}
              <div className="mt-10 px-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 bg-slate-800 rounded-xl border border-white/5 p-6 space-y-3">
                    <div
                      className="w-8 h-8 rounded-xl border"
                      style={{ backgroundColor: `${primaryColor}20`, borderColor: `${primaryColor}40` }}
                    />
                    <div className="w-full h-2 bg-slate-700 rounded-full" />
                    <div className="w-2/3 h-2 bg-slate-700 rounded-full opacity-50" />
                  </div>
                  <div
                    className="h-32 rounded-xl border p-6 space-y-3"
                    style={{
                      backgroundColor: `${primaryColor}10`,
                      borderColor: `${primaryColor}30`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl shadow-lg"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <div
                      className="w-full h-2 rounded-full"
                      style={{ backgroundColor: `${primaryColor}30` }}
                    />
                    <div
                      className="w-2/3 h-2 rounded-full opacity-50"
                      style={{ backgroundColor: `${primaryColor}30` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save button at bottom of right column */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-8 bg-brand text-white font-semibold text-xs rounded-2xl shadow-md shadow-brand/40 flex items-center justify-center gap-4 hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100"
          >
            {saving ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Save className="w-6 h-6" />
            )}
            {saving ? 'Saving Theme Changes...' : 'Save Theme Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhiteLabelSettings;

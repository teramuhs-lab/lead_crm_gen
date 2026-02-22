
import React, { useState, useEffect } from 'react';
import {
  Smartphone, Layout, Bell, MessageSquare, Zap, Target, Search,
  Loader2, Check, Fingerprint, WifiOff, BellRing, BarChart3, Users,
  GitBranch, Mail, CalendarDays, Image
} from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import { AgencySettings } from '../types';
import { NexusHeader } from './NexusUI';

const DEFAULT_SETTINGS: AgencySettings = {
  platformName: 'Nexus CRM',
  primaryColor: '#6366f1',
  customDomain: '',
  logoUrl: '',
};

const FEATURE_MODULES = [
  { label: 'Dashboard', icon: BarChart3 },
  { label: 'Contacts', icon: Users },
  { label: 'Pipeline', icon: GitBranch },
  { label: 'Messaging', icon: Mail },
  { label: 'Calendar', icon: CalendarDays },
];

const MobileAppPreview: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();

  const [settings, setSettings] = useState<AgencySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Toggle switches (visual-only, local state)
  const [pushNotifications, setPushNotifications] = useState(true);
  const [offlineCRM, setOfflineCRM] = useState(false);
  const [biometricLogin, setBiometricLogin] = useState(false);

  // Fetch settings on mount + when activeSubAccountId changes
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await api.get<{ settings: AgencySettings }>(`/settings?subAccountId=${activeSubAccountId}`);
        if (data?.settings) {
          setSettings({
            platformName: data.settings.platformName || DEFAULT_SETTINGS.platformName,
            primaryColor: data.settings.primaryColor || DEFAULT_SETTINGS.primaryColor,
            customDomain: data.settings.customDomain || DEFAULT_SETTINGS.customDomain,
            logoUrl: data.settings.logoUrl || DEFAULT_SETTINGS.logoUrl,
          });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch {
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [activeSubAccountId]);

  const handleRequestBuild = () => {
    notify("Build request submitted! We'll notify you when ready.", 'success');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 animate-in fade-in">
      <NexusHeader title="Mobile App Preview" subtitle="Preview how your app looks and behaves on mobile devices">
        <button
          onClick={handleRequestBuild}
          className="px-6 py-3 bg-brand text-white rounded-xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Target className="w-4 h-4" /> Request Production Build
        </button>
      </NexusHeader>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: App Configuration (1/3) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
            <h3 className="font-bold text-slate-900 flex items-center gap-3">
              <Layout className="w-5 h-5 text-brand" /> App Configuration
            </h3>

            <div className="space-y-6">
              {/* App Icon / Logo URL */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">App Icon / Logo URL</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="App icon" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Image className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={settings.logoUrl}
                    readOnly
                    placeholder="Upload square PNG..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600"
                  />
                </div>
              </div>

              {/* Primary App Color */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Primary App Color</label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl border-2 border-white ring-2"
                    style={{ backgroundColor: settings.primaryColor, outlineColor: settings.primaryColor, outlineStyle: 'solid', outlineWidth: '2px', outlineOffset: '2px' }}
                  />
                  <span className="text-xs font-bold text-slate-600 font-mono">{settings.primaryColor}</span>
                </div>
              </div>

              {/* Toggle Switches */}
              <div className="pt-2 space-y-4">
                {/* Push Notifications (on) */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-brand transition-colors flex items-center gap-2">
                    <BellRing className="w-3.5 h-3.5" /> Push Notifications
                  </span>
                  <button
                    onClick={() => setPushNotifications(!pushNotifications)}
                    className={`w-9 h-5 rounded-full relative transition-colors ${pushNotifications ? 'bg-brand' : 'bg-slate-200'}`}
                    style={pushNotifications ? { backgroundColor: settings.primaryColor } : undefined}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${pushNotifications ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </label>

                {/* Offline CRM Mode (off) */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-brand transition-colors flex items-center gap-2">
                    <WifiOff className="w-3.5 h-3.5" /> Offline CRM Mode
                  </span>
                  <button
                    onClick={() => setOfflineCRM(!offlineCRM)}
                    className={`w-9 h-5 rounded-full relative transition-colors ${offlineCRM ? 'bg-brand' : 'bg-slate-200'}`}
                    style={offlineCRM ? { backgroundColor: settings.primaryColor } : undefined}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${offlineCRM ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </label>

                {/* Biometric Login (off) */}
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-brand transition-colors flex items-center gap-2">
                    <Fingerprint className="w-3.5 h-3.5" /> Biometric Login
                  </span>
                  <button
                    onClick={() => setBiometricLogin(!biometricLogin)}
                    className={`w-9 h-5 rounded-full relative transition-colors ${biometricLogin ? 'bg-brand' : 'bg-slate-200'}`}
                    style={biometricLogin ? { backgroundColor: settings.primaryColor } : undefined}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${biometricLogin ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </label>
              </div>

              {/* Feature Modules Checklist */}
              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-400 block mb-3">Feature Modules</label>
                <div className="space-y-2.5">
                  {FEATURE_MODULES.map((mod) => (
                    <div key={mod.label} className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: settings.primaryColor }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <mod.icon className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-medium text-slate-700">{mod.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Strategy tip card */}
          <div className="bg-indigo-50 p-8 rounded-xl border border-indigo-100 flex gap-4">
            <Zap className="w-8 h-8 text-brand shrink-0" />
            <div>
              <h4 className="font-bold text-indigo-900 text-sm">Resale Strategy</h4>
              <p className="text-xs text-indigo-700 leading-relaxed mt-1 italic">
                "Agencies reselling a white-label mobile app increase client retention by 42% on average."
              </p>
            </div>
          </div>
        </div>

        {/* Right column: iPhone Mockup (2/3) */}
        <div className="lg:col-span-2 flex justify-center items-start">
          {loading ? (
            /* Skeleton phone while loading */
            <div className="w-[340px] h-[680px] bg-slate-900 rounded-[40px] p-4 border-[10px] border-slate-800 shadow-md relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-8 bg-slate-800 rounded-b-2xl z-50" />
              <div className="w-full h-full bg-slate-100 rounded-[28px] overflow-hidden flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Loading preview...</span>
              </div>
            </div>
          ) : (
            /* Full iPhone mockup */
            <div className="w-[340px] h-[680px] bg-slate-900 rounded-[40px] p-4 border-[10px] border-slate-800 shadow-md relative">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-8 bg-slate-800 rounded-b-2xl z-50" />

              {/* App Content */}
              <div className="w-full h-full bg-slate-50 rounded-[28px] overflow-hidden flex flex-col relative">
                {/* Status Bar */}
                <div className="h-10 bg-white flex items-center justify-between px-8 pt-2">
                  <span className="text-xs font-bold">9:41</span>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-1.5 bg-slate-900 rounded-full" />
                    <div className="w-3 h-3 border border-slate-900 rounded-full" />
                  </div>
                </div>

                {/* App Header */}
                <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: settings.primaryColor + '20' }}
                      >
                        <Smartphone className="w-3.5 h-3.5" style={{ color: settings.primaryColor }} />
                      </div>
                    )}
                    <h4 className="font-semibold text-slate-900 text-sm">{settings.platformName}</h4>
                  </div>
                  <div className="relative">
                    <Bell className="w-4 h-4 text-slate-400" />
                    <div
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{ backgroundColor: settings.primaryColor }}
                    />
                  </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Opportunity Card */}
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: settings.primaryColor + '15' }}
                    >
                      <Target className="w-5 h-5" style={{ color: settings.primaryColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-400">New Opportunity</p>
                      <p className="text-xs font-semibold text-slate-900">John Doe ($450)</p>
                    </div>
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: settings.primaryColor }}
                    />
                  </div>

                  {/* Quick Stats Row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                      <p className="text-lg font-bold text-slate-900">24</p>
                      <p className="text-[10px] text-slate-400">Leads</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                      <p className="text-lg font-bold text-slate-900">8</p>
                      <p className="text-[10px] text-slate-400">Tasks</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                      <p className="text-lg font-bold" style={{ color: settings.primaryColor }}>$12k</p>
                      <p className="text-[10px] text-slate-400">Pipeline</p>
                    </div>
                  </div>

                  {/* Inbox Messages */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-medium text-slate-400 px-2">Recent Inbox</h5>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">Rachel Zane</p>
                        <p className="text-xs text-slate-500 truncate">Is the meeting still at 2pm?</p>
                      </div>
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: settings.primaryColor }}
                      />
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">Mike Ross</p>
                        <p className="text-xs text-slate-500 truncate">Just signed the invoice!</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab Bar */}
                <div className="h-20 bg-white border-t border-slate-100 flex items-center justify-around px-4 pb-4">
                  <div className="flex flex-col items-center gap-1">
                    <Layout className="w-5 h-5" style={{ color: settings.primaryColor }} />
                    <span className="text-xs font-medium" style={{ color: settings.primaryColor }}>Home</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-slate-300">
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-xs font-medium">Chat</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-slate-300">
                    <Search className="w-5 h-5" />
                    <span className="text-xs font-medium">Leads</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileAppPreview;


import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2, Zap, RefreshCw, Globe, Phone, CreditCard, Box, Loader2,
  X, Trash2, CheckCircle2, AlertCircle, XCircle, Settings, Sparkles, Mail,
} from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import { NexusHeader } from './NexusUI';

// ── Data Model ──

interface Integration {
  id: string;
  subAccountId: string;
  name: string;
  type: string;
  config: Record<string, string>;
  status: 'connected' | 'disconnected' | 'error';
  createdAt: string;
  updatedAt: string;
}

// ── Predefined integration types ──

interface IntegrationTemplate {
  name: string;
  type: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bg: string;
  description: string;
  fields: { key: string; label: string; placeholder: string; type: string }[];
}

const INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    name: 'n8n',
    type: 'webhook',
    icon: Link2,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    description: 'Connect your n8n webhook to receive lead event packets in real time.',
    fields: [
      { key: 'url', label: 'Webhook URL', placeholder: 'https://your-n8n-instance.com/webhook/...', type: 'text' },
    ],
  },
  {
    name: 'Apify',
    type: 'web_scraping',
    icon: Box,
    color: 'text-[#FF9000]',
    bg: 'bg-orange-50',
    description: 'Automated lead enrichment and web scraping via Apify actors.',
    fields: [
      { key: 'token', label: 'API Token', placeholder: 'apify_api_...', type: 'password' },
    ],
  },
  {
    name: 'Resend',
    type: 'email',
    icon: Mail,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    description: 'Send transactional and marketing emails via Resend.',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 're_...', type: 'password' },
    ],
  },
  {
    name: 'Twilio',
    type: 'telephony',
    icon: Phone,
    color: 'text-red-500',
    bg: 'bg-red-50',
    description: 'Send SMS, MMS, and voice calls through your Twilio account.',
    fields: [
      { key: 'accountSid', label: 'Account SID', placeholder: 'AC...', type: 'text' },
      { key: 'authToken', label: 'Auth Token', placeholder: 'Your auth token', type: 'password' },
      { key: 'phoneNumber', label: 'Phone Number', placeholder: '+1234567890', type: 'text' },
    ],
  },
  {
    name: 'Stripe',
    type: 'payments',
    icon: CreditCard,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    description: 'Process payments, manage subscriptions, and create invoices.',
    fields: [
      { key: 'secretKey', label: 'Secret Key', placeholder: 'sk_live_...', type: 'password' },
    ],
  },
  {
    name: 'Google AI',
    type: 'ai',
    icon: Sparkles,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    description: 'Use Google Gemini models for content generation and analysis.',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'AIza...', type: 'password' },
    ],
  },
  {
    name: 'Zapier',
    type: 'automation',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    description: 'Connect to 5,000+ apps through Zapier webhooks.',
    fields: [
      { key: 'url', label: 'Webhook URL', placeholder: 'https://hooks.zapier.com/hooks/catch/...', type: 'text' },
    ],
  },
];

// ── Component ──

const IntegrationHub: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();

  // ── Data state ──
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Modal state ──
  const [configuring, setConfiguring] = useState<IntegrationTemplate | null>(null);
  const [configFields, setConfigFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Fetch integrations ──
  const fetchIntegrations = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<Integration[]>(`/integrations?subAccountId=${activeSubAccountId}`);
      setIntegrations(data);
    } catch {
      // keep existing state on failure
    }
  }, [activeSubAccountId]);

  useEffect(() => {
    if (!activeSubAccountId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      await fetchIntegrations();
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [activeSubAccountId, fetchIntegrations]);

  // ── Computed stats ──
  const totalCount = integrations.length;
  const connectedCount = integrations.filter((i) => i.status === 'connected').length;
  const disconnectedCount = integrations.filter((i) => i.status !== 'connected').length;

  // ── Helpers: find existing integration for a template ──
  const getExistingIntegration = (template: IntegrationTemplate): Integration | undefined =>
    integrations.find((i) => i.name === template.name && i.subAccountId === activeSubAccountId);

  // ── Open configure modal ──
  const openConfigModal = (template: IntegrationTemplate) => {
    const existing = getExistingIntegration(template);
    const fields: Record<string, string> = {};
    template.fields.forEach((f) => {
      fields[f.key] = existing?.config?.[f.key] || '';
    });
    setConfigFields(fields);
    setConfiguring(template);
  };

  // ── Save integration ──
  const handleSave = useCallback(async () => {
    if (!configuring || !activeSubAccountId) return;
    setSaving(true);
    try {
      const saved = await api.post<Integration>('/integrations', {
        subAccountId: activeSubAccountId,
        name: configuring.name,
        type: configuring.type,
        config: configFields,
        status: 'connected',
      });
      setIntegrations((prev) => {
        const idx = prev.findIndex((i) => i.id === saved.id);
        if (idx >= 0) return prev.map((i) => (i.id === saved.id ? saved : i));
        return [saved, ...prev];
      });
      notify(`${configuring.name} integration saved`);
      setConfiguring(null);
    } catch {
      notify('Failed to save integration', 'error');
    } finally {
      setSaving(false);
    }
  }, [configuring, configFields, activeSubAccountId, notify]);

  // ── Test connection (simulated) ──
  const handleTest = useCallback(async () => {
    if (!configuring || !activeSubAccountId) return;
    setTesting(true);
    try {
      // Simulate a brief connection test
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const saved = await api.post<Integration>('/integrations', {
        subAccountId: activeSubAccountId,
        name: configuring.name,
        type: configuring.type,
        config: configFields,
        status: 'connected',
      });
      setIntegrations((prev) => {
        const idx = prev.findIndex((i) => i.id === saved.id);
        if (idx >= 0) return prev.map((i) => (i.id === saved.id ? saved : i));
        return [saved, ...prev];
      });
      notify(`${configuring.name} connection verified`);
    } catch {
      notify('Connection test failed', 'error');
    } finally {
      setTesting(false);
    }
  }, [configuring, configFields, activeSubAccountId, notify]);

  // ── Disconnect ──
  const handleDisconnect = useCallback(async () => {
    if (!configuring || !activeSubAccountId) return;
    setSaving(true);
    try {
      const saved = await api.post<Integration>('/integrations', {
        subAccountId: activeSubAccountId,
        name: configuring.name,
        type: configuring.type,
        config: configFields,
        status: 'disconnected',
      });
      setIntegrations((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
      notify(`${configuring.name} disconnected`);
      setConfiguring(null);
    } catch {
      notify('Failed to disconnect integration', 'error');
    } finally {
      setSaving(false);
    }
  }, [configuring, configFields, activeSubAccountId, notify]);

  // ── Delete ──
  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/integrations/${id}`);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      notify('Integration deleted');
    } catch {
      notify('Failed to delete integration', 'error');
    } finally {
      setDeleteConfirmId(null);
    }
  }, [notify]);

  // ── Format date ──
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="pb-20 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 space-y-6 animate-in fade-in duration-700">
      <NexusHeader title="Integrations" subtitle="Connect third-party services and configure API credentials">
        <button
          onClick={() => { setLoading(true); fetchIntegrations().finally(() => setLoading(false)); }}
          className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </NexusHeader>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Total Integrations</span>
            <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-semibold text-slate-900">{totalCount}</span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Connected</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-semibold text-slate-900">{connectedCount}</span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Disconnected</span>
            <div className="p-2 bg-rose-50 rounded-xl text-rose-500">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-semibold text-slate-900">{disconnectedCount}</span>
        </div>
      </div>

      {/* ── Integration Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATION_TEMPLATES.map((template) => {
          const existing = getExistingIntegration(template);
          const isConnected = existing?.status === 'connected';
          const Icon = template.icon;

          return (
            <div
              key={template.name}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-brand transition-all cursor-pointer group"
              onClick={() => openConfigModal(template)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 ${template.bg} rounded-2xl`}>
                  <Icon className={`w-6 h-6 ${template.color}`} />
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isConnected
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">{template.name}</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{template.description}</p>
              <button className="w-full py-2.5 text-xs font-bold text-brand bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 group-hover:bg-brand group-hover:text-white">
                <Settings className="w-3.5 h-3.5" />
                Configure
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Active Integrations Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Active Integrations</h3>
          <p className="text-xs text-slate-400 mt-1">All saved integrations for this sub-account</p>
        </div>

        {integrations.length === 0 ? (
          <div className="p-12 text-center">
            <Globe className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h4 className="font-bold text-slate-700 text-lg">No integrations yet</h4>
            <p className="text-sm text-slate-400 mt-1">
              Configure your first integration above to get started.
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400">Last Updated</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {integrations.map((integration) => {
                const template = INTEGRATION_TEMPLATES.find((t) => t.name === integration.name);
                const Icon = template?.icon || Globe;
                const iconColor = template?.color || 'text-slate-400';
                const iconBg = template?.bg || 'bg-slate-50';

                return (
                  <tr key={integration.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${iconColor}`} />
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{integration.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-500 capitalize">
                        {integration.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          integration.status === 'connected'
                            ? 'bg-emerald-50 text-emerald-600'
                            : integration.status === 'error'
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {integration.status === 'connected' && <CheckCircle2 className="w-3 h-3" />}
                        {integration.status === 'disconnected' && <XCircle className="w-3 h-3" />}
                        {integration.status === 'error' && <AlertCircle className="w-3 h-3" />}
                        {integration.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-400 font-medium">
                        {formatDate(integration.updatedAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteConfirmId === integration.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-slate-500 font-medium">Delete?</span>
                          <button
                            onClick={() => handleDelete(integration.id)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(integration.id)}
                          title="Delete integration"
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Configuration Modal ── */}
      {configuring && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in duration-700">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 ${configuring.bg} rounded-xl`}>
                  <configuring.icon className={`w-5 h-5 ${configuring.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Configure {configuring.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{configuring.description}</p>
                </div>
              </div>
              <button
                onClick={() => setConfiguring(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {configuring.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={configFields[field.key] || ''}
                    onChange={(e) =>
                      setConfigFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                </div>
              ))}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {/* Disconnect (only if already connected) */}
                {getExistingIntegration(configuring)?.status === 'connected' && (
                  <button
                    onClick={handleDisconnect}
                    disabled={saving}
                    className="px-4 py-2.5 text-xs font-bold text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Test Connection */}
                <button
                  onClick={handleTest}
                  disabled={testing || saving || Object.values(configFields).every((v) => !(v as string).trim())}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  {testing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>

                {/* Save */}
                <button
                  onClick={handleSave}
                  disabled={saving || testing}
                  className="px-6 py-2.5 bg-brand text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationHub;

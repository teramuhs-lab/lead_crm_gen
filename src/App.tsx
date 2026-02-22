import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, GitMerge, Zap, MessageSquare,
  Globe, ShieldCheck, BarChart3, Settings, Search, Mic,
  Rocket, Map, Calendar, Phone, Layers,
  BrainCircuit, MonitorPlay as AdIcon,
  Sparkles, Database, Cloud, Network, ChevronDown, ChevronRight, X, AlertCircle, CheckCircle2,
  Share2, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { ViewType } from './types';
import { NexusProvider, useNexus } from './context/NexusContext';
import { AIActionQueueProvider, useAIQueue } from './context/AIActionQueueContext';
import { useAuth } from './hooks/useAuth';
import ContactDetail from './components/ContactDetail';
import AIActionPanel from './components/ai/AIActionPanel';
import AutoApproveToast from './components/ai/AutoApproveToast';

// Lazy-loaded components
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const ContactManager = React.lazy(() => import('./components/ContactManager'));
const KanbanBoard = React.lazy(() => import('./components/KanbanBoard'));
const AutomationEngine = React.lazy(() => import('./components/AutomationEngine'));
const LeadProcessingBlueprint = React.lazy(() => import('./components/LeadProcessingBlueprint'));
const CommunicationHub = React.lazy(() => import('./components/CommunicationHub'));
const FormBuilder = React.lazy(() => import('./components/FormBuilder'));
const SiteBuilder = React.lazy(() => import('./components/SiteBuilder'));
const Reporting = React.lazy(() => import('./components/Reporting'));
const AIEmployee = React.lazy(() => import('./components/AIEmployee'));
const VoiceAI = React.lazy(() => import('./components/VoiceAI'));
const AdManager = React.lazy(() => import('./components/AdManager'));
const MarketIntelligence = React.lazy(() => import('./components/MarketIntelligence'));
const LocalSEO = React.lazy(() => import('./components/LocalSEO'));
const SaaSMode = React.lazy(() => import('./components/SaaSMode'));
const PaymentsManager = React.lazy(() => import('./components/PaymentsManager'));
const CalendarManager = React.lazy(() => import('./components/CalendarManager'));
const ReputationManager = React.lazy(() => import('./components/ReputationManager'));
const SocialPlanner = React.lazy(() => import('./components/SocialPlanner'));
const MembershipPortal = React.lazy(() => import('./components/MembershipPortal'));
const PhoneSystem = React.lazy(() => import('./components/PhoneSystem'));
const SnapshotsManager = React.lazy(() => import('./components/SnapshotsManager'));
const EmailTemplates = React.lazy(() => import('./components/EmailTemplates'));
const CommunityHub = React.lazy(() => import('./components/CommunityHub'));
const ContentAI = React.lazy(() => import('./components/ContentAI'));
const AffiliateManager = React.lazy(() => import('./components/AffiliateManager'));
const StoreManager = React.lazy(() => import('./components/StoreManager'));
const IntegrationHub = React.lazy(() => import('./components/IntegrationHub'));
const ChatWidgetBuilder = React.lazy(() => import('./components/ChatWidgetBuilder'));
const WorkflowLogs = React.lazy(() => import('./components/WorkflowLogs'));
const TeamManagement = React.lazy(() => import('./components/TeamManagement'));
const MobileAppPreview = React.lazy(() => import('./components/MobileAppPreview'));
const MediaLibrary = React.lazy(() => import('./components/MediaLibrary'));
const SchemaManager = React.lazy(() => import('./components/SchemaManager'));
const WhiteLabelSettings = React.lazy(() => import('./components/WhiteLabelSettings'));
const Billing = React.lazy(() => import('./components/Billing'));
const AgencyAdmin = React.lazy(() => import('./components/AgencyAdmin'));
const UsageDashboard = React.lazy(() => import('./components/UsageDashboard'));
const Auth = React.lazy(() => import('./components/Auth'));

// URL path <-> ViewType mapping
const VIEW_PATHS: Record<ViewType, string> = {
  dashboard: '/',
  contacts: '/contacts',
  pipeline: '/pipeline',
  automations: '/automations',
  lead_blueprint: '/architecture',
  conversations: '/inbox',
  forms: '/forms',
  sites: '/sites',
  reporting: '/reporting',
  ai_employee: '/ai-agent',
  voice_ai: '/voice-ai',
  ad_manager: '/ads',
  market_intelligence: '/market-intel',
  local_seo: '/local-seo',
  saas_mode: '/saas',
  payments: '/payments',
  calendars: '/calendars',
  reputation: '/reputation',
  social: '/social',
  memberships: '/memberships',
  phone: '/phone',
  snapshots: '/snapshots',
  templates: '/templates',
  communities: '/communities',
  content_ai: '/content-ai',
  affiliate_manager: '/affiliates',
  store: '/store',
  integrations: '/integrations',
  chat_widget: '/chat-widget',
  workflow_logs: '/workflow-logs',
  team_management: '/team',
  mobile_preview: '/mobile-preview',
  media_library: '/media',
  schema_manager: '/schema',
  settings: '/settings',
  billing: '/billing',
  agency: '/sub-accounts',
  usage: '/usage',
};

const PATH_TO_VIEW: Record<string, ViewType> = {};
for (const [view, path] of Object.entries(VIEW_PATHS)) {
  PATH_TO_VIEW[path] = view as ViewType;
}

const VIEW_LABELS: Partial<Record<ViewType, string>> = {
  dashboard: 'Dashboard',
  contacts: 'Contacts',
  pipeline: 'Pipeline',
  automations: 'Automations',
  lead_blueprint: 'Architecture',
  conversations: 'Inbox',
  forms: 'Form Builder',
  sites: 'Sites & Funnels',
  reporting: 'Reporting',
  ai_employee: 'AI Agent',
  voice_ai: 'Voice AI',
  ad_manager: 'Ad Manager',
  market_intelligence: 'Market Intel',
  local_seo: 'Local SEO',
  saas_mode: 'SaaS Mode',
  payments: 'Payments',
  calendars: 'Calendars',
  reputation: 'Reputation',
  social: 'Social Planner',
  phone: 'Phone System',
  settings: 'Settings',
  agency: 'Sub Accounts',
};

const LoadingFallback = () => (
  <div className="h-full flex items-center justify-center">
    <Zap className="w-8 h-8 text-slate-200 animate-pulse" />
  </div>
);

const NexusAppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, login, register, logout, loading: authLoading, error: authError } = useAuth();

  const {
    contacts, agencySettings, setActiveView, isSyncing,
    notifications, removeNotification, updateContact,
    fieldDefinitions
  } = useNexus();

  const { pendingCount, toggleQueue } = useAIQueue();

  const userRole = user?.role || 'agency_admin';

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0, 1]));

  // Derive activeView from URL
  const activeView: ViewType = PATH_TO_VIEW[location.pathname] || 'dashboard';

  // Keep NexusContext in sync with URL
  useEffect(() => {
    setActiveView(activeView);
  }, [activeView, setActiveView]);

  const handleNavClick = (viewId: ViewType) => {
    navigate(VIEW_PATHS[viewId] || '/');
  };

  const toggleGroup = (idx: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const navigationGroups = [
    { title: 'Overview', items: [
      { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'market_intelligence' as ViewType, label: 'Market Intel', icon: Search },
      { id: 'local_seo' as ViewType, label: 'Local SEO', icon: Map },
      { id: 'reporting' as ViewType, label: 'Reporting', icon: BarChart3 },
    ]},
    { title: 'Sales & CRM', items: [
      { id: 'contacts' as ViewType, label: 'Contacts', icon: Users },
      { id: 'pipeline' as ViewType, label: 'Pipeline', icon: GitMerge },
      { id: 'calendars' as ViewType, label: 'Calendars', icon: Calendar },
      { id: 'phone' as ViewType, label: 'Phone', icon: Phone },
    ]},
    { title: 'Marketing', items: [
      { id: 'conversations' as ViewType, label: 'Inbox', icon: MessageSquare },
      { id: 'sites' as ViewType, label: 'Sites & Funnels', icon: Globe },
      { id: 'forms' as ViewType, label: 'Forms', icon: Layers },
      { id: 'social' as ViewType, label: 'Social', icon: Share2 },
      { id: 'ad_manager' as ViewType, label: 'Ads', icon: AdIcon },
    ]},
    { title: 'Automation', items: [
      { id: 'automations' as ViewType, label: 'Workflows', icon: Zap },
      { id: 'lead_blueprint' as ViewType, label: 'Architecture', icon: Network },
      { id: 'ai_employee' as ViewType, label: 'AI Agent', icon: BrainCircuit },
      { id: 'voice_ai' as ViewType, label: 'Voice AI', icon: Mic },
      { id: 'content_ai' as ViewType, label: 'Content AI', icon: Sparkles },
    ]},
    { title: 'Settings', items: [
      { id: 'saas_mode' as ViewType, label: 'SaaS Mode', icon: Rocket, adminOnly: true },
      { id: 'agency' as ViewType, label: 'Sub Accounts', icon: ShieldCheck, adminOnly: true },
      { id: 'snapshots' as ViewType, label: 'Snapshots', icon: Database, adminOnly: true },
      { id: 'settings' as ViewType, label: 'Settings', icon: Settings },
    ]}
  ];

  const selectedContact = useMemo(() => contacts.find(c => c.id === selectedContactId), [contacts, selectedContactId]);

  // Expand the group containing the active view
  useEffect(() => {
    const groupIndex = navigationGroups.findIndex(g => g.items.some(item => item.id === activeView));
    if (groupIndex >= 0) {
      setExpandedGroups(prev => {
        if (prev.has(groupIndex)) return prev;
        return new Set(prev).add(groupIndex);
      });
    }
  }, [activeView]);

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-900"><Zap className="w-10 h-10 text-indigo-400 animate-pulse" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <React.Suspense fallback={null}>
        <Auth
          onLogin={(email, password) => login(email, password, 'agency_admin')}
          onRegister={register}
          platformName={agencySettings.platformName}
          error={authError}
        />
      </React.Suspense>
    );
  }

  const contactClickHandler = (id: string) => setSelectedContactId(id);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-60'} bg-slate-900 flex flex-col shrink-0 border-r border-slate-800 relative z-30 transition-all duration-200`}>
        <div className={`${sidebarCollapsed ? 'p-3 justify-center' : 'px-5 py-4'} flex items-center gap-3`}>
          <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center text-white shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate">{agencySettings.platformName}</span>
              <span className="text-xs text-slate-500">Agency OS</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1 thin-scrollbar">
          {navigationGroups.map((group, idx) => {
            const isExpanded = expandedGroups.has(idx) || sidebarCollapsed;
            const filteredItems = group.items.filter(item => !item.adminOnly || userRole === 'agency_admin');

            return (
              <div key={idx} className="mb-1">
                {!sidebarCollapsed && (
                  <button
                    onClick={() => toggleGroup(idx)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <span>{group.title}</span>
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                )}
                {isExpanded && filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-lg transition-all duration-150 ${activeView === item.id ? 'bg-brand text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className={`${sidebarCollapsed ? 'px-2' : 'px-3'} py-3 border-t border-slate-800`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {!sidebarCollapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-4">
             <h1 className="text-base font-semibold text-slate-900">{VIEW_LABELS[activeView] || activeView.replace(/_/g, ' ')}</h1>
             {isSyncing && (
               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 rounded-full animate-pulse">
                 <Cloud className="w-3 h-3 text-brand" />
                 <span className="text-xs text-brand">Syncing</span>
               </div>
             )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleQueue}
              className="relative flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-all text-sm font-medium"
              title="AI Action Queue"
            >
              <BrainCircuit className="w-4 h-4" />
              <span className="hidden md:block">AI Queue</span>
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
            <button onClick={() => setIsCommandPaletteOpen(true)} className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:border-brand hover:text-brand transition-all text-sm">
               <Search className="w-4 h-4" /> <span className="hidden md:block">Search</span>
               <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-400">⌘K</kbd>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 thin-scrollbar">
           <div className="max-w-7xl mx-auto h-full animate-in fade-in duration-300">
              <React.Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/contacts" element={<ContactManager onContactClick={contactClickHandler} />} />
                  <Route path="/pipeline" element={<KanbanBoard onContactClick={contactClickHandler} />} />
                  <Route path="/automations" element={<AutomationEngine />} />
                  <Route path="/architecture" element={<LeadProcessingBlueprint />} />
                  <Route path="/inbox" element={<CommunicationHub />} />
                  <Route path="/forms" element={<FormBuilder />} />
                  <Route path="/sites" element={<SiteBuilder />} />
                  <Route path="/reporting" element={<Reporting />} />
                  <Route path="/ai-agent" element={<AIEmployee />} />
                  <Route path="/voice-ai" element={<VoiceAI />} />
                  <Route path="/ads" element={<AdManager />} />
                  <Route path="/market-intel" element={<MarketIntelligence />} />
                  <Route path="/local-seo" element={<LocalSEO />} />
                  <Route path="/saas" element={<SaaSMode />} />
                  <Route path="/payments" element={<PaymentsManager />} />
                  <Route path="/calendars" element={<CalendarManager />} />
                  <Route path="/reputation" element={<ReputationManager />} />
                  <Route path="/social" element={<SocialPlanner />} />
                  <Route path="/memberships" element={<MembershipPortal />} />
                  <Route path="/phone" element={<PhoneSystem />} />
                  <Route path="/snapshots" element={<SnapshotsManager />} />
                  <Route path="/templates" element={<EmailTemplates />} />
                  <Route path="/communities" element={<CommunityHub />} />
                  <Route path="/content-ai" element={<ContentAI />} />
                  <Route path="/affiliates" element={<AffiliateManager />} />
                  <Route path="/store" element={<StoreManager />} />
                  <Route path="/integrations" element={<IntegrationHub />} />
                  <Route path="/chat-widget" element={<ChatWidgetBuilder />} />
                  <Route path="/workflow-logs" element={<WorkflowLogs />} />
                  <Route path="/team" element={<TeamManagement />} />
                  <Route path="/mobile-preview" element={<MobileAppPreview />} />
                  <Route path="/media" element={<MediaLibrary />} />
                  <Route path="/schema" element={<SchemaManager />} />
                  <Route path="/settings" element={<WhiteLabelSettings />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/sub-accounts" element={<AgencyAdmin />} />
                  <Route path="/usage" element={<UsageDashboard />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </React.Suspense>
           </div>
        </div>

        {selectedContact && (
          <ContactDetail
            contact={selectedContact}
            onClose={() => setSelectedContactId(null)}
            onUpdate={updateContact}
            fieldDefinitions={fieldDefinitions}
          />
        )}
      </main>

      <AIActionPanel />
      <AutoApproveToast />

      <div className="fixed bottom-6 right-6 z-[110] flex flex-col gap-3">
        {notifications.map(n => (
          <div key={n.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-white animate-in slide-in-from-right duration-300 ${n.type === 'error' ? 'border-rose-200' : 'border-emerald-200'}`}>
            {n.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            <span className="text-sm text-slate-700">{n.message}</span>
            <button onClick={() => removeNotification(n.id)} className="ml-2 p-1 text-slate-300 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <NexusProvider>
    <AIActionQueueProvider>
      <NexusAppContent />
    </AIActionQueueProvider>
  </NexusProvider>
);

export default App;

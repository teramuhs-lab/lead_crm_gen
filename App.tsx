
import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard, Users, GitMerge, Zap, MessageSquare,
  Globe, ShieldCheck, BarChart3, Settings, Search, Mic,
  Rocket, Map, Calendar, Phone, DollarSign, Layers, Mail,
  BrainCircuit, UsersRound, Link2, MonitorPlay as AdIcon,
  MessageSquareCode, History, Image, Database, Smartphone,
  Sparkles, Store, Users2, Cloud, Network, ChevronDown, ChevronRight, X, AlertCircle, CheckCircle2,
  Share2, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { ViewType } from './types';
import { NexusProvider, useNexus } from './context/NexusContext';
import ContactDetail from './components/ContactDetail';

// View Map for Clean Rendering
const VIEW_COMPONENTS: Record<ViewType, React.LazyExoticComponent<any> | React.FC<any>> = {
  dashboard: React.lazy(() => import('./components/Dashboard')),
  contacts: React.lazy(() => import('./components/ContactManager')),
  pipeline: React.lazy(() => import('./components/KanbanBoard')),
  automations: React.lazy(() => import('./components/AutomationEngine')),
  lead_blueprint: React.lazy(() => import('./components/LeadProcessingBlueprint')),
  conversations: React.lazy(() => import('./components/CommunicationHub')),
  forms: React.lazy(() => import('./components/FormBuilder')),
  sites: React.lazy(() => import('./components/SiteBuilder')),
  reporting: React.lazy(() => import('./components/Reporting')),
  ai_employee: React.lazy(() => import('./components/AIEmployee')),
  voice_ai: React.lazy(() => import('./components/VoiceAI')),
  ad_manager: React.lazy(() => import('./components/AdManager')),
  market_intelligence: React.lazy(() => import('./components/MarketIntelligence')),
  local_seo: React.lazy(() => import('./components/LocalSEO')),
  saas_mode: React.lazy(() => import('./components/SaaSMode')),
  payments: React.lazy(() => import('./components/PaymentsManager')),
  calendars: React.lazy(() => import('./components/CalendarManager')),
  reputation: React.lazy(() => import('./components/ReputationManager')),
  social: React.lazy(() => import('./components/SocialPlanner')),
  memberships: React.lazy(() => import('./components/MembershipPortal')),
  phone: React.lazy(() => import('./components/PhoneSystem')),
  snapshots: React.lazy(() => import('./components/SnapshotsManager')),
  templates: React.lazy(() => import('./components/EmailTemplates')),
  communities: React.lazy(() => import('./components/CommunityHub')),
  content_ai: React.lazy(() => import('./components/ContentAI')),
  affiliate_manager: React.lazy(() => import('./components/AffiliateManager')),
  store: React.lazy(() => import('./components/StoreManager')),
  integrations: React.lazy(() => import('./components/IntegrationHub')),
  chat_widget: React.lazy(() => import('./components/ChatWidgetBuilder')),
  workflow_logs: React.lazy(() => import('./components/WorkflowLogs')),
  team_management: React.lazy(() => import('./components/TeamManagement')),
  mobile_preview: React.lazy(() => import('./components/MobileAppPreview')),
  media_library: React.lazy(() => import('./components/MediaLibrary')),
  schema_manager: React.lazy(() => import('./components/SchemaManager')),
  settings: React.lazy(() => import('./components/WhiteLabelSettings')),
  billing: React.lazy(() => import('./components/Billing')),
  agency: React.lazy(() => import('./components/AgencyAdmin')),
};

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

const NexusAppContent: React.FC = () => {
  const {
    contacts, agencySettings, activeView, setActiveView, isSyncing,
    notifications, removeNotification, updateContact, notify,
    activeSubAccount, subAccounts, activeSubAccountId, setActiveSubAccountId,
    fieldDefinitions
  } = useNexus();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'agency_admin' | 'subaccount_user'>('agency_admin');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0, 1]));

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
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'market_intelligence', label: 'Market Intel', icon: Search },
      { id: 'local_seo', label: 'Local SEO', icon: Map },
      { id: 'reporting', label: 'Reporting', icon: BarChart3 },
    ]},
    { title: 'Sales & CRM', items: [
      { id: 'contacts', label: 'Contacts', icon: Users },
      { id: 'pipeline', label: 'Pipeline', icon: GitMerge },
      { id: 'calendars', label: 'Calendars', icon: Calendar },
      { id: 'phone', label: 'Phone', icon: Phone },
    ]},
    { title: 'Marketing', items: [
      { id: 'conversations', label: 'Inbox', icon: MessageSquare },
      { id: 'sites', label: 'Sites & Funnels', icon: Globe },
      { id: 'forms', label: 'Forms', icon: Layers },
      { id: 'social', label: 'Social', icon: Share2 },
      { id: 'ad_manager', label: 'Ads', icon: AdIcon },
    ]},
    { title: 'Automation', items: [
      { id: 'automations', label: 'Workflows', icon: Zap },
      { id: 'lead_blueprint', label: 'Architecture', icon: Network },
      { id: 'ai_employee', label: 'AI Agent', icon: BrainCircuit },
      { id: 'voice_ai', label: 'Voice AI', icon: Mic },
      { id: 'content_ai', label: 'Content AI', icon: Sparkles },
    ]},
    { title: 'Settings', items: [
      { id: 'saas_mode', label: 'SaaS Mode', icon: Rocket, adminOnly: true },
      { id: 'agency', label: 'Sub Accounts', icon: ShieldCheck, adminOnly: true },
      { id: 'snapshots', label: 'Snapshots', icon: Database, adminOnly: true },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]}
  ];

  const selectedContact = useMemo(() => contacts.find(c => c.id === selectedContactId), [contacts, selectedContactId]);

  // Expand the group containing the active view
  React.useEffect(() => {
    const groupIndex = navigationGroups.findIndex(g => g.items.some(item => item.id === activeView));
    if (groupIndex >= 0) {
      setExpandedGroups(prev => {
        if (prev.has(groupIndex)) return prev;
        return new Set(prev).add(groupIndex);
      });
    }
  }, [activeView]);

  if (!isAuthenticated) {
    const Auth = React.lazy(() => import('./components/Auth'));
    return <React.Suspense fallback={null}><Auth onLogin={(role) => { setIsAuthenticated(true); setUserRole(role); }} platformName={agencySettings.platformName} /></React.Suspense>;
  }

  const ActiveComponent = VIEW_COMPONENTS[activeView] || VIEW_COMPONENTS.dashboard;

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
                    onClick={() => setActiveView(item.id as ViewType)}
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
          <button onClick={() => setIsCommandPaletteOpen(true)} className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:border-brand hover:text-brand transition-all text-sm">
             <Search className="w-4 h-4" /> <span className="hidden md:block">Search</span>
             <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-400">⌘K</kbd>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 thin-scrollbar">
           <div className="max-w-7xl mx-auto h-full animate-in fade-in duration-300">
              <React.Suspense fallback={<div className="h-full flex items-center justify-center"><Zap className="w-8 h-8 text-slate-200 animate-pulse" /></div>}>
                <ActiveComponent onContactClick={(id: string) => setSelectedContactId(id)} />
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
    <NexusAppContent />
  </NexusProvider>
);

export default App;

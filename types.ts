
export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'dropdown';
  options?: string[];
  subAccountId: string;
}

export type MessageChannel = 'sms' | 'email' | 'voice' | 'whatsapp';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'received';

export interface Message {
  id: string;
  contactId: string;
  channel: MessageChannel;
  direction: 'inbound' | 'outbound';
  content: string;
  status: MessageStatus;
  timestamp: string;
  providerId?: string;
}

export interface Contact {
  id: string;
  subAccountId: string;
  name: string;
  email: string;
  phone: string;
  status: 'Lead' | 'Interested' | 'Appointment' | 'Closed';
  source: string;
  tags: string[];
  createdAt: string;
  lastActivity: string;
  leadScore: number;
  isArchived?: boolean;
  activities: Activity[];
  tasks: Task[];
  customFields: Record<string, any>;
}

export interface Activity {
  id: string;
  type: 'email' | 'sms' | 'form_submission' | 'page_visit' | 'note' | 'task' | 'scraping_event';
  content: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'completed';
}

export interface SubAccount {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'suspended' | 'trial';
  plan: 'starter' | 'pro' | 'agency';
  leadValue: number;
  apifyToken?: string; // Apify Integration
  // Fix: Added missing twilio property
  twilio?: {
    isVerified: boolean;
  };
}

export interface WorkflowStep {
  id: string;
  type: 'email' | 'wait' | 'condition' | 'ai_step' | 'apify_actor' | 'external_sync'; // Added external_sync
  config: any;
}

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  steps: WorkflowStep[];
}

// Fix: Added missing Block interface
export interface Block {
  id: string;
  type: 'hero' | 'form' | 'text' | 'features';
  title: string;
  subtitle?: string;
  content?: string;
  buttonText?: string;
}

// Fix: Added missing FunnelPage interface
export interface FunnelPage {
  id: string;
  name: string;
  path: string;
  blocks: Block[];
}

export interface Funnel {
  id: string;
  name: string;
  description: string;
  category: 'Lead Gen' | 'Sales' | 'Booking' | 'Webinar';
  status: 'draft' | 'published';
  pages: FunnelPage[]; // Updated from any[]
  stats: { visits: number; conversions: number; };
  // Fix: Added missing lastPublishedAt property
  lastPublishedAt?: string;
}

export interface WorkflowLog {
  id: string;
  contactName: string;
  workflowName: string;
  currentStep: string;
  status: 'success' | 'failed' | 'waiting';
  timestamp: string;
}

export interface SmartList {
  id: string;
  name: string;
  conditions: Array<{
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'contains' | 'exists';
    value: any;
  }>;
}

export interface AgencySettings {
  platformName: string;
  logoUrl: string;
  primaryColor: string;
  customDomain: string;
}

// Fix: Added missing SystemMetric interface
export interface SystemMetric {
  label: string;
  value: string;
  trend?: string;
  up?: boolean;
}

// Fix: Added missing CallLog interface
export interface CallLog {
  id: string;
  contactName: string;
  direction: 'inbound' | 'outbound';
  duration: string;
  status: 'completed' | 'missed';
  timestamp: string;
}

// Fix: Added missing Invoice interface
export interface Invoice {
  id: string;
  contactName: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
}

// Fix: Added missing Snapshot interface
export interface Snapshot {
  id: string;
  name: string;
  category: string;
  contentCount: {
    workflows: number;
    funnels: number;
    forms: number;
  };
}

// Fix: Added missing Affiliate interface
export interface Affiliate {
  id: string;
  name: string;
  commission: number;
  referrals: number;
  payoutStatus: 'paid' | 'pending';
}

// Fix: Added missing Product interface
export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  type: 'digital' | 'physical';
}

// Fix: Added missing AdCampaign interface
export interface AdCampaign {
  id: string;
  platform: 'facebook' | 'google';
  name: string;
  spend: number;
  leads: number;
  roas: number;
  status: 'active' | 'paused';
}

// Fix: Added missing SaaSPlan interface
export interface SaaSPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  isDefault: boolean;
}

// Fix: Added missing SubAccountUser interface
export interface SubAccountUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

// Fix: Added missing Asset interface
export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'pdf';
  url: string;
  size: string;
  createdAt: string;
}

// Fix: Added missing ConversationThread interface
export interface ConversationThread {
  id: string;
  contactId: string;
  lastMessage: string;
  timestamp: string;
}

// Fix: Added missing Calendar interface
export interface Calendar {
  id: string;
  name: string;
  type: string;
}

// Fix: Added missing Appointment interface
export interface Appointment {
  id: string;
  calendarId: string;
  contactId: string;
  startTime: string;
  endTime: string;
  status: 'booked' | 'cancelled';
}

export type ViewType = 
  | 'dashboard' | 'contacts' | 'pipeline' | 'automations' 
  | 'conversations' | 'forms' | 'sites' | 'agency' | 'reporting' 
  | 'settings' | 'calendars' | 'phone' | 'payments' | 'snapshots' 
  | 'templates' | 'ai_employee' | 'workflow_logs' | 'team_management'
  | 'schema_manager' | 'voice_ai' | 'ad_manager' | 'market_intelligence' 
  | 'local_seo' | 'saas_mode' | 'reputation' | 'social' | 'memberships' 
  | 'communities' | 'content_ai' | 'affiliate_manager' | 'store' 
  | 'integrations' | 'chat_widget' | 'mobile_preview' | 'media_library' 
  | 'billing' | 'lead_blueprint';

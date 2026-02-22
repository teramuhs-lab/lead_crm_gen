
export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'dropdown';
  options?: string[];
  subAccountId: string;
}

export type MessageChannel = 'sms' | 'email' | 'voice' | 'whatsapp';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'received';

export interface Message {
  id: string;
  contactId: string;
  channel: MessageChannel;
  direction: 'inbound' | 'outbound';
  content: string;
  status: MessageStatus;
  timestamp: string;
  providerId?: string;
  error?: { code?: string; message: string };
  subject?: string;
  openedAt?: string;
  clickedAt?: string;
  sequenceEmailId?: string;
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
  lastAiInsight?: AIContactInsight;
  lastInsightAt?: string;
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
  type: 'email' | 'sms' | 'wait' | 'condition' | 'ai_step' | 'apify_actor' | 'external_sync';
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

export interface CallLog {
  id: string;
  subAccountId: string;
  contactId?: string;
  contactName: string;
  contactPhone: string;
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'missed' | 'failed' | 'voicemail';
  duration: number;
  twilioCallSid?: string;
  recordingUrl?: string;
  notes: string;
  startedAt: string;
  endedAt?: string;
}

// Fix: Added missing Invoice interface
export interface Invoice {
  id: string;
  subAccountId: string;
  contactId?: string;
  contactName: string;
  stripeInvoiceId?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  description: string;
  dueDate?: string;
  paidAt?: string;
  stripeHostedUrl?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  plan: 'starter' | 'pro' | 'agency';
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

export interface WebSocketEvent {
  type: 'message:new' | 'message:status' | 'message:opened' | 'message:clicked' | 'workflow:step' | 'ai:proposal' | 'sequence:email_sent' | 'sequence:reply_detected' | 'contact:score_updated';
  payload: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  contactId: string;
  currentStepIndex: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
  resumeAt?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface Snapshot {
  id: string;
  name: string;
  description: string;
  category: string;
  content: {
    workflowIds: string[];
    funnelIds: string[];
    formIds: string[];
  };
  contentCount: {
    workflows: number;
    funnels: number;
    forms: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotDeployment {
  id: string;
  snapshotId: string;
  subAccountId: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  details: {
    workflowsCopied: number;
    funnelsCopied: number;
    formsCopied: number;
    errors?: string[];
  };
  deployedAt: string;
}

// ── Product Types ──
export type ProductType = 'digital' | 'physical' | 'service';
export type ProductStatus = 'active' | 'draft' | 'archived';

export interface Product {
  id: string;
  subAccountId: string;
  name: string;
  description: string;
  price: number;
  type: ProductType;
  status: ProductStatus;
  stock: number;
  imageUrl?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ── Course / Membership Types ──
export type CourseStatus = 'draft' | 'published' | 'archived';

export interface Course {
  id: string;
  subAccountId: string;
  title: string;
  description: string;
  price: number;
  lessonCount: number;
  studentCount: number;
  revenue: number;
  status: CourseStatus;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Affiliate Types ──
export type AffiliateStatus = 'active' | 'inactive' | 'pending';
export type PayoutStatus = 'paid' | 'pending' | 'processing';

export interface Affiliate {
  id: string;
  subAccountId: string;
  name: string;
  email: string;
  commissionRate: number;
  totalEarned: number;
  referrals: number;
  status: AffiliateStatus;
  payoutStatus: PayoutStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Community Types ──
export interface Channel {
  id: string;
  subAccountId: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: string;
}

export interface CommunityMessage {
  id: string;
  channelId: string;
  authorName: string;
  content: string;
  likes: number;
  replies: number;
  createdAt: string;
}

// ── Chat Widget Types ──
export interface ChatWidget {
  id: string;
  subAccountId: string;
  name: string;
  bubbleColor: string;
  greeting: string;
  position: string;
  autoOpen: boolean;
  mobileOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Review Types ──
export type ReviewPlatform = 'google' | 'facebook' | 'yelp' | 'other';
export type ReviewStatus = 'new' | 'responded' | 'flagged';

export interface Review {
  id: string;
  subAccountId: string;
  platform: ReviewPlatform;
  author: string;
  rating: number;
  content: string;
  response: string;
  status: ReviewStatus;
  externalUrl?: string;
  reviewDate: string;
  respondedAt?: string;
  createdAt: string;
}

// ── Social Post Types ──
export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter';
export type SocialPostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface SocialPost {
  id: string;
  subAccountId: string;
  platform: SocialPlatform;
  content: string;
  mediaUrls: string[];
  hashtags: string[];
  status: SocialPostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  metrics: { likes?: number; shares?: number; comments?: number; reach?: number };
  createdAt: string;
  updatedAt: string;
}

// ── Ad Campaign Types ──
export type AdPlatform = 'facebook' | 'google' | 'linkedin' | 'tiktok';
export type AdCampaignStatus = 'active' | 'paused' | 'completed' | 'draft';

export interface AdCampaign {
  id: string;
  subAccountId: string;
  platform: AdPlatform;
  name: string;
  status: AdCampaignStatus;
  budget: number;
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  roas: number;
  adCopy: { headline?: string; description?: string; callToAction?: string };
  targetingConfig: Record<string, any>;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ── AI Proxy Response Types ──
export interface LocalSEOResult {
  text: string;
  sources: Array<{ maps?: { title?: string; rating?: string; uri?: string } }>;
}

export interface MarketResearchResult {
  text: string;
  sources: Array<{ web?: { title?: string; uri?: string } }>;
}

// Fix: Added missing SaaSPlan interface
export interface SaaSPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  isDefault: boolean;
  stripePriceId?: string;
  rebillingMarkup: number;
  quotas?: Record<string, number>;
}

export interface EmailBlock {
  id: string;
  type: 'header' | 'text' | 'image' | 'button' | 'divider';
  content: string;
  styles?: Record<string, string>;
}

export interface EmailTemplate {
  id: string;
  subAccountId: string;
  name: string;
  subject: string;
  blocks: EmailBlock[];
  stats: { sent: number; opened: number; clicked: number };
  createdAt: string;
  updatedAt: string;
}

export interface SubAccountUser {
  id: string;
  name: string;
  email: string;
  role: 'agency_admin' | 'subaccount_user';
  status: 'active' | 'invited' | 'suspended';
  permissions: string[];
  subAccountId?: string;
  createdAt: string;
}

// Fix: Added missing Asset interface
export interface Asset {
  id: string;
  subAccountId: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'document';
  url: string;
  size: number;
  mimeType?: string;
  createdAt: string;
}

// Fix: Added missing ConversationThread interface
export interface ConversationThread {
  id: string;
  contactId: string;
  lastMessage: string;
  timestamp: string;
}

export interface Calendar {
  id: string;
  name: string;
  type: 'round_robin' | 'collective' | 'personal';
  subAccountId: string;
}

export interface Appointment {
  id: string;
  calendarId: string;
  contactId: string;
  contactName: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'booked' | 'cancelled' | 'completed' | 'no_show';
  notes: string;
}

// ── AI Employee Types ──
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: AIAction[];
}

export interface AIAction {
  type: 'DRAFT_MESSAGE' | 'BOOK_APPOINTMENT' | 'UPDATE_LEAD_SCORE' | 'SUGGEST_WORKFLOW' | 'CONTACT_SUMMARY';
  params: Record<string, string>;
  label: string;
}

export interface AIContactInsight {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  nextAction: string;
  predictedScore: number;
  keyInsights: string[];
}

export interface AISuggestion {
  type: string;
  title: string;
  description: string;
  contactId?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AIAgentConfig {
  name: string;
  goal: string;
  instructions: string;
}

// ── AI Action Queue Types (Human-in-the-Loop) ──
export type AIProposalStatus = 'pending' | 'approved' | 'dismissed' | 'auto_approved';
export type AIProposalType = 'send_message' | 'update_lead_score' | 'book_appointment' | 'run_workflow' | 'update_contact_status' | 'add_tag' | 'add_task';
export type AIAutonomyTier = 'auto_approve' | 'require_approval' | 'require_approval_preview';
export type AIAutonomyConfig = Record<AIProposalType, AIAutonomyTier>;

export interface AIProposal {
  id: string;
  type: AIProposalType;
  status: AIProposalStatus;
  title: string;
  description: string;
  module: string;
  contactId?: string;
  contactName?: string;
  payload: Record<string, any>;
  source?: 'manual' | 'proactive';
  createdAt: string;
  resolvedAt?: string;
}

export interface AIProposalStat {
  proposalType: AIProposalType;
  approvedCount: number;
  dismissedCount: number;
  autoApprovedCount: number;
}

export interface AIBriefing {
  summary: string;
  followUps: { contactId: string; contactName: string; reason: string; suggestedAction: string }[];
  atRiskDeals: { contactId: string; contactName: string; riskLevel: string; reason: string }[];
  todaysPriorities: { title: string; description: string; priority: 'high' | 'medium' | 'low' }[];
}

// ── Form Types ──
export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'dropdown' | 'checkbox';
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
}

export interface FormSettings {
  redirectUrl?: string;
  notifyEmail?: string;
  workflowId?: string;
  buttonText?: string;
  successMessage?: string;
}

export interface Form {
  id: string;
  subAccountId: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  fields: FormField[];
  settings: FormSettings;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  contactId?: string;
  data: Record<string, string>;
  createdAt: string;
}

// ── Reporting Types ──
export interface ReportingOverview {
  totalContacts: number;
  newContacts: number;
  conversionRate: number;
  totalMessages: number;
  totalAppointments: number;
  pipelineValue: number;
  previousPeriod: {
    newContacts: number;
    conversionRate: number;
    totalMessages: number;
  };
}

export interface PipelineStage {
  stage: string;
  count: number;
}

export interface ActivityDataPoint {
  date: string;
  contacts: number;
  messages: number;
  appointments: number;
}

export interface SourceBreakdown {
  source: string;
  count: number;
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
  | 'billing' | 'lead_blueprint' | 'usage';

// ── Usage Metering ──
export type UsageType =
  | 'ai_chat' | 'ai_draft_message' | 'ai_contact_insight' | 'ai_suggestions'
  | 'ai_briefing' | 'ai_generate_content' | 'ai_local_seo' | 'ai_market_research'
  | 'ai_proactive_insights' | 'ai_review_reply' | 'ai_social_caption' | 'ai_ad_creative'
  | 'ai_lead_enrichment' | 'ai_voice_call';

export interface UsageLog {
  id: string;
  subAccountId: string;
  type: UsageType;
  tokens?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SearchResultEntry {
  id: string;
  subAccountId: string;
  searchType: 'local_seo' | 'market_research';
  query: string;
  result: { text: string; sources: unknown[] };
  createdAt: string;
}

export interface UsageQuota {
  type: UsageType;
  used: number;
  limit: number;
  percentUsed: number;
}

export interface UsageOverview {
  quotas: UsageQuota[];
  totalCalls: number;
  periodStart: string;
  periodEnd: string;
}

// ── AI Chat Sessions ──
export interface AIChatSession {
  id: string;
  subAccountId: string;
  title: string;
  messages: AIMessage[];
  agentConfig: AIAgentConfig;
  createdAt: string;
  updatedAt: string;
}

// ── AI Generated Content Library ──
export interface AIGeneratedContentEntry {
  id: string;
  subAccountId: string;
  contentType: 'email' | 'social' | 'ad';
  prompt: string;
  tone: string;
  content: Record<string, unknown>;
  title: string;
  createdAt: string;
}

// ── AI Usage Reporting ──
export interface AIUsageReport {
  totalAiCalls: number;
  callsByType: { type: string; count: number }[];
  aiCallsOverTime: { date: string; count: number }[];
  topFeatures: { type: string; count: number }[];
}

export interface TenantAIUsage {
  subAccountId: string;
  subAccountName: string;
  plan: string;
  totalAiCalls: number;
  quotaUsedPercent: number;
  topFeature: string;
  callsByType: Record<string, number>;
}

// ── Email Sequence Types ──
export type SequenceStatus = 'draft' | 'active' | 'paused' | 'completed';
export type SequenceEmailStatus = 'pending' | 'sent' | 'failed' | 'skipped';
export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'unenrolled';

export interface EmailSequence {
  id: string;
  subAccountId: string;
  name: string;
  status: SequenceStatus;
  emailCount: number;
  emails: SequenceEmail[];
  createdAt: string;
  updatedAt: string;
}

export interface SequenceEmail {
  id: string;
  sequenceId: string;
  sortOrder: number;
  label: string;
  subject: string;
  body: string;
  delayMinutes: number;
  channel: 'email' | 'sms';
  createdAt: string;
  updatedAt: string;
}

export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  contactId: string;
  currentEmailIndex: number;
  status: EnrollmentStatus;
  nextSendAt?: string;
  lastSentAt?: string;
  sentCount: number;
  messageIds: string[];
  openCount: number;
  clickCount: number;
  replyCount: number;
  pausedReason?: string;
  sequence?: EmailSequence;
  createdAt: string;
  updatedAt: string;
}

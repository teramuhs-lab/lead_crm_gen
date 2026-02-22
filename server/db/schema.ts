import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, uuid, pgEnum } from 'drizzle-orm/pg-core';

// ── Enums ──
export const contactStatusEnum = pgEnum('contact_status', ['Lead', 'Interested', 'Appointment', 'Closed']);
export const messageChannelEnum = pgEnum('message_channel', ['sms', 'email', 'voice', 'whatsapp']);
export const messageStatusEnum = pgEnum('message_status', ['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'received']);
export const messageDirectionEnum = pgEnum('message_direction', ['inbound', 'outbound']);
export const subAccountStatusEnum = pgEnum('sub_account_status', ['active', 'suspended', 'trial']);
export const subAccountPlanEnum = pgEnum('sub_account_plan', ['starter', 'pro', 'agency']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'completed']);
export const funnelCategoryEnum = pgEnum('funnel_category', ['Lead Gen', 'Sales', 'Booking', 'Webinar']);
export const funnelStatusEnum = pgEnum('funnel_status', ['draft', 'published']);
export const fieldTypeEnum = pgEnum('field_type', ['text', 'number', 'date', 'dropdown']);
export const userRoleEnum = pgEnum('user_role', ['agency_admin', 'subaccount_user']);
export const workflowLogStatusEnum = pgEnum('workflow_log_status', ['success', 'failed', 'waiting']);
export const calendarTypeEnum = pgEnum('calendar_type', ['round_robin', 'collective', 'personal']);
export const appointmentStatusEnum = pgEnum('appointment_status', ['booked', 'cancelled', 'completed', 'no_show']);
export const userStatusEnum = pgEnum('user_status', ['active', 'invited', 'suspended']);

// ── Users (auth + team) ──
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull().default(''),
  role: userRoleEnum('role').notNull().default('agency_admin'),
  status: userStatusEnum('status').notNull().default('active'),
  permissions: jsonb('permissions').notNull().default([]),
  subAccountId: uuid('sub_account_id').references(() => subAccounts.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Sub Accounts ──
export const subAccounts = pgTable('sub_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }).notNull(),
  status: subAccountStatusEnum('status').notNull().default('active'),
  plan: subAccountPlanEnum('plan').notNull().default('pro'),
  leadValue: integer('lead_value').notNull().default(500),
  twilioConfig: jsonb('twilio_config'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Agency Settings ──
export const agencySettings = pgTable('agency_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  platformName: varchar('platform_name', { length: 255 }).notNull().default('Nexus CRM'),
  logoUrl: text('logo_url').notNull().default(''),
  primaryColor: varchar('primary_color', { length: 7 }).notNull().default('#6366f1'),
  customDomain: varchar('custom_domain', { length: 255 }).notNull().default(''),
});

// ── Contacts ──
export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().default(''),
  phone: varchar('phone', { length: 50 }).notNull().default(''),
  status: contactStatusEnum('status').notNull().default('Lead'),
  source: varchar('source', { length: 255 }).notNull().default('Direct'),
  tags: jsonb('tags').notNull().default([]),
  leadScore: integer('lead_score').notNull().default(40),
  isArchived: boolean('is_archived').notNull().default(false),
  customFields: jsonb('custom_fields').notNull().default({}),
  lastActivity: varchar('last_activity', { length: 255 }).notNull().default('Initialized'),
  lastAiInsight: jsonb('last_ai_insight'),
  lastInsightAt: timestamp('last_insight_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Activities ──
export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  content: text('content').notNull().default(''),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// ── Tasks ──
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  dueDate: timestamp('due_date').defaultNow().notNull(),
  status: taskStatusEnum('status').notNull().default('pending'),
});

// ── Messages ──
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  channel: messageChannelEnum('channel').notNull(),
  direction: messageDirectionEnum('direction').notNull(),
  content: text('content').notNull(),
  status: messageStatusEnum('status').notNull().default('queued'),
  providerId: varchar('provider_id', { length: 255 }),
  subject: varchar('subject', { length: 500 }),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  sequenceEmailId: uuid('sequence_email_id').references(() => sequenceEmails.id),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// ── Workflows ──
export const workflows = pgTable('workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  trigger: varchar('trigger', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull().default(false),
});

// ── Workflow Steps ──
export const workflowSteps = pgTable('workflow_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  config: jsonb('config').notNull().default({}),
  sortOrder: integer('sort_order').notNull().default(0),
});

// ── Workflow Logs ──
export const workflowLogs = pgTable('workflow_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  workflowName: varchar('workflow_name', { length: 255 }).notNull(),
  currentStep: varchar('current_step', { length: 255 }).notNull(),
  status: workflowLogStatusEnum('status').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// ── Funnels ──
export const funnels = pgTable('funnels', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  category: funnelCategoryEnum('category').notNull().default('Lead Gen'),
  status: funnelStatusEnum('status').notNull().default('draft'),
  stats: jsonb('stats').notNull().default({ visits: 0, conversions: 0 }),
  lastPublishedAt: timestamp('last_published_at'),
});

// ── Funnel Pages ──
export const funnelPages = pgTable('funnel_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  funnelId: uuid('funnel_id').notNull().references(() => funnels.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  path: varchar('path', { length: 255 }).notNull(),
  blocks: jsonb('blocks').notNull().default([]),
  sortOrder: integer('sort_order').notNull().default(0),
});

// ── Custom Field Definitions ──
export const customFieldDefinitions = pgTable('custom_field_definitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: varchar('label', { length: 255 }).notNull(),
  type: fieldTypeEnum('type').notNull(),
  options: jsonb('options'),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
});

// ── Calendars ──
export const calendars = pgTable('calendars', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: calendarTypeEnum('type').notNull().default('personal'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Appointments ──
export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  calendarId: uuid('calendar_id').notNull().references(() => calendars.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').references(() => contacts.id),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  status: appointmentStatusEnum('status').notNull().default('booked'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Smart Lists ──
export const smartLists = pgTable('smart_lists', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  conditions: jsonb('conditions').notNull().default([]),
});

// ── AI Enums ──
export const aiProposalStatusEnum = pgEnum('ai_proposal_status', ['pending', 'approved', 'dismissed', 'auto_approved']);
export const aiProposalTypeEnum = pgEnum('ai_proposal_type', [
  'send_message', 'update_lead_score', 'book_appointment',
  'run_workflow', 'update_contact_status', 'add_tag', 'add_task',
]);
export const aiAutonomyTierEnum = pgEnum('ai_autonomy_tier', ['auto_approve', 'require_approval', 'require_approval_preview']);

// ── AI Proposals ──
export const aiProposals = pgTable('ai_proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  type: aiProposalTypeEnum('type').notNull(),
  status: aiProposalStatusEnum('status').notNull().default('pending'),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description').notNull().default(''),
  module: varchar('module', { length: 100 }).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id),
  contactName: varchar('contact_name', { length: 255 }),
  payload: jsonb('payload').notNull().default({}),
  source: varchar('source', { length: 50 }).notNull().default('manual'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── AI Autonomy Settings ──
export const aiAutonomySettings = pgTable('ai_autonomy_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  proposalType: aiProposalTypeEnum('proposal_type').notNull(),
  tier: aiAutonomyTierEnum('tier').notNull(),
});

// ── AI Proposal Stats ──
export const aiProposalStats = pgTable('ai_proposal_stats', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  proposalType: aiProposalTypeEnum('proposal_type').notNull(),
  approvedCount: integer('approved_count').notNull().default(0),
  dismissedCount: integer('dismissed_count').notNull().default(0),
  autoApprovedCount: integer('auto_approved_count').notNull().default(0),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
});

// ── Payment & Billing Enums ──
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'open', 'paid', 'void', 'uncollectible']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'past_due', 'canceled', 'trialing', 'incomplete']);
export const workflowExecutionStatusEnum = pgEnum('workflow_execution_status', ['running', 'paused', 'completed', 'failed']);

// ── Invoices ──
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  contactId: uuid('contact_id').references(() => contacts.id),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  status: invoiceStatusEnum('status').notNull().default('draft'),
  description: text('description').notNull().default(''),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  stripeHostedUrl: text('stripe_hosted_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Subscriptions ──
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  plan: subAccountPlanEnum('plan').notNull().default('pro'),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Payment Methods ──
export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  stripePaymentMethodId: varchar('stripe_payment_method_id', { length: 255 }).notNull(),
  brand: varchar('brand', { length: 50 }).notNull().default(''),
  last4: varchar('last4', { length: 4 }).notNull().default(''),
  expMonth: integer('exp_month'),
  expYear: integer('exp_year'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Email Templates ──
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull().default(''),
  blocks: jsonb('blocks').notNull().default([]),
  stats: jsonb('stats').notNull().default({ sent: 0, opened: 0, clicked: 0 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Assets (Media Library) ──
export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  url: text('url').notNull(),
  size: integer('size').notNull().default(0),
  mimeType: varchar('mime_type', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── SaaS Plans ──
export const saasPlans = pgTable('saas_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: integer('price').notNull(),
  features: jsonb('features').notNull().default([]),
  isDefault: boolean('is_default').notNull().default(false),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  rebillingMarkup: integer('rebilling_markup').notNull().default(20),
  quotas: jsonb('quotas').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Forms ──
export const formStatusEnum = pgEnum('form_status', ['draft', 'active', 'archived']);

export const forms = pgTable('forms', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  status: formStatusEnum('status').notNull().default('draft'),
  fields: jsonb('fields').notNull().default([]),
  settings: jsonb('settings').notNull().default({}),
  submissionCount: integer('submission_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Form Submissions ──
export const formSubmissions = pgTable('form_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').references(() => contacts.id),
  data: jsonb('data').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Call Logs ──
export const callDirectionEnum = pgEnum('call_direction', ['inbound', 'outbound']);
export const callStatusEnum = pgEnum('call_status', ['initiated', 'ringing', 'in_progress', 'completed', 'missed', 'failed', 'voicemail']);

export const callLogs = pgTable('call_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  contactId: uuid('contact_id').references(() => contacts.id),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 50 }).notNull().default(''),
  direction: callDirectionEnum('direction').notNull(),
  status: callStatusEnum('status').notNull().default('initiated'),
  duration: integer('duration').notNull().default(0),
  twilioCallSid: varchar('twilio_call_sid', { length: 255 }),
  recordingUrl: text('recording_url'),
  notes: text('notes').notNull().default(''),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
});

// ── Snapshots ──
export const snapshots = pgTable('snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  category: varchar('category', { length: 100 }).notNull().default('General'),
  content: jsonb('content').notNull().default({}),
  contentCount: jsonb('content_count').notNull().default({ workflows: 0, funnels: 0, forms: 0 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Snapshot Deployments ──
export const deploymentStatusEnum = pgEnum('deployment_status', ['pending', 'in_progress', 'success', 'failed']);

export const snapshotDeployments = pgTable('snapshot_deployments', {
  id: uuid('id').defaultRandom().primaryKey(),
  snapshotId: uuid('snapshot_id').notNull().references(() => snapshots.id, { onDelete: 'cascade' }),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  status: deploymentStatusEnum('status').notNull().default('pending'),
  details: jsonb('details').notNull().default({}),
  deployedAt: timestamp('deployed_at').defaultNow().notNull(),
});

// ── Workflow Executions ──
export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id),
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  currentStepIndex: integer('current_step_index').notNull().default(0),
  status: workflowExecutionStatusEnum('status').notNull().default('running'),
  context: jsonb('context').notNull().default({}),
  resumeAt: timestamp('resume_at'),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// ── Reviews ──
export const reviewPlatformEnum = pgEnum('review_platform', ['google', 'facebook', 'yelp', 'other']);
export const reviewStatusEnum = pgEnum('review_status', ['new', 'responded', 'flagged']);

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  platform: reviewPlatformEnum('platform').notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  rating: integer('rating').notNull(),
  content: text('content').notNull().default(''),
  response: text('response').notNull().default(''),
  status: reviewStatusEnum('status').notNull().default('new'),
  externalUrl: text('external_url'),
  reviewDate: timestamp('review_date').defaultNow().notNull(),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Social Posts ──
export const socialPlatformEnum = pgEnum('social_platform', ['facebook', 'instagram', 'linkedin', 'twitter']);
export const socialPostStatusEnum = pgEnum('social_post_status', ['draft', 'scheduled', 'published', 'failed']);

export const socialPosts = pgTable('social_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  platform: socialPlatformEnum('platform').notNull(),
  content: text('content').notNull(),
  mediaUrls: jsonb('media_urls').notNull().default([]),
  hashtags: jsonb('hashtags').notNull().default([]),
  status: socialPostStatusEnum('status').notNull().default('draft'),
  scheduledAt: timestamp('scheduled_at'),
  publishedAt: timestamp('published_at'),
  metrics: jsonb('metrics').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Ad Campaigns ──
export const adPlatformEnum = pgEnum('ad_platform', ['facebook', 'google', 'linkedin', 'tiktok']);
export const adCampaignStatusEnum = pgEnum('ad_campaign_status', ['active', 'paused', 'completed', 'draft']);

export const adCampaigns = pgTable('ad_campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  platform: adPlatformEnum('platform').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  status: adCampaignStatusEnum('status').notNull().default('draft'),
  budget: integer('budget').notNull().default(0),
  spend: integer('spend').notNull().default(0),
  leads: integer('leads').notNull().default(0),
  impressions: integer('impressions').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  roas: integer('roas').notNull().default(0),
  adCopy: jsonb('ad_copy').notNull().default({}),
  targetingConfig: jsonb('targeting_config').notNull().default({}),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Products ──
export const productTypeEnum = pgEnum('product_type', ['digital', 'physical', 'service']);
export const productStatusEnum = pgEnum('product_status', ['active', 'draft', 'archived']);

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  price: integer('price').notNull().default(0),
  type: productTypeEnum('type').notNull().default('digital'),
  status: productStatusEnum('status').notNull().default('draft'),
  stock: integer('stock').notNull().default(0),
  imageUrl: text('image_url'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Courses / Memberships ──
export const courseStatusEnum = pgEnum('course_status', ['draft', 'published', 'archived']);

export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  price: integer('price').notNull().default(0),
  lessonCount: integer('lesson_count').notNull().default(0),
  studentCount: integer('student_count').notNull().default(0),
  revenue: integer('revenue').notNull().default(0),
  status: courseStatusEnum('status').notNull().default('draft'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Affiliates ──
export const affiliateStatusEnum = pgEnum('affiliate_status', ['active', 'inactive', 'pending']);
export const payoutStatusEnum = pgEnum('payout_status', ['paid', 'pending', 'processing']);

export const affiliates = pgTable('affiliates', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().default(''),
  commissionRate: integer('commission_rate').notNull().default(10),
  totalEarned: integer('total_earned').notNull().default(0),
  referrals: integer('referrals').notNull().default(0),
  status: affiliateStatusEnum('status').notNull().default('active'),
  payoutStatus: payoutStatusEnum('payout_status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Community ──
export const channels = pgTable('channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  memberCount: integer('member_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const communityMessages = pgTable('community_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').notNull().references(() => channels.id),
  authorName: varchar('author_name', { length: 255 }).notNull(),
  content: text('content').notNull(),
  likes: integer('likes').notNull().default(0),
  replies: integer('replies').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Chat Widget Configs ──
export const chatWidgets = pgTable('chat_widgets', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  name: varchar('name', { length: 255 }).notNull().default('Chat Widget'),
  bubbleColor: varchar('bubble_color', { length: 7 }).notNull().default('#6366f1'),
  greeting: text('greeting').notNull().default('Hi! How can we help you today?'),
  position: varchar('position', { length: 20 }).notNull().default('bottom-right'),
  autoOpen: boolean('auto_open').notNull().default(false),
  mobileOnly: boolean('mobile_only').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Usage Metering ──
export const usageTypeEnum = pgEnum('usage_type', [
  'ai_chat', 'ai_draft_message', 'ai_contact_insight', 'ai_suggestions',
  'ai_briefing', 'ai_generate_content', 'ai_local_seo', 'ai_market_research',
  'ai_proactive_insights', 'ai_review_reply', 'ai_social_caption', 'ai_ad_creative',
  'ai_lead_enrichment', 'ai_voice_call',
]);
export const searchTypeEnum = pgEnum('search_type', ['local_seo', 'market_research']);

export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  type: usageTypeEnum('type').notNull(),
  tokens: integer('tokens'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const searchResults = pgTable('search_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  searchType: searchTypeEnum('search_type').notNull(),
  query: text('query').notNull(),
  result: jsonb('result').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── AI Chat Sessions ──
export const aiChatSessions = pgTable('ai_chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  title: varchar('title', { length: 255 }).notNull().default('New Chat'),
  messages: jsonb('messages').notNull().default([]),
  agentConfig: jsonb('agent_config').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── AI Generated Content ──
export const aiGeneratedContent = pgTable('ai_generated_content', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  contentType: varchar('content_type', { length: 20 }).notNull(),
  prompt: text('prompt').notNull(),
  tone: varchar('tone', { length: 50 }).notNull().default('Professional'),
  content: jsonb('content').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Integrations ──
export const integrationStatusEnum = pgEnum('integration_status', ['connected', 'disconnected', 'error']);

export const integrations = pgTable('integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  config: jsonb('config').notNull().default({}),
  status: integrationStatusEnum('status').notNull().default('disconnected'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Email Sequence Enums ──
export const sequenceStatusEnum = pgEnum('sequence_status', ['draft', 'active', 'paused', 'completed']);
export const sequenceEmailStatusEnum = pgEnum('sequence_email_status', ['pending', 'sent', 'failed', 'skipped']);
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'paused', 'completed', 'unenrolled']);

// ── Email Sequences ──
export const emailSequences = pgTable('email_sequences', {
  id: uuid('id').defaultRandom().primaryKey(),
  subAccountId: uuid('sub_account_id').notNull().references(() => subAccounts.id),
  name: varchar('name', { length: 255 }).notNull().default('Default Sequence'),
  status: sequenceStatusEnum('status').notNull().default('draft'),
  emailCount: integer('email_count').notNull().default(3),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Sequence Emails ──
export const sequenceEmails = pgTable('sequence_emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  sequenceId: uuid('sequence_id').notNull().references(() => emailSequences.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  label: varchar('label', { length: 50 }).notNull().default('Initial'),
  subject: varchar('subject', { length: 500 }).notNull().default(''),
  body: text('body').notNull().default(''),
  delayMinutes: integer('delay_minutes').notNull().default(1440),
  channel: messageChannelEnum('channel').notNull().default('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Sequence Enrollments ──
export const sequenceEnrollments = pgTable('sequence_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  sequenceId: uuid('sequence_id').notNull().references(() => emailSequences.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  currentEmailIndex: integer('current_email_index').notNull().default(0),
  status: enrollmentStatusEnum('status').notNull().default('active'),
  nextSendAt: timestamp('next_send_at'),
  lastSentAt: timestamp('last_sent_at'),
  sentCount: integer('sent_count').notNull().default(0),
  messageIds: jsonb('message_ids').notNull().default([]),
  openCount: integer('open_count').notNull().default(0),
  clickCount: integer('click_count').notNull().default(0),
  replyCount: integer('reply_count').notNull().default(0),
  pausedReason: varchar('paused_reason', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

import 'dotenv/config';
import { db } from './index.js';
import { users, subAccounts, agencySettings, contacts, workflows, funnels, customFieldDefinitions, smartLists, calendars, appointments, aiAutonomySettings } from './schema.js';
import { hashPassword } from '../lib/password.js';

async function seed() {
  console.log('Seeding database...');

  // 1. Admin user
  const passwordHash = await hashPassword('admin1234');
  const [admin] = await db.insert(users).values({
    email: 'admin@nexus-crm.com',
    passwordHash,
    name: 'Admin',
    role: 'agency_admin',
    status: 'active',
    permissions: ['contacts', 'conversations', 'workflows', 'funnels', 'calendars', 'billing', 'settings', 'team'],
  }).onConflictDoNothing().returning();

  if (admin) {
    console.log(`  Created admin user: ${admin.email}`);
  } else {
    console.log('  Admin user already exists, skipping.');
  }

  // 2. Agency settings (singleton)
  const existingSettings = await db.select().from(agencySettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(agencySettings).values({
      platformName: 'Nexus CRM',
      primaryColor: '#6366f1',
    });
    console.log('  Created agency settings.');
  } else {
    console.log('  Agency settings already exist, skipping.');
  }

  // 3. Default sub-account
  const existingSubs = await db.select().from(subAccounts).limit(1);
  let subId: string;
  if (existingSubs.length === 0) {
    const [sub] = await db.insert(subAccounts).values({
      name: 'Main Account',
      domain: 'main.nexus.io',
      status: 'active',
      plan: 'pro',
      leadValue: 500,
    }).returning();
    subId = sub.id;
    console.log(`  Created sub-account: ${sub.name}`);
  } else {
    subId = existingSubs[0].id;
    console.log('  Sub-account already exists, skipping.');
  }

  // 4. Sample contact
  const existingContacts = await db.select().from(contacts).limit(1);
  if (existingContacts.length === 0) {
    const [contact] = await db.insert(contacts).values({
      subAccountId: subId,
      name: 'James Carter',
      email: 'james@enterprise.com',
      phone: '+1 555 0101',
      status: 'Lead',
      source: 'Facebook Ads',
      tags: ['High Intent'],
      leadScore: 75,
    }).returning();
    console.log(`  Created sample contact: ${contact.name}`);
  } else {
    console.log('  Contacts already exist, skipping.');
  }

  // 5. Sample workflow
  const existingWfs = await db.select().from(workflows).limit(1);
  if (existingWfs.length === 0) {
    const [wf] = await db.insert(workflows).values({
      name: 'New Lead Speed-to-Lead',
      trigger: 'Form Submitted',
      isActive: true,
    }).returning();
    console.log(`  Created workflow: ${wf.name}`);
  } else {
    console.log('  Workflows already exist, skipping.');
  }

  // 6. Sample funnel
  const existingFunnels = await db.select().from(funnels).limit(1);
  if (existingFunnels.length === 0) {
    const [funnel] = await db.insert(funnels).values({
      name: 'Agency Landing Page',
      description: 'Main acquisition funnel',
      category: 'Lead Gen',
      status: 'published',
      stats: { visits: 1420, conversions: 88 },
    }).returning();
    console.log(`  Created funnel: ${funnel.name}`);
  } else {
    console.log('  Funnels already exist, skipping.');
  }

  // 7. Sample custom field definition
  const existingFields = await db.select().from(customFieldDefinitions).limit(1);
  if (existingFields.length === 0) {
    await db.insert(customFieldDefinitions).values({
      label: 'Company Name',
      type: 'text',
      subAccountId: subId,
    });
    console.log('  Created custom field definition.');
  } else {
    console.log('  Field definitions already exist, skipping.');
  }

  // 8. Sample smart list
  const existingLists = await db.select().from(smartLists).limit(1);
  if (existingLists.length === 0) {
    await db.insert(smartLists).values({
      name: 'High Score Leads',
      conditions: [{ field: 'leadScore', operator: 'gt', value: 80 }],
    });
    console.log('  Created smart list.');
  } else {
    console.log('  Smart lists already exist, skipping.');
  }

  // 9. Sample calendar + appointments
  const existingCals = await db.select().from(calendars).limit(1);
  if (existingCals.length === 0) {
    const [cal] = await db.insert(calendars).values({
      subAccountId: subId,
      name: 'Sales Calls',
      type: 'personal',
    }).returning();
    console.log(`  Created calendar: ${cal.name}`);

    // Get the first contact for linking appointments
    const existingContact = await db.select().from(contacts).limit(1);
    const contactId = existingContact[0]?.id;
    const contactName = existingContact[0]?.name || 'James Carter';

    // Create 3 appointments this week
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay();
    monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);

    const aptData = [
      { dayOffset: 1, hour: 10, title: 'Product Demo', contactName },
      { dayOffset: 2, hour: 14, title: 'Follow-up Call', contactName },
      { dayOffset: 3, hour: 11, title: 'Strategy Session', contactName },
    ];

    for (const apt of aptData) {
      const start = new Date(monday);
      start.setDate(start.getDate() + apt.dayOffset);
      start.setHours(apt.hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(apt.hour + 1);

      await db.insert(appointments).values({
        calendarId: cal.id,
        contactId: contactId || null,
        contactName: apt.contactName,
        title: apt.title,
        startTime: start,
        endTime: end,
        status: 'booked',
        notes: '',
      });
    }
    console.log('  Created 3 sample appointments.');
  } else {
    console.log('  Calendar already exists, skipping.');
  }

  // 10. AI Autonomy Settings (defaults)
  const existingAutonomy = await db.select().from(aiAutonomySettings).limit(1);
  if (existingAutonomy.length === 0) {
    const defaults: { proposalType: 'add_tag' | 'add_task' | 'update_lead_score' | 'book_appointment' | 'update_contact_status' | 'run_workflow' | 'send_message'; tier: 'auto_approve' | 'require_approval' | 'require_approval_preview' }[] = [
      { proposalType: 'add_tag', tier: 'auto_approve' },
      { proposalType: 'add_task', tier: 'auto_approve' },
      { proposalType: 'update_lead_score', tier: 'auto_approve' },
      { proposalType: 'book_appointment', tier: 'require_approval' },
      { proposalType: 'update_contact_status', tier: 'require_approval' },
      { proposalType: 'run_workflow', tier: 'require_approval' },
      { proposalType: 'send_message', tier: 'require_approval_preview' },
    ];
    for (const d of defaults) {
      await db.insert(aiAutonomySettings).values({
        subAccountId: subId,
        proposalType: d.proposalType,
        tier: d.tier,
      });
    }
    console.log('  Created 7 default AI autonomy settings.');
  } else {
    console.log('  AI autonomy settings already exist, skipping.');
  }

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

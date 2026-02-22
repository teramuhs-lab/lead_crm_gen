/**
 * Standalone batch enrichment script.
 * Runs enrichment directly on unenriched Local SEO contacts.
 * Usage: npx tsx server/scripts/enrich-batch.ts [--industry HVAC] [--limit 20]
 */

import '../env.js';
import { db } from '../db/index.js';
import { contacts, activities } from '../db/schema.js';
import { eq, isNull, sql } from 'drizzle-orm';
import { discoverEmail } from '../lib/email-discovery.js';
import { resolveWebsite } from '../lib/website-resolver.js';
import { recalculateLeadScore } from '../lib/lead-scoring.js';

// Parse CLI args
const args = process.argv.slice(2);
const industryArg = args.includes('--industry') ? args[args.indexOf('--industry') + 1] : undefined;
const limitArg = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 20;
const retryMode = args.includes('--retry-no-email');

// Rate limit tracking
let consecutiveRateLimits = 0;
const BASE_DELAY_MS = 6000; // 6s base delay (safe for 12 req/min Gemini limit)

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function getDelay(): number {
  // Back off more aggressively after consecutive rate limits
  if (consecutiveRateLimits >= 3) return 15000; // 15s after 3+ rate limits
  if (consecutiveRateLimits >= 1) return 10000;  // 10s after 1-2 rate limits
  return BASE_DELAY_MS;
}

async function enrichContact(contact: any): Promise<{ email: string | null; error?: string }> {
  const customFields = (contact.customFields as Record<string, any>) || {};
  const businessName = contact.name;
  let website = customFields.website || '';
  const location = customFields.location || '';
  const industry = customFields.industry || '';

  // Skip if already enriched (unless in retry mode)
  if (customFields.enriched_at && !retryMode) {
    console.log(`  ⏭  Already enriched, skipping`);
    return { email: contact.email || null };
  }

  // 1. Resolve website if missing
  if (!website && businessName) {
    try {
      const resolved = await resolveWebsite({
        businessName,
        location,
        googleMapsUrl: customFields.google_maps_url || '',
        placeId: customFields.place_id || '',
      });
      if (resolved.website) {
        website = resolved.website;
        consecutiveRateLimits = 0; // Reset on success
        console.log(`  🌐 Resolved website: ${website} (via ${resolved.source})`);
      }
    } catch (err: any) {
      if (err.message?.includes('Rate limit')) {
        consecutiveRateLimits++;
        const backoff = getDelay();
        console.error(`  ⚠  Rate limited (${consecutiveRateLimits}x). Backing off ${backoff / 1000}s...`);
        await sleep(backoff);
        // Retry once after backoff
        try {
          const retryResult = await resolveWebsite({
            businessName,
            location,
            googleMapsUrl: customFields.google_maps_url || '',
            placeId: customFields.place_id || '',
          });
          if (retryResult.website) {
            website = retryResult.website;
            consecutiveRateLimits = 0;
            console.log(`  🌐 Resolved website (retry): ${website} (via ${retryResult.source})`);
          }
        } catch (retryErr: any) {
          console.error(`  ⚠  Retry also failed: ${retryErr.message}`);
        }
      } else {
        console.error(`  ⚠  Website resolution failed: ${err.message}`);
      }
    }
  }

  // 2. Email discovery (scrape website + Gemini fallback)
  const discoveryResult = await discoverEmail({
    businessName,
    website,
    location,
    industry,
    skipGemini: false,
    includeBusinessData: true,
  });

  const validEmail = discoveryResult.email;
  const ownerName = discoveryResult.businessData?.ownerName || customFields.owner_name || '';
  const services = discoveryResult.businessData?.services || '';
  const painPoints = discoveryResult.businessData?.painPoints || '';
  const socialLinks = discoveryResult.businessData?.socialLinks || '';

  const emailSource = validEmail
    ? discoveryResult.allCandidates.find(c => c.email === validEmail)?.source || 'unknown'
    : 'none';

  // 3. Update contact
  const updatedCustomFields = {
    ...customFields,
    website: website || customFields.website || undefined,
    enriched_email: validEmail || undefined,
    owner_name: ownerName || customFields.owner_name || undefined,
    services: services || customFields.services || undefined,
    pain_points: painPoints || customFields.pain_points || undefined,
    social_links: socialLinks || customFields.social_links || undefined,
    enrichment_source: emailSource,
    enrichment_strategies: discoveryResult.strategies.map(s => ({ name: s.name, result: s.result, durationMs: s.durationMs })),
    enriched_at: new Date().toISOString(),
  };

  const updatePayload: Record<string, any> = {
    customFields: updatedCustomFields,
    lastActivity: 'Lead enriched via AI',
  };

  if (validEmail && !contact.email) {
    updatePayload.email = validEmail;
  }

  await db.update(contacts).set(updatePayload).where(eq(contacts.id, contact.id));

  // 4. Log activity
  const strategyNames = discoveryResult.strategies
    .filter(s => s.result === 'found')
    .map(s => s.name)
    .join(', ');

  await db.insert(activities).values({
    contactId: contact.id,
    type: 'scraping_event',
    content: `Email discovery: ${validEmail ? `Found ${validEmail} via ${strategyNames}` : 'No email found'}. ` +
      `Tried ${discoveryResult.strategies.filter(s => s.attempted).length} strategies in ${discoveryResult.totalDurationMs}ms. ` +
      `Owner: ${ownerName || 'Unknown'}.`,
  });

  // 5. Recalculate lead score
  await recalculateLeadScore(contact.id, 'enrichment');

  return { email: validEmail };
}

async function main() {
  console.log('=== Batch Enrichment Script ===');
  console.log(`Mode: ${retryMode ? 'RETRY (re-enrich contacts with no email)' : 'standard'}`);
  console.log(`Filter: industry=${industryArg || 'any'}, limit=${limitArg}`);
  console.log(`Base delay: ${BASE_DELAY_MS / 1000}s (with adaptive backoff)`);
  console.log('');

  // Find unenriched Local SEO contacts (most recent first)
  const query = db.select().from(contacts)
    .where(eq(contacts.source, 'Local SEO Discovery'))
    .orderBy(sql`${contacts.createdAt} DESC`)
    .limit(200);

  const allContacts = await query;

  // Filter contacts based on mode
  const toEnrich = allContacts.filter(c => {
    const cf = (c.customFields as Record<string, any>) || {};
    if (industryArg && cf.industry !== industryArg) return false;

    if (retryMode) {
      // --retry-no-email: pick contacts that were enriched but got no email
      return cf.enriched_at && !cf.enriched_email && !c.email;
    } else {
      // Default: pick unenriched contacts
      return !cf.enriched_at;
    }
  });

  console.log(`Found ${toEnrich.length} unenriched contacts (of ${allContacts.length} total)`);
  console.log('');

  let emailsFound = 0;
  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < toEnrich.length; i++) {
    const c = toEnrich[i];
    const cf = (c.customFields as Record<string, any>) || {};
    console.log(`[${i + 1}/${toEnrich.length}] ${c.name}`);
    console.log(`  Website: ${cf.website || 'none'}`);

    try {
      const result = await enrichContact(c);
      enriched++;
      if (result.email) {
        emailsFound++;
        console.log(`  ✅ Email found: ${result.email}`);
      } else {
        console.log(`  ❌ No email found`);
      }
    } catch (err: any) {
      failed++;
      console.error(`  💥 Error: ${err.message}`);
    }

    // Rate limit buffer (adaptive)
    if (i < toEnrich.length - 1) {
      const delay = getDelay();
      console.log(`  ⏳ Waiting ${delay / 1000}s...`);
      await sleep(delay);
    }
    console.log('');
  }

  console.log('=== RESULTS ===');
  console.log(`Enriched: ${enriched}/${toEnrich.length}`);
  console.log(`Emails found: ${emailsFound}`);
  console.log(`Failed: ${failed}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

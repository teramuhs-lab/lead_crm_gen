import './env.js';
import { createServer } from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/error.js';
import { initWebSocket } from './lib/ws.js';
import { startWorkflowScheduler } from './lib/workflow-engine.js';
import { startSequenceScheduler } from './lib/sequence-engine.js';
import { startTimeDecayScheduler } from './lib/lead-scoring.js';
import webhookRoutes from './routes/webhooks.js';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import funnelRoutes from './routes/funnels.js';
import workflowRoutes from './routes/workflows.js';
import messageRoutes from './routes/messages.js';
import subAccountRoutes from './routes/sub-accounts.js';
import settingsRoutes from './routes/settings.js';
import calendarRoutes from './routes/calendars.js';
import teamRoutes from './routes/team.js';
import aiRoutes from './routes/ai.js';
import paymentRoutes from './routes/payments.js';
import templateRoutes from './routes/templates.js';
import assetRoutes from './routes/assets.js';
import saasRoutes from './routes/saas.js';
import formRoutes from './routes/forms.js';
import phoneRoutes from './routes/phone.js';
import reportingRoutes from './routes/reporting.js';
import snapshotRoutes from './routes/snapshots.js';
import reputationRoutes from './routes/reputation.js';
import socialRoutes from './routes/social.js';
import adsRoutes from './routes/ads.js';
import productRoutes from './routes/products.js';
import courseRoutes from './routes/courses.js';
import affiliateRoutes from './routes/affiliates.js';
import communityRoutes from './routes/community.js';
import chatWidgetRoutes from './routes/chat-widgets.js';
import integrationRoutes from './routes/integrations.js';
import usageRoutes from './routes/usage.js';
import sequenceRoutes from './routes/sequences.js';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;

// Webhooks MUST be mounted BEFORE express.json() — Stripe needs raw body
app.use('/webhooks', webhookRoutes);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/funnels', funnelRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/sub-accounts', subAccountRoutes);
app.use('/api', settingsRoutes);
app.use('/api/calendars', calendarRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/saas', saasRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/phone', phoneRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/snapshots', snapshotRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/chat-widgets', chatWidgetRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/sequences', sequenceRoutes);

// Static file serving for uploaded assets
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
app.use('/uploads', express.static('uploads'));

app.use(errorHandler);

const server = createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`[server] API running on http://localhost:${PORT}`);
  startWorkflowScheduler();
  startSequenceScheduler();
  startTimeDecayScheduler();
});

import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { funnels, funnelPages } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/funnels
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(funnels);
    const allPages = await db.select().from(funnelPages);

    const result = rows.map(f => ({
      ...f,
      stats: f.stats as { visits: number; conversions: number },
      pages: allPages
        .filter(p => p.funnelId === f.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(p => ({ id: p.id, name: p.name, path: p.path, blocks: p.blocks as any[] })),
      lastPublishedAt: f.lastPublishedAt?.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get funnels error:', err);
    res.status(500).json({ error: 'Failed to fetch funnels' });
  }
});

// POST /api/funnels
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [funnel] = await db.insert(funnels).values({
      name: data.name || 'New Funnel',
      description: data.description || '',
      category: data.category || 'Lead Gen',
      status: 'draft',
    }).returning();

    res.json({ ...funnel, stats: funnel.stats, pages: [], lastPublishedAt: null });
  } catch (err) {
    console.error('Create funnel error:', err);
    res.status(500).json({ error: 'Failed to create funnel' });
  }
});

// PUT /api/funnels/:id
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const [updated] = await db.update(funnels).set({
      name: data.name,
      description: data.description,
      category: data.category,
      status: data.status,
      stats: data.stats,
      lastPublishedAt: data.lastPublishedAt ? new Date(data.lastPublishedAt) : null,
    }).where(eq(funnels.id, id)).returning();

    if (!updated) {
      res.status(404).json({ error: 'Funnel not found' });
      return;
    }

    // Replace pages
    if (data.pages) {
      await db.delete(funnelPages).where(eq(funnelPages.funnelId, id));
      if (data.pages.length > 0) {
        await db.insert(funnelPages).values(
          data.pages.map((p: any, i: number) => ({
            funnelId: id,
            name: p.name,
            path: p.path,
            blocks: p.blocks || [],
            sortOrder: i,
          }))
        );
      }
    }

    res.json({ ...updated, stats: updated.stats, pages: data.pages || [], lastPublishedAt: updated.lastPublishedAt?.toISOString() });
  } catch (err) {
    console.error('Update funnel error:', err);
    res.status(500).json({ error: 'Failed to update funnel' });
  }
});

// DELETE /api/funnels/:id
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(funnels).where(eq(funnels.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete funnel error:', err);
    res.status(500).json({ error: 'Failed to delete funnel' });
  }
});

// GET /api/funnels/:id/preview
router.get('/:id/preview', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const pageId = req.query.pageId as string | undefined;

    const rows = await db.select().from(funnels).where(eq(funnels.id, id));
    if (rows.length === 0) {
      res.status(404).json({ error: 'Funnel not found' });
      return;
    }

    const funnel = rows[0];
    const allPages = await db.select().from(funnelPages).where(eq(funnelPages.funnelId, id));
    const sortedPages = allPages.sort((a, b) => a.sortOrder - b.sortOrder);

    const page = pageId
      ? sortedPages.find(p => p.id === pageId)
      : sortedPages[0];

    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    const blocks = (page.blocks as any[]) || [];

    const renderBlock = (block: { id: string; type: string; title?: string; subtitle?: string; content?: string; buttonText?: string }) => {
      switch (block.type) {
        case 'hero':
          return `
            <section style="padding:80px 40px;text-align:center;background:linear-gradient(135deg,#f8fafc,#eef2ff);border-bottom:1px solid #e2e8f0;">
              <h1 style="font-size:48px;font-weight:700;color:#0f172a;margin:0 0 16px;">${block.title || ''}</h1>
              <p style="font-size:20px;color:#64748b;margin:0 auto 32px;max-width:600px;">${block.subtitle || ''}</p>
              <a href="#" style="display:inline-block;padding:16px 40px;background:#6366f1;color:#fff;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;">${block.buttonText || 'Get Started'}</a>
            </section>`;
        case 'form':
          return `
            <section style="padding:60px 40px;display:flex;justify-content:center;background:#fff;">
              <div style="width:100%;max-width:440px;padding:32px;border:1px solid #e2e8f0;border-radius:16px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
                <h2 style="font-size:28px;font-weight:600;color:#0f172a;margin:0 0 24px;">${block.title || ''}</h2>
                <div style="margin-bottom:16px;height:48px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"></div>
                <div style="margin-bottom:16px;height:48px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"></div>
                <button style="width:100%;padding:14px;background:#334155;color:#fff;border:none;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer;">Submit</button>
              </div>
            </section>`;
        case 'text':
          return `
            <section style="padding:60px 40px;max-width:800px;margin:0 auto;">
              <h2 style="font-size:32px;font-weight:600;color:#0f172a;margin:0 0 20px;">${block.title || ''}</h2>
              <p style="font-size:16px;color:#64748b;line-height:1.8;">${block.content || ''}</p>
            </section>`;
        case 'features':
          return `
            <section style="padding:60px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
              <h2 style="font-size:32px;font-weight:600;color:#0f172a;text-align:center;margin:0 0 40px;">${block.title || ''}</h2>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:960px;margin:0 auto;">
                <div style="padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;text-align:center;">
                  <div style="width:48px;height:48px;background:#eef2ff;border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                    <span style="font-size:20px;">&#9733;</span>
                  </div>
                  <h3 style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">Feature One</h3>
                  <p style="font-size:14px;color:#64748b;margin:0;">A short description of this feature and its benefits.</p>
                </div>
                <div style="padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;text-align:center;">
                  <div style="width:48px;height:48px;background:#eef2ff;border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                    <span style="font-size:20px;">&#9889;</span>
                  </div>
                  <h3 style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">Feature Two</h3>
                  <p style="font-size:14px;color:#64748b;margin:0;">A short description of this feature and its benefits.</p>
                </div>
                <div style="padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;text-align:center;">
                  <div style="width:48px;height:48px;background:#eef2ff;border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                    <span style="font-size:20px;">&#10004;</span>
                  </div>
                  <h3 style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">Feature Three</h3>
                  <p style="font-size:14px;color:#64748b;margin:0;">A short description of this feature and its benefits.</p>
                </div>
              </div>
            </section>`;
        default:
          return '';
      }
    };

    const bodyContent = blocks.map(renderBlock).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${funnel.name} - ${page.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0f172a; background: #fff; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;

    res.json({ html });
  } catch (err) {
    console.error('Preview funnel error:', err);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

export default router;

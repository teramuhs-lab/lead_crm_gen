import { Router, Request, Response } from 'express';
import { eq, desc, sql, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ── GET / — List products ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const rows = await db.select().from(products)
      .where(eq(products.subAccountId, subAccountId))
      .orderBy(desc(products.createdAt));

    res.json(rows.map(p => ({
      ...p,
      metadata: p.metadata as Record<string, any>,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })));
  } catch (err) {
    console.error('[products] List error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ── GET /stats — Aggregate stats ──
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const [row] = await db.select({
      totalProducts: count(),
      totalRevenue: sql<number>`coalesce(sum(${products.price}), 0)::int`,
    }).from(products).where(eq(products.subAccountId, subAccountId));

    const [activeRow] = await db.select({ count: count() }).from(products)
      .where(sql`${products.subAccountId} = ${subAccountId} AND ${products.status} = 'active'`);

    res.json({
      totalProducts: Number(row?.totalProducts) || 0,
      totalRevenue: Number(row?.totalRevenue) || 0,
      activeProducts: Number(activeRow?.count) || 0,
    });
  } catch (err) {
    console.error('[products] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── POST / — Create product ──
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subAccountId, name, description, price, type, stock, imageUrl } = req.body;
    if (!subAccountId || !name) {
      res.status(400).json({ error: 'subAccountId and name are required' });
      return;
    }

    const [created] = await db.insert(products).values({
      subAccountId,
      name,
      description: description || '',
      price: price || 0,
      type: type || 'digital',
      stock: stock || 0,
      imageUrl: imageUrl || null,
    }).returning();

    res.json({
      ...created,
      metadata: created.metadata as Record<string, any>,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[products] Create error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// ── PUT /:id — Update product ──
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { name, description, price, type, status, stock, imageUrl } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (type !== undefined) updates.type = type;
    if (status !== undefined) updates.status = status;
    if (stock !== undefined) updates.stock = stock;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;

    const [updated] = await db.update(products).set(updates)
      .where(eq(products.id, req.params.id)).returning();

    if (!updated) { res.status(404).json({ error: 'Product not found' }); return; }

    res.json({
      ...updated,
      metadata: updated.metadata as Record<string, any>,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[products] Update error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// ── DELETE /:id — Delete product ──
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(products).where(eq(products.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('[products] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;

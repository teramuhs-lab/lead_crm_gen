import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { hashPassword } from '../lib/password.js';

const router = Router();
router.use(requireAuth);

// GET /api/team
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      permissions: users.permissions,
      subAccountId: users.subAccountId,
      createdAt: users.createdAt,
    }).from(users);

    res.json(rows);
  } catch (err) {
    console.error('Get team members error:', err);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// POST /api/team
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, permissions, subAccountId } = req.body;

    const passwordHash = await hashPassword(password);
    const [created] = await db.insert(users).values({
      name,
      email,
      passwordHash,
      role,
      permissions,
      subAccountId,
    }).returning();

    const { passwordHash: _ph, ...user } = created;
    res.json(user);
  } catch (err) {
    console.error('Create team member error:', err);
    res.status(500).json({ error: 'Failed to create team member' });
  }
});

// PUT /api/team/:id
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, status, permissions, subAccountId } = req.body;

    const [updated] = await db.update(users).set({
      name,
      role,
      status,
      permissions,
      subAccountId,
    }).where(eq(users.id, id)).returning();

    if (!updated) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }

    const { passwordHash: _ph, ...user } = updated;
    res.json(user);
  } catch (err) {
    console.error('Update team member error:', err);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// DELETE /api/team/:id
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const currentUserId = (req as any).user.userId;

    if (req.params.id === currentUserId) {
      res.status(400).json({ error: 'Cannot delete yourself' });
      return;
    }

    await db.delete(users).where(eq(users.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete team member error:', err);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

export default router;

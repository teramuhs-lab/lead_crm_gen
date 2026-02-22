import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { assets } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Configure multer disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  },
});

// File filter: allow images, videos, PDFs, and common document types
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/',
    'video/',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ];

  const isAllowed = allowedMimeTypes.some((type) =>
    type.endsWith('/') ? file.mimetype.startsWith(type) : file.mimetype === type
  );

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Helper to detect asset type from mimetype
function getAssetType(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf') return 'pdf';
  return 'document';
}

// GET /api/assets?subAccountId=X — list all assets for sub-account
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    const rows = await db.select().from(assets).where(eq(assets.subAccountId, subAccountId));

    const result = rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get assets error:', err);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// POST /api/assets — Upload file (multipart form data)
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const subAccountId = req.body.subAccountId;
    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    const [created] = await db.insert(assets).values({
      name: file.originalname,
      type: getAssetType(file.mimetype),
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
      subAccountId,
    }).returning();

    res.json({
      ...created,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('Upload asset error:', err);
    res.status(500).json({ error: 'Failed to upload asset' });
  }
});

// DELETE /api/assets/:id — Delete asset
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    // Look up asset in DB
    const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);

    if (asset) {
      // Delete the physical file from disk (catch errors silently)
      const filePath = path.join(process.cwd(), asset.url);
      fs.unlink(filePath, () => {});

      // Delete from DB
      await db.delete(assets).where(eq(assets.id, id));
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete asset error:', err);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;

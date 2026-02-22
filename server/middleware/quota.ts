import { Request, Response, NextFunction } from 'express';
import { checkQuota, type UsageType } from '../lib/usage.js';

export function requireQuota(usageType: UsageType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const subAccountId = (req.body?.subAccountId || req.query?.subAccountId) as string | undefined;

    if (!subAccountId) {
      // If no subAccountId, let the route handle the validation
      next();
      return;
    }

    try {
      const { allowed, used, limit } = await checkQuota(subAccountId, usageType);

      if (!allowed) {
        res.status(429).json({
          error: 'quota_exceeded',
          type: usageType,
          used,
          limit,
          message: `Monthly quota exceeded for ${usageType.replace(/_/g, ' ')}. Used ${used}/${limit}. Upgrade your plan for more.`,
        });
        return;
      }

      next();
    } catch (err) {
      console.error('[quota] Error checking quota:', err);
      // Fail open — don't block requests if quota check fails
      next();
    }
  };
}

// backend/src/controllers/upload.controller.ts
import { Hono } from 'hono';
import { cloudinaryService } from '../services/cloudinary.service';
import { authMiddleware, type HonoVariables } from '../middleware/auth';
import { rateLimiter } from '../middleware/rate-limiter';
import { AppError } from '../errors/app-error';

export const uploadRouter = new Hono<{ Variables: HonoVariables }>();

uploadRouter.use('*', authMiddleware);

// Rate limit upload api to 10 uploads/min to prevent DDoS billing attacks on Cloudinary
uploadRouter.post('/', rateLimiter({ keyPrefix: 'file_upload', limit: 10, windowMs: 60 * 1000 }), async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    throw new AppError('Invalid file payload: file is required in multi-part form data', 400);
  }

  // Enforce basic image size checks (< 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new AppError('File size limits exceeded (max: 5MB)', 400);
  }

  // Convert File object to ArrayBuffer then Buffer
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const logoUrl = await cloudinaryService.uploadLogo(fileBuffer);

  return c.json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      url: logoUrl,
    },
  });
});

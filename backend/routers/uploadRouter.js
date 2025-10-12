// routers/uploadRouter.js
import { Router } from 'express';
import multer from 'multer';
import cloudinary from '../services/cloudinary.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  // accept any image/* (HEIC/AVIF etc). Cloudinary usually handles them.
  fileFilter(_req, file, cb) {
    const ok = /^image\/[-+.\w]+$/.test(file.mimetype || '');
    cb(null, ok); // ok=false => req.file null, but no thrown error
  },
});

function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ message: 'Auth required' });
  next();
}

router.post(
  '/image',
  requireAuth,                 // turn ON (works with proxy)
  (req, res, next) => {
    // quick visibility
    // console.log('CT:', req.headers['content-type']);
    next();
  },
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || 'Upload parse error' });
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded or unsupported mimetype' });
      }

      const dataURI = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const result = await cloudinary.uploader.upload(dataURI, { folder: 'deductive/questions' });

      return res.json({
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
      });
    } catch (e) {
      console.error('Upload error:', e);
      return res.status(500).json({ message: 'Upload failed' });
    }
  }
);

// Multer size-limit handler
router.use((err, _req, res, _next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'File too large (max 5MB)' });
  return res.status(500).json({ message: 'Upload failed' });
});

export default router;

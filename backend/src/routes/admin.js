const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { upsertProblemBySlug } = require('../db');
const { ApiError, asyncHandler } = require('../lib/http');

const router = express.Router();

// 📂 Multer Configuration for Zip Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/problems');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const slug = String(req.body.slug || 'unknown').trim().toLowerCase();
    cb(null, `${Date.now()}-${slug}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only ZIP files are allowed'));
    }
  }
});

// 🔑 Admin Middleware
const requireAdmin = (req, res, next) => {
  const token = String(process.env.ADMIN_TOKEN || '').trim();
  const provided = String(req.get('Authorization') || '').replace('Bearer ', '').trim();

  if (!token || provided !== token) {
    throw new ApiError(403, 'Unauthorized. Admin token mismatch.');
  }
  next();
};

// 🚀 Problem Upload API
router.post('/problems', requireAdmin, upload.single('archive'), asyncHandler(async (req, res) => {
  const { title, slug, difficulty, description, type = 'mern' } = req.body;

  if (!req.file) {
    throw new ApiError(400, 'Missing problem archive');
  }

  const problem = await upsertProblemBySlug.get({
    type,
    slug: String(slug).trim().toLowerCase(),
    title: String(title).trim(),
    description: String(description || '').trim(),
    difficulty: String(difficulty || 'medium').trim().toLowerCase(),
    archive_path: req.file.path,
    is_active: true,
    metadata: {
      original_filename: req.file.originalname,
      uploaded_at: new Date().toISOString()
    }
  });

  return res.json({
    success: true,
    problem
  });
}));

module.exports = router;
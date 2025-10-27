import { Request } from 'express';
import multer from 'multer';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (_req: Request, file: Express.Multer.File, cb: any) => {
  // Accept images only
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed'), false);
    return;
  }

  cb(null, true);
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.IMAGE_UPLOAD_MAX_SIZE || '5242880'), // 5MB default
    files: 10, // Max 10 files per request
  },
});

// Single file upload
export const uploadSingle = upload.single('image');

// Multiple files upload
export const uploadMultiple = upload.array('images', 10);

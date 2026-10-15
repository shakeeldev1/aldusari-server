import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 8, parts: 10 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return callback(Object.assign(new Error('Please upload a JPEG, PNG, or WebP image.'), { status: 400 }));
    callback(null, true);
  },
});
export default upload;

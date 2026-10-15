import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, unique: true, index: true },
  excerpt: { type: String, trim: true, maxlength: 500, default: '' },
  content: { type: String, required: true },
  category: { type: String, trim: true, default: '' },
  author: { type: String, trim: true, default: 'Al-Dosari Reserve' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  imageUrl: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  publishedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });

articleSchema.index({ title: 'text', excerpt: 'text', content: 'text', category: 'text' });
export default mongoose.model('Article', articleSchema);

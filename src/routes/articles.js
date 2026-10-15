import { Router } from 'express';
import slugify from 'slugify';
import Article from '../models/Article.js';
import { requireAdmin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import cloudinary from '../config/cloudinary.js';
import { uploadImage } from '../utils/cloudinaryUpload.js';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const router = Router();
const asPublic = article => ({ _id: article._id, title: article.title, slug: article.slug, excerpt: article.excerpt, content: article.content, category: article.category, author: article.author, status: article.status, imageUrl: article.imageUrl, publishedAt: article.publishedAt, createdAt: article.createdAt, updatedAt: article.updatedAt });
async function uniqueSlug(title, currentId) {
  const base = slugify(title, { lower: true, strict: true }) || `article-${Date.now()}`;
  let slug = base, suffix = 2;
  while (await Article.exists({ slug, ...(currentId ? { _id: { $ne: currentId } } : {}) })) slug = `${base}-${suffix++}`;
  return slug;
}
function articleInput(body) {
  const title = String(body.title || '').trim();
  const content = String(body.content || '').trim();
  if (!title || !content) throw Object.assign(new Error('Title and story content are required.'), { status: 400 });
  if (!['draft', 'published'].includes(body.status || 'draft')) throw Object.assign(new Error('Status must be draft or published.'), { status: 400 });
  return { title, content, excerpt: String(body.excerpt || '').trim(), category: String(body.category || '').trim(), author: String(body.author || 'Al-Dosari Reserve').trim(), status: body.status || 'draft' };
}
async function parseInput(req,res,next){ try { req.articleFields=articleInput(req.body); next(); } catch(error){ next(error); } }

router.get('/', async (req, res, next) => {
  try {
    let isAdmin = false;
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.admin = await Admin.findById(payload.sub).select('name email');
        if (!req.admin) return res.status(401).json({ message: 'Admin account was not found.' });
        isAdmin = true;
      } catch { return res.status(401).json({ message: 'Your session has expired. Please sign in again.' }); }
    }
    const filter = isAdmin ? {} : { status: 'published' };
    if (req.query.status && isAdmin && ['draft','published'].includes(req.query.status)) filter.status = req.query.status;
    const page = Math.max(1, Number.parseInt(req.query.page,10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit,10) || 20));
    const [articles,total] = await Promise.all([Article.find(filter).sort({ publishedAt:-1, updatedAt:-1 }).skip((page-1)*limit).limit(limit),Article.countDocuments(filter)]);
    res.json({ articles: articles.map(asPublic), page, limit, total, pages: Math.ceil(total/limit) });
  } catch(error){ next(error); }
});

router.get('/:id', async (req,res,next)=>{ try { const article=await Article.findOne({ _id:req.params.id, status:'published' }); if(!article)return res.status(404).json({message:'Article not found.'}); res.json({article:asPublic(article)}); } catch(error){next(error);} });
router.post('/', requireAdmin, upload.single('image'), parseInput, async (req,res,next)=>{
  try {
    const fields=req.articleFields; const slug=await uniqueSlug(fields.title);
    let image={}; if(req.file){const result=await uploadImage(req.file);image={imageUrl:result.secure_url,imagePublicId:result.public_id};}
    const publishedAt=fields.status==='published'?new Date():null;
    const article=await Article.create({...fields,...image,slug,publishedAt,createdBy:req.admin._id});
    res.status(201).json({article:asPublic(article)});
  }catch(error){next(error);}
});
router.put('/:id', requireAdmin, upload.single('image'), parseInput, async(req,res,next)=>{
  try {
    const article=await Article.findById(req.params.id);if(!article)return res.status(404).json({message:'Article not found.'});
    const wasPublished=article.status==='published'; Object.assign(article,req.articleFields,{slug:await uniqueSlug(req.articleFields.title,article._id)});
    let previousImageId;
    if(req.file){const result=await uploadImage(req.file);previousImageId=article.imagePublicId;article.imageUrl=result.secure_url;article.imagePublicId=result.public_id;}
    if(article.status==='published'&&!wasPublished)article.publishedAt=new Date();if(article.status==='draft')article.publishedAt=null;
    await article.save();
    if(previousImageId)await cloudinary.uploader.destroy(previousImageId).catch(()=>{});
    res.json({article:asPublic(article)});
  }catch(error){next(error);}
});
router.delete('/:id',requireAdmin,async(req,res,next)=>{try{const article=await Article.findByIdAndDelete(req.params.id);if(!article)return res.status(404).json({message:'Article not found.'});if(article.imagePublicId)await cloudinary.uploader.destroy(article.imagePublicId).catch(()=>{});res.json({message:'Article deleted.'});}catch(error){next(error);}});
export default router;

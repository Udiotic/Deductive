import mongoose from 'mongoose';
import Question from '../models/questionModel.js';
import sanitizeHtml from 'sanitize-html';
import { extractFirstImgSrc, extractAllImgSrcs } from '../utils/html.js';
import crypto from 'crypto';

// ----- Sanitizer (defense-in-depth) -----
const SANITIZE_OPTS = {
  allowedTags: [
    'p','br','b','i','u','strong','em',
    'blockquote','code','pre',
    'ul','ol','li',
    'h1','h2','h3','h4','h5','h6',
    'span','a','img'
  ],
  allowedAttributes: { a: ['href','target','rel'], img: ['src','alt'] },
  allowProtocolRelative: false,
  allowedSchemes: ['http','https','data'],
};

// HTML → plain text (very simple)
function htmlToPlain(html = '') {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/(h\d|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- shape ----------
function shape(doc, { reveal = false } = {}) {
  const out = {
    id: doc._id?.toString?.() || doc.id,
    body: doc.body,                 // plain text
    images: doc.images || [],       // [{url,alt}]
    tags: doc.tags || [],
    submittedBy: {
      id:
        (typeof doc.submittedBy === 'object'
          ? doc.submittedBy?._id
          : doc.submittedBy) || null,
      username:
        (typeof doc.submittedBy === 'object' && doc.submittedBy?.username)
          ? doc.submittedBy.username
          : 'Unknown',
    },
    createdAt: doc.createdAt,
  };

  if (reveal) {
    out.answer = doc.answer;               // plain text
    out.answerImage = doc.answerImage;     // {url,alt} | undefined
    out.answerOneLiner = doc.answerOneLiner;
  }
  return out;
}

// ---------- POST /api/questions/submit ----------
export async function submitQuestion(req, res){
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { bodyHtml, answerHtml, answerOneLiner, tags } = req.body;

    if (!bodyHtml || !answerHtml) {
      return res.status(400).json({ message: 'Question and Answer are required' });
    }

    // 1) Sanitize incoming HTML
    const cleanBodyHtml   = sanitizeHtml(bodyHtml,   SANITIZE_OPTS);
    const cleanAnswerHtml = sanitizeHtml(answerHtml, SANITIZE_OPTS);

    // 2) Convert to plain text for current model
    const bodyPlain   = htmlToPlain(cleanBodyHtml);
    const answerPlain = htmlToPlain(cleanAnswerHtml);

    if (!bodyPlain || !answerPlain) {
      return res.status(400).json({ message: 'Question and Answer cannot be empty' });
    }

    // 3) Collect images
    const thumbUrl   = extractFirstImgSrc(cleanAnswerHtml);         // answer ke liye thumbnail
    const questionUrls = extractAllImgSrcs(cleanBodyHtml);          // sirf question wali images
    const imagesArr  = questionUrls.map(u => ({ url: u }));         // model: images[] = question images only

    // 4) Idempotency: same content → same hash
    const contentHash = crypto
      .createHash('sha256')
      .update(`b:${bodyPlain}#a:${answerPlain}`)
      .digest('hex');

    // 5) Create (or dedupe)
    try {
      const doc = await Question.create({
        body: bodyPlain,
        images: imagesArr,
        answer: answerPlain,
        answerImage: thumbUrl ? { url: thumbUrl } : undefined,
        answerOneLiner: answerOneLiner || '',
        tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
        submittedBy: userId,
        status: 'pending',
        contentHash,
      });
      return res.status(201).json({ id: doc._id });
    } catch (e) {
      if (e?.code === 11000 && e?.keyPattern?.contentHash) {
        const existing = await Question.findOne({ contentHash }).select('_id');
        return res.status(200).json({ id: existing._id, deduped: true });
      }
      throw e;
    }
  } catch (err) {
    console.error('submitQuestion error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ---------- GET /api/questions/random?excludeIds=... ----------
export async function getRandomQuestion(req, res) {
  try {
    const excludeIds = []
      .concat(req.query.excludeIds || [])
      .filter(Boolean);

    const exclude = [];
    for (const id of excludeIds) {
      if (mongoose.isValidObjectId(id)) {
        exclude.push(new mongoose.Types.ObjectId(id));
      }
    }

    const match = { status: 'approved' };
    if (exclude.length) match._id = { $nin: exclude };

    const picked = await Question.aggregate([
      { $match: match },
      { $sample: { size: 1 } },
      {
        $project: {
          body: 1,           
          images: 1,
          tags: 1,
          submittedBy: 1,
          createdAt: 1,
        }
      }
    ]);

    if (!picked.length) {
      return res.status(404).json({ message: 'No questions available' });
    }

    const doc = await Question.findById(picked[0]._id)
      .populate({ path: 'submittedBy', select: 'username' })
      .select('body images tags submittedBy createdAt')
      .lean();

    return res.json(shape(doc, { reveal: false }));
  } catch (e) {
    console.error('getRandomQuestion error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ---------- GET /api/questions/:id (?reveal=true) ----------
export async function getQuestionById(req, res) {
  try {
    const { id } = req.params;
    const reveal = String(req.query.reveal || 'false') === 'true';

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const q = await Question.findById(id)
      .populate({ path: 'submittedBy', select: 'username' })
      .lean();

    if (!q) return res.status(404).json({ message: 'Not found' });

    if (!reveal) {
      delete q.answer;
      delete q.answerImage;
      delete q.answerOneLiner;
    }

    return res.json(shape(q, { reveal }));
  } catch (e) {
    console.error('getQuestionById error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function adminUpdateQuestion(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }
    
    const { bodyHtml, answerHtml, answerOneLiner, tags, status } = req.body;

    if (!bodyHtml || !answerHtml) {
      return res.status(400).json({ message: 'bodyHtml & answerHtml required' });
    }

    const cleanBody   = sanitizeHtml(bodyHtml,   SANITIZE_OPTS);
    const cleanAnswer = sanitizeHtml(answerHtml, SANITIZE_OPTS);

    const bodyPlain   = htmlToPlain(cleanBody);
    const answerPlain = htmlToPlain(cleanAnswer);
    if (!bodyPlain || !answerPlain) {
      return res.status(400).json({ message: 'Question/Answer cannot be empty' });
    }

    const questionUrls = extractAllImgSrcs(cleanBody);
    const imagesArr = questionUrls.map(u => ({ url: u }));

    const thumbUrl = extractFirstImgSrc(cleanAnswer);

    const contentHash = crypto.createHash('sha256')
      .update(`b:${bodyPlain}#a:${answerPlain}`)
      .digest('hex');

    const update = {
      body: bodyPlain,
      images: imagesArr,
      answer: answerPlain,
      answerImage: thumbUrl ? { url: thumbUrl } : undefined,
      answerOneLiner: answerOneLiner ?? '',
      contentHash,
      editedAt: new Date(),
      editedBy: userId,
    };

    if (typeof status === 'string') {
      update.status = status; // guarded by requireRole in router
    }
    if (Array.isArray(tags)) {
      update.tags = tags.slice(0, 10);
    }

    const q = await Question.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).populate({ path: 'submittedBy', select: 'username' });

    if (!q) return res.status(404).json({ message: 'Not found' });

    return res.json({
      id: q._id,
      message: 'Updated',
    });
  } catch (e) {
    console.error('adminUpdateQuestion', e);
    return res.status(500).json({ message: 'Server error' });
  }
}

// List submissions by logged-in user
export async function listMySubmissions(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    console.log('🔍 listMySubmissions - userId:', userId);

    // ✅ Convert string userId to ObjectId properly
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
      console.log('🔍 Converted to ObjectId:', userObjectId);
    } catch (e) {
      console.log('❌ Invalid userId format:', userId, e.message);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const page  = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const skip  = (page - 1) * limit;

    const filter = { submittedBy: userObjectId }; // ✅ Use ObjectId
    console.log('🔍 Query filter:', filter);

    const [items, total] = await Promise.all([
      Question.find(filter)
        .sort({ createdAt: -1 })
        .select('body status createdAt')
        .skip(skip).limit(limit)
        .lean(),
      Question.countDocuments(filter),
    ]);

    console.log('🔍 Found items:', items.length, 'Total:', total);

    res.json({
      items: items.map(it => ({
        id: it._id.toString(),
        body: it.body,
        status: it.status,
        createdAt: it.createdAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    console.error('listMySubmissions error:', e);
    res.status(500).json({ message: 'Server error' });
  }
}

// controllers/questionController.js - Updated to handle new image structure
import mongoose from 'mongoose';
import Question from '../models/questionModel.js';
import sanitizeHtml from 'sanitize-html';
import crypto from 'crypto';

// ----- Sanitizer (defense-in-depth) -----
const SANITIZE_OPTS = {
  allowedTags: [
    'p','br','b','i','u','strong','em',
    'blockquote','code','pre',
    'ul','ol','li',
    'h1','h2','h3','h4','h5','h6',
    'span','a'
    // ✅ Removed 'img' since we handle images separately now
  ],
  allowedAttributes: { 
    a: ['href','target','rel']
    // ✅ Removed img attributes since no img tags in HTML now
  },
  allowProtocolRelative: false,
  allowedSchemes: ['http','https'],
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

// ✅ Validate image object structure
function validateImage(img) {
  return img && 
         typeof img === 'object' && 
         typeof img.url === 'string' && 
         img.url.trim().length > 0 &&
         img.url.startsWith('https://'); // Ensure secure URLs
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

    // ✅ Updated destructuring to handle new structure
    const { 
      bodyHtml, 
      answerHtml, 
      answerOneLiner, 
      tags, 
      images,      // ✅ Array of question images
      answerImage  // ✅ Single answer image
    } = req.body;

    console.log('🔍 Submit payload:', { 
      bodyHtml: !!bodyHtml, 
      answerHtml: !!answerHtml, 
      images: images?.length || 0,
      answerImage: !!answerImage 
    });

    if (!bodyHtml || !answerHtml) {
      return res.status(400).json({ message: 'Question and Answer are required' });
    }

    // 1) Sanitize incoming HTML (no images in HTML now)
    const cleanBodyHtml   = sanitizeHtml(bodyHtml,   SANITIZE_OPTS);
    const cleanAnswerHtml = sanitizeHtml(answerHtml, SANITIZE_OPTS);

    // 2) Convert to plain text for current model
    const bodyPlain   = htmlToPlain(cleanBodyHtml);
    const answerPlain = htmlToPlain(cleanAnswerHtml);

    if (!bodyPlain || !answerPlain) {
      return res.status(400).json({ message: 'Question and Answer cannot be empty' });
    }

    // ✅ 3) Process images from separate arrays instead of extracting from HTML
    let processedImages = [];
    let processedAnswerImage = undefined;

    // Validate and process question images
    if (Array.isArray(images)) {
      processedImages = images
        .filter(validateImage)
        .slice(0, 3) // Max 3 images as per your frontend
        .map(img => ({
          url: img.url.trim(),
          alt: (img.alt || '').trim()
        }));
    }

    // Validate and process answer image
    if (answerImage && validateImage(answerImage)) {
      processedAnswerImage = {
        url: answerImage.url.trim(),
        alt: (answerImage.alt || '').trim()
      };
    }

    console.log('🔍 Processed images:', {
      questionImages: processedImages.length,
      answerImage: !!processedAnswerImage
    });

    // 4) Idempotency: same content → same hash
    const contentHash = crypto
      .createHash('sha256')
      .update(`b:${bodyPlain}#a:${answerPlain}`)
      .digest('hex');

    // 5) Create (or dedupe)
    try {
      const doc = await Question.create({
        body: bodyPlain,
        images: processedImages,           // ✅ Use processed question images
        answer: answerPlain,
        answerImage: processedAnswerImage, // ✅ Use processed answer image
        answerOneLiner: answerOneLiner || '',
        tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
        submittedBy: userId,
        status: 'pending',
        contentHash,
      });

      console.log('✅ Question created:', doc._id);
      return res.status(201).json({ id: doc._id });
    } catch (e) {
      if (e?.code === 11000 && e?.keyPattern?.contentHash) {
        const existing = await Question.findOne({ contentHash }).select('_id');
        console.log('🔄 Duplicate content, returning existing:', existing._id);
        return res.status(200).json({ id: existing._id, deduped: true });
      }
      throw e;
    }
  } catch (err) {
    console.error('submitQuestion error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ---------- GET /api/questions/random?excludeIds=... ----------
export async function getRandomQuestion(req, res) {
  try {
    console.log('🎲 Getting random question, excludeIds:', req.query.excludeIds);
    
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

    console.log('🔍 Query match:', match);

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
      console.log('❌ No questions found');
      return res.status(404).json({ message: 'No questions available' });
    }

    const doc = await Question.findById(picked[0]._id)
      .populate({ path: 'submittedBy', select: 'username' })
      .select('body images tags submittedBy createdAt')
      .lean();

    console.log('✅ Random question found:', doc._id, 'images:', doc.images?.length || 0);
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

    console.log('🔍 Getting question by ID:', id, 'reveal:', reveal);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const q = await Question.findById(id)
      .populate({ path: 'submittedBy', select: 'username' })
      .lean();

    if (!q) {
      console.log('❌ Question not found:', id);
      return res.status(404).json({ message: 'Not found' });
    }

    console.log('✅ Question found:', id, 'reveal:', reveal, 'answerImage:', !!q.answerImage);

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

// ✅ Updated admin update function to handle new structure
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
    
    // ✅ Updated to handle new structure
    const { 
      bodyHtml, 
      answerHtml, 
      answerOneLiner, 
      tags, 
      status,
      images,      // ✅ New: question images array
      answerImage  // ✅ New: answer image object
    } = req.body;

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

    // ✅ Process images from new structure
    let processedImages = [];
    let processedAnswerImage = undefined;

    if (Array.isArray(images)) {
      processedImages = images
        .filter(validateImage)
        .slice(0, 3)
        .map(img => ({
          url: img.url.trim(),
          alt: (img.alt || '').trim()
        }));
    }

    if (answerImage && validateImage(answerImage)) {
      processedAnswerImage = {
        url: answerImage.url.trim(),
        alt: (answerImage.alt || '').trim()
      };
    }

    const contentHash = crypto.createHash('sha256')
      .update(`b:${bodyPlain}#a:${answerPlain}`)
      .digest('hex');

    const update = {
      body: bodyPlain,
      images: processedImages,           // ✅ Use processed images
      answer: answerPlain,
      answerImage: processedAnswerImage, // ✅ Use processed answer image
      answerOneLiner: answerOneLiner ?? '',
      contentHash,
      editedAt: new Date(),
      editedBy: userId,
    };

    if (typeof status === 'string') {
      update.status = status;
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

    console.log('✅ Question updated:', id);
    return res.json({
      id: q._id,
      message: 'Updated',
    });
  } catch (e) {
    console.error('adminUpdateQuestion', e);
    return res.status(500).json({ message: 'Server error' });
  }
}

// List submissions by logged-in user (unchanged)
export async function listMySubmissions(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    console.log('🔍 listMySubmissions - userId:', userId);

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

    const filter = { submittedBy: userObjectId };
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

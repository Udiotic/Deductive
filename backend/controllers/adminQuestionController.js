// controllers/adminQuestionController.js
import Question from '../models/questionModel.js';
import mongoose from 'mongoose';

export async function listPending(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Question.find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .select('body submittedBy createdAt tags')
        .populate({ path: 'submittedBy', select: 'username' })
        .skip(skip).limit(limit).lean(),
      Question.countDocuments({ status: 'pending' }),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total/limit) });
  } catch (err) {
    console.error('listPending error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function approve(req, res) {
  try {
    // Add ObjectId validation
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }

    const q = await Question.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'approved' } },
      { new: true }
    ).select('_id status');
    
    if (!q) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('approve error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function reject(req, res) {
  try {
    // Add ObjectId validation
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }

    const { reason } = req.body || {};
    const q = await Question.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'rejected', rejectReason: (reason || '').slice(0, 200) } },
      { new: true }
    ).select('_id status');
    
    if (!q) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('reject error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

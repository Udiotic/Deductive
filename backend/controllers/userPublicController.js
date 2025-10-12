import User from '../models/userModel.js';
import Follow from '../models/followModel.js';
import Question from '../models/questionModel.js';
import mongoose from 'mongoose';

export async function getPublicProfile(req, res) {
  try {
    const uname = String(req.params.username || '');
    const user = await User.findOne({ usernameLower: uname.toLowerCase() })
      .select('_id username email createdAt avatar role followersCount followingCount')
      .lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // is viewer following?
    let isFollowing = false;
    if (req.session?.userId && String(req.session.userId) !== String(user._id)) {
      isFollowing = await Follow.exists({ follower: req.session.userId, followee: user._id });
    }

    res.json({
      id: user._id,
      username: user.username,
      avatar: user.avatar || 'robot',
      role: user.role || 'user',
      createdAt: user.createdAt,
      followersCount: user.followersCount ?? 0,
      followingCount: user.followingCount ?? 0,
      isSelf: String(req.session?.userId || '') === String(user._id),
      isFollowing: !!isFollowing
    });
  } catch (err) {
    console.error('getPublicProfile error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function listFollowers(req, res) {
  try {
    const uname = String(req.params.username || '');
    const page  = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip  = (page - 1) * limit;

    const u = await User.findOne({ usernameLower: uname.toLowerCase() }).select('_id').lean();
    if (!u) return res.status(404).json({ message: 'User not found' });

    const [edges, total] = await Promise.all([
      Follow.find({ followee: u._id }).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate({ path: 'follower', select: 'username avatar' }).lean(),
      Follow.countDocuments({ followee: u._id })
    ]);

    res.json({
      items: edges.map(e => ({
        id: e.follower._id,
        username: e.follower.username,
        avatar: e.follower.avatar || 'robot'
      })),
      total, page, pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('listFollowers error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function listFollowing(req, res) {
  try {
    const uname = String(req.params.username || '');
    const page  = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip  = (page - 1) * limit;

    const u = await User.findOne({ usernameLower: uname.toLowerCase() }).select('_id').lean();
    if (!u) return res.status(404).json({ message: 'User not found' });

    const [edges, total] = await Promise.all([
      Follow.find({ follower: u._id }).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate({ path: 'followee', select: 'username avatar' }).lean(),
      Follow.countDocuments({ follower: u._id })
    ]);

    res.json({
      items: edges.map(e => ({
        id: e.followee._id,
        username: e.followee.username,
        avatar: e.followee.avatar || 'robot'
      })),
      total, page, pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('listFollowing error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function follow(req, res) {
  try {
    if (!req.session?.userId) return res.status(401).json({ message: 'Auth required' });

    const meId = new mongoose.Types.ObjectId(req.session.userId);
    const target = await User.findOne({ usernameLower: String(req.params.username || '').toLowerCase() })
      .select('_id').lean();
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (String(target._id) === String(meId)) return res.status(400).json({ message: 'Cannot follow yourself' });

    try {
      await Follow.create({ follower: meId, followee: target._id });
      // optional counters
      await User.updateOne({ _id: target._id }, { $inc: { followersCount: 1 } });
      await User.updateOne({ _id: meId },      { $inc: { followingCount: 1 } });
    } catch (e) {
      if (e.code === 11000) {
        // already following → idempotent success
      } else throw e;
    }
    res.json({ ok: true, following: true });
  } catch (err) {
    console.error('follow error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function unfollow(req, res) {
  try {
    if (!req.session?.userId) return res.status(401).json({ message: 'Auth required' });

    const meId = new mongoose.Types.ObjectId(req.session.userId);
    const target = await User.findOne({ usernameLower: String(req.params.username || '').toLowerCase() })
      .select('_id').lean();
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (String(target._id) === String(meId)) return res.status(400).json({ message: 'Cannot unfollow yourself' });

    const del = await Follow.deleteOne({ follower: meId, followee: target._id });
    if (del.deletedCount) {
      await User.updateOne({ _id: target._id }, { $inc: { followersCount: -1 } });
      await User.updateOne({ _id: meId },      { $inc: { followingCount: -1 } });
    }
    res.json({ ok: true, following: false });
  } catch (err) {
    console.error('unfollow error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function listUserSubmissionsPublic(req, res) {
  try {
    const uname = String(req.params.username || '');
    const status = (req.query.status || 'approved').toString();
    const page  = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const skip  = (page - 1) * limit;

    const u = await User.findOne({ usernameLower: uname.toLowerCase() }).select('_id').lean();
    if (!u) return res.status(404).json({ message: 'User not found' });

    const filter = { submittedBy: u._id };
    // only owner sees non-approved (keep it simple: public = approved only)
    filter.status = 'approved';

    const [items, total] = await Promise.all([
      Question.find(filter).sort({ createdAt: -1 })
        .select('body createdAt')
        .skip(skip).limit(limit).lean(),
      Question.countDocuments(filter)
    ]);

    res.json({
      items: items.map(q => ({ id: q._id.toString(), body: q.body, createdAt: q.createdAt })),
      total, page, pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('listUserSubmissionsPublic error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

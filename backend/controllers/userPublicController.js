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

    // ✅ Debug the viewer
    const viewerId = req.user?.userId;
    console.log('🔍 getPublicProfile Debug:');
    console.log('- Username:', uname);
    console.log('- Target user:', user._id.toString());
    console.log('- Viewer ID (raw):', viewerId);
    console.log('- Viewer ID type:', typeof viewerId);

    let viewerObjectId = null;
    if (viewerId) {
      try {
        viewerObjectId = new mongoose.Types.ObjectId(viewerId);
        console.log('- Viewer ObjectId:', viewerObjectId.toString());
      } catch (e) {
        console.log('❌ Invalid viewerId format:', viewerId, e.message);
      }
    }

    // ✅ Debug the follow check with multiple query attempts
    let isFollowing = false;
    if (viewerObjectId && !viewerObjectId.equals(user._id)) {
      console.log('🔍 Checking if following...');
      
      // Try multiple query formats to see which one works
      const queries = [
        { follower: viewerObjectId, followee: user._id },
        { follower: viewerId, followee: user._id },
        { follower: viewerObjectId, followee: user._id.toString() },
        { follower: viewerId, followee: user._id.toString() }
      ];

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        console.log(`- Query ${i + 1}:`, query);
        
        const result = await Follow.exists(query);
        console.log(`- Result ${i + 1}:`, result);
        
        if (result && !isFollowing) {
          isFollowing = true;
          console.log(`✅ Found follow relationship with query ${i + 1}`);
          break;
        }
      }

      // Also check what follows actually exist for this viewer
      const allFollows = await Follow.find({ follower: viewerObjectId }).lean();
      console.log('- All follows by viewer:', allFollows.map(f => ({
        follower: f.follower.toString(),
        followee: f.followee.toString()
      })));
    }

    console.log('- Final isFollowing:', isFollowing);

    res.json({
      id: user._id,
      username: user.username,
      avatar: user.avatar || 'robot',
      role: user.role || 'user',
      createdAt: user.createdAt,
      followersCount: user.followersCount ?? 0,
      followingCount: user.followingCount ?? 0,
      isSelf: viewerObjectId ? viewerObjectId.equals(user._id) : false,
      isFollowing: !!isFollowing
    });
  } catch (err) {
    console.error('getPublicProfile error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function follow(req, res) {
  try {
    const userId = req.user?.userId;
    console.log('🔍 Follow Debug:');
    console.log('- req.user:', req.user);
    console.log('- userId:', userId);
    
    if (!userId) return res.status(401).json({ message: 'Auth required' });

    let meId;
    try {
      meId = new mongoose.Types.ObjectId(userId);
      console.log('- meId ObjectId:', meId.toString());
    } catch (e) {
      console.log('❌ Invalid userId format:', userId, e.message);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const target = await User.findOne({ usernameLower: String(req.params.username || '').toLowerCase() })
      .select('_id').lean();
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (meId.equals(target._id)) return res.status(400).json({ message: 'Cannot follow yourself' });

    console.log('- Target user:', target._id.toString());

    // ✅ Check if already following before creating
    const existing = await Follow.findOne({ follower: meId, followee: target._id });
    console.log('- Existing follow:', existing);

    if (existing) {
      console.log('ℹ️ Already following');
      return res.json({ ok: true, following: true });
    }

    try {
      const newFollow = await Follow.create({ follower: meId, followee: target._id });
      console.log('✅ Follow created:', {
        id: newFollow._id,
        follower: newFollow.follower.toString(),
        followee: newFollow.followee.toString()
      });
      
      // Update counters
      await Promise.all([
        User.updateOne({ _id: target._id }, { $inc: { followersCount: 1 } }),
        User.updateOne({ _id: meId }, { $inc: { followingCount: 1 } })
      ]);

      console.log('✅ Counters updated');
    } catch (e) {
      console.error('❌ Follow creation failed:', e);
      if (e.code === 11000) {
        console.log('ℹ️ Duplicate key error - already following');
      } else {
        throw e;
      }
    }
    
    res.json({ ok: true, following: true });
  } catch (err) {
    console.error('follow error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function unfollow(req, res) {
  try {
    const userId = req.user?.userId;
    console.log('🔍 Unfollow Debug:');
    console.log('- userId:', userId);
    
    if (!userId) return res.status(401).json({ message: 'Auth required' });

    let meId;
    try {
      meId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const target = await User.findOne({ usernameLower: String(req.params.username || '').toLowerCase() })
      .select('_id').lean();
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (meId.equals(target._id)) return res.status(400).json({ message: 'Cannot unfollow yourself' });

    console.log('- Target user:', target._id.toString());

    const del = await Follow.deleteOne({ follower: meId, followee: target._id });
    console.log('- Delete result:', del);
    
    if (del.deletedCount) {
      await Promise.all([
        User.updateOne({ _id: target._id }, { $inc: { followersCount: -1 } }),
        User.updateOne({ _id: meId }, { $inc: { followingCount: -1 } })
      ]);
      console.log('✅ Counters decremented');
    }
    
    res.json({ ok: true, following: false });
  } catch (err) {
    console.error('unfollow error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ... other functions stay the same
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
      items: edges
        .filter(e => e.follower && e.follower._id)
        .map(e => ({
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
      items: edges
        .filter(e => e.followee && e.followee._id)
        .map(e => ({
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

export async function listUserSubmissionsPublic(req, res) {
  try {
    const uname = String(req.params.username || '');
    const page  = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const skip  = (page - 1) * limit;

    const u = await User.findOne({ usernameLower: uname.toLowerCase() }).select('_id').lean();
    if (!u) return res.status(404).json({ message: 'User not found' });

    const filter = { submittedBy: u._id };
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

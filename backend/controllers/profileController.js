import User from '../models/userModel.js';

export async function getProfile(req, res) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const u = await User.findById(req.session.userId)
      .select('_id email username role avatar verified createdAt');
    
    if (!u) return res.status(401).json({ message: 'Not authenticated' });

    res.json({
      id: u._id,
      email: u.email,
      username: u.username,
      role: u.role,
      avatar: u.avatar,
      verified: u.verified,
      createdAt: u.createdAt,
    });
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function updateProfile(req, res) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { avatar } = req.body || {};
    // (abhi ke liye sirf avatar allow kar rahe)
    const allowed = ['robot','cat','fox','owl','alien'];
    if (avatar && !allowed.includes(avatar)) {
      return res.status(400).json({ message: 'Invalid avatar' });
    }

    const u = await User.findByIdAndUpdate(
      req.session.userId,
      { $set: { ...(avatar ? { avatar } : {}) } },
      { new: true }
    ).select('_id email username role avatar verified createdAt');

    if (!u) return res.status(401).json({ message: 'Not authenticated' });

    res.json({
      id: u._id,
      email: u.email,
      username: u.username,
      role: u.role,
      avatar: u.avatar,
      verified: u.verified,
      createdAt: u.createdAt,
    });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

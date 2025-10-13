import User from '../models/userModel.js';
import mongoose from 'mongoose';

//JWT-based auth check
export function requireAuth(req, res, next) {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ message: 'Auth required' });
  
  //ObjectId validation
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(401).json({ message: 'Auth required' });
  }
  
  next();
}

//JWT-based role checking
export function requireRole(...allowed) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId; // ✅ From JWT middleware
      if (!userId) return res.status(401).json({ message: 'Auth required' });
      
      //ObjectId validation
      if (!mongoose.isValidObjectId(userId)) {
        return res.status(401).json({ message: 'Auth required' });
      }
      
      const user = await User.findById(userId).select('role');
      if (!user || !user.role || !allowed.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      req.userRole = user.role; // optional
      next();
    } catch (e) {
      console.error('requireRole error:', e);
      return res.status(500).json({ message: 'Server error' });
    }
  };
}

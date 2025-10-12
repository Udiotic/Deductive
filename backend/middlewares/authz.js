import User from '../models/userModel.js';
import mongoose from 'mongoose';


export function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ message: 'Auth required' });
  
  // Add ObjectId validation
  if (!mongoose.isValidObjectId(req.session.userId)) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: 'Auth required' });
  }
  
  next();
}

// Fetch role lazily (one query) when needed
export function requireRole(...allowed) {
  return async (req, res, next) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ message: 'Auth required' });
      
      // Add ObjectId validation
      if (!mongoose.isValidObjectId(req.session.userId)) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: 'Auth required' });
      }
      
      const user = await User.findById(req.session.userId).select('role');
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


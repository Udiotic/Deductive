import { Router } from 'express';
import {
  getPublicProfile,
  listFollowers,
  listFollowing,
  follow,
  unfollow,
  listUserSubmissionsPublic
} from '../controllers/userPublicController.js';
import { authenticateToken } from '../controllers/authController.js';
import jwt from 'jsonwebtoken'

const router = Router();

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // No token provided - continue without setting req.user
    return next();
  }

  // Token provided - try to verify it
  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET); // ✅ Use import, not require
    req.user = decoded; // { userId: "..." }
  } catch (error) {
    // Invalid token - continue without setting req.user (don't fail)
    console.log('Optional auth - invalid token:', error.message);
  }
  
  next();
}

//Public routes with optional auth
router.get('/:username/profile', optionalAuth, getPublicProfile);    // Optional auth for isSelf/isFollowing

//Fully public routes  
router.get('/:username/followers', listFollowers);                   // Public
router.get('/:username/following', listFollowing);                   // Public
router.get('/:username/submissions', listUserSubmissionsPublic);     // Public

// Protected routes
router.post('/:username/follow', authenticateToken, follow);         // Auth required
router.delete('/:username/follow', authenticateToken, unfollow);     // Auth required

export default router;

import { Router } from 'express';
import {
  getPublicProfile,
  listFollowers,
  listFollowing,
  follow,
  unfollow,
  listUserSubmissionsPublic
} from '../controllers/userPublicController.js';

const router = Router();

// public reads
router.get('/:username/profile',    getPublicProfile);
router.get('/:username/followers',  listFollowers);
router.get('/:username/following',  listFollowing);
router.get('/:username/submissions', listUserSubmissionsPublic);

// follow actions (auth required inside controllers already)
router.post('/:username/follow',    follow);
router.delete('/:username/follow',  unfollow);

export default router;

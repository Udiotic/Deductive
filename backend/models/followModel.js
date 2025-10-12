import mongoose from 'mongoose';

const FollowSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  followee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

FollowSchema.index({ follower: 1, followee: 1 }, { unique: true });

export default mongoose.model('Follow', FollowSchema);

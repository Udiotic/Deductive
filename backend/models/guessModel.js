import mongoose from 'mongoose';

const GuessSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  seatIdx: {
    type: Number,
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  origin: {
    type: String,
    enum: ['text', 'voice'],
    default: 'text'
  },

  // ✅ REMOVED: phase field since we simplified to single round-robin
  // phase: { type: String, enum: ['lap1', 'lap2'], required: true }, // REMOVED

  // Validation results
  deterministicVerdict: {
    type: String,
    enum: ['correct', 'hot', 'warm', 'cold'],
    default: 'cold'
  },
  llmVerdict: {
    type: String,
    enum: ['correct', 'hot', 'warm', 'cold'],
    default: null
  },
  finalVerdict: {
    type: String,
    enum: ['correct', 'hot', 'warm', 'cold'],
    default: 'cold'
  },

  // Host decision
  hostDecision: {
    type: String,
    enum: ['correct', 'incorrect', 'partial'],
    default: null
  },
  decidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  decidedAt: {
    type: Date,
    default: null
  },

  // Scoring
  pointsAwarded: {
    type: Number,
    default: 0,
    min: 0
  },
  isWinningGuess: {
    type: Boolean,
    default: false
  },

  // Timer info
  windowSeconds: {
    type: Number,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
GuessSchema.index({ roomId: 1, questionId: 1 });
GuessSchema.index({ userId: 1, createdAt: -1 });
GuessSchema.index({ roomId: 1, isWinningGuess: 1 });

// Virtual for response time
GuessSchema.virtual('responseTime').get(function() {
  if (this.submittedAt && this.createdAt) {
    return Math.round((this.submittedAt - this.createdAt) / 1000);
  }
  return null;
});

export default mongoose.model('Guess', GuessSchema);

// models/questionModel.js - ENHANCED with answerImages field

import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String, default: '' },
  caption: { type: String, default: '' }
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  // Question content
  body: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 1000
  },

  // Question images
  images: [ImageSchema],

  // Answer content
  answer: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 500
  },

  // ✅ ENHANCED: Answer images field
  answerImages: [ImageSchema], // ✅ NEW: Images to show when answer is revealed

  // Additional fields
  answerOneLiner: { 
    type: String, 
    trim: true,
    maxlength: 500
  },

  tags: [{ 
    type: String, 
    trim: true,
    maxlength: 50 
  }],

  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },

  category: {
    type: String,
    trim: true,
    maxlength: 100
  },

  // Admin fields
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  reviewedAt: {
    type: Date
  },

  reviewNotes: {
    type: String,
    trim: true
  },

  // Usage statistics
  timesAsked: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  incorrectAnswers: { type: Number, default: 0 }

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
QuestionSchema.index({ status: 1, difficulty: 1 });
QuestionSchema.index({ category: 1, status: 1 });
QuestionSchema.index({ submittedBy: 1 });
QuestionSchema.index({ tags: 1 });

// Virtuals
QuestionSchema.virtual('successRate').get(function() {
  const total = this.correctAnswers + this.incorrectAnswers;
  return total > 0 ? (this.correctAnswers / total) : 0;
});

QuestionSchema.virtual('hasImages').get(function() {
  return this.images && this.images.length > 0;
});

// ✅ NEW: Virtual for answer images
QuestionSchema.virtual('hasAnswerImages').get(function() {
  return this.answerImages && this.answerImages.length > 0;
});

// Instance methods
QuestionSchema.methods.incrementStats = function(wasCorrect) {
  this.timesAsked++;
  if (wasCorrect) {
    this.correctAnswers++;
  } else {
    this.incorrectAnswers++;
  }
  return this.save();
};

// Static methods
QuestionSchema.statics.getRandomApproved = function(excludeIds = [], difficulty = null) {
  const match = { 
    status: 'approved',
    _id: { $nin: excludeIds }
  };

  if (difficulty) {
    match.difficulty = difficulty;
  }

  return this.aggregate([
    { $match: match },
    { $sample: { size: 1 } }
  ]);
};

export default mongoose.model('Question', QuestionSchema);

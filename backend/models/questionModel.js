// models/questionModel.js
import mongoose from 'mongoose';

const ImgSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {

    // Main statement (markdown/plain)
    body: { type: String, required: true, trim: true },

    // Inline images for the question
    images: { type: [ImgSchema], default: [] },

    // Answer payload
    answer: { type: String, required: true, trim: true },
    answerImage: { type: ImgSchema, default: undefined },   // optional image revealed with answer
    answerOneLiner: { type: String, trim: true, maxlength: 200 },

    // Discovery
    tags: { type: [String], default: [], index: true },

    // Attribution
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Moderation state
    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'pending',
      index: true,
    },
    contentHash: { type: String, unique: true, sparse: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
    toObject: { virtuals: true },
  }
);

// Helpful indexes
QuestionSchema.index({ createdAt: -1 });

// Small validations/cleanups
QuestionSchema.path('tags').validate(
  function (v) {
    return Array.isArray(v) && v.length <= 10;
  },
  'Max 10 tags allowed'
);

QuestionSchema.pre('validate', function (next) {
  if (this.images) this.images = this.images.filter((i) => i?.url);
  next();
});

export default mongoose.model('Question', QuestionSchema);

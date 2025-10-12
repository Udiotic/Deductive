import mongoose from 'mongoose';
import validator from 'validator';


const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required!'],
    trim: true,
    minlength: [5, 'Email must have 5 characters!'],
    lowercase: true,
    validate: {
      validator: (v) => validator.isEmail(v || ''),
      message: 'Invalid Email!',
    },
  },

  // Display name (preserves user-entered casing)
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: /^[A-Za-z0-9_]+$/,
  },

  role: {
  type: String,
  enum: ['user', 'moderator', 'admin'],
  default: 'user',
  index: true,
},

followersCount: { 
  type: Number, 
  default: 0 
},
followingCount: { 
type: Number, 
default: 0 
},

avatar: 
  {
    type: String,
    enum: ['robot','smile','blob','purple','hearts'],
    default: 'robot',
  },

  // Case-insensitive key for uniqueness & lookups
  usernameLower: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    select: false,
  },

  // Auth
  passwordHash: {
    type: String,
    required: [true, 'Password is required!'],
    trim: true,
    select: false,
  },

  // Email verification
  verified: { type: Boolean, default: false },

  verifyTokenHash: { type: String, select: false },
  verifyTokenRaw:  { type: String, select: false },   // reuse same link within TTL
  verifyExpiresAt: { type: Date,   select: false },
  verifyLastSentAt:{ type: Date,   select: false },   // resend throttle

  verifyCodeRaw: { type: String, select: false },
  verifyCodeHash:    { type: String, select: false },
  verifyCodeExpires: { type: Date,   select: false },
  verifyCodeLastSent:{ type: Date,   select: false },
  verifyCodeAttempts:{ type: Number, default: 0, select: false },

  // Password reset
  resetTokenHash:  { type: String, select: false },
  resetExpiresAt:  { type: Date,   select: false },

}, { timestamps: true });

// Unique index for email
userSchema.index({ email: 1 }, { unique: true });

// Auto-fill usernameLower
userSchema.pre('validate', function(next) {
  if (this.username) this.usernameLower = this.username.toLowerCase();
  next();
});

userSchema.pre('save', function(next) {
  if (this.isModified('username')) this.usernameLower = this.username.toLowerCase();
  next();
});

export default mongoose.model('User', userSchema);

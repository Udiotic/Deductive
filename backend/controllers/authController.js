import bcrypt from 'bcrypt';
import User from '../models/userModel.js'
import crypto from 'crypto'
import { sendVerificationCodeEmail, sendPasswordResetEmail } from '../services/mailer.js';
import mongoose from 'mongoose';

const CODE_TTL_MS = 15 * 60 * 1000; // 15 min
const RESEND_COOLDOWN_MS = 60 * 1000; // 60s
const MAX_VERIFY_ATTEMPTS = 5;

function make6Code() 
{
  return String(Math.floor(100000 + Math.random() * 900000));
}
function sha256(s) 
{
  return crypto.createHash('sha256').update(s).digest('hex');
}

export const signup = async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password || !username)
    return res.status(400).json({ message: 'Email, username & password are required' });
  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be greater than 6 characters' });
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username))
    return res.status(400).json({ message: 'Username must be 3-20 chars (letters/numbers/underscore)' });

  try {
    const unameL = username.toLowerCase();
    const [byEmail, byUsername] = await Promise.all([
      User.findOne({ email }).select('+verified +verifyCodeHash +verifyCodeExpires +verifyCodeLastSent'),
      User.findOne({ usernameLower: unameL }).select('_id username'),
    ]);
    if (byUsername) return res.status(409).json({ message: 'Username already in use' });

    // email already exists?
    if (byEmail) {
      if (byEmail.verified) return res.status(409).json({ message: 'Email already in use' });

      const now = Date.now();
      // throttle resend
      const last = byEmail.verifyCodeLastSent?.getTime() || 0;
      if (now - last < RESEND_COOLDOWN_MS) {
        const remain = Math.ceil((RESEND_COOLDOWN_MS - (now - last)) / 1000);
        return res.status(200).json({ message: `Code already sent. Try again in ${remain}s.` });
      }

      // issue new code
      const raw = make6Code();
      byEmail.verifyCodeRaw = raw; // ← ADD THIS LINE
      byEmail.verifyCodeHash = sha256(raw);
      byEmail.verifyCodeExpires = new Date(now + CODE_TTL_MS);
      byEmail.verifyCodeLastSent = new Date(now);
      byEmail.verifyCodeAttempts = 0;
      await byEmail.save();

      try { await sendVerificationCodeEmail(byEmail.email, raw); } catch (e) { console.error('send code failed:', e); }
      return res.status(200).json({ message: 'Verification code sent. Check your inbox.' });
    }

    // fresh create - this part is already correct
    const passwordHash = await bcrypt.hash(password, 12);
    const raw = make6Code();
    const user = await User.create({
      email,
      username,
      passwordHash,
      verified: false,
      verifyCodeRaw: raw, // ← This is already there
      verifyCodeHash: sha256(raw),
      verifyCodeExpires: new Date(Date.now() + CODE_TTL_MS),
      verifyCodeLastSent: new Date(),
      verifyCodeAttempts: 0,
    });

    try { await sendVerificationCodeEmail(user.email, raw); } catch (e) { console.error('send code failed:', e); }

    return res.status(201).json({
      id: user._id,
      email: user.email,
      username: user.username,
      message: 'Signup initiated. Enter the code we emailed you.',
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email or username already in use' });
    console.error('signup error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const verifyEmailCode = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: 'Email and code required' });

  try {
    const user = await User.findOne({ email }).select('+verifyCodeHash +verifyCodeExpires +verifyCodeAttempts');
    if (!user) return res.status(400).json({ message: 'Invalid email or code' });
    if (user.verified) return res.status(400).json({ message: 'Email already verified' });

    const now = Date.now();
    if (!user.verifyCodeExpires || user.verifyCodeExpires.getTime() < now) {
      return res.status(400).json({ message: 'Verification code expired' });
    }

    // Check attempt limit
    if ((user.verifyCodeAttempts || 0) >= 5) {
      return res.status(400).json({ message: 'Too many attempts. Request a new code.' });
    }

    // Compare the code - make sure both are strings
    const inputCode = String(code).trim();
    const storedHash = user.verifyCodeHash;
    const isMatch = storedHash === sha256(inputCode);

    if (!isMatch) {
      // Increment attempts
      user.verifyCodeAttempts = (user.verifyCodeAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Success - mark as verified and clear verification fields
    user.verified = true;
    user.verifyCodeHash = undefined;
    user.verifyCodeExpires = undefined;
    user.verifyCodeRaw = undefined;
    user.verifyCodeAttempts = undefined;
    user.verifyCodeLastSent = undefined;
    await user.save();

    // Create session
    req.session.userId = user._id;

    // Return success with proper structure
    return res.json({
      ok: true, // ← Make sure this is included
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        verified: user.verified,
        role: user.role,
      },
      message: 'Email verified successfully'
    });

  } catch (err) {
    console.error('verifyEmailCode error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};



export const resendVerifyCode = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  try {
    const user = await User.findOne({ email }).select('verified verifyCodeLastSent');
    if (!user) return res.status(200).json({ message: 'If that email exists, a code has been sent.' });
    if (user.verified) return res.status(200).json({ message: 'Already verified. You can log in.' });

    const now = Date.now();
    const last = user.verifyCodeLastSent?.getTime() || 0;
    if (now - last < RESEND_COOLDOWN_MS) {
      return res.status(200).json({ message: 'Please wait a bit before requesting another code.' });
    }

    const raw = make6Code();
    user.verifyCodeRaw = raw; // ← ADD THIS LINE
    user.verifyCodeHash = sha256(raw);
    user.verifyCodeExpires = new Date(now + CODE_TTL_MS);
    user.verifyCodeLastSent = new Date(now);
    user.verifyCodeAttempts = 0;
    await user.save();

    try { await sendVerificationCodeEmail(user.email, raw); } catch (e) { console.error('resend failed:', e); }
    return res.status(200).json({ message: 'Code sent.' });
  } catch (err) {
    console.error('resendVerifyCode error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


export const login = async (req, res) => {
  const { email, username, password } = req.body;

  if ((!email && !username) || !password) {
    return res.status(400).json({ message: 'Email/username & password are required' });
  }

  try {
    const filter = email
      ? { email }
      : { usernameLower: String(username || '').toLowerCase() };

    const user = await User.findOne(filter)
      .select('+passwordHash verified email username role verifyCodeHash verifyCodeRaw verifyCodeExpires verifyCodeLastSent verifyCodeAttempts');

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.verified) {
      const now = Date.now();
      const hasValidCode = user.verifyCodeExpires && user.verifyCodeExpires.getTime() > now;
      const canResend = now - (user.verifyCodeLastSent?.getTime() || 0) >= RESEND_COOLDOWN_MS;

      // If we have a valid code but can resend, just resend the same code
      if (hasValidCode && canResend && user.verifyCodeRaw) {
        try { 
          await sendVerificationCodeEmail(user.email, user.verifyCodeRaw); 
          user.verifyCodeLastSent = new Date(now);
          await user.save();
        } catch (e) {
          console.error('Resend existing code failed:', e);
        }
        
        // ← IMPORTANT: Return error with proper structure for frontend redirect
        return res.status(403).json({
          message: 'Please verify your email. We resent your code.',
          needVerification: true,
          email: user.email,
        });
      }
      
      // If we have a valid code but can't resend yet, just inform
      if (hasValidCode && !canResend) {
        return res.status(403).json({
          message: 'Please verify your email. Check your inbox for the code.',
          needVerification: true,
          email: user.email,
        });
      }

      // Missing/expired code → issue a new one
      const newCode = make6Code();
      user.verifyCodeRaw = newCode;
      user.verifyCodeHash = sha256(newCode);
      user.verifyCodeExpires = new Date(now + CODE_TTL_MS);
      user.verifyCodeLastSent = new Date(now);
      user.verifyCodeAttempts = 0;
      await user.save();

      try { 
        await sendVerificationCodeEmail(user.email, newCode); 
      } catch (e) {
        console.error('Send new code failed:', e);
      }

      // ← IMPORTANT: Return error with proper structure for frontend redirect
      return res.status(403).json({
        message: 'Please verify your email. We sent you a new code.',
        needVerification: true,
        email: user.email,
      });
    }

    // User is verified - proceed with login
    req.session.userId = user._id;

    return res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      verified: user.verified,
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};



export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is Required!' });

  try {
    // Only read the fields we need
    const user = await User.findOne({ email }).select('email resetTokenHash resetExpiresAt');

    // Generic 200 if user not found (no enumeration)
    if (!user) {
      return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const now = Date.now();
    const TTL_MS = 15 * 60 * 1000;  // 15 minutes
    const THROTTLE_MS = 60 * 1000;  // 60s cooldown

    // Optional throttle WITHOUT adding a new DB field:
    // If a token already exists and expires far in the future,
    // we can infer it was recently issued (within ~THROTTLE_MS)
    if (user.resetExpiresAt instanceof Date) {
      const remain = user.resetExpiresAt.getTime() - now;
      // If remain > (TTL - THROTTLE) => issued in last ~60s -> skip re-issuing
      if (remain > (TTL_MS - THROTTLE_MS)) {
        return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
      }
    }

    // Issue (or re-issue) a fresh token
    const raw = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    user.resetExpiresAt = new Date(now + TTL_MS);
    await user.save();

    const link = `${process.env.CLIENT_ORIGIN}/reset-password?token=${raw}`;
    try {
      await sendPasswordResetEmail(user.email, link);
    } catch (e) {
      console.error('Failed to send password reset mail:', e);
      // We still return 200 to avoid leaking existence
    }

    return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;


  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be ≥ 6 characters' });
  }

  try {

    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetTokenHash: hash,
      resetExpiresAt: { $gt: new Date() }, // not expired
    }).select('_id resetTokenHash');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetTokenHash = undefined;
    user.resetExpiresAt = undefined;
    await user.save();

    
    //Add logic to destroy sessions by userId in your session store

    return res.json({ ok: true, message: 'Password has been reset. You can log in now.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const logout = async(req, res) => {
    req.session.destroy(err => {
        if(err){
            console.error("Session destroy error:", err)
            return res.status(500).json({message: "Could not log out"})
        }

        res.clearCookie('sid', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        })
        
        return res.json({message: "ok: true"})
    })
}

export const me = async(req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({message: "Not Authenticated"});
    
    // Add ObjectId validation
    if (!mongoose.isValidObjectId(userId)) {
      // Clear invalid session
      req.session.destroy(() => {});
      return res.status(401).json({message: "Not Authenticated"});
    }
    
    const user = await User.findById(userId).select('_id email username verified createdAt role');
    if (!user) {
      // Clear session if user doesn't exist
      req.session.destroy(() => {});
      return res.status(401).json({message: "Not Authenticated"});
    }

    return res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      verified: user.verified,
      role: user.role, 
      createdAt: user.createdAt
    });
    
  } catch (err) {
    console.error('me() error:', err);
    return res.status(500).json({message: "Server error"});
  }
};




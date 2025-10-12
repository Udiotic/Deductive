// scripts/seedQuestions.js
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Question from '../models/questionModel.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normTags(tags = []) {
  const set = new Set();
  for (const t of tags) {
    const s = String(t || '').trim().toLowerCase();
    if (s) set.add(s);
  }
  return Array.from(set).slice(0, 10);
}

async function ensureDefaultUser() {
  // Use an existing user to attribute questions (admin or you)
  const fallbackEmail = process.env.SEED_SUBMITTER_EMAIL || 'admin@example.com';
  let user = await User.findOne({ email: fallbackEmail }).select('_id username email');
  if (!user) {
    // Create a minimal verified user if not exists
    user = await User.create({
      email: fallbackEmail,
      username: 'Seeder',
      passwordHash: '$2b$12$BYeI1fD1qfQpPpPpPpPpP.1t3/8l9bGqOcY8CzvYFZtqgqgqgqgq', // 'changeme' hash (not used)
      verified: true
    });
  }
  return user;
}

async function run() {
  const jsonPath = process.argv[2] || path.join(__dirname, '../seeds/questions.json');
  const drop = process.argv.includes('--drop');

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI missing in env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to Mongo');

  if (drop) {
    await Question.deleteMany({});
    console.log('Cleared questions collection');
  }

  const buf = await fs.readFile(jsonPath, 'utf8');
  const items = JSON.parse(buf);

  const submitter = await ensureDefaultUser();

  const docs = items.map((q, i) => {
    // choose submitter
    const submittedBy = submitter._id;

    // basic shape
    const doc = {
      body: String(q.body || '').trim(),
      images: Array.isArray(q.images) ? q.images.filter(v => v?.url).map(v => ({ url: v.url, alt: v.alt || '' })) : [],
      answer: String(q.answer || '').trim(),
      answerImage: q.answerImage?.url ? { url: q.answerImage.url, alt: q.answerImage.alt || '' } : undefined,
      answerOneLiner: q.answerOneLiner?.trim() || undefined,
      tags: normTags(q.tags),
      submittedBy,
      status: 'approved' // seed as approved
    };

    if (!doc.body || !doc.answer) {
      console.warn(`Skipping #${i} — missing body/answer`);
      return null;
    }
    return doc;
  }).filter(Boolean);

  if (!docs.length) {
    console.log('No valid questions to insert.');
    await mongoose.disconnect();
    return;
  }

  // Optional dedupe: avoid exact same body+answer combos
  const uniqueKey = (d) => `${d.body}@@${d.answer}`;
  const seen = new Set();
  const deduped = [];
  for (const d of docs) {
    const k = uniqueKey(d);
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(d);
  }

  const res = await Question.insertMany(deduped, { ordered: false });
  console.log(`Inserted ${res.length} questions`);
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

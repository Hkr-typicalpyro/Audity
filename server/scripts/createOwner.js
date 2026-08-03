/**
 * createOwner.js — one-time owner seeding script
 *
 * Usage:
 *   npm run create-owner
 *
 * Required environment variables (in server/.env):
 *   OWNER_NAME      — display name for the owner account
 *   OWNER_EMAIL     — login email
 *   OWNER_PASSWORD  — plaintext password (min 8 chars); hashed before storage
 *   OWNER_PHONE     — (optional) phone number
 *
 * Security guarantees:
 *   - Credentials are NEVER hardcoded; read exclusively from env vars.
 *   - Password and its hash are NEVER printed.
 *   - MongoDB URI is NEVER printed.
 *   - If OWNER_EMAIL already exists the script exits without making changes.
 *   - Only ONE owner can be created per email; script is safe to run in CI.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import dns from 'node:dns';
import dotenv from 'dotenv';

// Load .env from server/ root (scripts/ is one level deeper)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Apply the same DNS workaround used by the main server so Atlas SRV resolves
dns.setServers(['8.8.8.8', '8.8.4.4']);

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const exit = (code, message) => {
  console.log(message);
  process.exit(code);
};

// ── Main ─────────────────────────────────────────────────────────────────────

const run = async () => {
  // 1. Read credentials from environment — never from argv or hardcode
  const name     = process.env.OWNER_NAME?.trim();
  const email    = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;           // kept as-is; never printed
  const phone    = process.env.OWNER_PHONE?.trim() || undefined;

  // 2. Validate required fields
  const missing = [];
  if (!name)     missing.push('OWNER_NAME');
  if (!email)    missing.push('OWNER_EMAIL');
  if (!password) missing.push('OWNER_PASSWORD');

  if (missing.length > 0) {
    exit(
      1,
      `✗ Missing required environment variable(s): ${missing.join(', ')}\n` +
      `  Add them to server/.env, then re-run: npm run create-owner`
    );
  }

  if (!isValidEmail(email)) {
    exit(1, `✗ OWNER_EMAIL "${email}" is not a valid email address.`);
  }

  if (password.length < 8) {
    exit(1, '✗ OWNER_PASSWORD must be at least 8 characters.');
  }

  // 3. Connect to MongoDB
  console.log('Connecting to MongoDB…');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB connected');
  } catch (err) {
    exit(1, `✗ MongoDB connection failed: ${err.message}`);
  }

  try {
    // 4. Duplicate check — never overwrite or promote an existing account
    const existing = await User.findOne({ email });
    if (existing) {
      exit(
        0,
        `⚠  An account with email "${email}" already exists (role: ${existing.role}).\n` +
        `   No changes were made. Script exiting safely.`
      );
    }

    // 5. Hash password (12 rounds — matches registration)
    const salt           = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    // hashedPassword is NEVER logged

    // 6. Create owner
    const owner = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'owner',
      organiserStatus: 'none',
      isActive: true,
    });

    console.log('✓ Owner account created successfully');
    console.log(`  Name  : ${owner.name}`);
    console.log(`  Email : ${owner.email}`);
    console.log(`  Role  : ${owner.role}`);
    console.log(`  ID    : ${owner._id}`);
  } finally {
    // 7. Always close the connection
    await mongoose.disconnect();
    console.log('✓ MongoDB disconnected');
  }
};

run();

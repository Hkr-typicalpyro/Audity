/**
 * seedEvents.js
 *
 * Migrates the 7 SEED_EVENTS from mock-data into MongoDB.
 *
 * Organiser mismatch strategy:
 * ─────────────────────────────────────────────────────────────────────
 * SEED_EVENTS use 4 organiser names:
 *   "Northwind Event Labs"  — used by evt-1001, evt-1004, evt-1006
 *   "Sur Sangam Collective" — evt-1002
 *   "Meridian Capital Group"— evt-1003
 *   "Frame 24 Studios"      — evt-1005
 *   "Vantage Systems Pvt Ltd"—evt-1007
 *
 * None of these names map to real User documents.
 * We do NOT create privileged accounts for them.
 *
 * Instead: `organiser` (ObjectId ref) is left null for seeded events.
 * `organiserName` stores the display name string so the UI renders correctly.
 * Ownership-based authorization only applies to events created via the API.
 * ─────────────────────────────────────────────────────────────────────
 *
 * Hall ID resolution:
 *   mock "hall-a" → MongoDB Hall where code = "HALL A"
 *   mock "hall-b" → MongoDB Hall where code = "HALL B"
 *   mock "hall-c" → MongoDB Hall where code = "HALL C"
 *
 * Usage:
 *   node scripts/seedEvents.js
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import dns from 'node:dns'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

// DNS workaround (same as server)
dns.setServers(['8.8.8.8', '8.8.4.4'])

import Hall from '../src/models/Hall.js'
import Event from '../src/models/Event.js'

// ─── Static seed data (inlined to avoid ESM mock-data import issues) ──────────

function dayOffset(n) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const SEED_EVENTS_STATIC = [
  {
    legacyId: 'evt-1001',
    title: 'DevStack Summit 2026',
    description: 'A full-day engineering summit covering distributed systems, edge runtimes and applied AI infrastructure. Includes three keynote sessions and a live architecture teardown.',
    category: 'TECH',
    date: dayOffset(3),
    slotId: 'morning',
    startTime: '09:00',
    endTime: '12:00',
    hallCode: 'HALL A',
    maxCapacity: 800,
    registeredCount: 612,
    ticketPrice: 1499,
    organiserName: 'Northwind Event Labs',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
  {
    legacyId: 'evt-1002',
    title: 'Raag & Rhythm — Classical Night',
    description: 'An evening of Hindustani classical performances featuring three ensembles, tabla duets and a closing collaborative jugalbandi.',
    category: 'CULTURAL',
    date: dayOffset(5),
    slotId: 'evening',
    startTime: '17:00',
    endTime: '20:00',
    hallCode: 'HALL B',
    maxCapacity: 450,
    registeredCount: 438,
    ticketPrice: 899,
    organiserName: 'Sur Sangam Collective',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
  {
    legacyId: 'evt-1003',
    title: 'Quarterly Investor Briefing',
    description: 'Closed-format corporate briefing with financial disclosure walkthrough, product roadmap review and a moderated analyst Q&A.',
    category: 'CORPORATE',
    date: dayOffset(8),
    slotId: 'afternoon',
    startTime: '13:00',
    endTime: '16:00',
    hallCode: 'HALL C',
    maxCapacity: 180,
    registeredCount: 180,
    ticketPrice: 0,
    organiserName: 'Meridian Capital Group',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
  {
    legacyId: 'evt-1004',
    title: 'Hands-On Robotics Workshop',
    description: 'Build-and-take workshop on servo control, sensor fusion and autonomous path planning. Hardware kits provided per participant.',
    category: 'WORKSHOP',
    date: dayOffset(11),
    slotId: 'morning',
    startTime: '09:00',
    endTime: '12:00',
    hallCode: 'HALL C',
    maxCapacity: 180,
    registeredCount: 96,
    ticketPrice: 2400,
    organiserName: 'Northwind Event Labs',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
  {
    legacyId: 'evt-1005',
    title: 'Indie Film Premiere — "Monsoon Lines"',
    description: 'Regional premiere screening followed by an on-stage director conversation and a short cast interaction segment.',
    category: 'CULTURAL',
    date: dayOffset(14),
    slotId: 'evening',
    startTime: '17:00',
    endTime: '20:00',
    hallCode: 'HALL A',
    maxCapacity: 800,
    registeredCount: 214,
    ticketPrice: 650,
    organiserName: 'Frame 24 Studios',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
  {
    legacyId: 'evt-1006',
    title: 'Product Leadership Bootcamp',
    description: 'Two-track intensive on discovery frameworks, roadmap negotiation and stakeholder communication for senior product managers.',
    category: 'WORKSHOP',
    date: dayOffset(18),
    slotId: 'afternoon',
    startTime: '13:00',
    endTime: '16:00',
    hallCode: 'HALL B',
    maxCapacity: 450,
    registeredCount: 121,
    ticketPrice: 1850,
    organiserName: 'Northwind Event Labs',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
  {
    legacyId: 'evt-1007',
    title: 'Annual Partner Conclave',
    description: 'Channel partner assembly with awards ceremony, regional performance review and a networking dinner in the west foyer.',
    category: 'CORPORATE',
    date: dayOffset(21),
    slotId: 'evening',
    startTime: '17:00',
    endTime: '20:00',
    hallCode: 'HALL A',
    maxCapacity: 800,
    registeredCount: 340,
    ticketPrice: 1200,
    organiserName: 'Vantage Systems Pvt Ltd',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
]

async function seedEvents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✓ MongoDB connected')

    // Build hallCode → Hall document map
    const halls = await Hall.find()
    if (halls.length === 0) {
      console.error('✗ No halls found in MongoDB. Run seed-halls first.')
      process.exitCode = 1
      return
    }

    const hallMap = {}
    for (const h of halls) {
      hallMap[h.code] = h
    }
    console.log(`  Found ${halls.length} hall(s): ${halls.map((h) => h.code).join(', ')}`)

    let created = 0
    let skipped = 0

    for (const seed of SEED_EVENTS_STATIC) {
      // Duplicate-safe: skip if title + date + slotId + hallCode already exists
      const existing = await Event.findOne({
        title: seed.title,
        date: seed.date,
        slotId: seed.slotId,
      })

      if (existing) {
        console.log(`  Skipped (exists): ${seed.title}`)
        skipped++
        continue
      }

      const hall = hallMap[seed.hallCode]
      if (!hall) {
        console.error(`  ✗ Hall not found for code: ${seed.hallCode} — skipping ${seed.title}`)
        skipped++
        continue
      }

      await Event.create({
        title: seed.title,
        description: seed.description,
        category: seed.category,
        hall: hall._id,
        hallCode: hall.code,
        hallName: hall.name,
        floor: hall.floor,
        entranceGate: hall.entranceGate,
        date: seed.date,
        startTime: seed.startTime,
        endTime: seed.endTime,
        slotId: seed.slotId,
        maxCapacity: Math.min(seed.maxCapacity, hall.capacity),
        registeredCount: seed.registeredCount,
        ticketPrice: seed.ticketPrice,
        organiser: null,     // no real User — see file header comment
        organiserName: seed.organiserName,
        status: seed.status,
        cancellationReason: seed.cancellationReason,
      })

      console.log(`  ✓ Created: ${seed.title}`)
      created++
    }

    console.log(`\nSeed complete — created: ${created}, skipped: ${skipped}`)
  } catch (error) {
    console.error('✗ Seed failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
    console.log('  MongoDB disconnected')
  }
}

seedEvents()

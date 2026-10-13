import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import hallRoutes from './src/routes/hallRoutes.js';
import eventRoutes from './src/routes/eventRoutes.js';
import ticketRoutes from './src/routes/ticketRoutes.js';
import reservationRoutes from './src/routes/reservationRoutes.js';
import blackoutRoutes from './src/routes/blackoutRoutes.js';
import paymentRoutes from './src/routes/paymentRoutes.js';
import settingsRoutes from './src/routes/settingsRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import organiserRoutes from './src/routes/organiserRoutes.js';

import User from './src/models/User.js';
import Hall from './src/models/Hall.js';
import Event from './src/models/Event.js';
import Reservation from './src/models/Reservation.js';
import Blackout from './src/models/Blackout.js';
import Ticket from './src/models/Ticket.js';
import Payment from './src/models/Payment.js';
import PlatformSettings from './src/models/PlatformSettings.js';
import { getLocalTodayString } from './src/utils/conflictService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = 5005;
const BASE_URL = `http://localhost:${PORT}/api`;
const TEST_PREFIX = `RES_TEST_${Date.now()}`;

let serverInstance = null;
let mongod = null;
let ownerToken, orgToken, attToken;
let ownerId, orgId, attId;
let testHallId;

const log = (msg) => console.log(`[RESERVATION TEST] ${msg}`);
const assert = (cond, msg, detail = '') => {
  if (!cond) {
    console.error(`\n❌ ASSERTION FAILED: ${msg}${detail ? ` -> ${JSON.stringify(detail, null, 2)}` : ''}\n`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
};

async function req(method, path, body = null, token = null) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return getLocalTodayString(d);
}

async function setup() {
  log('Starting In-Memory MongoDB Replica Set for transactions and isolation...');
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const app = express();
  app.use(express.json());
  app.use(cors());

  app.use('/api/halls', hallRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/blackouts', blackoutRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/organiser', organiserRoutes);

  await new Promise((resolve) => {
    serverInstance = app.listen(PORT, resolve);
  });

  log(`Express test server running on port ${PORT}`);

  // Seed default platform settings
  await PlatformSettings.create({
    ticketSalesEnabled: true,
    hallRentalEnabled: true,
  });

  // Seed identities
  const pwdHash = await bcrypt.hash('TestPass123!', 10);
  const owner = await User.create({ name: `${TEST_PREFIX}_Owner`, email: `owner_${TEST_PREFIX}@audity.test`, password: pwdHash, role: 'owner' });
  const org = await User.create({ name: `${TEST_PREFIX}_Organiser`, email: `org_${TEST_PREFIX}@audity.test`, password: pwdHash, role: 'organiser', organiserStatus: 'approved' });
  const att = await User.create({ name: `${TEST_PREFIX}_Attendee`, email: `att_${TEST_PREFIX}@audity.test`, password: pwdHash, role: 'attendee' });

  ownerId = owner._id; orgId = org._id; attId = att._id;

  const loginOwner = await req('POST', '/auth/login', { email: owner.email, password: 'TestPass123!' });
  const loginOrg = await req('POST', '/auth/login', { email: org.email, password: 'TestPass123!' });
  const loginAtt = await req('POST', '/auth/login', { email: att.email, password: 'TestPass123!' });

  ownerToken = loginOwner.data.token;
  orgToken = loginOrg.data.token;
  attToken = loginAtt.data.token;

  assert(ownerToken && orgToken && attToken, 'Auth tokens acquired for Owner, Organiser, Attendee');

  // Create Test Hall
  const hallRes = await req('POST', '/halls', {
    name: `${TEST_PREFIX} Royal Hall`,
    code: `H-${Date.now().toString().slice(-4)}`,
    capacity: 250,
    rentalFee: 40000,
    floor: 'Level 2',
    entranceGate: 'Gate A',
  }, ownerToken);

  testHallId = hallRes.data?.hall?.id || hallRes.data?.hall?._id;
  assert(hallRes.status === 201 && testHallId, `Test Hall created (ID: ${testHallId}, Fee: 40,000/day)`);
}

async function runTests() {
  await setup();

  const yesterday = offsetDate(-1);
  const today = offsetDate(0);
  const tomorrow = offsetDate(1);
  const futureDay5 = offsetDate(5);
  const futureDay6 = offsetDate(6);
  const futureDay7 = offsetDate(7);
  const futureDay10 = offsetDate(10);
  const futureDay11 = offsetDate(11);
  const futureDay12 = offsetDate(12);
  const futureDay20 = offsetDate(20);
  const futureDay21 = offsetDate(21);

  log('\n--- Case 1: Yesterday\'s date is rejected ---');
  const pastRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} Past Event`,
    description: 'Should fail with 400 due to past date',
    category: 'TECH',
    hallId: testHallId,
    fromDate: yesterday,
    toDate: yesterday,
    bookingType: 'timed',
    startTime: '10:00',
    endTime: '12:00',
    ticketPrice: 500,
    maxCapacity: 100,
  }, orgToken);
  assert(pastRes.status === 400, 'Yesterday\'s booking date rejected with HTTP 400', pastRes.data);
  assert(/past/i.test(pastRes.data.message), `Meaningful error message returned: "${pastRes.data.message}"`);

  log('\n--- Case 2: Today\'s date is allowed if the booking\'s selected time and other rules permit it ---');
  const todayRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} Today Event`,
    description: 'Booking today should be allowed',
    category: 'TECH',
    hallId: testHallId,
    fromDate: today,
    toDate: today,
    bookingType: 'timed',
    startTime: '18:00',
    endTime: '21:00',
    ticketPrice: 500,
    maxCapacity: 100,
  }, orgToken);
  assert(todayRes.status === 201, 'Today\'s date allowed and succeeded with HTTP 201', todayRes.data);

  log('\n--- Case 3: Tomorrow\'s date is allowed if the hall is available ---');
  const tomorrowRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} Tomorrow Event`,
    description: 'Booking tomorrow should succeed',
    category: 'TECH',
    hallId: testHallId,
    fromDate: tomorrow,
    toDate: tomorrow,
    bookingType: 'timed',
    startTime: '10:00',
    endTime: '13:00',
    ticketPrice: 500,
    maxCapacity: 100,
  }, orgToken);
  assert(tomorrowRes.status === 201, 'Tomorrow\'s date allowed and succeeded with HTTP 201', tomorrowRes.data);

  log('\n--- Case 4: To Date earlier than From Date is rejected ---');
  const invalidRangeRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} Inverted Range`,
    description: 'Should fail with 400',
    category: 'TECH',
    hallId: testHallId,
    fromDate: futureDay7,
    toDate: futureDay5,
    bookingType: 'timed',
    startTime: '10:00',
    endTime: '13:00',
    ticketPrice: 500,
    maxCapacity: 100,
  }, orgToken);
  assert(invalidRangeRes.status === 400, 'To Date earlier than From Date rejected with HTTP 400', invalidRangeRes.data);
  assert(/earlier/i.test(invalidRangeRes.data.message), `Error message explains range order: "${invalidRangeRes.data.message}"`);

  log('\n--- Case 5: A valid single-day timed booking succeeds ---');
  const singleDayRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} Single Day Timed`,
    description: 'Single day timed booking',
    category: 'CORPORATE',
    hallId: testHallId,
    fromDate: futureDay5,
    toDate: futureDay5,
    bookingType: 'timed',
    startTime: '10:00',
    endTime: '13:00',
    ticketPrice: 800,
    maxCapacity: 150,
  }, orgToken);
  assert(singleDayRes.status === 201, 'Single-day timed booking succeeded with HTTP 201', singleDayRes.data);
  assert(singleDayRes.data.reservation.amount === 40000, 'Authoritative 1-day rental fee enforced (40,000)');
  assert(singleDayRes.data.reservation.bookingType === 'timed', 'Reservation bookingType is "timed"');

  log('\n--- Case 6: A valid multi-day timed booking succeeds when every affected interval is available ---');
  const multiDayTimedRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} Multi Day Timed Conference`,
    description: '3-day conference with daily 10:00-14:00 usage',
    category: 'TECH',
    hallId: testHallId,
    fromDate: futureDay10,
    toDate: futureDay12,
    bookingType: 'timed',
    startTime: '10:00',
    endTime: '14:00',
    ticketPrice: 1500,
    maxCapacity: 200,
  }, orgToken);
  assert(multiDayTimedRes.status === 201, 'Multi-day timed booking (3 days) succeeded with HTTP 201', multiDayTimedRes.data);
  assert(multiDayTimedRes.data.reservation.amount === 120000, 'Authoritative 3-day rental fee enforced (40,000 * 3 = 120,000)');
  assert(multiDayTimedRes.data.reservation.fromDate === futureDay10 && multiDayTimedRes.data.reservation.toDate === futureDay12, 'From Date and To Date persisted cleanly');

  log('\n--- Case 7: A full-day booking succeeds when all affected days are available ---');
  const fullDayRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} Full Day Summit`,
    description: '2-day full complex summit',
    category: 'CULTURAL',
    hallId: testHallId,
    fromDate: futureDay20,
    toDate: futureDay21,
    bookingType: 'full-day',
    ticketPrice: 1200,
    maxCapacity: 250,
  }, orgToken);
  assert(fullDayRes.status === 201, 'Full-day booking (2 days) succeeded with HTTP 201', fullDayRes.data);
  assert(fullDayRes.data.reservation.bookingType === 'full-day', 'Reservation bookingType is "full-day"');
  assert(fullDayRes.data.reservation.amount === 80000, 'Authoritative 2-day rental fee enforced (40,000 * 2 = 80,000)');
  assert(fullDayRes.data.reservation.startTime === '08:00' && fullDayRes.data.reservation.endTime === '22:00', 'Full operational day bounds (08:00–22:00) assigned');

  log('\n--- Case 8: A full-day booking conflicts with a timed booking on the same day ---');
  // Attempt full-day booking on futureDay5 (which already has 10:00-13:00 timed reservation from Case 5)
  const fullDayConflictRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} Conflicting Full Day`,
    description: 'Should conflict with Case 5 timed reservation',
    category: 'TECH',
    hallId: testHallId,
    fromDate: futureDay5,
    toDate: futureDay5,
    bookingType: 'full-day',
    ticketPrice: 500,
    maxCapacity: 100,
  }, orgToken);
  assert(fullDayConflictRes.status === 409, 'Full-day booking conflicting with existing timed booking rejected with HTTP 409', fullDayConflictRes.data);
  assert(/reserved/i.test(fullDayConflictRes.data.message), `Rejection message details conflict: "${fullDayConflictRes.data.message}"`);

  log('\n--- Case 9: A timed booking conflicts with an existing full-day booking ---');
  // Attempt timed booking on futureDay20 (which already has full-day reservation from Case 7)
  const timedOnFullDayRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} Conflicting Timed On Full Day`,
    description: 'Should conflict with Case 7 full-day reservation',
    category: 'WORKSHOP',
    hallId: testHallId,
    fromDate: futureDay20,
    toDate: futureDay20,
    bookingType: 'timed',
    startTime: '14:00',
    endTime: '17:00',
    ticketPrice: 500,
    maxCapacity: 100,
  }, orgToken);
  assert(timedOnFullDayRes.status === 409, 'Timed booking conflicting with existing full-day booking rejected with HTTP 409', timedOnFullDayRes.data);
  assert(/Full day/i.test(timedOnFullDayRes.data.message), `Rejection message identifies full-day conflict: "${timedOnFullDayRes.data.message}"`);

  log('\n--- Case 10: Overlapping timed bookings for the same hall are rejected ---');
  // Case 5 timed reservation on futureDay5 is 10:00 - 13:00.
  // Request overlapping interval 12:00 - 15:00.
  const overlapTimedRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} Overlapping Timed Slot`,
    description: 'Should conflict with 10:00-13:00 slot',
    category: 'TECH',
    hallId: testHallId,
    fromDate: futureDay5,
    toDate: futureDay5,
    bookingType: 'timed',
    startTime: '12:00',
    endTime: '15:00',
    ticketPrice: 500,
    maxCapacity: 100,
  }, orgToken);
  assert(overlapTimedRes.status === 409, 'Overlapping timed reservation rejected with HTTP 409', overlapTimedRes.data);

  log('\n--- Case 11: Adjacent non-overlapping time slots are handled correctly ---');
  // Case 5 timed reservation on futureDay5 ends at 13:00.
  // Book adjacent slot 13:00 - 16:00 (start-inclusive, end-exclusive).
  const adjacentSlotRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} Adjacent Afternoon Slot`,
    description: 'Non-overlapping adjacent slot starting exactly at 13:00',
    category: 'WORKSHOP',
    hallId: testHallId,
    fromDate: futureDay5,
    toDate: futureDay5,
    bookingType: 'timed',
    startTime: '13:00',
    endTime: '16:00',
    ticketPrice: 500,
    maxCapacity: 100,
  }, orgToken);
  assert(adjacentSlotRes.status === 201, 'Adjacent non-overlapping slot (13:00–16:00 after 10:00–13:00) succeeded with HTTP 201', adjacentSlotRes.data);

  log('\n--- Case 11b: Concurrency protection under simultaneous booking attempts ---');
  const futureDay15 = offsetDate(15);
  const concurrentAttempts = await Promise.all([
    req('POST', '/events', {
      title: `${TEST_PREFIX} Conc Attempt 1`,
      description: 'Concurrent race test',
      category: 'TECH',
      hallId: testHallId,
      fromDate: futureDay15,
      toDate: futureDay15,
      bookingType: 'timed',
      startTime: '10:00',
      endTime: '13:00',
      ticketPrice: 500,
      maxCapacity: 100,
    }, orgToken),
    req('POST', '/events', {
      title: `${TEST_PREFIX} Conc Attempt 2`,
      description: 'Concurrent race test',
      category: 'TECH',
      hallId: testHallId,
      fromDate: futureDay15,
      toDate: futureDay15,
      bookingType: 'timed',
      startTime: '10:00',
      endTime: '13:00',
      ticketPrice: 500,
      maxCapacity: 100,
    }, orgToken),
    req('POST', '/events', {
      title: `${TEST_PREFIX} Conc Attempt 3`,
      description: 'Concurrent race test',
      category: 'TECH',
      hallId: testHallId,
      fromDate: futureDay15,
      toDate: futureDay15,
      bookingType: 'timed',
      startTime: '10:00',
      endTime: '13:00',
      ticketPrice: 500,
      maxCapacity: 100,
    }, orgToken),
    req('POST', '/events', {
      title: `${TEST_PREFIX} Conc Attempt 4`,
      description: 'Concurrent race test',
      category: 'TECH',
      hallId: testHallId,
      fromDate: futureDay15,
      toDate: futureDay15,
      bookingType: 'timed',
      startTime: '10:00',
      endTime: '13:00',
      ticketPrice: 500,
      maxCapacity: 100,
    }, orgToken),
  ]);
  const statuses = concurrentAttempts.map((r) => r.status).sort();
  assert(
    statuses[0] === 201 && statuses[1] === 409 && statuses[2] === 409 && statuses[3] === 409,
    `Exact concurrency result: exactly 1 succeeded (201) and 3 rejected (409 Conflict). Got: ${statuses.join(', ')}`
  );

  log('\n--- Case 12: A conflict or blackout on any date in a multi-day range rejects the booking ---');
  const futureDay30 = offsetDate(30);
  const futureDay31 = offsetDate(31);
  const futureDay32 = offsetDate(32);

  // Owner creates blackout on the middle date (futureDay31)
  const blkRes = await req('POST', '/blackouts', {
    hallId: testHallId,
    date: futureDay31,
    slotId: 'morning',
    reason: 'MAINTENANCE',
    note: 'HVAC repair',
  }, ownerToken);
  assert(blkRes.status === 201, `Blackout created on ${futureDay31}`, blkRes.data);

  // Organiser attempts 3-day reservation covering futureDay30 through futureDay32
  const multiDayWithBlkRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} 3-Day Blocked By Blackout`,
    description: 'Should fail because middle day has a blackout',
    category: 'TECH',
    hallId: testHallId,
    fromDate: futureDay30,
    toDate: futureDay32,
    bookingType: 'timed',
    startTime: '09:00',
    endTime: '12:00',
    ticketPrice: 500,
    maxCapacity: 100,
  }, orgToken);
  assert(multiDayWithBlkRes.status === 409, 'Multi-day booking rejected with HTTP 409 due to middle-day blackout', multiDayWithBlkRes.data);
  assert(/blacked out/i.test(multiDayWithBlkRes.data.message), `Conflict detail specifies blackout: "${multiDayWithBlkRes.data.message}"`);

  log('\n--- Case 13: Direct API requests cannot bypass date, time, or booking-type validation ---');
  // 13a: Direct POST /api/reservations with past date
  const directPast = await req('POST', '/reservations', {
    hallId: testHallId,
    fromDate: yesterday,
    toDate: yesterday,
    bookingType: 'full-day',
  }, orgToken);
  assert(directPast.status === 400, 'Direct POST /reservations rejected past date with HTTP 400', directPast.data);

  // 13b: Direct POST /api/reservations with inverted date range
  const directInverted = await req('POST', '/reservations', {
    hallId: testHallId,
    fromDate: futureDay7,
    toDate: futureDay5,
    bookingType: 'full-day',
  }, orgToken);
  assert(directInverted.status === 400, 'Direct POST /reservations rejected inverted range with HTTP 400', directInverted.data);

  // 13c: Direct POST /api/reservations with timed booking and start >= end
  const directInvalidTime = await req('POST', '/reservations', {
    hallId: testHallId,
    fromDate: futureDay10,
    toDate: futureDay10,
    bookingType: 'timed',
    startTime: '15:00',
    endTime: '11:00',
  }, orgToken);
  assert(directInvalidTime.status === 400, 'Direct POST /reservations rejected end < start with HTTP 400', directInvalidTime.data);

  // 13d: Direct POST /api/reservations with missing times for timed booking
  const directMissingTime = await req('POST', '/reservations', {
    hallId: testHallId,
    fromDate: futureDay10,
    toDate: futureDay10,
    bookingType: 'timed',
  }, orgToken);
  assert(directMissingTime.status === 400, 'Direct POST /reservations rejected missing times with HTTP 400', directMissingTime.data);

  // 13e: Direct POST /api/reservations with invalid bookingType
  const directInvalidType = await req('POST', '/reservations', {
    hallId: testHallId,
    fromDate: futureDay10,
    toDate: futureDay10,
    bookingType: 'arbitrary_bypass',
  }, orgToken);
  assert(directInvalidType.status === 400, 'Direct POST /reservations rejected invalid bookingType with HTTP 400', directInvalidType.data);

  // 13f: Valid direct POST /api/reservations succeeds
  const directValid = await req('POST', '/reservations', {
    hallId: testHallId,
    fromDate: offsetDate(40),
    toDate: offsetDate(41),
    bookingType: 'full-day',
  }, orgToken);
  assert(directValid.status === 201, 'Valid direct POST /reservations succeeded with HTTP 201', directValid.data);
  assert(directValid.data.reservation.bookingType === 'full-day', 'Direct reservation contains bookingType "full-day"');

  log('\n--- Case 14: Existing reservations and unrelated application features continue to work ---');
  // 14a: Organiser reads own reservations
  const orgResList = await req('GET', '/reservations', null, orgToken);
  assert(orgResList.status === 200 && orgResList.data.reservations.length > 0, 'Organiser successfully fetched reservation list', orgResList.data.reservations.length);
  const sampleRes = orgResList.data.reservations[0];
  assert(sampleRes.bookingType && sampleRes.fromDate && sampleRes.toDate, 'Reservation contains bookingType, fromDate, and toDate', sampleRes);

  // 14b: Owner reads all reservations
  const ownerResList = await req('GET', '/reservations', null, ownerToken);
  assert(ownerResList.status === 200 && ownerResList.data.reservations.length >= orgResList.data.reservations.length, 'Owner successfully fetched all complex reservations');

  // 14c: Attendee forbidden from reading reservations
  const attResList = await req('GET', '/reservations', null, attToken);
  assert(attResList.status === 403, 'Attendee reading reservations correctly rejected with HTTP 403');

  // 14d: Read published events
  const evtsList = await req('GET', '/events', null, attToken);
  assert(evtsList.status === 200 && evtsList.data.events.length > 0, 'Published events retrieved with bookingType, fromDate, toDate');

  // 14e: Book tickets on a published event
  const targetEvent = evtsList.data.events.find((e) => e.title.includes('Tomorrow Event'));
  const bookTicketRes = await req('POST', `/events/${targetEvent.id}/book`, { quantity: 2, method: 'UPI' }, attToken);
  assert(bookTicketRes.status === 201, 'Attendee successfully booked tickets on published event', bookTicketRes.data);

  // 14f: Organiser gate check-in
  const ticketId = bookTicketRes.data.ticket.id || bookTicketRes.data.ticket._id;
  const checkinRes = await req('PATCH', `/tickets/${ticketId}/checkin`, null, orgToken);
  assert(checkinRes.status === 200 && checkinRes.data.ok === true, 'Organiser gate check-in verification functional');

  log('\n======================================================');
  log('🎉 ALL 14 TEST CASES EXECUTED AND PASSED WITH 100% SUCCESS!');
  log('======================================================\n');

  // Cleanup
  await mongoose.disconnect();
  await mongod.stop();
  serverInstance.close();
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error('\nFatal test execution error:', err);
  if (serverInstance) serverInstance.close();
  if (mongod) await mongod.stop();
  process.exit(1);
});

import { fileURLToPath } from 'url';
import path from 'path';
import dns from 'node:dns';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dns.setServers(['8.8.8.8', '8.8.4.4']);

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
import Hall from './src/models/Hall.js';
import Event from './src/models/Event.js';
import Reservation from './src/models/Reservation.js';
import Blackout from './src/models/Blackout.js';
import Ticket from './src/models/Ticket.js';
import Payment from './src/models/Payment.js';

const BASE_URL = 'http://localhost:5000/api';

const TEST_PREFIX = `MIG_TEST_${Date.now()}`;

let ownerToken, orgToken, attToken;
let ownerId, orgId, attId;
let testHallId;
let mainEventId;
let firstTicketId, concurrencyTicketId;
let blackoutId;
let afternoonEventId;

const log = (msg) => console.log(`[TEST SUITE] ${msg}`);
const assert = (cond, msg, detail = '') => {
  if (!cond) {
    console.error(`❌ ASSERTION FAILED: ${msg}${detail ? ` -> ${JSON.stringify(detail)}` : ''}`);
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

async function runTests() {
  log('1. Connecting to MongoDB and setting up independent test identities...');
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Wipe any remnants from aborted test runs with same prefix pattern
  await User.deleteMany({ email: { $regex: 'mig_test_' } });
  await Hall.deleteMany({ name: { $regex: 'MIG_TEST_' } });
  await Event.deleteMany({ title: { $regex: 'MIG_TEST_' } });
  await Reservation.deleteMany({ hallName: { $regex: 'MIG_TEST_' } });
  await Blackout.deleteMany({ note: { $regex: 'MIG_TEST_' } });
  await Ticket.deleteMany({ attendeeName: { $regex: 'MIG_TEST_' } });

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

  assert(ownerToken && orgToken && attToken, 'Authentication tokens obtained for Owner, Organiser, and Attendee');
  
  // Create Test Hall
  const hallRes = await req('POST', '/halls', { name: `${TEST_PREFIX} Hall`, code: `MIG-${Date.now().toString().slice(-6)}`, capacity: 5, rentalFee: 50000, floor: 'Floor 1', entranceGate: 'Gate T' }, ownerToken);
  testHallId = hallRes.data?.hall?.id || hallRes.data?.hall?._id;
  assert(hallRes.status === 201 && testHallId, `Test Hall created with capacity 5 and rental fee 50,000 (ID: ${testHallId})`, hallRes.data);

  log('\n2. Testing Atomic Hall Rental & Publish (Part 32 & 11)...');
  const futureDate = new Date(Date.now() + 86400000 * 15).toISOString().slice(0, 10);
  const rentRes = await req('POST', '/events', {
    title: `${TEST_PREFIX} Tech Event`,
    description: 'Testing transactional creation of Event + Reservation + Payment',
    category: 'TECH',
    hallId: testHallId,
    date: futureDate,
    slotId: 'morning',
    ticketPrice: 1000,
    maxCapacity: 5,
    method: 'UPI',
  }, orgToken);
  assert(rentRes.status === 201, `Organiser successfully rented hall and published event`, rentRes.data);
  assert(rentRes.data.event && rentRes.data.reservation && rentRes.data.payment, 'Atomic response contains Event, Reservation, and Hall Rental Payment', rentRes.data);
  assert(rentRes.data.reservation.amount === 50000 && rentRes.data.payment.amount === 50000, 'Authoritative rental fee (50000) enforced from DB Hall document', rentRes.data);
  mainEventId = rentRes.data.event.id || rentRes.data.event._id;

  const doubleRent = await req('POST', '/events', {
    title: `${TEST_PREFIX} Conflicting Event`,
    description: 'Should fail due to active reservation',
    category: 'TECH',
    hallId: testHallId,
    date: futureDate,
    slotId: 'morning',
    ticketPrice: 500,
    maxCapacity: 5,
  }, orgToken);
  assert(doubleRent.status === 409, 'Double booking identical hall + date + slot cleanly rejected with 409 Conflict', doubleRent.data);

  log('\n3. Testing Atomic Ticket Booking (Part 28 & 6)...');
  const book1 = await req('POST', `/events/${mainEventId}/book`, { quantity: 2, method: 'UPI' }, attToken);
  assert(book1.status === 201, 'Attendee booked 2 seats successfully', book1.data);
  assert(book1.data.ticket.quantity === 2 && book1.data.ticket.amount === 2000, 'Authoritative ticket price (1000 * 2 = 2000) calculated server-side', book1.data);
  firstTicketId = book1.data.ticket.id || book1.data.ticket._id;

  const eventAfterBook1 = await req('GET', `/events/${mainEventId}`, null, attToken);
  assert(eventAfterBook1.data.event.registeredCount === 2, 'Event registeredCount increased from 0 to 2', eventAfterBook1.data);

  log('\n4. Testing Concurrency & Overselling Protection (Part 29 & 7)...');
  log('   Remaining capacity: 3 seats. Launching 3 concurrent attempts for 2 seats each (6 requested total)...');
  const [concA, concB, concC] = await Promise.all([
    req('POST', `/events/${mainEventId}/book`, { quantity: 2, method: 'UPI' }, attToken),
    req('POST', `/events/${mainEventId}/book`, { quantity: 2, method: 'UPI' }, attToken),
    req('POST', `/events/${mainEventId}/book`, { quantity: 2, method: 'UPI' }, attToken),
  ]);
  const statuses = [concA.status, concB.status, concC.status].sort();
  assert(statuses[0] === 201 && statuses[1] === 409 && statuses[2] === 409, `Exact concurrency outcome: 1 succeeded (201) and 2 rejected (409 Conflict). Got statuses: ${statuses.join(', ')}`, { A: concA.data, B: concB.data, C: concC.data });
  
  const successfulRes = [concA, concB, concC].find((r) => r.status === 201);
  concurrencyTicketId = successfulRes.data.ticket.id || successfulRes.data.ticket._id;

  const eventAfterConc = await req('GET', `/events/${mainEventId}`, null, attToken);
  assert(eventAfterConc.data.event.registeredCount === 4, `Final registeredCount is exactly 4 (<= maxCapacity 5). Zero overselling under high concurrency.`, eventAfterConc.data);

  log('\n5. Testing Gate Check-In Verification (Part 31 & 10)...');
  const attCheckinAttempt = await req('PATCH', `/tickets/${firstTicketId}/checkin`, null, attToken);
  assert(attCheckinAttempt.status === 403, 'Attendee attempting gate check-in denied with 403 Forbidden', attCheckinAttempt.data);
  
  const checkin1 = await req('PATCH', `/tickets/${firstTicketId}/checkin`, null, orgToken);
  assert(checkin1.status === 200 && checkin1.data.ok === true && checkin1.data.ticket.checkedIn === true, 'Organiser successfully checked in valid ticket', checkin1.data);

  const checkinDup = await req('PATCH', `/tickets/${firstTicketId}/checkin`, null, orgToken);
  assert(checkinDup.status === 409 && checkinDup.data.code === 'DUPLICATE', 'Duplicate QR scan rejected cleanly with 409 Conflict and DUPLICATE code', checkinDup.data);

  log('\n6. Testing Ticket Cancellation & Refund (Part 30 & 9)...');
  const cancelCheckedIn = await req('PATCH', `/tickets/${firstTicketId}/cancel`, null, attToken);
  assert(cancelCheckedIn.status === 409, 'Attempt to cancel an already checked-in ticket rejected with 409 Conflict', cancelCheckedIn.data);

  const cancelValid = await req('PATCH', `/tickets/${concurrencyTicketId}/cancel`, null, attToken);
  assert(cancelValid.status === 200 && cancelValid.data.ticket.status === 'CANCELLED', 'Unused booked ticket cancelled successfully', cancelValid.data);

  const eventAfterCancel = await req('GET', `/events/${mainEventId}`, null, attToken);
  assert(eventAfterCancel.data.event.registeredCount === 2, 'Event registeredCount decremented cleanly from 4 back to 2', eventAfterCancel.data);

  const paymentCheck = await req('GET', '/payments', null, attToken);
  const refundRec = paymentCheck.data.payments.find((p) => (p.refId === concurrencyTicketId || p.refId?.toString() === concurrencyTicketId) && p.type === 'TICKET');
  assert(refundRec && refundRec.status === 'REFUNDED', 'Simulated ledger payment status automatically transitioned to REFUNDED', paymentCheck.data);

  log('\n7. Testing Blackout Conflicts & Availability (Part 33 & 3)...');
  const blkConflict = await req('POST', '/blackouts', { hallId: testHallId, date: futureDate, slotId: 'morning', reason: 'MAINTENANCE' }, ownerToken);
  assert(blkConflict.status === 409, 'Owner attempting blackout on active confirmed reservation slot safely rejected with 409 Conflict', blkConflict.data);

  const blkOK = await req('POST', '/blackouts', { hallId: testHallId, date: futureDate, slotId: 'afternoon', reason: 'DEEP CLEANING', note: `${TEST_PREFIX}_BLK` }, ownerToken);
  assert(blkOK.status === 201, 'Owner created blackout on free afternoon slot', blkOK.data);
  blackoutId = blkOK.data.blackout.id || blkOK.data.blackout._id;

  const rentOnBlackout = await req('POST', '/events', {
    title: `${TEST_PREFIX} Afternoon Event`,
    description: 'Should fail due to blackout',
    category: 'TECH',
    hallId: testHallId,
    date: futureDate,
    slotId: 'afternoon',
    ticketPrice: 1000,
    maxCapacity: 5,
  }, orgToken);
  assert(rentOnBlackout.status === 409, 'Organiser attempting hall rental on blacked-out slot rejected with 409 Conflict', rentOnBlackout.data);

  const delBlk = await req('DELETE', `/blackouts/${blackoutId}`, null, ownerToken);
  assert(delBlk.status === 200, 'Owner released/deleted blackout', delBlk.data);

  const rentAfterBlk = await req('POST', '/events', {
    title: `${TEST_PREFIX} Afternoon Event`,
    description: 'Should succeed now that blackout is lifted',
    category: 'TECH',
    hallId: testHallId,
    date: futureDate,
    slotId: 'afternoon',
    ticketPrice: 1000,
    maxCapacity: 5,
  }, orgToken);
  assert(rentAfterBlk.status === 201, 'Organiser successfully rented slot immediately after blackout was removed', rentAfterBlk.data);
  afternoonEventId = rentAfterBlk.data.event.id || rentAfterBlk.data.event._id;

  log('\n8. Testing Event Force Cancellation & Atomic Ledger Reversal (Part 34 & 12)...');
  const forceCancel = await req('PATCH', `/events/${mainEventId}/cancel`, { reason: 'Emergency Complex Maintenance' }, ownerToken);
  assert(forceCancel.status === 200 && forceCancel.data.event.status === 'CANCELLED', 'Owner force cancelled published event', forceCancel.data);
  assert(forceCancel.data.event.registeredCount === 0, 'Event registeredCount zeroed out', forceCancel.data);

  const resList = await req('GET', '/reservations', null, ownerToken);
  const eventRes = resList.data.reservations.find((r) => r.eventId === mainEventId || r.eventId?.toString() === mainEventId);
  assert(eventRes && eventRes.status === 'RELEASED', 'Hall reservation automatically RELEASED', resList.data);

  const ticketList = await req('GET', '/tickets', null, ownerToken);
  const evTickets = ticketList.data.tickets.filter((t) => (t.eventId === mainEventId || t.eventId?.toString() === mainEventId) && t.status === 'CONFIRMED');
  assert(evTickets.length === 0, 'All previously confirmed tickets for cancelled event transitioned to CANCELLED', ticketList.data);

  log('\n9. Executing Complete Authorization Matrix Verification (Part 35)...');
  const authMatrix = [
    { action: 'Book Tickets', path: `/events/${afternoonEventId}/book`, method: 'POST', body: { quantity: 1 }, expected: { att: 201, org: 403, owner: 403, unauth: 401 } },
    { action: 'Create Blackout', path: '/blackouts', method: 'POST', body: { hallId: testHallId, date: futureDate, slotId: 'evening' }, expected: { att: 403, org: 403, owner: 201, unauth: 401 } },
    { action: 'Read Reservations', path: '/reservations', method: 'GET', body: null, expected: { att: 403, org: 200, owner: 200, unauth: 401 } },
  ];

  for (const item of authMatrix) {
    const resAtt = await req(item.method, item.path, item.body, attToken);
    const resOrg = await req(item.method, item.path, item.body, orgToken);
    const resOwn = await req(item.method, item.path, item.body, ownerToken);
    const resNo = await req(item.method, item.path, item.body, null);
    assert(
      resAtt.status === item.expected.att &&
      resOrg.status === item.expected.org &&
      resOwn.status === item.expected.owner &&
      resNo.status === item.expected.unauth,
      `Auth Matrix [${item.action}]: Attendee=${resAtt.status}, Organiser=${resOrg.status}, Owner=${resOwn.status}, Unauth=${resNo.status}`,
      { att: resAtt.status, org: resOrg.status, own: resOwn.status, unauth: resNo.status }
    );
  }

  log('\n10. Performing Pristine Database Cleanup (Part 37)...');
  await User.deleteMany({ _id: { $in: [ownerId, orgId, attId] } });
  await Hall.deleteMany({ _id: testHallId });
  await Event.deleteMany({ _id: { $in: [mainEventId, afternoonEventId] } });
  await Reservation.deleteMany({ hall: testHallId });
  await Blackout.deleteMany({ hall: testHallId });
  await Ticket.deleteMany({ attendee: attId });
  await Payment.deleteMany({ user: { $in: [attId, orgId] } });
  
  log('✓ Cleanup complete. Zero test residue remaining.');
  log('\n🎉 ALL MIGRATION AND CONCURRENCY TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

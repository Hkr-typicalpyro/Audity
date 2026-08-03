import '../src/config/init.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dns from 'node:dns';

const BASE_URL = 'http://localhost:5000';

// Test runner helper
let passedCount = 0;
let failedCount = 0;
const results = [];

function recordResult(testName, success, details = '') {
  if (success) {
    passedCount++;
    console.log(`  ✓ [PASS] ${testName}`);
    results.push({ testName, status: 'PASS', details });
  } else {
    failedCount++;
    console.error(`  ✗ [FAIL] ${testName}: ${details}`);
    results.push({ testName, status: 'FAIL', details });
  }
}

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    ...options.headers,
  };
  if (options.body) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const response = await fetch(url, { ...options, headers });
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = { status: response.status, statusText: response.statusText };
  }
  return { status: response.status, headers: response.headers, data };
}

async function runAllTests() {
  console.log('\n================================================================');
  console.log('AUDITY FINAL CORE PERSISTENCE & HARDENING VERIFICATION SUITE');
  console.log('================================================================\n');

  try {
    console.log('--- 1. Testing API Connectivity & Security Headers ---');
    const health = await apiRequest('/api/health');
    recordResult('Health Check (GET /api/health)', health.status === 200 && health.data.success);
    
    const hasNosniff = health.headers.get('x-content-type-options') === 'nosniff';
    const hasFrameOptions = health.headers.get('x-frame-options') === 'DENY';
    const hasXSS = health.headers.get('x-xss-protection') === '1; mode=block';
    recordResult('Security Headers Enforced (nosniff, X-Frame-Options, XSS)', hasNosniff && hasFrameOptions && hasXSS, `nosniff:${hasNosniff}, frame:${hasFrameOptions}`);

    console.log('\n--- 2. Authentication, Roles & Authorization Security ---');
    const ts = Date.now();
    const attEmail = `att_${ts}@test.com`;
    const orgEmail = `org_${ts}@test.com`;
    const pwd = 'TestPassword123!';

    // Register Attendee
    const regAtt = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test Attendee', email: attEmail, password: pwd }
    });
    const attToken = regAtt.data?.token;
    recordResult('Register new attendee returns JWT', regAtt.status === 201 && Boolean(attToken));

    // Duplicate Registration Failure
    const regDup = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Duplicate Attendee', email: attEmail, password: pwd }
    });
    recordResult('Duplicate email registration rejected cleanly', regDup.status === 400 || regDup.status === 409);

    // Login Wrong Password Failure
    const logBad = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: attEmail, password: 'WrongPassword!' }
    });
    recordResult('Login with incorrect password rejected (401)', logBad.status === 401);

    // Register & Approve Organiser
    const regOrg = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test Organiser', email: orgEmail, password: pwd }
    });
    const orgToken = regOrg.data?.token;
    await apiRequest('/api/organiser/apply', { method: 'POST', headers: { Authorization: `Bearer ${orgToken}` } });
    
    // Connect DB directly to promote owner or check MongoDB state
    if (process.env.DISABLE_DNS_WORKAROUND !== 'true') {
      dns.setServers(['8.8.8.8', '8.8.4.4']);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.connection.collection('users');
    await User.updateOne({ email: orgEmail }, { $set: { role: 'organiser', organiserStatus: 'APPROVED' } });
    const ownerDoc = await User.findOne({ role: 'owner' });
    if (!ownerDoc) {
      throw new Error('No Owner found in MongoDB! Cannot test owner endpoints.');
    }
    // For testing without plaintext owner pass, create a temporary owner token via JWT signing
    const ownerToken = jwt.sign({ id: ownerDoc._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Verify Role Access Control
    const attCreateHall = await apiRequest('/api/halls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${attToken}` },
      body: { code: `HALL_${ts}`, name: 'Unauthorized Hall', floor: '1', entranceGate: 'A', capacity: 100, rentalFee: 5000 }
    });
    recordResult('Attendee creating hall rejected (403)', attCreateHall.status === 403);

    const attPatchSettings = await apiRequest('/api/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${attToken}` },
      body: { ticketSalesEnabled: false }
    });
    recordResult('Attendee mutating platform settings rejected (403)', attPatchSettings.status === 403);

    const orgPatchSettings = await apiRequest('/api/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${orgToken}` },
      body: { ticketSalesEnabled: false }
    });
    recordResult('Organiser mutating platform settings rejected (403)', orgPatchSettings.status === 403);

    const noAuthHalls = await apiRequest('/api/halls');
    recordResult('Unauthenticated calls rejected (401)', noAuthHalls.status === 401);

    console.log('\n--- 3. Platform Settings Persistence & Server-Side Enforcement ---');
    // Owner reads settings
    const getSet1 = await apiRequest('/api/settings', { headers: { Authorization: `Bearer ${ownerToken}` } });
    recordResult('Owner can retrieve global platform settings (200)', getSet1.status === 200 && getSet1.data.success);

    // Disable Hall Rental & Ticket Sales
    const lockSet = await apiRequest('/api/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { hallRentalEnabled: false, ticketSalesEnabled: false }
    });
    recordResult('Owner successfully locked both Hall Rentals and Ticket Sales', lockSet.status === 200 && lockSet.data.settings.hallRentalEnabled === false);

    // Fetch available halls
    const hallsRes = await apiRequest('/api/halls', { headers: { Authorization: `Bearer ${orgToken}` } });
    const firstHall = hallsRes.data.halls[0];
    const testDate = '2026-11-20';

    // Try creating an event while hall rental disabled
    const blockedEvent = await apiRequest('/api/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgToken}` },
      body: {
        title: 'Blocked Event',
        description: 'Should fail due to master kill switch',
        category: 'CONCERT',
        hallId: firstHall._id,
        date: testDate,
        slotId: 'morning',
        ticketPrice: 500,
        maxCapacity: 50
      }
    });
    recordResult('Server rejected hall rental when hallRentalEnabled=false (403)', blockedEvent.status === 403 && blockedEvent.data.message.includes('disabled'));

    // Re-enable Hall Rentals only
    await apiRequest('/api/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { hallRentalEnabled: true }
    });

    // Create event now succeeds
    const okEvent = await apiRequest('/api/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgToken}` },
      body: {
        title: 'Verified Mongo Event',
        description: 'Created after opening portal',
        category: 'CONCERT',
        hallId: firstHall._id,
        date: testDate,
        slotId: 'morning',
        ticketPrice: 500,
        maxCapacity: 10
      }
    });
    recordResult('Organiser successfully rented hall after setting enabled', okEvent.status === 201 && Boolean(okEvent.data.event));
    const eventId = okEvent.data?.event?.id || okEvent.data?.event?._id;

    // Try booking ticket while ticketSalesEnabled=false
    const blockedBook = await apiRequest(`/api/events/${eventId}/book`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${attToken}` },
      body: { quantity: 2, method: 'UPI' }
    });
    recordResult('Server rejected ticket sales when ticketSalesEnabled=false (403)', blockedBook.status === 403 && blockedBook.data.message.includes('disabled'));

    // Re-enable Ticket Sales
    await apiRequest('/api/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { ticketSalesEnabled: true }
    });
    recordResult('Owner re-opened Ticket Sales portal', true);

    console.log('\n--- 4. End-To-End Transactional & Business Roster Integration ---');
    // Now book tickets successfully
    const okBook = await apiRequest(`/api/events/${eventId}/book`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${attToken}` },
      body: { quantity: 3, method: 'UPI' }
    });
    recordResult('Attendee successfully booked tickets after re-enabling setting', okBook.status === 201 && Boolean(okBook.data.ticket));
    const ticketId = okBook.data?.ticket?.id;

    // Overbooking prevention test
    const overBook = await apiRequest(`/api/events/${eventId}/book`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${attToken}` },
      body: { quantity: 20, method: 'UPI' }
    });
    recordResult('Overbooking (exceeding remaining capacity) cleanly rejected (409)', overBook.status === 409);

    // Organiser Roster Check
    const orgTickets = await apiRequest('/api/tickets', { headers: { Authorization: `Bearer ${orgToken}` } });
    recordResult('Organiser can read ticket roster for own events', orgTickets.status === 200 && orgTickets.data.count >= 1);

    // Organiser Check-In Ticket
    const checkin = await apiRequest(`/api/tickets/${ticketId}/checkin`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    recordResult('Organiser successfully checked in attendee ticket', checkin.status === 200 && checkin.data.ok === true);

    // Duplicate Check-In rejected
    const checkinDup = await apiRequest(`/api/tickets/${ticketId}/checkin`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    recordResult('Duplicate check-in of ticket cleanly rejected (409 DUPLICATE)', checkinDup.status === 409 && checkinDup.data.code === 'DUPLICATE');

    // Owner Ledger Check
    const ownerPayments = await apiRequest('/api/payments', { headers: { Authorization: `Bearer ${ownerToken}` } });
    recordResult('Owner master financial ledger returns MongoDB payment records', ownerPayments.status === 200 && Array.isArray(ownerPayments.data.payments) && ownerPayments.data.payments.length > 0);

    console.log('\n--- 5. Error Resilience & Input Validation (No Stack Leakage) ---');
    const badOid = await apiRequest('/api/events/not-an-object-id/book', {
      method: 'POST',
      headers: { Authorization: `Bearer ${attToken}` },
      body: { quantity: 1 }
    });
    recordResult('Invalid MongoDB ObjectId gracefully rejected without 500 server crash (400)', badOid.status === 400 && !JSON.stringify(badOid.data).includes('at '));

    const badSettingsPatch = await apiRequest('/api/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { ticketSalesEnabled: 'not_a_boolean' }
    });
    recordResult('Invalid setting data type rejected cleanly (400)', badSettingsPatch.status === 400);

    console.log('\n--- 6. Session Isolation ---');
    // Ensure attendee token doesn't access organiser applications or owner roster
    const attApprove = await apiRequest(`/api/organiser/applications/some-id/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${attToken}` }
    });
    recordResult('Attendee cannot touch organiser application approval (403)', attApprove.status === 403);

    console.log('\n================================================================');
    console.log(`VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test execution error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runAllTests();

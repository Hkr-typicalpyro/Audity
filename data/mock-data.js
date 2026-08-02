// Shared seed data for the Audity building complex prototype.

export const HALLS = [
  {
    id: 'hall-a',
    code: 'HALL A',
    name: 'Grand Auditorium',
    floor: 'Level 1',
    entranceGate: 'Entrance Gate 1',
    capacity: 800,
    rentalFee: 145000,
  },
  {
    id: 'hall-b',
    code: 'HALL B',
    name: 'Skyline Amphitheater',
    floor: 'Level 2',
    entranceGate: 'Entrance Gate 2',
    capacity: 450,
    rentalFee: 88000,
  },
  {
    id: 'hall-c',
    code: 'HALL C',
    name: 'Executive Tech Suite',
    floor: 'Level 3',
    entranceGate: 'Entrance Gate 3',
    capacity: 180,
    rentalFee: 42000,
  },
]

export const CATEGORIES = ['TECH', 'CULTURAL', 'CORPORATE', 'WORKSHOP']

export const TIME_SLOTS = [
  { id: 'morning', label: 'MORNING', startTime: '09:00', endTime: '12:00' },
  { id: 'afternoon', label: 'AFTERNOON', startTime: '13:00', endTime: '16:00' },
  { id: 'evening', label: 'EVENING', startTime: '17:00', endTime: '20:00' },
]

export const BLACKOUT_REASONS = ['MAINTENANCE', 'OWNER PRIVATE FUNCTION', 'DEEP CLEANING', 'OTHER']

export const CURRENT_USER = {
  id: 'usr-attendee-01',
  name: 'Ananya Rao',
  email: 'ananya.rao@mail.com',
  phone: '+91 98450 22118',
}

export const CURRENT_ORGANISER = 'Northwind Event Labs'

// Dates are generated relative to today so the prototype never looks stale.
function dayOffset(n) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export const SEED_DATES = {
  d3: dayOffset(3),
  d5: dayOffset(5),
  d8: dayOffset(8),
  d11: dayOffset(11),
  d14: dayOffset(14),
  d18: dayOffset(18),
  d21: dayOffset(21),
  d6: dayOffset(6),
  d9: dayOffset(9),
}

function hallMeta(hallId) {
  const h = HALLS.find((x) => x.id === hallId)
  return {
    hallId: h.id,
    hallCode: h.code,
    hallName: h.name,
    floor: h.floor,
    entranceGate: h.entranceGate,
  }
}

export const SEED_EVENTS = [
  {
    id: 'evt-1001',
    title: 'DevStack Summit 2026',
    description:
      'A full-day engineering summit covering distributed systems, edge runtimes and applied AI infrastructure. Includes three keynote sessions and a live architecture teardown.',
    category: 'TECH',
    date: SEED_DATES.d3,
    startTime: '09:00',
    endTime: '12:00',
    slotId: 'morning',
    ...hallMeta('hall-a'),
    maxCapacity: 800,
    registeredCount: 612,
    ticketPrice: 1499,
    organiser: 'Northwind Event Labs',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
  {
    id: 'evt-1002',
    title: 'Raag & Rhythm — Classical Night',
    description:
      'An evening of Hindustani classical performances featuring three ensembles, tabla duets and a closing collaborative jugalbandi.',
    category: 'CULTURAL',
    date: SEED_DATES.d5,
    startTime: '17:00',
    endTime: '20:00',
    slotId: 'evening',
    ...hallMeta('hall-b'),
    maxCapacity: 450,
    registeredCount: 438,
    ticketPrice: 899,
    organiser: 'Sur Sangam Collective',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
  {
    id: 'evt-1003',
    title: 'Quarterly Investor Briefing',
    description:
      'Closed-format corporate briefing with financial disclosure walkthrough, product roadmap review and a moderated analyst Q&A.',
    category: 'CORPORATE',
    date: SEED_DATES.d8,
    startTime: '13:00',
    endTime: '16:00',
    slotId: 'afternoon',
    ...hallMeta('hall-c'),
    maxCapacity: 180,
    registeredCount: 180,
    ticketPrice: 0,
    organiser: 'Meridian Capital Group',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
  {
    id: 'evt-1004',
    title: 'Hands-On Robotics Workshop',
    description:
      'Build-and-take workshop on servo control, sensor fusion and autonomous path planning. Hardware kits provided per participant.',
    category: 'WORKSHOP',
    date: SEED_DATES.d11,
    startTime: '09:00',
    endTime: '12:00',
    slotId: 'morning',
    ...hallMeta('hall-c'),
    maxCapacity: 180,
    registeredCount: 96,
    ticketPrice: 2400,
    organiser: 'Northwind Event Labs',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
  {
    id: 'evt-1005',
    title: 'Indie Film Premiere — "Monsoon Lines"',
    description:
      'Regional premiere screening followed by an on-stage director conversation and a short cast interaction segment.',
    category: 'CULTURAL',
    date: SEED_DATES.d14,
    startTime: '17:00',
    endTime: '20:00',
    slotId: 'evening',
    ...hallMeta('hall-a'),
    maxCapacity: 800,
    registeredCount: 214,
    ticketPrice: 650,
    organiser: 'Frame 24 Studios',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
  {
    id: 'evt-1006',
    title: 'Product Leadership Bootcamp',
    description:
      'Two-track intensive on discovery frameworks, roadmap negotiation and stakeholder communication for senior product managers.',
    category: 'WORKSHOP',
    date: SEED_DATES.d18,
    startTime: '13:00',
    endTime: '16:00',
    slotId: 'afternoon',
    ...hallMeta('hall-b'),
    maxCapacity: 450,
    registeredCount: 121,
    ticketPrice: 1850,
    organiser: 'Northwind Event Labs',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
  {
    id: 'evt-1007',
    title: 'Annual Partner Conclave',
    description:
      'Channel partner assembly with awards ceremony, regional performance review and a networking dinner in the west foyer.',
    category: 'CORPORATE',
    date: SEED_DATES.d21,
    startTime: '17:00',
    endTime: '20:00',
    slotId: 'evening',
    ...hallMeta('hall-a'),
    maxCapacity: 800,
    registeredCount: 340,
    ticketPrice: 1200,
    organiser: 'Vantage Systems Pvt Ltd',
    status: 'PUBLISHED',
    cancellationReason: null,
  },
]

// Hall reservations mirror seeded events (hall/date/slot locks).
export const SEED_RESERVATIONS = SEED_EVENTS.map((e, i) => ({
  id: `res-${2000 + i}`,
  hallId: e.hallId,
  hallName: e.hallName,
  date: e.date,
  slotId: e.slotId,
  eventId: e.id,
  organiser: e.organiser,
  amount: HALLS.find((h) => h.id === e.hallId).rentalFee,
  status: 'CONFIRMED',
}))

export const SEED_BLACKOUTS = [
  {
    id: 'blk-3001',
    hallId: 'hall-b',
    date: SEED_DATES.d6,
    slotId: 'morning',
    reason: 'MAINTENANCE',
    note: 'Rigging and truss inspection',
  },
  {
    id: 'blk-3002',
    hallId: 'hall-a',
    date: SEED_DATES.d9,
    slotId: 'afternoon',
    reason: 'DEEP CLEANING',
    note: 'Seat upholstery treatment',
  },
]

const attendeeNames = [
  'Ananya Rao',
  'Rohan Mehta',
  'Priya Nair',
  'Kabir Sethi',
  'Ishita Verma',
  'Arjun Pillai',
  'Meera Joshi',
  'Devansh Kapoor',
  'Sneha Iyer',
  'Vikram Chandra',
  'Tara Bhatt',
  'Nikhil Menon',
]

// Deterministic seeded roster so organiser tables look realistic.
export const SEED_TICKETS = (() => {
  const tickets = []
  const rosterPlan = [
    { eventId: 'evt-1001', count: 5 },
    { eventId: 'evt-1002', count: 3 },
    { eventId: 'evt-1004', count: 3 },
    { eventId: 'evt-1006', count: 2 },
  ]
  let seq = 0
  rosterPlan.forEach(({ eventId, count }) => {
    const event = SEED_EVENTS.find((e) => e.id === eventId)
    for (let i = 0; i < count; i++) {
      const name = attendeeNames[(seq + i) % attendeeNames.length]
      const qty = (seq + i) % 3 === 0 ? 2 : 1
      tickets.push({
        id: `AUD-${event.id.slice(-4)}-${String(1000 + seq * 7 + i).slice(-4)}`,
        eventId: event.id,
        attendeeName: name,
        attendeeEmail: `${name.toLowerCase().replace(/\s+/g, '.')}@mail.com`,
        quantity: qty,
        amount: qty * event.ticketPrice,
        bookedAt: new Date(Date.now() - (seq + i + 1) * 36e5 * 9).toISOString(),
        status: 'CONFIRMED',
        checkedIn: (seq + i) % 4 === 1,
        ownedByUser: false,
      })
    }
    seq += count
  })
  return tickets
})()

export const SEED_PAYMENTS = [
  ...SEED_RESERVATIONS.map((r, i) => ({
    id: `pay-r${i}`,
    type: 'HALL_RENTAL',
    refId: r.id,
    amount: r.amount,
    method: 'NETBANKING',
    status: 'PAID',
    createdAt: new Date(Date.now() - (i + 2) * 864e5).toISOString(),
  })),
  ...SEED_TICKETS.map((t, i) => ({
    id: `pay-t${i}`,
    type: 'TICKET',
    refId: t.id,
    amount: t.amount,
    method: 'UPI',
    status: 'PAID',
    createdAt: t.bookedAt,
  })),
]

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

async function handleResponse(response) {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong')
  }
  return data
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse(response)
}

export async function getMe(token) {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

export async function register(name, email, password, phone = '') {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, password }),
  })
  return handleResponse(response)
}

// ─── Organiser applications ────────────────────────────────────────────────

export async function applyForOrganiser(token) {
  const response = await fetch(`${API_URL}/api/organiser/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

export async function getOrganiserApplications(token) {
  const response = await fetch(`${API_URL}/api/organiser/applications`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

export async function approveOrganiserApplication(token, userId) {
  const response = await fetch(`${API_URL}/api/organiser/applications/${userId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

export async function rejectOrganiserApplication(token, userId) {
  const response = await fetch(`${API_URL}/api/organiser/applications/${userId}/reject`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

// ─── Halls ────────────────────────────────────────────────────────────────────

export async function getHalls(token) {
  const response = await fetch(`${API_URL}/api/halls`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

export async function createHall(token, hallData) {
  const response = await fetch(`${API_URL}/api/halls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(hallData),
  })
  return handleResponse(response)
}

export async function updateHall(token, hallId, hallData) {
  const response = await fetch(`${API_URL}/api/halls/${hallId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(hallData),
  })
  return handleResponse(response)
}

export async function setHallStatus(token, hallId, isActive) {
  const response = await fetch(`${API_URL}/api/halls/${hallId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isActive }),
  })
  return handleResponse(response)
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(token) {
  const response = await fetch(`${API_URL}/api/events`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

export async function getEvent(token, eventId) {
  const response = await fetch(`${API_URL}/api/events/${eventId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

export async function createEvent(token, eventData) {
  const response = await fetch(`${API_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  })
  return handleResponse(response)
}

export async function updateEvent(token, eventId, eventData) {
  const response = await fetch(`${API_URL}/api/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  })
  return handleResponse(response)
}

export async function cancelEventApi(token, eventId, reason) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  })
  return handleResponse(response)
}

// ─── Tickets & Bookings ────────────────────────────────────────────────────────

export async function getMyTickets(token) {
  const response = await fetch(`${API_URL}/api/tickets/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

export async function getTickets(token) {
  const response = await fetch(`${API_URL}/api/tickets`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

export async function bookTicketsApi(token, eventId, quantity, method) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity, method }),
  })
  return handleResponse(response)
}

export async function cancelTicketApi(token, ticketId) {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

export async function checkInTicketApi(token, ticketId) {
  const response = await fetch(`${API_URL}/api/tickets/${encodeURIComponent(ticketId)}/checkin`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
  // Return JSON body directly so UI scanner inspects { ok, code, message } cleanly
  const data = await response.json()
  return data
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export async function getReservations(token) {
  const response = await fetch(`${API_URL}/api/reservations`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

// ─── Blackouts ────────────────────────────────────────────────────────────────

export async function getBlackouts(token) {
  const response = await fetch(`${API_URL}/api/blackouts`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

export async function createBlackout(token, blackoutData) {
  const response = await fetch(`${API_URL}/api/blackouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(blackoutData),
  })
  return handleResponse(response)
}

export async function deleteBlackout(token, blackoutId) {
  const response = await fetch(`${API_URL}/api/blackouts/${blackoutId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getPayments(token) {
  const response = await fetch(`${API_URL}/api/payments`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

// ─── Platform Settings ────────────────────────────────────────────────────────

export async function getPlatformSettings(token) {
  const response = await fetch(`${API_URL}/api/settings`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(response)
}

export async function updatePlatformSettings(token, updates) {
  const response = await fetch(`${API_URL}/api/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  })
  return handleResponse(response)
}
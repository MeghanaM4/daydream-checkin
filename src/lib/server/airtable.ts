import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } from '$env/static/private';
import type { AirtableRecord, AttendeeFields, AttendeeWithEvent, EventFields } from '$lib/types';

const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

function headers() {
return {
Authorization: `Bearer ${AIRTABLE_API_KEY}`,
'Content-Type': 'application/json'
} as const;
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchJsonSafe<T = any>(url: string, init: RequestInit, attempts = 2): Promise<T | null> {
  for (let i = 0; i < attempts; i++) {
    try {
    const res = await fetch(url, { ...init, cache: 'no-store' });
    if (res.ok) return (await res.json()) as T;
    // retry only on 5xx
    if (res.status >= 500 && i < attempts - 1) await sleep(200 * (i + 1));
    else return null;
  } catch {
    if (i < attempts - 1) await sleep(200 * (i + 1));
    else return null;
  }
}
return null;
}

function encodeFilterFormula(formula: string) {
return encodeURIComponent(formula);
}

export async function getAttendeeByToken(token: string): Promise<AttendeeWithEvent | null> {
const url = `${AIRTABLE_BASE_URL}/attendees?filterByFormula=${encodeFilterFormula(`{checkin_token} = "${token}"`)}`;
const json = await fetchJsonSafe<{ records: AirtableRecord<AttendeeFields>[] }>(url, { headers: headers() }, 3);
if (!json) return null;
const rec: AirtableRecord<AttendeeFields> | undefined = json.records?.[0];
if (!rec) return null;
let event: AirtableRecord<EventFields> | null = null;
const eventId = rec.fields.event?.[0];
if (eventId) {
const evJson = await fetchJsonSafe<AirtableRecord<EventFields>>(`${AIRTABLE_BASE_URL}/events/${eventId}`, { headers: headers() }, 2);
if (evJson) event = evJson;
}
return { record: rec, event };
}

export async function getAttendeeById(id: string): Promise<AttendeeWithEvent | null> {
  const record = await fetchJsonSafe<AirtableRecord<AttendeeFields>>(`${AIRTABLE_BASE_URL}/attendees/${id}`, { headers: headers() }, 3);
  if (!record) return null;
  let event: AirtableRecord<EventFields> | null = null;
  const eventId = record.fields.event?.[0];
  if (eventId) {
    const evJson = await fetchJsonSafe<AirtableRecord<EventFields>>(`${AIRTABLE_BASE_URL}/events/${eventId}`, { headers: headers() }, 2);
    if (evJson) event = evJson;
  }
  return { record, event };
}

export async function getAttendeeByTicketId(ticketId: string): Promise<AttendeeWithEvent | null> {
  const url = `${AIRTABLE_BASE_URL}/attendees?filterByFormula=${encodeFilterFormula(`{ticket_id} = \"${ticketId}\"`)}`;
  const json = await fetchJsonSafe<{ records: AirtableRecord<AttendeeFields>[] }>(url, { headers: headers() }, 3);
  if (!json) return null;
  const rec: AirtableRecord<AttendeeFields> | undefined = json.records?.[0];
  if (!rec) return null;
  let event: AirtableRecord<EventFields> | null = null;
  const eventId = rec.fields.event?.[0];
  if (eventId) {
    const evJson = await fetchJsonSafe<AirtableRecord<EventFields>>(`${AIRTABLE_BASE_URL}/events/${eventId}`, { headers: headers() }, 2);
    if (evJson) event = evJson;
  }
  return { record: rec, event };
}

export async function validateToken(token: string): Promise<AttendeeWithEvent | null> {
  return getAttendeeByToken(token);
}

export async function updateAttendeeFields(id: string, fields: Partial<AttendeeFields>): Promise<AirtableRecord<AttendeeFields> | null> {
  const res = await fetch(`${AIRTABLE_BASE_URL}/attendees/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ fields })
  });
  if (!res.ok) return null;
  return res.json();
}

export function isUnder18(dobIso?: string | null): boolean {
  if (!dobIso) return true; // treat unknown as under 18 per spec
  const dob = new Date(dobIso);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
  return age <= 18;
}

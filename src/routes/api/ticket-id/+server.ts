import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getAttendeeByToken } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('checkin_token');
  if (!token) return json({ ok: false, message: 'Not authenticated' }, { status: 401 });
  const attendee = await getAttendeeByToken(token);
  if (!attendee) return json({ ok: false, message: 'Invalid session' }, { status: 401 });
  const f: any = attendee.record.fields;
  // Only reveal ticket_id after check-in is completed
  if (!f.checkin_completed) return json({ ok: false, message: 'Forbidden' }, { status: 403 });
  const ticket_id = f.ticket_id || '';
  if (!ticket_id) return json({ ok: false, message: 'No ticket id' }, { status: 500 });
  return json({ ok: true, ticket_id });
};

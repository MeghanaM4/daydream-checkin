import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getAttendeeByToken, updateAttendeeFields } from '$lib/server/airtable';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = cookies.get('checkin_token');
  if (!token) return json({ ok: false, message: 'Not authenticated' }, { status: 401 });
  const attendee = await getAttendeeByToken(token);
  if (!attendee) return json({ ok: false, message: 'Invalid session' }, { status: 401 });

  const { eventId } = await request.json().catch(() => ({ eventId: '' }));
  if (!eventId) return json({ ok: false, message: 'Missing eventId' }, { status: 400 });

  const updated = await updateAttendeeFields(attendee.record.id, { event: [eventId] } as any);
  if (!updated) return json({ ok: false, message: 'Failed to update event' }, { status: 500 });
  return json({ ok: true, record: updated });
};

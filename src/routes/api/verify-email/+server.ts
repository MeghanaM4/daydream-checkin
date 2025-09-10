import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getAttendeeByToken, updateAttendeeFields } from '$lib/server/airtable';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = cookies.get('checkin_token');
  if (!token) return json({ ok: false, message: 'Not authenticated' }, { status: 401 });
  const attendee = await getAttendeeByToken(token);
  if (!attendee) return json({ ok: false, message: 'Invalid session' }, { status: 401 });

  const { code } = await request.json().catch(() => ({ code: '' }));
  if (!code || String(code).length !== 6) return json({ ok: false, message: 'Invalid code' }, { status: 400 });

  const correct = attendee.record.fields.email_verification_code;
  if (code !== correct) return json({ ok: false, message: 'Incorrect code' }, { status: 400 });

  await updateAttendeeFields(attendee.record.id, { email_verified: true, email_verification_code: '' });
  return json({ ok: true });
};

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getAttendeeByToken, updateAttendeeFields } from '$lib/server/airtable';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { access_token, state } = await request.json().catch(() => ({ access_token: '', state: '' }));
  const cookieToken = cookies.get('checkin_token') || '';
  if (!access_token || !state || state !== cookieToken) return json({ ok: false, message: 'Invalid state' }, { status: 400 });

  const meRes = await fetch('https://itch.io/api/1/key/me', {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  if (!meRes.ok) return json({ ok: false, message: 'Failed to fetch profile' }, { status: 500 });
  const me = await meRes.json();
  const username = me?.user?.username as string | undefined;
  if (!username) return json({ ok: false, message: 'No username' }, { status: 500 });

  const attendee = await getAttendeeByToken(cookieToken);
  if (attendee) {
    await updateAttendeeFields(attendee.record.id, { itch_username: username });
    const { dev } = await import('$app/environment');
    cookies.set('oauth_connected', 'itch', {
      httpOnly: false,
      secure: !dev,
      sameSite: 'lax',
      path: '/',
      maxAge: 60
    });
    const step = cookies.get('oauth_step');
    if (step) cookies.set('checkin_step', step, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    cookies.set('oauth_step', '', { path: '/', maxAge: 0 });
  }
  return json({ ok: true });
};

import type { RequestHandler } from './$types';
import { json, redirect } from '@sveltejs/kit';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';
import { PUBLIC_BASE_URL } from '$env/static/public';
import { getAttendeeByToken, updateAttendeeFields } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const stateCookie = cookies.get('oauth_state') || '';
  if (!code || !state || state !== stateCookie) {
    return json({ ok: false, message: 'Invalid OAuth state' }, { status: 400 });
  }
  // clear oauth_state cookie
  cookies.set('oauth_state', '', { path: '/', maxAge: 0 });
  
  // restore step if present
  const step = cookies.get('oauth_step');
  if (step) cookies.set('checkin_step', step, { path: '/', maxAge: 60 * 60 * 24 * 30 });
  cookies.set('oauth_step', '', { path: '/', maxAge: 0 });
 
  // exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: `${url.origin}/auth/github/callback`
    })
  });
  if (!tokenRes.ok) return json({ ok: false, message: 'Token exchange failed' }, { status: 500 });
  const tokenJson = await tokenRes.json();
  const access_token = tokenJson.access_token as string | undefined;
  if (!access_token) return json({ ok: false, message: 'No access token' }, { status: 500 });

  // fetch username
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'daydream-checkin' }
  });
  if (!userRes.ok) return json({ ok: false, message: 'Failed to fetch user' }, { status: 500 });
  const user = await userRes.json();
  const username: string | undefined = user.login;
  if (!username) return json({ ok: false, message: 'No username' }, { status: 500 });

  const attendee = await getAttendeeByToken(state);
  if (attendee) {
  await updateAttendeeFields(attendee.record.id, { github_username: username });
    // Ensure session cookie persists after cross-site OAuth
     const { dev } = await import('$app/environment');
    cookies.set('checkin_token', state, {
      httpOnly: true,
      secure: !dev,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });
    // signal client to show toast
    cookies.set('oauth_connected', 'github', {
      httpOnly: false,
      secure: !dev,
      sameSite: 'lax',
      path: '/',
      maxAge: 60
    });
  }
 
  throw redirect(302, '/checkin');
};

import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { ITCH_CLIENT_ID } from '$env/static/private';
import { PUBLIC_BASE_URL } from '$env/static/public';

export const GET: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('checkin_token');
  if (!token) throw redirect(302, '/checkin');
  const { dev } = await import('$app/environment');
  const step = cookies.get('checkin_step') || '';
  cookies.set('oauth_step', step, {
    httpOnly: true,
    secure: !dev,
    sameSite: 'lax',
    path: '/',
    maxAge: 600
  });
  const params = new URLSearchParams({
    client_id: ITCH_CLIENT_ID,
    scope: 'profile:me',
    redirect_uri: `${PUBLIC_BASE_URL}/auth/itch/callback`,
    state: token,
    response_type: 'token'
  });
  throw redirect(302, `https://itch.io/user/oauth?${params.toString()}`);
};

import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { GITHUB_CLIENT_ID } from '$env/static/private';
import { PUBLIC_BASE_URL } from '$env/static/public';

export const GET: RequestHandler = async ({ cookies, url }) => {
  const token = cookies.get('checkin_token');
  if (!token) {
    // redirect to /checkin to ensure they start flow
    throw redirect(302, '/checkin');
  }
  // Set a temporary OAuth state cookie with lax same-site so it returns on the GitHub → callback top-level navigation
  cookies.set('oauth_state', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600
  });

  const origin = url.origin;
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${origin}/auth/github/callback`,
    scope: 'read:user',
    state: token
  });
  throw redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`);
};

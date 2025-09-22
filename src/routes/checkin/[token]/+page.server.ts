import type { PageServerLoad } from './$types';
import { validateToken } from '$lib/server/airtable';
import { redirect, error } from '@sveltejs/kit';
import { dev } from '$app/environment';

const COOKIE_NAME = 'checkin_token';

export const load: PageServerLoad = async ({ params, cookies, url }) => {
  const token = params.token;
  if (!token) throw error(400, 'Missing token');
  const result = await validateToken(token);
  if (!result) {
    throw error(404, 'Invalid or expired check-in link');
  }

  // If switching users (different token than existing), clear any persisted step
  const prev = cookies.get(COOKIE_NAME);
  if (prev && prev !== token) {
    cookies.set('checkin_step', '', { path: '/', maxAge: 0 });
  }

  // store token in secure cookie
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: !dev,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
  // do not redirect here; let client replaceState navigate to avoid token in history
  return { ok: true } as any;
};

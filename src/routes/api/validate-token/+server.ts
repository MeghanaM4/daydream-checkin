import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { validateToken } from '$lib/server/airtable';

export const POST: RequestHandler = async ({ request }) => {
  const { token } = await request.json().catch(() => ({ token: '' }));
  if (!token) return json({ ok: false, message: 'Missing token' }, { status: 400 });
  const data = await validateToken(token);
  if (!data) return json({ ok: false, message: 'Invalid token' }, { status: 404 });
  return json({ ok: true });
};

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getAttendeeByToken, updateAttendeeFields } from '$lib/server/airtable';
import { env } from '$env/dynamic/private';

// Configure default API base if not provided
const API_BASE = env.DOCUSEAL_API_BASE || 'https://api.docuseal.co';

export const POST: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('checkin_token');
  if (!token) return json({ ok: false, message: 'Not authenticated' }, { status: 401 });
  const attendee = await getAttendeeByToken(token);
  if (!attendee) return json({ ok: false, message: 'Invalid session' }, { status: 401 });

  if (!env.DOCUSEAL_API_KEY) {
    // Fallback: mark waiver completed without external verification
    await updateAttendeeFields(attendee.record.id, { waiver_completed: true } as any);
    return json({ ok: true, completed: true });
  }

  const email = attendee.record.fields.email;
  if (!email) return json({ ok: false, message: 'Missing attendee email' }, { status: 400 });

  try {
    // NOTE: Adjust endpoint/filters to your DocuSeal API. This assumes a submissions list supporting email query.
    const url = `${API_BASE}/api/submissions?email=${encodeURIComponent(email)}&status=completed`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${env.DOCUSEAL_API_KEY}` }
    });
    if (!resp.ok) {
      const detail = await resp.text();
      return json({ ok: false, message: 'DocuSeal lookup failed', detail }, { status: 502 });
    }
    const data = await resp.json();
    const completed = Array.isArray(data?.submissions) ? data.submissions.length > 0 : !!data?.count;

    if (completed) {
      await updateAttendeeFields(attendee.record.id, { waiver_completed: true } as any);
      return json({ ok: true, completed: true });
    }
    return json({ ok: true, completed: false });
  } catch (e: any) {
    return json({ ok: false, message: 'Verification error', detail: String(e?.message || e) }, { status: 500 });
  }
};

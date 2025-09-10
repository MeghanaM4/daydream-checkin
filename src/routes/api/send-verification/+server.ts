import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { LOOPS_API_KEY, LOOPS_VERIFICATION_TRANSACTIONAL_ID, AIRTABLE_API_KEY, AIRTABLE_BASE_ID } from '$env/static/private';
import { getAttendeeByToken } from '$lib/server/airtable';

function generateVerificationCode(): string {
return Math.floor(100000 + Math.random() * 900000).toString();
}

export const POST: RequestHandler = async ({ cookies }) => {
const token = cookies.get('checkin_token');
if (!token) return json({ ok: false, message: 'Not authenticated' }, { status: 401 });
const attendee = await getAttendeeByToken(token);
if (!attendee) return json({ ok: false, message: 'Invalid session' }, { status: 401 });
const email = attendee.record.fields.email;
if (!email) return json({ ok: false, message: 'No email on file' }, { status: 400 });

const code = generateVerificationCode();

// Store the code in Airtable with a direct PATCH (capture detailed errors)
const atUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/attendees/${attendee.record.id}`;
const atResp = await fetch(atUrl, {
method: 'PATCH',
headers: {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json'
  },
   body: JSON.stringify({ fields: { email_verification_code: code, email_verified: false } })
});
if (!atResp.ok) {
const detail = await atResp.text();
return json({ ok: false, message: 'Failed to set verification code', detail }, { status: 500 });
}

// Send transactional email with the code
const res = await fetch('https://app.loops.so/api/v1/transactional', {
method: 'POST',
headers: {
Authorization: `Bearer ${LOOPS_API_KEY}`,
  'Content-Type': 'application/json'
  },
    body: JSON.stringify({
    email,
  transactionalId: LOOPS_VERIFICATION_TRANSACTIONAL_ID,
  addToAudience: false,
    dataVariables: {
      code,
      preferred_name: attendee.record.fields.preferred_name || attendee.record.fields.first_name || '',
      last_name: attendee.record.fields.last_name || ''
    }
    })
});

  if (!res.ok) {
    const text = await res.text();
    return json({ ok: false, message: 'Failed to send email', detail: text }, { status: 500 });
  }

  return json({ ok: true });
};

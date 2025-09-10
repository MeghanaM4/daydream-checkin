import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getAttendeeByToken, updateAttendeeFields } from '$lib/server/airtable';
import { LOOPS_API_KEY, LOOPS_TICKET_TRANSACTIONAL_ID } from '$env/static/private';
import { PUBLIC_BASE_URL } from '$env/static/public';

export const POST: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('checkin_token');
  if (!token) return json({ ok: false, message: 'Not authenticated' }, { status: 401 });
  const attendee = await getAttendeeByToken(token);
  if (!attendee) return json({ ok: false, message: 'Invalid session' }, { status: 401 });

  const alreadyCompleted = !!attendee.record.fields.checkin_completed;
  const alreadyTicketSent = !!(attendee.record.fields as any).ticket_email_sent;
  if (!alreadyCompleted) {
    await updateAttendeeFields(attendee.record.id, { checkin_completed: true });
  }

  // Send ticket email only once per attendee
  if (!alreadyTicketSent) {
    const email = attendee.record.fields.email;
    if (email && LOOPS_TICKET_TRANSACTIONAL_ID) {
      const preferred_name = attendee.record.fields.preferred_name || attendee.record.fields.first_name || '';
      const last_name = attendee.record.fields.last_name || '';
      const event = attendee.event?.fields.event_name || '';
      const id = attendee.record.id;
      const ticket_url = `${PUBLIC_BASE_URL}/ticket/${encodeURIComponent(id)}`;
      const resp = await fetch('https://app.loops.so/api/v1/transactional', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOOPS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          transactionalId: LOOPS_TICKET_TRANSACTIONAL_ID,
          addToAudience: false,
          dataVariables: { preferred_name, last_name, event, id, ticket_url }
        })
      }).catch(() => null);
      if (resp && resp.ok) {
        await updateAttendeeFields(attendee.record.id, { ticket_email_sent: true });
      }
    }
  }

  return json({ ok: true });
};

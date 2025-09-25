import type { PageServerLoad } from './$types';
import { getAttendeeByTicketId } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ params }) => {
  const id = params.id; // this is the public ticket_id
  if (!id) return { ticket: null, notFound: true } as any;
  const attendee = await getAttendeeByTicketId(id);
  if (!attendee) return { ticket: null, notFound: true } as any;

  const f = attendee.record.fields as any;
  const e = attendee.event?.fields as any;

  const ticket = {
    id,
    name: `${f?.preferred_name || f?.first_name || ''}${f?.last_name ? ` ${f.last_name}` : ''}`.trim(),
    email: f?.email || '',
    eventName: e?.event_name || 'Daydream',
    eventDateIso: e?.start_date || null
  };

  return { ticket };
};

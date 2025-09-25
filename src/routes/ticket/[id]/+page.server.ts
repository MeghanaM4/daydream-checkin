import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getAttendeeById } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ params }) => {
  const id = params.id;
  if (!id) throw error(400, 'Missing ticket id');
  const attendee = await getAttendeeById(id);
  if (!attendee) throw error(404, 'Ticket not found');

  const f = attendee.record.fields as any;
  const e = attendee.event?.fields as any;

  const ticket = {
    id: attendee.record.id,
    name: `${f?.preferred_name || f?.first_name || ''}${f?.last_name ? ` ${f.last_name}` : ''}`.trim(),
    email: f?.email || '',
    eventName: e?.event_name || 'Daydream',
    eventDateIso: e?.start_date || null
  };

  return { ticket };
};

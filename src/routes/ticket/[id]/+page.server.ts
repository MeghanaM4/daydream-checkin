import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getAttendeeById } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ params }) => {
  const id = params.id;
  if (!id) throw error(400, 'Missing ticket id');
  const attendee = await getAttendeeById(id);
  if (!attendee) throw error(404, 'Ticket not found');
  return { attendee };
};

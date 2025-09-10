import type { LayoutServerLoad } from './$types';
import { getAttendeeByToken } from '$lib/server/airtable';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const token = cookies.get('checkin_token');
  if (!token) {
    return { attendee: null };
  }
  const data = await getAttendeeByToken(token);
  return { attendee: data };
};

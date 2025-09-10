import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } from '$env/static/private';
import { updateAttendeeFields, getAttendeeByToken, isUnder18 } from '$lib/server/airtable';
import type { AttendeeFields, Pronouns, ShirtSize } from '$lib/types';

function bad(msg: string, issues?: Record<string, string>) {
  return json({ ok: false, message: msg, issues }, { status: 400 });
}

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = cookies.get('checkin_token');
  if (!token) return bad('Not authenticated');
  const attendee = await getAttendeeByToken(token);
  if (!attendee) return bad('Invalid session');

  const body = await request.json().catch(() => ({}));
  const section = body.section as 'info' | 'additional' | 'waiver' | 'attendance' | 'accounts' | 'email';
  const data = (body.data as Partial<AttendeeFields>) ?? {};
  const finalize = !!body.finalize;
  if (!section) return bad('Invalid payload');

  const issues: Record<string, string> = {};
  const toUpdate: Partial<AttendeeFields> = {};

  if (section === 'info') {
    // Required fields and basic validation
    const required = ['first_name','last_name','email','phone','dob','address_1','city','state','country','zip_code'] as const;
    if (finalize) {
      for (const k of required) {
        const v = (data as any)[k];
        if (!v || String(v).trim() === '') issues[k] = 'Required';
      }
    }
    if (data.email && !/^\S+@\S+\.[\w-]+$/.test(data.email)) issues.email = 'Invalid email';
    if (data.phone && !/^[+\d][\d\-()\s]{7,}$/.test(data.phone)) issues.phone = 'Invalid phone';
    if (data.dob && !isUnder18(data.dob)) issues.dob = 'Must be 18 or under';

    if (Object.keys(issues).length) return bad('Validation failed', issues);

    Object.assign(toUpdate, {
      first_name: data.first_name,
      last_name: data.last_name,
      preferred_name: data.preferred_name,
      email: data.email,
      phone: data.phone,
      dob: data.dob,
      address_1: data.address_1,
      address_2: data.address_2,
      city: data.city,
      state: data.state,
      country: data.country,
      zip_code: data.zip_code
    });
  } else if (section === 'additional') {
    // pronouns optional; if provided must be an array of allowed options
    if (data.pronouns !== undefined) {
      const arr = Array.isArray(data.pronouns) ? (data.pronouns as Pronouns[]) : [];
      const allowed: Pronouns[] = ['he / him','she / her','they / them or other'];
      for (const p of arr) if (!allowed.includes(p)) issues.pronouns = 'Invalid option';
    }
    const ec1 = ['emergency_contact_1_name','emergency_contact_1_phone','emergency_contact_1_relationship'] as const;
    const ec2 = ['emergency_contact_2_name','emergency_contact_2_phone','emergency_contact_2_relationship'] as const;
    if (finalize) {
      for (const k of [...ec1, ...ec2]) {
        const v = (data as any)[k];
        if (!v || String(v).trim() === '') issues[k] = 'Required';
      }
      if (!data.shirt_size || !['S','M','L','XL'].includes(data.shirt_size as ShirtSize)) issues.shirt_size = 'Required';
    }
    if (data.emergency_contact_1_phone && !/^[+\d][\d\-()\s]{7,}$/.test(data.emergency_contact_1_phone)) issues.emergency_contact_1_phone = 'Invalid phone';
    if (data.emergency_contact_2_phone && !/^[+\d][\d\-()\s]{7,}$/.test(data.emergency_contact_2_phone)) issues.emergency_contact_2_phone = 'Invalid phone';

    if (finalize && Object.keys(issues).length) return bad('Validation failed', issues);

    const allowedSizes: ShirtSize[] = ['S','M','L','XL'];
    Object.assign(toUpdate, {
      pronouns: (Array.isArray(data.pronouns) ? data.pronouns : undefined) as any,
      emergency_contact_1_name: data.emergency_contact_1_name,
      emergency_contact_1_phone: data.emergency_contact_1_phone,
      emergency_contact_1_relationship: data.emergency_contact_1_relationship,
      emergency_contact_2_name: data.emergency_contact_2_name,
      emergency_contact_2_phone: data.emergency_contact_2_phone,
      emergency_contact_2_relationship: data.emergency_contact_2_relationship,
      // Only persist a valid, non-empty shirt size; treat default "Select"/empty as not provided
      shirt_size: allowedSizes.includes(data.shirt_size as ShirtSize) ? (data.shirt_size as ShirtSize) : undefined,
      dietary_restrictions: data.dietary_restrictions ?? '',
      additional_accommodations: data.additional_accommodations ?? ''
    });
  } else if (section === 'accounts') {
    // just allow clearing or setting usernames
    if (data.github_username !== undefined) toUpdate.github_username = data.github_username?.trim() || '';
    if (data.itch_username !== undefined) toUpdate.itch_username = data.itch_username?.trim() || '';
    // validate required both connected only on finalize
    if (finalize) {
      if (!toUpdate.github_username && !attendee.record.fields.github_username) issues.github_username = 'GitHub required';
      if (!toUpdate.itch_username && !attendee.record.fields.itch_username) issues.itch_username = 'Itch.io required';
      if (Object.keys(issues).length) return bad('Validation failed', issues);
    }
  } else if (section === 'attendance') {
    if (finalize && !(data as any).attendance_confirmation) return bad('Validation failed', { attendance_confirmation: 'Required' });
    Object.assign(toUpdate, { dummy_checkin_attendance_confirmation: !!(data as any).attendance_confirmation } as any);
  } else if (section === 'waiver') {
    // placeholder: no-op for now
  } else if (section === 'email') {
    // nothing to update here directly
  } else {
    return bad('Unknown section');
  }

  if (!Object.keys(toUpdate).length) {
    return json({ ok: true, record: attendee.record });
  }

  // Perform PATCH with detailed error capture
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/attendees/${attendee.record.id}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: toUpdate })
  });
  if (!resp.ok) {
    const detail = await resp.text();
    return json({ ok: false, message: 'Failed to update record', detail }, { status: 500 });
  }
  const updated = (await resp.json()) as any;
  return json({ ok: true, record: updated });
};

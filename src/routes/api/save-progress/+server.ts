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
  const section = body.section as 'info' | 'additional' | 'waiver' | 'attendance' | 'accounts' | 'review' | 'email';
  const data = (body.data as Partial<AttendeeFields>) ?? {};
  const finalize = !!body.finalize;
  if (!section) return bad('Invalid payload');

  // Do not allow further edits after completion
  if (attendee.record.fields.checkin_completed) {
    return bad('Check-in already completed');
  }
 
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
    if (data.phone) {
      const d = String(data.phone || '').replace(/\D/g, '');
      if (d.length < 10 || d.length > 15) issues.phone = 'Invalid phone';
    }
    // Volunteers may be over 18; no age restriction on DOB

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
    if (finalize) {
      for (const k of [...ec1]) {
        const v = (data as any)[k];
        if (!v || String(v).trim() === '') issues[k] = 'Required';
      }
      if (!data.shirt_size || !['S','M','L','XL'].includes(data.shirt_size as ShirtSize)) issues.shirt_size = 'Required';
    }
    if (data.emergency_contact_1_phone) {
      const d1 = String(data.emergency_contact_1_phone || '').replace(/\D/g, '');
      if (d1.length < 10 || d1.length > 15) issues.emergency_contact_1_phone = 'Invalid phone';
    }
    if (data.emergency_contact_2_phone) {
      const d2 = String(data.emergency_contact_2_phone || '').replace(/\D/g, '');
      if (d2.length && (d2.length < 10 || d2.length > 15)) issues.emergency_contact_2_phone = 'Invalid phone';
    }

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
    // allow setting or leaving usernames empty (optional step)
    if (data.github_username !== undefined) toUpdate.github_username = data.github_username?.trim() || '';
    if (data.itch_username !== undefined) toUpdate.itch_username = data.itch_username?.trim() || '';
    // no finalize requirements — accounts are optional
  } else if (section === 'attendance') {
    if (finalize && !(data as any).attendance_confirmation) return bad('Validation failed', { attendance_confirmation: 'Required' });
    Object.assign(toUpdate, { dummy_checkin_attendance_confirmation: !!(data as any).attendance_confirmation } as any);
  } else if (section === 'waiver') {
    // placeholder: no-op for now
  } else if (section === 'review') {
    // enforce waiver completion before proceeding from review when finalizing
    if (finalize) {
      const f: any = attendee.record.fields;
      if (!f.waiver_completed) {
        return bad('Validation failed', { waiver: 'Required' });
      }
    }
  } else if (section === 'email') {
    // nothing to update here directly
  } else {
    return bad('Unknown section');
  }

  if (!Object.keys(toUpdate).length) {
    return json({ ok: true });
  }

  // Perform PATCH; do not echo updated records back to the client
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
    // Avoid leaking upstream error bodies
    return json({ ok: false, message: 'Failed to update record' }, { status: 500 });
  }
  // Swallow body; minimal success response
  return json({ ok: true });
};

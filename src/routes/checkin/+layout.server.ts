import type { LayoutServerLoad } from './$types';
import { getAttendeeByToken } from '$lib/server/airtable';
import { redirect } from '@sveltejs/kit';

import { PUBLIC_DOCUSEAL_EMBED_URL, PUBLIC_BASE_URL } from '$env/static/public';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const token = cookies.get('checkin_token');
  if (!token) {
    return { attendee: null, docusealUrl: PUBLIC_DOCUSEAL_EMBED_URL, baseUrl: PUBLIC_BASE_URL } as any;
  }
  const data = await getAttendeeByToken(token);


  let initialStep: 'info' | 'additional' | 'waiver' | 'attendance' | 'accounts' | 'review' | 'complete' = 'info';
  if (data?.record?.fields) {
    const f: any = data.record.fields;
    const nonEmpty = (v?: any) => !!(v && String(v).trim());
    const emailOk = (e?: string) => !!(e && /\S+@\S+\.[\w-]+/.test(e));
    const phoneOk = (p?: string) => {
      const d = String(p || '').replace(/\D/g, '');
      return d.length >= 10 && d.length <= 12;
    };
    const infoComplete = nonEmpty(f.first_name) && nonEmpty(f.last_name) && emailOk(f.email) && phoneOk(f.phone) && nonEmpty(f.dob) && nonEmpty(f.address_1) && nonEmpty(f.city) && nonEmpty(f.state) && nonEmpty(f.country) && nonEmpty(f.zip_code);
    const sizeOk = ['S','M','L','XL'].includes(String(f.shirt_size || ''));
    const ec1Ok = nonEmpty(f.emergency_contact_1_name) && phoneOk(f.emergency_contact_1_phone) && nonEmpty(f.emergency_contact_1_relationship);
    const additionalComplete = sizeOk && ec1Ok;
    const accountsComplete = nonEmpty(f.github_username) && nonEmpty(f.itch_username);
    const waiverDone = !!f.waiver_completed;
    const completed = !!f.checkin_completed;

    initialStep = (!infoComplete) ? 'info'
      : (!additionalComplete) ? 'additional'
      : (!accountsComplete) ? 'accounts'
      : (!waiverDone) ? 'waiver'
      : (!completed) ? 'review'
      : 'complete';

    const ck = cookies.get('checkin_step');
    const allowed = ['info','additional','waiver','accounts','review','complete'];
    // If already completed, force 'complete' regardless of cookie. Otherwise honor cookie when valid.
    if (completed) initialStep = 'complete';
    else if (ck && allowed.includes(ck)) initialStep = ck as any;
  }

  // Prefer event-specific waiver link when available
  const docusealUrl = (data?.event?.fields?.event_waiver_link && String(data.event.fields.event_waiver_link).trim())
    ? String(data.event.fields.event_waiver_link)
    : PUBLIC_DOCUSEAL_EMBED_URL;

  return { attendee: data, initialStep, docusealUrl, baseUrl: PUBLIC_BASE_URL } as any;
};

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } from '$env/static/private';

export const GET: RequestHandler = async () => {
  const filter = encodeURIComponent("{triage_status} = 'Approved'");
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/events?filterByFormula=${filter}&fields[]=event_name&fields[]=start_date&fields[]=location&fields[]=event_format&fields[]=triage_status&sort[0][field]=event_name&sort[0][direction]=asc`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    const text = await res.text();
    return json({ ok: false, message: 'Failed to fetch events', detail: text }, { status: 500 });
  }
  const data = await res.json();
  const records = (data?.records || []).filter((r: any) => (r.fields?.triage_status || '') === 'Approved');
  const events = records.map((r: any) => ({
    id: r.id,
    name: r.fields?.event_name || 'Untitled',
    date: r.fields?.start_date || '',
    location: r.fields?.location || '',
    format: r.fields?.event_format || ''
  }));
  return json({ ok: true, events });
};

export type ShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type Pronouns = 'he / him' | 'she / her' | 'they / them or other';

export interface AttendeeFields {
  checkin_token: string;
  checkin_completed?: boolean;
  event: string[]; // linked record ids
  email: string;
  preferred_name?: string;
  first_name?: string;
  last_name?: string;
  dob?: string; // ISO date
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  phone?: string;
  
  github_username?: string;
  itch_username?: string;

  emergency_contact_1_name?: string;
  emergency_contact_1_phone?: string;
  emergency_contact_1_relationship?: string;
  emergency_contact_2_name?: string;
  emergency_contact_2_phone?: string;
  emergency_contact_2_relationship?: string;

  dietary_restrictions?: string;
  shirt_size?: ShirtSize;
  dummy_checkin_attendance_confirmation?: boolean;
  additional_accommodations?: string;
  
  email_verification_code?: string;
  
  ticket_email_sent?: boolean;
  
  // Waiver
   waiver_completed?: boolean;
  
  pronouns?: Pronouns[]; // multi-select of allowed values
 }

export interface AirtableRecord<T> {
  id: string;
  fields: T;
}

export interface EventFields {
  event_name: string;
  event_format: string; // e.g. "2-day", "24 hours"
  start_date: string; // ISO date
  location: string; // city/venue
  event_waiver_link?: string; // optional DocuSeal or external waiver URL
}

export interface AttendeeWithEvent {
  record: AirtableRecord<AttendeeFields>;
  event?: AirtableRecord<EventFields> | null;
}

export type SectionKey = 'info' | 'additional' | 'accounts' | 'email' | 'complete';

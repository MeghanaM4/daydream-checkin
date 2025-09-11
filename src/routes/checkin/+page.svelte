<script lang="ts">
  import EventCard from '$lib/components/EventCard.svelte';
  import Section from '$lib/components/SectionShell.svelte';
  import SaveIndicator from '$lib/components/SaveIndicator.svelte';
  import Progress from '$lib/components/ProgressIndicator.svelte';
  import Button from '$lib/components/Button.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import type { AttendeeFields } from '$lib/types';

  let { data } = $props();
  const attendee = data?.attendee;
  const fields: AttendeeFields = attendee?.record?.fields ?? {} as any;

  const inputClass = 'rounded-md border border-[color:var(--color-border-tan)] bg-white/70 px-3 py-2';
  function sizeWord(s?: string) {
    if (!s) return '—';
    return s === 'S' ? 'Small' : s === 'M' ? 'Medium' : s === 'L' ? 'Large' : s === 'XL' ? 'Extra Large' : s;
  }
  function formatPhone(p?: string) {
    const d = (p || '').replace(/\D/g, '');
    if (!d) return '—';
    if (d.length <= 10) {
      if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
      return d; // short/unexpected
    }
    const ccLen = d.length - 10;
    const cc = d.slice(0, ccLen);
    const rest = d.slice(ccLen);
    return `+${cc} (${rest.slice(0,3)}) ${rest.slice(3,6)}-${rest.slice(6)}`;
  }

  let current = $state<'info' | 'additional' | 'waiver' | 'attendance' | 'accounts' | 'review' | 'email' | 'complete'>('info');
  const steps = [
    { key: 'info', label: 'Verify info' },
    { key: 'additional', label: 'Additional info' },
    { key: 'waiver', label: 'Waiver' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'accounts', label: 'Accounts' },
    { key: 'email', label: 'Email verification' },
    { key: 'review', label: 'Review' },
    { key: 'complete', label: 'Complete' }
  ];

  // Local form state (start from server fields)
  let info = {
    first_name: fields.first_name || '',
    last_name: fields.last_name || '',
    preferred_name: fields.preferred_name || '',
    email: fields.email || '',
    phone: fields.phone || '',
    dob: fields.dob || '',
    address_1: fields.address_1 || '',
    address_2: fields.address_2 || '',
    city: fields.city || '',
    state: fields.state || '',
    country: fields.country || '',
    zip_code: fields.zip_code || ''
  };

  let additional = {
    pronouns: Array.isArray((fields as any).pronouns) ? (fields as any).pronouns : [],
    emergency_contact_1_name: fields.emergency_contact_1_name || '',
    emergency_contact_1_phone: fields.emergency_contact_1_phone || '',
    emergency_contact_1_relationship: fields.emergency_contact_1_relationship || '',
    emergency_contact_2_name: fields.emergency_contact_2_name || '',
    emergency_contact_2_phone: fields.emergency_contact_2_phone || '',
    emergency_contact_2_relationship: fields.emergency_contact_2_relationship || '',
    shirt_size: fields.shirt_size || '',
    dietary_restrictions: fields.dietary_restrictions || '',
    additional_accommodations: fields.additional_accommodations || '',
    attendance_confirmation: !!fields.dummy_checkin_attendance_confirmation
  };

  function togglePronoun(v: 'he / him' | 'she / her' | 'they / them or other') {
    const set = new Set(additional.pronouns);
    if (set.has(v)) set.delete(v); else set.add(v);
    additional.pronouns = Array.from(set);
    save('additional', additional);
  }

  let accounts = {
    github_username: fields.github_username || '',
    itch_username: fields.itch_username || ''
  };

  // inline validation errors
  let infoErrors = $state<{
    phone?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    dob?: string;
    address_1?: string;
    city?: string;
    state?: string;
    country?: string;
    zip_code?: string;
  }>({});
  let additionalErrors = $state<{
    emergency_contact_1_name?: string;
    emergency_contact_1_phone?: string;
    emergency_contact_1_relationship?: string;
    emergency_contact_2_name?: string;
    emergency_contact_2_phone?: string;
    emergency_contact_2_relationship?: string;
    shirt_size?: string;
  }>({});

  let email = {
    code: ''
  };
  let emailError = $state<string | undefined>(undefined);
  let emailSent = $state<boolean>(false);

  let saveIndicatorRef: any;
  let savingTimeout: any;
  function showSaving() { saveIndicatorRef?.setState('saving'); }
  function showSaved() { saveIndicatorRef?.setState('saved'); setTimeout(()=> saveIndicatorRef?.setState('idle'), 1500); }
  function showError() { saveIndicatorRef?.setState('error'); }

  let pendingSaves = $state(0);
  function incPending() { pendingSaves++; }
  function decPending() { pendingSaves = Math.max(0, pendingSaves - 1); }

  async function save(section: 'info'|'additional'|'accounts', data: any) {
    clearTimeout(savingTimeout);
    savingTimeout = setTimeout(async () => {
      // client-side phone normalization and inline errors for autosave
      if (section === 'info') {
        const n = normalizedPhoneOrNull(info.phone);
        if (!n) {
          infoErrors.phone = 'Invalid phone number';
          return; // do not call server
        } else {
          infoErrors.phone = undefined;
          info.phone = n;
        }
      }
      if (section === 'additional') {
        const n1 = normalizedPhoneOrNull(additional.emergency_contact_1_phone);
        const n2 = normalizedPhoneOrNull(additional.emergency_contact_2_phone);

        // set errors for both, but don't call server if any invalid
        let anyInvalid = false;
        if (additional.emergency_contact_1_phone && !n1) {
          additionalErrors.emergency_contact_1_phone = 'Invalid phone';
          anyInvalid = true;
        } else {
          additionalErrors.emergency_contact_1_phone = undefined;
        }
        if (additional.emergency_contact_2_phone && !n2) {
          additionalErrors.emergency_contact_2_phone = 'Invalid phone';
          anyInvalid = true;
        } else {
          additionalErrors.emergency_contact_2_phone = undefined;
        }
        if (anyInvalid) return;

        if (n1) additional.emergency_contact_1_phone = n1;
        if (n2) additional.emergency_contact_2_phone = n2;
      }

      let retried = false;
      async function attempt() {
        if (!retried) { incPending(); }
        showSaving();
        const res = await fetch('/api/save-progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section, data }) });
        if (res.ok) {
          showSaved();
          decPending();
        } else {
          let retryable = true;
          try {
            const err = await res.json();
            saveIndicatorRef?.setMessage(err?.message || 'Save failed');
            // don't retry validation errors
            if (err?.message === 'Validation failed' || err?.issues) retryable = false;
            console.error('Save failed (autosave)', err);
          } catch (e) {
            console.error('Save failed (autosave, no JSON)', e);
          }
          saveIndicatorRef?.setState('error');
          if (!retried && retryable) {
            retried = true;
            setTimeout(attempt, 3000);
          } else {
            decPending();
          }
        }
      }
      attempt();
    }, 800);
  }

  function digitsOnly(p: string) { return (p || '').replace(/\D/g, ''); }
  function normalizedPhoneOrNull(p?: string) {
    const d = digitsOnly(p || '');
    return d.length >= 10 && d.length <= 12 ? d : null;
  }
  function isValidPhone(p?: string) { return normalizedPhoneOrNull(p) !== null; }

  async function finalizeAndNext() {
    const section = current;
    const data = section === 'info' ? info : section === 'additional' ? additional : section === 'waiver' ? {} : section === 'attendance' ? { attendance_confirmation: additional.attendance_confirmation } : accounts;

    // client-side inline validation and normalization before finalize
    if (section === 'info') {
      // reset errors
      infoErrors = {} as any;
      let anyError = false;
      // required fields
      if (!info.first_name?.trim()) { infoErrors.first_name = 'Required'; anyError = true; }
      if (!info.last_name?.trim()) { infoErrors.last_name = 'Required'; anyError = true; }
      if (!info.email?.trim()) { infoErrors.email = 'Required'; anyError = true; }
      if (!info.dob?.trim()) { infoErrors.dob = 'Required'; anyError = true; }
      if (!info.address_1?.trim()) { infoErrors.address_1 = 'Required'; anyError = true; }
      if (!info.city?.trim()) { infoErrors.city = 'Required'; anyError = true; }
      if (!info.state?.trim()) { infoErrors.state = 'Required'; anyError = true; }
      if (!info.country?.trim()) { infoErrors.country = 'Required'; anyError = true; }
      if (!info.zip_code?.trim()) { infoErrors.zip_code = 'Required'; anyError = true; }
      // phone format
      const n = normalizedPhoneOrNull(info.phone);
      if (!n) {
        infoErrors.phone = info.phone?.trim() ? 'Invalid phone number' : 'Required';
        anyError = true;
      } else {
        infoErrors.phone = undefined;
        info.phone = n;
      }
      if (anyError) return;
    }
    if (section === 'additional') {
      // reset errors
      additionalErrors = {} as any;
      let anyError = false;
      if (!additional.emergency_contact_1_name?.trim()) { additionalErrors.emergency_contact_1_name = 'Required'; anyError = true; }
      if (!additional.emergency_contact_1_phone?.trim()) { additionalErrors.emergency_contact_1_phone = 'Required'; anyError = true; }
      if (!additional.emergency_contact_1_relationship?.trim()) { additionalErrors.emergency_contact_1_relationship = 'Required'; anyError = true; }
      if (!additional.emergency_contact_2_name?.trim()) { additionalErrors.emergency_contact_2_name = 'Required'; anyError = true; }
      if (!additional.emergency_contact_2_phone?.trim()) { additionalErrors.emergency_contact_2_phone = 'Required'; anyError = true; }
      if (!additional.emergency_contact_2_relationship?.trim()) { additionalErrors.emergency_contact_2_relationship = 'Required'; anyError = true; }
      if (!additional.shirt_size) { additionalErrors.shirt_size = 'Required'; anyError = true; }

      // phone format (both)
      const n1 = normalizedPhoneOrNull(additional.emergency_contact_1_phone);
      if (additional.emergency_contact_1_phone && !n1) { additionalErrors.emergency_contact_1_phone = 'Invalid phone'; anyError = true; }
      const n2 = normalizedPhoneOrNull(additional.emergency_contact_2_phone);
      if (additional.emergency_contact_2_phone && !n2) { additionalErrors.emergency_contact_2_phone = 'Invalid phone'; anyError = true; }
      if (n1) additional.emergency_contact_1_phone = n1;
      if (n2) additional.emergency_contact_2_phone = n2;

      if (anyError) return;
    }

    showSaving();
    // Compute next step and move immediately; save runs in background
    const nextStep = current === 'info' ? 'additional'
      : current === 'additional' ? 'waiver'
      : current === 'waiver' ? 'attendance'
      : current === 'attendance' ? 'accounts'
      : current === 'accounts' ? 'email'
      : current === 'email' ? 'review'
      : current === 'review' ? 'complete'
      : current;
    current = nextStep as any;

    let retried = false;
    async function attemptFinalize() {
      incPending();
      const res = await fetch('/api/save-progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section, data, finalize: true }) });
      if (res.ok) {
        showSaved();
        decPending();
      } else {
        let retryable = true;
        try {
          const err = await res.json();
          saveIndicatorRef?.setMessage(err?.message || 'Save failed');
          // don't retry validation failures
          if (err?.message === 'Validation failed' || err?.issues) retryable = false;
          console.error('Save failed', err);
        } catch (e) {
          console.error('Save failed (no JSON)', e);
        }
        saveIndicatorRef?.setState('error');
        if (!retried && retryable) {
          retried = true;
          setTimeout(attemptFinalize, 3000);
        } else {
          decPending();
        }
      }
    }
    // Fire and forget
    attemptFinalize();
  }

  function next() { finalizeAndNext(); }
  function back() {
    if (current === 'additional') current = 'info';
    else if (current === 'waiver') current = 'additional';
    else if (current === 'attendance') current = 'waiver';
    else if (current === 'accounts') current = 'attendance';
    else if (current === 'email') current = 'accounts';
    else if (current === 'review') current = 'email';
  }

  // Email verification calls
  async function sendCode() {
    emailError = undefined;
    emailSent = false;
    showSaving();
    const res = await fetch('/api/send-verification', { method: 'POST' });
    if (res.ok) {
      emailSent = true;
      showSaved();
    } else {
      try {
        const err = await res.json();
        emailError = err?.message || 'Failed to send verification email';
        saveIndicatorRef?.setMessage(emailError);
      } catch (e) {
        emailError = 'Failed to send verification email';
      }
      saveIndicatorRef?.setState('error');
    }
  }
  async function verifyCode() {
    showSaving();
    const res = await fetch('/api/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: email.code }) });
    if (res.ok) {
      emailError = undefined;
      showSaved();
      next();
    } else {
      try {
        const err = await res.json();
        emailError = err?.message || 'Verification failed';
        saveIndicatorRef?.setMessage(emailError);
      } catch (e) {
        emailError = 'Verification failed';
      }
      saveIndicatorRef?.setState('error');
    }
  }

  let completedSent = $state(false);
  async function complete() {
    if (completedSent) return;
    const res = await fetch('/api/complete', { method: 'POST' });
    if (res.ok) {
      completedSent = true;
    }
  }

  // account setup helper dialogs
  let hasGithubAccount = $state<'yes' | 'no' | ''>('');
  let hasItchAccount = $state<'yes' | 'no' | ''>('');

  // remember section across reload
  import { onMount } from 'svelte';
  function getCookie(name: string) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setStepPersistence(step: string) {
    document.cookie = `checkin_step=${encodeURIComponent(step)}; path=/; max-age=${60 * 60 * 24 * 30}`;
  }
  onMount(() => {
    const allowed = ['info','additional','waiver','attendance','accounts','review','email','complete'];
    const ck = getCookie('checkin_step');
    if (ck && allowed.includes(ck)) current = ck as any;
    // Warn on unload if there are pending saves
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSaves > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  });
  $effect(() => {
    setStepPersistence(current);
    if (current === 'complete') complete();
  });
</script>

{#if !attendee}
  <div class="p-6">Invalid or expired check-in session. Please use your email link.</div>
{:else}
  <div class="space-y-6">
    <Progress steps={steps} current={current} />


    {#if current === 'info'}
      <Section title="Information Verification" description="Please confirm your information is correct.">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="First name" required error={infoErrors.first_name}>
            <input class={inputClass} bind:value={info.first_name} oninput={() => { infoErrors.first_name = undefined; save('info', info); }} />
          </FormField>
          <FormField label="Last name" required error={infoErrors.last_name}>
            <input class={inputClass} bind:value={info.last_name} oninput={() => { infoErrors.last_name = undefined; save('info', info); }} />
          </FormField>
          <FormField label="Preferred name">
            <input class={inputClass} bind:value={info.preferred_name} oninput={() => save('info', info)} />
          </FormField>
          <FormField label="Email" required error={infoErrors.email}>
            <input type="email" class={inputClass} bind:value={info.email} oninput={() => { infoErrors.email = undefined; save('info', info); }} />
          </FormField>
          <div class="md:col-span-2">
            <div class="text-sm opacity-80 mb-1">Pronouns</div>
            <div class="flex flex-wrap gap-4">
              <label class="flex items-center gap-2"><input type="checkbox" checked={additional.pronouns?.includes('he / him')} onchange={() => togglePronoun('he / him')} /> he / him</label>
              <label class="flex items-center gap-2"><input type="checkbox" checked={additional.pronouns?.includes('she / her')} onchange={() => togglePronoun('she / her')} /> she / her</label>
              <label class="flex items-center gap-2"><input type="checkbox" checked={additional.pronouns?.includes('they / them or other')} onchange={() => togglePronoun('they / them or other')} /> they / them or other</label>
            </div>
          </div>
          <FormField label="Phone" required error={infoErrors.phone}>
            <input class={inputClass} bind:value={info.phone} oninput={() => { infoErrors.phone = undefined; save('info', info); }} />
          </FormField>
          <FormField classes="md:col-span-2" label="Date of birth" required error={infoErrors.dob}>
            <input type="date" class={inputClass} bind:value={info.dob} oninput={() => { infoErrors.dob = undefined; save('info', info); }} />
          </FormField>
          <FormField classes="md:col-span-2" label="Address line 1" required error={infoErrors.address_1}>
            <input class={inputClass} bind:value={info.address_1} oninput={() => { infoErrors.address_1 = undefined; save('info', info); }} />
          </FormField>
          <FormField classes="md:col-span-2" label="Address line 2">
            <input class={inputClass} bind:value={info.address_2} oninput={() => save('info', info)} />
          </FormField>
          <FormField label="City" required error={infoErrors.city}>
            <input class={inputClass} bind:value={info.city} oninput={() => { infoErrors.city = undefined; save('info', info); }} />
          </FormField>
          <FormField label="State" required error={infoErrors.state}>
            <input class={inputClass} bind:value={info.state} oninput={() => { infoErrors.state = undefined; save('info', info); }} />
          </FormField>
          <FormField label="Country" required error={infoErrors.country}>
            <input class={inputClass} bind:value={info.country} oninput={() => { infoErrors.country = undefined; save('info', info); }} />
          </FormField>
          <FormField label="ZIP code" required error={infoErrors.zip_code}>
            <input class={inputClass} bind:value={info.zip_code} oninput={() => { infoErrors.zip_code = undefined; save('info', info); }} />
          </FormField>
        </div>
        <div class="flex justify-end gap-3 mt-4">
          <Button onclick={next}>Next</Button>
        </div>
      </Section>
    {/if}

    {#if current === 'waiver'}
      <Section title="Waiver">
        <div class="space-y-3">
          <p class="opacity-80">This section will include required waiver(s). For now, please click Next to continue.</p>
          <div class="flex justify-between gap-3 mt-2">
            <Button variant="outline" onclick={back}>Back</Button>
            <Button onclick={next}>Next</Button>
          </div>
        </div>
      </Section>
    {/if}

    {#if current === 'additional'}
      <Section title="Additional Personal Information">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Pronouns are already in DB; just display them above in the info section if needed. Removed editing here. -->

          <div class="md:col-span-2 font-semibold">Emergency contacts</div>
          <FormField label="Contact 1 name" required error={additionalErrors.emergency_contact_1_name}>
            <input placeholder="Full name" class={inputClass} bind:value={additional.emergency_contact_1_name} oninput={() => { additionalErrors.emergency_contact_1_name = undefined; save('additional', additional); }} />
          </FormField>
          <FormField label="Contact 1 phone" required error={additionalErrors.emergency_contact_1_phone}>
            <input placeholder="(555) 123-4567 or +1 555 123 4567" class={inputClass} bind:value={additional.emergency_contact_1_phone} oninput={() => { additionalErrors.emergency_contact_1_phone = undefined; save('additional', additional); }} />
          </FormField>
          <FormField classes="md:col-span-2" label="Contact 1 relationship" required error={additionalErrors.emergency_contact_1_relationship}>
            <input placeholder="Parent, guardian, etc." class={inputClass} bind:value={additional.emergency_contact_1_relationship} oninput={() => { additionalErrors.emergency_contact_1_relationship = undefined; save('additional', additional); }} />
          </FormField>

          <FormField label="Contact 2 name" required error={additionalErrors.emergency_contact_2_name}>
            <input placeholder="Full name" class={inputClass} bind:value={additional.emergency_contact_2_name} oninput={() => { additionalErrors.emergency_contact_2_name = undefined; save('additional', additional); }} />
          </FormField>
          <FormField label="Contact 2 phone" required error={additionalErrors.emergency_contact_2_phone}>
            <input placeholder="(555) 123-4567 or +1 555 123 4567" class={inputClass} bind:value={additional.emergency_contact_2_phone} oninput={() => { additionalErrors.emergency_contact_2_phone = undefined; save('additional', additional); }} />
          </FormField>
          <FormField classes="md:col-span-2" label="Contact 2 relationship" required error={additionalErrors.emergency_contact_2_relationship}>
            <input placeholder="Parent, guardian, etc." class={inputClass} bind:value={additional.emergency_contact_2_relationship} oninput={() => { additionalErrors.emergency_contact_2_relationship = undefined; save('additional', additional); }} />
          </FormField>

          <FormField label="T‑shirt size" required error={additionalErrors.shirt_size}>
            <select class={inputClass} bind:value={additional.shirt_size} onchange={() => { additionalErrors.shirt_size = undefined; save('additional', additional); }}>
              <option value="">Select</option>
              <option>S</option><option>M</option><option>L</option><option>XL</option>
            </select>
          </FormField>
          <FormField classes="md:col-span-2" label="Dietary restrictions & allergies">
            <textarea placeholder="e.g. vegetarian, peanut allergy" class={inputClass} rows="3" bind:value={additional.dietary_restrictions} oninput={() => save('additional', additional)}></textarea>
          </FormField>
          <FormField classes="md:col-span-2" label="Is there anything else we should know to help make this the best experience for you?">
            <textarea class={inputClass} rows="3" bind:value={additional.additional_accommodations} oninput={() => save('additional', additional)} placeholder="Accessibility needs, scheduling constraints, etc."></textarea>
          </FormField>
        </div>
        <div class="flex justify-between gap-3 mt-4">
          <Button variant="outline" onclick={back}>Back</Button>
          <Button onclick={next}>Next</Button>
        </div>
      </Section>
    {/if}

    {#if current === 'attendance'}
      <Section title="Attendance confirmation">
        <p class="mb-3">This event is in-person. Please confirm you understand you must attend on-site to participate.</p>
        <label class="flex items-center gap-2"><input type="checkbox" bind:checked={additional.attendance_confirmation} /> I understand I will need to attend this event in‑person. <span class="text-red-600">*</span></label>
        <div class="flex justify-between gap-3 mt-4">
          <Button variant="outline" onclick={back}>Back</Button>
          <Button onclick={next}>Next</Button>
        </div>
      </Section>
    {/if}

    {#if current === 'accounts'}
      <Section title="Account Connections">
        <div class="space-y-6">
          <div class="rounded-lg border border-[color:var(--color-border-tan)] p-4">
            <div class="font-semibold mb-2">GitHub account</div>
            {#if accounts.github_username}
              <div class="mb-2">✓ Connected as {accounts.github_username}</div>
              <div class="flex gap-2"><button class="rounded-md border border-[color:var(--color-border-tan)] px-3 py-2" onclick={() => { accounts.github_username=''; save('accounts', accounts); }}>Disconnect</button></div>
            {:else}
              <div class="mb-2">Not connected</div>
              <div class="space-y-2">
                <div>Do you already have a GitHub account?</div>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2"><input type="radio" name="gh-have" value="yes" bind:group={hasGithubAccount}/> Yes</label>
                  <label class="flex items-center gap-2"><input type="radio" name="gh-have" value="no" bind:group={hasGithubAccount}/> No</label>
                </div>
                {#if hasGithubAccount === 'yes'}
                  <a class="cursor-pointer rounded-md bg-[color:var(--color-button-pink)] text-white px-3 py-2" href="/api/github-auth">Sign in with GitHub</a>
                {:else if hasGithubAccount === 'no'}
                  <div class="text-sm opacity-80">Please <a class="underline" href="https://github.com/signup" target="_blank" rel="noreferrer">create a GitHub account</a> first, then return here and click “Sign in with GitHub”.</div>
                {/if}
              </div>
            {/if}
          </div>

          <div class="rounded-lg border border-[color:var(--color-border-tan)] p-4">
            <div class="font-semibold mb-2">Itch.io account</div>
            {#if accounts.itch_username}
              <div class="mb-2">✓ Connected as {accounts.itch_username}</div>
              <div class="flex gap-2"><button class="rounded-md border border-[color:var(--color-border-tan)] px-3 py-2" onclick={() => { accounts.itch_username=''; save('accounts', accounts); }}>Disconnect</button></div>
            {:else}
              <div class="mb-2">Not connected</div>
              <div class="space-y-2">
                <div>Do you already have an Itch.io account?</div>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2"><input type="radio" name="itch-have" value="yes" bind:group={hasItchAccount}/> Yes</label>
                  <label class="flex items-center gap-2"><input type="radio" name="itch-have" value="no" bind:group={hasItchAccount}/> No</label>
                </div>
                {#if hasItchAccount === 'yes'}
                  <a class="cursor-pointer rounded-md bg-[color:var(--color-button-pink)] text-white px-3 py-2" href="/api/itch-auth">Sign in with Itch.io</a>
                {:else if hasItchAccount === 'no'}
                  <div class="text-sm opacity-80">Please <a class="underline" href="https://itch.io/register" target="_blank" rel="noreferrer">create an Itch.io account</a> first, then return here and click “Sign in with Itch.io”.</div>
                {/if}
              </div>
            {/if}
          </div>

          <div class="flex justify-between gap-3 mt-2">
            <Button variant="outline" onclick={back}>Back</Button>
            <Button onclick={next}>Next</Button>
          </div>
        </div>
      </Section>
    {/if}

    {#if current === 'review'}
      <Section title="Review your information">
        <div class="space-y-5 text-[15px]">
          <EventCard eventName={attendee.event?.fields.event_name} location={attendee.event?.fields.location} date={attendee.event?.fields.start_date} format={attendee.event?.fields.event_format} />
          <div class="group relative">
            <div class="flex items-center gap-2">
              <div role="button" tabindex="0" class="font-semibold cursor-pointer underline" onclick={() => current='info'} onkeydown={(e)=>{ if(e.key==='Enter'||e.key===' '){ current='info'; }}}>Personal Information</div>
              <button type="button" class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Edit personal information" onclick={() => current='info'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
            </div>
            <div class="mt-2 opacity-90">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div class="opacity-70 text-sm">First name</div>
                  <div>{info.first_name}</div>
                </div>
                <div>
                  <div class="opacity-70 text-sm">Last name</div>
                  <div>{info.last_name}</div>
                </div>
                {#if info.preferred_name}
                <div class="md:col-span-2">
                  <div class="opacity-70 text-sm">Preferred name</div>
                  <div>{info.preferred_name}</div>
                </div>
                {/if}
                <div>
                  <div class="opacity-70 text-sm">Email</div>
                  <div class="break-all">{info.email}</div>
                </div>
                <div>
                  <div class="opacity-70 text-sm">Phone</div>
                  <div>{formatPhone(info.phone)}</div>
                </div>
                <div>
                  <div class="opacity-70 text-sm">Address</div>
                  <div>{info.address_1}</div>
                  <div>{info.address_2 || '—'}</div>
                  <div>{info.city}, {info.state} {info.zip_code}</div>
                  <div>{info.country || ''}</div>
                </div>
                <div>
                  <div class="opacity-70 text-sm">DOB</div>
                  <div>{info.dob}</div>
                </div>
                <div>
                  <div class="opacity-70 text-sm">Shirt size</div>
                  <div>{sizeWord(additional.shirt_size)}</div>
                </div>
                <div>
                  <div class="opacity-70 text-sm">Pronouns</div>
                  <div>{(additional.pronouns||[]).join(', ') || '—'}</div>
                </div>
                <div class="md:col-span-2">
                  <div class="opacity-70 text-sm">Dietary restrictions</div>
                  <div>{additional.dietary_restrictions || '—'}</div>
                </div>
                <div class="md:col-span-2">
                  <div class="opacity-70 text-sm">Notes</div>
                  <div>{additional.additional_accommodations || '—'}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="h-px bg-[color:var(--color-border-tan)]/70"></div>
          <div class="group relative">
            <div class="flex items-center gap-2">
              <div role="button" tabindex="0" class="font-semibold cursor-pointer underline" onclick={() => current='additional'} onkeydown={(e)=>{ if(e.key==='Enter'||e.key===' '){ current='additional'; }}}>Emergency Contacts</div>
              <button type="button" class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Edit emergency contacts" onclick={() => current='additional'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
            </div>
            <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="border border-[color:var(--color-border-tan)] rounded-md p-3">
            <div><span class="opacity-70">Name:</span> {additional.emergency_contact_1_name || '—'}</div>
            <div><span class="opacity-70">Phone:</span> {formatPhone(additional.emergency_contact_1_phone) || '—'}</div>
            <div><span class="opacity-70">Relationship:</span> {additional.emergency_contact_1_relationship || '—'}</div>
            </div>
            <div class="border border-[color:var(--color-border-tan)] rounded-md p-3">
            <div><span class="opacity-70">Name:</span> {additional.emergency_contact_2_name || '—'}</div>
            <div><span class="opacity-70">Phone:</span> {formatPhone(additional.emergency_contact_2_phone) || '—'}</div>
            <div><span class="opacity-70">Relationship:</span> {additional.emergency_contact_2_relationship || '—'}</div>
            </div>
            </div>
          </div>
          <div class="h-px bg-[color:var(--color-border-tan)]/70"></div>
          <div class="group relative">
            <div class="flex items-center gap-2">
              <div role="button" tabindex="0" class="font-semibold cursor-pointer underline" onclick={() => current='accounts'} onkeydown={(e)=>{ if(e.key==='Enter'||e.key===' '){ current='accounts'; }}}>Accounts</div>
              <button type="button" class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Edit accounts" onclick={() => current='accounts'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
            </div>
            <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 opacity-90">
            <div><span class="opacity-70">Connected GitHub Account:</span> {accounts.github_username || '—'}</div>
            <div><span class="opacity-70">Connected Itch.io Account:</span> {accounts.itch_username || '—'}</div>
              <div class="md:col-span-2"><span class="opacity-70">Email:</span> {info.email}</div>
              </div>
          </div>
          <div class="text-sm opacity-80 mt-4">By clicking Next, you confirm your information is accurate. After submission, you may not be able to edit it further.</div>
          <div class="flex justify-between gap-3 mt-2">
            <Button variant="outline" onclick={back}>Back</Button>
            <Button onclick={next}>Next</Button>
          </div>
        </div>
      </Section>
    {/if}

    {#if current === 'email'}
      <Section title="Email Verification">
        <div class="space-y-3">
          <div>Current email: <span class="font-semibold">{info.email}</span></div>
          <div class="flex items-center gap-3">
            <div class="flex gap-2">
              <Button onclick={sendCode}>Send verification code</Button>
              <Button variant="outline" onclick={sendCode}>Resend code</Button>
            </div>
            {#if emailSent}
              <div class="text-green-700 text-sm">Verification email sent.</div>
            {/if}
          </div>
          <div class="flex items-end gap-2">
            <label class="flex flex-col gap-1">
              <span>Enter 6‑digit code</span>
              <input class="rounded-md border border-[color:var(--color-border-tan)] bg-white/70 px-3 py-2 w-40 tracking-widest text-center" maxlength="6" bind:value={email.code} />
            </label>
            <Button onclick={verifyCode}>Verify</Button>
          </div>
          {#if emailError}
            <div class="text-red-600 text-sm">{emailError}</div>
          {/if}
          {#if fields.email_verified}
            <div class="text-green-700">✓ Email verified</div>
          {/if}
          <div class="flex justify-between gap-3 mt-2">
            <Button variant="outline" onclick={back}>Back</Button>
            <Button onclick={next}>Next</Button>
          </div>
        </div>
      </Section>
    {/if}

    {#if current === 'complete'}
      <Section title="Your e‑ticket">
        <div class="space-y-4"> 
          <p>You're all checked in!</p>
          <p class="opacity-80">Show this ticket at check‑in. Keep it handy in your wallet.</p>
          <div class="w-full max-w-[560px] mx-auto">
            <iframe title="Your Daydream ticket" class="w-full h-[500px] md:h-[520px] rounded-lg border border-[color:var(--color-border-tan)] bg-white" src={`/ticket/${encodeURIComponent(attendee.record.id)}`}></iframe>
          </div>
          <div>
            <a class="rounded-md border border-[color:var(--color-border-tan)] px-3 py-2" href={`/ticket/${encodeURIComponent(attendee.record.id)}`} target="_blank" rel="noreferrer">Open ticket in new tab</a>
          </div>
        </div>
      </Section>
    {/if}
  </div>
{/if}

<SaveIndicator bind:this={saveIndicatorRef} />



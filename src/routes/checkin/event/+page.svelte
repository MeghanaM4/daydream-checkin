<script lang="ts">
  import EventCard from '$lib/components/EventCard.svelte';
  import Button from '$lib/components/Button.svelte';
  import { onMount } from 'svelte';
  import CloudParticles from '$lib/components/CloudParticles.svelte';
  import { t } from '$lib/i18n';
  let { data } = $props();
  let attendee = $state(data?.attendee);
  let showPicker = $state(false);
  let events = $state<Array<{id:string,name:string,date:string,location:string,format:string}>>([]);
  let query = $state('');
  let highlighted = $state(0);
  let inputEl: HTMLInputElement | null = null;
  let eventsError = $state<string | null>(null);
  function onclickContinue() { window.location.href = '/checkin'; }
  function fmt(d?: string) { try { if (!d) return ''; const dt = new Date(d); return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return ''; } }

  async function fetchEventsInBackground() {
    if (events.length) return;
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const j = await res.json();
        if (j?.ok) events = j.events || [];
        else eventsError = t('errors.events_load');
      } else {
        eventsError = t('errors.events_load');
      }
    } catch {
      eventsError = t('errors.events_load');
    }
  }

  onMount(() => {
    // Preload events so the picker is instant when opened
    fetchEventsInBackground();
  });

  async function openPicker() {
    showPicker = true;
    highlighted = 0;
    if (!events.length) {
      // Fallback in case background fetch failed or hasn’t completed
      await fetchEventsInBackground();
    }
    // focus search box on next frame
    setTimeout(() => inputEl?.focus(), 0);
  }
  async function selectEvent(id: string) {
    const res = await fetch('/api/change-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: id }) });
    if (res.ok) {
      const found = events.find(e => e.id === id);
      if (found && attendee) {
        attendee.event = { id: found.id, fields: { event_name: found.name, start_date: found.date || '', location: found.location || '', event_format: found.format || '' } } as any;
        showPicker = false;
      } else {
        showPicker = false;
      }
    } else {
      eventsError = t('errors.change_event');
    }
  }

  onMount(() => {
    if (attendee?.record?.fields?.checkin_completed) {
      window.location.replace('/checkin');
    }
  });
</script>

{#if !attendee}
  <div class="p-6">{t('session.invalid')}</div>
{:else}
  <div class="space-y-6 max-w-3xl mx-auto">
    <h1 class="text-3xl font-semibold">{t('event.checking_in_for')}</h1>
    <div class="relative">
      <EventCard eventName={attendee.event?.fields.event_name} location={attendee.event?.fields.location} date={attendee.event?.fields.start_date} format={attendee.event?.fields.event_format} />
      <div class="absolute right-3 bottom-3">
        <Button variant="outline" onclick={openPicker}>{t('event.edit_event')}</Button>
      </div>
    </div>

    <div class="text-sm opacity-80 flex items-center gap-2 -mt-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-80"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      <span>{t('event.estimated_duration', { minutes: 5 })}</span>
    </div>

    <div class="space-y-2 opacity-90">
      <p>{t('event.intro')}</p>
      <div class="space-y-2 my-4">
        <div class="border border-[color:var(--color-border-tan)] rounded-md px-6 py-4 bg-white/70"><span class="opacity-80 mr-2">•</span> {t('event.bullet_food')}</div>
        <div class="border border-[color:var(--color-border-tan)] rounded-md px-6 py-4 relative lg:pr-[200px] bg-white/70">
          <span class="opacity-80 mr-2">•</span> {t('event.bullet_shirt')}
          <img src="/shirt.png" alt={t('alt.event_tshirt')} class="hidden lg:block absolute top-1/2 -translate-y-1/2 right-[-160px] w-[220px] h-auto rounded-md drop-shadow-lg" />
        </div>
        <div class="lg:hidden px-3 -my-8">
          <img src="/shirt.png" alt={t('alt.event_tshirt')} class="w-full max-w-[360px] mx-auto h-auto rounded-md -z-20 relative drop-shadow-md" />
        </div>
        <div class="border border-[color:var(--color-border-tan)] rounded-md px-6 py-4 bg-white/70"><span class="opacity-80 mr-2">•</span> {t('event.bullet_contacts')}</div>
        <div class="border border-[color:var(--color-border-tan)] rounded-md px-6 py-4 bg-white/70"><span class="opacity-80 mr-2">•</span> {t('event.bullet_software')}</div>
      </div>
      <p>{t('event.encouragement')}</p>
    </div>

    <div class="flex justify-end gap-3">
      <Button onclick={onclickContinue}>{t('common.next')}</Button>
    </div>
    
    {#if showPicker}
    <div class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/40"></div>
    <div class="absolute left-1/2 top-20 -translate-x-1/2 w-[90vw] max-w-xl rounded-xl bg-white shadow-2xl border border-[color:var(--color-border-tan)]">
        <div class="p-3 border-b border-[color:var(--color-border-tan)]/70 bg-white/80 rounded-t-xl">
        <input
        bind:this={inputEl}
        class="w-full rounded-md border border-[color:var(--color-border-tan)] bg-white/70 px-3 py-2"
        placeholder={t('picker.search_placeholder')}
        bind:value={query}
        onkeydown={(e)=>{
            const list = events.filter(ev => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
              return ev.name.toLowerCase().includes(q) || ev.location.toLowerCase().includes(q) || ev.format.toLowerCase().includes(q) || ev.date.toLowerCase().includes(q);
          });
          if (e.key==='Escape') { showPicker=false; }
          else if (e.key==='ArrowDown') { highlighted = Math.min(list.length-1, highlighted+1); e.preventDefault(); }
            else if (e.key==='ArrowUp') { highlighted = Math.max(0, highlighted-1); e.preventDefault(); }
          else if (e.key==='Enter' && list[highlighted]) { selectEvent(list[highlighted].id); showPicker=false; }
        }}
        />
        </div>
        <div class="max-h-[60vh] overflow-auto p-2 space-y-2">
        {#if eventsError}
        <div class="text-sm text-red-600 px-3 py-2">{eventsError}</div>
        {/if}
        {#each events.filter(e => {
          const q = query.trim().toLowerCase();
        if (!q) return true;
          return e.name.toLowerCase().includes(q) || e.location.toLowerCase().includes(q) || e.format.toLowerCase().includes(q) || e.date.toLowerCase().includes(q);
          }) as ev, i}
              <button class={`w-full text-left rounded-md px-3 py-2 border transition-colors ${i===highlighted ? 'bg-[color:var(--color-border-tan)]/15 border-[color:var(--color-border-tan)]' : 'border-transparent hover:bg-[color:var(--color-border-tan)]/10 hover:border-[color:var(--color-border-tan)]'}`} onclick={() => { selectEvent(ev.id); showPicker=false; }}>
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium">{ev.name}</div>
                    <div class="text-sm opacity-70">{[ev.location, ev.format, ev.date && fmt(ev.date)].filter(Boolean).join(' • ')}</div>
                  </div>
                </div>
              </button>
            {/each}
            {#if !events.length && !eventsError}
              <div class="text-sm opacity-70 px-3 py-2">{t('common.loading_events')}</div>
            {/if}
          </div>
          <div class="p-2 border-t border-[color:var(--color-border-tan)]/70 flex justify-end">
            <Button variant="outline" onclick={() => showPicker=false}>{t('common.close')}</Button>
          </div>
        </div>
      </div>
    {/if}
    </div>
    {/if}

<div class="h-[80px]"></div>
<CloudParticles height={120} />

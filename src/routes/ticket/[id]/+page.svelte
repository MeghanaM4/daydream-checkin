<script lang="ts">
  import type { AttendeeWithEvent } from '$lib/types';
  let { data } = $props();
  const attendee = (data?.attendee as AttendeeWithEvent) || null;
  const fields = attendee?.record.fields || {} as any;
  const eventName = attendee?.event?.fields.event_name;
  const eventDateIso = attendee?.event?.fields.start_date;
  function fmt(d?: string) { try { if (!d) return ''; const dt = new Date(d); return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return ''; } }
  const name = (fields.preferred_name || fields.first_name || '') + (fields.last_name ? ` ${fields.last_name}` : '');
  const id = attendee?.record.id;
  const email = fields.email || '';
  const inputClass = 'rounded-md border border-[color:var(--color-border-tan)] bg-white/70 px-3 py-2';
</script>

{#if !attendee}
  <div class="p-6">Ticket not found.</div>
{:else}
  {#key id}
    {#if typeof window !== 'undefined' && window.self !== window.top}
      <!-- Embedded variant: simplified content -->
      <div class="p-4 space-y-4">
        <div>
          <h1 class="text-xl md:text-2xl font-semibold text-[color:var(--color-dark-blue)]">{eventName || 'Daydream'}</h1>
          {#if fmt(eventDateIso)}<div class="text-sm opacity-70">{fmt(eventDateIso)}</div>{/if}
        </div>
        <div class="h-px bg-[color:var(--color-border-tan)]/70"></div>
        <div class="flex flex-col items-center gap-3">
          <img alt="Ticket QR" class="bg-white p-3 rounded-md border border-[color:var(--color-border-tan)] w-[240px] h-[240px] md:w-[300px] md:h-[300px]" src={`https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(id)}`}/>
          <div class="font-mono text-sm md:text-base opacity-80">{id}</div>
        </div>
        <div class="h-px bg-[color:var(--color-border-tan)]/70"></div>
        <div>
          <div class="text-[13px] opacity-70">Name</div>
          <div class="text-lg md:text-xl font-medium">{name}</div>
        </div>
        <div>
          <div class="text-[13px] opacity-70">Email</div>
          <div class="text-lg md:text-xl font-medium break-all">{email}</div>
        </div>
      </div>
    {:else}
      <!-- Standalone page with centered card -->
      <div class="min-h-[80dvh] flex items-center justify-center p-4">
        <div class="w-full max-w-[560px] rounded-xl border border-[color:var(--color-border-tan)] bg-white/80 shadow-sm overflow-hidden">
          <div class="p-6 md:p-7 space-y-4">
            <div>
              <h1 class="text-2xl md:text-3xl font-semibold text-[color:var(--color-dark-blue)]">{eventName || 'Daydream'}</h1>
              {#if fmt(eventDateIso)}<div class="text-sm opacity-70">{fmt(eventDateIso)}</div>{/if}
            </div>
            <div class="h-px bg-[color:var(--color-border-tan)]/70"></div>
            <div class="flex flex-col items-center gap-3">
              <img alt="Ticket QR" class="bg-white p-3 rounded-md border border-[color:var(--color-border-tan)] w-[240px] h-[240px] md:w-[300px] md:h-[300px]" src={`https://api.qrserver.com/v1/create-qr-code/?size=340x340&data=${encodeURIComponent(id)}`}/>
              <div class="font-mono text-sm md:text-base opacity-80">{id}</div>
            </div>
            <div class="h-px bg-[color:var(--color-border-tan)]/70"></div>
            <div>
              <div class="text-[13px] opacity-70">Name</div>
              <div class="text-lg md:text-xl font-medium">{name}</div>
            </div>
            <div>
              <div class="text-[13px] opacity-70">Email</div>
              <div class="text-lg md:text-xl font-medium break-all">{email}</div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {/key}
{/if}

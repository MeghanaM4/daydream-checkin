<script lang="ts">
  import { t } from '$lib/i18n';
  let { data } = $props();
  const ticket = (data as any)?.ticket;
  const eventName = ticket?.eventName as string | undefined;
  const eventDateIso = ticket?.eventDateIso as string | undefined;
  function fmt(d?: string) { try { if (!d) return ''; const dt = new Date(d); return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return ''; } }
  const name = ticket?.name as string | undefined;
  const id = ticket?.id as string | undefined;
  const email = ticket?.email as string | undefined;
</script>

{#if !ticket}
  <div class="p-6">{t('ticket.not_found')}</div>
{:else}
  {#key id}
    {#if typeof window !== 'undefined' && window.self !== window.top}
      <!-- Embedded variant: simplified content -->
      <div class="p-4 space-y-4">
        <div>
          <h1 class="text-xl md:text-2xl font-semibold text-[color:var(--color-dark-blue)]">{eventName || t('ticket.fallback_event_name')}</h1>
          {#if fmt(eventDateIso)}<div class="text-sm opacity-70">{fmt(eventDateIso)}</div>{/if}
        </div>
        <div class="h-px bg-[color:var(--color-border-tan)]/70"></div>
        <div class="flex flex-col items-center gap-3">
          <img alt={t('alt.ticket_qr')} class="bg-white p-3 rounded-md border border-[color:var(--color-border-tan)] w-[240px] h-[240px] md:w-[300px] md:h-[300px]" src={`https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(id || '')}`}/>
          <div class="font-mono text-sm md:text-base opacity-80">{id}</div>
        </div>
        <div class="h-px bg-[color:var(--color-border-tan)]/70"></div>
        <div>
          <div class="text-[13px] opacity-70">{t('ticket.name')}</div>
          <div class="text-lg md:text-xl font-medium">{name}</div>
        </div>
        <div>
          <div class="text-[13px] opacity-70">{t('ticket.email')}</div>
          <div class="text-lg md:text-xl font-medium break-all">{email}</div>
        </div>
      </div>
    {:else}
      <!-- Standalone page with centered card -->
      <div class="min-h-[80dvh] flex items-center justify-center p-4">
        <div class="w-full max-w-[560px] rounded-xl border border-[color:var(--color-border-tan)] bg-white/80 shadow-sm overflow-hidden">
          <div class="p-6 md:p-7 space-y-4">
            <div>
              <h1 class="text-2xl md:text-3xl font-semibold text-[color:var(--color-dark-blue)]">{eventName || t('ticket.fallback_event_name')}</h1>
              {#if fmt(eventDateIso)}<div class="text-sm opacity-70">{fmt(eventDateIso)}</div>{/if}
            </div>
            <div class="h-px bg-[color:var(--color-border-tan)]/70"></div>
            <div class="flex flex-col items-center gap-3">
              <img alt={t('alt.ticket_qr')} class="bg-white p-3 rounded-md border border-[color:var(--color-border-tan)] w-[240px] h-[240px] md:w-[300px] md:h-[300px]" src={`https://api.qrserver.com/v1/create-qr-code/?size=340x340&data=${encodeURIComponent(id || '')}`}/>
              <div class="font-mono text-sm md:text-base opacity-80">{id}</div>
            </div>
            <div class="h-px bg-[color:var(--color-border-tan)]/70"></div>
            <div>
              <div class="text-[13px] opacity-70">{t('ticket.name')}</div>
              <div class="text-lg md:text-xl font-medium">{name}</div>
            </div>
            <div>
              <div class="text-[13px] opacity-70">{t('ticket.email')}</div>
              <div class="text-lg md:text-xl font-medium break-all">{email}</div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {/key}
{/if}

<script lang="ts">
  import Progress from '$lib/components/ProgressIndicator.svelte';
  import { t, setLocale } from '$lib/i18n';
  let { data, children } = $props();
  const attendee = data.attendee;
  const displayName = `${attendee?.record?.fields?.preferred_name || attendee?.record?.fields?.first_name || ''} ${attendee?.record?.fields?.last_name || ''}`.trim();
  const eventLang: string = (data as any)?.eventLang || 'en';
  // Set the event default immediately to avoid flash of English; user cookie still overrides when set
  setLocale(eventLang || 'en');
</script>

<div class="min-h-screen flex flex-col bg-[#c1e6fa] -z-2 relative">
<header data-checkin-header class="border-b border-[color:var(--color-border-tan)] bg-[color:var(--color-bg-cream)]/80 backdrop-blur">
<div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
<div class="font-semibold">{t('app.title')}</div>
<div class="flex items-center gap-3 text-sm">
{#if attendee}
<div class="opacity-90">{t('session.checking_in_as', { name: displayName })}</div>
<button class="underline" onclick={() => (window.location.href = '/checkin/logout')}>{t('session.logout')}</button>
{/if}
</div>
</div>
</header>

<main class="flex-1 max-w-4xl mx-auto px-4 py-6 space-y-4 w-full relative">
{@render children?.()}
</main>
</div>

<script lang="ts">
  import { t } from '$lib/i18n';
  let { eventName = '', location = '', date = '', format = '' } = $props();
</script>

<div class="relative overflow-hidden rounded-2xl border border-[color:var(--color-border-tan)] bg-gradient-to-br from-[color:var(--color-main-page-yellow)] to-[color:var(--color-kirby-pink)]/40 p-5 shadow-md">
  <div class="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[color:var(--color-moonbeam-ice)]/30 blur-2xl"></div>
  <div class="pointer-events-none absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-[color:var(--color-turtle-turquoise)]/20 blur-2xl"></div>
  <div class="relative flex items-start gap-4">
    <div class="shrink-0 w-10 h-10 rounded-xl bg-[color:var(--color-turtle-turquoise)] shadow-inner"></div>
    <div class="text-[color:var(--color-dark-blue)]">
      <div class="text-sm opacity-80">{t('event.registered_for')}</div>
      <div class="text-2xl font-semibold leading-tight">{eventName}</div>
      <div class="opacity-90">{location}</div>
      <div class="opacity-80">{date} • {format}</div>
    </div>
  </div>
</div>

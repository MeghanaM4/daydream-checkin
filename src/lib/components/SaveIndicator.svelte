<script lang="ts">
  import { t } from '$lib/i18n';
  let state: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  let lastVisibleState: 'saving' | 'saved' | 'error' = 'saved';
  let message = '';
  let hideTimer: any = null;
  let hovering = false;

  export function setState(s: typeof state) {
    if (s !== 'idle') lastVisibleState = s;
    state = s;
    if (s === 'saved' || s === 'error') scheduleHide();
    if (s === 'saving') { clearTimeout(hideTimer); }
  }
  export function setMessage(m: string) { message = m }

  function scheduleHide() {
    clearTimeout(hideTimer);
    if (hovering) return;
    hideTimer = setTimeout(() => {
      state = 'idle';
    }, 5000);
  }
</script>

<div class="fixed bottom-4 right-4 rounded-full bg-[color:var(--color-bg-cream)] text-[color:var(--color-dark-blue)] shadow px-3 py-2 flex items-center gap-2 border border-[color:var(--color-border-tan)] transition-opacity duration-500"
  role="status" class:opacity-0={state === 'idle'} class:opacity-100={state !== 'idle'} onmouseenter={() => { hovering = true; clearTimeout(hideTimer); }} onmouseleave={() => { hovering = false; scheduleHide(); }}>
  {#if (state === 'saving') || (state === 'idle' && lastVisibleState === 'saving')}
    <span class="size-3 animate-spin rounded-full border-2 border-[color:var(--color-button-pink)] border-t-transparent"></span>
    <span>{t('status.saving')}</span>
  {:else if (state === 'saved') || (state === 'idle' && lastVisibleState === 'saved')}
    <span class="inline-block size-3 bg-[color:var(--color-turtle-turquoise)] rounded-full"></span>
    <span>{t('status.saved')}</span>
  {:else}
    <!-- error or fading from error -->
    <span class="inline-block size-3 bg-red-500 rounded-full"></span>
    <span>{t('status.save_failed', { message: message || t('errors.unknown') })}</span>
  {/if}
</div>

<script lang="ts">
  let state: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  let message = '';
  let hideTimer: any = null;
  let hovering = false;

  export function setState(s: typeof state) {
    state = s;
    if (s === 'saved' || s === 'error') scheduleHide();
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
  {#if state === 'saving'}
    <span class="size-3 animate-spin rounded-full border-2 border-[color:var(--color-button-pink)] border-t-transparent"></span>
    <span>Saving…</span>
  {:else if state === 'saved'}
    <span class="inline-block size-3 bg-[color:var(--color-turtle-turquoise)] rounded-full"></span>
    <span>Changes saved</span>
  {:else if state === 'error'}
    <span class="inline-block size-3 bg-red-500 rounded-full"></span>
    <span>Save failed: {message || 'Unknown error'}</span>
  {:else}
    <!-- idle: render nothing while fading out -->
  {/if}
</div>

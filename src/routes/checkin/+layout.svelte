<script lang="ts">
  import Progress from '$lib/components/ProgressIndicator.svelte';
  let { data, children } = $props();
  const attendee = data.attendee;
  const displayName = `${attendee?.record?.fields?.preferred_name || attendee?.record?.fields?.first_name || ''} ${attendee?.record?.fields?.last_name || ''}`.trim();
</script>

<div class="min-h-screen">
  <header class="border-b border-[color:var(--color-border-tan)] bg-[color:var(--color-bg-cream)]/80 backdrop-blur">
    <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="font-semibold">Daydream Check-in</div>
      <div class="flex items-center gap-3 text-sm">
        {#if attendee}
          <div class="opacity-90">Checking in as {displayName}</div>
          <button class="underline" onclick={() => (window.location.href = '/checkin/logout')}>Log out</button>
        {/if}
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-4 py-6 space-y-4">
    {@render children?.()}
  </main>
</div>

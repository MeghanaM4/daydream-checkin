<script lang="ts">
  import Progress from '$lib/components/ProgressIndicator.svelte';
  let { data, children } = $props();
  const attendee = data.attendee;

</script>

<div class="min-h-screen">
  <header class="border-b border-[color:var(--color-border-tan)] bg-[color:var(--color-bg-cream)]/80 backdrop-blur">
    <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="font-semibold">Daydream Check-in</div>
      <div class="flex items-center gap-3 text-sm">
        <a class="underline" href="/checkin/event">Change event</a>
        {#if attendee?.record?.fields?.preferred_name}
          <div>Checking in as {attendee.record.fields.preferred_name} · <a class="underline" href="/checkin/logout">Log out</a></div>
        {/if}
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-4 py-6 space-y-4">
    {@render children?.()}
  </main>
</div>

<script lang="ts">
  import EventCard from '$lib/components/EventCard.svelte';
  import Button from '$lib/components/Button.svelte';
  let { data } = $props();
  const attendee = data?.attendee;
  let showHelp = $state(false);
  function onclickContinue() { window.location.href = '/checkin'; }
</script>

{#if !attendee}
  <div class="p-6">Invalid or expired check-in session. Please use your email link.</div>
{:else}
  <div class="space-y-6 max-w-3xl mx-auto">
    <h1 class="text-3xl font-semibold">You’re checking in for</h1>
    <EventCard eventName={attendee.event?.fields.event_name} location={attendee.event?.fields.location} date={attendee.event?.fields.start_date} format={attendee.event?.fields.event_format} />

    <div class="flex gap-3">
      <Button onclick={onclickContinue}>Looks good, continue</Button>
      <Button variant="outline" onclick={() => showHelp = true}>This looks wrong</Button>
    </div>

    {#if showHelp}
      <div class="rounded-lg border border-[color:var(--color-border-tan)] bg-white/80 p-4">
        <div class="font-semibold mb-1">Need help?</div>
        <p>If this event info looks incorrect, please contact an organizer (reply to your invite email or speak to a volunteer at check-in). We’ll make sure it’s fixed before you proceed.</p>
      </div>
    {/if}
  </div>
{/if}

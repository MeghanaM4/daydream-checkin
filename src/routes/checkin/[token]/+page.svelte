<script lang="ts">
  import { onMount } from 'svelte';
  onMount(() => {
    // Force a full navigation so the Set-Cookie from the server is attached to the next request reliably
    window.location.replace('/checkin/event');
  });
</script>

<div class="p-6">Redirecting…</div>

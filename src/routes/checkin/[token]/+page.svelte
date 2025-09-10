<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  onMount(() => {
    goto('/checkin/event', { replaceState: true });
  });
</script>

<div class="p-6">Redirecting…</div>

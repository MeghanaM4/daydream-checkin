<script lang="ts">
  import { onMount } from 'svelte';

  onMount(async () => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const state = params.get('state');

    if (!access_token || !state) {
      window.location.href = '/checkin';
      return;
    }

    try {
      const res = await fetch('/auth/itch/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token, state })
      });
      // clear hash ASAP
      history.replaceState(null, '', window.location.pathname);
      window.location.href = '/checkin';
    } catch (e) {
      window.location.href = '/checkin';
    }
  });
</script>

<div class="p-6">Connecting your Itch.io account…</div>

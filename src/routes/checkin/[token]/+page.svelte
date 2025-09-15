<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  onMount(() => {
    // Force a full navigation so the Set-Cookie from the server is attached to the next request reliably
    window.location.replace('/checkin/event');
  });
</script>

<div class="p-6">{t('common.redirecting')}</div>

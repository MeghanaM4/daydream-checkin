<script lang="ts">
	import '../app.css';
	import { Toaster } from 'svelte-sonner';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.png" />
</svelte:head>

<Toaster position="top-right" />
{@render children?.()}

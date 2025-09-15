<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { initLocale } from '$lib/i18n';

	let { children } = $props();

	onMount(() => {
		initLocale('en');
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Toaster position="top-right" />
{@render children?.()}

<script lang="ts">
	import { onMount } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';
	import '@fontsource/nunito/latin-600.css';
	import '@fontsource/nunito/latin-800.css';
	import '../app.css';
	let { children } = $props();

	// Keep the offline copy fresh: look for a new deploy whenever the app comes
	// back into view, and reload once a new version has taken over.
	onMount(() => {
		if (!('serviceWorker' in navigator)) return;
		const sw = navigator.serviceWorker;
		let hadController = !!sw.controller;
		const reload = () => {
			// the very first install also claims the page; only reload for real updates
			if (hadController) location.reload();
			hadController = true;
		};
		const check = () => {
			if (document.visibilityState === 'visible') sw.getRegistration().then((r) => r?.update());
		};
		sw.addEventListener('controllerchange', reload);
		document.addEventListener('visibilitychange', check);
		return () => {
			sw.removeEventListener('controllerchange', reload);
			document.removeEventListener('visibilitychange', check);
		};
	});
</script>

<ModeWatcher disableTransitions={false} themeColors={{ light: '#2e9fe0', dark: '#07090d' }} />
{@render children()}

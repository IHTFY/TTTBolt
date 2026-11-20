<script lang="ts">
	import { onMount } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';
	import '@fontsource/nunito/latin-600.css';
	import '@fontsource/nunito/latin-800.css';
	import '../app.css';
	import { derived } from 'svelte/store';
	import { loadForBuyer } from '$lib/ads';
	import { board } from '$lib/stores/gameStore';
	import { reloadOnUpdate } from '$lib/updates';
	let { children } = $props();

	onMount(loadForBuyer);

	// Keep the offline copy fresh: look for a new deploy whenever the app comes into view, and
	// reload once a new version has taken over, but never in the middle of a game: with marks on the
	// board the reload waits until the board is empty again (a new game).
	const boardEmpty = derived(board, ($board) => $board.every((cell) => cell === null));
	onMount(() => {
		if (!('serviceWorker' in navigator)) return;
		const sw = navigator.serviceWorker;
		const stopReloading = reloadOnUpdate(sw, boardEmpty);
		const check = () => {
			if (document.visibilityState === 'visible') sw.getRegistration().then((r) => r?.update());
		};
		document.addEventListener('visibilitychange', check);
		return () => {
			stopReloading();
			document.removeEventListener('visibilitychange', check);
		};
	});
</script>

<ModeWatcher disableTransitions={false} themeColors={{ light: '#2e9fe0', dark: '#07090d' }} />
{@render children()}

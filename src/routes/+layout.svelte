<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	let { children } = $props();
</script>

<ModeWatcher disableTransitions={false} themeColors={{ light: '#2e9fe0', dark: '#07090d' }} />
{@render children()}

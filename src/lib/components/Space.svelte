<script lang="ts">
	export let player: 'x' | 'o' | ''; // TODO mayber never empty string?
	export let status: 'alive' | 'dying' | 'dead';

	const statusClasses = {
		alive: 1,
		dying: 0.3,
		dead: 0
	};

	import LED from '$lib/components/LED.svelte';
</script>

<LED {player} brightness={statusClasses[status]}></LED>

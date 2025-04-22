<script>
	import { board, dying, gameWon, handleClick } from '$lib/stores/gameStore';
	import Space from './Space.svelte';
</script>

<div class="relative w-full max-w-xl aspect-square">
	<svg
		class="absolute inset-0 z-0 w-full h-full"
		viewBox="0 0 300 300"
		stroke="currentColor"
		stroke-width="6"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M100 10 v280" />
		<path d="M200 10 v280" />
		<path d="M10 100 h280" />
		<path d="M10 200 h280" />
	</svg>

	{#if $gameWon}
		<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
			<h2 class="text-9xl font-bold text-white">{$gameWon.toLocaleUpperCase()} Wins!</h2>
		</div>
	{/if}

	<div class="grid grid-cols-3 grid-rows-3 w-full h-full relative z-10">
		{#each $board as space, i}
			<button
				class="flex items-center justify-center w-full h-full"
				on:click={() => handleClick(i)}
			>
				<Space player={space} status={i === $dying ? 'dying' : 'alive'} />
			</button>
		{/each}
	</div>
</div>

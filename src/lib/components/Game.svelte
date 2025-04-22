<script>
	import { board, dying, gameWon, handleClick } from '$lib/stores/gameStore';
	import Space from './Space.svelte';
</script>

<div class="relative mx-auto aspect-square w-[min(100vw,100vh)]">
	<!-- Board lines -->
	<svg
		class="absolute inset-0 z-0 h-full w-full"
		viewBox="0 0 300 300"
		preserveAspectRatio="xMidYMid meet"
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
			<h2 class="text-7xl font-bold text-white">
				{$gameWon.toLocaleUpperCase()} Wins!
			</h2>
		</div>
	{/if}

	<div class="relative z-10 grid h-full w-full grid-cols-3 grid-rows-3">
		{#each $board as space, i}
			<button
				class="flex h-full w-full items-center justify-center"
				on:click={() => handleClick(i)}
			>
				<Space player={space} status={i === $dying ? 'dying' : 'alive'} />
			</button>
		{/each}
	</div>
</div>

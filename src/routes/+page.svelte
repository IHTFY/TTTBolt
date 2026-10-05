<script lang="ts">
	import Game from '$lib/components/Game.svelte';
	import LightSwitch from '$lib/components/LightSwitch.svelte';
	import { gameState, gameWon } from '$lib/stores/gameStore';
</script>

<svelte:head>
	<title>Tic-Tac-Toe Bolt</title>
</svelte:head>

<main>
	<!-- decorative swooshes, as on the box art -->
	<svg class="swoosh" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
		<path d="M-10 78 C 20 60, 45 95, 70 72 S 105 40, 115 55" />
		<path d="M60 -5 C 75 15, 95 10, 110 25" />
	</svg>

	<!-- the room itself going dark; the board's LEDs sit above this -->
	<div class="room" aria-hidden="true"></div>

	<header>
		<h1>Infinite Tic-Tac-Toe</h1>
		<p class="status" aria-live="polite">
			{#if $gameWon}
				<span class={$gameWon}>{$gameWon.toUpperCase()}</span> wins! Tap to play again
			{:else}
				<span class={$gameState.turn}>{$gameState.turn.toUpperCase()}</span> to move · only 3 marks each
			{/if}
		</p>
	</header>

	<div class="stage">
		<div class="device-wrap">
			<Game />
		</div>
	</div>

	<LightSwitch />

	<a class="support" href="https://ihtfy.com/support/" target="_blank" rel="noopener">Support ♥</a>
</main>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		height: 100%;
		overflow: hidden;
		overscroll-behavior: none;
		background: #2e9fe0;
	}
	main {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: max(12px, env(safe-area-inset-top)) 16px max(10px, env(safe-area-inset-bottom));
		box-sizing: border-box;
		background: radial-gradient(120% 90% at 50% 40%, #3cb0ee 0%, #2e9fe0 55%, #2386c7 100%);
		font-family: 'Nunito', system-ui, sans-serif;
		color: #fff;
		overflow: hidden;
		touch-action: manipulation;
	}
	.swoosh {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		fill: none;
		stroke: #f2cf1d;
		stroke-width: 9;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}
	.swoosh path {
		vector-effect: non-scaling-stroke;
		stroke-width: clamp(28px, 7vmin, 70px);
	}
	.room {
		position: absolute;
		inset: 0;
		background: #020306;
		opacity: 0;
		pointer-events: none;
		transition: opacity 160ms ease-out;
	}
	:global(.dark) .room {
		opacity: 0.84;
	}
	header,
	.stage {
		position: relative;
	}
	header {
		transition: opacity 160ms;
	}
	:global(.dark) header {
		opacity: 0.35;
	}
	.support {
		position: fixed;
		left: max(16px, env(safe-area-inset-left));
		bottom: max(16px, env(safe-area-inset-bottom));
		z-index: 10;
		padding: 4px 0;
		font-weight: 700;
		font-size: clamp(0.8rem, 2.2vmin, 1rem);
		color: #fff;
		opacity: 0.75;
		text-decoration: none;
		transition: opacity 160ms;
	}
	.support:hover,
	.support:focus-visible {
		opacity: 1;
		text-decoration: underline;
	}
	:global(.dark) .support {
		opacity: 0.35;
	}
	header {
		text-align: center;
		flex: none;
	}
	h1 {
		margin: 0;
		font-weight: 800;
		font-size: clamp(1.25rem, 4.5vmin, 2.2rem);
		letter-spacing: 0.01em;
		text-shadow: 0 2px 0 rgba(0, 0, 0, 0.12);
	}
	.status {
		margin: 0.2em 0 0;
		font-weight: 600;
		font-size: clamp(0.9rem, 2.8vmin, 1.25rem);
	}
	.status span {
		display: inline-block;
		min-width: 1.6em;
		padding: 0 0.35em;
		border-radius: 0.4em;
		background: #111;
		font-weight: 800;
	}
	.status .x {
		color: #ff6a3d;
	}
	.status .o {
		color: #3fb2ff;
	}
	.stage {
		flex: 1;
		min-height: 0;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		container-type: size;
	}
	.device-wrap {
		/* keep the 400:460 device fully visible in whatever space is left */
		width: min(100cqw, 100cqh * 400 / 460, 640px);
		aspect-ratio: 400 / 460;
	}
</style>

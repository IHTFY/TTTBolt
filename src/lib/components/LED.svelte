<script lang="ts">
	// A single lit mark, drawn centred on (0, 0) inside the device SVG.
	let {
		player,
		status = 'alive'
	}: {
		player: 'x' | 'o';
		status?: 'alive' | 'dying' | 'win' | 'lose';
	} = $props();

	const colors = {
		x: { lit: '#ff5a2c', dim: '#6d2616' },
		o: { lit: '#2ea8ff', dim: '#17405f' }
	};
	let color = $derived(status === 'dying' ? colors[player].dim : colors[player].lit);
</script>

{#if status !== 'dying'}
	<circle class="spill {status}" r="58" fill="url(#spill-{player})" />
{/if}
<g class="led {status}" stroke={color} fill="none" stroke-width="9">
	{#if player === 'x'}
		<g stroke-linecap="butt">
			<path d="M-30 -30 L30 30" />
			<path d="M30 -30 L-30 30" />
		</g>
	{:else}
		<!-- ring split into four arcs, gaps on the diagonals -->
		<path d="M25.56 -19.26 A32 32 0 0 1 25.56 19.26" />
		<path d="M19.26 25.56 A32 32 0 0 1 -19.26 25.56" />
		<path d="M-25.56 19.26 A32 32 0 0 1 -25.56 -19.26" />
		<path d="M-19.26 -25.56 A32 32 0 0 1 19.26 -25.56" />
	{/if}
</g>

<style>
	.led {
		pointer-events: none;
		animation: pop 140ms ease-out;
		transform-box: fill-box;
		transform-origin: center;
		transition: stroke 250ms;
	}
	.led:not(.dying) {
		filter: url(#glow);
	}
	:global(.dark) .led:not(.dying) {
		filter: url(#bloom);
	}
	.dying {
		animation: none;
	}
	.spill {
		pointer-events: none;
		opacity: 0;
		transition: opacity 160ms;
	}
	:global(.dark) .spill {
		opacity: 1;
	}
	:global(.dark) .spill.lose {
		opacity: 0.18;
	}
	:global(.dark) .spill.win {
		animation: blink 0.55s steps(1, end) infinite;
	}
	.led.lose {
		opacity: 0.18;
		transition: opacity 400ms;
	}
	.led.win {
		animation: blink 0.55s steps(1, end) infinite;
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.85);
		}
	}
	@keyframes blink {
		50% {
			opacity: 0.15;
		}
	}
</style>

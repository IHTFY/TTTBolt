<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { adFits, adForScreen, type AdSize } from '$lib/adScreens';
	import { buyer, playAdIsStale, recheckBuyer } from '$lib/ads';
	import AdSlot from '$lib/components/AdSlot.svelte';
	import Game from '$lib/components/Game.svelte';
	import LightSwitch from '$lib/components/LightSwitch.svelte';
	import PlayAd from '$lib/components/PlayAd.svelte';
	import { board, gameState, gameWon, handleReset } from '$lib/stores/gameStore';

	// The Play again button leaves the page with the result, which would drop keyboard focus to the
	// top of the document. Focus goes to the first cell of the new board instead.
	async function playAgain() {
		handleReset();
		await tick();
		document.querySelector<SVGElement>('[role="button"][aria-label^="Cell 1:"]')?.focus();
	}

	// One ad per win during this visit. Opening the page on a saved win shows no ad: `won` starts
	// undefined, so that first value isn't counted. The box's size is chosen once, as the win
	// appears, so a browser bar sliding away doesn't swap the box for a new one. A window too small
	// for the results layout with a box, an offline visit (no ad can be requested), or a buyer of
	// ad-free gets no box and the plain screen. A saved ad-free token counts as a purchase until the
	// loader has checked it; if it rejects the token while the win is showing, the box comes then,
	// and if it accepts a token saved during the visit, the box goes.
	let wins = 0;
	let won: typeof $gameWon | undefined;
	// The box this win could get, chosen as it appears from the window and the connection then, so
	// reconnecting, going offline or turning the phone before the loader answers doesn't change it.
	// A new game clears it.
	let winSize: AdSize | null = null;
	// The box this win has, with the key its ad is asked for under. The two are set together and
	// cleared with the win, so the next win's box never starts out with this one's key or size.
	let box = $state<{ key: string; size: AdSize } | null>(null);
	$effect(() => {
		const winner = $gameWon;
		const isBuyer = $buyer;
		untrack(() => {
			if (winner && won === null) {
				wins++;
				winSize = adForScreen('results', {
					buyer: false,
					online: navigator.onLine,
					width: innerWidth,
					height: innerHeight
				});
				// Ad-free may have been bought in another tab since the last check, or that check may not
				// have reached the loader. The verdict changes `$buyer`, which runs this effect again.
				recheckBuyer();
			}
			if (!winner) winSize = null;
			won = winner;
			// A box needs a connection when it is added, since no ad can be requested offline.
			box = winSize && !isBuyer && navigator.onLine ? { key: `win-${wins}`, size: winSize } : null;
		});
	});
	// The results layout goes as soon as the board resets, before the effect above has run.
	const ad = $derived($gameWon ? box : null);

	// The ad on screen stays as it is, and a new one is never asked for because the window changed. If
	// the window turns too small for that box (a phone on its side), the box is hidden, label and all,
	// so it neither breaks the layout nor covers the board; it comes back if the window grows again.
	let innerWidth = $state(0);
	let innerHeight = $state(0);
	const adFitsNow = $derived(ad ? adFits(ad.size, innerWidth, innerHeight) : false);

	// A new game, when the board empties, gets a new ad beside it, unless the last one is under a
	// minute old: games can be that quick.
	let playAd = $state(0);
	let empty: boolean | undefined;
	$effect(() => {
		const now = $board.every((cell) => cell === null);
		if (now && empty === false && playAdIsStale()) playAd++;
		empty = now;
	});
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<svelte:head>
	<title>Tic-Tac-Toe Bolt</title>
</svelte:head>

<main class:scrolls={ad}>
	<!-- decorative swooshes, as on the box art -->
	<svg class="swoosh" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
		<path d="M-10 78 C 20 60, 45 95, 70 72 S 105 40, 115 55" />
		<path d="M60 -5 C 75 15, 95 10, 110 25" />
	</svg>

	<!-- the room itself going dark; the board's LEDs sit above this -->
	<div class="room" aria-hidden="true"></div>

	<div class="frame">
		<div class="play">
			<header>
				<h1>Infinite Tic-Tac-Toe</h1>
				<p class="status" aria-live="polite">
					{#if $gameWon}
						<span class={$gameWon}>{$gameWon.toUpperCase()}</span> wins!{ad
							? ''
							: ' Press the reset button to play again'}
					{:else}
						<span class={$gameState.turn}>{$gameState.turn.toUpperCase()}</span> to move · only 3 marks
						each
					{/if}
				</p>
			</header>

			<div class="stage">
				<div class="device-wrap">
					<Game />
				</div>
			</div>
		</div>

		<PlayAd game={playAd} hidden={!!ad} />
	</div>

	<!-- More games belongs to the play screen's footer; a win screen, with an ad or without, links
	     only Privacy. -->
	{#snippet links()}
		<nav class="links">
			{#if !$gameWon}
				<a href="https://ihtfy.com/projects/" target="_blank" rel="noopener">More games</a>
			{/if}
			<a href="https://ihtfy.com/privacy/" target="_blank" rel="noopener">Privacy</a>
		</nav>
	{/snippet}

	{#if ad}
		<!-- Everything to press comes before the ad, so no control sits beside it or past it. -->
		<div class="results">
			<div class="controls">
				<button class="again" onclick={playAgain}>Play again</button>
				<LightSwitch inline />
			</div>
			<AdSlot adKey={ad.key} size={ad.size} {links} hidden={!adFitsNow} />
		</div>
	{:else}
		<LightSwitch />
		<div class="pinned">{@render links()}</div>
	{/if}
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
	/* The results screen fits the window it was made for. If the window shrinks after (a phone turned
	   on its side), it scrolls rather than clips the ad. The scrollbar stays hidden so it can't narrow the page. */
	main.scrolls {
		overflow-y: auto;
		scrollbar-width: none;
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
	/* The board's column, with the ad beside it on wide windows; the two stay centered together. */
	.frame {
		flex: 1;
		min-height: 0;
		width: 100%;
		display: grid;
		grid-template-columns: minmax(0, 640px) auto;
		justify-content: center;
	}
	.play {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 0;
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
	/* The links take their own row under the board, so larger text or a short window shrinks the
	   board instead of letting a link cover its New game control. */
	.pinned {
		position: relative;
		flex: none;
		align-self: flex-start;
		margin-left: max(0px, env(safe-area-inset-left));
		z-index: 10;
	}
	.links {
		display: flex;
		gap: 12px;
		font-weight: 700;
		font-size: clamp(0.8rem, 2.2vmin, 1rem);
		opacity: 0.75;
		transition: opacity 160ms;
	}
	.links a {
		padding: 4px 0;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
		color: #fff;
		text-decoration: none;
	}
	.links:hover,
	.links:focus-within {
		opacity: 1;
	}
	.links a:hover,
	.links a:focus-visible {
		text-decoration: underline;
	}
	:global(.dark) .links {
		opacity: 0.35;
	}
	header {
		text-align: center;
		flex: none;
	}
	/* The results screen: the board shrinks to what the buttons, links and box leave. It sits above
	   the swooshes and the dark room, so nothing draws over the ad. */
	.results {
		position: relative;
		z-index: 2;
		flex: none;
		width: 100%;
		display: grid;
		justify-items: center;
	}
	.controls {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 16px;
		width: min(100%, 340px);
		margin-bottom: 8px;
	}
	/* Left-aligned at the width of the controls, so the loader's "Remove ads" link joining the row moves nothing. */
	.results .links {
		width: min(100%, 340px);
	}
	.again {
		height: 44px;
		border: 0;
		border-radius: 22px;
		background: #111;
		color: #fff;
		font: inherit;
		font-weight: 800;
		font-size: 1rem;
		cursor: pointer;
		box-shadow: 0 2px 0 rgba(0, 0, 0, 0.18);
	}
	.again:active {
		transform: translateY(1px);
	}
	.again:focus-visible {
		outline: 2px solid #fff;
		outline-offset: 3px;
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

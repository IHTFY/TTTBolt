<script module lang="ts">
	// Counts the boxes made on this page, so each gets its own key and so its own ad.
	let made = 0;
</script>

<script lang="ts">
	import { PLAY_AD_SLOT, buyer, showPlayAd } from '$lib/ads';

	// A new box, so a new ad, comes only with a new `game` or a new size, never on a timer.
	let { game }: { game: number } = $props();

	// A saved token counts as a purchase until the loader has checked it, so a buyer never sees a box
	// appear; a token the loader rejects brings the box back.
	// The slot's width from the styles below: 160 or 300, or 0 where the ad doesn't fit.
	let width = $state(0);

	function ad(box: HTMLElement) {
		showPlayAd(box, `play/${++made}`);
	}
</script>

<!-- Beside the board, 150px or more from it and from the light switch; the slot keeps its size whether or not an ad fills it. -->
<aside>
	<p>Advertisements</p>
	<div class="slot" bind:clientWidth={width}>
		{#if width && !$buyer}
			{#key `${width}/${game}`}
				<div
					class="box"
					style:width="{width}px"
					data-ad-slot={PLAY_AD_SLOT}
					data-ad-size="{width}x600"
					use:ad
				></div>
			{/key}
		{/if}
	</div>
	<a href="https://ihtfy.com/privacy/" target="_blank" rel="noopener">Privacy</a>
</aside>

<style>
	/* Only on windows wide enough to keep the board's size and both 150px gaps.
	   It sits above the swooshes and the dark room, so nothing draws over the ad.
	   A page with a saved token never lays it out until the loader rejects the token: app.html marks it
	   before the first paint, and the loader's check takes the mark off again.
	   The text keeps to the left edge, so a font swap or the loader's "Remove ads"
	   link can't move it. */
	aside {
		display: none;
		position: relative;
		align-self: center;
		justify-items: start;
		gap: 6px;
		margin-left: 150px;
		font-size: 0.75rem;
		font-weight: 600;
	}
	@media (min-width: 1390px) and (min-height: 700px) {
		aside {
			display: grid;
		}
	}
	:global(html.ad-free) aside {
		display: none;
	}
	.slot {
		width: 160px;
		height: 600px;
		min-height: 600px;
	}
	@media (min-width: 1530px) and (min-height: 700px) {
		.slot {
			width: 300px;
		}
	}
	.box {
		height: 600px;
		min-height: 600px;
	}
	p {
		margin: 0;
		opacity: 0.75;
	}
	a {
		color: #fff;
		opacity: 0.75;
	}
</style>

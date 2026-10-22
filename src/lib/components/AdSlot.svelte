<script lang="ts">
	import { AD_SLOT, showAd } from '$lib/ads';

	let { adKey }: { adKey: string } = $props();

	function ad(box: HTMLElement) {
		showAd(box, adKey);
	}
</script>

<!-- Just below the first screen, at least 150px from the board; the box keeps its size whether or not an ad fills it. -->
<aside>
	<p>Advertisements</p>
	<div class="box" data-ad-slot={AD_SLOT} use:ad></div>
	<a href="https://ihtfy.com/privacy" target="_blank" rel="noopener">Privacy</a>
</aside>

<style>
	aside {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 150px 16px 24px;
		font-size: 0.75rem;
		font-weight: 600;
	}
	p {
		margin: 0;
		opacity: 0.75;
	}
	.box {
		width: 300px;
		height: 250px;
		min-height: 250px;
	}
	a {
		color: #fff;
		opacity: 0.75;
	}
</style>

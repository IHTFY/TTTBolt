<script lang="ts">
	import type { Snippet } from 'svelte';
	import { AD_SLOT, showAd } from '$lib/ads';
	import type { AdSize } from '$lib/adScreens';

	let { adKey, size, links }: { adKey: string; size: AdSize; links: Snippet } = $props();
	const [width, height] = size.split('x');

	function ad(box: HTMLElement) {
		showAd(box, adKey);
	}
</script>

<!-- The links come first and the box last, 50px or more below them, so no control sits next to the ad
     or on its far side; the shared loader adds "Remove ads" beside the Privacy link in here. The box
     keeps its size whether or not an ad fills it. -->
<aside>
	{@render links()}
	<div class="ad">
		<p>Advertisements</p>
		<div
			class="box"
			style:width="{width}px"
			style:height="{height}px"
			style:min-height="{height}px"
			data-ad-slot={AD_SLOT}
			data-ad-size={size}
			use:ad
		></div>
	</div>
</aside>

<style>
	aside {
		display: grid;
		justify-items: center;
		font-size: 0.75rem;
		font-weight: 600;
	}
	.ad {
		display: grid;
		justify-items: center;
		gap: 6px;
		margin-top: 32px;
	}
	p {
		margin: 0;
		line-height: 16px;
		opacity: 0.75;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
	}
</style>

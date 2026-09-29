<script lang="ts">
	import { mode, toggleMode } from 'mode-watcher';

	let lightsOn = $derived($mode !== 'dark');

	function flip() {
		if (!lightsOn) {
			// lights coming back on: let the room flicker like real tubes
			const root = document.documentElement;
			root.classList.add('flicker');
			setTimeout(() => root.classList.remove('flicker'), 700);
		}
		toggleMode();
	}
</script>

<button
	class="switch"
	class:off={!lightsOn}
	onclick={flip}
	aria-label={lightsOn ? 'Turn the lights off' : 'Turn the lights on'}
	aria-pressed={!lightsOn}
>
	<svg viewBox="0 0 48 72" aria-hidden="true">
		<rect class="plate" x="1" y="1" width="46" height="70" rx="7" />
		<circle class="screw" cx="24" cy="7" r="2" />
		<circle class="screw" cx="24" cy="65" r="2" />
		<rect class="well" x="12" y="15" width="24" height="42" rx="4" />
		<g class="rocker">
			<rect class="rocker-face" x="14" y="17" width="20" height="38" rx="3" />
			<rect class="rocker-shade" x="14" y="36" width="20" height="19" rx="3" />
		</g>
		<rect class="shade" x="0" y="0" width="48" height="72" rx="8" />
		<circle class="locator" cx="24" cy="46" r="1.8" />
	</svg>
</button>

<style>
	.switch {
		position: fixed;
		right: max(14px, env(safe-area-inset-right));
		bottom: max(14px, env(safe-area-inset-bottom));
		z-index: 10;
		width: clamp(40px, 7vmin, 56px);
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
	.switch:focus-visible {
		outline: 2px solid #fff;
		outline-offset: 4px;
		border-radius: 8px;
	}
	svg {
		display: block;
		width: 100%;
		filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.25));
		transition: filter 160ms;
	}
	.plate {
		fill: #f6f5f1;
		stroke: #d9d7d0;
	}
	.screw {
		fill: #cfcdc6;
	}
	.well {
		fill: #d6d4cd;
	}
	.rocker-face {
		fill: #fdfcf9;
	}
	.rocker-shade {
		fill: #e4e2dc;
		transition: transform 90ms;
	}
	/* flipped down: shading moves to the top half */
	.off .rocker-shade {
		transform: translateY(-19px);
	}
	.locator {
		fill: #9fd49a;
		opacity: 0;
		transition: opacity 160ms;
	}
	.shade {
		fill: #020306;
		opacity: 0;
		transition: opacity 160ms;
	}
	.off .shade {
		opacity: 0.8;
	}
	.off svg {
		filter: none;
	}
	/* the only thing on the plate that glows in the dark */
	.off .locator {
		opacity: 1;
		fill: #9dff8f;
		filter: drop-shadow(0 0 2.5px #6dff5c);
	}
</style>

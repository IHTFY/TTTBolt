<script lang="ts">
	import {
		board,
		dying,
		gameWon,
		handleClick,
		handleReset,
		gameState,
		winningLine
	} from '$lib/stores/gameStore';
	import LED from './LED.svelte';

	// cell centres on the 400 x 460 device canvas
	const cells = Array.from({ length: 9 }, (_, i) => ({
		x: 100 + (i % 3) * 100,
		y: 95 + Math.floor(i / 3) * 100
	}));

	// black glass face: rounded square with gently pinched sides
	const face =
		'M83 30 C140 30 160 39 200 39 C240 39 260 30 317 30 A48 48 0 0 1 365 78 ' +
		'C365 135 356 155 356 195 C356 235 365 255 365 312 A48 48 0 0 1 317 360 ' +
		'C260 360 240 351 200 351 C160 351 140 360 83 360 A48 48 0 0 1 35 312 ' +
		'C35 255 44 235 44 195 C44 155 35 135 35 78 A48 48 0 0 1 83 30 Z';

	function tap(i: number) {
		if ($gameWon) handleReset();
		else handleClick(i);
	}

	function state(i: number): 'alive' | 'dying' | 'win' | 'lose' {
		if ($winningLine) return $winningLine.includes(i) ? 'win' : 'lose';
		return i === $dying ? 'dying' : 'alive';
	}
</script>

<svg
	class="device"
	viewBox="0 0 400 460"
	xmlns="http://www.w3.org/2000/svg"
	role="application"
	aria-label="Tic-Tac-Toe Bolt board"
>
	<defs>
		<linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#ffe44d" />
			<stop offset="1" stop-color="#f5c800" />
		</linearGradient>
		<linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#f0a53a" />
			<stop offset="0.5" stop-color="#e98a2c" />
			<stop offset="1" stop-color="#d9731f" />
		</linearGradient>
		<radialGradient id="glass" cx="0.35" cy="0.2" r="1">
			<stop offset="0" stop-color="#26262a" />
			<stop offset="0.55" stop-color="#101012" />
			<stop offset="1" stop-color="#050506" />
		</radialGradient>
		<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#fff" stop-opacity="0.09" />
			<stop offset="0.45" stop-color="#fff" stop-opacity="0.02" />
			<stop offset="0.46" stop-color="#fff" stop-opacity="0" />
		</linearGradient>
		<linearGradient id="line" gradientUnits="userSpaceOnUse" x1="60" y1="55" x2="340" y2="335">
			<stop offset="0" stop-color="#fafafa" />
			<stop offset="1" stop-color="#cfcfd2" />
		</linearGradient>
		<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
			<feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#0b3a66" flood-opacity="0.45" />
		</filter>
		<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
			<feMerge>
				<feMergeNode in="b" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
		<clipPath id="faceClip"><path d={face} /></clipPath>
	</defs>

	<!-- shell: orange base rim + yellow top -->
	<g filter="url(#shadow)">
		<rect x="10" y="22" width="380" height="424" rx="78" fill="url(#rim)" />
		<rect x="10" y="10" width="380" height="420" rx="78" fill="url(#body)" />
		<rect
			x="14"
			y="13"
			width="372"
			height="412"
			rx="75"
			fill="none"
			stroke="#fff6b0"
			stroke-opacity="0.7"
			stroke-width="3"
		/>
	</g>

	<!-- glass face -->
	<path d={face} fill="#c9a400" transform="translate(0 2)" />
	<path d={face} fill="url(#glass)" />
	<rect x="35" y="30" width="330" height="330" fill="url(#gloss)" clip-path="url(#faceClip)" />

	<!-- grid -->
	<g stroke="url(#line)" stroke-width="7" stroke-linecap="round">
		<path d="M150 58 V332" />
		<path d="M250 58 V332" />
		<path d="M62 145 H338" />
		<path d="M62 245 H338" />
	</g>

	<!-- marks -->
	{#each $board as player, i}
		{#if player}
			<g transform="translate({cells[i].x} {cells[i].y})">
				<LED {player} status={state(i)} />
			</g>
		{/if}
	{/each}

	<!-- touch targets -->
	{#each cells as c, i}
		<rect
			class="cell"
			x={c.x - 50}
			y={c.y - 50}
			width="100"
			height="100"
			fill="transparent"
			role="button"
			tabindex="0"
			aria-label="Cell {i + 1}: {$board[i] ?? 'empty'}"
			onclick={() => tap(i)}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && tap(i)}
		/>
	{/each}

	<!-- turn indicator LED -->
	<g transform="translate(66 398)">
		<circle r="9" fill="#2a2a2a" />
		<circle
			r="6"
			fill={$gameState.turn === 'x' ? '#ff5a2c' : '#2aa3ff'}
			filter="url(#glow)"
			opacity={$gameWon ? 0.25 : 1}
		/>
	</g>

	<!-- logo -->
	<text x="200" y="408" text-anchor="middle" class="logo">GiiKER</text>

	<!-- reset button -->
	<g
		class="btn"
		role="button"
		tabindex="0"
		aria-label="New game"
		transform="translate(334 398)"
		onclick={handleReset}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleReset()}
	>
		<rect x="-30" y="-24" width="60" height="48" fill="transparent" />
		<circle r="15" fill="#e3b400" />
		<circle r="13" fill="#2b2b2b" />
		<path
			d="M5 -3.5 A6.5 6.5 0 1 0 6 3"
			fill="none"
			stroke="#e8e8e8"
			stroke-width="2.2"
			stroke-linecap="round"
		/>
		<path d="M6.8 -8 L6.8 -2.2 L1.2 -3.2 Z" fill="#e8e8e8" />
	</g>
</svg>

<style>
	.device {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
		touch-action: manipulation;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
	}
	.cell,
	.btn {
		cursor: pointer;
		outline: none;
	}
	.cell:focus-visible {
		stroke: #ffffff55;
		stroke-width: 3;
	}
	.btn:active {
		transform: translate(334px, 399px) scale(0.92);
	}
	.logo {
		font-family: 'Nunito', 'Arial Rounded MT Bold', system-ui, sans-serif;
		font-weight: 800;
		font-size: 22px;
		letter-spacing: 1.5px;
		fill: #3a3a3a;
	}
</style>

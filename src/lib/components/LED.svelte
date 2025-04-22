<script lang="ts">
	export let player: 'x' | 'o' | '';
	export let brightness = 1;
</script>

<div
	class={`
    flex h-full 
    w-full items-center justify-center 
    p-2
    drop-shadow-[0_0_0.5rem_${player === 'x' ? 'rgba(255,0,0,1)' : 'rgba(0,0,255,1)'}]
  `}
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="h-full w-full"
		viewBox="0 0 200 200"
		preserveAspectRatio="xMidYMid meet"
		fill="none"
		stroke="currentColor"
		stroke-width="12"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity={brightness}
	>
		<!-- X -->
		<g stroke={player === 'x' ? 'red' : 'none'}>
			<path d="M140 60 60 140" />
			<path d="m60 60 80 80" />
		</g>
		<!-- O -->
		<g stroke={player === 'o' ? 'blue' : 'none'}>
			<path d="M60 130a50 50 0 0 1 0-60" />
			<path d="M70 60a50 50 0 0 1 60 0" />
			<path d="M130 140a50 50 0 0 1-60 0" />
			<path d="M140 70a50 50 0 0 1 0 60" />
		</g>
	</svg>
</div>

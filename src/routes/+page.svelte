<script lang="ts">
	import Game from '$lib/components/Game.svelte';
	import Moon from 'lucide-svelte/icons/moon';
	import Sun from 'lucide-svelte/icons/sun';

	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { handleLoad, handleReset } from '$lib/stores/gameStore';
	import { resetMode, setMode } from 'mode-watcher';
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger asChild let:builder>
		<Button builders={[builder]} variant="outline" size="icon">
			<Sun
				class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
			/>
			<Moon
				class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
			/>
			<span class="sr-only">Toggle theme</span>
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Item on:click={() => setMode('light')}>Light</DropdownMenu.Item>
		<DropdownMenu.Item on:click={() => setMode('dark')}>Dark</DropdownMenu.Item>
		<DropdownMenu.Item on:click={() => resetMode()}>System</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<div class="center flex flex-col items-center justify-center">
	<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Tic Tac Toe Bolt</h1>
	<p class="leading-7 [&:not(:first-child)]:my-4">
		Based on <a
			class="text-primary font-medium underline underline-offset-4"
			href="https://www.giiker.com/products/tic-tac-toe-bolt">Tic-Tac-Toe Bolt</a
		> from GiiKER
	</p>
</div>

<div class="justify-center flex flex-col items-center my-4">
	<div class="flex gap-2 mb-4">
		<Button on:click={handleReset}>New Game</Button>
		<!-- <Button on:click={handleLoad}>Load Example</Button> -->
	</div>

	<Game />
</div>

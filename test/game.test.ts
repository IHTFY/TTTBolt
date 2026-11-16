// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const wonGame = { x: [0, 4, 8], o: [1, 3, 7], turn: 'o', winner: 'x' };

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
});

describe('board on the win screen', () => {
	it('keeps the finished game when a cell is tapped, and the reset button starts a new one', async () => {
		vi.resetModules();
		vi.stubGlobal('localStorage', {
			getItem: () => JSON.stringify(wonGame),
			setItem: () => {}
		});
		// Svelte is imported after the module reset so the component and `mount` share one runtime.
		const { flushSync, mount, unmount } = await import('svelte');
		const store = await import('../src/lib/stores/gameStore');
		const { default: Game } = await import('../src/lib/components/Game.svelte');
		const app = mount(Game, { target: document.body });
		flushSync();

		const cells = document.querySelectorAll<SVGElement>('rect.cell');
		expect(cells.length).toBe(9);
		cells[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
		cells[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();
		expect(get(store.gameState)).toEqual(wonGame);

		document
			.querySelector('[aria-label="New game"]')!
			.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();
		expect(get(store.gameState).winner).toBeNull();
		unmount(app);
	});
});

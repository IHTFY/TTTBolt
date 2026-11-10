// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

async function loadStore(storage: Storage) {
	vi.resetModules();
	vi.stubGlobal('localStorage', storage);
	return import('../src/lib/stores/gameStore');
}

function blocked(): never {
	throw new DOMException('denied', 'SecurityError');
}

const failing: Record<string, Storage> = {
	'storage blocked (getItem throws)': { getItem: blocked, setItem: () => {} },
	'saved value cut short': { getItem: () => '{"x":[0,1', setItem: () => {} },
	'saved value is null': { getItem: () => 'null', setItem: () => {} },
	'saved value is a number': { getItem: () => '7', setItem: () => {} },
	'saved value has the wrong shape': {
		getItem: () => '{"x":"abc","o":[],"turn":"z","winner":null}',
		setItem: () => {}
	},
	'write throws': {
		getItem: () => null,
		setItem: () => {
			throw new DOMException('full', 'QuotaExceededError');
		}
	}
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('game store with unusable storage', () => {
	for (const [name, storage] of Object.entries(failing)) {
		it(`starts fresh and plays a move: ${name}`, async () => {
			const m = await loadStore(storage);
			expect(get(m.gameState)).toEqual({
				x: [null, null, null],
				o: [null, null, null],
				turn: 'x',
				winner: null
			});
			m.handleClick(4);
			expect(get(m.board)).toEqual([null, null, null, null, 'x', null, null, null, null]);
			expect(get(m.gameState).turn).toBe('o');
		});
	}
});

describe('game store with saved games', () => {
	const saves = {
		'a new game': { x: [null, null, null], o: [null, null, null], turn: 'x', winner: null },
		'after one move': { x: [null, null, 4], o: [null, null, null], turn: 'o', winner: null },
		'after two moves': { x: [null, null, 4], o: [null, null, 0], turn: 'x', winner: null },
		'a full board': { x: [2, 5, 6], o: [1, 3, 7], turn: 'x', winner: null },
		'a won game': { x: [0, 4, 8], o: [1, 3, 7], turn: 'o', winner: 'x' }
	};
	for (const [name, saved] of Object.entries(saves)) {
		it(`keeps ${name}`, async () => {
			const m = await loadStore({
				getItem: (k) => (k === 'gameState' ? JSON.stringify(saved) : null),
				setItem: () => {}
			});
			expect(get(m.gameState)).toEqual(saved);
		});
	}

	it('saves each move', async () => {
		const setItem = vi.fn();
		const m = await loadStore({ getItem: () => null, setItem });
		m.handleClick(0);
		const last = JSON.parse(setItem.mock.calls.at(-1)![1]);
		expect(last.x).toEqual([null, null, 0]);
	});
});

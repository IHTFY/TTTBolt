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

function memoryStorage(entries: Record<string, string>) {
	const data = new Map(Object.entries(entries));
	return {
		data,
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, v)
	};
}

describe('game store when a read fails', () => {
	it('leaves the saved game alone', async () => {
		const saved = '{"x":[null,null,4],"o":[null,null,null],"turn":"o","winner":null}';
		const storage = memoryStorage({ gameState: saved });
		const getItem = storage.getItem;
		let fail = true;
		storage.getItem = (k) => {
			if (fail) {
				fail = false;
				blocked();
			}
			return getItem(k);
		};
		const m = await loadStore(storage);
		expect(get(m.gameState).x).toEqual([null, null, null]);
		expect(storage.data.get('gameState')).toBe(saved);
	});
});

describe('game store with impossible saved positions', () => {
	const impossible = {
		'both sides on one cell': { x: [0, 0, 0], o: [0, 0, 0], turn: 'x', winner: null },
		'one side twice on a cell': { x: [null, 4, 4], o: [null, 0, 1], turn: 'x', winner: null },
		'X and O on the same cell': { x: [null, null, 4], o: [null, null, 4], turn: 'x', winner: null },
		'O moved first': { x: [null, null, null], o: [null, null, 4], turn: 'x', winner: null },
		'X two moves ahead': { x: [0, 1, 5], o: [null, null, 8], turn: 'o', winner: null },
		'X to move after X moved': {
			x: [null, null, 4],
			o: [null, null, null],
			turn: 'x',
			winner: null
		},
		'O to move on an empty board': {
			x: [null, null, null],
			o: [null, null, null],
			turn: 'o',
			winner: null
		},
		'an empty slot after a mark': {
			x: [4, null, null],
			o: [null, null, null],
			turn: 'o',
			winner: null
		},
		'a line for the side to move': { x: [0, 1, 2], o: [3, 4, 6], turn: 'x', winner: null },
		'lines for both sides': { x: [0, 1, 2], o: [3, 4, 5], turn: 'o', winner: 'x' }
	};
	for (const [name, saved] of Object.entries(impossible)) {
		it(`starts a new game: ${name}`, async () => {
			const m = await loadStore(memoryStorage({ gameState: JSON.stringify(saved) }));
			expect(get(m.gameState)).toEqual({
				x: [null, null, null],
				o: [null, null, null],
				turn: 'x',
				winner: null
			});
		});
	}

	it('reloads every position reached in play exactly', async () => {
		let seed = 20261116;
		const random = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32;
		const storage = memoryStorage({});
		const m = await loadStore(storage);
		const positions = new Set<string>();
		for (let game = 0; game < 20; game++) {
			m.handleReset();
			for (let move = 0; move < 20 && !get(m.gameWon); move++) {
				m.handleClick(Math.floor(random() * 9));
				positions.add(storage.data.get('gameState')!);
			}
		}
		expect(positions.size).toBeGreaterThan(50);
		for (const saved of positions) {
			const reloaded = await loadStore(memoryStorage({ gameState: saved }));
			expect(get(reloaded.gameState), saved).toEqual(JSON.parse(saved));
		}
	}, 20_000);
});

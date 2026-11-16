import { derived, get, writable } from 'svelte/store';

/**
 * Create a writable store that automatically
 * syncs to localStorage under the given key.
 * Storage can be blocked, full, or hold a damaged value; the game must
 * still start, so every storage call is guarded and a saved value is used
 * only if it passes `isValid`.
 * @param {string} key The localStorage key
 * @param {T} initialValue The initial value
 * @param {(value: unknown) => value is T} isValid Accepts a saved value
 */
function createPersistedStore<T>(
	key: string,
	initialValue: T,
	isValid: (value: unknown) => value is T
) {
	// Create a regular writable store
	const store = writable(initialValue);

	// If we're in the browser, sync with localStorage
	if (typeof window !== 'undefined') {
		// 1) On load, pull existing data from localStorage
		try {
			const json = localStorage.getItem(key);
			if (json) {
				const saved: unknown = JSON.parse(json);
				if (isValid(saved)) {
					store.set(saved);
				}
			}
		} catch {
			// Blocked storage or a damaged value: start fresh.
		}

		// 2) Anytime the store changes, save it to localStorage. The first
		// call only repeats the loaded or initial value; skip it so a failed
		// read never overwrites the saved game.
		let first = true;
		store.subscribe((value) => {
			if (first) {
				first = false;
				return;
			}
			try {
				localStorage.setItem(key, JSON.stringify(value));
			} catch {
				// Blocked or full storage: play on without saving.
			}
		});
	}

	return store;
}

type Player = 'x' | 'o';
type GameState = {
	x: (number | null)[];
	o: (number | null)[];
	turn: Player;
	winner: Player | null;
};

const winningCombinations = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6]
];

const isCell = (cell: unknown) =>
	cell === null || (Number.isInteger(cell) && (cell as number) >= 0 && (cell as number) <= 8);

// Moves are appended and the oldest dropped, so empty slots come first.
const isCells = (cells: unknown): cells is (number | null)[] =>
	Array.isArray(cells) &&
	cells.length === 3 &&
	cells.every(isCell) &&
	cells.every((cell, i) => cell !== null || i === 0 || cells[i - 1] === null);

const marks = (cells: (number | null)[]) => cells.filter((cell) => cell !== null);

const hasLine = (cells: (number | null)[]) =>
	winningCombinations.some((combination) => combination.every((index) => cells.includes(index)));

// Accepts only positions a game can reach: X moves first, no cell is used
// twice, and play stops at the first three in a row.
function isGameState(value: unknown): value is GameState {
	if (typeof value !== 'object' || value === null) return false;
	const { x, o, turn, winner } = value as Record<string, unknown>;
	if (
		!isCells(x) ||
		!isCells(o) ||
		(turn !== 'x' && turn !== 'o') ||
		(winner !== null && winner !== 'x' && winner !== 'o')
	) {
		return false;
	}
	const xMarks = marks(x);
	const oMarks = marks(o);
	if (new Set([...xMarks, ...oMarks]).size !== xMarks.length + oMarks.length) return false;
	const countsMatchTurn =
		xMarks.length === oMarks.length
			? turn === 'x' || xMarks.length === 3
			: xMarks.length === oMarks.length + 1 && turn === 'o';
	if (!countsMatchTurn) return false;
	// Only the side that just moved can have a line.
	return !hasLine(turn === 'x' ? x : o);
}

const startState: GameState = {
	x: [null, null, null],
	o: [null, null, null],
	turn: 'x',
	winner: null
};

const exampleState: GameState = {
	x: [2, 5, 6],
	o: [1, 3, 7],
	turn: 'x',
	winner: null
};

// TODO remove example
export const gameState = createPersistedStore('gameState', startState, isGameState);

// derived board from state
export const board = derived(gameState, ($gameState) => {
	const { x, o } = $gameState;
	const board = Array(9).fill(null);
	x.filter((i: number | null): i is number => i !== null).forEach((i: number) => (board[i] = 'x'));
	o.filter((i: number | null): i is number => i !== null).forEach((i: number) => (board[i] = 'o'));
	return board;
});

export const dying = derived(gameState, ($gameState) => {
	const turn = $gameState.turn;
	return $gameState[turn][0];
});

export const handleReset = () => {
	gameState.set(structuredClone(startState));
};
export const handleLoad = () => {
	gameState.set(exampleState);
};
export const handleClick = (index: number) => {
	// check if game over
	const currentWinner = get(gameWon);
	if (currentWinner) {
		return;
	}

	const currentBoard = get(board);
	const currentState = get(gameState);
	if (currentBoard[index] !== null) {
		return;
	}
	const currentTurn = currentState.turn;
	const newState: GameState = {
		...currentState,
		[currentTurn]: [...currentState[currentTurn], index].slice(-3),
		turn: currentTurn === 'x' ? 'o' : 'x'
	};
	gameState.set(newState);
};

export const gameWon = derived(gameState, ($gameState) => {
	let winner: Player | null = null;
	for (const combination of winningCombinations) {
		const xWin = combination.every((index) => $gameState.x.includes(index));
		const oWin = combination.every((index) => $gameState.o.includes(index));
		if (xWin) {
			winner = 'x';
		} else if (oWin) {
			winner = 'o';
		}
	}
	if (winner !== $gameState.winner) {
		gameState.update((state) => ({ ...state, winner }));
	}
	return winner;
});

// indexes of the winning three-in-a-row, if any
export const winningLine = derived(gameState, ($gameState) => {
	for (const combination of winningCombinations) {
		for (const player of ['x', 'o'] as const) {
			if (combination.every((index) => $gameState[player].includes(index))) {
				return combination;
			}
		}
	}
	return null;
});

import { derived, get, writable } from 'svelte/store';

/**
 * Create a writable store that automatically
 * syncs to localStorage under the given key.
 * @param {string} key The localStorage key
 * @param {any} initialValue The initial value
 */
function createPersistedStore(key: string, initialValue: any) {
	// Create a regular writable store
	const store = writable(initialValue);

	// If we're in the browser, sync with localStorage
	if (typeof window !== 'undefined') {
		// 1) On load, pull existing data from localStorage
		const json = localStorage.getItem(key);
		if (json) {
			store.set(JSON.parse(json));
		}

		// 2) Anytime the store changes, save it to localStorage
		store.subscribe((value) => {
			localStorage.setItem(key, JSON.stringify(value));
		});
	}

	return store;
}

const startState = {
	x: [null, null, null],
	o: [null, null, null],
	turn: 'x',
	winner: null
};

let exampleState = {
	x: [2, 5, 6],
	o: [1, 3, 7],
	turn: 'x',
	winner: null
};

// TODO remove example
export const gameState = createPersistedStore('gameState', startState);

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
	const newState = {
		...currentState,
		[currentTurn]: [...currentState[currentTurn], index].slice(-3),
		turn: currentTurn === 'x' ? 'o' : 'x'
	};
	gameState.set(newState);
};

// check for winner and update state
export const gameWon = derived(gameState, ($gameState) => {
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

	let winner = null;
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

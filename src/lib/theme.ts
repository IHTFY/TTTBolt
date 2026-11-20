import { derived, get, writable } from 'svelte/store';

// The light switch's state: lights on (light) or off (dark). The choice is saved under the key the
// earlier theme library used, so a saved choice carries over. Storage can be blocked, so every
// storage call is guarded and the choice then lasts for the visit.
const KEY = 'mode-watcher-mode';
type Mode = 'light' | 'dark';
type Choice = Mode | 'system';

const inBrowser = typeof window !== 'undefined';
const lightQuery =
	inBrowser && typeof window.matchMedia === 'function'
		? window.matchMedia('(prefers-color-scheme: light)')
		: undefined;

function savedChoice(): Choice {
	try {
		const saved = localStorage.getItem(KEY);
		if (saved === 'light' || saved === 'dark') return saved;
	} catch {
		// Blocked storage: follow the system setting.
	}
	return 'system';
}

const choice = writable<Choice>(inBrowser ? savedChoice() : 'system');
const system = writable<Mode>(lightQuery?.matches ? 'light' : 'dark');

/** The mode in effect: the saved choice, or the system setting when there is none. */
export const mode = derived(
	[choice, system],
	([$choice, $system]): Mode => ($choice === 'system' ? $system : $choice)
);

export function toggleMode() {
	const next: Mode = get(mode) === 'dark' ? 'light' : 'dark';
	choice.set(next);
	try {
		localStorage.setItem(KEY, next);
	} catch {
		// Blocked or full storage: the choice lasts until the page closes.
	}
}

/** Puts the mode on the page and follows the system setting and other tabs; returns a stop function. */
export function watchMode(): () => void {
	const onSystem = (event: MediaQueryListEvent) => system.set(event.matches ? 'light' : 'dark');
	const onStorage = (event: StorageEvent) => {
		if (event.key === KEY) choice.set(savedChoice());
	};
	lightQuery?.addEventListener('change', onSystem);
	window.addEventListener('storage', onStorage);
	const stopApplying = mode.subscribe(($mode) => {
		const root = document.documentElement;
		root.classList.toggle('dark', $mode === 'dark');
		root.style.colorScheme = $mode;
	});
	return () => {
		lightQuery?.removeEventListener('change', onSystem);
		window.removeEventListener('storage', onStorage);
		stopApplying();
	};
}

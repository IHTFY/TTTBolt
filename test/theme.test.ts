// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	document.documentElement.classList.remove('dark');
	document.body.innerHTML = '';
});

function blockStorage() {
	const blocked = () => {
		throw new DOMException('The operation is insecure.', 'SecurityError');
	};
	vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
}

async function loadTheme() {
	vi.resetModules();
	return import('../src/lib/theme');
}

describe('light switch with blocked storage', () => {
	it('opens the page and takes a move', async () => {
		blockStorage();
		vi.resetModules();
		const { flushSync, mount, unmount } = await import('svelte');
		const { get } = await import('svelte/store');
		const store = await import('../src/lib/stores/gameStore');
		const { default: Page } = await import('../src/routes/+page.svelte');
		const app = mount(Page, { target: document.body });
		store.handleClick(4);
		flushSync();
		expect(document.querySelector('.device-wrap')).not.toBeNull();
		expect(document.querySelector('button.switch')).not.toBeNull();
		expect(get(store.board)[4]).toBe('x');
		unmount(app);
	});

	it('still flips the lights for the visit', async () => {
		blockStorage();
		const { get } = await import('svelte/store');
		const theme = await loadTheme();
		const stop = theme.watchMode();
		const before = get(theme.mode);
		theme.toggleMode();
		const after = get(theme.mode);
		expect(after).not.toBe(before);
		expect(document.documentElement.classList.contains('dark')).toBe(after === 'dark');
		stop();
	});
});

describe('light switch with working storage', () => {
	it('uses a saved choice and saves the next one', async () => {
		localStorage.setItem('mode-watcher-mode', 'dark');
		const { get } = await import('svelte/store');
		const theme = await loadTheme();
		expect(get(theme.mode)).toBe('dark');
		theme.toggleMode();
		expect(get(theme.mode)).toBe('light');
		expect(localStorage.getItem('mode-watcher-mode')).toBe('light');
	});
});

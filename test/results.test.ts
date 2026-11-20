// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

const RESULTS_BOX = '[data-ad-slot="6470163205"]';
const tick = () => new Promise((resolve) => setTimeout(resolve));

let added: HTMLScriptElement[];
let unmountPage: (() => void) | undefined;

afterEach(() => {
	unmountPage?.();
	unmountPage = undefined;
	vi.restoreAllMocks();
	// @ts-expect-error reset between tests
	delete window.ihtfyAds;
	localStorage.clear();
	document.documentElement.classList.remove('ad-free');
	document.body.innerHTML = '';
});

// Mounts the page as the layout does, with a saved ad-free token that the stubbed loader will
// judge when the test lets it answer.
async function openPage({ token, online = true }: { token: boolean; online?: boolean }) {
	vi.resetModules();
	added = [];
	// Record the loader's script tag instead of fetching it; other elements are added as usual.
	const appendChild = document.head.appendChild.bind(document.head);
	vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
		if (!(el instanceof HTMLScriptElement)) return appendChild(el);
		added.push(el);
		return el;
	});
	const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
	if (token) localStorage.setItem('ihtfy-ad-free', 'saved');
	let answer: (free: boolean) => void = () => {};
	window.ihtfyAds = {
		show: vi.fn(),
		adFree: () => new Promise<boolean>((resolve) => (answer = resolve))
	};
	// Svelte is imported after the module reset so the page and `mount` share one runtime.
	const { flushSync, mount, unmount } = await import('svelte');
	const ads = await import('../src/lib/ads');
	const store = await import('../src/lib/stores/gameStore');
	const { default: Page } = await import('../src/routes/+page.svelte');
	const app = mount(Page, { target: document.body });
	unmountPage = () => unmount(app);
	flushSync();
	ads.loadForBuyer();
	return {
		goOnline: () => onLine.mockReturnValue(true),
		goOffline: () => onLine.mockReturnValue(false),
		// X takes the top row.
		win: () => {
			for (const cell of [0, 3, 1, 4, 2]) store.handleClick(cell);
			flushSync();
		},
		verdict: async (free: boolean) => {
			added[0].dispatchEvent(new Event('load'));
			await tick();
			answer(free);
			await tick();
			flushSync();
		}
	};
}

describe('results screen ad', () => {
	it('shows the box to a visitor with no saved token', async () => {
		const page = await openPage({ token: false });
		page.win();
		expect(document.querySelector('.results')).not.toBeNull();
		expect(document.querySelector(RESULTS_BOX)).not.toBeNull();
	});

	it('shows no box while a saved token is unchecked, and none once it is accepted', async () => {
		const page = await openPage({ token: true });
		page.win();
		expect(document.querySelector(RESULTS_BOX)).toBeNull();
		await page.verdict(true);
		expect(document.querySelector(RESULTS_BOX)).toBeNull();
	});

	it('adds the box to a win already on screen when the loader rejects the token', async () => {
		const page = await openPage({ token: true });
		page.win();
		expect(document.querySelector(RESULTS_BOX)).toBeNull();
		await page.verdict(false);
		expect(document.querySelector('.results')).not.toBeNull();
		expect(document.querySelector(RESULTS_BOX)).not.toBeNull();
	});

	it('shows the box to a win after the loader has rejected the token', async () => {
		const page = await openPage({ token: true });
		await page.verdict(false);
		page.win();
		expect(document.querySelector(RESULTS_BOX)).not.toBeNull();
	});

	it('shows the plain screen, with no reserved box, for a win made offline', async () => {
		const page = await openPage({ token: false, online: false });
		page.win();
		expect(document.querySelector(RESULTS_BOX)).toBeNull();
		expect(document.querySelector('.results')).toBeNull();
		expect(document.querySelector('.pinned')).not.toBeNull();
	});

	it('adds no box to a win made offline when the browser reconnects before the verdict', async () => {
		const page = await openPage({ token: true, online: false });
		page.win();
		page.goOnline();
		await page.verdict(false);
		expect(document.querySelector(RESULTS_BOX)).toBeNull();
		expect(document.querySelector('.results')).toBeNull();
	});

	it('adds no box to a win made online when the browser drops offline before the verdict', async () => {
		const page = await openPage({ token: true });
		page.win();
		page.goOffline();
		await page.verdict(false);
		expect(document.querySelector(RESULTS_BOX)).toBeNull();
	});

	it('keeps the box chosen at the win when the window changes before the verdict', async () => {
		const page = await openPage({ token: true });
		page.win();
		// A phone turned on its side before the loader answered.
		vi.stubGlobal('innerHeight', 300);
		window.dispatchEvent(new Event('resize'));
		await page.verdict(false);
		vi.unstubAllGlobals();
		expect(document.querySelector(RESULTS_BOX)).not.toBeNull();
	});

	it('moves keyboard focus to the first cell of the new board after Play again', async () => {
		const page = await openPage({ token: false });
		page.win();
		const again = document.querySelector<HTMLButtonElement>('.again')!;
		again.focus();
		expect(document.activeElement).toBe(again);
		again.click();
		await tick();
		expect(document.querySelector('.again')).toBeNull();
		expect(document.activeElement?.getAttribute('aria-label')).toBe('Cell 1: empty');
	});

	it('does not place a mark from a held Enter key that moved focus to a cell', async () => {
		const page = await openPage({ token: false });
		page.win();
		document.querySelector<HTMLButtonElement>('.again')!.click();
		await tick();
		const cell = document.activeElement!;
		cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true }));
		await tick();
		expect(cell.getAttribute('aria-label')).toBe('Cell 1: empty');
		cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await tick();
		expect(cell.getAttribute('aria-label')).toBe('Cell 1: x');
	});

	it('folds the side rail away while the results box shows, and brings it back with the next game', async () => {
		vi.stubGlobal('innerWidth', 1536);
		vi.stubGlobal('innerHeight', 768);
		const page = await openPage({ token: false });
		const rail = document.querySelector('.frame aside')!;
		expect(rail.classList.contains('hidden')).toBe(false);
		page.win();
		expect(document.querySelector(RESULTS_BOX)).not.toBeNull();
		expect(rail.classList.contains('hidden')).toBe(true);
		document.querySelector<HTMLButtonElement>('.again')!.click();
		await tick();
		expect(rail.classList.contains('hidden')).toBe(false);
		vi.unstubAllGlobals();
	});
});

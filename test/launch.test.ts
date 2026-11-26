// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The launch screen's copy and its script run from src/app.html before the app loads, so the test
// runs them the same way: the overlay markup into the body, then the inline script.
const html = readFileSync(resolve(__dirname, '../src/app.html'), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
	.map((match) => match[1])
	.find((code) => code.includes('launchExit'))!;
const overlay = html.match(/<div id="launch"[\s\S]*?<\/span>\s*<\/div>/)![0];

type Launch = { app?: boolean; navigation?: string; reducedMotion?: boolean };

// Fake timers throughout, so each test's 4 s fallback runs in its own afterEach and ends that
// launch (and its listeners) before the next test starts.
function launch({ app = true, navigation = 'navigate', reducedMotion = false }: Launch = {}) {
	vi.useFakeTimers();
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: query.includes('display-mode') ? app : query.includes('reduce') && reducedMotion
	}));
	vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
		{ type: navigation } as unknown as PerformanceEntry
	]);
	document.body.innerHTML = `${overlay}<div style="display: contents"><main></main></div>`;
	new Function(script)();
}

function animation() {
	let finish = () => {};
	const finished = new Promise<void>((resolve) => (finish = resolve));
	return { finished, finish: vi.fn(() => finish()) };
}

const root = document.documentElement;
const copy = () => document.getElementById('launch');
const game = () => copy()?.nextElementSibling ?? document.body.lastElementChild!;

afterEach(() => {
	vi.runOnlyPendingTimers();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	sessionStorage.clear();
	root.classList.remove('launching', 'leaving');
	delete window.launchExit;
	document.body.innerHTML = '';
});

describe('launch screen', () => {
	it('stays off in a browser tab', () => {
		launch({ app: false });
		expect(root.classList.contains('launching')).toBe(false);
		expect(window.launchExit).toBeUndefined();
	});

	it('stays off on a reload of the installed app', () => {
		launch({ navigation: 'reload' });
		expect(root.classList.contains('launching')).toBe(false);
	});

	it('plays once per session', () => {
		launch();
		expect(root.classList.contains('launching')).toBe(true);
		root.classList.remove('launching');
		launch();
		expect(root.classList.contains('launching')).toBe(false);
	});

	it('gives way to the game when the exit finishes', async () => {
		launch();
		const moves = [animation(), animation()];
		window.launchExit!(() => moves as unknown as Animation[]);
		expect((game() as HTMLElement).inert).toBe(true);
		moves.forEach((move) => move.finish());
		await vi.waitFor(() => expect(copy()).toBeNull());
		expect(root.classList.contains('launching')).toBe(false);
		expect((game() as HTMLElement).inert).toBe(false);
	});

	it('skips to the end on a tap, and keeps that tap off the board', async () => {
		launch();
		const moves = [animation(), animation()];
		window.launchExit!(() => moves as unknown as Animation[]);
		copy()!.dispatchEvent(new PointerEvent('pointerdown'));
		for (const move of moves) expect(move.finish).toHaveBeenCalled();
		await Promise.all(moves.map((move) => move.finished));
		await Promise.resolve();
		// The tap's click hasn't landed yet, so the copy is still there to take it.
		expect(copy()).not.toBeNull();
		copy()!.dispatchEvent(new MouseEvent('click'));
		expect(copy()).toBeNull();
	});

	it('skips at the start of the exit after a tap on the copy before it', () => {
		launch();
		copy()!.dispatchEvent(new PointerEvent('pointerdown'));
		copy()!.dispatchEvent(new MouseEvent('click'));
		const move = animation();
		window.launchExit!(() => [move] as unknown as Animation[]);
		expect(move.finish).toHaveBeenCalled();
	});

	it('skips to the end when the window turns', () => {
		launch();
		const move = animation();
		window.launchExit!(() => [move] as unknown as Animation[]);
		vi.stubGlobal('innerWidth', window.innerHeight);
		vi.stubGlobal('innerHeight', window.innerWidth);
		window.dispatchEvent(new Event('resize'));
		expect(move.finish).toHaveBeenCalled();
	});

	it('keeps playing when a resize reports the same size', () => {
		launch();
		const move = animation();
		window.launchExit!(() => [move] as unknown as Animation[]);
		window.dispatchEvent(new Event('resize'));
		expect(move.finish).not.toHaveBeenCalled();
	});

	it('shows the game if the page stops arriving before the game', () => {
		launch();
		copy()!.nextElementSibling!.remove();
		expect(() => vi.advanceTimersByTime(4000)).not.toThrow();
		expect(copy()).toBeNull();
	});

	it('keeps the copy up for a second press held after a quick first one', async () => {
		launch();
		window.launchExit!(() => [animation()] as unknown as Animation[]);
		copy()!.dispatchEvent(new PointerEvent('pointerdown'));
		copy()!.dispatchEvent(new PointerEvent('pointerup'));
		copy()!.dispatchEvent(new MouseEvent('click'));
		copy()!.dispatchEvent(new PointerEvent('pointerdown'));
		await vi.advanceTimersByTimeAsync(400);
		expect(copy()).not.toBeNull();
		copy()!.dispatchEvent(new MouseEvent('click'));
		expect(copy()).toBeNull();
	});

	it("keeps taps and keys from the page's own listeners until the copy is gone", async () => {
		launch();
		const heard = vi.fn();
		for (const type of ['pointerdown', 'keydown', 'resize']) addEventListener(type, heard, true);
		window.launchExit!(() => [animation()] as unknown as Animation[]);
		copy()!.dispatchEvent(new KeyboardEvent('keydown'));
		copy()!.dispatchEvent(new PointerEvent('pointerdown'));
		window.dispatchEvent(new Event('resize'));
		expect(heard.mock.calls.map(([event]) => event.type)).toEqual(['resize']);
		copy()!.dispatchEvent(new PointerEvent('pointerup'));
		await vi.advanceTimersByTimeAsync(400);
		expect(copy()).toBeNull();
		document.body.dispatchEvent(new PointerEvent('pointerdown'));
		expect(heard).toHaveBeenCalledTimes(2);
		for (const type of ['pointerdown', 'keydown', 'resize']) removeEventListener(type, heard, true);
	});

	it('lets go of a press that ends without a click', () => {
		launch();
		window.launchExit!(() => [animation()] as unknown as Animation[]);
		copy()!.dispatchEvent(new PointerEvent('pointerdown', { button: 2 }));
		copy()!.dispatchEvent(new PointerEvent('pointerup', { button: 2 }));
		return vi.advanceTimersByTimeAsync(400).then(() => expect(copy()).toBeNull());
	});

	it('keeps the page behind out of reach until the exit starts', () => {
		launch();
		expect(root.classList.contains('leaving')).toBe(false);
		window.launchExit!(() => [animation()] as unknown as Animation[]);
		expect(root.classList.contains('leaving')).toBe(true);
		expect((game() as HTMLElement).inert).toBe(true);
	});

	it('shows the game at once without Web Animations', () => {
		launch();
		copy()!.animate = undefined as unknown as HTMLElement['animate'];
		window.launchExit!(() => []);
		expect(copy()).toBeNull();
		expect(root.classList.contains('launching')).toBe(false);
	});

	it('fades for 200 ms with reduced motion', () => {
		launch({ reducedMotion: true });
		const fade = animation();
		const animate = vi.fn(() => fade);
		copy()!.animate = animate as unknown as HTMLElement['animate'];
		const play = vi.fn();
		window.launchExit!(play);
		expect(play).not.toHaveBeenCalled();
		expect(animate).toHaveBeenCalledWith(
			{ opacity: [1, 0] },
			expect.objectContaining({ duration: 200 })
		);
	});

	it('shows the game if the app never calls launchExit', () => {
		launch();
		vi.advanceTimersByTime(4000);
		expect(copy()).toBeNull();
		expect(root.classList.contains('launching')).toBe(false);
		// A game that mounts later has nothing to start.
		expect(window.launchExit).toBeUndefined();
	});

	it('shows the game if the exit never finishes', () => {
		launch();
		window.launchExit!(() => [animation()] as unknown as Animation[]);
		vi.advanceTimersByTime(4000);
		expect(copy()).toBeNull();
		expect((game() as HTMLElement).inert).toBe(false);
	});
});

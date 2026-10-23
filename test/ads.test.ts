// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let added: HTMLScriptElement[];

async function loadAds() {
	vi.resetModules();
	return import('../src/lib/ads');
}

beforeEach(() => {
	added = [];
	// Record script tags instead of fetching them.
	vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
		added.push(el as HTMLScriptElement);
		return el;
	});
	window.ihtfyAds = { show: vi.fn() };
});

afterEach(() => {
	vi.restoreAllMocks();
	// @ts-expect-error reset between tests
	delete window.ihtfyAds;
	localStorage.clear();
	// An expiry in the past: happy-dom keeps a Max-Age=0 cookie until the clock ticks.
	document.cookie = 'ihtfy-ad-free=; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('showAd', () => {
	it('adds the loader once and asks it for the ad when it arrives', async () => {
		const { showAd } = await loadAds();
		const box = document.createElement('div');
		document.body.append(box);
		showAd(box, 'a');
		showAd(box, 'b');
		expect(added).toHaveLength(1);
		added[0].dispatchEvent(new Event('load'));
		await new Promise((resolve) => setTimeout(resolve));
		expect(window.ihtfyAds.show).toHaveBeenCalledWith(box, 'a');
		box.remove();
	});
});

describe('loadForBuyer', () => {
	it('loads nothing for a visitor without an ad-free token', async () => {
		const { loadForBuyer } = await loadAds();
		loadForBuyer();
		expect(added).toHaveLength(0);
	});

	it('loads the loader at startup when localStorage holds a token', async () => {
		localStorage.setItem('ihtfy-ad-free', 'token');
		const { loadForBuyer, showAd } = await loadAds();
		loadForBuyer();
		expect(added).toHaveLength(1);
		expect(added[0].src).toBe('https://ihtfy.com/ads/v1.js');
		showAd(document.createElement('div'), 'a');
		expect(added).toHaveLength(1);
	});

	it('loads the loader at startup when only the cookie holds a token', async () => {
		document.cookie = 'ihtfy-ad-free=token';
		const { loadForBuyer } = await loadAds();
		loadForBuyer();
		expect(added).toHaveLength(1);
	});

	it('starts quietly when storage and cookies both throw', async () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('denied');
		});
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get() {
				throw new Error('denied');
			}
		});
		try {
			const { loadForBuyer } = await loadAds();
			expect(() => loadForBuyer()).not.toThrow();
			expect(added).toHaveLength(0);
		} finally {
			// @ts-expect-error removes the own property added above
			delete document.cookie;
		}
	});
});

describe('mayBeAdFree', () => {
	it('is false without a token and true with one in localStorage or the cookie', async () => {
		const { mayBeAdFree } = await loadAds();
		expect(mayBeAdFree()).toBe(false);
		localStorage.setItem('ihtfy-ad-free', 'token');
		expect(mayBeAdFree()).toBe(true);
		localStorage.clear();
		document.cookie = 'ihtfy-ad-free=token';
		expect(mayBeAdFree()).toBe(true);
	});
});

describe('showPlayAd', () => {
	const tick = () => new Promise((resolve) => setTimeout(resolve));

	it('loads nothing until the first tap, then asks for the ad', async () => {
		const { showPlayAd } = await loadAds();
		const box = document.createElement('div');
		document.body.append(box);
		showPlayAd(box, 'play/1');
		await tick();
		expect(added).toHaveLength(0);
		window.dispatchEvent(new Event('pointerdown'));
		await tick();
		expect(added).toHaveLength(1);
		added[0].dispatchEvent(new Event('load'));
		await tick();
		expect(window.ihtfyAds.show).toHaveBeenCalledWith(box, 'play/1');
		box.remove();
	});

	it('skips a box that left the page before the first key press', async () => {
		const { showPlayAd } = await loadAds();
		const box = document.createElement('div');
		document.body.append(box);
		showPlayAd(box, 'play/1');
		box.remove();
		window.dispatchEvent(new Event('keydown'));
		await tick();
		expect(added).toHaveLength(0);
	});

	it('counts a minute from the request before a new game may get a new ad', async () => {
		const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
		const { showPlayAd, playAdIsStale } = await loadAds();
		expect(playAdIsStale()).toBe(true);
		const box = document.createElement('div');
		document.body.append(box);
		showPlayAd(box, 'play/1');
		await tick();
		window.dispatchEvent(new Event('pointerdown'));
		await tick();
		expect(playAdIsStale()).toBe(false);
		now.mockReturnValue(1_059_999);
		expect(playAdIsStale()).toBe(false);
		now.mockReturnValue(1_060_000);
		expect(playAdIsStale()).toBe(true);
		box.remove();
	});
});

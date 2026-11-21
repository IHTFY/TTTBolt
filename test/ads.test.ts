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
	window.ihtfyAds = { show: vi.fn(), adFree: vi.fn().mockResolvedValue(false) };
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

describe("the loader's verdict on a saved token", () => {
	const tick = () => new Promise((resolve) => setTimeout(resolve));

	async function startWithToken(adFree: () => Promise<boolean>) {
		localStorage.setItem('ihtfy-ad-free', 'token');
		window.ihtfyAds = { show: vi.fn(), adFree };
		document.documentElement.classList.add('ad-free');
		const ads = await loadAds();
		const { get } = await import('svelte/store');
		ads.loadForBuyer();
		return { ...ads, buyerNow: () => get(ads.buyer) };
	}

	afterEach(() => {
		document.documentElement.classList.remove('ad-free');
		// Lets a check still waiting for the browser to come back online fire now, so it can't leak into the next test.
		window.dispatchEvent(new Event('online'));
	});

	it('treats the token as a purchase until the loader has answered', async () => {
		const { buyerNow } = await startWithToken(() => new Promise(() => {}));
		added[0].dispatchEvent(new Event('load'));
		await tick();
		expect(buyerNow()).toBe(true);
		expect(document.documentElement.classList.contains('ad-free')).toBe(true);
	});

	it('keeps the buyer layout when the loader accepts the token', async () => {
		const { buyerNow } = await startWithToken(() => Promise.resolve(true));
		added[0].dispatchEvent(new Event('load'));
		await tick();
		expect(buyerNow()).toBe(true);
		expect(document.documentElement.classList.contains('ad-free')).toBe(true);
	});

	it('restores the ordinary layout when the loader rejects the token', async () => {
		const { buyerNow } = await startWithToken(() => Promise.resolve(false));
		added[0].dispatchEvent(new Event('load'));
		await tick();
		expect(buyerNow()).toBe(false);
		expect(document.documentElement.classList.contains('ad-free')).toBe(false);
	});

	it('keeps the buyer layout when the loader cannot be reached', async () => {
		const { buyerNow } = await startWithToken(() => Promise.resolve(false));
		added[0].dispatchEvent(new Event('error'));
		await tick();
		expect(buyerNow()).toBe(true);
		expect(document.documentElement.classList.contains('ad-free')).toBe(true);
	});

	it('tries the check again when the browser comes back online', async () => {
		const { buyerNow } = await startWithToken(() => Promise.resolve(false));
		added[0].dispatchEvent(new Event('error'));
		await tick();
		expect(buyerNow()).toBe(true);
		window.dispatchEvent(new Event('online'));
		expect(added).toHaveLength(2);
		added[1].dispatchEvent(new Event('load'));
		await tick();
		expect(buyerNow()).toBe(false);
		expect(document.documentElement.classList.contains('ad-free')).toBe(false);
	});

	it('drops the buyer layout when the token is gone by the time the check is tried again', async () => {
		const { buyerNow } = await startWithToken(() => Promise.resolve(true));
		added[0].dispatchEvent(new Event('error'));
		await tick();
		localStorage.clear();
		window.dispatchEvent(new Event('online'));
		expect(buyerNow()).toBe(false);
		expect(document.documentElement.classList.contains('ad-free')).toBe(false);
	});

	it('starts without the buyer layout when no token is saved', async () => {
		localStorage.clear();
		const { buyer, loadForBuyer } = await loadAds();
		const { get } = await import('svelte/store');
		loadForBuyer();
		expect(get(buyer)).toBe(false);
		expect(added).toHaveLength(0);
	});
});

describe('checking the token again during the visit', () => {
	const tick = () => new Promise((resolve) => setTimeout(resolve));
	let stopWatching: (() => void) | undefined;

	async function watch(adFree: () => Promise<boolean>) {
		window.ihtfyAds = { show: vi.fn(), adFree };
		const ads = await loadAds();
		const { get } = await import('svelte/store');
		stopWatching = ads.watchBuyer();
		return { ...ads, buyerNow: () => get(ads.buyer) };
	}

	afterEach(() => {
		stopWatching?.();
		stopWatching = undefined;
		document.documentElement.classList.remove('ad-free');
		// Lets a check still waiting for the browser to come back online fire now, so it can't leak into the next test.
		window.dispatchEvent(new Event('online'));
	});

	it('takes the verdict on a token saved during the visit when the page comes back into view', async () => {
		const { buyerNow } = await watch(() => Promise.resolve(true));
		expect(added).toHaveLength(0);
		document.cookie = 'ihtfy-ad-free=token';
		document.dispatchEvent(new Event('visibilitychange'));
		expect(added).toHaveLength(1);
		// The new token is no purchase until the loader has judged it.
		expect(buyerNow()).toBe(false);
		expect(document.documentElement.classList.contains('ad-free')).toBe(false);
		added[0].dispatchEvent(new Event('load'));
		await tick();
		expect(buyerNow()).toBe(true);
		expect(document.documentElement.classList.contains('ad-free')).toBe(true);
	});

	it('keeps the ordinary layout when the loader rejects a token saved during the visit', async () => {
		const { buyerNow } = await watch(() => Promise.resolve(false));
		localStorage.setItem('ihtfy-ad-free', 'token');
		document.dispatchEvent(new Event('visibilitychange'));
		added[0].dispatchEvent(new Event('load'));
		await tick();
		expect(buyerNow()).toBe(false);
		expect(document.documentElement.classList.contains('ad-free')).toBe(false);
	});

	it('does not check when the page goes out of view', async () => {
		await watch(() => Promise.resolve(true));
		localStorage.setItem('ihtfy-ad-free', 'token');
		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
		document.dispatchEvent(new Event('visibilitychange'));
		expect(added).toHaveLength(0);
	});

	it('stops checking once told to stop watching', async () => {
		await watch(() => Promise.resolve(true));
		stopWatching!();
		localStorage.setItem('ihtfy-ad-free', 'token');
		document.dispatchEvent(new Event('visibilitychange'));
		expect(added).toHaveLength(0);
	});

	it('drops the buyer layout when an unchecked token is gone as the page comes back into view', async () => {
		localStorage.setItem('ihtfy-ad-free', 'token');
		const { buyerNow } = await watch(() => new Promise(() => {}));
		document.documentElement.classList.add('ad-free');
		expect(buyerNow()).toBe(true);
		localStorage.clear();
		document.dispatchEvent(new Event('visibilitychange'));
		expect(buyerNow()).toBe(false);
		expect(document.documentElement.classList.contains('ad-free')).toBe(false);
	});

	it('keeps the buyer layout for the rest of the visit once the loader has accepted a token', async () => {
		localStorage.setItem('ihtfy-ad-free', 'token');
		const adFree = vi.fn().mockResolvedValue(true);
		const { buyerNow, recheckBuyer } = await watch(adFree);
		added[0].dispatchEvent(new Event('load'));
		await tick();
		expect(buyerNow()).toBe(true);
		// The loader goes on hiding every ad box even if the token is cleared, so the layout must not ask for one.
		localStorage.clear();
		document.dispatchEvent(new Event('visibilitychange'));
		recheckBuyer();
		await tick();
		expect(buyerNow()).toBe(true);
		expect(document.documentElement.classList.contains('ad-free')).toBe(true);
		expect(adFree).toHaveBeenCalledTimes(1);
	});

	it('asks for a loader that failed to load again, without waiting for an online event', async () => {
		localStorage.setItem('ihtfy-ad-free', 'token');
		const { buyerNow, recheckBuyer } = await watch(() => Promise.resolve(false));
		added[0].dispatchEvent(new Event('error'));
		await tick();
		expect(buyerNow()).toBe(true);
		recheckBuyer();
		expect(added).toHaveLength(2);
		added[1].dispatchEvent(new Event('load'));
		await tick();
		expect(buyerNow()).toBe(false);
	});

	it('takes the verdict from a loader that an ad asked for after the limit was reached', async () => {
		const { buyerNow, recheckBuyer, showAd } = await watch(() => Promise.resolve(true));
		// Bought during the visit, with the loader blocked at each of the three tries.
		localStorage.setItem('ihtfy-ad-free', 'token');
		for (let tries = 1; tries <= 3; tries++) {
			recheckBuyer();
			added.at(-1)!.dispatchEvent(new Event('error'));
			await tick();
		}
		recheckBuyer();
		expect(added).toHaveLength(3);
		const box = document.createElement('div');
		document.body.append(box);
		showAd(box, 'win-1');
		expect(added).toHaveLength(4);
		added[3].dispatchEvent(new Event('load'));
		await tick();
		expect(buyerNow()).toBe(true);
		expect(document.documentElement.classList.contains('ad-free')).toBe(true);
		box.remove();
	});

	it('keeps an accepted purchase when a slower check of an older token answers after it', async () => {
		localStorage.setItem('ihtfy-ad-free', 'old');
		const answers: ((free: boolean) => void)[] = [];
		const { buyerNow, recheckBuyer } = await watch(
			() => new Promise<boolean>((resolve) => answers.push(resolve))
		);
		added[0].dispatchEvent(new Event('load'));
		await tick();
		recheckBuyer();
		await tick();
		expect(answers).toHaveLength(2);
		answers[1](true);
		await tick();
		answers[0](false);
		await tick();
		expect(buyerNow()).toBe(true);
		expect(document.documentElement.classList.contains('ad-free')).toBe(true);
	});

	it('asks a loader that is still on its way only once', async () => {
		localStorage.setItem('ihtfy-ad-free', 'token');
		const { recheckBuyer } = await watch(() => Promise.resolve(true));
		recheckBuyer();
		recheckBuyer();
		expect(added).toHaveLength(1);
	});

	it('stops asking for a loader that stays blocked after three more tries, until the browser is back online', async () => {
		localStorage.setItem('ihtfy-ad-free', 'token');
		const { buyerNow, recheckBuyer } = await watch(() => Promise.resolve(false));
		for (let tries = 1; tries <= 3; tries++) {
			added.at(-1)!.dispatchEvent(new Event('error'));
			await tick();
			recheckBuyer();
			expect(added).toHaveLength(1 + tries);
		}
		added.at(-1)!.dispatchEvent(new Event('error'));
		await tick();
		recheckBuyer();
		document.dispatchEvent(new Event('visibilitychange'));
		expect(added).toHaveLength(4);
		expect(buyerNow()).toBe(true);
		window.dispatchEvent(new Event('online'));
		expect(added).toHaveLength(5);
		added[4].dispatchEvent(new Event('load'));
		await tick();
		expect(buyerNow()).toBe(false);
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

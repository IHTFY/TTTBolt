// The ads on the winning screen and beside the board come from the shared
// IHTFY loader, which ihtfy.com serves for all the games (its source is in the
// IHTFY/com.ihtfy repo). Nothing ad-related loads before the player's first tap
// or key press: the loader arrives then on windows wide enough for the ad
// beside the board, otherwise at the first win, and AdSense after it at
// browser idle. A visitor who may have bought ad-free gets the loader at
// startup instead (loadForBuyer), so it can hide the ads before they show, and
// its verdict on the saved purchase decides the layout once it arrives.
import { writable } from 'svelte/store';

const LOADER = import.meta.env.VITE_ADS_LOADER || 'https://ihtfy.com/ads/v1.js';

// The shared 300×250 display unit.
export const AD_SLOT = '6470163205';

// The games-play unit: 300×600 in AdSense; the 160×600 box uses it too.
export const PLAY_AD_SLOT = '7239875855';

let loader: Promise<void> | null = null;

const load = () =>
	(loader ??= new Promise<void>((resolve, reject) => {
		const script = document.createElement('script');
		script.async = true;
		script.src = LOADER;
		script.addEventListener('load', () => resolve());
		script.addEventListener('error', () => {
			script.remove();
			loader = null;
			reject(new Error('The ad loader did not load'));
		});
		document.head.appendChild(script);
	}));

/** Whether this browser holds an ad-free token, unchecked; the loader checks it. */
export function mayBeAdFree() {
	let stored: string | null = null;
	try {
		stored = localStorage.getItem('ihtfy-ad-free');
	} catch {
		// Storage off: the cookie may still hold the token.
	}
	let cookie = '';
	try {
		cookie = document.cookie;
	} catch {
		// Cookies off too (a sandboxed frame): the page must still start.
	}
	return Boolean(stored) || /(?:^|;\s*)ihtfy-ad-free=/.test(cookie);
}

/**
 * Whether the page lays out for a buyer of ad-free. A saved token is only a hint, so this starts as
 * the hint and takes the loader's verdict once that arrives. A loader that can't be reached (offline)
 * leaves the hint in place.
 */
export const buyer = writable(mayBeAdFree());

/** Loads the loader now if this browser holds an ad-free token, so it can hide every ad box. */
export function loadForBuyer() {
	if (!mayBeAdFree()) return;
	load()
		.then(() => window.ihtfyAds.adFree())
		.then((free) => {
			// The class app.html set from the hint comes off when the loader rejects the token.
			if (!free) document.documentElement.classList.remove('ad-free');
			buyer.set(free);
		})
		.catch(() => {});
}

/** Fills `box` with an ad for the win or game named `key`; offline or on failure it stays empty. */
export function showAd(box: HTMLElement, key: string) {
	if (!navigator.onLine) return;
	load().then(
		() => box.isConnected && window.ihtfyAds.show(box, key),
		() => {}
	);
}

// The player's first tap or key press, which the ad beside the board waits for
// instead of the page load. Made on first use, so prerendering never touches
// the window.
let firstInput: Promise<void> | null = null;

const afterFirstInput = () =>
	(firstInput ??= new Promise<void>((resolve) => {
		for (const type of ['pointerdown', 'keydown']) {
			addEventListener(type, () => resolve(), { once: true, capture: true });
		}
	}));

// When the ad beside the board was last requested.
let playAdAt = -Infinity;

/** Fills `box` with the ad shown during play once the player has tapped or pressed a key, if the box is still on the page. */
export function showPlayAd(box: HTMLElement, key: string) {
	afterFirstInput().then(() => {
		if (!box.isConnected) return;
		playAdAt = Date.now();
		showAd(box, key);
	});
}

/** Whether a new game may get a new ad beside the board: at most one a minute, so quick games don't refresh it. */
export const playAdIsStale = () => Date.now() - playAdAt >= 60_000;

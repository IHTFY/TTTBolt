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

// A token check that would have to ask for the loader again, because the loader isn't on the page,
// does so at most this many times a visit when a win or a return to the page starts it. A loader
// that stays blocked would otherwise be asked for at every win.
const MAX_RECHECK_REQUESTS = 3;
let recheckRequests = 0;

// Once the loader has accepted a token it hides every ad box for the rest of the visit, whatever
// happens to the token, so the buyer layout stays as well and the checks stop.
let accepted = false;

function check(recheck: boolean) {
	if (accepted) return;
	if (!mayBeAdFree()) {
		// No token, or it has gone (a cookie that expired while a check waited): nothing to hold the
		// buyer layout.
		document.documentElement.classList.remove('ad-free');
		buyer.set(false);
		return;
	}
	if (recheck && !loader) {
		if (recheckRequests === MAX_RECHECK_REQUESTS) return;
		recheckRequests++;
	}
	load()
		.then(() => window.ihtfyAds.adFree())
		.then((free) => {
			// The class app.html set from the hint comes off when the loader rejects the token, and goes
			// on for a purchase made during the visit, so the ad beside the board leaves with its label.
			accepted = free;
			document.documentElement.classList.toggle('ad-free', free);
			buyer.set(free);
		})
		.catch(() => addEventListener('online', loadForBuyer, { once: true }));
}

/**
 * Loads the loader now if this browser holds an ad-free token, so it can hide every ad box, and
 * takes its verdict on the token. If the loader can't be reached, the token stays the hint until
 * the browser is back online, the page comes back into view, or the next win, when the check is
 * tried again.
 */
export const loadForBuyer = () => check(false);

/**
 * Checks the token again, for a win or a return to the page: ad-free can be bought in another tab
 * during the visit, and an earlier check may not have reached the loader. Only the loader's verdict
 * changes the layout here; a token it hasn't judged yet doesn't count as a purchase, so a token it
 * goes on to reject never takes the ads away and brings them back.
 */
export const recheckBuyer = () => check(true);

/**
 * Checks a saved token at startup and each time the page comes back into view. Returns a function
 * that stops watching.
 */
export function watchBuyer() {
	loadForBuyer();
	const onVisible = () => {
		if (document.visibilityState === 'visible') recheckBuyer();
	};
	document.addEventListener('visibilitychange', onVisible);
	return () => document.removeEventListener('visibilitychange', onVisible);
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

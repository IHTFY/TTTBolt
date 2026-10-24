// Which screens show an ad box, and how big it is. The only screens are the board
// (where a game is played, and so never an ad on a phone) and the results after a win.
export type AdSize = '300x250' | '320x100' | '320x50';
export type Screen = 'play' | 'results';

// Height the results layout needs besides the board and the ad box (padding, heading,
// button row, links, label, and the 50px gaps; +page.svelte's styles add up to this),
// and the smallest board the layout may squeeze to.
const FIXED_HEIGHT = 230;
const MIN_BOARD_HEIGHT = 200;
const SIDE_PADDING = 32;

// Biggest first: the first one that leaves room for the board is used.
const SIZES: { size: AdSize; width: number; height: number }[] = [
	{ size: '300x250', width: 300, height: 250 },
	{ size: '320x100', width: 320, height: 100 },
	{ size: '320x50', width: 320, height: 50 }
];

/** The largest box that fits a window with the whole results layout in view, or null if none does. */
export function resultsAdSize(width: number, height: number): AdSize | null {
	const fit = SIZES.find(
		(s) => width >= s.width + SIDE_PADDING && height >= FIXED_HEIGHT + MIN_BOARD_HEIGHT + s.height
	);
	return fit?.size ?? null;
}

/** The box a screen gets in a window of this size: none on the play screen, none for a buyer of ad-free. */
export function adForScreen(
	screen: Screen,
	{ buyer, width, height }: { buyer: boolean; width: number; height: number }
): AdSize | null {
	if (screen === 'play' || buyer) return null;
	return resultsAdSize(width, height);
}

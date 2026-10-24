import { describe, expect, it } from 'vitest';
import { adForScreen, resultsAdSize } from '../src/lib/adScreens';

const phones = [
	{ width: 360, height: 640 },
	{ width: 390, height: 750 },
	{ width: 412, height: 800 }
];

describe('resultsAdSize', () => {
	it('uses 300×250 where the board still fits beside it, 320×100 or 320×50 below that', () => {
		expect(resultsAdSize(390, 750)).toBe('300x250');
		expect(resultsAdSize(412, 800)).toBe('300x250');
		expect(resultsAdSize(1280, 800)).toBe('300x250');
		expect(resultsAdSize(360, 640)).toBe('320x100');
		expect(resultsAdSize(360, 500)).toBe('320x50');
	});

	it('returns a box only when the whole layout fits', () => {
		expect(resultsAdSize(360, 430)).toBeNull();
		expect(resultsAdSize(332, 800)).toBe('300x250');
		expect(resultsAdSize(331, 800)).toBeNull();
		expect(resultsAdSize(280, 800)).toBeNull();
	});
});

describe('adForScreen', () => {
	it('gives the results screen a box at each phone size and on desktop', () => {
		for (const size of [...phones, { width: 1280, height: 800 }]) {
			expect(adForScreen('results', { buyer: false, ...size })).not.toBeNull();
		}
	});

	it('never gives the play screen a box, at any size', () => {
		for (const size of [...phones, { width: 1280, height: 800 }, { width: 2560, height: 1440 }]) {
			expect(adForScreen('play', { buyer: false, ...size })).toBeNull();
		}
	});

	it('never gives a buyer of ad-free a box', () => {
		for (const size of [...phones, { width: 1280, height: 800 }]) {
			expect(adForScreen('results', { buyer: true, ...size })).toBeNull();
			expect(adForScreen('play', { buyer: true, ...size })).toBeNull();
		}
	});
});

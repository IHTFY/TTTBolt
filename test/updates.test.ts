// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { writable } from 'svelte/store';
import { reloadOnUpdate } from '../src/lib/updates';

function setup({ controller = {} as unknown, idle = true } = {}) {
	const target = new EventTarget();
	const sw = {
		controller: controller as ServiceWorker | null,
		addEventListener: target.addEventListener.bind(target),
		removeEventListener: target.removeEventListener.bind(target)
	};
	const idleStore = writable(idle);
	const reload = vi.fn();
	const stop = reloadOnUpdate(sw, idleStore, reload);
	return {
		takeOver: () => target.dispatchEvent(new Event('controllerchange')),
		idleStore,
		reload,
		stop
	};
}

afterEach(() => document.documentElement.classList.remove('launching'));

describe('reloadOnUpdate', () => {
	it('reloads at once when an update takes over and no game is in progress', () => {
		const { takeOver, reload } = setup();
		takeOver();
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('does not reload mid-game, and reloads once when the board is empty again', () => {
		const { takeOver, idleStore, reload } = setup({ idle: false });
		takeOver();
		expect(reload).not.toHaveBeenCalled();
		idleStore.set(false);
		expect(reload).not.toHaveBeenCalled();
		idleStore.set(true);
		expect(reload).toHaveBeenCalledTimes(1);
		idleStore.set(false);
		idleStore.set(true);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('does not reload when the board empties with no update waiting', () => {
		const { idleStore, reload } = setup({ idle: false });
		idleStore.set(true);
		expect(reload).not.toHaveBeenCalled();
	});

	it('does not reload for the first install, which claims a page that had no controller', () => {
		const { takeOver, reload } = setup({ controller: null });
		takeOver();
		expect(reload).not.toHaveBeenCalled();
		takeOver();
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('stops watching when told to', () => {
		const { takeOver, reload, stop } = setup();
		stop();
		takeOver();
		expect(reload).not.toHaveBeenCalled();
	});

	it('holds the reload while the launch exit plays, then reloads once it ends', async () => {
		const root = document.documentElement;
		root.classList.add('launching');
		const { takeOver, reload } = setup();
		takeOver();
		await Promise.resolve();
		expect(reload).not.toHaveBeenCalled();
		root.classList.remove('launching');
		await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
	});

	it('still waits for an empty board after the launch ends', async () => {
		const root = document.documentElement;
		root.classList.add('launching');
		const { takeOver, idleStore, reload } = setup({ idle: false });
		takeOver();
		root.classList.remove('launching');
		await Promise.resolve();
		expect(reload).not.toHaveBeenCalled();
		idleStore.set(true);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('does not reload after being stopped during the launch', async () => {
		const root = document.documentElement;
		root.classList.add('launching');
		const { takeOver, reload, stop } = setup();
		takeOver();
		stop();
		root.classList.remove('launching');
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(reload).not.toHaveBeenCalled();
	});
});

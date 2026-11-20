import type { Readable } from 'svelte/store';

/**
 * Reloads the page once a new version of the app has taken over, but only while `idle` is true, so a
 * game in progress isn't dropped: an update that arrives mid-game waits until the board is empty
 * again. Returns a function that stops watching.
 */
export function reloadOnUpdate(
	sw: Pick<ServiceWorkerContainer, 'addEventListener' | 'removeEventListener' | 'controller'>,
	idle: Readable<boolean>,
	reload: () => void = () => location.reload()
) {
	// The very first install also claims the page; only an update replaces an existing controller.
	let hadController = !!sw.controller;
	let updated = false;
	let isIdle = false;

	const reloadIfReady = () => {
		if (!updated || !isIdle) return;
		updated = false;
		reload();
	};
	const onChange = () => {
		if (hadController) {
			updated = true;
			reloadIfReady();
		}
		hadController = true;
	};

	const stopIdle = idle.subscribe((value) => {
		isIdle = value;
		reloadIfReady();
	});
	sw.addEventListener('controllerchange', onChange);
	return () => {
		stopIdle();
		sw.removeEventListener('controllerchange', onChange);
	};
}

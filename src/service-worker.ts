/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

// Precache the whole app (code, styles, fonts, icons, the prerendered page)
// so the game works completely offline once installed.
import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `tttbolt-${version}`;
// hosting files (CNAME, .nojekyll) may not be served, and one 404 fails the whole install
const ASSETS = [...build, ...files.filter((f) => !/\/(CNAME|\.nojekyll)$/.test(f)), ...prerendered];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

// Cache first: every file is versioned with the deploy, and a new deploy
// installs a fresh cache, so the network is only a fallback.
sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const cached =
				(await cache.match(request, { ignoreSearch: true })) ??
				// any page navigation falls back to the prerendered app shell
				(request.mode === 'navigate' ? await cache.match(prerendered[0] ?? '/') : undefined);
			if (cached) return cached;

			const response = await fetch(request);
			if (response.ok) cache.put(request, response.clone());
			return response;
		})()
	);
});

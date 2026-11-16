import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// Component tests mount Svelte components in a DOM, which needs the browser build of Svelte.
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined
});

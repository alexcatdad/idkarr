import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: "autoUpdate",
			manifest: {
				name: "idkarr",
				short_name: "idkarr",
				description: "Unified media manager - TV, Movies, Anime, Music",
				theme_color: "#000000",
				background_color: "#000000",
				display: "standalone",
				scope: "/",
				start_url: "/",
				icons: [
					{
						src: "/pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "/pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "/pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/api\.themoviedb\.org\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "tmdb-api-cache",
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24, // 24 hours
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
					{
						urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "tmdb-images-cache",
							expiration: {
								maxEntries: 500,
								maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
				],
			},
			devOptions: {
				enabled: false,
			},
		}),
	],
});

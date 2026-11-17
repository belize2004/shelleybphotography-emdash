import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";
import { Features } from "lightningcss";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	vite: {
		css: {
			lightningcss: { exclude: Features.LightDark },
		},
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "DM Sans",
			cssVariable: "--font-sans",
			weights: [400, 500, 600, 700],
			styles: ["normal", "italic"],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "Instrument Serif",
			cssVariable: "--font-serif",
			weights: [400],
			styles: ["normal", "italic"],
			fallbacks: ["Georgia", "serif"],
		},
		{
			provider: fontProviders.google(),
			name: "Fragment Mono",
			cssVariable: "--font-mono",
			weights: [400],
			styles: ["normal"],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});

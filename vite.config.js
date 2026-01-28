import { defineConfig } from "vite";

export default defineConfig({
	assetsInclude: ["_dprhtml/**/*.html", "**/*.xml"],
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.js"],
	},
});

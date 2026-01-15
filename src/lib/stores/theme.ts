import { writable } from "svelte/store";
import { browser } from "$app/environment";

type Theme = "light" | "dark" | "system";

function createThemeStore() {
	const defaultTheme: Theme = "system";

	const stored = browser ? (localStorage.getItem("theme") as Theme) : null;
	const { subscribe, set, update } = writable<Theme>(stored ?? defaultTheme);

	return {
		subscribe,
		set: (value: Theme) => {
			if (browser) {
				localStorage.setItem("theme", value);
				applyTheme(value);
			}
			set(value);
		},
		toggle: () => {
			update((current) => {
				const next = current === "dark" ? "light" : "dark";
				if (browser) {
					localStorage.setItem("theme", next);
					applyTheme(next);
				}
				return next;
			});
		},
	};
}

function applyTheme(theme: Theme) {
	if (!browser) return;

	const root = document.documentElement;
	const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const isDark = theme === "dark" || (theme === "system" && systemDark);

	root.classList.toggle("dark", isDark);
}

export const theme = createThemeStore();

// Initialize theme on load
if (browser) {
	const stored = localStorage.getItem("theme") as Theme | null;
	applyTheme(stored ?? "system");
}

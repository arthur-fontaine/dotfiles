import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const execAsync = promisify(exec);

async function detectTheme(): Promise<"dark" | "light"> {
	// Prefer terminal-specific appearance when we can detect it reliably.
	// For now on macOS, fall back to the OS appearance because it is robust
	// and matches most terminal setups that follow the system theme.
	try {
		const { stdout } = await execAsync(
			"osascript -e 'tell application \"System Events\" to tell appearance preferences to return dark mode'",
		);
		return stdout.trim() === "true" ? "dark" : "light";
	} catch {
		return "dark";
	}
}

export default function (pi: ExtensionAPI) {
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let currentTheme: "dark" | "light" | null = null;

	pi.on("session_start", async (_event, ctx) => {
		const applyTheme = async () => {
			const nextTheme = await detectTheme();
			if (nextTheme !== currentTheme) {
				currentTheme = nextTheme;
				ctx.ui.setTheme(nextTheme);
			}
		};

		await applyTheme();
		intervalId = setInterval(applyTheme, 2000);
	});

	pi.on("session_shutdown", () => {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	});
}

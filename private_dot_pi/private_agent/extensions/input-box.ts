/**
 * Bottom-docked amp-style editor for Pi.
 *
 * Architecture:
 * - A real CustomEditor subclass handles all input, submit, keybindings, cursor.
 * - Its normal slot in Pi's layout is hidden (render() => []).
 * - A bottom-anchored overlay renders the same editor state at the very bottom
 *   of the terminal and delegates keyboard input back to that real editor.
 *
 * This makes the editor truly terminal-bottom-docked instead of merely being
 * the last element in Pi's normal top-down layout.
 */

import type { AssistantMessage } from "@mariozechner/pi-ai";
import { CustomEditor, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { visibleWidth, type Component, type Focusable } from "@mariozechner/pi-tui";
import * as os from "os";

const MIN_CONTENT_LINES = 5;

function fmtTokens(n: number): string {
	return n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`;
}

function buildBorderLine(
	colorFn: (s: string) => string,
	width: number,
	left: string,
	right: string,
	cornerL = "",
	cornerR = "",
): string {
	const innerWidth = width - visibleWidth(cornerL) - visibleWidth(cornerR);
	const dashCount = Math.max(0, innerWidth - visibleWidth(left) - visibleWidth(right));
	return colorFn(cornerL + left + "─".repeat(dashCount) + right + cornerR);
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		let activeEditor: AmpEditor | undefined;

		class AmpEditor extends CustomEditor {
			private sessionStats() {
				let input = 0,
					output = 0,
					cost = 0;
				let thinking: string | undefined;

				for (const entry of ctx.sessionManager.getBranch()) {
					if (entry.type === "message" && entry.message.role === "assistant") {
						const m = entry.message as AssistantMessage;
						input += m.usage.input;
						output += m.usage.output;
						cost += m.usage.cost.total;
					}
					if (entry.type === "thinking_level_change") {
						thinking = entry.thinkingLevel;
					}
				}
				return { input, output, cost, thinking };
			}

			renderDocked(width: number): string[] {
				const innerWidth = width - 4; // │ + padding + padding + │
				const raw = super.render(innerWidth);
				if (raw.length < 2) return raw;

				const contentLines = raw.slice(1, raw.length - 1);
				while (contentLines.length < MIN_CONTENT_LINES) {
					contentLines.push(" ".repeat(innerWidth));
				}

				const { input, output, cost, thinking } = this.sessionStats();
				const hasTokens = input + output > 0;
				const topLeft = hasTokens
					? ` ↑${fmtTokens(input)} ↓${fmtTokens(output)} · $${cost.toFixed(3)} `
					: "";
				const provider = ctx.model?.provider;
				const modelId = ctx.model?.id;
				const topRightParts = [provider, modelId, thinking].filter(Boolean);
				const topRight = topRightParts.length > 0
					? ` ${topRightParts.join(" · ")} `
					: "";

				const top = buildBorderLine(this.borderColor, width, topLeft, topRight, "╭", "╮");
				const lb = this.borderColor("│") + " ";
				const rb = " " + this.borderColor("│");
				const content = contentLines.map((l) => lb + l + rb);
				const cwd = process.cwd().replace(os.homedir(), "~");
				const bottom = buildBorderLine(this.borderColor, width, "", ` ${cwd} `, "╰", "╯");

				return [top, ...content, bottom];
			}

			// Hide the editor in Pi's normal layout slot.
			override render(_width: number): string[] {
				return [];
			}
		}

		ctx.ui.setEditorComponent((tui, theme, keybindings) => {
			activeEditor = new AmpEditor(tui, theme, keybindings);
			return activeEditor;
		});

		// Hide the normal footer as well.
		ctx.ui.setFooter(() => ({
			invalidate() {},
			render(): string[] {
				return [];
			},
		}));

		// Reserve vertical space in the normal layout so the bottom overlay does
		// not cover the last visible chat lines when the terminal is full.
		ctx.ui.setWidget(
			"input-box-reserved-space",
			() => ({
				invalidate() {},
				render(width: number): string[] {
					const height = activeEditor?.renderDocked(width).length ?? MIN_CONTENT_LINES + 2;
					return Array.from({ length: height }, () => "");
				},
			}),
			{ placement: "belowEditor" },
		);

		// Show the visible editor as a bottom-anchored overlay.
		void ctx.ui.custom<void>(
			(tui) => {
				class DockedEditorOverlay implements Component, Focusable {
					private _focused = false;
					get focused(): boolean {
						return this._focused;
					}
					set focused(value: boolean) {
						this._focused = value;
						if (activeEditor) activeEditor.focused = value;
					}

					render(width: number): string[] {
						return activeEditor?.renderDocked(width) ?? [];
					}

					handleInput(data: string): void {
						activeEditor?.handleInput(data);
						tui.requestRender();
					}

					invalidate(): void {
						activeEditor?.invalidate();
					}
				}

				return new DockedEditorOverlay();
			},
			{
				overlay: true,
				overlayOptions: {
					anchor: "bottom-center",
					width: "100%",
					margin: { left: 0, right: 0, bottom: 0, top: 0 },
				},
			},
		);
	});
}

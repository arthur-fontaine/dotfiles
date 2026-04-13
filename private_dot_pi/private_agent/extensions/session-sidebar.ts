import { SessionManager, type ExtensionAPI, type ExtensionCommandContext, type Theme } from "@mariozechner/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth, type Component, type TUI } from "@mariozechner/pi-tui";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { homedir } from "node:os";

type RunningStatus = "idle" | "running";

type RunningAgentInfo = {
	pid: number;
	cwd: string;
	sessionFile: string;
	sessionName?: string;
	status: RunningStatus;
	updatedAt: number;
};

type SessionNode = {
	path: string;
	id: string;
	name?: string;
	firstMessage?: string;
	created: Date;
	modified: Date;
	parentSessionPath?: string;
	children: SessionNode[];
	current: boolean;
	running: boolean;
	runningStatus?: RunningStatus;
};

type SessionRow = {
	node: SessionNode;
	depth: number;
	isLast: boolean;
	ancestorsLast: boolean[];
};

const REGISTRY_DIR = join(homedir(), ".pi", "agent", "session-sidebar-registry");
const HEARTBEAT_MS = 4_000;
const STALE_MS = 15_000;
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export default function (pi: ExtensionAPI) {
	let currentStatus: RunningStatus = "idle";
	let heartbeat: ReturnType<typeof setInterval> | undefined;

	const updateHeartbeat = async (ctx: { cwd: string; sessionManager: { getSessionFile(): string | undefined; getSessionName(): string | undefined } }) => {
		const sessionFile = ctx.sessionManager.getSessionFile();
		if (!sessionFile) return;
		await mkdir(REGISTRY_DIR, { recursive: true });
		const payload: RunningAgentInfo = {
			pid: process.pid,
			cwd: ctx.cwd,
			sessionFile,
			sessionName: ctx.sessionManager.getSessionName(),
			status: currentStatus,
			updatedAt: Date.now(),
		};
		await writeFile(join(REGISTRY_DIR, `${process.pid}.json`), JSON.stringify(payload), "utf8");
	};

	const startHeartbeat = (ctx: { cwd: string; sessionManager: { getSessionFile(): string | undefined; getSessionName(): string | undefined } }) => {
		if (heartbeat) clearInterval(heartbeat);
		void updateHeartbeat(ctx);
		heartbeat = setInterval(() => {
			void updateHeartbeat(ctx);
		}, HEARTBEAT_MS);
	};

	const stopHeartbeat = async () => {
		if (heartbeat) {
			clearInterval(heartbeat);
			heartbeat = undefined;
		}
		await rm(join(REGISTRY_DIR, `${process.pid}.json`), { force: true }).catch(() => {});
	};

	pi.on("session_start", async (_event, ctx) => {
		currentStatus = "idle";
		startHeartbeat(ctx);
	});

	pi.on("turn_start", async (_event, ctx) => {
		currentStatus = "running";
		await updateHeartbeat(ctx);
	});

	pi.on("turn_end", async (_event, ctx) => {
		currentStatus = "idle";
		await updateHeartbeat(ctx);
	});

	pi.on("session_shutdown", async () => {
		await stopHeartbeat();
	});

	pi.registerCommand("sidebar", {
		description: "Open interactive session sidebar",
		handler: async (_args, ctx) => {
			const selectedPath = await ctx.ui.custom<string | undefined>(
				(tui, theme, _kb, done) => new SessionSidebarComponent(tui, theme, ctx, done),
				{
					overlay: true,
					overlayOptions: {
						anchor: "right-center",
						width: "38%",
						minWidth: 38,
						maxWidth: 56,
						maxHeight: "100%",
						margin: { top: 0, right: 0, bottom: 0 },
					},
				},
			);

			if (selectedPath && selectedPath !== ctx.sessionManager.getSessionFile()) {
				await ctx.switchSession(selectedPath);
			}
		},
	});

}

class SessionSidebarComponent implements Component {
	private rows: SessionRow[] = [];
	private selected = 0;
	private scroll = 0;
	private expanded = new Set<string>();
	private loading = true;
	private spinnerIndex = 0;
	private refreshTimer?: ReturnType<typeof setInterval>;
	private refreshInFlight = false;
	private disposed = false;
	private initialized = false;

	constructor(
		private tui: TUI,
		private theme: Theme,
		private ctx: ExtensionCommandContext,
		private done: (result: string | undefined) => void,
	) {
		this.refreshTimer = setInterval(() => {
			this.spinnerIndex = (this.spinnerIndex + 1) % SPINNER.length;
			void this.refresh();
			this.tui.requestRender();
		}, 80);
		void this.refresh();
	}

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
			this.done(undefined);
			return;
		}
		if (matchesKey(data, "r")) {
			void this.refresh(true);
			return;
		}
		if (this.rows.length === 0) return;

		if (matchesKey(data, "up")) {
			this.selected = Math.max(0, this.selected - 1);
			this.ensureSelectionVisible();
			this.tui.requestRender();
			return;
		}
		if (matchesKey(data, "down")) {
			this.selected = Math.min(this.rows.length - 1, this.selected + 1);
			this.ensureSelectionVisible();
			this.tui.requestRender();
			return;
		}
		if (matchesKey(data, "left")) {
			this.collapseSelection();
			return;
		}
		if (matchesKey(data, "right")) {
			this.expandSelection();
			return;
		}
		if (matchesKey(data, "space")) {
			this.toggleSelection();
			return;
		}
		if (matchesKey(data, "enter") || matchesKey(data, "return")) {
			this.done(this.rows[this.selected]?.node.path);
		}
	}

	render(width: number): string[] {
		const inner = Math.max(10, width - 2);
		const lines: string[] = [];
		const border = (s: string) => this.theme.fg("border", s);
		const row = (content: string) => border("│") + this.pad(content, inner) + border("│");

		lines.push(border(`╭${"─".repeat(inner)}╮`));
		lines.push(row(`${this.theme.fg("accent", this.theme.bold("Sessions"))}`));
		lines.push(row(this.theme.fg("dim", "Enter switch • ←/→ collapse • Space toggle • r refresh • Esc close")));
		lines.push(border(`├${"─".repeat(inner)}┤`));

		if (this.loading && this.rows.length === 0) {
			lines.push(row(`${this.theme.fg("warning", SPINNER[this.spinnerIndex]!)} Loading sessions...`));
		} else if (this.rows.length === 0) {
			lines.push(row(this.theme.fg("dim", "No sessions found.")));
		} else {
			const bodyHeight = Math.max(9, (process.stdout.rows ?? 24) - 7);
			const cardHeight = 4;
			const visibleCount = Math.max(1, Math.floor(bodyHeight / cardHeight));
			const visible = this.rows.slice(this.scroll, this.scroll + visibleCount);
			for (let i = 0; i < visible.length; i++) {
				const absoluteIndex = this.scroll + i;
				for (const line of this.renderCard(visible[i]!, absoluteIndex === this.selected, inner)) {
					lines.push(row(line));
				}
			}
			for (let i = visible.length * cardHeight; i < bodyHeight; i++) {
				lines.push(row(""));
			}
		}

		lines.push(border(`├${"─".repeat(inner)}┤`));
		const count = `${this.rows.length} session${this.rows.length === 1 ? "" : "s"}`;
		lines.push(row(this.theme.fg("dim", count)));
		lines.push(border(`╰${"─".repeat(inner)}╯`));
		return lines;
	}

	invalidate(): void {}

	dispose(): void {
		this.disposed = true;
		if (this.refreshTimer) clearInterval(this.refreshTimer);
	}

	private async refresh(force = false): Promise<void> {
		if (this.refreshInFlight && !force) return;
		this.refreshInFlight = true;
		this.loading = true;
		try {
			const [sessions, running] = await Promise.all([
				SessionManager.list(this.ctx.cwd),
				loadRunningAgents(),
			]);

			const previousSelectedPath = this.rows[this.selected]?.node.path;
			const currentFile = this.ctx.sessionManager.getSessionFile();
			const currentName = this.ctx.sessionManager.getSessionName();
			const byPath = new Map<string, SessionNode>();

			for (const session of sessions) {
				byPath.set(session.path, {
					path: session.path,
					id: session.id,
					name: session.name,
					firstMessage: session.firstMessage,
					created: session.created,
					modified: session.modified,
					parentSessionPath: session.parentSessionPath,
					children: [],
					current: session.path === currentFile,
					running: false,
				});
			}

			if (currentFile && !byPath.has(currentFile)) {
				byPath.set(currentFile, {
					path: currentFile,
					id: basename(currentFile, ".jsonl"),
					name: currentName,
					created: new Date(),
					modified: new Date(),
					children: [],
					current: true,
					running: false,
				});
			}

			for (const node of byPath.values()) {
				const run = running.get(node.path);
				if (run) {
					node.running = true;
					node.runningStatus = run.status;
					if (!node.name && run.sessionName) node.name = run.sessionName;
				}
			}

			const roots: SessionNode[] = [];
			for (const node of byPath.values()) {
				const parent = node.parentSessionPath ? byPath.get(node.parentSessionPath) : undefined;
				if (parent) parent.children.push(node);
				else roots.push(node);
			}

			const sortNodes = (nodes: SessionNode[]) => {
				nodes.sort((a, b) => {
					if (a.current !== b.current) return a.current ? -1 : 1;
					if (a.running !== b.running) return a.running ? -1 : 1;
					return b.modified.getTime() - a.modified.getTime();
				});
				for (const node of nodes) sortNodes(node.children);
			};
			sortNodes(roots);

			this.seedExpanded(roots, currentFile);
			this.rows = flattenRows(roots, this.expanded);
			this.selected = this.findBestSelection(previousSelectedPath, currentFile);
			this.ensureSelectionVisible();
		} finally {
			this.loading = false;
			this.refreshInFlight = false;
			if (!this.disposed) this.tui.requestRender();
		}
	}

	private seedExpanded(roots: SessionNode[], currentFile?: string): void {
		if (!this.initialized) {
			for (const root of roots) {
				if (root.children.length > 0) this.expanded.add(root.path);
			}
			this.initialized = true;
		}
		if (!currentFile) return;
		const expandAncestors = (node: SessionNode): boolean => {
			let contains = node.path === currentFile;
			for (const child of node.children) {
				if (expandAncestors(child)) contains = true;
			}
			if (contains && node.children.length > 0) this.expanded.add(node.path);
			return contains;
		};
		for (const root of roots) expandAncestors(root);
	}

	private findBestSelection(previousSelectedPath?: string, currentFile?: string): number {
		if (previousSelectedPath) {
			const selectedIdx = this.rows.findIndex((row) => row.node.path === previousSelectedPath);
			if (selectedIdx >= 0) return selectedIdx;
		}
		if (currentFile) {
			const currentIdx = this.rows.findIndex((row) => row.node.path === currentFile);
			if (currentIdx >= 0) return currentIdx;
		}
		return Math.min(this.selected, Math.max(0, this.rows.length - 1));
	}

	private toggleSelection(): void {
		const row = this.rows[this.selected];
		if (!row || row.node.children.length === 0) return;
		if (this.expanded.has(row.node.path)) this.expanded.delete(row.node.path);
		else this.expanded.add(row.node.path);
		this.rows = flattenRows(rebuildRoots(this.rows), this.expanded);
		this.selected = Math.min(this.selected, this.rows.length - 1);
		this.ensureSelectionVisible();
		this.tui.requestRender();
	}

	private expandSelection(): void {
		const row = this.rows[this.selected];
		if (!row) return;
		if (row.node.children.length > 0 && !this.expanded.has(row.node.path)) {
			this.expanded.add(row.node.path);
			this.rows = flattenRows(rebuildRoots(this.rows), this.expanded);
			this.tui.requestRender();
		}
	}

	private collapseSelection(): void {
		const row = this.rows[this.selected];
		if (!row) return;
		if (row.node.children.length > 0 && this.expanded.has(row.node.path)) {
			this.expanded.delete(row.node.path);
			this.rows = flattenRows(rebuildRoots(this.rows), this.expanded);
			this.selected = Math.min(this.selected, this.rows.length - 1);
			this.ensureSelectionVisible();
			this.tui.requestRender();
			return;
		}
		for (let i = this.selected - 1; i >= 0; i--) {
			if (this.rows[i]!.depth < row.depth) {
				this.selected = i;
				this.ensureSelectionVisible();
				this.tui.requestRender();
				return;
			}
		}
	}

	private renderCard(row: SessionRow, selected: boolean, width: number): string[] {
		const node = row.node;
		const prefixParts: string[] = [];
		for (let i = 0; i < row.depth; i++) {
			prefixParts.push(row.ancestorsLast[i] ? "   " : this.theme.fg("dim", "│  "));
		}
		if (row.depth > 0) {
			prefixParts.push(this.theme.fg("dim", row.isLast ? "└─ " : "├─ "));
		}
		const treePrefix = prefixParts.join("");
		const toggle = node.children.length > 0 ? (this.expanded.has(node.path) ? "▾" : "▸") : " ";
		const isSpeaking = node.runningStatus === "running";
		const marker = isSpeaking
			? this.theme.fg("warning", `${SPINNER[this.spinnerIndex]} `)
			: node.current
				? this.theme.fg("accent", "◆ ")
				: "";
		const titleBase = node.name?.trim() || summarizeTitle(node.firstMessage) || basename(node.path, ".jsonl");
		const title = node.current ? this.theme.fg("accent", this.theme.bold(titleBase)) : this.theme.fg("text", titleBase);
		const meta = this.theme.fg(
			"dim",
				`created ${formatDateTime(node.created)} • updated ${formatDateTime(node.modified)}`,
		);
		const extraParts = [this.theme.fg("dim", `${node.id.slice(0, 8)}`)];
		if (node.children.length > 0) extraParts.push(this.theme.fg("dim", `${node.children.length} child${node.children.length === 1 ? "" : "ren"}`));
		const extra = extraParts.join(this.theme.fg("dim", " • "));
		const lines = [
			`${treePrefix}${toggle} ${marker}${title}`,
			`${treePrefix}  ${meta}`,
			`${treePrefix}  ${extra}`,
			`${treePrefix}`,
		].map((line) => truncateToWidth(line, width, "…", true));

		if (!selected) return lines.map((line) => this.pad(line, width));
		return lines.map((line) => this.theme.bg("selectedBg", this.pad(line, width)));
	}

	private ensureSelectionVisible(): void {
		const bodyHeight = Math.max(9, (process.stdout.rows ?? 24) - 7);
		const visibleCount = Math.max(1, Math.floor(bodyHeight / 4));
		if (this.selected < this.scroll) this.scroll = this.selected;
		if (this.selected >= this.scroll + visibleCount) this.scroll = this.selected - visibleCount + 1;
		this.scroll = Math.max(0, this.scroll);
	}

	private pad(text: string, width: number): string {
		const visible = visibleWidth(text);
		return text + " ".repeat(Math.max(0, width - visible));
	}
}

function flattenRows(nodes: SessionNode[], expanded: Set<string>): SessionRow[] {
	const rows: SessionRow[] = [];
	const visit = (node: SessionNode, depth: number, isLast: boolean, ancestorsLast: boolean[]) => {
		rows.push({ node, depth, isLast, ancestorsLast });
		if (!expanded.has(node.path)) return;
		node.children.forEach((child, index) => {
			visit(child, depth + 1, index === node.children.length - 1, [...ancestorsLast, isLast]);
		});
	};
	nodes.forEach((node, index) => visit(node, 0, index === nodes.length - 1, []));
	return rows;
}

function rebuildRoots(rows: SessionRow[]): SessionNode[] {
	const seen = new Set<string>();
	const roots: SessionNode[] = [];
	for (const row of rows) {
		if (row.depth === 0 && !seen.has(row.node.path)) {
			seen.add(row.node.path);
			roots.push(row.node);
		}
	}
	return roots;
}

async function loadRunningAgents(): Promise<Map<string, RunningAgentInfo>> {
	const running = new Map<string, RunningAgentInfo>();
	await mkdir(REGISTRY_DIR, { recursive: true });
	const files = await readdir(REGISTRY_DIR).catch(() => [] as string[]);
	const now = Date.now();
	for (const file of files) {
		if (!file.endsWith(".json")) continue;
		const fullPath = join(REGISTRY_DIR, file);
		try {
			const fileStat = await stat(fullPath);
			if (now - fileStat.mtimeMs > STALE_MS) {
				await rm(fullPath, { force: true }).catch(() => {});
				continue;
			}
			const parsed = JSON.parse(await readFile(fullPath, "utf8")) as RunningAgentInfo;
			if (now - parsed.updatedAt > STALE_MS) {
				await rm(fullPath, { force: true }).catch(() => {});
				continue;
			}
			running.set(parsed.sessionFile, parsed);
		} catch {
			// ignore broken registry files
		}
	}
	return running;
}

function summarizeTitle(text?: string): string | undefined {
	const value = text?.replace(/\s+/g, " ").trim();
	if (!value) return undefined;
	return value;
}

function formatWhen(date: Date): string {
	const now = new Date();
	const sameDay =
		now.getFullYear() === date.getFullYear() &&
		now.getMonth() === date.getMonth() &&
		now.getDate() === date.getDate();
	const hh = String(date.getHours()).padStart(2, "0");
	const mm = String(date.getMinutes()).padStart(2, "0");
	if (sameDay) return `${hh}:${mm}`;
	return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${hh}:${mm}`;
}

function formatDateTime(date: Date): string {
	const yyyy = String(date.getFullYear());
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");
	const hh = String(date.getHours()).padStart(2, "0");
	const min = String(date.getMinutes()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

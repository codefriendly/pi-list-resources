/**
 * List Resources
 *
 * Provides /extensions, /skills, and /prompts commands for the TUI.
 *
 * /extensions — lists installed packages and local extension files
 * /skills    — lists available skills from all skill directories
 * /prompts   — lists available prompt templates
 */

import {
	CONFIG_DIR_NAME,
	DefaultPackageManager,
	getAgentDir,
	SettingsManager,
	type ExtensionAPI,
	type ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function scanExtensionDir(dir: string): string[] {
	if (!existsSync(dir)) return [];
	try {
		return readdirSync(dir)
			.filter((name) => {
				if (name.startsWith(".")) return false;
				const full = join(dir, name);
				try {
					if (statSync(full).isDirectory()) {
						return existsSync(join(full, "index.ts")) || existsSync(join(full, "index.js"));
					}
					return name.endsWith(".ts") || name.endsWith(".js");
				} catch {
					return false;
				}
			})
			.sort();
	} catch {
		return [];
	}
}

export default function (pi: ExtensionAPI) {
	// ── /extensions command ──
	pi.registerCommand("extensions", {
		description: "List installed packages and local extensions",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			const agentDir = getAgentDir();
			const settingsManager = SettingsManager.create(ctx.cwd, agentDir, {
				projectTrusted: ctx.isProjectTrusted(),
			});
			const packageManager = new DefaultPackageManager({
				cwd: ctx.cwd,
				agentDir,
				settingsManager,
			});
			const installedPackages = packageManager.listConfiguredPackages();
			const globalExts = scanExtensionDir(join(agentDir, "extensions"));
			const projectExts = scanExtensionDir(join(ctx.cwd, CONFIG_DIR_NAME, "extensions"));

			const lines: string[] = [];

			if (installedPackages.length > 0) {
				lines.push("📦 Packages:");
				for (const pkg of installedPackages) {
					const label = pkg.source.startsWith("npm:")
						? pkg.source.slice(4)
						: pkg.source.startsWith("git:")
							? pkg.source.slice(4)
							: pkg.source;
					lines.push(`  • ${label}`);
				}
			}

			if (globalExts.length > 0) {
				lines.push("📄 Global extensions:");
				for (const ext of globalExts) {
					lines.push(`  • ${ext}`);
				}
			}

			if (projectExts.length > 0) {
				lines.push("📄 Project extensions:");
				for (const ext of projectExts) {
					lines.push(`  • ${ext}`);
				}
			}

			if (lines.length === 0) {
				ctx.ui.notify("No packages or extensions found.", "info");
				return;
			}

			ctx.ui.notify(lines.join("\n"), "info");
		},
	});

	// ── /skills command ──
	pi.registerCommand("skills", {
		description: "List available skills",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			const skills = ctx.getSystemPromptOptions().skills ?? [];

			if (skills.length === 0) {
				ctx.ui.notify("No skills found.", "info");
				return;
			}

			const lines = ["📘 Skills:"];
			const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name));
			for (const skill of sorted) {
				const source = skill.sourceInfo?.origin === "package" ? skill.sourceInfo.source : undefined;
				const suffix = source ? ` (📦 ${source})` : "";
				lines.push(`  • ${skill.name}${suffix}`);
			}

			ctx.ui.notify(lines.join("\n"), "info");
		},
	});

	// ── /prompts command ──
	pi.registerCommand("prompts", {
		description: "List available prompt templates",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			const prompts = pi
				.getCommands()
				.filter((command) => command.source === "prompt")
				.sort((a, b) => a.name.localeCompare(b.name));

			if (prompts.length === 0) {
				ctx.ui.notify("No prompt templates found.", "info");
				return;
			}

			const lines = ["📝 Prompt templates:"];
			for (const prompt of prompts) {
				const source =
					prompt.sourceInfo.origin === "package"
						? `📦 ${prompt.sourceInfo.source}`
						: prompt.sourceInfo.scope;
				lines.push(`  • /${prompt.name} (${source})`);
			}

			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}

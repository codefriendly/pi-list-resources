/**
 * List Extensions & Skills
 *
 * Provides /extensions and /skills commands for the TUI.
 *
 * /extensions — lists installed packages and local extension files
 * /skills    — lists available skills from all skill directories
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SETTINGS_PATH = join(homedir(), ".pi", "agent", "settings.json");

interface Settings {
	packages?: string[];
	extensions?: string[];
	[key: string]: unknown;
}

function loadSettings(): Settings {
	if (!existsSync(SETTINGS_PATH)) return {};
	try {
		return JSON.parse(readFileSync(SETTINGS_PATH, "utf-8")) as Settings;
	} catch {
		return {};
	}
}

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
			const settings = loadSettings();
			const installedPackages = settings.packages ?? [];
			const globalExts = scanExtensionDir(join(homedir(), ".pi", "agent", "extensions"));
			const projectExts = scanExtensionDir(join(process.cwd(), ".pi", "extensions"));

			const lines: string[] = [];

			if (installedPackages.length > 0) {
				lines.push("**📦 Packages:**");
				for (const pkg of installedPackages) {
					const label = pkg.startsWith("npm:")
						? pkg.slice(4)
						: pkg.startsWith("git:")
							? pkg.slice(4)
							: pkg;
					lines.push(`  • ${label}`);
				}
			}

			if (globalExts.length > 0) {
				lines.push("**📄 Global extensions:**");
				for (const ext of globalExts) {
					lines.push(`  • ${ext}`);
				}
			}

			if (projectExts.length > 0) {
				lines.push("**📄 Project extensions:**");
				for (const ext of projectExts) {
					lines.push(`  • ${ext}`);
				}
			}

			if (lines.length === 0) {
				pi.sendMessage({
					customType: "extensions-list",
					content: "No packages or extensions found.",
					display: true,
				});
				return;
			}

			pi.sendMessage({
				customType: "extensions-list",
				content: lines.join("\n"),
				display: true,
			});
		},
	});

	// ── /skills command ──
	pi.registerCommand("skills", {
		description: "List available skills",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			const skills = ctx.getSystemPromptOptions().skills ?? [];

			if (skills.length === 0) {
				pi.sendMessage({
					customType: "skills-list",
					content: "No skills found.",
					display: true,
				});
				return;
			}

			const lines = ["**📘 Skills:**"];
			const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name));
			for (const skill of sorted) {
				const source = skill.sourceInfo?.origin === "package" ? skill.sourceInfo.source : undefined;
				const suffix = source ? ` (📦 ${source})` : "";
				lines.push(`  • ${skill.name}${suffix}`);
			}

			pi.sendMessage({
				customType: "skills-list",
				content: lines.join("\n"),
				display: true,
			});
		},
	});
}

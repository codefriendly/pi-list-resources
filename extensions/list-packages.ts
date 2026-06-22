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
import { join, basename } from "node:path";
import { execSync } from "node:child_process";

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

function scanDir(dir: string, isExtension: boolean): string[] {
	if (!existsSync(dir)) return [];
	try {
		return readdirSync(dir)
			.filter((name) => {
				if (name.startsWith(".")) return false;
				const full = join(dir, name);
				try {
					if (statSync(full).isDirectory()) {
						if (isExtension) {
							return existsSync(join(full, "index.ts")) || existsSync(join(full, "index.js"));
						}
						return existsSync(join(full, "SKILL.md"));
					}
					if (isExtension) return name.endsWith(".ts") || name.endsWith(".js");
					return name.endsWith(".md");
				} catch {
					return false;
				}
			})
			.sort();
	} catch {
		return [];
	}
}

function getNpmRoots(): string[] {
	const roots: string[] = [];

	try {
		const stdout = execSync("npm root -g", { encoding: "utf-8", timeout: 5000 }).trim();
		if (stdout) roots.push(stdout);
	} catch {}

	const candidates = [
		"/opt/homebrew/lib/node_modules",
		"/usr/local/lib/node_modules",
	];

	for (const dir of candidates) {
		if (!roots.includes(dir) && existsSync(dir)) {
			roots.push(dir);
		}
	}

	return roots;
}

function findPackageSkills(): Map<string, string> {
	const skills = new Map<string, string>();
	const npmRoots = getNpmRoots();

	for (const root of npmRoots) {
		if (!existsSync(root)) continue;
		try {
			const packages = readdirSync(root);
			for (const pkg of packages) {
				if (pkg.startsWith("@")) {
					const scopePath = join(root, pkg);
					if (!statSync(scopePath).isDirectory()) continue;
					try {
						const scopedPkgs = readdirSync(scopePath);
						for (const sp of scopedPkgs) {
							const fullPkg = join(scopePath, sp);
							try {
								if (!statSync(fullPkg).isDirectory()) continue;
								collectSkills(fullPkg, skills);
							} catch {}
						}
					} catch {}
				} else {
					const fullPkg = join(root, pkg);
					try {
						if (!statSync(fullPkg).isDirectory()) continue;
						collectSkills(fullPkg, skills);
					} catch {}
				}
			}
		} catch {}
	}

	return skills;
}

function collectSkills(pkgPath: string, skills: Map<string, string>): void {
	const pkgJsonPath = join(pkgPath, "package.json");
	if (!existsSync(pkgJsonPath)) return;

	try {
		const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as {
			pi?: { skills?: string[] };
		};
		const piManifest = pkgJson.pi;
		if (!piManifest?.skills) return;

		for (const skillPath of piManifest.skills) {
			const resolved = join(pkgPath, skillPath);
			if (!existsSync(resolved)) continue;

			if (statSync(resolved).isDirectory()) {
				try {
					const entries = readdirSync(resolved);
					for (const entry of entries) {
						const skillDir = join(resolved, entry);
						if (entry.startsWith(".")) continue;
						try {
							if (statSync(skillDir).isDirectory() && existsSync(join(skillDir, "SKILL.md"))) {
								skills.set(entry, pkgPath);
							}
						} catch {}
					}
				} catch {}
			}
		}
	} catch {}
}

export default function (pi: ExtensionAPI) {
	// ── /extensions command ──
	pi.registerCommand("extensions", {
		description: "List installed packages and local extensions",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			const settings = loadSettings();
			const installedPackages = settings.packages ?? [];
			const globalExts = scanDir(join(homedir(), ".pi", "agent", "extensions"), true);
			const projectExts = scanDir(join(process.cwd(), ".pi", "extensions"), true);

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
			const baseDirs = [
				join(homedir(), ".pi", "agent", "skills"),
				join(homedir(), ".agents", "skills"),
				join(process.cwd(), ".pi", "skills"),
				join(process.cwd(), ".agents", "skills"),
			];

			const found = new Map<string, string>();

			for (const base of baseDirs) {
				const entries = scanDir(base, false);
				for (const entry of entries) {
					if (!found.has(entry)) found.set(entry, basename(base));
				}
			}

			const pkgSkills = findPackageSkills();
			for (const [name, pkgPath] of pkgSkills) {
				if (!found.has(name)) {
					const pkgName = basename(pkgPath);
					found.set(name, `📦 ${pkgName}`);
				}
			}

			if (found.size === 0) {
				pi.sendMessage({
					customType: "skills-list",
					content: "No skills found.",
					display: true,
				});
				return;
			}

			const lines = ["**📘 Skills:**"];
			const sorted = [...found.entries()].sort(([a], [b]) => a.localeCompare(b));
			for (const [name, source] of sorted) {
				const suffix = source.startsWith("📦") ? ` (${source})` : "";
				lines.push(`  • ${name}${suffix}`);
			}

			pi.sendMessage({
				customType: "skills-list",
				content: lines.join("\n"),
				display: true,
			});
		},
	});
}

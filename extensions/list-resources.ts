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
	type ResolvedResource,
} from "@earendil-works/pi-coding-agent";
import { join, relative, sep } from "node:path";

type SourceMetadata = Pick<ResolvedResource["metadata"], "origin" | "scope" | "source">;

function formatSource(source: SourceMetadata): string {
	return source.origin === "package" ? `📦 ${source.source}` : source.scope;
}

function formatExtension(extension: ResolvedResource, baseDir: string): string {
	const { metadata, path } = extension;
	const relativePath = relative(metadata.baseDir ?? baseDir, path);
	const normalizedPath = relativePath.split(sep).join("/");
	const label = normalizedPath.startsWith("extensions/") ? normalizedPath.slice("extensions/".length) : normalizedPath;
	return `${label} (${formatSource(metadata)})`;
}

export default function (pi: ExtensionAPI) {
	// ── /extensions command ──
	pi.registerCommand("extensions", {
		description: "List discovered extension resources",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			const agentDir = getAgentDir();
			const settingsManager = SettingsManager.create(ctx.cwd, agentDir, {
				projectTrusted: ctx.isProjectTrusted(),
			});
			const settingsErrors = settingsManager.drainErrors();
			if (settingsErrors.length > 0) {
				const message = settingsErrors
					.map(({ scope, error }) => `Could not read ${scope === "global" ? "user" : "project"} settings: ${error.message}`)
					.join("\n");
				ctx.ui.notify(message, "error");
				return;
			}
			const packageManager = new DefaultPackageManager({
				cwd: ctx.cwd,
				agentDir,
				settingsManager,
			});
			const extensions = (await packageManager.resolve(async () => "skip"))
				.extensions.filter((extension) => extension.enabled)
				.map((extension) => {
					const baseDir =
						extension.metadata.scope === "user"
							? agentDir
							: extension.metadata.scope === "project"
								? join(ctx.cwd, CONFIG_DIR_NAME)
								: ctx.cwd;
					return formatExtension(extension, baseDir);
				})
				.sort((a, b) => a.localeCompare(b));

			if (extensions.length === 0) {
				ctx.ui.notify("No extension resources discovered.", "info");
				return;
			}

			ctx.ui.notify(["🔌 Discovered extensions:", ...extensions.map((extension) => `  • ${extension}`)].join("\n"), "info");
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
				lines.push(`  • ${skill.name} (${formatSource(skill.sourceInfo)})`);
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
				lines.push(`  • /${prompt.name} (${formatSource(prompt.sourceInfo)})`);
			}

			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}

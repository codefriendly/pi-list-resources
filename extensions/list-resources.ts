/** Inspect the resources that Pi loaded for the current session. */

import {
	CONFIG_DIR_NAME,
	DefaultPackageManager,
	getAgentDir,
	SettingsManager,
	type ExtensionAPI,
	type ExtensionCommandContext,
	type ResolvedResource,
} from "@earendil-works/pi-coding-agent";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, relative, sep } from "node:path";

type SourceMetadata = Pick<ResolvedResource["metadata"], "origin" | "scope" | "source">;
type Section = "context" | "skills" | "prompts" | "extensions" | "themes";

const sections: Array<{ value: Section; label: string; description: string }> = [
	{ value: "context", label: "context", description: "Show loaded context sources" },
	{ value: "skills", label: "skills", description: "Show loaded skills" },
	{ value: "prompts", label: "prompts", description: "Show loaded prompt templates" },
	{ value: "extensions", label: "extensions", description: "Show discovered extensions" },
	{ value: "themes", label: "themes", description: "Show loaded custom themes" },
];

function formatSource(source: SourceMetadata): string {
	return source.origin === "package" ? `📦 ${source.source}` : source.scope;
}

function formatPath(path: string, cwd: string): string {
	const projectPath = relative(cwd, path);
	let display = !projectPath.startsWith(`..${sep}`) && projectPath !== ".." && !isAbsolute(projectPath) ? projectPath : path;
	const homePath = relative(homedir(), path);
	if (display === path && !homePath.startsWith(`..${sep}`) && homePath !== ".." && !isAbsolute(homePath)) {
		display = homePath ? `~/${homePath}` : "~";
	}
	return display.split(sep).join("/");
}

function extensionLabel(extension: ResolvedResource, baseDir: string): string {
	const relativePath = relative(extension.metadata.baseDir ?? baseDir, extension.path).split(sep).join("/");
	return relativePath.startsWith("extensions/") ? relativePath.slice("extensions/".length) : relativePath;
}

async function resolveExtensions(ctx: ExtensionCommandContext): Promise<Array<{ label: string; detail: string }> | null> {
	const agentDir = getAgentDir();
	const settingsManager = SettingsManager.create(ctx.cwd, agentDir, { projectTrusted: ctx.isProjectTrusted() });
	const settingsErrors = settingsManager.drainErrors();
	if (settingsErrors.length > 0) {
		ctx.ui.notify(
			settingsErrors
				.map(({ scope, error }) => `Could not read ${scope === "global" ? "user" : "project"} settings: ${error.message}`)
				.join("\n"),
			"error",
		);
		return null;
	}

	const packageManager = new DefaultPackageManager({ cwd: ctx.cwd, agentDir, settingsManager });
	return (await packageManager.resolve(async () => "skip"))
		.extensions.filter(({ enabled }) => enabled)
		.map((extension) => {
			const baseDir =
				extension.metadata.scope === "user"
					? agentDir
					: extension.metadata.scope === "project"
						? join(ctx.cwd, CONFIG_DIR_NAME)
						: ctx.cwd;
			const label = extensionLabel(extension, baseDir);
			return { label, detail: `${label} (${formatSource(extension.metadata)})` };
		})
		.sort((a, b) => a.label.localeCompare(b.label));
}

async function conventionalPromptLabel(ctx: ExtensionCommandContext, filename: string, prompt: string, genericLabel: string): Promise<string> {
	const userPath = join(getAgentDir(), filename);
	if (ctx.isProjectTrusted()) {
		const projectPath = join(ctx.cwd, CONFIG_DIR_NAME, filename);
		try {
			const content = await readFile(projectPath, "utf8");
			return content === prompt ? formatPath(projectPath, ctx.cwd) : genericLabel;
		} catch (error) {
			if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) return genericLabel;
		}
	}
	try {
		const content = await readFile(userPath, "utf8");
		return content === prompt ? formatPath(userPath, ctx.cwd) : genericLabel;
	} catch {
		return genericLabel;
	}
}

async function contextLabels(ctx: ExtensionCommandContext): Promise<string[]> {
	const options = ctx.getSystemPromptOptions();
	const labels: string[] = [];
	if (options.customPrompt) labels.push(await conventionalPromptLabel(ctx, "SYSTEM.md", options.customPrompt, "(custom system prompt)"));
	if (options.appendSystemPrompt) {
		labels.push(await conventionalPromptLabel(ctx, "APPEND_SYSTEM.md", options.appendSystemPrompt, "(appended system prompt)"));
	}
	for (const file of options.contextFiles ?? []) labels.push(formatPath(file.path, ctx.cwd));
	return labels;
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("resources", {
		description: "Inspect loaded Pi resources",
		getArgumentCompletions: (prefix) => sections.filter(({ value }) => value.startsWith(prefix.trim().toLowerCase())),
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			const section = args.trim().toLowerCase();
			const skills = () => [...(ctx.getSystemPromptOptions().skills ?? [])].sort((a, b) => a.name.localeCompare(b.name));
			const prompts = () =>
				pi
					.getCommands()
					.filter((command) => command.source === "prompt")
					.sort((a, b) => a.name.localeCompare(b.name));
			const themes = () =>
				[...ctx.ui.getAllThemes()]
					.flatMap((theme) => {
						const sourceInfo = ctx.ui.getTheme(theme.name)?.sourceInfo;
						return sourceInfo ? [{ ...theme, sourceInfo }] : [];
					})
					.sort((a, b) => a.name.localeCompare(b.name));

			if (section === "context") {
				const labels = await contextLabels(ctx);
				ctx.ui.notify(labels.length ? ["📄 Context:", ...labels.map((label) => `  • ${label}`)].join("\n") : "No context resources found.", "info");
				return;
			}
			if (section === "skills") {
				const resources = skills();
				ctx.ui.notify(
					resources.length
						? ["📘 Skills:", ...resources.map((skill) => `  • ${skill.name} (${formatSource(skill.sourceInfo)})`)].join("\n")
						: "No skills found.",
					"info",
				);
				return;
			}
			if (section === "prompts") {
				const resources = prompts();
				ctx.ui.notify(
					resources.length
						? ["📝 Prompt templates:", ...resources.map((prompt) => `  • /${prompt.name} (${formatSource(prompt.sourceInfo)})`)].join("\n")
						: "No prompt templates found.",
					"info",
				);
				return;
			}
			if (section === "extensions") {
				const resources = await resolveExtensions(ctx);
				if (!resources) return;
				ctx.ui.notify(
					resources.length ? ["🔌 Discovered extensions:", ...resources.map(({ detail }) => `  • ${detail}`)].join("\n") : "No extension resources discovered.",
					"info",
				);
				return;
			}
			if (section === "themes") {
				const resources = themes();
				ctx.ui.notify(
					resources.length
						? [
								"🎨 Themes:",
								...resources.map(
									({ name, path, sourceInfo }) => `  • ${name}${path ? ` — ${formatPath(path, ctx.cwd)}` : ""} (${formatSource(sourceInfo)})`,
								),
							].join("\n")
						: "No custom themes found.",
					"info",
				);
				return;
			}
			if (section) {
				ctx.ui.notify(
					`Unknown resource section "${section}".\nUsage: /resources [context|skills|prompts|extensions|themes]`,
					"error",
				);
				return;
			}

			const extensions = await resolveExtensions(ctx);
			if (!extensions) return;
			const groups: Array<[string, string[]]> = [
				["Context", await contextLabels(ctx)],
				["Skills", skills().map(({ name }) => name)],
				["Prompts", prompts().map(({ name }) => `/${name}`)],
				["Extensions", extensions.map(({ label }) => label)],
				["Themes", themes().map(({ name }) => name)],
			];
			const lines: string[] = [];
			for (const [heading, labels] of groups) {
				if (!labels.length) continue;
				if (lines.length) lines.push("");
				lines.push(`[${heading}]`, `  ${labels.join(", ")}`);
			}
			if (lines.length) lines.push("");
			lines.push("Run /resources <section> for details.", "Sections: context, skills, prompts, extensions, themes");
			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}

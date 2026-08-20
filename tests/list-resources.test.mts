import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import listResources from "../extensions/list-resources.ts";

type Notification = { message: string; level: string };
type CommandOptions = {
	description?: string;
	getArgumentCompletions?: (prefix: string) => Array<{ value: string; label: string; description?: string }> | null;
	handler: (args: string, ctx: never) => Promise<void>;
};

function createHarness(piCommands: unknown[] = []) {
	const commands = new Map<string, CommandOptions>();
	const notifications: Notification[] = [];
	const pi = {
		registerCommand(name: string, options: CommandOptions) {
			commands.set(name, options);
		},
		getCommands() {
			return piCommands;
		},
		sendMessage() {
			throw new Error("read-only commands must not send model-context messages");
		},
	};

	listResources(pi as never);

	const command = commands.get("resources");
	return {
		commands,
		command,
		notifications,
		notify(message: string, level = "info") {
			notifications.push({ message, level });
		},
	};
}

function createContext(
	projectDir: string,
	notify: (message: string, level?: string) => void,
	overrides: Record<string, unknown> = {},
) {
	return {
		cwd: projectDir,
		isProjectTrusted() {
			return true;
		},
		getSystemPromptOptions() {
			return {};
		},
		ui: {
			notify,
			getAllThemes() {
				return [];
			},
			getTheme() {
				return undefined;
			},
		},
		...overrides,
	};
}

test("registers one /resources command with section completions", () => {
	const { commands, command } = createHarness();

	assert.deepEqual([...commands.keys()], ["resources"]);
	assert.ok(command);
	assert.equal(command.description, "Inspect loaded Pi resources");
	assert.deepEqual(
		command.getArgumentCompletions?.("")?.map(({ value }) => value),
		["context", "skills", "prompts", "extensions", "themes"],
	);
	assert.deepEqual(command.getArgumentCompletions?.("th"), [
		{ value: "themes", label: "themes", description: "Show loaded custom themes" },
	]);
	assert.deepEqual(command.getArgumentCompletions?.("  EX  "), [
		{ value: "extensions", label: "extensions", description: "Show discovered extensions" },
	]);
});

test("/resources trims and lowercases section arguments", async () => {
	const { command, notifications, notify } = createHarness();
	assert.ok(command);

	await command.handler("  PrOmPtS  ", createContext("/workspace/project", notify) as never);

	assert.deepEqual(notifications, [{ message: "No prompt templates found.", level: "info" }]);
});

test("/resources renders a compact startup-style overview", async (t) => {
	const root = mkdtempSync(join(tmpdir(), "pi-list-resources-"));
	const agentDir = join(root, "agent");
	const projectDir = join(root, "project");
	const projectContext = join(projectDir, "AGENTS.md");
	const customTheme = join(projectDir, ".pi", "themes", "custom-dark.json");
	const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

	t.after(() => {
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		rmSync(root, { recursive: true, force: true });
	});

	mkdirSync(join(agentDir, "extensions"), { recursive: true });
	mkdirSync(join(projectDir, ".pi", "themes"), { recursive: true });
	writeFileSync(join(agentDir, "extensions", "local.ts"), "export default function () {}\n");
	process.env.PI_CODING_AGENT_DIR = agentDir;

	const { command, notifications, notify } = createHarness([
		{
			name: "alpha-prompt",
			source: "prompt",
			sourceInfo: { origin: "top-level", scope: "project", source: "prompts" },
		},
	]);
	assert.ok(command);
	const context = createContext(projectDir, notify, {
		getSystemPromptOptions() {
			return {
				appendSystemPrompt: "extra instructions",
				contextFiles: [{ path: projectContext, content: "instructions" }],
				skills: [
					{
						name: "alpha-skill",
						sourceInfo: { origin: "top-level", scope: "project", source: "skills" },
					},
				],
			};
		},
		ui: {
			notify,
			getAllThemes() {
				return [
					{ name: "dark", path: "/pi/themes/dark.json" },
					{ name: "custom-dark", path: customTheme },
				];
			},
			getTheme(name: string) {
				return name === "custom-dark"
					? { sourceInfo: { origin: "top-level", scope: "project", source: "themes" } }
					: {};
			},
		},
	});

	await command.handler("", context as never);

	assert.deepEqual(notifications, [
		{
			level: "info",
			message: [
				"[Context]",
				"  (appended system prompt), AGENTS.md",
				"",
				"[Skills]",
				"  alpha-skill",
				"",
				"[Prompts]",
				"  /alpha-prompt",
				"",
				"[Extensions]",
				"  local.ts",
				"",
				"[Themes]",
				"  custom-dark",
				"",
				"Run /resources <section> for details.",
				"Sections: context, skills, prompts, extensions, themes",
			].join("\n"),
		},
	]);
});

test("/resources context lists exposed files and generic prompt sources", async () => {
	const projectDir = "/workspace/project";
	const { command, notifications, notify } = createHarness();
	assert.ok(command);

	await command.handler(
		"context",
		createContext(projectDir, notify, {
			getSystemPromptOptions() {
				return {
					customPrompt: "custom",
					appendSystemPrompt: "appended",
					contextFiles: [
						{ path: "/workspace/project/AGENTS.md", content: "project" },
						{ path: "/opt/shared/AGENTS.md", content: "shared" },
					],
				};
			},
		}) as never,
	);

	assert.deepEqual(notifications, [
		{
			level: "info",
			message:
				"📄 Context:\n  • (custom system prompt)\n  • (appended system prompt)\n  • AGENTS.md\n  • /opt/shared/AGENTS.md",
		},
	]);
});

test("/resources skills and prompts list Pi's resolved resources", async () => {
	const { command, notifications, notify } = createHarness([
		{
			name: "zeta",
			source: "prompt",
			sourceInfo: { origin: "top-level", scope: "user", source: "prompts" },
		},
		{
			name: "alpha",
			source: "prompt",
			sourceInfo: { origin: "package", scope: "user", source: "npm:@scope/toolkit" },
		},
		{ name: "ignored", source: "extension", sourceInfo: { origin: "top-level", scope: "user" } },
	]);
	assert.ok(command);
	const context = createContext("/workspace/project", notify, {
		getSystemPromptOptions() {
			return {
				skills: [
					{
						name: "zeta-local",
						sourceInfo: { origin: "top-level", scope: "user", source: "skills" },
					},
					{
						name: "alpha-package",
						sourceInfo: { origin: "package", scope: "user", source: "npm:@scope/toolkit" },
					},
				],
			};
		},
	});

	await command.handler("skills", context as never);
	await command.handler("prompts", context as never);

	assert.deepEqual(notifications, [
		{
			level: "info",
			message: "📘 Skills:\n  • alpha-package (📦 npm:@scope/toolkit)\n  • zeta-local (user)",
		},
		{
			level: "info",
			message: "📝 Prompt templates:\n  • /alpha (📦 npm:@scope/toolkit)\n  • /zeta (user)",
		},
	]);
});

test("/resources extensions keeps Pi resolver behavior and source labels", async (t) => {
	const root = mkdtempSync(join(tmpdir(), "pi-list-resources-"));
	const agentDir = join(root, "agent");
	const projectDir = join(root, "project");
	const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

	t.after(() => {
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		rmSync(root, { recursive: true, force: true });
	});

	mkdirSync(join(agentDir, "user-package", "extensions"), { recursive: true });
	mkdirSync(join(projectDir, ".pi", "extensions"), { recursive: true });
	writeFileSync(
		join(agentDir, "user-package", "package.json"),
		JSON.stringify({ pi: { extensions: ["extensions/index.ts"] } }),
	);
	writeFileSync(join(agentDir, "user-package", "extensions", "index.ts"), "export default function () {}\n");
	writeFileSync(
		join(agentDir, "settings.json"),
		JSON.stringify({ packages: [{ source: "./user-package", extensions: ["extensions/index.ts"] }] }),
	);
	writeFileSync(join(projectDir, ".pi", "extensions", "project.ts"), "export default function () {}\n");
	process.env.PI_CODING_AGENT_DIR = agentDir;

	const { command, notifications, notify } = createHarness();
	assert.ok(command);
	await command.handler("extensions", createContext(projectDir, notify) as never);

	assert.deepEqual(notifications, [
		{
			level: "info",
			message: "🔌 Discovered extensions:\n  • index.ts (📦 ./user-package)\n  • project.ts (project)",
		},
	]);
});

test("/resources themes lists custom themes with paths and provenance", async () => {
	const projectDir = "/workspace/project";
	const { command, notifications, notify } = createHarness();
	assert.ok(command);
	const context = createContext(projectDir, notify, {
		ui: {
			notify,
			getAllThemes() {
				return [
					{ name: "dark", path: "/pi/themes/dark.json" },
					{ name: "package-theme", path: "/packages/toolkit/themes/package.json" },
					{ name: "project-theme", path: "/workspace/project/.pi/themes/project.json" },
				];
			},
			getTheme(name: string) {
				if (name === "package-theme") {
					return { sourceInfo: { origin: "package", scope: "user", source: "npm:@scope/toolkit" } };
				}
				if (name === "project-theme") {
					return { sourceInfo: { origin: "top-level", scope: "project", source: "themes" } };
				}
				return {};
			},
		},
	});

	await command.handler("themes", context as never);

	assert.deepEqual(notifications, [
		{
			level: "info",
			message:
				"🎨 Themes:\n  • package-theme — /packages/toolkit/themes/package.json (📦 npm:@scope/toolkit)\n  • project-theme — .pi/themes/project.json (project)",
		},
	]);
});

test("/resources reports settings failures for detail and overview", async (t) => {
	const root = mkdtempSync(join(tmpdir(), "pi-list-resources-"));
	const agentDir = join(root, "agent");
	const projectDir = join(root, "project");
	const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

	t.after(() => {
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		rmSync(root, { recursive: true, force: true });
	});

	mkdirSync(agentDir, { recursive: true });
	mkdirSync(projectDir, { recursive: true });
	writeFileSync(join(agentDir, "settings.json"), "{ invalid json\n");
	process.env.PI_CODING_AGENT_DIR = agentDir;

	const { command, notifications, notify } = createHarness();
	assert.ok(command);
	const context = createContext(projectDir, notify);

	await command.handler("extensions", context as never);
	await command.handler("", context as never);

	assert.equal(notifications.length, 2);
	for (const notification of notifications) {
		assert.equal(notification.level, "error");
		assert.match(notification.message, /^Could not read user settings: /);
	}
});

test("/resources reports empty sections and invalid arguments", async () => {
	const { command, notifications, notify } = createHarness();
	assert.ok(command);
	const context = createContext("/workspace/project", notify);

	await command.handler("prompts", context as never);
	await command.handler("widgets", context as never);

	assert.deepEqual(notifications, [
		{ message: "No prompt templates found.", level: "info" },
		{
			message: 'Unknown resource section "widgets".\nUsage: /resources [context|skills|prompts|extensions|themes]',
			level: "error",
		},
	]);
});

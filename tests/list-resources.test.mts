import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import listResources from "../extensions/list-resources.ts";

test("/skills lists only Pi's resolved loaded skills", async () => {
	const commands = new Map<string, (args: string, ctx: unknown) => Promise<void>>();
	const notifications: string[] = [];
	const pi = {
		registerCommand(name: string, options: { handler: (args: string, ctx: unknown) => Promise<void> }) {
			commands.set(name, options.handler);
		},
		sendMessage() {
			throw new Error("read-only commands must not send model-context messages");
		},
	};

	listResources(pi as never);

	const handler = commands.get("skills");
	assert.ok(handler);
	await handler("", {
		ui: {
			notify(message: string) {
				notifications.push(message);
			},
		},
		getSystemPromptOptions() {
			return {
				skills: [
					{
						name: "zeta-local",
						sourceInfo: { origin: "top-level", source: "skills" },
					},
					{
						name: "alpha-package",
						sourceInfo: { origin: "package", source: "npm:@scope/toolkit" },
					},
				],
			};
		},
	});

	assert.equal(notifications.length, 1);
	assert.equal(
		notifications[0],
		"📘 Skills:\n  • alpha-package (📦 npm:@scope/toolkit)\n  • zeta-local",
	);
});

test("/extensions uses Pi's resolved user and project config directories", async (t) => {
	const root = mkdtempSync(join(tmpdir(), "pi-list-resources-"));
	const agentDir = join(root, "custom-agent");
	const projectDir = join(root, "project");
	const otherDir = join(root, "other");
	const originalAgentDir = process.env.PI_CODING_AGENT_DIR;
	const originalCwd = process.cwd();

	t.after(() => {
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		process.chdir(originalCwd);
		rmSync(root, { recursive: true, force: true });
	});

	mkdirSync(join(agentDir, "extensions"), { recursive: true });
	mkdirSync(join(projectDir, ".pi", "extensions"), { recursive: true });
	mkdirSync(otherDir);
	writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ packages: ["npm:custom-package"] }));
	writeFileSync(join(agentDir, "extensions", "global.ts"), "export default function () {}\n");
	writeFileSync(join(projectDir, ".pi", "extensions", "project.ts"), "export default function () {}\n");
	process.env.PI_CODING_AGENT_DIR = agentDir;
	process.chdir(otherDir);

	const commands = new Map<string, (args: string, ctx: unknown) => Promise<void>>();
	const notifications: string[] = [];
	const pi = {
		registerCommand(name: string, options: { handler: (args: string, ctx: unknown) => Promise<void> }) {
			commands.set(name, options.handler);
		},
		sendMessage() {
			throw new Error("read-only commands must not send model-context messages");
		},
	};

	listResources(pi as never);

	const handler = commands.get("extensions");
	assert.ok(handler);
	await handler("", {
		cwd: projectDir,
		isProjectTrusted() {
			return true;
		},
		ui: {
			notify(message: string) {
				notifications.push(message);
			},
		},
	});

	assert.equal(notifications.length, 1);
	assert.equal(
		notifications[0],
		"🔌 Discovered extensions:\n  • global.ts (user)\n  • project.ts (project)",
	);
});

test("/extensions supports filtered packages from user and project settings", async (t) => {
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
	mkdirSync(join(projectDir, ".pi", "project-package", "extensions"), { recursive: true });
	writeFileSync(
		join(agentDir, "user-package", "package.json"),
		JSON.stringify({ pi: { extensions: ["extensions/index.ts"] } }),
	);
	writeFileSync(join(agentDir, "user-package", "extensions", "index.ts"), "export default function () {}\n");
	writeFileSync(
		join(projectDir, ".pi", "project-package", "package.json"),
		JSON.stringify({ pi: { extensions: ["extensions/index.ts"] } }),
	);
	writeFileSync(
		join(projectDir, ".pi", "project-package", "extensions", "index.ts"),
		"export default function () {}\n",
	);
	writeFileSync(
		join(agentDir, "settings.json"),
		JSON.stringify({ packages: [{ source: "./user-package", extensions: ["extensions/index.ts"] }] }),
	);
	writeFileSync(
		join(projectDir, ".pi", "settings.json"),
		JSON.stringify({ packages: [{ source: "./project-package", extensions: ["extensions/index.ts"] }] }),
	);
	process.env.PI_CODING_AGENT_DIR = agentDir;

	const commands = new Map<string, (args: string, ctx: unknown) => Promise<void>>();
	const notifications: string[] = [];
	const pi = {
		registerCommand(name: string, options: { handler: (args: string, ctx: unknown) => Promise<void> }) {
			commands.set(name, options.handler);
		},
		sendMessage() {
			throw new Error("read-only commands must not send model-context messages");
		},
	};

	listResources(pi as never);

	const handler = commands.get("extensions");
	assert.ok(handler);
	await handler("", {
		cwd: projectDir,
		isProjectTrusted() {
			return true;
		},
		ui: {
			notify(message: string) {
				notifications.push(message);
			},
		},
	});

	assert.deepEqual(notifications, [
		"🔌 Discovered extensions:\n  • index.ts (📦 ./project-package)\n  • index.ts (📦 ./user-package)",
	]);
});

test("/extensions lists Pi-resolved extension resources", async (t) => {
	const root = mkdtempSync(join(tmpdir(), "pi-list-resources-"));
	const agentDir = join(root, "agent");
	const projectDir = join(root, "project");
	const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

	t.after(() => {
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		rmSync(root, { recursive: true, force: true });
	});

	mkdirSync(join(agentDir, "custom"), { recursive: true });
	mkdirSync(join(projectDir, ".pi", "extensions"), { recursive: true });
	writeFileSync(join(agentDir, "custom", "explicit.ts"), "export default function () {}\n");
	writeFileSync(
		join(agentDir, "settings.json"),
		JSON.stringify({ extensions: ["custom/explicit.ts"] }),
	);
	writeFileSync(join(projectDir, ".pi", "extensions", "auto.ts"), "export default function () {}\n");
	process.env.PI_CODING_AGENT_DIR = agentDir;

	const commands = new Map<string, (args: string, ctx: unknown) => Promise<void>>();
	const notifications: string[] = [];
	const pi = {
		registerCommand(name: string, options: { handler: (args: string, ctx: unknown) => Promise<void> }) {
			commands.set(name, options.handler);
		},
		sendMessage() {
			throw new Error("read-only commands must not send model-context messages");
		},
	};

	listResources(pi as never);

	const handler = commands.get("extensions");
	assert.ok(handler);
	await handler("", {
		cwd: projectDir,
		isProjectTrusted() {
			return true;
		},
		ui: {
			notify(message: string) {
				notifications.push(message);
			},
		},
	});

	assert.deepEqual(notifications, ["🔌 Discovered extensions:\n  • auto.ts (project)\n  • custom/explicit.ts (user)"]);
});

test("/prompts lists only Pi's resolved prompt templates", async () => {
	const commands = new Map<string, (args: string, ctx: unknown) => Promise<void>>();
	const notifications: string[] = [];
	const pi = {
		registerCommand(name: string, options: { handler: (args: string, ctx: unknown) => Promise<void> }) {
			commands.set(name, options.handler);
		},
		getCommands() {
			return [
				{
					name: "ignored-extension",
					source: "extension",
					sourceInfo: { origin: "top-level", source: "extension" },
				},
				{
					name: "zeta",
					source: "prompt",
					sourceInfo: { origin: "top-level", scope: "user", source: "prompts" },
				},
				{
					name: "alpha",
					source: "prompt",
					sourceInfo: { origin: "package", source: "npm:@scope/toolkit" },
				},
				{
					name: "ignored-skill",
					source: "skill",
					sourceInfo: { origin: "top-level", source: "skills" },
				},
			];
		},
		sendMessage() {
			throw new Error("read-only commands must not send model-context messages");
		},
	};

	listResources(pi as never);

	const handler = commands.get("prompts");
	assert.ok(handler);
	await handler("", {
		ui: {
			notify(message: string) {
				notifications.push(message);
			},
		},
	});

	assert.deepEqual(notifications, ["📝 Prompt templates:\n  • /alpha (📦 npm:@scope/toolkit)\n  • /zeta (user)"]);
});

test("/prompts reports when no prompt templates are loaded", async () => {
	const commands = new Map<string, (args: string, ctx: unknown) => Promise<void>>();
	const notifications: string[] = [];
	const pi = {
		registerCommand(name: string, options: { handler: (args: string, ctx: unknown) => Promise<void> }) {
			commands.set(name, options.handler);
		},
		getCommands() {
			return [
				{
					name: "ignored-skill",
					source: "skill",
					sourceInfo: { origin: "top-level", source: "skills" },
				},
			];
		},
		sendMessage() {
			throw new Error("read-only commands must not send model-context messages");
		},
	};

	listResources(pi as never);

	const handler = commands.get("prompts");
	assert.ok(handler);
	await handler("", {
		ui: {
			notify(message: string) {
				notifications.push(message);
			},
		},
	});

	assert.deepEqual(notifications, ["No prompt templates found."]);
});

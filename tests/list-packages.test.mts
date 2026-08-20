import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import listPackages from "../extensions/list-packages.ts";

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

	listPackages(pi as never);

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
	const root = mkdtempSync(join(tmpdir(), "pi-list-packages-"));
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

	listPackages(pi as never);

	const handler = commands.get("extensions");
	assert.ok(handler);
	await handler("", {
		cwd: projectDir,
		ui: {
			notify(message: string) {
				notifications.push(message);
			},
		},
	});

	assert.equal(notifications.length, 1);
	assert.equal(
		notifications[0],
		"📦 Packages:\n  • custom-package\n📄 Global extensions:\n  • global.ts\n📄 Project extensions:\n  • project.ts",
	);
});

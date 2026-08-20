import assert from "node:assert/strict";
import test from "node:test";

import listPackages from "../extensions/list-packages.ts";

test("/skills lists only Pi's resolved loaded skills", async () => {
	const commands = new Map<string, (args: string, ctx: unknown) => Promise<void>>();
	const messages: Array<{ content: string }> = [];
	const pi = {
		registerCommand(name: string, options: { handler: (args: string, ctx: unknown) => Promise<void> }) {
			commands.set(name, options.handler);
		},
		sendMessage(message: { content: string }) {
			messages.push(message);
		},
	};

	listPackages(pi as never);

	const handler = commands.get("skills");
	assert.ok(handler);
	await handler("", {
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

	assert.equal(messages.length, 1);
	assert.equal(
		messages[0].content,
		"**📘 Skills:**\n  • alpha-package (📦 npm:@scope/toolkit)\n  • zeta-local",
	);
});

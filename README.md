# pi-list-resources

[![npm version](https://img.shields.io/npm/v/pi-list-resources.svg)](https://www.npmjs.com/package/pi-list-resources)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Inspect Pi resources—context, extensions, skills, prompt templates, and themes—from one command.

![pi-list-resources showing the resource overview and skill source details](https://raw.githubusercontent.com/codefriendly/pi-list-resources/main/docs/cover.png)

## Install

Install from npm:

```bash
pi install npm:pi-list-resources
```

Or install directly from GitHub:

```bash
pi install https://github.com/codefriendly/pi-list-resources
```

## Usage

Run `/resources` with no argument for a compact, startup-style summary of non-empty resource sections.

The summary ends with a hint to run `/resources <section>` for more detail. For example:

```text
/resources context
/resources themes
```

Typing `/resources ` offers completion for all five section names.

| Section | Shows |
| --- | --- |
| Context | Loaded context files and identifiable prompt sources |
| Skills | Skills loaded for the current session |
| Prompts | Available prompt templates as invokable slash commands |
| Extensions | Enabled extension resources discovered by Pi |
| Themes | Loaded custom themes, excluding Pi's built-ins |

See the [usage guide](docs/usage.md) for details and current limitations.

## Update

```bash
pi update --extension npm:pi-list-resources
```

# pi-list-resources

Pi extension that adds a resource inspection command for context, extensions, skills, prompt templates, and themes.

## What it adds

### `/resources`

Run `/resources` with no argument for a compact, startup-style summary. It shows non-empty sections for:

- **Context**
- **Skills**
- **Prompts**
- **Extensions**
- **Themes**

The summary ends with a hint to run `/resources <section>` for detailed names, paths, and source information. For example:

```text
/resources context
/resources themes
```

Typing `/resources ` offers completion for all five section names.

## What each section reports

- **Context** uses `getSystemPromptOptions().contextFiles` for authoritative loaded context paths. Pi does not expose paths for custom or appended system-prompt text, so those entries can appear as generic labels.
- **Skills** uses Pi's resolved `getSystemPromptOptions().skills` state, after Pi applies its loading and resolution rules.
- **Prompts** uses Pi's resolved prompt-command state and displays templates as invokable slash commands.
- **Extensions** shows enabled resources discovered by Pi's public resolver. This is not a guarantee that every resource loaded successfully, and temporary `-e` extensions are unavailable through the resolver.
- **Themes** shows loaded custom themes only. Built-in themes are excluded to mirror Pi's startup display.

See the [Usage guide](docs/usage.md) for detailed behavior and discovery notes.

## Install

Install from npm:

```bash
pi install npm:pi-list-resources
```

Or install directly from GitHub:

```bash
pi install git:github.com/codefriendly/pi-list-resources
```

## Update

```bash
pi update --extension npm:pi-list-resources
```

## Files

```text
extensions/
  list-resources.ts
docs/
  usage.md
tests/
  list-resources.test.mts
LICENSE
package.json
README.md
```

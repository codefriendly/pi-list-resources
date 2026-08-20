# pi-list-resources

Pi extension that adds quick inspection commands for extensions, skills, and prompt templates.

## What it adds

### `/extensions`

Shows:

- enabled extension resources Pi discovers from user and project directories, settings, and installed packages
- each extension's package source or user/project scope

Pi does not currently expose its successfully loaded extension list to extensions. `/extensions` therefore shows what Pi's public resolver discovers, not a guarantee that every listed extension loaded successfully. Temporary `-e` extensions are not available through this API.

### `/skills`

Shows the skills Pi loaded for the current session, including skills from:

- `~/.pi/agent/skills`
- `~/.agents/skills`
- project `.pi/skills` and `.agents/skills` directories
- settings and `--skill` paths
- installed Pi packages

### `/prompts`

Shows the prompt templates Pi loaded for the current session as their invokable slash commands, including templates from user and project directories, settings, CLI paths, and installed Pi packages.

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

## More

- `docs/usage.md` for command behavior and discovery notes.

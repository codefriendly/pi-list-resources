# pi-list-packages

Pi extension that adds quick inspection commands for installed packages, extensions, and skills.

## What it adds

### `/extensions`

Shows:

- installed Pi packages from settings
- global extensions in `~/.pi/agent/extensions`
- project extensions in `.pi/extensions`

### `/skills`

Shows the skills Pi loaded for the current session, including skills from:

- `~/.pi/agent/skills`
- `~/.agents/skills`
- project `.pi/skills` and `.agents/skills` directories
- settings and `--skill` paths
- installed Pi packages

## Install

Install from npm:

```bash
pi install npm:pi-list-packages
```

Or install directly from GitHub:

```bash
pi install git:github.com/codefriendly/pi-list-packages
```

## Update

```bash
pi update --extension npm:pi-list-packages
```

## Files

```text
extensions/
  list-packages.ts
docs/
  usage.md
tests/
  list-packages.test.mts
LICENSE
package.json
README.md
```

## More

- `docs/usage.md` for command behavior and discovery notes.

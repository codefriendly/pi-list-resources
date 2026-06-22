# Usage

## Commands

### `/extensions`

Displays:

- installed Pi packages from settings
- global extensions from `~/.pi/agent/extensions`
- project extensions from `.pi/extensions`

### `/skills`

Displays skills from common local skill directories and from installed Pi packages that declare skills.

## Discovery notes

### Extension discovery

`/extensions` looks at:

- Pi package entries from settings
- `~/.pi/agent/extensions`
- `.pi/extensions`

### Skill discovery

`/skills` looks at:

- `~/.pi/agent/skills`
- `~/.agents/skills`
- `.pi/skills`
- `.agents/skills`
- installed npm packages that declare Pi skills in `package.json`

## Notes

This extension is a lightweight inspection tool. It does not install, remove, or manage packages.

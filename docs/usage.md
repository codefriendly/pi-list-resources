# Usage

## Commands

### `/extensions`

Displays:

- installed Pi packages from settings
- global extensions from `~/.pi/agent/extensions`
- project extensions from `.pi/extensions`

### `/skills`

Displays the skills Pi loaded for the current session.

## Discovery notes

### Extension discovery

`/extensions` looks at:

- Pi package entries from settings
- `~/.pi/agent/extensions`
- `.pi/extensions`

### Skill discovery

`/skills` uses Pi's resolved skill list, which includes skills loaded from:

- `~/.pi/agent/skills`
- `~/.agents/skills`
- project `.pi/skills` and `.agents/skills` directories
- configured and command-line skill paths
- installed Pi packages

Pi applies its normal trust, validation, filtering, and collision rules before the command displays the list.

## Notes

This extension is a lightweight inspection tool. It does not install, remove, or manage packages.

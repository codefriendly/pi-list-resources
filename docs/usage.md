# Usage

## Commands

### `/extensions`

Displays:

- installed Pi packages from settings
- global extensions from `~/.pi/agent/extensions`
- project extensions from `.pi/extensions`

### `/skills`

Displays the skills Pi loaded for the current session.

### `/prompts`

Displays the prompt templates Pi loaded for the current session as invokable slash commands.

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

### Prompt template discovery

`/prompts` uses Pi's resolved slash-command list, so it includes prompt templates from user and project directories, settings, command-line paths, and installed Pi packages.

## Notes

This extension is a lightweight inspection tool. It does not install, remove, or manage packages.

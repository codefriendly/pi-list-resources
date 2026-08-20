# Usage

## Commands

### `/extensions`

Displays:

- enabled extension resources Pi discovers from user and project directories, settings, and installed packages
- each extension's package source or user/project scope

### `/skills`

Displays the skills Pi loaded for the current session.

### `/prompts`

Displays the prompt templates Pi loaded for the current session as invokable slash commands.

## Discovery notes

### Extension discovery

`/extensions` uses Pi's public package resolver, which includes:

- auto-discovered user and project extension directories
- explicit extension paths from settings
- installed package extensions after Pi applies resource filters

Pi does not currently expose its successfully loaded extension list to extensions. The command therefore reports discovered, enabled extension resources rather than guaranteeing that each one loaded successfully. Temporary `-e` extensions are not available through the public resolver.

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

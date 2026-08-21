# Usage

## Command

### `/resources`

With no argument, `/resources` displays a compact, startup-style overview. It includes each non-empty section in this order:

1. Context
2. Skills
3. Prompts
4. Extensions
5. Themes

Empty sections are omitted. The output ends with a hint to run `/resources <section>` for details and lists the available sections.

Run `/resources <section>` to inspect one section in detail:

```text
/resources context
/resources skills
/resources prompts
/resources extensions
/resources themes
```

Typing `/resources ` offers argument completion for the five section names.

## Sections and data sources

### Context

`/resources context` reads `getSystemPromptOptions().contextFiles`, Pi's authoritative list of loaded context files, and displays their project-relative, home-relative, or absolute paths.

Custom system-prompt and appended system-prompt text also comes from `getSystemPromptOptions()`. The command treats that text as the session's base prompt component/options, not definitively the current effective prompt.

Attribution to Pi's conventional `SYSTEM.md` and `APPEND_SYSTEM.md` locations is best-effort. The command prefers files in a trusted project's `.pi` directory over files in the user agent directory and displays a conventional path only when the file is readable and its current UTF-8 contents exactly equal the corresponding prompt text. That equality identifies a plausible conventional source, but it cannot prove provenance: Pi's public extension API omits recorded source paths, CLI or runtime content can be identical to file content, and a file can change after Pi loads it. When no plausible conventional source matches, the command uses the generic `(custom system prompt)` or `(appended system prompt)` label.

### Skills

`/resources skills` uses Pi's resolved `getSystemPromptOptions().skills` state. It therefore reflects Pi's normal trust, validation, filtering, recursion, and collision decisions rather than independently scanning the filesystem. Details include package provenance or user/project scope.

### Prompts

`/resources prompts` uses Pi's resolved command state, filtered to prompt templates. It displays templates as invokable slash commands with package provenance or user/project/temporary scope.

### Extensions

`/resources extensions` uses Pi's public package resolver, which includes:

- auto-discovered user and project extension directories
- explicit extension paths from settings
- installed package extensions after Pi applies resource filters

Pi does not currently expose its successfully loaded extension list to extensions. The command therefore reports discovered, enabled extension resources rather than guaranteeing that each one loaded successfully. Temporary `-e` extensions are not available through the public resolver.

### Themes

`/resources themes` uses Pi's loaded theme state and reports custom themes that have source information, including their paths when available. Built-in themes are intentionally excluded to mirror Pi's startup display.

## Notes

This extension is a lightweight inspection tool. It does not install, remove, or manage packages.

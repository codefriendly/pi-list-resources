# pi-list-packages

Pi extension that adds quick inspection commands for installed packages, extensions, and skills.

## What it adds

### `/extensions`

Shows:

- installed Pi packages from settings
- global extensions in `~/.pi/agent/extensions`
- project extensions in `.pi/extensions`

### `/skills`

Shows skills discovered from:

- `~/.pi/agent/skills`
- `~/.agents/skills`
- `.pi/skills`
- `.agents/skills`
- installed Pi packages that declare skills

## Install

For private repos, use the SSH git form:

```bash
pi install git:git@github.com:codefriendly/pi-list-packages
```

If you prefer, the equivalent SSH URL also works:

```bash
pi install ssh://git@github.com:codefriendly/pi-list-packages
```

## Update

```bash
pi update --extension git:git@github.com:codefriendly/pi-list-packages
```

## Files

```text
extensions/
  list-packages.ts
docs/
  usage.md
package.json
README.md
```

## More

- `docs/usage.md` for command behavior and discovery notes.
- For private GitHub repos, the `git:github.com/user/repo` shorthand may try HTTPS auth. Use an explicit SSH form instead.

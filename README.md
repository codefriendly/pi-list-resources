# pi-list-packages

Pi extension that adds quick inspection commands for installed packages, extensions, and skills.

## Commands

- `/extensions`
  - Lists installed Pi packages.
  - Lists global extensions from `~/.pi/agent/extensions`.
  - Lists project extensions from `.pi/extensions`.
- `/skills`
  - Lists skills from common local skill directories.
  - Scans installed packages that declare Pi skills.

## Install

```bash
pi install git:github.com/c11dev/pi-list-packages
```

## Repo layout

```text
extensions/
  list-packages.ts
package.json
README.md
```

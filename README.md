# sarihub

## Environment setup

The real env files are never in git. Each one is kept whole in the Notes field of a
Bitwarden **secure note** named `sarihub / <path>`:

| Bitwarden note | File |
|---|---|
| `sarihub / .env` | `.env` |

On a new machine:

```bash
brew install bitwarden-cli             # Windows: winget install Bitwarden.CLI, then use Git Bash
bw login                               # once per machine
export BW_SESSION="$(bw unlock --raw)"
npm run env:pull
bw lock
```

The script asks before replacing an existing file and keeps the old one as
`<file>.bak-<timestamp>`. After changing a value, update the note too. The
`.env.example` files list every key and where to get it.

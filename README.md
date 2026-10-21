# quiphuts

Turn a pasted list of prompts into a valid **Quiplash 1** content pack.

quiphuts is a small static web app. Paste one prompt per line, review the automatic
or manual prompt durations, and export a `content.zip` that the original game can
read. The UI is available in English and Hungarian.

> Fan-made tool. It contains no game assets and is not affiliated with Jackbox Games.

## Features

- Paste one prompt per line, or import an existing `content.zip`.
- Keeps `<BLANK>` and formatting tags such as `<i>`, `<b>`, `<u>` and `<br>` as written.
- Generates a valid Q1 `content/` folder:
  - `content/manifest.jet`
  - `content/Question.jet`
  - `content/Question/<id>/data.jet`
  - `content/Question/<id>/<id>.ogg`
- Per-prompt audio duration:
  - automatic reading-time calculation from visible prompt length
  - three speed presets (14, 18 or 22 characters/second)
  - manual half-second overrides
- Silent OGG Vorbis prompt audio, generated locally from pre-built assets.
- Validation warnings for unsupported characters, duplicate prompts, unknown tags,
  lowercase blanks, oversized prompts and blank-like placeholders.
- Import preserves prompt text, prompt IDs, the `x` flag, the pack name and the
  episode ID. Imported audio is intentionally ignored and replaced with silent OGG.
- Pack name is editable and survives export/re-import.
- Draft and language preference are saved in `localStorage`.

## Why OGG?

Quiplash 1's content loader appends the configured audio extension
(`.ogg`, from `jbg.config.jet`) to the `PromptAudio` name. A file such as
`prompt.mp3` is therefore not found. Prompt audio must be OGG Vorbis.

quiphuts always writes silent OGG files for now. This gives the prompt time on
screen without requiring a custom recording workflow. The generated files are
mono, 44.1 kHz Vorbis.

## Quick start

Requirements: Node.js 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. To create a production build:

```bash
npm run build
npm run preview
```

## Docker

The Docker image builds the frontend and serves it with a small Go static server.
TLS is expected to be terminated by a reverse proxy in front of the container.

```bash
docker build -t quiphuts .
docker run --rm -p 8080:8080 quiphuts
```

The app is served at `/`. The server also exposes `GET /healthz` for health checks.
Set `PORT` and `PUBLIC_DIR` if you run the Go binary yourself:

```bash
npm run build
cd server
PUBLIC_DIR=../dist PORT=8080 go run .
```

## Output format

An exported ZIP has this layout:

```text
content/
  manifest.jet
  Question.jet
  Question/
    1001/
      data.jet
      1001.ogg
    1002/
      data.jet
      1002.ogg
    ...
```

The generated files follow the original Q1 layout:

- `Question.jet` contains `{"content":[...],"episodeid":...}` with `x`, `id` and
  `prompt` fields.
- `data.jet` contains the original field order and no FX-style `Custom` field.
- `PromptAudio.v` is the extensionless numeric audio base name (`"1001"`), while
  the actual file is `1001.ogg`.
- `KeywordResponseAudio` has no `v` value when there is no joke audio.
- Non-ASCII characters are written as JSON `\uXXXX` escapes, matching the original
  files.

New packs start at prompt ID 1001 and episode ID 1234. Imported IDs and episode
IDs are preserved when possible.

## Installing a pack

1. Close Quiplash.
2. Back up the game's existing `content/` folder.
3. Extract `content.zip` into the Quiplash folder so the included `content/`
   folder replaces the old one.
4. Start the game and select the new pack.

Keep the original `content/` folder if you want to switch back.

## Import behavior

The importer reads `Question.jet` for prompt text and IDs, `manifest.jet` for the
pack name, and the archive's `episodeid`. It does not trust or reuse imported
audio. If an FX-style archive is detected, the import summary reports:

- MP3 files that were ignored
- `Custom` fields that were removed
- `data.jet` prompt text that differed from `Question.jet`
- orphaned keyword-response audio references

Missing or duplicate IDs are assigned fresh IDs. Invalid prompt entries are
skipped and reported.

## Validation

Warnings do not block export. Errors do. The checks include:

- no prompts / empty prompts / duplicate IDs
- prompts longer than the longest original prompt (121 characters)
- duplicate prompts
- unknown tags, lowercase `<blank>`, and bare `<` / `>`
- blank-like placeholders such as `___` or `[BLANK]`
- line breaks
- characters outside the known-safe Latin ranges, including Hungarian `ő`/`ű`
  and emoji

The original content uses Latin-1 letters, curly quotes, dashes, ellipses,
`<BLANK>` and `<i>`. The game's font coverage for Hungarian `ő` and `ű` is
unverified, so those characters are warnings rather than silent rewrites.

## Audio assets

The silent files in `public/audio/` are generated once and committed. To rebuild
them (requires `ffmpeg` with `libvorbis`):

```bash
./scripts/generate-audio.sh
```

The app picks the nearest half-second asset from 1.0 to 15.0 seconds. Durations
are clamped to that range. If you remove an asset, export will fail rather than
produce a pack with a missing prompt audio reference.

## Development

```bash
npm test          # unit tests for parsing, validation, format and ZIP handling
npm run test:watch
npm run build     # type-check + production build
```

Project layout:

```text
src/
  App.tsx              UI and draft state
  i18n.ts              English/Hungarian strings
  types.ts             shared types
  lib/
    prompts.ts         parsing, IDs, duration calculation
    validation.ts      warnings and errors
    format.ts          exact Q1 .jet output
    audio.ts           silent OGG asset loading
    content.ts         ZIP import/export
    *.test.ts          unit tests
public/audio/          generated silent OGG files
server/main.go         Go static server
scripts/               audio generation helper
```

## Known limitations

- Quiplash 1 only. FX-format packs are detected and normalized on import.
- Silent prompt audio only; custom recordings and the `Custom` field are not supported.
- The game may cut very long prompt audio short; shorten the prompt or lower its duration.
- Imported prompt text is taken from `Question.jet`, not from `data.jet`.

## License

Released under the [MIT License](LICENSE).

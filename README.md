# Voice File for WhatsApp

Local Manifest V3 Chrome extension. Adds a green microphone-plus button immediately
beside the original microphone in WhatsApp Web. Click it, choose an audio file,
and wait while WhatsApp records the file in real time. Review and send with
WhatsApp's own controls. The extension never clicks Send.

## Build

Use Node.js 22 or later. Install development dependencies and compile TypeScript:

```sh
npm ci
npm run build
```

The `dist` directory contains the extension package: compiled JavaScript,
manifest, CSS, and icons. TypeScript is checked in strict mode. There are no
runtime dependencies.

## Install

1. Open `chrome://extensions` in the Chrome profile used for WhatsApp.
2. Enable Developer mode.
3. Click Load unpacked and select the `dist` directory.
4. Reload the WhatsApp Web tab.

Keep `dist` in place. After editing `content.ts` or other extension files, run
`npm run build`, reload the extension on
`chrome://extensions`, and reload WhatsApp. Remove the extension from that page
to uninstall it. No Node.js or terminal is required for everyday use.

## Behavior and limits

- Runs only on `https://web.whatsapp.com/`, in the main page context so WhatsApp's
  recording request receives the local file's MediaStream.
- No backend, analytics, external requests, storage, or runtime dependencies.
- Reads the selected audio and current conversation heading. No contact or
  message export. The selected audio is handled by WhatsApp's recording flow.
- The original microphone works normally outside the single armed request.
- Files must be non-empty, smaller than 100 MB, and decodable by Chrome.
- Leave the conversation open until recording finishes. You can cancel using
  WhatsApp's normal delete button. No automatic sending is performed.
- WhatsApp interface changes may require updating control selectors.
- Local unpacked installation is per Chrome profile; keep Developer mode enabled.

## Checks

```sh
npm run typecheck
npm test
```

Tests build the extension and verify the compiled script and packaged manifest.

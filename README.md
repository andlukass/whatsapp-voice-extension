# Voice File for WhatsApp

Local Manifest V3 Chrome extension. Adds a green microphone-plus button immediately
beside the original microphone in WhatsApp Web. Click it, choose an audio file,
and wait while WhatsApp records the file in real time. Review and send with
WhatsApp's own controls. The extension never clicks Send.

## Install

1. Open `chrome://extensions` in the Chrome profile used for WhatsApp.
2. Enable Developer mode.
3. Click Load unpacked and select this directory.
4. Reload the WhatsApp Web tab.

Keep this directory in place. To update, edit the files, reload the extension on
`chrome://extensions`, and reload WhatsApp. Remove the extension from that page
to uninstall it. No Node.js or terminal is required for everyday use.

## Behavior and limits

- Runs only on `https://web.whatsapp.com/`, in the main page context so WhatsApp's
  recording request receives the local file's MediaStream.
- No backend, analytics, external requests, storage, or dependencies.
- Reads the selected audio and current conversation heading. No contact or
  message export. The selected audio is handled by WhatsApp's recording flow.
- The original microphone works normally outside the single armed request.
- Files must be non-empty, smaller than 100 MB, and decodable by Chrome.
- Leave the conversation open until recording finishes. You can cancel using
  WhatsApp's normal delete button. No automatic sending is performed.
- WhatsApp interface changes may require updating control selectors.
- Local unpacked installation is per Chrome profile; keep Developer mode enabled.

## Checks

The regression tests use Jest supplied by the existing Delphi checkout:

```sh
/Users/lucas/Documents/DELPHI/delphi/node_modules/.bin/jest --config ./jest.config.cjs --runInBand
```

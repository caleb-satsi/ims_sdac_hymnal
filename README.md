# International Hymnal (SDAC) — Desktop Edition

This wraps the web app in [Electron](https://www.electronjs.org/) so it runs
as a native window on Windows and macOS, and can be packaged for the
**Microsoft Store** (Windows) and the **Mac App Store** (macOS).

## Important: two separate stores

The Microsoft Store only distributes **Windows** apps. It does not install
software on macOS. Apple's equivalent is the **Mac App Store**, which is a
separate submission with its own developer account, signing, and review
process. So "publish to Microsoft Store for PC and macOS" is really two
independent jobs:

| Platform | Store | Format | Requires |
|---|---|---|---|
| Windows | Microsoft Store | `.msix`/`.appx` | Free Microsoft Partner Center account |
| macOS | Mac App Store | `.pkg` via `mas` build | Paid Apple Developer Program ($99/yr) + a Mac |

You can also skip the Mac App Store entirely and just distribute a signed
`.dmg` directly from your own site — no Apple review, no yearly fee (still
needs a $99/yr cert to notarize it, or Gatekeper will warn people on install).

This project is set up to build **either path** for macOS, and the Store path
for Windows.

## Presentation mode (projecting for the congregation)

Open any hymn, then click **Present** in the top-right of the hymn page.
This opens two windows:

- **Presenter Console** — stays on your own screen. Shows the current
  and next slide, a clickable list of every verse/chorus for quick jumps,
  Previous/Next controls, and a black/white screen toggle (for prayer,
  announcements, etc.). Keyboard shortcuts: **←/→** or **↑/↓** to move
  between slides, **B** for black screen, **W** for white screen, **Esc**
  to exit.
- **Congregation Display** — large, high-contrast lyrics meant for a
  projector. If a second monitor/projector is connected, it goes
  fullscreen there automatically; if not, it opens as a regular window you
  can drag onto the projector once you connect one.

While presenting, you can switch to a different hymn from the main window
and click **Present** again — both presentation windows update instantly
instead of opening a duplicate. Closing the Presenter Console (or pressing
**Esc**) ends the presentation and closes the display window too.

## What's in this folder

```
main.js         — Electron entry point (main window, Presenter Console
                   window, Congregation Display window, and the IPC that
                   keeps them all in sync)
preload.js      — secure bridge exposing window.hymnalBridge to each window
package.json    — electron-builder config for both stores
app/            — the hymnal itself:
  index.html/app.js/styles.css     — the main browsing window
  control.html/control.js/control.css     — Presenter Console
  presentation.html/presentation.js/presentation.css — Congregation Display
  hymn-utils.js   — small helper shared by the console and display
  data.js         — all hymn/category data
build/icon.*    — app icons (.ico for Windows, .icns for macOS, .png for the window)
build/entitlements.mas.plist — required sandbox entitlements for Mac App Store
```

## 1. One-time setup (do this on your dev machine)

You'll need [Node.js](https://nodejs.org) 18+ installed. Then, in this folder:

```bash
npm install
```

Try it locally first:

```bash
npm start
```

You should see the hymnal open in its own window.

## 2. Building for Windows → Microsoft Store

Do this step on Windows (electron-builder's `appx` target requires the
Windows SDK, so it won't build on macOS/Linux).

1. **Register a free Microsoft Partner Center account**: https://partner.microsoft.com/dashboard
   Reserve your app name (e.g. "International Hymnal (SDAC)") — this gives you a
   Package/Identity Name and Publisher ID.
2. In `package.json`, replace the two placeholders under `"appx"`:
   - `publisher`: the `CN=...` value shown on your app's Identity page in
     Partner Center
   - `publisherDisplayName`: your registered publisher display name
3. Build the package:
   ```bash
   npm run dist:win
   ```
   This produces an `.appx`/`.msix` in `dist/`.
4. In Partner Center, create a new submission for your app, upload the
   package, fill in the store listing (description, screenshots, age
   rating), and submit for certification. Review typically takes 1–3 days.

If you'd rather skip the Store and just let people download an installer
from your own site instead, run `npm run dist:win-exe` for a normal
Windows installer (`.exe`, via NSIS) — no Partner Center needed.

## 3. Building for macOS

Do this step on a Mac (Apple's tools only run on macOS, and there's no way
around that for App Store submission).

**Option A — Mac App Store**
1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr).
2. Create an App ID, a "Mac App Store" distribution certificate, and an
   Installer certificate in your developer account (Xcode can do most of
   this for you automatically if you open the project once).
3. Build:
   ```bash
   npm run dist:mac-store
   ```
4. Submit through [App Store Connect](https://appstoreconnect.apple.com) —
   create a new macOS app entry, upload the build (via Transporter or
   Xcode), fill in the listing, submit for review.

**Option B — direct download (no App Store review)**
1. Still requires an Apple Developer account for a "Developer ID"
   certificate, so Gatekeeper doesn't block it on install.
2. Build:
   ```bash
   npm run dist:mac
   ```
3. Notarize the resulting `.dmg` with Apple's `notarytool` (electron-builder
   can automate this if you set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`,
   and `APPLE_TEAM_ID` environment variables — see the
   [electron-builder notarization docs](https://www.electron.build/configuration/mac#notarization)).
4. Host the `.dmg` yourself; people download and drag it to Applications.

## Fixing a Microsoft Store certification rejection

If Partner Center comes back with "Attention needed," here's how to resolve
the most common issues with this project:

**10.2.4.2 — "Your product contains drivers that have not been provided by
Microsoft"**
This is a known Electron false-positive: two bundled Chromium files
(`vk_swiftshader.dll`, `vulkan-1.dll`) are software Vulkan/graphics-driver
replacements, and Microsoft's scanner flags them automatically. This project
already removes them at build time via `build/afterPack.js` and disables the
software rasterizer in `main.js`, so a fresh `npm run dist:win` should no
longer trigger this. If it still gets flagged after that, it's likely a
different file — check the exact filename in the new certification report,
and either exclude it the same way, or (if it's a dependency you genuinely
need) disclose it up front in Partner Center's submission under **Properties
→ Notes for certification**, per Microsoft's guidance.

**10.1.1.1 — "Product name contains the title of another piece of software
or service"**
Rename the app so it's clearly distinct from any existing app/organization
name. Update the `productName` field in `package.json` and the app's title
in Partner Center's Store Listing. Avoid initialisms tied to an existing
organization or product unless you're formally publishing on their behalf.

**10.1.4.3 — Description too thin**
Paste a real description (2+ sentences, specific to what the app does) into
the Store Listing's Description field — not just the app name. Example:

> A digital hymnal for reading and searching hymns on the go. Browse by
> category or search by number, title, or author, save favorites for quick
> access, and adjust text size or switch to dark mode for comfortable
> reading. All hymn lyrics are stored on your device, so the app works
> fully offline.

Feel free to adjust the wording, but keep it specific and a few sentences
long — a single phrase or just the app name will fail this check again.

## Notes

- The hymn data (`app/data.js`) is bundled directly into the app, so it
  works fully offline — no network access needed at runtime.
- The hymnal's fonts load from Google Fonts over the internet if available,
  falling back to system fonts when offline. If you want a fully offline
  desktop build with the exact intended typefaces, download the two font
  families (Fraunces, Source Serif 4) and reference local files in
  `app/styles.css` instead of the Google Fonts `<link>` in `app/index.html`
  — happy to do that for you if you'd like.
- To change the app icon, replace the files in `build/` (keep the same
  filenames) and rebuild.
- Both stores require basic listing assets you'll need to prepare yourself:
  a short description, a few screenshots of the running app, and an app
  icon (already included here) sized per each store's guidelines.

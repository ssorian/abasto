# Demo APK

## Objective
Produce an installable Android demo APK for the current Expo app, preserving its mock-only UI.

## Scope and constraints
- Configure the minimum Android identifier and EAS APK preview profile.
- Attempt an APK build with the available environment and validate the resulting artifact when possible.
- Do not implement backend, change UI, publish to stores, or commit without explicit authorization.
- Android application ID is provisional for the demo; confirm before store publication.

## Tasks
- [x] APK-1 Configure Android demo APK build. Route: delegated writer (two configuration files). Acceptance: valid app ID and preview APK profile; config and static checks pass. Evidence: `npx expo config --json` resolved `com.abasto.abarroteros`; Node assertion for `build.preview.android.buildType === 'apk'` exited 0. Independent check passed: Expo resolved package and EAS APK profile assertion passed.
- [ ] APK-2 Generate and validate a demo APK. Route: delegated verifier (external build). Acceptance: APK artifact exists, is inspectable and installs/launches if a device/emulator is available; otherwise report exact environmental blocker. Evidence: isolated prebuild succeeded in `/tmp/abasto-demo-apk.yrPSTf`; Gradle distribution downloaded, but `assembleRelease` timed out after 1800s at `:gradle-plugin:react-native-gradle-plugin:compileKotlin`. No APK in `dist/`; `adb devices` empty. No retry or cleanup performed.
- [ ] APK-3 Resolve APK build blocker. Route: pending decision. Acceptance: complete a build through a working local environment or authenticated EAS cloud, then resume APK-2 validation. Evidence: login now confirmed via `eas whoami`; created and linked @soriandth/abasto-mobile using `eas init --account soriandth --non-interactive`. Started Android preview EAS Build `c3252ee4-0306-4a7e-bb75-5d483724933a` with `EAS_NO_VCS=1`; archive uploaded successfully (6.5 MB). Remote build returned ERRORED (`UNKNOWN_ERROR`, Install dependencies phase), artifacts `{}`. Retrieved EAS log: Bun 1.3.14 rejected `bun.lock` (`lockfileVersion: 2`, `UnknownLockfileVersion`, frozen install failed). Local Bun is 1.4.2. Pinned `build.preview.bun` to `1.4.2` in `eas.json`; independent assertion passed. First corrected build launch failed with Expo GraphQL request error, no ID returned. A second corrected launch timed out at 240s while uploading the 6.5 MB archive; subsequent `eas build:list` checks showed only the original failed build and no CLI process remains. Final attempt with a 900s timeout uploaded successfully and created corrected EAS build `00c79a79-2625-4c26-a10c-7a3f7098e734`; remote build completed ERRORED in EAGER_BUNDLE. Install dependencies passed with Bun 1.4.2; Metro failed `Cannot find module 'babel-preset-expo'` (`MODULE_NOT_FOUND`). No APK. Added direct app build dependencies `babel-preset-expo` ~57.0.13 and `@babel/plugin-transform-react-jsx` 7.29.7, plus runtime `react-native-css-interop` 0.2.7; root `bun.lock` updated. A new clean Bun 1.4.2 frozen install with default isolated linker exported Android successfully to `/tmp/abasto-isolated-final.CYZITR/export-android`. Cloud APK rebuild launched: `7c68d367-ae7e-4620-945a-b81e7c22b3b6`; upload completed, remote outcome pending.

## Progress and checks
- Current: APK-3 and APK-2 await remote build `7c68d367-ae7e-4620-945a-b81e7c22b3b6` and APK validation. APK-1 independently verified.
- TDD mode: not configured/unknown; configuration-only change, use functional configuration checks.
- Build environment: Android SDK and Java present; authenticated EAS CLI via `npx`; `app.json` owner and EAS project ID linked. `EAS_NO_VCS=1` confines the build archive to the app instead of the uncommitted parent Git repository. No generated Android project in the app.
- Repository: no commits yet on main; all application files are untracked in parent repository. No commit planned without explicit authorization.
- Delivery strategy: ask-on-risk; forecast under 100 authored lines.
- Assessment: native risk assessment unavailable because the parent Git repository has untracked files; independent verification required. No native review start (RDD off).
- Independent checks: Expo resolved package and EAS APK profile passed. Local prebuild succeeded, then Gradle timed out after 1800s at React Native Gradle Kotlin compilation. No APK exists and no device is connected.
- Next: inspect https://expo.dev/accounts/soriandth/projects/abasto-mobile/builds/7c68d367-ae7e-4620-945a-b81e7c22b3b6; download and validate APK if FINISHED. Failed bundle: Original failure: https://expo.dev/accounts/soriandth/projects/abasto-mobile/builds/c3252ee4-0306-4a7e-bb75-5d483724933a. No artifact yet.

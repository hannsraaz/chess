# Chess Arena (Android Only)

This project is now Android-only.

## Structure
- Android source: `android/`
- WebView game assets used by Android: `android/app/src/main/assets/`
- Final outputs: `dist/`

## Package Name
- `com.hans.chessapp`

## Authentication Flow
- Native Google sign-in happens first in Android.
- After sign-in, user chooses:
  - `Single Player` (vs bot)
  - `Multiplayer` (online room)

## Build Debug APK
```powershell
cd android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
```

Output:
- `android/app/build/outputs/apk/debug/app-debug.apk`
- `dist/chess-arena-debug.apk`

## Build Signed Release APK
```powershell
cd android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleRelease
```

Output:
- `android/app/build/outputs/apk/release/app-release.apk`
- `dist/chess-arena-release-signed.apk`

## Build Signed Play Store AAB
```powershell
cd android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat bundleRelease
```

Output:
- `android/app/build/outputs/bundle/release/app-release.aab`
- `dist/chess-arena-release-signed.aab`

## Recommended Firebase Security Rules
- Use `android/firestore.rules` as your baseline and publish in Firebase Console.

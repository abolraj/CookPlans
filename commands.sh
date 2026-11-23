cd ~/Documents/Projects/Tauri/CookPlans/src-tauri/gen/android
./gradlew --stop
rm -rf ~/.gradle/caches
rm -rf buildSrc/build buildSrc/.gradle .gradle


cd ~/Documents/Projects/Tauri/CookPlans
pnpm run tauri android build --apk --debug

adb logcat -b crash -d 

# https://tool365.vercel.app/ For android icon generation
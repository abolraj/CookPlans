cd ~/Documents/Projects/Tauri/CookPlans/src-tauri/gen/android
./gradlew --stop
rm -rf ~/.gradle/caches/8.13/kotlin-dsl
rm -rf buildSrc/build buildSrc/.gradle .gradle


cd ~/Documents/Projects/Tauri/CookPlans
pnpm run tauri android build --apk --debug
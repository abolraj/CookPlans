# Please generate an article nice as senior master for help iranian beginners 

# this is for Tauri + Android @ linux(ubuntu), almostly takes 30 min - 1 hour to install & output an android apk

## Install & build tauri app without installing AndroidTools

the content should orders with these :
+ a summary for what is Tauri (Rust+React=Cross pltform)
+ a short description for all jdk,ndk,sdk,gradle,gradlew,cargo,rustup,android targets
+ requirements table like node, pnpm (npm), cargo(rust), ...
+ installation steps for tauri create app like node, npm, rust, cargo, android target for aarch64 android building
+ the help for installing all related for android section them step by step :
- install all needed things exist in the csv of market step by step in one shell command student can copy but put comments (jdk17(compatible tauri), sdk 35, ndk29, )
- notice for add needed paths like android home !
- we use gradle 8.13 
- take care the doc for how to place files & folder structure based on mayket sdk
+ set iranian mirrors for android era:
- global :~/.gradle/init.gradle (for default all project):
allprojects {
    buildscript {
        repositories.clear()
        repositories {
            maven {
                url = uri("https://mirror-maven.runflare.com/android/maven2/")
            }
            maven {
                url = uri("https://mirror-maven.runflare.com/maven2/")
            }
            maven {
                url = uri("https://mirror-maven.runflare.com/gradle-plugins/")
            }

            maven { url = uri('https://mirror-maven.pkg.shecan.ir/gradle-plugins') }
            maven { url = uri('https://en-mirror.ir') }
            maven { url = uri('https://maven.myket.ir') }
            maven { url = uri('https://maven.devneeds.ir') }
            maven { url = uri('https://gradle.iranrepo.ir') }
            maven { url = uri('https://gradle.jamko.ir') }
            maven { url = uri('https://maven.aliyun.com/repository/gradle-plugin') }
            maven { url = uri('https://maven.aliyun.com/repository/google') }
            mavenCentral()
            google()
        }
    }
    project.repositories.clear()
    project.repositories {
        maven { url = uri('https://mirror-maven.pkg.shecan.ir/google') }
        maven { url = uri('https://mirror-maven.pkg.shecan.ir/central') }
        maven { url = uri('https://mirror-maven.pkg.shecan.ir/jitpack') }
        
        maven { url = uri('https://en-mirror.ir') }
        maven { url = uri('https://maven.myket.ir') }
        maven { url = uri('https://maven.devneeds.ir') }
        maven { url = uri('https://gradle.iranrepo.ir') }
        maven { url = uri('https://gradle.jamko.ir') }
        maven { url = uri('https://maven.aliyun.com/repository/public') }
        maven { url = uri('https://maven.aliyun.com/repository/central') }
        maven { url = uri('https://maven.aliyun.com/repository/google') }
        mavenCentral()
        google()
    }
}

- per app :./src-tauri/gen/android/settings.gradle(groovy):
pluginManagement {
    repositories {
        // Runflare
        maven { url = uri("https://mirror-maven.runflare.com/android/maven2/") }
        maven { url = uri("https://mirror-maven.runflare.com/maven2/") }
        maven { url = uri("https://mirror-maven.runflare.com/gradle-plugins/") }
        // Shecan 
        maven { url = uri('https://mirror-maven.pkg.shecan.ir/gradle-plugins') }
        // Myket — highest priority
        maven { url = uri('https://en-mirror.ir') }
        maven { url = uri('https://maven.myket.ir') }
        // Other Iranian mirrors
        maven { url = uri('https://maven.devneeds.ir') }
        maven { url = uri('https://gradle.iranrepo.ir') }
        maven { url = uri('https://gradle.jamko.ir') }
        maven { url = uri('https://archive.ito.gov.ir/gradle/maven-plugin/') }
        // Aliyun (China) — important backup
        maven { url = uri('https://maven.aliyun.com/repository/gradle-plugin') }
        maven { url = uri('https://maven.aliyun.com/repository/google') }
        // Official — last resort
        google()
        gradlePluginPortal()
        mavenCentral()
    }
}

plugins {
    id 'org.gradle.toolchains.foojay-resolver-convention' version '0.8.0'
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        // Shecan
        maven { url = uri('https://mirror-maven.pkg.shecan.ir/google') }
        maven { url = uri('https://mirror-maven.pkg.shecan.ir/central') }
        maven { url = uri('https://mirror-maven.pkg.shecan.ir/jitpack') }

        maven { url = uri('https://en-mirror.ir') }
        // Myket — highest priority
        maven { url = uri('https://maven.myket.ir') }
        // Other Iranian mirrors
        maven { url = uri('https://maven.devneeds.ir') }
        maven { url = uri('https://gradle.iranrepo.ir') }
        maven { url = uri('https://gradle.jamko.ir') }
        maven { url = uri('https://archive.ito.gov.ir/gradle/maven-plugin/') }
        // Aliyun backup
        maven { url = uri('https://maven.aliyun.com/repository/public') }
        maven { url = uri('https://maven.aliyun.com/repository/central') }
        maven { url = uri('https://maven.aliyun.com/repository/google') }
        // Official
        google()
        mavenCentral()
        maven { url = uri('https://jitpack.io') }
    }
}

include ':app'

apply from: 'tauri.settings.gradle'

- per app :./src-tauri/gen/android/gradle/wrapper/gradle-wrapper.properties (change ditricution url):
#Tue May 10 19:22:52 CST 2022
distributionBase=GRADLE_USER_HOME
distributionUrl=https://mirror-gradle.pkg.shecan.ir/distributions/gradle-8.13-bin.zip
distributionPath=wrapper/dists
zipStorePath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME

+ set iranian mirrors for cargo (rust plugins):
- ~/.cargo/config.toml
[source.crates-io]
replace-with = "shecan"

[source.shecan]
registry = "sparse+https://mirror-cargo.pkg.shecan.ir/index/"

+ add this to cargo.toml for less size:
[profile.release]
opt-level = "s"
lto = true
codegen-units = 1
panic = "abort"
strip = true

+ steps for keysigning the apk for android (shuold be done unless the app not worked or installed)
+ some important commands
- pnpm tauri dev (show a desktop window for development inside your system ran & the browser hosted not works only the window opened works cause can run rust backend)
- pnpm tauri android dev --host 0.0.0.0:
the mobile should enabled developer option and debug usb,
connected truly with adb; with check adb devices;
we should use adb reverse tcp:1420 tcp:1420
we should add vite config for host 0.0.0.0 for android dev mode to app
- ! pnpm tauri android build --debug : not to use this it makes an apk about 500MB cause of debug mode while the dev mode is enought !!!! useless
- pnpm tauri android build --apk --target aarch64 (about 11MB apk)
this builds the apk inside src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
the target is choosed cause unless all tragets picked by default and increase size much for old androids, we considered aarch64 cause much of androids nowadays are using
; suggest a adb command to check device type supports aarch64 or others;

+ a summary for all steps should done
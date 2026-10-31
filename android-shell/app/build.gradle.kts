plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val webAssetsIndex = file("src/main/assets/index.html")
val prepareWebAssets by tasks.registering(Exec::class) {
    description = "Build and bundle the current web app before assembling Android."
    group = "build"
    workingDir(rootProject.projectDir.parentFile)
    isIgnoreExitValue = true
    if (org.apache.tools.ant.taskdefs.condition.Os.isFamily(org.apache.tools.ant.taskdefs.condition.Os.FAMILY_WINDOWS)) {
        commandLine("cmd", "/c", "npm", "run", "build:android-assets")
    } else {
        commandLine("sh", "-c", "npm run build:android-assets || true")
    }
    onlyIf {
        // If web assets already exist, skip execution to avoid redundant compilation and missing npm failures
        !webAssetsIndex.exists()
    }
}

tasks.named("preBuild") {
    dependsOn(prepareWebAssets)
}

android {
    namespace = "com.ytviewer.app"
    compileSdk = 34

    val packageJsonFile = file("../../package.json")
    val packageJsonVersion = if (packageJsonFile.exists()) {
        val match = Regex("\"version\":\\s*\"([^\"]+)\"").find(packageJsonFile.readText())
        match?.groupValues?.get(1) ?: "1.0.60"
    } else {
        "1.0.60"
    }
    val defaultDerivedCode = try {
        val parts = packageJsonVersion.split(".").map { it.toIntOrNull() ?: 0 }
        (parts.getOrElse(0) { 1 } * 10000) + (parts.getOrElse(1) { 0 } * 100) + parts.getOrElse(2) { 0 }
    } catch (_: Exception) {
        10060
    }

    defaultConfig {
        applicationId = "com.ytviewer.app"
        minSdk = 26
        targetSdk = 34
        val propVersionCode = project.findProperty("appVersionCode")?.toString()?.toIntOrNull()
        val propVersionName = project.findProperty("appVersionName")?.toString()
        versionCode = 20057
        versionName = "2.0.57"

        if (propVersionCode != null) {
            versionCode = propVersionCode
        }
        if (propVersionName != null) {
            versionName = propVersionName
        }

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }


    signingConfigs {
        named("debug") {
            // Standard debug signing config for development & self-contained releases
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.webkit:webkit:1.10.0")

    // MediaSession and background playback notification
    implementation("androidx.media:media:1.7.0")

    // OkHttp for fetching & intercepting requests directly
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}

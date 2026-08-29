import java.util.Properties

plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
  id("com.google.gms.google-services")
}

android {
  namespace = "com.hans.chessapp"
  compileSdk = 35

  defaultConfig {
    applicationId = "com.hans.chessapp"
    minSdk = 24
    targetSdk = 35
    versionCode = 1
    versionName = "1.0"
    vectorDrawables.useSupportLibrary = true
  }

  signingConfigs {
    create("release") {
      // For real Play Store upload, provide your own keystore in keystore.properties.
      val propsFile = rootProject.file("keystore.properties")
      if (propsFile.exists()) {
        val props = Properties()
        props.load(propsFile.inputStream())
        storeFile = file(props.getProperty("storeFile"))
        storePassword = props.getProperty("storePassword")
        keyAlias = props.getProperty("keyAlias")
        keyPassword = props.getProperty("keyPassword")
      } else {
        // Fallback keeps local builds working until a release keystore is added.
        initWith(getByName("debug"))
      }
    }
  }

  buildTypes {
    release {
      isMinifyEnabled = true
      isShrinkResources = true
      signingConfig = signingConfigs.getByName("release")
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro"
      )
    }
  }

  buildFeatures {
    buildConfig = true
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions {
    jvmTarget = "17"
  }

  lint {
    checkReleaseBuilds = true
    abortOnError = false
  }
}

dependencies {
  implementation("androidx.core:core-ktx:1.15.0")
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
  implementation("androidx.credentials:credentials:1.3.0")
  implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
  implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")

  // Firebase Bill of Materials keeps Firebase libs version-aligned.
  implementation(platform("com.google.firebase:firebase-bom:34.11.0"))
  implementation("com.google.firebase:firebase-analytics")
  implementation("com.google.firebase:firebase-auth")
}

pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
        maven { url = uri("https://repo1.maven.org/maven2/") }
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        // Official Maven Central endpoint via CDN. It often works when repo.maven.apache.org
        // is unstable or blocked by a local provider/proxy.
        maven { url = uri("https://repo1.maven.org/maven2/") }
        mavenCentral()
    }
}

rootProject.name = "room-booking-backend"

package ru.coworking.booking.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

@ConfigurationProperties(prefix = "app.jwt")
data class JwtProperties(
    var secret: String = "change-me-change-me-change-me-change-me",
    var expiration: Duration = Duration.ofHours(24),
    var issuer: String = "coworking-booking-api",
)

@ConfigurationProperties(prefix = "app.cors")
data class CorsProperties(
    var allowedOrigins: List<String> = listOf("http://localhost:3000", "http://localhost:5173"),
)

@ConfigurationProperties(prefix = "app.rate-limit")
data class RateLimitProperties(
    var enabled: Boolean = true,
    var limit: Long = 120,
    var window: Duration = Duration.ofMinutes(1),
)

@ConfigurationProperties(prefix = "app.seed")
data class SeedProperties(
    var enabled: Boolean = true,
    var adminEmail: String = "admin@coworking.local",
    var adminPassword: String = "Admin12345!",
)

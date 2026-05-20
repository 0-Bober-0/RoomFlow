package ru.coworking.booking.security

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Service
import ru.coworking.booking.config.JwtProperties
import ru.coworking.booking.domain.UserEntity
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.Date
import javax.crypto.SecretKey

@Service
class JwtService(
    private val jwtProperties: JwtProperties,
) {
    private val key: SecretKey by lazy {
        Keys.hmacShaKeyFor(jwtProperties.secret.toByteArray(StandardCharsets.UTF_8))
    }

    fun generateToken(user: UserEntity): String {
        val now = Instant.now()
        val expiresAt = now.plus(jwtProperties.expiration)

        return Jwts.builder()
            .issuer(jwtProperties.issuer)
            .subject(user.email)
            .claim("uid", requireNotNull(user.id).toString())
            .claim("role", user.role.name)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .signWith(key)
            .compact()
    }

    fun extractUsername(token: String): String = parseClaims(token).subject

    fun isValid(token: String, userDetails: SecurityUser): Boolean {
        val claims = parseClaims(token)
        return claims.subject == userDetails.username && claims.expiration.after(Date())
    }

    fun expiresInSeconds(): Long = jwtProperties.expiration.seconds

    private fun parseClaims(token: String): Claims = Jwts.parser()
        .verifyWith(key)
        .build()
        .parseSignedClaims(token)
        .payload
}

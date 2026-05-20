package ru.coworking.booking.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import ru.coworking.booking.domain.UserEntity
import ru.coworking.booking.domain.UserRole
import java.io.Serializable
import java.time.OffsetDateTime
import java.util.UUID

data class RegisterRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    @field:Size(min = 8, max = 72)
    val password: String,

    @field:NotBlank
    @field:Size(max = 120)
    val fullName: String,
)

data class LoginRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    @field:NotBlank
    val password: String,
)

data class TokenResponse(
    val tokenType: String = "Bearer",
    val accessToken: String,
    val expiresInSeconds: Long,
    val user: UserResponse,
) : Serializable

data class UserResponse(
    val id: UUID,
    val email: String,
    val fullName: String,
    val role: UserRole,
    val enabled: Boolean,
    val createdAt: OffsetDateTime,
) : Serializable

fun UserEntity.toResponse(): UserResponse = UserResponse(
    id = requireNotNull(id),
    email = email,
    fullName = fullName,
    role = role,
    enabled = enabled,
    createdAt = createdAt,
)

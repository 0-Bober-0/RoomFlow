package ru.coworking.booking.service

import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.coworking.booking.domain.UserEntity
import ru.coworking.booking.domain.UserRole
import ru.coworking.booking.dto.LoginRequest
import ru.coworking.booking.dto.RegisterRequest
import ru.coworking.booking.dto.TokenResponse
import ru.coworking.booking.dto.UserResponse
import ru.coworking.booking.dto.toResponse
import ru.coworking.booking.exception.ConflictException
import ru.coworking.booking.exception.NotFoundException
import ru.coworking.booking.repository.UserRepository
import ru.coworking.booking.security.JwtService
import java.util.UUID

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val authenticationManager: AuthenticationManager,
    private val jwtService: JwtService,
) {
    @Transactional
    fun register(request: RegisterRequest): TokenResponse {
        val email = request.email.trim().lowercase()
        if (userRepository.existsByEmail(email)) {
            throw ConflictException("User with this email already exists")
        }

        val user = userRepository.save(
            UserEntity(
                email = email,
                passwordHash = passwordEncoder.encode(request.password),
                fullName = request.fullName.trim(),
                role = UserRole.USER,
            ),
        )

        return tokenFor(user)
    }

    @Transactional(readOnly = true)
    fun login(request: LoginRequest): TokenResponse {
        val email = request.email.trim().lowercase()
        authenticationManager.authenticate(
            UsernamePasswordAuthenticationToken(email, request.password),
        )
        val user = userRepository.findByEmail(email)
            .orElseThrow { NotFoundException("User not found") }

        return tokenFor(user)
    }

    @Transactional(readOnly = true)
    fun me(userId: UUID): UserResponse = userRepository.findById(userId)
        .orElseThrow { NotFoundException("User not found") }
        .toResponse()

    private fun tokenFor(user: UserEntity): TokenResponse = TokenResponse(
        accessToken = jwtService.generateToken(user),
        expiresInSeconds = jwtService.expiresInSeconds(),
        user = user.toResponse(),
    )
}

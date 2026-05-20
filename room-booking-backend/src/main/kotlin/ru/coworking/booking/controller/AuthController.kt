package ru.coworking.booking.controller

import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.security.core.annotation.AuthenticationPrincipal
import ru.coworking.booking.dto.LoginRequest
import ru.coworking.booking.dto.RegisterRequest
import ru.coworking.booking.dto.TokenResponse
import ru.coworking.booking.dto.UserResponse
import ru.coworking.booking.security.SecurityUser
import ru.coworking.booking.service.AuthService

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val authService: AuthService,
) {
    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): TokenResponse =
        authService.register(request)

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): TokenResponse =
        authService.login(request)

    @GetMapping("/me")
    fun me(@AuthenticationPrincipal principal: SecurityUser): UserResponse =
        authService.me(principal.id)
}

package ru.coworking.booking.security

import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service
import ru.coworking.booking.repository.UserRepository

@Service
class CustomUserDetailsService(
    private val userRepository: UserRepository,
) : UserDetailsService {
    override fun loadUserByUsername(username: String): UserDetails {
        val email = username.trim().lowercase()
        val user = userRepository.findByEmail(email)
            .orElseThrow { UsernameNotFoundException("User not found") }

        return SecurityUser.from(user)
    }
}

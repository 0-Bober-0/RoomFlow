package ru.coworking.booking.security

import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails
import ru.coworking.booking.domain.UserEntity
import ru.coworking.booking.domain.UserRole
import java.util.UUID

class SecurityUser(
    val id: UUID,
    private val email: String,
    private val passwordHash: String,
    val role: UserRole,
    private val enabled: Boolean,
) : UserDetails {
    override fun getAuthorities(): Collection<GrantedAuthority> =
        listOf(SimpleGrantedAuthority("ROLE_${role.name}"))

    override fun getPassword(): String = passwordHash

    override fun getUsername(): String = email

    override fun isAccountNonExpired(): Boolean = true

    override fun isAccountNonLocked(): Boolean = true

    override fun isCredentialsNonExpired(): Boolean = true

    override fun isEnabled(): Boolean = enabled

    companion object {
        fun from(user: UserEntity): SecurityUser = SecurityUser(
            id = requireNotNull(user.id),
            email = user.email,
            passwordHash = user.passwordHash,
            role = user.role,
            enabled = user.enabled,
        )
    }
}

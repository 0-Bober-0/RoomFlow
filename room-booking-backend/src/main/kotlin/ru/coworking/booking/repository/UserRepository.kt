package ru.coworking.booking.repository

import org.springframework.data.jpa.repository.JpaRepository
import ru.coworking.booking.domain.UserEntity
import java.util.Optional
import java.util.UUID

interface UserRepository : JpaRepository<UserEntity, UUID> {
    fun findByEmail(email: String): Optional<UserEntity>
    fun existsByEmail(email: String): Boolean
}

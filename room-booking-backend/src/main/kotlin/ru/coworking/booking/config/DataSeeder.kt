package ru.coworking.booking.config

import org.springframework.boot.CommandLineRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import ru.coworking.booking.domain.RoomEntity
import ru.coworking.booking.domain.UserEntity
import ru.coworking.booking.domain.UserRole
import ru.coworking.booking.repository.RoomRepository
import ru.coworking.booking.repository.UserRepository
import java.math.BigDecimal

@Component
class DataSeeder(
    private val seedProperties: SeedProperties,
    private val userRepository: UserRepository,
    private val roomRepository: RoomRepository,
    private val passwordEncoder: PasswordEncoder,
) : CommandLineRunner {

    @Transactional
    override fun run(vararg args: String) {
        if (!seedProperties.enabled) return

        createUserIfMissing(
            email = seedProperties.adminEmail,
            password = seedProperties.adminPassword,
            fullName = "System Administrator",
            role = UserRole.ADMIN,
        )

        createUserIfMissing(
            email = "user@coworking.local",
            password = "User12345!",
            fullName = "Demo User",
            role = UserRole.USER,
        )

        if (roomRepository.count() == 0L) {
            roomRepository.saveAll(
                listOf(
                    RoomEntity(
                        name = "Berlin",
                        location = "Coworking A, 2 floor",
                        capacity = 4,
                        description = "Небольшая переговорная для быстрых встреч и звонков.",
                        pricePerHour = BigDecimal("800.00"),
                    ),
                    RoomEntity(
                        name = "London",
                        location = "Coworking A, 3 floor",
                        capacity = 8,
                        description = "Комната с проектором, whiteboard и видеосвязью.",
                        pricePerHour = BigDecimal("1500.00"),
                    ),
                    RoomEntity(
                        name = "Tokyo",
                        location = "Coworking B, 1 floor",
                        capacity = 12,
                        description = "Большая переговорная для воркшопов и презентаций.",
                        pricePerHour = BigDecimal("2200.00"),
                    ),
                    RoomEntity(
                        name = "New York",
                        location = "Coworking B, 4 floor",
                        capacity = 6,
                        description = "Тихая комната для интервью и клиентских встреч.",
                        pricePerHour = BigDecimal("1200.00"),
                    ),
                ),
            )
        }
    }

    private fun createUserIfMissing(email: String, password: String, fullName: String, role: UserRole) {
        val normalizedEmail = email.trim().lowercase()
        if (userRepository.existsByEmail(normalizedEmail)) return

        userRepository.save(
            UserEntity(
                email = normalizedEmail,
                passwordHash = passwordEncoder.encode(password),
                fullName = fullName,
                role = role,
            ),
        )
    }
}

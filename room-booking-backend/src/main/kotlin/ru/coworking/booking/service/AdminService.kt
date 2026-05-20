package ru.coworking.booking.service

import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.coworking.booking.dto.PageResponse
import ru.coworking.booking.dto.UserResponse
import ru.coworking.booking.dto.toPageResponse
import ru.coworking.booking.dto.toResponse
import ru.coworking.booking.repository.UserRepository

@Service
class AdminService(
    private val userRepository: UserRepository,
) {
    @Transactional(readOnly = true)
    fun users(page: Int, size: Int): PageResponse<UserResponse> {
        val pageable = PageRequest.of(
            page.coerceAtLeast(0),
            size.coerceIn(1, 100),
            Sort.by(Sort.Direction.DESC, "createdAt"),
        )
        return userRepository.findAll(pageable).map { it.toResponse() }.toPageResponse()
    }
}

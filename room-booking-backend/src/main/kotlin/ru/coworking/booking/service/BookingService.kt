package ru.coworking.booking.service

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.coworking.booking.domain.BookingEntity
import ru.coworking.booking.domain.BookingStatus
import ru.coworking.booking.domain.UserRole
import ru.coworking.booking.dto.BookingCreateRequest
import ru.coworking.booking.dto.BookingResponse
import ru.coworking.booking.dto.PageResponse
import ru.coworking.booking.dto.toPageResponse
import ru.coworking.booking.dto.toResponse
import ru.coworking.booking.exception.BadRequestException
import ru.coworking.booking.exception.ConflictException
import ru.coworking.booking.exception.ForbiddenException
import ru.coworking.booking.exception.NotFoundException
import ru.coworking.booking.repository.BookingRepository
import ru.coworking.booking.repository.RoomRepository
import ru.coworking.booking.repository.UserRepository
import java.time.OffsetDateTime
import java.util.UUID

@Service
class BookingService(
    private val bookingRepository: BookingRepository,
    private val userRepository: UserRepository,
    private val roomRepository: RoomRepository,
) {
    @Transactional
    fun create(userId: UUID, request: BookingCreateRequest): BookingResponse {
        validateInterval(request.startsAt, request.endsAt)

        val user = userRepository.findById(userId)
            .orElseThrow { NotFoundException("User not found") }
        val room = roomRepository.findById(request.roomId)
            .orElseThrow { NotFoundException("Room not found") }

        if (!room.active) {
            throw BadRequestException("Room is not active")
        }

        val hasOverlap = bookingRepository.existsOverlappingBooking(
            roomId = request.roomId,
            startsAt = request.startsAt,
            endsAt = request.endsAt,
            status = BookingStatus.CONFIRMED,
        )
        if (hasOverlap) {
            throw ConflictException("Room is already booked for this time interval")
        }

        val booking = BookingEntity(
            user = user,
            room = room,
            startsAt = request.startsAt,
            endsAt = request.endsAt,
            purpose = request.purpose.trim(),
        )

        return try {
            bookingRepository.saveAndFlush(booking).toResponse()
        } catch (ex: DataIntegrityViolationException) {
            throw ConflictException("Room is already booked for this time interval")
        }
    }

    @Transactional(readOnly = true)
    fun myBookings(userId: UUID, page: Int, size: Int): PageResponse<BookingResponse> {
        val pageable = PageRequest.of(
            page.coerceAtLeast(0),
            size.coerceIn(1, 100),
        )
        return bookingRepository.findByUser_IdOrderByStartsAtDesc(userId, pageable)
            .map { it.toResponse() }
            .toPageResponse()
    }

    @Transactional(readOnly = true)
    fun get(id: UUID, requesterId: UUID, requesterRole: UserRole): BookingResponse {
        val booking = bookingRepository.findById(id)
            .orElseThrow { NotFoundException("Booking not found") }

        if (requesterRole != UserRole.ADMIN && booking.user.id != requesterId) {
            throw ForbiddenException("You cannot access this booking")
        }

        return booking.toResponse()
    }

    @Transactional
    fun cancel(id: UUID, requesterId: UUID, requesterRole: UserRole): BookingResponse {
        val booking = bookingRepository.findById(id)
            .orElseThrow { NotFoundException("Booking not found") }

        if (requesterRole != UserRole.ADMIN && booking.user.id != requesterId) {
            throw ForbiddenException("You cannot cancel this booking")
        }

        if (booking.status == BookingStatus.CANCELLED) {
            return booking.toResponse()
        }
        if (booking.startsAt.isBefore(OffsetDateTime.now())) {
            throw BadRequestException("Past or started booking cannot be cancelled")
        }

        booking.status = BookingStatus.CANCELLED
        return bookingRepository.save(booking).toResponse()
    }

    @Transactional(readOnly = true)
    fun all(status: BookingStatus?, page: Int, size: Int): PageResponse<BookingResponse> {
        val pageable = PageRequest.of(
            page.coerceAtLeast(0),
            size.coerceIn(1, 100),
            Sort.by(Sort.Direction.DESC, "startsAt"),
        )
        val result = if (status == null) {
            bookingRepository.findAll(pageable)
        } else {
            bookingRepository.findByStatus(status, pageable)
        }
        return result.map { it.toResponse() }.toPageResponse()
    }

    private fun validateInterval(startsAt: OffsetDateTime, endsAt: OffsetDateTime) {
        if (!endsAt.isAfter(startsAt)) {
            throw BadRequestException("endsAt must be after startsAt")
        }
        if (startsAt.isBefore(OffsetDateTime.now().minusMinutes(1))) {
            throw BadRequestException("startsAt must be in the future")
        }
    }
}

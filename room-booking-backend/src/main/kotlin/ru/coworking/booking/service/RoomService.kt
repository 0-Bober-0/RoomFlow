package ru.coworking.booking.service

import org.springframework.cache.annotation.CacheEvict
import org.springframework.cache.annotation.Cacheable
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import ru.coworking.booking.domain.BookingStatus
import ru.coworking.booking.domain.RoomEntity
import ru.coworking.booking.dto.PageResponse
import ru.coworking.booking.dto.RoomCreateRequest
import ru.coworking.booking.dto.RoomResponse
import ru.coworking.booking.dto.RoomUpdateRequest
import ru.coworking.booking.dto.toPageResponse
import ru.coworking.booking.dto.toResponse
import ru.coworking.booking.exception.BadRequestException
import ru.coworking.booking.exception.NotFoundException
import ru.coworking.booking.repository.RoomRepository
import java.time.OffsetDateTime
import java.util.UUID

@Service
class RoomService(
    private val roomRepository: RoomRepository,
) {
    @Transactional(readOnly = true)
    fun search(
        minCapacity: Int?,
        from: OffsetDateTime?,
        to: OffsetDateTime?,
        page: Int,
        size: Int,
    ): PageResponse<RoomResponse> {
        if ((from == null) xor (to == null)) {
            throw BadRequestException("Both from and to must be provided for availability search")
        }
        if (from != null && to != null && !to.isAfter(from)) {
            throw BadRequestException("to must be after from")
        }

        val pageable = PageRequest.of(
            page.coerceAtLeast(0),
            size.coerceIn(1, 100),
            Sort.by(Sort.Direction.ASC, "capacity", "name"),
        )

        val rooms = if (from == null || to == null) {
            roomRepository.searchActive(
                minCapacity = minCapacity,
                pageable = pageable,
            )
        } else {
            roomRepository.searchAvailable(
                minCapacity = minCapacity,
                fromTime = from,
                toTime = to,
                status = BookingStatus.CONFIRMED,
                pageable = pageable,
            )
        }

        return rooms.map { it.toResponse() }.toPageResponse()
    }

    @Cacheable(cacheNames = ["rooms"], key = "#id")
    @Transactional(readOnly = true)
    fun get(id: UUID): RoomResponse = findRoom(id).toResponse()

    @Transactional
    fun create(request: RoomCreateRequest): RoomResponse = roomRepository.save(
        RoomEntity(
            name = request.name.trim(),
            location = request.location.trim(),
            capacity = request.capacity,
            description = request.description.trim(),
            pricePerHour = request.pricePerHour,
        ),
    ).toResponse()

    @CacheEvict(cacheNames = ["rooms"], key = "#id")
    @Transactional
    fun update(id: UUID, request: RoomUpdateRequest): RoomResponse {
        val room = findRoom(id)

        request.name?.let { room.name = it.trim() }
        request.location?.let { room.location = it.trim() }
        request.capacity?.let { room.capacity = it }
        request.description?.let { room.description = it.trim() }
        request.pricePerHour?.let { room.pricePerHour = it }
        request.active?.let { room.active = it }

        return roomRepository.save(room).toResponse()
    }

    @CacheEvict(cacheNames = ["rooms"], key = "#id")
    @Transactional
    fun deactivate(id: UUID) {
        val room = findRoom(id)
        room.active = false
        roomRepository.save(room)
    }

    @Transactional(readOnly = true)
    fun findRoom(id: UUID): RoomEntity = roomRepository.findById(id)
        .orElseThrow { NotFoundException("Room not found") }
}

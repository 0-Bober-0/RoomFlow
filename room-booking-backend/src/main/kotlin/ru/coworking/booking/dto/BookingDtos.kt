package ru.coworking.booking.dto

import jakarta.validation.constraints.Future
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import ru.coworking.booking.domain.BookingEntity
import ru.coworking.booking.domain.BookingStatus
import java.io.Serializable
import java.time.OffsetDateTime
import java.util.UUID

data class BookingCreateRequest(
    @field:NotNull
    val roomId: UUID,

    @field:Future
    val startsAt: OffsetDateTime,

    @field:Future
    val endsAt: OffsetDateTime,

    @field:NotBlank
    @field:Size(max = 500)
    val purpose: String,
)

data class BookingResponse(
    val id: UUID,
    val room: RoomShortResponse,
    val user: UserResponse,
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
    val status: BookingStatus,
    val purpose: String,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
) : Serializable

fun BookingEntity.toResponse(): BookingResponse = BookingResponse(
    id = requireNotNull(id),
    room = room.toShortResponse(),
    user = user.toResponse(),
    startsAt = startsAt,
    endsAt = endsAt,
    status = status,
    purpose = purpose,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

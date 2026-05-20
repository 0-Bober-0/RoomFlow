package ru.coworking.booking.dto

import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import ru.coworking.booking.domain.RoomEntity
import java.io.Serializable
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.UUID

data class RoomCreateRequest(
    @field:NotBlank
    @field:Size(max = 120)
    val name: String,

    @field:NotBlank
    @field:Size(max = 255)
    val location: String,

    @field:Min(1)
    val capacity: Int,

    @field:NotBlank
    @field:Size(max = 2000)
    val description: String,

    @field:NotNull
    @field:DecimalMin("0.0")
    val pricePerHour: BigDecimal,
)

data class RoomUpdateRequest(
    @field:Size(max = 120)
    val name: String? = null,

    @field:Size(max = 255)
    val location: String? = null,

    @field:Min(1)
    val capacity: Int? = null,

    @field:Size(max = 2000)
    val description: String? = null,

    @field:DecimalMin("0.0")
    val pricePerHour: BigDecimal? = null,

    val active: Boolean? = null,
)

data class RoomResponse(
    val id: UUID,
    val name: String,
    val location: String,
    val capacity: Int,
    val description: String,
    val pricePerHour: BigDecimal,
    val active: Boolean,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime,
) : Serializable

data class RoomShortResponse(
    val id: UUID,
    val name: String,
    val location: String,
    val capacity: Int,
) : Serializable

fun RoomEntity.toResponse(): RoomResponse = RoomResponse(
    id = requireNotNull(id),
    name = name,
    location = location,
    capacity = capacity,
    description = description,
    pricePerHour = pricePerHour,
    active = active,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun RoomEntity.toShortResponse(): RoomShortResponse = RoomShortResponse(
    id = requireNotNull(id),
    name = name,
    location = location,
    capacity = capacity,
)

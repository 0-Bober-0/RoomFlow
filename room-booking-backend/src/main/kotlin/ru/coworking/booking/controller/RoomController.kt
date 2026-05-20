package ru.coworking.booking.controller

import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import ru.coworking.booking.dto.PageResponse
import ru.coworking.booking.dto.RoomCreateRequest
import ru.coworking.booking.dto.RoomResponse
import ru.coworking.booking.dto.RoomUpdateRequest
import ru.coworking.booking.service.RoomService
import java.time.OffsetDateTime
import java.util.UUID

@RestController
@RequestMapping("/api/v1/rooms")
class RoomController(
    private val roomService: RoomService,
) {
    @GetMapping
    fun search(
        @RequestParam(required = false) minCapacity: Int?,
        @RequestParam(required = false, name = "from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) from: OffsetDateTime?,
        @RequestParam(required = false, name = "to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) to: OffsetDateTime?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): PageResponse<RoomResponse> = roomService.search(minCapacity, from, to, page, size)

    @GetMapping("/{id}")
    fun get(@PathVariable id: UUID): RoomResponse = roomService.get(id)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: RoomCreateRequest): RoomResponse = roomService.create(request)

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @Valid @RequestBody request: RoomUpdateRequest): RoomResponse =
        roomService.update(id, request)

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deactivate(@PathVariable id: UUID) = roomService.deactivate(id)
}

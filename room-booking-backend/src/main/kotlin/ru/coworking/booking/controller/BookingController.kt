package ru.coworking.booking.controller

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import ru.coworking.booking.dto.BookingCreateRequest
import ru.coworking.booking.dto.BookingResponse
import ru.coworking.booking.dto.PageResponse
import ru.coworking.booking.security.SecurityUser
import ru.coworking.booking.service.BookingService
import java.util.UUID

@RestController
@RequestMapping("/api/v1/bookings")
class BookingController(
    private val bookingService: BookingService,
) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @AuthenticationPrincipal principal: SecurityUser,
        @Valid @RequestBody request: BookingCreateRequest,
    ): BookingResponse = bookingService.create(principal.id, request)

    @GetMapping("/my")
    fun myBookings(
        @AuthenticationPrincipal principal: SecurityUser,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): PageResponse<BookingResponse> = bookingService.myBookings(principal.id, page, size)

    @GetMapping("/{id}")
    fun get(
        @AuthenticationPrincipal principal: SecurityUser,
        @PathVariable id: UUID,
    ): BookingResponse = bookingService.get(id, principal.id, principal.role)

    @PatchMapping("/{id}/cancel")
    fun cancel(
        @AuthenticationPrincipal principal: SecurityUser,
        @PathVariable id: UUID,
    ): BookingResponse = bookingService.cancel(id, principal.id, principal.role)
}

package ru.coworking.booking.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import ru.coworking.booking.domain.BookingStatus
import ru.coworking.booking.dto.BookingResponse
import ru.coworking.booking.dto.PageResponse
import ru.coworking.booking.dto.UserResponse
import ru.coworking.booking.service.AdminService
import ru.coworking.booking.service.BookingService

@RestController
@RequestMapping("/api/v1/admin")
class AdminController(
    private val adminService: AdminService,
    private val bookingService: BookingService,
) {
    @GetMapping("/users")
    fun users(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): PageResponse<UserResponse> = adminService.users(page, size)

    @GetMapping("/bookings")
    fun bookings(
        @RequestParam(required = false) status: BookingStatus?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): PageResponse<BookingResponse> = bookingService.all(status, page, size)
}

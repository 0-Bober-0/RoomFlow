package ru.coworking.booking.exception

import org.springframework.http.HttpStatus

open class ApiException(
    val status: HttpStatus,
    override val message: String,
) : RuntimeException(message)

class BadRequestException(message: String) : ApiException(HttpStatus.BAD_REQUEST, message)
class ConflictException(message: String) : ApiException(HttpStatus.CONFLICT, message)
class ForbiddenException(message: String) : ApiException(HttpStatus.FORBIDDEN, message)
class NotFoundException(message: String) : ApiException(HttpStatus.NOT_FOUND, message)

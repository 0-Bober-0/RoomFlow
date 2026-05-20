package ru.coworking.booking.dto

import java.io.Serializable
import java.time.OffsetDateTime

data class ErrorResponse(
    val timestamp: OffsetDateTime = OffsetDateTime.now(),
    val status: Int,
    val error: String,
    val message: String,
    val path: String,
    val details: Map<String, String>? = null,
) : Serializable

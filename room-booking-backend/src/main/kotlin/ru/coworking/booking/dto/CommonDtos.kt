package ru.coworking.booking.dto

import org.springframework.data.domain.Page
import java.io.Serializable

data class PageResponse<T>(
    val items: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
) : Serializable

fun <T> Page<T>.toPageResponse(): PageResponse<T> = PageResponse(
    items = content,
    page = number,
    size = size,
    totalElements = totalElements,
    totalPages = totalPages,
)

package ru.coworking.booking.security

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import ru.coworking.booking.config.RateLimitProperties
import ru.coworking.booking.dto.ErrorResponse
import java.time.Instant

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
class RateLimitFilter(
    private val redisTemplate: StringRedisTemplate,
    private val properties: RateLimitProperties,
    private val objectMapper: ObjectMapper,
) : OncePerRequestFilter() {
    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        val path = request.requestURI
        return !properties.enabled ||
            path.startsWith("/actuator") ||
            path.startsWith("/swagger-ui") ||
            path.startsWith("/v3/api-docs")
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val key = keyFor(request)

        try {
            val count = redisTemplate.opsForValue().increment(key) ?: 1L
            if (count == 1L) {
                redisTemplate.expire(key, properties.window)
            }

            response.setHeader("X-RateLimit-Limit", properties.limit.toString())
            response.setHeader("X-RateLimit-Remaining", (properties.limit - count).coerceAtLeast(0).toString())

            if (count > properties.limit) {
                response.status = HttpStatus.TOO_MANY_REQUESTS.value()
                response.contentType = "application/json"
                objectMapper.writeValue(
                    response.outputStream,
                    ErrorResponse(
                        status = HttpStatus.TOO_MANY_REQUESTS.value(),
                        error = HttpStatus.TOO_MANY_REQUESTS.reasonPhrase,
                        message = "Too many requests",
                        path = request.requestURI,
                    ),
                )
                return
            }
        } catch (_: Exception) {
            // Redis недоступен: не блокируем бизнес-запросы, но в production лучше включить alerting.
        }

        filterChain.doFilter(request, response)
    }

    private fun keyFor(request: HttpServletRequest): String {
        val clientIp = request.getHeader("X-Forwarded-For")
            ?.split(",")
            ?.firstOrNull()
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?: request.remoteAddr

        val bucket = Instant.now().epochSecond / properties.window.seconds.coerceAtLeast(1)
        return "rate-limit:$clientIp:$bucket"
    }
}

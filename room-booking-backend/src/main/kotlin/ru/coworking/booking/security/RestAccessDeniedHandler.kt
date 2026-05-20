package ru.coworking.booking.security

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.stereotype.Component
import ru.coworking.booking.dto.ErrorResponse

@Component
class RestAccessDeniedHandler(
    private val objectMapper: ObjectMapper,
) : AccessDeniedHandler {
    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        accessDeniedException: AccessDeniedException,
    ) {
        response.status = HttpStatus.FORBIDDEN.value()
        response.contentType = "application/json"
        objectMapper.writeValue(
            response.outputStream,
            ErrorResponse(
                status = HttpStatus.FORBIDDEN.value(),
                error = HttpStatus.FORBIDDEN.reasonPhrase,
                message = "Access denied",
                path = request.requestURI,
            ),
        )
    }
}

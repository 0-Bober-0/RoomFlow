package ru.coworking.booking.repository

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.coworking.booking.domain.BookingEntity
import ru.coworking.booking.domain.BookingStatus
import java.time.OffsetDateTime
import java.util.Optional
import java.util.UUID

interface BookingRepository : JpaRepository<BookingEntity, UUID> {
    fun findByUser_IdOrderByStartsAtDesc(userId: UUID, pageable: Pageable): Page<BookingEntity>

    fun findByIdAndUser_Id(id: UUID, userId: UUID): Optional<BookingEntity>

    fun findByStatus(status: BookingStatus, pageable: Pageable): Page<BookingEntity>

    @Query(
        """
        select case when count(b) > 0 then true else false end
        from BookingEntity b
        where b.room.id = :roomId
          and b.status = :status
          and b.startsAt < :endsAt
          and b.endsAt > :startsAt
        """,
    )
    fun existsOverlappingBooking(
        @Param("roomId") roomId: UUID,
        @Param("startsAt") startsAt: OffsetDateTime,
        @Param("endsAt") endsAt: OffsetDateTime,
        @Param("status") status: BookingStatus,
    ): Boolean
}

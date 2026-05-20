package ru.coworking.booking.repository

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import ru.coworking.booking.domain.BookingStatus
import ru.coworking.booking.domain.RoomEntity
import java.time.OffsetDateTime
import java.util.UUID

interface RoomRepository : JpaRepository<RoomEntity, UUID> {
    @Query(
        """
        select r
        from RoomEntity r
        where r.active = true
          and (:minCapacity is null or r.capacity >= :minCapacity)
        """,
    )
    fun searchActive(
        @Param("minCapacity") minCapacity: Int?,
        pageable: Pageable,
    ): Page<RoomEntity>

    @Query(
        """
        select r
        from RoomEntity r
        where r.active = true
          and (:minCapacity is null or r.capacity >= :minCapacity)
          and not exists (
              select b.id
              from BookingEntity b
              where b.room = r
                and b.status = :status
                and b.startsAt < :toTime
                and b.endsAt > :fromTime
          )
        """,
    )
    fun searchAvailable(
        @Param("minCapacity") minCapacity: Int?,
        @Param("fromTime") fromTime: OffsetDateTime,
        @Param("toTime") toTime: OffsetDateTime,
        @Param("status") status: BookingStatus,
        pageable: Pageable,
    ): Page<RoomEntity>
}

# Room Booking Backend

Монолитный backend для темы **«Сервис бронирования переговорных коворкингов»**.

Стек:

- Kotlin 1.9.25
- Spring Boot 3.3.5
- PostgreSQL 16
- Redis 7
- Liquibase
- Spring Security + JWT
- Spring Data JPA
- Actuator + Prometheus metrics
- OpenAPI/Swagger UI
- Docker/Docker Compose

## Что реализовано

- Регистрация и вход по JWT.
- Роли `USER` и `ADMIN`.
- CRUD переговорных комнат для администратора.
- Просмотр активных комнат и поиск доступных по времени.
- Создание и отмена бронирований.
- Защита от пересечения бронирований:
  - проверка на уровне сервиса;
  - PostgreSQL exclusion constraint через Liquibase.
- Redis:
  - кэширование карточки комнаты;
  - простой IP rate limiter.
- Глобальная обработка ошибок в едином JSON-формате.
- Тестовые данные при старте приложения.
- Конфигурация для дальнейшего деплоя на Railway через Dockerfile.

## Быстрый запуск полностью в Docker

```bash
docker compose up --build
```

После запуска:

- API: `http://localhost:8080/api/v1`
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- Healthcheck: `http://localhost:8080/actuator/health`
- Prometheus metrics: `http://localhost:8080/actuator/prometheus`

## Локальный запуск без контейнера приложения

Подними только PostgreSQL и Redis:

```bash
docker compose up -d postgres redis
```

Запусти приложение:

```bash
gradle bootRun
```

По умолчанию приложение подключается к:

- PostgreSQL: `jdbc:postgresql://localhost:5432/coworking_booking`
- Redis: `localhost:6379`

## Демо-пользователи

При `SEED_ENABLED=true` создаются:

| Роль | Email | Password |
|---|---|---|
| ADMIN | `admin@coworking.local` | `Admin12345!` |
| USER | `user@coworking.local` | `User12345!` |

## Примеры запросов

### Логин

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coworking.local","password":"Admin12345!"}'
```

Ответ содержит `accessToken`. Дальше передавай его так:

```bash
-H "Authorization: Bearer <accessToken>"
```

### Создание комнаты администратором

```bash
curl -X POST http://localhost:8080/api/v1/rooms \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Focus Room",
    "location":"Coworking A, 3 floor",
    "capacity":6,
    "description":"Комната для переговоров и созвонов",
    "pricePerHour":1200.00
  }'
```

### Поиск свободных комнат

```bash
curl "http://localhost:8080/api/v1/rooms?minCapacity=4&from=2026-06-01T10:00:00Z&to=2026-06-01T12:00:00Z"
```

### Создание бронирования

```bash
curl -X POST http://localhost:8080/api/v1/bookings \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId":"<roomId>",
    "startsAt":"2026-06-01T10:00:00Z",
    "endsAt":"2026-06-01T12:00:00Z",
    "purpose":"Командная планерка"
  }'
```

## Основные endpoint'ы

| Метод | Endpoint | Доступ | Назначение |
|---|---|---|---|
| POST | `/api/v1/auth/register` | public | Регистрация |
| POST | `/api/v1/auth/login` | public | Логин |
| GET | `/api/v1/auth/me` | USER/ADMIN | Текущий пользователь |
| GET | `/api/v1/rooms` | public | Список комнат / поиск доступных |
| GET | `/api/v1/rooms/{id}` | public | Карточка комнаты |
| POST | `/api/v1/rooms` | ADMIN | Создание комнаты |
| PUT | `/api/v1/rooms/{id}` | ADMIN | Обновление комнаты |
| DELETE | `/api/v1/rooms/{id}` | ADMIN | Мягкое удаление комнаты |
| POST | `/api/v1/bookings` | USER/ADMIN | Создание бронирования |
| GET | `/api/v1/bookings/my` | USER/ADMIN | Мои бронирования |
| GET | `/api/v1/bookings/{id}` | USER/ADMIN | Просмотр бронирования |
| PATCH | `/api/v1/bookings/{id}/cancel` | USER/ADMIN | Отмена бронирования |
| GET | `/api/v1/admin/users` | ADMIN | Пользователи |
| GET | `/api/v1/admin/bookings` | ADMIN | Все бронирования |

## Переменные окружения

| Переменная | Значение по умолчанию | Описание |
|---|---:|---|
| `SERVER_PORT` | `8080` | Порт приложения. На Railway можно использовать `PORT`. |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/coworking_booking` | JDBC URL PostgreSQL. |
| `SPRING_DATASOURCE_USERNAME` | `booking` | Пользователь БД. |
| `SPRING_DATASOURCE_PASSWORD` | `booking` | Пароль БД. |
| `SPRING_DATA_REDIS_HOST` | `localhost` | Host Redis. |
| `SPRING_DATA_REDIS_PORT` | `6379` | Port Redis. |
| `JWT_SECRET` | dev-secret | Секрет JWT, минимум 32 байта. |
| `JWT_EXPIRATION` | `PT24H` | Время жизни JWT. |
| `CORS_ALLOWED_ORIGINS` | localhost фронты | Разрешенные origins. |
| `RATE_LIMIT_ENABLED` | `true` | Включить Redis rate limiter. |
| `RATE_LIMIT_LIMIT` | `120` | Количество запросов на окно. |
| `RATE_LIMIT_WINDOW` | `PT1M` | Окно rate limiter. |
| `SEED_ENABLED` | `true` | Создавать демо-данные. |

## Railway позже

Проект уже содержит `Dockerfile`. Для Railway обычно достаточно создать сервис из репозитория и задать переменные:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://<host>:<port>/<db>
SPRING_DATASOURCE_USERNAME=<user>
SPRING_DATASOURCE_PASSWORD=<password>
SPRING_DATA_REDIS_HOST=<redis-host>
SPRING_DATA_REDIS_PORT=<redis-port>
JWT_SECRET=<strong-random-secret>
SEED_ENABLED=false
```

Если Railway отдаст Redis одной строкой URL, можно задать стандартную Spring-переменную `SPRING_DATA_REDIS_URL` вместо host/port.

## Миграции

Используется только Liquibase.

Главный changelog:

```text
src/main/resources/db/changelog/db.changelog-master.yaml
```

Hibernate работает в режиме `ddl-auto: validate`, то есть схему создает Liquibase, а не JPA.

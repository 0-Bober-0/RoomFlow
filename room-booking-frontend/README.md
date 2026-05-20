# RoomFlow Frontend

Production-style frontend для темы **«Сервис бронирования переговорных коворкингов»** с полноценной стартовой страницей, авторизацией и рабочим кабинетом.

Проект сделан под backend из архива `room-booking-backend.zip`:

- React 18
- TypeScript
- Vite
- CSS без UI-kit, дизайн полностью кастомный
- JWT авторизация через backend
- Интеграция с REST API Spring Boot/Kotlin
- Адаптивная верстка под desktop/tablet/mobile
- Dockerfile для будущего деплоя

## Что реализовано

- Production landing page без технических заглушек, с hero-секцией, поисковым виджетом, карточками пространств и блоком преимуществ.
- Экран входа и регистрации.
- Быстрый вход демо-пользователями:
  - `admin@coworking.local / Admin12345!`
  - `user@coworking.local / User12345!`
- Главная рабочая панель.
- Поиск свободных переговорных по:
  - минимальной вместимости;
  - времени начала;
  - времени окончания.
- Карточки переговорных с красивыми визуальными блоками.
- Создание бронирования.
- Просмотр личных бронирований.
- Отмена активной брони.
- Профиль пользователя.
- Админ-панель:
  - создание комнаты;
  - редактирование комнаты;
  - деактивация комнаты;
  - список пользователей;
  - список всех бронирований;
  - фильтр бронирований по статусу.
- Toast-уведомления, skeleton loading states, empty states.

## Быстрый запуск

Сначала запусти backend:

```bash
cd room-booking-backend
docker compose up --build
```

Потом frontend:

```bash
cd room-booking-frontend
npm install
npm run dev
```

Открой:

```text
http://localhost:5173
```

Backend API по умолчанию:

```text
http://localhost:8080/api/v1
```

## Переменные окружения

Создай `.env` из примера:

```bash
cp .env.example .env
```

Пример:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

Если frontend и backend будут на разных доменах, укажи публичный URL backend API:

```env
VITE_API_URL=https://your-backend.up.railway.app/api/v1
```

И не забудь в backend добавить origin фронтенда в переменную:

```env
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:5173
```

## Production build

```bash
npm run build
npm run preview
```

Проверка TypeScript:

```bash
npm run lint
```

## Docker

```bash
docker build -t room-booking-frontend .
docker run --rm -p 3000:80 room-booking-frontend
```

Если нужно задать API URL на этапе сборки:

```bash
docker build \
  --build-arg VITE_API_URL=https://your-backend.up.railway.app/api/v1 \
  -t room-booking-frontend .
```

## Структура

```text
src/
  api/
    client.ts       # fetch-клиент и обработка ошибок
    types.ts        # DTO под Kotlin backend
  utils/
    dates.ts        # даты, форматирование денег, интервалы
    ui.ts           # UI helpers
  App.tsx           # вся логика экранов и компонентов
  styles.css        # полный дизайн интерфейса
  main.tsx
```

## Совместимость с backend endpoint'ами

Frontend использует endpoint'ы:

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/register
GET    /api/v1/auth/me
GET    /api/v1/rooms
POST   /api/v1/rooms
PUT    /api/v1/rooms/{id}
DELETE /api/v1/rooms/{id}
POST   /api/v1/bookings
GET    /api/v1/bookings/my
PATCH  /api/v1/bookings/{id}/cancel
GET    /api/v1/admin/users
GET    /api/v1/admin/bookings
```

## Важное замечание по датам

HTML `datetime-local` вводит локальное время пользователя. Перед отправкой frontend преобразует его в ISO-строку через `new Date(value).toISOString()`, чтобы backend получил `OffsetDateTime` с таймзоной.

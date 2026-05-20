# Room Flow Local

Фронтенд-версия сервиса бронирования переговорных комнат **Room Flow** без отдельного backend.

Вся бизнес-логика перенесена в клиентское приложение:

- пользователи;
- авторизация;
- роли `USER` / `ADMIN`;
- комнаты;
- бронирования;
- проверка пересечений бронирований;
- создание, редактирование и отключение комнат;
- просмотр пользователей и всех бронирований в админке.

Данные хранятся локально в `localStorage` браузера. Отдельные PostgreSQL, Redis и Kotlin backend для этой версии не нужны.

## Демо-аккаунты

Администратор:

```text
email: admin@coworking.local
password: Admin12345!
```

Пользователь:

```text
email: user@coworking.local
password: User12345!
```

## Локальный запуск

```bash
cd room-booking-frontend
npm install
npm run dev
```

Открыть:

```text
http://localhost:5173
```

## Сборка

```bash
npm run build
```

Результат сборки будет в папке:

```text
dist
```

## Сброс локальных данных

Данные сохраняются в браузере. Чтобы заново получить начальные комнаты и демо-аккаунты, очисти localStorage для сайта или выполни в консоли браузера:

```js
localStorage.removeItem('roomflow_local_store_v2')
localStorage.removeItem('room_booking_access_token')
location.reload()
```

## Деплой на Vercel

Для Vercel укажи параметры:

```text
Framework Preset: Vite
Root Directory: room-booking-frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Переменная `VITE_API_URL` больше не нужна, потому что приложение работает на локальных данных браузера.

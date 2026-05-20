import type {
  ApiErrorPayload,
  BookingCreateRequest,
  BookingResponse,
  BookingStatus,
  LoginRequest,
  PageResponse,
  RegisterRequest,
  RoomCreateRequest,
  RoomResponse,
  RoomSearchParams,
  RoomUpdateRequest,
  TokenResponse,
  UserResponse,
} from './types';

const STORAGE_KEY = 'roomflow_local_store_v2';
const TOKEN_PREFIX = 'roomflow-local-token:';
const LOCAL_API_LABEL = 'Very cool app';

interface LocalStore {
  users: Array<UserResponse & { password: string }>;
  rooms: RoomResponse[];
  bookings: BookingResponse[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload?: ApiErrorPayload;

  constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export interface ApiClientOptions {
  getToken: () => string | null;
  onUnauthorized?: () => void;
}

function now() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pageOf<T>(items: T[], page = 0, size = 20): PageResponse<T> {
  const safePage = Math.max(page, 0);
  const safeSize = Math.max(size, 1);
  const start = safePage * safeSize;
  const slice = items.slice(start, start + safeSize);

  return {
    items: slice,
    page: safePage,
    size: safeSize,
    totalElements: items.length,
    totalPages: Math.max(Math.ceil(items.length / safeSize), 1),
  };
}

function seedStore(): LocalStore {
  const createdAt = now();

  const admin: LocalStore['users'][number] = {
    id: 'user-admin',
    email: 'admin@coworking.local',
    fullName: 'Администратор Room Flow',
    role: 'ADMIN',
    enabled: true,
    createdAt,
    password: 'Admin12345!',
  };

  const user: LocalStore['users'][number] = {
    id: 'user-demo',
    email: 'user@coworking.local',
    fullName: 'Иван Петров',
    role: 'USER',
    enabled: true,
    createdAt,
    password: 'User12345!',
  };

  const rooms: RoomResponse[] = [
    {
      id: 'room-panorama',
      name: 'Panorama Meeting Room',
      location: 'Москва, офис на Лесной · 12 этаж',
      capacity: 12,
      description: 'Просторная переговорная с панорамным видом, экраном 4K, видеосвязью и маркерной доской.',
      pricePerHour: 1500,
      active: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'room-focus',
      name: 'Focus Room',
      location: 'Москва, офис на Лесной · 5 этаж',
      capacity: 4,
      description: 'Компактная комната для коротких созвонов, интервью и фокусной работы небольшой команды.',
      pricePerHour: 800,
      active: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'room-atrium',
      name: 'Atrium Hall',
      location: 'Москва, бизнес-центр Атриум · 2 этаж',
      capacity: 24,
      description: 'Большое пространство для воркшопов, презентаций и командных обсуждений с проектором и акустикой.',
      pricePerHour: 2400,
      active: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'room-skyline',
      name: 'Skyline Boardroom',
      location: 'Москва-Сити · башня Федерация · 18 этаж',
      capacity: 10,
      description: 'Премиальная boardroom-комната для встреч с клиентами, стратегических сессий и презентаций.',
      pricePerHour: 1800,
      active: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'room-lounge',
      name: 'Creative Lounge',
      location: 'Коворкинг Room Flow · зона B',
      capacity: 8,
      description: 'Неформальное пространство с мягкой мебелью, флипчартом и удобной зоной для брейнштормов.',
      pricePerHour: 1200,
      active: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'room-neon',
      name: 'Neon Studio',
      location: 'Коворкинг Room Flow · зона C',
      capacity: 6,
      description: 'Комната для онлайн-встреч и записи презентаций: хорошее освещение, микрофон и быстрый Wi‑Fi.',
      pricePerHour: 1100,
      active: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'room-library',
      name: 'Library Room',
      location: 'Москва, офис на Тверской · 3 этаж',
      capacity: 5,
      description: 'Тихая переговорная для индивидуальных консультаций, собеседований и конфиденциальных разговоров.',
      pricePerHour: 950,
      active: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'room-briefing',
      name: 'Briefing Space',
      location: 'Москва, офис на Лесной · 8 этаж',
      capacity: 16,
      description: 'Универсальная комната для ежедневных планёрок, демо, обучающих встреч и командных брифингов.',
      pricePerHour: 1700,
      active: true,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(15, 30, 0, 0);

  const bookings: BookingResponse[] = [
    {
      id: 'booking-demo-1',
      room: roomShort(rooms[1]),
      user: stripPassword(user),
      startsAt: tomorrow.toISOString(),
      endsAt: tomorrowEnd.toISOString(),
      status: 'CONFIRMED',
      purpose: 'Демо-бронь для проверки раздела «Мои брони»',
      createdAt,
      updatedAt: createdAt,
    },
  ];

  return { users: [admin, user], rooms, bookings };
}

function loadStore(): LocalStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedStore();
    saveStore(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as LocalStore;
    if (!Array.isArray(parsed.users) || !Array.isArray(parsed.rooms) || !Array.isArray(parsed.bookings)) {
      throw new Error('Invalid local store');
    }
    return parsed;
  } catch {
    const seeded = seedStore();
    saveStore(seeded);
    return seeded;
  }
}

function saveStore(store: LocalStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function stripPassword(user: LocalStore['users'][number]): UserResponse {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

function roomShort(room: RoomResponse) {
  return {
    id: room.id,
    name: room.name,
    location: room.location,
    capacity: room.capacity,
  };
}

function tokenFor(userId: string) {
  return `${TOKEN_PREFIX}${userId}`;
}

function userIdFromToken(token: string | null) {
  if (!token?.startsWith(TOKEN_PREFIX)) return null;
  return token.slice(TOKEN_PREFIX.length);
}

function requireUser(token: string | null, onUnauthorized?: () => void) {
  const store = loadStore();
  const userId = userIdFromToken(token);
  const user = store.users.find((item) => item.id === userId && item.enabled);

  if (!user) {
    onUnauthorized?.();
    throw new ApiError('Необходимо войти в аккаунт.', 401);
  }

  return { store, user };
}

function requireAdmin(token: string | null, onUnauthorized?: () => void) {
  const context = requireUser(token, onUnauthorized);
  if (context.user.role !== 'ADMIN') {
    throw new ApiError('Недостаточно прав для выполнения операции.', 403);
  }
  return context;
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hasOverlap(firstStart: string, firstEnd: string, secondStart: string, secondEnd: string) {
  return new Date(firstStart).getTime() < new Date(secondEnd).getTime()
    && new Date(firstEnd).getTime() > new Date(secondStart).getTime();
}

function validateRoom(body: RoomCreateRequest | RoomUpdateRequest) {
  if ('name' in body && typeof body.name === 'string' && body.name.trim().length < 2) {
    throw new ApiError('Название комнаты должно содержать минимум 2 символа.', 400);
  }
  if ('location' in body && typeof body.location === 'string' && body.location.trim().length < 2) {
    throw new ApiError('Укажите локацию комнаты.', 400);
  }
  if ('capacity' in body && body.capacity !== undefined && Number(body.capacity) < 1) {
    throw new ApiError('Вместимость должна быть больше 0.', 400);
  }
  if ('pricePerHour' in body && body.pricePerHour !== undefined && Number(body.pricePerHour) < 0) {
    throw new ApiError('Цена не может быть отрицательной.', 400);
  }
}

function availableRooms(store: LocalStore, params: RoomSearchParams) {
  const minCapacity = params.minCapacity ? Number(params.minCapacity) : undefined;
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;
  const shouldCheckTime = from && to && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to > from;

  return store.rooms
    .filter((room) => room.active)
    .filter((room) => !minCapacity || room.capacity >= minCapacity)
    .filter((room) => {
      if (!shouldCheckTime) return true;

      return !store.bookings.some((booking) => (
        booking.room.id === room.id
        && booking.status === 'CONFIRMED'
        && hasOverlap(booking.startsAt, booking.endsAt, from.toISOString(), to.toISOString())
      ));
    })
    .sort((a, b) => a.capacity - b.capacity || a.name.localeCompare(b.name));
}

export function createApiClient({ getToken, onUnauthorized }: ApiClientOptions) {
  return {
    baseUrl: LOCAL_API_LABEL,

    async login(body: LoginRequest): Promise<TokenResponse> {
      const store = loadStore();
      const email = body.email.trim().toLowerCase();
      const user = store.users.find((item) => item.email.toLowerCase() === email && item.password === body.password);

      if (!user) {
        throw new ApiError('Неверный email или пароль.', 401);
      }

      return {
        tokenType: 'Bearer',
        accessToken: tokenFor(user.id),
        expiresInSeconds: 86_400,
        user: stripPassword(user),
      };
    },

    async register(body: RegisterRequest): Promise<TokenResponse> {
      const store = loadStore();
      const email = body.email.trim().toLowerCase();
      const fullName = body.fullName.trim();

      if (!validateEmail(email)) {
        throw new ApiError('Некорректный email.', 400);
      }
      if (fullName.length < 2) {
        throw new ApiError('ФИО должно содержать минимум 2 символа.', 400);
      }
      if (body.password.length < 8) {
        throw new ApiError('Пароль должен содержать минимум 8 символов.', 400);
      }
      if (store.users.some((item) => item.email.toLowerCase() === email)) {
        throw new ApiError('Пользователь с таким email уже существует.', 409);
      }

      const createdAt = now();
      const newUser: LocalStore['users'][number] = {
        id: uid('user'),
        email,
        fullName,
        role: 'USER',
        enabled: true,
        createdAt,
        password: body.password,
      };

      store.users.push(newUser);
      saveStore(store);

      return {
        tokenType: 'Bearer',
        accessToken: tokenFor(newUser.id),
        expiresInSeconds: 86_400,
        user: stripPassword(newUser),
      };
    },

    async me(): Promise<UserResponse> {
      const { user } = requireUser(getToken(), onUnauthorized);
      return stripPassword(user);
    },

    async rooms(params: RoomSearchParams = {}): Promise<PageResponse<RoomResponse>> {
      const store = loadStore();
      return pageOf(availableRooms(store, params), params.page ?? 0, params.size ?? 20);
    },

    async room(id: string): Promise<RoomResponse> {
      const store = loadStore();
      const room = store.rooms.find((item) => item.id === id);
      if (!room) throw new ApiError('Комната не найдена.', 404);
      return room;
    },

    async createRoom(body: RoomCreateRequest): Promise<RoomResponse> {
      const { store } = requireAdmin(getToken(), onUnauthorized);
      validateRoom(body);

      const timestamp = now();
      const room: RoomResponse = {
        id: uid('room'),
        name: body.name.trim(),
        location: body.location.trim(),
        capacity: Number(body.capacity),
        description: body.description.trim(),
        pricePerHour: Number(body.pricePerHour),
        active: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      store.rooms.push(room);
      saveStore(store);
      return room;
    },

    async updateRoom(id: string, body: RoomUpdateRequest): Promise<RoomResponse> {
      const { store } = requireAdmin(getToken(), onUnauthorized);
      validateRoom(body);

      const room = store.rooms.find((item) => item.id === id);
      if (!room) throw new ApiError('Комната не найдена.', 404);

      if (body.name !== undefined) room.name = body.name.trim();
      if (body.location !== undefined) room.location = body.location.trim();
      if (body.capacity !== undefined) room.capacity = Number(body.capacity);
      if (body.description !== undefined) room.description = body.description.trim();
      if (body.pricePerHour !== undefined) room.pricePerHour = Number(body.pricePerHour);
      if (body.active !== undefined) room.active = body.active;
      room.updatedAt = now();

      store.bookings = store.bookings.map((booking) => (
        booking.room.id === room.id ? { ...booking, room: roomShort(room), updatedAt: now() } : booking
      ));

      saveStore(store);
      return room;
    },

    async deleteRoom(id: string): Promise<void> {
      const { store } = requireAdmin(getToken(), onUnauthorized);
      const room = store.rooms.find((item) => item.id === id);
      if (!room) throw new ApiError('Комната не найдена.', 404);
      room.active = false;
      room.updatedAt = now();
      saveStore(store);
    },

    async createBooking(body: BookingCreateRequest): Promise<BookingResponse> {
      const { store, user } = requireUser(getToken(), onUnauthorized);
      const room = store.rooms.find((item) => item.id === body.roomId && item.active);
      if (!room) throw new ApiError('Комната не найдена или отключена.', 404);

      const startsAt = new Date(body.startsAt);
      const endsAt = new Date(body.endsAt);
      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        throw new ApiError('Некорректный формат даты.', 400);
      }
      if (endsAt <= startsAt) {
        throw new ApiError('Время окончания должно быть позже времени начала.', 400);
      }
      if (startsAt.getTime() < Date.now() - 60_000) {
        throw new ApiError('Нельзя создать бронирование на прошедшее время.', 400);
      }
      if (!body.purpose.trim()) {
        throw new ApiError('Укажите цель встречи.', 400);
      }

      const overlap = store.bookings.some((booking) => (
        booking.room.id === room.id
        && booking.status === 'CONFIRMED'
        && hasOverlap(booking.startsAt, booking.endsAt, startsAt.toISOString(), endsAt.toISOString())
      ));

      if (overlap) {
        throw new ApiError('Комната уже забронирована на выбранное время.', 409);
      }

      const timestamp = now();
      const booking: BookingResponse = {
        id: uid('booking'),
        room: roomShort(room),
        user: stripPassword(user),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        status: 'CONFIRMED',
        purpose: body.purpose.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      store.bookings.push(booking);
      saveStore(store);
      return booking;
    },

    async myBookings(page = 0, size = 20): Promise<PageResponse<BookingResponse>> {
      const { store, user } = requireUser(getToken(), onUnauthorized);
      const bookings = store.bookings
        .filter((booking) => booking.user.id === user.id)
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

      return pageOf(bookings, page, size);
    },

    async cancelBooking(id: string): Promise<BookingResponse> {
      const { store, user } = requireUser(getToken(), onUnauthorized);
      const booking = store.bookings.find((item) => item.id === id);
      if (!booking) throw new ApiError('Бронирование не найдено.', 404);
      if (booking.user.id !== user.id && user.role !== 'ADMIN') {
        throw new ApiError('Можно отменять только свои бронирования.', 403);
      }

      booking.status = 'CANCELLED';
      booking.updatedAt = now();
      saveStore(store);
      return booking;
    },

    async adminUsers(page = 0, size = 20): Promise<PageResponse<UserResponse>> {
      const { store } = requireAdmin(getToken(), onUnauthorized);
      return pageOf(store.users.map(stripPassword), page, size);
    },

    async adminBookings(status?: BookingStatus, page = 0, size = 30): Promise<PageResponse<BookingResponse>> {
      const { store } = requireAdmin(getToken(), onUnauthorized);
      const bookings = store.bookings
        .filter((booking) => !status || booking.status === status)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return pageOf(bookings, page, size);
    },
  };
}

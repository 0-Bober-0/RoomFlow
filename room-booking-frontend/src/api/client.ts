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

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';

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

function makeUrl(path: string, params?: Record<string, string | number | undefined | null>) {
  const cleanBase = API_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${cleanBase}${cleanPath}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const hasJson = contentType.includes('application/json');
  const payload = hasJson ? await response.json() : undefined;

  if (!response.ok) {
    const apiPayload = payload as ApiErrorPayload | undefined;
    const details = apiPayload?.details
      ? Object.values(apiPayload.details).filter(Boolean).join(' · ')
      : '';
    const message = apiPayload?.message || details || `HTTP ${response.status}`;
    throw new ApiError(message, response.status, apiPayload);
  }

  return payload as T;
}

export interface ApiClientOptions {
  getToken: () => string | null;
  onUnauthorized?: () => void;
}

export function createApiClient({ getToken, onUnauthorized }: ApiClientOptions) {
  async function request<T>(path: string, options: RequestInit = {}, params?: Record<string, string | number | undefined | null>) {
    const token = getToken();
    const headers = new Headers(options.headers);

    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(makeUrl(path, params), {
      ...options,
      headers,
    });

    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return parseResponse<T>(response);
  }

  return {
    baseUrl: API_URL,

    login: (body: LoginRequest) =>
      request<TokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    register: (body: RegisterRequest) =>
      request<TokenResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    me: () => request<UserResponse>('/auth/me'),

    rooms: (params: RoomSearchParams = {}) =>
      request<PageResponse<RoomResponse>>('/rooms', undefined, {
        minCapacity: params.minCapacity,
        from: params.from,
        to: params.to,
        page: params.page ?? 0,
        size: params.size ?? 20,
      }),

    room: (id: string) => request<RoomResponse>(`/rooms/${id}`),

    createRoom: (body: RoomCreateRequest) =>
      request<RoomResponse>('/rooms', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    updateRoom: (id: string, body: RoomUpdateRequest) =>
      request<RoomResponse>(`/rooms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),

    deleteRoom: (id: string) =>
      request<void>(`/rooms/${id}`, {
        method: 'DELETE',
      }),

    createBooking: (body: BookingCreateRequest) =>
      request<BookingResponse>('/bookings', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    myBookings: (page = 0, size = 20) =>
      request<PageResponse<BookingResponse>>('/bookings/my', undefined, { page, size }),

    cancelBooking: (id: string) =>
      request<BookingResponse>(`/bookings/${id}/cancel`, {
        method: 'PATCH',
      }),

    adminUsers: (page = 0, size = 20) =>
      request<PageResponse<UserResponse>>('/admin/users', undefined, { page, size }),

    adminBookings: (status?: BookingStatus, page = 0, size = 30) =>
      request<PageResponse<BookingResponse>>('/admin/bookings', undefined, { status, page, size }),
  };
}

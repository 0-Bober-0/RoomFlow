export type Role = 'USER' | 'ADMIN';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  enabled: boolean;
  createdAt: string;
}

export interface TokenResponse {
  tokenType: 'Bearer';
  accessToken: string;
  expiresInSeconds: number;
  user: UserResponse;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface RoomResponse {
  id: string;
  name: string;
  location: string;
  capacity: number;
  description: string;
  pricePerHour: number | string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomCreateRequest {
  name: string;
  location: string;
  capacity: number;
  description: string;
  pricePerHour: number;
}

export interface RoomUpdateRequest {
  name?: string;
  location?: string;
  capacity?: number;
  description?: string;
  pricePerHour?: number;
  active?: boolean;
}

export interface RoomShortResponse {
  id: string;
  name: string;
  location: string;
  capacity: number;
}

export interface BookingCreateRequest {
  roomId: string;
  startsAt: string;
  endsAt: string;
  purpose: string;
}

export interface BookingResponse {
  id: string;
  room: RoomShortResponse;
  user: UserResponse;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  purpose: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiErrorPayload {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  details?: Record<string, string>;
}

export interface RoomSearchParams {
  minCapacity?: number;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

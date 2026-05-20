import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, createApiClient } from './api/client';
import type {
  BookingResponse,
  BookingStatus,
  PageResponse,
  RoomCreateRequest,
  RoomResponse,
  UserResponse,
} from './api/types';
import {
  defaultSearchEnd,
  defaultSearchStart,
  formatDateRange,
  formatDateTime,
  formatMoney,
  hoursBetween,
  toApiDateTime,
  toDatetimeLocalValue,
} from './utils/dates';
import { cls, initials } from './utils/ui';

type View = 'rooms' | 'bookings' | 'admin' | 'profile';
type AuthMode = 'login' | 'register';
type Toast = { type: 'success' | 'error' | 'info'; message: string } | null;

const TOKEN_KEY = 'room_booking_access_token';
const DEMO_ADMIN = { email: 'admin@coworking.local', password: 'Admin12345!' };
const DEMO_USER = { email: 'user@coworking.local', password: 'User12345!' };

interface SearchFilters {
  minCapacity: number;
  from: string;
  to: string;
}

interface BookingDraft {
  room: RoomResponse;
  startsAt: string;
  endsAt: string;
  purpose: string;
}

interface RoomFormState {
  id?: string;
  name: string;
  location: string;
  capacity: string;
  pricePerHour: string;
  description: string;
  active: boolean;
}

const emptyRoomForm: RoomFormState = {
  name: '',
  location: '',
  capacity: '4',
  pricePerHour: '1000',
  description: '',
  active: true,
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Неизвестная ошибка. Проверь локальное хранилище браузера.';
}

function buildRoomPayload(form: RoomFormState): RoomCreateRequest {
  return {
    name: form.name.trim(),
    location: form.location.trim(),
    capacity: Number(form.capacity),
    pricePerHour: Number(form.pricePerHour),
    description: form.description.trim(),
  };
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<UserResponse | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [view, setView] = useState<View>('rooms');
  const [booting, setBooting] = useState(Boolean(token));
  const [authLoading, setAuthLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const [filters, setFilters] = useState<SearchFilters>({
    minCapacity: 2,
    from: defaultSearchStart(),
    to: defaultSearchEnd(),
  });
  const [roomsPage, setRoomsPage] = useState<PageResponse<RoomResponse> | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const [myBookingsPage, setMyBookingsPage] = useState<PageResponse<BookingResponse> | null>(null);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [roomForm, setRoomForm] = useState<RoomFormState | null>(null);
  const [roomFormLoading, setRoomFormLoading] = useState(false);

  const [adminUsers, setAdminUsers] = useState<PageResponse<UserResponse> | null>(null);
  const [adminBookings, setAdminBookings] = useState<PageResponse<BookingResponse> | null>(null);
  const [adminStatus, setAdminStatus] = useState<BookingStatus | ''>('');
  const [adminLoading, setAdminLoading] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setMyBookingsPage(null);
    setAdminBookings(null);
    setAdminUsers(null);
    setView('rooms');
  }, []);

  const api = useMemo(
    () =>
      createApiClient({
        getToken: () => localStorage.getItem(TOKEN_KEY),
        onUnauthorized: logout,
      }),
    [logout],
  );

  const notify = useCallback((nextToast: Toast) => {
    setToast(nextToast);
    if (nextToast) {
      window.setTimeout(() => setToast(null), 4200);
    }
  }, []);

  const persistSession = useCallback((accessToken: string, currentUser: UserResponse) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setUser(currentUser);
  }, []);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const page = await api.rooms({
        minCapacity: filters.minCapacity || undefined,
        from: filters.from && filters.to ? toApiDateTime(filters.from) : undefined,
        to: filters.from && filters.to ? toApiDateTime(filters.to) : undefined,
        size: 24,
      });
      setRoomsPage(page);
    } catch (error) {
      notify({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setRoomsLoading(false);
    }
  }, [api, filters, notify]);

  const loadMyBookings = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    setBookingsLoading(true);
    try {
      const page = await api.myBookings(0, 30);
      setMyBookingsPage(page);
    } catch (error) {
      notify({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setBookingsLoading(false);
    }
  }, [api, notify]);

  const loadAdminData = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    setAdminLoading(true);
    try {
      const [users, bookings] = await Promise.all([
        api.adminUsers(0, 30),
        api.adminBookings(adminStatus || undefined, 0, 50),
      ]);
      setAdminUsers(users);
      setAdminBookings(bookings);
    } catch (error) {
      notify({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setAdminLoading(false);
    }
  }, [api, adminStatus, notify, user?.role]);

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }

    api
      .me()
      .then(setUser)
      .catch(() => logout())
      .finally(() => setBooting(false));
  }, [api, logout, token]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (user) void loadMyBookings();
  }, [loadMyBookings, user]);

  useEffect(() => {
    if (view === 'admin') void loadAdminData();
  }, [loadAdminData, view]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const fullName = String(form.get('fullName') ?? '').trim();

    try {
      const response =
        authMode === 'login'
          ? await api.login({ email, password })
          : await api.register({ email, password, fullName });

      persistSession(response.accessToken, response.user);
      setView('rooms');
      notify({ type: 'success', message: `Добро пожаловать, ${response.user.fullName}` });
    } catch (error) {
      notify({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleDemoLogin(kind: 'admin' | 'user') {
    setAuthLoading(true);
    try {
      const credentials = kind === 'admin' ? DEMO_ADMIN : DEMO_USER;
      const response = await api.login(credentials);
      persistSession(response.accessToken, response.user);
      notify({ type: 'success', message: `Вход выполнен: ${response.user.role}` });
    } catch (error) {
      notify({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setAuthLoading(false);
    }
  }

  function openBooking(room: RoomResponse) {
    if (!user) {
      notify({ type: 'info', message: 'Для бронирования нужно войти в аккаунт.' });
      return;
    }

    setBookingDraft({
      room,
      startsAt: filters.from || defaultSearchStart(),
      endsAt: filters.to || defaultSearchEnd(),
      purpose: 'Рабочая встреча',
    });
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookingDraft) return;

    setBookingLoading(true);
    try {
      const created = await api.createBooking({
        roomId: bookingDraft.room.id,
        startsAt: toApiDateTime(bookingDraft.startsAt) ?? '',
        endsAt: toApiDateTime(bookingDraft.endsAt) ?? '',
        purpose: bookingDraft.purpose,
      });
      setBookingDraft(null);
      notify({ type: 'success', message: `Бронь создана: ${created.room.name}` });
      await Promise.all([loadMyBookings(), loadRooms()]);
    } catch (error) {
      notify({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setBookingLoading(false);
    }
  }

  async function cancelBooking(id: string) {
    setBookingsLoading(true);
    try {
      await api.cancelBooking(id);
      notify({ type: 'success', message: 'Бронирование отменено.' });
      await Promise.all([loadMyBookings(), loadAdminData()]);
    } catch (error) {
      notify({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setBookingsLoading(false);
    }
  }

  function editRoom(room: RoomResponse) {
    setRoomForm({
      id: room.id,
      name: room.name,
      location: room.location,
      capacity: String(room.capacity),
      pricePerHour: String(room.pricePerHour),
      description: room.description,
      active: room.active,
    });
  }

  async function submitRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomForm) return;

    setRoomFormLoading(true);
    try {
      const payload = buildRoomPayload(roomForm);
      if (roomForm.id) {
        await api.updateRoom(roomForm.id, { ...payload, active: roomForm.active });
        notify({ type: 'success', message: 'Комната обновлена.' });
      } else {
        await api.createRoom(payload);
        notify({ type: 'success', message: 'Комната создана.' });
      }
      setRoomForm(null);
      await loadRooms();
    } catch (error) {
      notify({ type: 'error', message: getErrorMessage(error) });
    } finally {
      setRoomFormLoading(false);
    }
  }

  async function deleteRoom(id: string) {
    if (!window.confirm('Деактивировать эту комнату?')) return;
    try {
      await api.deleteRoom(id);
      notify({ type: 'success', message: 'Комната деактивирована.' });
      await loadRooms();
    } catch (error) {
      notify({ type: 'error', message: getErrorMessage(error) });
    }
  }

  const activeBookings = myBookingsPage?.items.filter((booking) => booking.status === 'CONFIRMED') ?? [];
  const nextBooking = activeBookings
    .slice()
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];

  if (booting) {
    return <BootScreen />;
  }

  return (
    <div className="app-shell">
      <div className="background background-one" />
      <div className="background background-two" />
      <div className="noise" />

      {!user ? (
        <AuthScreen
          authMode={authMode}
          setAuthMode={setAuthMode}
          loading={authLoading}
          onSubmit={handleAuth}
          onDemoLogin={handleDemoLogin}
          apiBase={api.baseUrl}
        />
      ) : (
        <div className="workspace">
          <Sidebar user={user} view={view} setView={setView} onLogout={logout} />

          <main className="content-panel">
            <TopBar user={user} nextBooking={nextBooking} onNewRoom={() => setRoomForm(emptyRoomForm)} />

            <section className="hero-card">
              <div>
                <p className="eyebrow">Room Flow</p>
                <h1>Бронируйте переговорные без хаоса в расписании</h1>
                <p>
                  Умный поиск по вместимости и времени, личные бронирования, админская зона и аккуратная
                  работа полностью на локальных данных без отдельного backend.
                </p>
              </div>
              <div className="hero-metrics">
                <Metric label="Комнат" value={roomsPage?.totalElements ?? '—'} />
                <Metric label="Мои активные" value={activeBookings.length} />
                <Metric label="Роль" value={user.role} />
              </div>
            </section>

            {view === 'rooms' && (
              <RoomsView
                user={user}
                filters={filters}
                setFilters={setFilters}
                rooms={roomsPage?.items ?? []}
                loading={roomsLoading}
                total={roomsPage?.totalElements ?? 0}
                onSearch={loadRooms}
                onBook={openBooking}
                onEdit={editRoom}
                onDelete={deleteRoom}
              />
            )}

            {view === 'bookings' && (
              <BookingsView
                bookings={myBookingsPage?.items ?? []}
                loading={bookingsLoading}
                onCancel={cancelBooking}
              />
            )}

            {view === 'admin' && user.role === 'ADMIN' && (
              <AdminView
                rooms={roomsPage?.items ?? []}
                users={adminUsers?.items ?? []}
                bookings={adminBookings?.items ?? []}
                loading={adminLoading}
                status={adminStatus}
                setStatus={setAdminStatus}
                onReload={loadAdminData}
                onNewRoom={() => setRoomForm(emptyRoomForm)}
                onEditRoom={editRoom}
                onDeleteRoom={deleteRoom}
              />
            )}

            {view === 'profile' && <ProfileView user={user} apiBase={api.baseUrl} onLogout={logout} />}
          </main>
        </div>
      )}

      {bookingDraft && (
        <BookingModal
          draft={bookingDraft}
          loading={bookingLoading}
          onChange={setBookingDraft}
          onSubmit={submitBooking}
          onClose={() => setBookingDraft(null)}
        />
      )}

      {roomForm && (
        <RoomModal
          form={roomForm}
          setForm={setRoomForm}
          loading={roomFormLoading}
          onSubmit={submitRoom}
          onClose={() => setRoomForm(null)}
        />
      )}

      {toast && <ToastView toast={toast} />}
    </div>
  );
}

function BootScreen() {
  return (
    <div className="boot-screen">
      <div className="loader-card">
        <span className="loader" />
        <p>Проверяем сессию...</p>
      </div>
    </div>
  );
}

interface AuthScreenProps {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDemoLogin: (kind: 'admin' | 'user') => void;
  apiBase: string;
}

function AuthScreen({ authMode, setAuthMode, loading, onSubmit, onDemoLogin, apiBase }: AuthScreenProps) {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <button className="landing-brand" type="button" aria-label="Room Flow">
          <span className="landing-logo">RF</span>
          <span>
            <strong>Room Flow</strong>
            <small>local workspace booking</small>
          </span>
        </button>

        <nav className="landing-nav" aria-label="Главная навигация">
          <a href="#search">Поиск</a>
          <a href="#rooms">Пространства</a>
          <a href="#benefits">Возможности</a>
        </nav>

        <div className="landing-actions">
          <button className="link-button" onClick={() => setAuthMode('login')}>Войти</button>
          <a className="landing-cta small" href="#auth">Начать</a>
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="premium-badge">Платформа для управления переговорными</span>
          <h1>Бронируйте рабочие пространства за пару кликов</h1>
          <p>
            Room Flow помогает сотрудникам быстро находить свободные переговорные, а администраторам —
            управлять помещениями, расписанием и загрузкой офиса в едином интерфейсе.
          </p>

          <div className="hero-buttons">
            <a className="landing-cta" href="#auth">Забронировать комнату</a>
            <a className="landing-secondary" href="#rooms">Посмотреть варианты</a>
          </div>

          <div className="trust-row" aria-label="Показатели сервиса">
            <div><strong>3 мин</strong><span>среднее время брони</span></div>
            <div><strong>24/7</strong><span>доступ к расписанию</span></div>
            <div><strong>∞</strong><span>комнат и филиалов</span></div>
          </div>
        </div>

        <div className="hero-visual" id="search">
          <div className="search-widget">
            <div className="widget-heading">
              <div>
                <span>Найти комнату</span>
                <strong>Сегодняшняя встреча</strong>
              </div>
              <span className="availability-pill">12 свободно</span>
            </div>

            <div className="widget-grid">
              <div><span>Дата</span><strong>20 мая</strong></div>
              <div><span>Время</span><strong>10:00—12:00</strong></div>
              <div><span>Гости</span><strong>6 человек</strong></div>
              <div><span>Локация</span><strong>Центр</strong></div>
            </div>

            <div className="room-suggestion">
              <div className="suggestion-cover"><span>5 этаж</span></div>
              <div>
                <strong>Skyline Boardroom</strong>
                <span>проектор · доска · видеосвязь</span>
              </div>
              <button type="button">Выбрать</button>
            </div>
          </div>

          <div className="dashboard-preview" aria-label="Превью панели управления">
            <div className="dashboard-topline">
              <span /> <span /> <span />
            </div>
            <div className="calendar-strip">
              {['09', '10', '11', '12', '13'].map((hour, index) => (
                <div className={cls(index === 1 && 'busy', index === 3 && 'selected')} key={hour}>
                  <span>{hour}:00</span>
                </div>
              ))}
            </div>
            <div className="occupancy-card">
              <div>
                <span>Загрузка офиса</span>
                <strong>68%</strong>
              </div>
              <div className="mini-chart"><i /><i /><i /><i /><i /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="featured-section" id="rooms">
        <div className="landing-section-head">
          <span>Популярные пространства</span>
          <h2>Комнаты под любой формат встречи</h2>
          <p>От камерных переговоров до презентаций для команды — карточки показывают вместимость, оснащение и стоимость.</p>
        </div>

        <div className="featured-grid">
          <LandingRoomCard
            title="Panorama"
            meta="12 мест · презентации"
            price="1 500 ₽/час"
            tags={['Видеосвязь', 'Экран 4K', 'Кофе']}
          />
          <LandingRoomCard
            title="Focus Room"
            meta="4 места · созвоны"
            price="800 ₽/час"
            tags={['Тишина', 'Whiteboard', 'Zoom']}
          />
          <LandingRoomCard
            title="Atrium Hall"
            meta="24 места · воркшопы"
            price="2 400 ₽/час"
            tags={['Сцена', 'Проектор', 'Акустика']}
          />
        </div>
      </section>

      <section className="benefits-section" id="benefits">
        <div className="landing-section-head left">
          <span>Для команды и администраторов</span>
          <h2>Всё важное — в понятном рабочем процессе</h2>
        </div>
        <div className="benefits-grid">
          <FeatureItem title="Мгновенный поиск" text="Фильтры по времени и вместимости показывают только реально доступные комнаты." />
          <FeatureItem title="Прозрачное расписание" text="Сотрудники видят свои брони, статусы и детали встречи без лишних уточнений." />
          <FeatureItem title="Админ-панель" text="Добавление комнат, управление пользователями и контроль всех бронирований из одного места." />
        </div>
      </section>

      <section className="auth-zone" id="auth">
        <div className="auth-copy-card">
          <span className="premium-badge">Личный кабинет</span>
          <h2>Войдите, чтобы создать бронь</h2>
          <p>
            Используйте демо-аккаунт администратора для управления комнатами или обычного пользователя для
            проверки сценария бронирования.
          </p>
          <div className="auth-note-grid">
            <div><strong>Admin</strong><span>комнаты, пользователи, все брони</span></div>
            <div><strong>User</strong><span>поиск, бронирование, личный календарь</span></div>
          </div>
        </div>

        <section className="auth-card production-auth-card">
          <div className="auth-card-header">
            <div>
              <p className="eyebrow">Добро пожаловать</p>
              <h2>{authMode === 'login' ? 'Вход в Room Flow' : 'Создание аккаунта'}</h2>
            </div>
            <div className="mode-switch">
              <button className={cls(authMode === 'login' && 'active')} onClick={() => setAuthMode('login')}>
                Вход
              </button>
              <button className={cls(authMode === 'register' && 'active')} onClick={() => setAuthMode('register')}>
                Регистрация
              </button>
            </div>
          </div>

          <form className="form-stack" onSubmit={onSubmit}>
            {authMode === 'register' && (
              <label>
                ФИО
                <input name="fullName" required minLength={2} placeholder="Александр Даев" />
              </label>
            )}

            <label>
              Email
              <input name="email" type="email" required placeholder="admin@coworking.local" />
            </label>

            <label>
              Пароль
              <input name="password" type="password" required minLength={8} placeholder="••••••••" />
            </label>

            <button className="primary-button full" disabled={loading}>
              {loading ? 'Входим...' : authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="demo-logins">
            <button onClick={() => onDemoLogin('admin')} disabled={loading}>Войти как Admin</button>
            <button onClick={() => onDemoLogin('user')} disabled={loading}>Войти как User</button>
          </div>

          <div className="api-note compact-note">
            <span>Данные</span>
            <code>{apiBase}</code>
          </div>
        </section>
      </section>
    </main>
  );
}

function LandingRoomCard({ title, meta, price, tags }: { title: string; meta: string; price: string; tags: string[] }) {
  return (
    <article className="landing-room-card">
      <div className="landing-room-cover">
        <span>Доступно сегодня</span>
      </div>
      <div className="landing-room-body">
        <div>
          <h3>{title}</h3>
          <p>{meta}</p>
        </div>
        <strong>{price}</strong>
      </div>
      <div className="landing-room-tags">
        {tags.map((tag) => <span key={tag}>{tag}</span>)}
      </div>
    </article>
  );
}

function FeatureItem({ title, text }: { title: string; text: string }) {
  return (
    <article className="feature-item">
      <div className="feature-icon">✓</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

interface SidebarProps {
  user: UserResponse;
  view: View;
  setView: (view: View) => void;
  onLogout: () => void;
}

function Sidebar({ user, view, setView, onLogout }: SidebarProps) {
  const navItems: Array<{ view: View; icon: string; label: string; adminOnly?: boolean }> = [
    { view: 'rooms', icon: '⌘', label: 'Комнаты' },
    { view: 'bookings', icon: '◴', label: 'Мои брони' },
    { view: 'admin', icon: '✦', label: 'Админка', adminOnly: true },
    { view: 'profile', icon: '●', label: 'Профиль' },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-block">
        <div className="logo-mark">RF</div>
        <div>
          <strong>Room Flow</strong>
          <span>Booking</span>
        </div>
      </div>

      <nav className="nav-list">
        {navItems
          .filter((item) => !item.adminOnly || user.role === 'ADMIN')
          .map((item) => (
            <button
              key={item.view}
              className={cls('nav-item', view === item.view && 'active')}
              onClick={() => setView(item.view)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
      </nav>

      <div className="sidebar-user">
        <div className="avatar">{initials(user.fullName)}</div>
        <div>
          <strong>{user.fullName}</strong>
          <span>{user.role}</span>
        </div>
      </div>

      <button className="ghost-button" onClick={onLogout}>Выйти</button>
    </aside>
  );
}

function TopBar({ user, nextBooking, onNewRoom }: { user: UserResponse; nextBooking?: BookingResponse; onNewRoom: () => void }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Сегодня в коворкинге</p>
        <h2>{nextBooking ? `Следующая бронь: ${nextBooking.room.name}` : 'Свободный график на сегодня'}</h2>
        <span>{nextBooking ? formatDateRange(nextBooking.startsAt, nextBooking.endsAt) : 'Выберите время и найдите подходящую переговорную'}</span>
      </div>
      <div className="topbar-actions">
        {user.role === 'ADMIN' && <button className="secondary-button" onClick={onNewRoom}>+ Комната</button>}
        <div className="avatar large">{initials(user.fullName)}</div>
      </div>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

interface RoomsViewProps {
  user: UserResponse;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  rooms: RoomResponse[];
  loading: boolean;
  total: number;
  onSearch: () => void;
  onBook: (room: RoomResponse) => void;
  onEdit: (room: RoomResponse) => void;
  onDelete: (id: string) => void;
}

function RoomsView({ user, filters, setFilters, rooms, loading, total, onSearch, onBook, onEdit, onDelete }: RoomsViewProps) {
  return (
    <section className="section-stack">
      <div className="filter-card">
        <div>
          <p className="eyebrow">Поиск свободных комнат</p>
          <h2>Подберите переговорную под встречу</h2>
        </div>

        <form
          className="filter-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <label>
            Вместимость от
            <input
              type="number"
              min="1"
              value={filters.minCapacity}
              onChange={(event) => setFilters({ ...filters, minCapacity: Number(event.target.value) })}
            />
          </label>
          <label>
            Начало
            <input
              type="datetime-local"
              value={filters.from}
              onChange={(event) => setFilters({ ...filters, from: event.target.value })}
            />
          </label>
          <label>
            Окончание
            <input
              type="datetime-local"
              value={filters.to}
              onChange={(event) => setFilters({ ...filters, to: event.target.value })}
            />
          </label>
          <button className="primary-button" disabled={loading}>{loading ? 'Ищем...' : 'Найти'}</button>
        </form>
      </div>

      <div className="section-heading">
        <div>
          <p className="eyebrow">{total} вариантов</p>
          <h2>Доступные комнаты</h2>
        </div>
        <span className="soft-badge">{filters.from && filters.to ? `${filters.from.replace('T', ' ')} → ${filters.to.replace('T', ' ')}` : 'Без фильтра времени'}</span>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : rooms.length === 0 ? (
        <EmptyState title="Комнаты не найдены" text="Попробуйте изменить вместимость или временной интервал." />
      ) : (
        <div className="rooms-grid">
          {rooms.map((room, index) => (
            <RoomCard
              key={room.id}
              room={room}
              accent={index % 4}
              isAdmin={user.role === 'ADMIN'}
              onBook={() => onBook(room)}
              onEdit={() => onEdit(room)}
              onDelete={() => onDelete(room.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RoomCard({
  room,
  accent,
  isAdmin,
  onBook,
  onEdit,
  onDelete,
}: {
  room: RoomResponse;
  accent: number;
  isAdmin: boolean;
  onBook: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="room-card">
      <div className={cls('room-cover', `accent-${accent}`)}>
        <span>{room.capacity} мест</span>
        <div className="room-cover-lines">
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="room-body">
        <div className="room-title-row">
          <h3>{room.name}</h3>
          <span className={cls('status-dot', room.active && 'active')} />
        </div>
        <p className="room-location">{room.location}</p>
        <p className="room-description">{room.description}</p>
        <div className="room-meta">
          <span>{formatMoney(room.pricePerHour)} / час</span>
          <span>до {room.capacity} человек</span>
        </div>
        <div className="room-actions">
          <button className="primary-button small" onClick={onBook}>Забронировать</button>
          {isAdmin && (
            <>
              <button className="secondary-button small" onClick={onEdit}>Изменить</button>
              <button className="danger-button small" onClick={onDelete}>Удалить</button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function BookingsView({
  bookings,
  loading,
  onCancel,
}: {
  bookings: BookingResponse[];
  loading: boolean;
  onCancel: (id: string) => void;
}) {
  const active = bookings.filter((booking) => booking.status === 'CONFIRMED');
  const cancelled = bookings.filter((booking) => booking.status === 'CANCELLED');

  return (
    <section className="section-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Личный календарь</p>
          <h2>Мои бронирования</h2>
        </div>
        <span className="soft-badge">Активных: {active.length}</span>
      </div>

      {loading ? <SkeletonList /> : bookings.length === 0 ? <EmptyState title="Бронирований пока нет" text="Выберите комнату и создайте первую бронь." /> : null}

      {!loading && active.length > 0 && (
        <div className="booking-list">
          {active.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onCancel={() => onCancel(booking.id)} />
          ))}
        </div>
      )}

      {!loading && cancelled.length > 0 && (
        <div className="muted-section">
          <h3>Отменённые</h3>
          <div className="booking-list compact">
            {cancelled.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function BookingCard({ booking, onCancel }: { booking: BookingResponse; onCancel?: () => void }) {
  const hours = hoursBetween(booking.startsAt, booking.endsAt);

  return (
    <article className="booking-card">
      <div className="date-tile">
        <strong>{new Date(booking.startsAt).toLocaleDateString('ru-RU', { day: '2-digit' })}</strong>
        <span>{new Date(booking.startsAt).toLocaleDateString('ru-RU', { month: 'short' })}</span>
      </div>
      <div className="booking-main">
        <div className="booking-title-row">
          <h3>{booking.room.name}</h3>
          <span className={cls('booking-status', booking.status === 'CONFIRMED' ? 'active' : 'cancelled')}>
            {booking.status === 'CONFIRMED' ? 'Подтверждено' : 'Отменено'}
          </span>
        </div>
        <p>{formatDateRange(booking.startsAt, booking.endsAt)}</p>
        <div className="booking-meta">
          <span>{booking.room.location}</span>
          <span>{booking.room.capacity} мест</span>
          <span>{hours.toFixed(hours % 1 === 0 ? 0 : 1)} ч</span>
        </div>
        <p className="booking-purpose">{booking.purpose}</p>
      </div>
      {booking.status === 'CONFIRMED' && onCancel && (
        <button className="danger-button small" onClick={onCancel}>Отменить</button>
      )}
    </article>
  );
}

interface AdminViewProps {
  rooms: RoomResponse[];
  users: UserResponse[];
  bookings: BookingResponse[];
  loading: boolean;
  status: BookingStatus | '';
  setStatus: (status: BookingStatus | '') => void;
  onReload: () => void;
  onNewRoom: () => void;
  onEditRoom: (room: RoomResponse) => void;
  onDeleteRoom: (id: string) => void;
}

function AdminView({
  rooms,
  users,
  bookings,
  loading,
  status,
  setStatus,
  onReload,
  onNewRoom,
  onEditRoom,
  onDeleteRoom,
}: AdminViewProps) {
  return (
    <section className="section-stack">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Панель администратора</p>
          <h2>Управление сервисом</h2>
        </div>
        <div className="toolbar-actions">
          <select value={status} onChange={(event) => setStatus(event.target.value as BookingStatus | '')}>
            <option value="">Все статусы</option>
            <option value="CONFIRMED">Активные</option>
            <option value="CANCELLED">Отменённые</option>
          </select>
          <button className="secondary-button" onClick={onReload} disabled={loading}>Обновить</button>
          <button className="primary-button" onClick={onNewRoom}>+ Комната</button>
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-card">
          <div className="card-header-row">
            <h3>Комнаты</h3>
            <span>{rooms.length}</span>
          </div>
          <div className="mini-list">
            {rooms.map((room) => (
              <div className="mini-row" key={room.id}>
                <div>
                  <strong>{room.name}</strong>
                  <span>{room.capacity} мест · {formatMoney(room.pricePerHour)}</span>
                </div>
                <div className="row-actions">
                  <button onClick={() => onEditRoom(room)}>Edit</button>
                  <button onClick={() => onDeleteRoom(room.id)}>Off</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <div className="card-header-row">
            <h3>Пользователи</h3>
            <span>{users.length}</span>
          </div>
          <div className="mini-list">
            {users.map((item) => (
              <div className="mini-row" key={item.id}>
                <div className="user-mini">
                  <div className="avatar small-avatar">{initials(item.fullName)}</div>
                  <div>
                    <strong>{item.fullName}</strong>
                    <span>{item.email}</span>
                  </div>
                </div>
                <span className="soft-badge tiny">{item.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-card wide">
        <div className="card-header-row">
          <h3>Все бронирования</h3>
          <span>{loading ? '...' : bookings.length}</span>
        </div>
        {bookings.length === 0 ? (
          <EmptyState title="Нет бронирований" text="Здесь появятся заявки пользователей." compact />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Комната</th>
                  <th>Пользователь</th>
                  <th>Время</th>
                  <th>Статус</th>
                  <th>Цель</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.room.name}</td>
                    <td>{booking.user.fullName}</td>
                    <td>{formatDateTime(booking.startsAt)}</td>
                    <td><span className={cls('booking-status', booking.status === 'CONFIRMED' ? 'active' : 'cancelled')}>{booking.status === 'CONFIRMED' ? 'Подтверждено' : 'Отменено'}</span></td>
                    <td>{booking.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function ProfileView({ user, apiBase, onLogout }: { user: UserResponse; apiBase: string; onLogout: () => void }) {
  return (
    <section className="profile-layout">
      <div className="profile-card">
        <div className="avatar profile-avatar">{initials(user.fullName)}</div>
        <h2>{user.fullName}</h2>
        <p>{user.email}</p>
        <span className="soft-badge">{user.role}</span>
        <button className="danger-button" onClick={onLogout}>Выйти из аккаунта</button>
      </div>

      <div className="admin-card profile-info">
        <h3>Подключение</h3>
        <div className="info-row"><span>Backend Данные</span><code>{apiBase}</code></div>
        <div className="info-row"><span>Аккаунт создан</span><strong>{formatDateTime(user.createdAt)}</strong></div>
        <div className="info-row"><span>Статус</span><strong>{user.enabled ? 'Активен' : 'Отключён'}</strong></div>
      </div>
    </section>
  );
}

function BookingModal({
  draft,
  loading,
  onChange,
  onSubmit,
  onClose,
}: {
  draft: BookingDraft;
  loading: boolean;
  onChange: (draft: BookingDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const cost = Number(draft.room.pricePerHour) * hoursBetween(toApiDateTime(draft.startsAt) ?? '', toApiDateTime(draft.endsAt) ?? '');

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal-card" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Новое бронирование</p>
            <h2>{draft.room.name}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>×</button>
        </div>

        <div className="form-grid two">
          <label>
            Начало
            <input type="datetime-local" value={draft.startsAt} onChange={(event) => onChange({ ...draft, startsAt: event.target.value })} required />
          </label>
          <label>
            Окончание
            <input type="datetime-local" value={draft.endsAt} onChange={(event) => onChange({ ...draft, endsAt: event.target.value })} required />
          </label>
        </div>

        <label>
          Цель встречи
          <textarea value={draft.purpose} onChange={(event) => onChange({ ...draft, purpose: event.target.value })} required maxLength={500} />
        </label>

        <div className="modal-summary">
          <span>{draft.room.location}</span>
          <strong>≈ {formatMoney(Number.isFinite(cost) ? cost : 0)}</strong>
        </div>

        <button className="primary-button full" disabled={loading}>{loading ? 'Создаём...' : 'Подтвердить бронь'}</button>
      </form>
    </div>
  );
}

function RoomModal({
  form,
  setForm,
  loading,
  onSubmit,
  onClose,
}: {
  form: RoomFormState;
  setForm: (form: RoomFormState) => void;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal-card wide-modal" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">{form.id ? 'Редактирование' : 'Создание'}</p>
            <h2>{form.id ? 'Комната' : 'Новая переговорная'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>×</button>
        </div>

        <div className="form-grid two">
          <label>
            Название
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={120} />
          </label>
          <label>
            Локация
            <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} required maxLength={255} />
          </label>
          <label>
            Вместимость
            <input type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} required />
          </label>
          <label>
            Цена за час
            <input type="number" min="0" step="50" value={form.pricePerHour} onChange={(event) => setForm({ ...form, pricePerHour: event.target.value })} required />
          </label>
        </div>

        <label>
          Описание
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required maxLength={2000} />
        </label>

        {form.id && (
          <label className="checkbox-row">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
            Активная комната
          </label>
        )}

        <button className="primary-button full" disabled={loading}>{loading ? 'Сохраняем...' : 'Сохранить'}</button>
      </form>
    </div>
  );
}

function ToastView({ toast }: { toast: NonNullable<Toast> }) {
  return <div className={cls('toast', toast.type)}>{toast.message}</div>;
}

function EmptyState({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) {
  return (
    <div className={cls('empty-state', compact && 'compact')}>
      <div>⌁</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="rooms-grid">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="skeleton-card" key={index} />
      ))}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="booking-list">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="skeleton-row" key={index} />
      ))}
    </div>
  );
}

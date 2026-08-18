import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BarChart3,
  BellRing,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  History,
  ImagePlus,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Menu,
  MessageCircle,
  Pause,
  PencilLine,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Target,
  TimerReset,
  Trash2,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import {
  EXAM_DATE,
  START_DATE,
  SUBJECTS,
  TOTAL_DAYS,
  type JournalDay,
  type StudyData,
  type StudySettings,
  type Subject,
  type Task,
  emptyJournalDay,
  todayKey,
  useStudyData,
} from '@/hooks/use-study-data';

type StudyContextValue = ReturnType<typeof useStudyData> & { notify: (message: string) => void };
const StudyContext = createContext<StudyContextValue | null>(null);

const subjectTone: Record<Subject, string> = {
  Hóa: 'coral',
  Toán: 'jade',
  Anh: 'gold',
  Tin: 'ink',
  KHTN: 'plum',
  Khác: 'clay',
};

const navItems = [
  { href: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/tasks', label: 'Nhiệm vụ', icon: ListChecks },
  { href: '/journal', label: 'Nhật ký', icon: PencilLine },
  { href: '/pomodoro', label: 'Pomodoro', icon: TimerReset },
  { href: '/assistant', label: 'Trợ lý', icon: MessageCircle },
  { href: '/history', label: 'Lịch sử học', icon: History },
  { href: '/settings', label: 'Cài đặt', icon: Settings2 },
];

function useStudy() {
  const context = useContext(StudyContext);
  if (!context) throw new Error('Study context is unavailable');
  return context;
}

function parseDate(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function keyFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayNumber(date = new Date()) {
  const start = parseDate(START_DATE);
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.min(TOTAL_DAYS, Math.max(1, Math.floor((normalized.getTime() - start.getTime()) / 86400000) + 1));
}

function remainingDays(date = new Date()) {
  const exam = parseDate(EXAM_DATE);
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(0, Math.ceil((exam.getTime() - normalized.getTime()) / 86400000));
}

function phaseForDay(day: number) {
  if (day <= 60) return { label: 'Nền tảng', detail: 'Lấp lỗ hổng kiến thức', tone: 'jade' };
  if (day <= 150) return { label: 'Tăng tốc', detail: 'Học chuyên đề có chủ đích', tone: 'gold' };
  if (day <= 230) return { label: 'Nâng cao', detail: 'Bài khó và đề tổng hợp', tone: 'plum' };
  if (day <= 280) return { label: 'Nước rút', detail: 'Luyện đề theo thời gian', tone: 'coral' };
  return { label: '20 ngày cuối', detail: 'Tổng ôn và giữ nhịp', tone: 'ink' };
}

function formatDate(date: Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('vi-VN', options || { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(date);
}

function levelInfo(xp: number) {
  return { level: Math.floor(xp / 100) + 1, current: xp % 100, needed: 100 };
}

function historyFor(data: StudyData, date = todayKey()): JournalDay {
  return { ...emptyJournalDay(), ...(data.history[date] || {}) };
}

function getLastDates(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (count - index - 1));
    return keyFromDate(date);
  });
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data } = useStudy();
  const today = new Date();
  const level = levelInfo(data.xp);
  const nav = (mobile = false) => (
    <nav className={mobile ? 'mobile-nav fixed inset-x-3 bottom-3 z-40 hidden grid-cols-5 gap-1 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.96)] p-2 shadow-[0_12px_35px_rgba(53,68,62,.17)] backdrop-blur' : 'desktop-nav flex items-center gap-1'}>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = location === href || (href !== '/' && location.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            data-testid={`link-nav-${label}`}
            className={`nav-link flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${mobile ? 'min-w-0 flex-col gap-1 px-1 py-2 text-[.62rem]' : ''} ${active ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.7)] hover:text-[hsl(var(--foreground))]'}`}
          >
            <Icon size={mobile ? 17 : 16} strokeWidth={active ? 2.5 : 2} />
            <span className={mobile ? 'truncate' : ''}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="app-shell">
      <div className="grain" />
      <header className="topbar page-wrap relative z-30 flex flex-wrap items-center justify-between gap-4 py-7">
        <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
          <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_7px_16px_rgba(46,101,93,.2)]">
            <BookOpen size={19} strokeWidth={2.2} />
          </div>
          <div>
            <div className="serif text-[1.28rem] font-semibold leading-none tracking-[-.03em]">300 Ngày</div>
            <div className="mt-1 text-[.62rem] font-bold uppercase tracking-[.19em] text-[hsl(var(--muted-foreground))]">bạn học cùng mình</div>
          </div>
        </Link>
        <div className="hidden items-center gap-5 lg:flex">{nav()}</div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full bg-[hsl(var(--secondary)/.72)] px-3 py-2 text-xs font-bold text-[hsl(var(--primary))] sm:flex" data-testid="text-xp-level">
            <Trophy size={14} /> Cấp {level.level} · {data.xp} XP
          </div>
          <div className="hidden items-center gap-2 text-right text-xs text-[hsl(var(--muted-foreground))] sm:flex">
            <CalendarDays size={15} className="text-[hsl(var(--accent))]" />
            <span className="capitalize" data-testid="text-today">{formatDate(today)}</span>
          </div>
          <button className="icon-button lg:hidden" onClick={() => setMobileOpen((value) => !value)} aria-label="Mở điều hướng" data-testid="button-mobile-menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileOpen && <div className="absolute right-0 top-20 z-40 w-64 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-[var(--shadow-soft)] lg:hidden">{nav()}</div>}
      </header>
      <main className="page-wrap pb-28 lg:pb-14">{children}</main>
      {nav(true)}
    </div>
  );
}

function LoadingScreen() {
  return <div className="app-shell"><main className="page-wrap py-8"><div className="h-8 w-40 animate-pulse rounded-lg bg-[hsl(var(--muted))]" /><div className="mt-12 h-72 animate-pulse rounded-[1.65rem] bg-[hsl(var(--muted))]" /><div className="mt-5 grid grid-cols-2 gap-4"><div className="h-28 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" /><div className="h-28 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" /></div></main></div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="fade-rise mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="serif mt-2 text-[2.15rem] font-semibold leading-tight tracking-[-.055em] sm:text-[2.7rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ icon, label, value, unit, detail, accent, testId }: { icon: ReactNode; label: string; value: string; unit?: string; detail: string; accent: string; testId: string }) {
  return <div className="fade-rise card-surface rounded-[1.2rem] p-5" data-testid={testId}>
    <div className={`stat-icon stat-${accent}`}>{icon}</div>
    <div className="mt-4 flex items-baseline gap-1"><span className="text-2xl font-semibold tracking-[-.06em]">{value}</span>{unit && <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{unit}</span>}</div>
    <div className="mt-1 text-[.7rem] text-[hsl(var(--muted-foreground))]">{label} · {detail}</div>
  </div>;
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className={`task-row flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 ${task.done ? 'completed' : ''}`} data-testid={`task-row-${task.id}`}>
      <button onClick={onToggle} aria-label={task.done ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'} data-testid={`button-toggle-task-${task.id}`} className={`task-check flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${task.done ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-transparent hover:border-[hsl(var(--primary))]'}`}>
        <Check size={15} strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="task-name truncate text-sm font-semibold">{task.name}</div>
        <div className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[.63rem] font-bold uppercase tracking-[.08em] subject-${subjectTone[task.subject]}`}>{task.subject} · {task.xp} XP</div>
      </div>
      <button className="icon-button h-8 w-8" onClick={onDelete} aria-label={`Xóa ${task.name}`} data-testid={`button-delete-task-${task.id}`}><Trash2 size={15} /></button>
    </div>
  );
}

function TaskFormModal({ onClose }: { onClose: () => void }) {
  const { addTask } = useStudy();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState<Subject>('Hóa');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    addTask(name, subject);
    onClose();
  };
  return <Modal title="Một việc mới" eyebrow="thêm vào bàn học" onClose={onClose}>
    <form className="mt-7 space-y-5" onSubmit={submit}>
      <label className="block"><span className="mb-2 block text-xs font-bold text-[hsl(var(--muted-foreground))]">Tên nhiệm vụ</span><input autoFocus required className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Làm đề Hóa số 5" data-testid="input-task-name" /></label>
      <label className="block"><span className="mb-2 block text-xs font-bold text-[hsl(var(--muted-foreground))]">Môn học</span><select className="field" value={subject} onChange={(event) => setSubject(event.target.value as Subject)} data-testid="select-task-subject">{SUBJECTS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <div className="flex justify-end gap-2 pt-2"><button type="button" className="secondary-button" onClick={onClose} data-testid="button-cancel-task">Để sau</button><button type="submit" className="primary-button" data-testid="button-submit-task"><Plus size={16} /> Thêm nhiệm vụ</button></div>
    </form>
  </Modal>;
}

function MinutesModal({ onClose }: { onClose: () => void }) {
  const { logMinutes } = useStudy();
  const [minutes, setMinutes] = useState('30');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(minutes);
    if (amount > 0) {
      logMinutes(amount);
      onClose();
    }
  };
  return <Modal title="Bạn đã học bao lâu?" eyebrow="ghi nhận hôm nay" onClose={onClose}>
    <form className="mt-7" onSubmit={submit}>
      <label className="block"><span className="mb-2 block text-xs font-bold text-[hsl(var(--muted-foreground))]">Số phút đã học</span><div className="relative"><input autoFocus type="number" min="1" max="1440" className="field pr-20 text-2xl font-semibold" value={minutes} onChange={(event) => setMinutes(event.target.value)} data-testid="input-study-minutes" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">phút</span></div></label>
      <div className="mt-3 flex gap-2">{['25', '45', '60', '120'].map((value) => <button type="button" key={value} onClick={() => setMinutes(value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${minutes === value ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`} data-testid={`button-minute-preset-${value}`}>{value} phút</button>)}</div>
      <p className="mt-5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Mỗi 3 phút học được tính 1 XP, tối thiểu 1 XP cho mỗi lần ghi.</p>
      <div className="mt-6 flex justify-end gap-2"><button type="button" className="secondary-button" onClick={onClose} data-testid="button-cancel-minutes">Để sau</button><button type="submit" className="primary-button" data-testid="button-submit-minutes"><Check size={16} /> Lưu buổi học</button></div>
    </form>
  </Modal>;
}

function Modal({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop fixed inset-0 z-40 flex items-end justify-center p-3 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-card w-full max-w-md rounded-[1.5rem] bg-[hsl(var(--card))] p-6 shadow-[0_20px_60px_rgba(23,43,42,.2)] sm:p-8" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="flex items-start justify-between gap-4"><div><div className="eyebrow">{eyebrow}</div><h2 id="modal-title" className="serif mt-2 text-2xl font-semibold tracking-[-.04em]">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Đóng" data-testid="button-close-modal"><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}

function TaskPanel({ compact = false }: { compact?: boolean }) {
  const { data, toggleTask, deleteTask } = useStudy();
  const [activeSubject, setActiveSubject] = useState<Subject | 'Tất cả'>('Tất cả');
  const [taskModal, setTaskModal] = useState(false);
  const filtered = activeSubject === 'Tất cả' ? data.tasks : data.tasks.filter((task) => task.subject === activeSubject);
  const completed = data.tasks.filter((task) => task.done).length;
  const progress = data.tasks.length ? Math.round(completed / data.tasks.length * 100) : 0;
  return <div className="card-surface rounded-[1.65rem] p-6 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="eyebrow">bàn học hôm nay</div><h2 className="serif mt-2 text-[1.8rem] font-semibold tracking-[-.045em]">{compact ? 'Việc đang làm' : 'Việc cần làm'}</h2></div><button className="primary-button" onClick={() => setTaskModal(true)} data-testid="button-add-task"><Plus size={17} /> Thêm việc</button></div>
    <div className="mt-6 flex gap-1.5 overflow-x-auto pb-1">{['Tất cả', ...SUBJECTS].map((subject) => <button key={subject} onClick={() => setActiveSubject(subject as Subject | 'Tất cả')} data-testid={`filter-subject-${subject}`} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${activeSubject === subject ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted)/.7)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'}`}>{subject}</button>)}</div>
    <div className="mt-5 space-y-2">{filtered.length === 0 ? <div className="flex flex-col items-center rounded-2xl border border-dashed border-[hsl(var(--border))] px-5 py-12 text-center"><div className="rounded-full bg-[hsl(var(--secondary))] p-3 text-[hsl(var(--primary))]"><ListChecks size={22} /></div><h3 className="serif mt-4 text-lg font-semibold">Bàn học đang trống</h3><p className="mt-1 max-w-[240px] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Thêm một việc nhỏ để bắt đầu buổi học của bạn.</p><button className="secondary-button mt-5" onClick={() => setTaskModal(true)} data-testid="button-empty-add-task"><Plus size={15} /> Thêm nhiệm vụ</button></div> : filtered.map((task) => <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => { if (window.confirm(`Xóa nhiệm vụ “${task.name}”?`)) deleteTask(task.id); }} />)}</div>
    {data.tasks.length > 0 && <div className="mt-5 flex items-center gap-3 border-t border-[hsl(var(--border))] pt-5 text-xs text-[hsl(var(--muted-foreground))]"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--accent))] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div><span data-testid="text-task-progress">{completed}/{data.tasks.length} hoàn thành</span></div>}
    {taskModal && <TaskFormModal onClose={() => setTaskModal(false)} />}
  </div>;
}

function Dashboard() {
  const { data, logMinutes, notify } = useStudy();
  const [modal, setModal] = useState<'minutes' | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);
  const currentDay = dayNumber(now);
  const phase = phaseForDay(currentDay);
  const today = historyFor(data);
  const completed = data.tasks.filter((task) => task.done).length;
  const taskProgress = data.tasks.length ? Math.round(completed / data.tasks.length * 100) : 0;
  const timeProgress = Math.round(currentDay / TOTAL_DAYS * 1000) / 10;
  const level = levelInfo(data.xp);
  return <div className="pt-3">
    <section className="hero-grid grid grid-cols-[1.15fr_.85fr] gap-5">
      <div className="fade-rise relative overflow-hidden rounded-[1.65rem] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-soft)] sm:p-10">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-[hsl(var(--primary-foreground)/.1)]" /><div className="absolute -right-1 top-4 h-36 w-36 rounded-full border border-[hsl(var(--primary-foreground)/.1)]" />
        <div className="relative"><div className="eyebrow text-[hsl(var(--primary-foreground)/.65)]">điểm hẹn phía trước</div><div className="mt-5 flex items-end gap-3"><span className="serif text-[clamp(5rem,13vw,9rem)] font-semibold leading-[.76] tracking-[-.085em]" data-testid="countdown-days">{remainingDays(now)}</span><span className="mb-1 text-lg font-medium text-[hsl(var(--primary-foreground)/.75)]">ngày</span></div><div className="mt-7 flex items-center gap-2 text-sm text-[hsl(var(--primary-foreground)/.76)]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /> Kỳ thi ngày <strong className="font-semibold text-[hsl(var(--primary-foreground))]">14/06/2027</strong></div><p className="mt-8 max-w-[350px] text-[.93rem] leading-relaxed text-[hsl(var(--primary-foreground)/.72)]">Không cần chạy thật nhanh. Chỉ cần hôm nay có mặt và làm một việc nhỏ cho tương lai của mình.</p></div>
      </div>
      <div className="fade-rise delay-1 card-surface flex min-h-[265px] flex-col justify-between rounded-[1.65rem] p-7 sm:p-8">
        <div className="flex items-start justify-between"><div><div className="eyebrow">hôm nay · ngày {currentDay}/{TOTAL_DAYS}</div><h1 className="serif mt-3 max-w-[250px] text-[2rem] font-semibold leading-[1.08] tracking-[-.045em]">Mình học gì một chút nhé?</h1></div><div className="rounded-full bg-[hsl(var(--secondary))] p-3 text-[hsl(var(--accent))]"><Target size={20} /></div></div>
        <div className="mt-7 flex items-center justify-between gap-4"><div><div className="text-3xl font-semibold tracking-[-.06em]" data-testid="text-today-minutes">{today.minutes}<span className="ml-1 text-sm font-medium tracking-normal text-[hsl(var(--muted-foreground))]">phút</span></div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">trong mục tiêu {data.settings.dailyGoal} phút</div></div><button className="primary-button" onClick={() => setModal('minutes')} data-testid="button-log-minutes"><Plus size={16} /> Ghi thời gian</button></div>
      </div>
    </section>
    <section className="stats-grid mt-5 grid grid-cols-4 gap-4">
      <StatCard icon={<ListChecks size={18} />} label="Nhiệm vụ" value={`${taskProgress}%`} detail={`${completed}/${data.tasks.length} việc xong`} accent="jade" testId="stat-progress" />
      <StatCard icon={<Clock3 size={18} />} label="Tổng thời gian" value={`${data.studyMinutes}`} unit="phút" detail="tích lũy từ đầu" accent="gold" testId="stat-minutes" />
      <StatCard icon={<Flame size={18} />} label="Chuỗi ngày" value={`${data.streak}`} unit="ngày" detail={data.streak ? 'đang được giữ nhịp' : 'bắt đầu từ hôm nay'} accent="coral" testId="stat-streak" />
      <div className="fade-rise card-surface rounded-[1.2rem] p-5" data-testid="stat-xp"><div className="flex items-center justify-between"><div className="eyebrow">tiến trình XP</div><Trophy size={18} className="text-[hsl(var(--primary))]" /></div><div className="mt-4 flex items-baseline gap-1"><span className="text-2xl font-semibold tracking-[-.06em]">Cấp {level.level}</span><span className="text-xs text-[hsl(var(--muted-foreground))]">{level.current}/{level.needed} XP</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-500" style={{ width: `${level.current}%` }} /></div></div>
    </section>
    <section className="mt-8 grid grid-cols-[1.15fr_.85fr] gap-5 lg:mt-10 content-grid">
      <TaskPanel />
      <div className="space-y-5">
        <div className="fade-rise delay-3 card-surface rounded-[1.65rem] p-6 sm:p-8"><div className="flex items-center justify-between"><div><div className="eyebrow">giai đoạn hiện tại</div><h2 className="serif mt-2 text-[1.65rem] font-semibold tracking-[-.04em]">{phase.label}</h2></div><div className={`stat-icon stat-${phase.tone}`}><BarChart3 size={18} /></div></div><p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{phase.detail}</p><div className="mt-6 flex items-end justify-between"><div><div className="mono text-2xl font-bold">{timeProgress}%</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">tiến trình thời gian</div></div><div className="h-16 w-16 rounded-full p-1" style={{ background: `conic-gradient(hsl(var(--primary)) ${timeProgress}%, hsl(var(--muted)) 0)` }}><div className="flex h-full w-full items-center justify-center rounded-full bg-[hsl(var(--card))] text-[.65rem] font-bold">{currentDay}</div></div></div></div>
        <div className="fade-rise delay-4 rounded-[1.65rem] bg-[hsl(var(--secondary))] p-6 sm:p-8"><div className="flex items-center justify-between"><div className="eyebrow text-[hsl(var(--foreground)/.65)]">nhịp hôm nay</div><Flame size={18} className="text-[hsl(var(--accent))]" /></div><div className="mt-5 flex items-baseline gap-2"><span className="serif text-5xl font-semibold tracking-[-.08em]">{today.tasks}</span><span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">nhiệm vụ hoàn thành</span></div><p className="mt-3 text-sm leading-relaxed text-[hsl(var(--foreground)/.67)]">{today.minutes >= data.settings.dailyGoal ? 'Mục tiêu thời gian hôm nay đã được chạm tới.' : `Còn ${Math.max(0, data.settings.dailyGoal - today.minutes)} phút để đủ mục tiêu hôm nay.`}</p><button className="secondary-button mt-6 border-transparent bg-[hsl(var(--card)/.72)]" onClick={() => { setModal('minutes'); notify('Mỗi phút hôm nay đều có ý nghĩa.'); }} data-testid="button-streak-log"><Clock3 size={15} /> Ghi buổi học</button></div>
      </div>
    </section>
    <footer className="mt-12 flex flex-col justify-between gap-2 border-t border-[hsl(var(--border))] pt-5 text-[.68rem] font-medium text-[hsl(var(--muted-foreground))] sm:flex-row"><span>300 Ngày · một ngày một bước</span><span>Khởi hành 18/08/2026 · ngày thi 14/06/2027</span></footer>
    {modal === 'minutes' && <MinutesModal onClose={() => setModal(null)} />}
  </div>;
}

function TasksPage() {
  const { data, toggleTask, deleteTask, notify } = useStudy();
  const [modal, setModal] = useState(false);
  const [activeSubject, setActiveSubject] = useState<Subject | 'Tất cả'>('Tất cả');
  const filtered = activeSubject === 'Tất cả' ? data.tasks : data.tasks.filter((task) => task.subject === activeSubject);
  const completed = data.tasks.filter((task) => task.done).length;
  return <div className="pt-8"><PageHeading eyebrow="bàn học" title="Nhiệm vụ hôm nay" description="Chia mục tiêu lớn thành những việc đủ rõ để bắt đầu ngay." action={<button className="primary-button" onClick={() => setModal(true)} data-testid="button-add-task-page"><Plus size={17} /> Thêm nhiệm vụ</button>} /><div className="grid gap-5 lg:grid-cols-[1fr_320px]"><div className="card-surface rounded-[1.65rem] p-5 sm:p-8"><div className="flex gap-1.5 overflow-x-auto pb-1">{['Tất cả', ...SUBJECTS].map((subject) => <button key={subject} onClick={() => setActiveSubject(subject as Subject | 'Tất cả')} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${activeSubject === subject ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted)/.7)] text-[hsl(var(--muted-foreground))]'}`} data-testid={`page-filter-${subject}`}>{subject}</button>)}</div><div className="mt-5 space-y-2">{filtered.length ? filtered.map((task) => <TaskRow key={task.id} task={task} onToggle={() => { toggleTask(task.id); notify(task.done ? 'Đã đưa nhiệm vụ về danh sách cần làm.' : `Hoàn thành nhiệm vụ · +${task.xp} XP.`); }} onDelete={() => { if (window.confirm(`Xóa nhiệm vụ “${task.name}”?`)) { deleteTask(task.id); notify('Đã xóa nhiệm vụ.'); } }} />) : <EmptyState icon={<ListChecks size={24} />} title="Chưa có nhiệm vụ ở đây" description="Thử chọn môn khác hoặc thêm một nhiệm vụ mới." onAction={() => setModal(true)} />}</div></div><div className="space-y-5"><div className="card-surface rounded-[1.65rem] p-6"><div className="eyebrow">tiến độ danh sách</div><div className="mt-4 flex items-end gap-2"><span className="serif text-5xl font-semibold tracking-[-.08em]">{completed}</span><span className="mb-1 text-sm text-[hsl(var(--muted-foreground))]">/ {data.tasks.length} việc</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${data.tasks.length ? completed / data.tasks.length * 100 : 0}%` }} /></div><p className="mt-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">Mỗi lần hoàn thành nhiệm vụ sẽ cộng XP một lần.</p></div><div className="rounded-[1.65rem] bg-[hsl(var(--secondary))] p-6"><Target size={22} className="text-[hsl(var(--accent))]" /><h2 className="serif mt-4 text-xl font-semibold">Giữ việc nhỏ, giữ nhịp lớn.</h2><p className="mt-2 text-sm leading-relaxed text-[hsl(var(--foreground)/.67)]">Không cần lấp đầy lịch. Chỉ cần một việc tiếp theo đủ rõ.</p></div></div></div>{modal && <TaskFormModal onClose={() => setModal(false)} />}</div>;
}

function JournalPage() {
  const { data, saveJournal, addJournalImages, removeJournalImage, notify } = useStudy();
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [calendarMonth, setCalendarMonth] = useState(() => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const [note, setNote] = useState('');
  const [viewImage, setViewImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const day = historyFor(data, selectedDate);
  useEffect(() => {
    setNote(historyFor(data, selectedDate).note);
    const date = parseDate(selectedDate);
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [data, selectedDate]);
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => keyFromDate(new Date(year, month, index + 1)))];
  }, [calendarMonth]);
  const selectDate = (key: string) => setSelectedDate(key);
  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const images = await Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    if (images.length) {
      addJournalImages(selectedDate, images);
      notify(`${images.length} ảnh đã được lưu trong nhật ký.`);
    }
    event.target.value = '';
  };
  const changeMonth = (amount: number) => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  useEffect(() => {
    const textarea = document.querySelector<HTMLTextAreaElement>('[data-testid="textarea-journal-note"]');
    if (textarea) textarea.placeholder = ['Hôm nay mình đã học gì?', 'Chỗ nào chưa hiểu?', 'Ngày mai muốn bắt đầu từ đâu?'].join('\n');
  }, [selectedDate]);
  return <div className="pt-8"><PageHeading eyebrow="nhìn lại để đi tiếp" title="Nhật ký học tập" description="Một nơi để ghi lại điều đã hiểu, điều còn vướng và những dấu mốc rất riêng." action={<button className="primary-button" onClick={() => inputRef.current?.click()} data-testid="button-add-journal-image"><ImagePlus size={17} /> Thêm ảnh</button>} /><div className="journal-grid grid grid-cols-[330px_1fr] gap-5"><section className="card-surface rounded-[1.65rem] p-5 sm:p-6"><div className="flex items-center justify-between"><button className="icon-button" onClick={() => changeMonth(-1)} aria-label="Tháng trước" data-testid="button-previous-month"><ChevronLeft size={18} /></button><h2 className="serif text-lg font-semibold capitalize">{formatMonth(calendarMonth)}</h2><button className="icon-button" onClick={() => changeMonth(1)} aria-label="Tháng sau" data-testid="button-next-month"><ChevronRight size={18} /></button></div><div className="mt-5 grid grid-cols-7 gap-1 text-center text-[.64rem] font-bold uppercase text-[hsl(var(--muted-foreground))]">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => <span key={label}>{label}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1">{calendarDays.map((key, index) => key ? <button key={key} className={`calendar-day aspect-square rounded-lg text-xs font-semibold ${selectedDate === key ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : key === todayKey() ? 'border border-[hsl(var(--accent))] text-[hsl(var(--accent))]' : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'}`} onClick={() => selectDate(key)} data-testid={`calendar-day-${key}`}>{parseDate(key).getDate()}{data.history[key]?.note || data.history[key]?.images?.length ? <span className="mx-auto mt-0.5 block h-1 w-1 rounded-full bg-[hsl(var(--accent))]" /> : null}</button> : <span key={`blank-${index}`} />)}</div><div className="mt-6 border-t border-[hsl(var(--border))] pt-5"><div className="eyebrow">chọn nhanh</div><div className="mt-3 flex flex-wrap gap-2"><button className="secondary-button text-xs" onClick={() => selectDate(todayKey())} data-testid="button-journal-today">Hôm nay</button><input type="date" className="field max-w-[150px] py-2 text-xs" value={selectedDate} onChange={(event) => selectDate(event.target.value)} aria-label="Chọn ngày nhật ký" data-testid="input-journal-date" /></div></div></section><section className="card-surface rounded-[1.65rem] p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="eyebrow">nhật ký ngày {dayNumber(parseDate(selectedDate))}</div><h2 className="serif mt-2 text-2xl font-semibold capitalize tracking-[-.04em]">{formatDate(parseDate(selectedDate))}</h2><div className="mt-2 flex gap-3 text-xs text-[hsl(var(--muted-foreground))]"><span>{day.minutes} phút học</span><span>{day.tasks} nhiệm vụ hoàn thành</span></div></div><button className="secondary-button" onClick={() => { saveJournal(selectedDate, note); notify('Nhật ký đã được lưu.'); }} data-testid="button-save-journal"><Check size={15} /> Lưu nhật ký</button></div><label className="mt-7 block"><span className="mb-2 block text-xs font-bold text-[hsl(var(--muted-foreground))]">Ghi chú của mình</span><textarea className="field min-h-[190px] resize-y leading-relaxed" value={note} onChange={(event) => setNote(event.target.value)} placeholder={'Hôm nay mình đã học gì?\\nChỗ nào chưa hiểu?\\nNgày mai muốn bắt đầu từ đâu?'} data-testid="textarea-journal-note" /></label><div className="mt-7 border-t border-[hsl(var(--border))] pt-6"><div className="flex items-center justify-between gap-3"><div><div className="eyebrow">góc hình ảnh</div><h3 className="serif mt-1 text-xl font-semibold">Dấu mốc nhìn thấy được</h3></div><button className="secondary-button" onClick={() => inputRef.current?.click()} data-testid="button-upload-journal-image"><Upload size={15} /> Chọn ảnh</button></div><input ref={inputRef} className="hidden" type="file" accept="image/*" multiple onChange={handleFiles} data-testid="input-journal-images" />{day.images.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{day.images.map((src, index) => <div className="group relative" key={`${src.slice(0, 30)}-${index}`}><button className="photo-tile block w-full" onClick={() => setViewImage(src)} aria-label={`Xem ảnh ${index + 1}`} data-testid={`button-view-journal-image-${index}`}><img src={src} alt={`Ảnh học tập ngày ${selectedDate}`} /></button><button className="icon-button absolute right-2 top-2 h-8 w-8 bg-[hsl(var(--card)/.9)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100" onClick={() => removeJournalImage(selectedDate, index)} aria-label={`Xóa ảnh ${index + 1}`} data-testid={`button-remove-journal-image-${index}`}><Trash2 size={14} /></button></div>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-[hsl(var(--border))] px-5 py-8 text-center"><ImagePlus size={22} className="mx-auto text-[hsl(var(--muted-foreground))]" /><p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">Chưa có ảnh cho ngày này. Ảnh chỉ lưu trong trình duyệt của bạn.</p></div>}</div></section></div>{viewImage && <div className="modal-backdrop fixed inset-0 z-40 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewImage(null); }}><div className="relative max-h-[90vh] max-w-4xl"><img src={viewImage} alt="Ảnh nhật ký phóng to" className="max-h-[85vh] rounded-2xl object-contain shadow-2xl" /><button className="icon-button absolute -right-3 -top-3 bg-[hsl(var(--card))] shadow-lg" onClick={() => setViewImage(null)} aria-label="Đóng ảnh" data-testid="button-close-journal-image"><X size={18} /></button></div></div>}</div>;
}

function PomodoroPage() {
  const { logMinutes, notify, data } = useStudy();
  const presets = [{ label: '25 / 5', work: 25, rest: 5 }, { label: '50 / 10', work: 50, rest: 10 }, { label: '90 / 15', work: 90, rest: 15 }];
  const [preset, setPreset] = useState(presets[0]);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [remaining, setRemaining] = useState(presets[0].work * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (remaining > 0 || !running) return;
    setRunning(false);
    if (mode === 'work') {
      logMinutes(preset.work);
      notify(`Phiên học ${preset.work} phút đã xong. Thời gian nghỉ bắt đầu.`);
      setMode('break');
      setRemaining(preset.rest * 60);
    } else {
      notify('Hết giờ nghỉ. Mình quay lại bàn học nhé.');
      setMode('work');
      setRemaining(preset.work * 60);
    }
  }, [remaining, running, mode, preset, logMinutes, notify]);
  const reset = () => { setRunning(false); setMode('work'); setRemaining(preset.work * 60); };
  const choosePreset = (next: typeof preset) => { if (!running) { setPreset(next); setMode('work'); setRemaining(next.work * 60); } };
  const total = (mode === 'work' ? preset.work : preset.rest) * 60;
  const progress = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return <div className="mx-auto max-w-4xl pt-8"><PageHeading eyebrow="tập trung có nhịp" title="Pomodoro" description="Một phiên rõ ràng, một khoảng nghỉ tử tế. Khi phiên học kết thúc, thời gian sẽ tự ghi vào hành trình." /><div className="card-surface rounded-[2rem] p-6 sm:p-12"><div className="text-center"><div className="eyebrow">{mode === 'work' ? 'phiên học' : 'thời gian nghỉ'} · {preset.label}</div><div className="relative mx-auto mt-8 flex h-64 w-64 items-center justify-center rounded-full p-3 sm:h-80 sm:w-80" style={{ background: `conic-gradient(hsl(var(--primary)) ${progress}%, hsl(var(--muted)) 0)` }}><div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[hsl(var(--card))]"><div className="mono text-5xl font-bold tracking-[-.08em] sm:text-7xl" data-testid="text-pomodoro-time">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div><div className="mt-3 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{running ? 'đang tập trung' : 'sẵn sàng bắt đầu'}</div></div></div><div className="mt-9 flex flex-wrap justify-center gap-2"><button className="primary-button min-w-32" onClick={() => { setRunning((value) => !value); notify(running ? 'Đã tạm dừng phiên học.' : 'Phiên học đã bắt đầu.'); }} data-testid="button-pomodoro-toggle">{running ? <Pause size={17} /> : <Play size={17} />}{running ? 'Tạm dừng' : 'Bắt đầu'}</button><button className="secondary-button" onClick={reset} data-testid="button-pomodoro-reset"><RotateCcw size={16} /> Đặt lại</button></div><p className="mx-auto mt-5 max-w-md text-center text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{mode === 'work' ? data.settings.focusReminder ? 'Khi bắt đầu, hãy đóng những tab không cần thiết và để tâm trí ở lại với một việc.' : 'Tập trung vào một việc đang ở trước mặt.' : 'Đứng dậy, uống nước và để mắt rời khỏi màn hình một chút.'}</p></div><div className="mt-10 border-t border-[hsl(var(--border))] pt-7"><div className="eyebrow text-center">chọn độ dài phiên</div><div className="mt-4 grid gap-3 sm:grid-cols-3">{presets.map((item) => <button key={item.label} className={`rounded-2xl border p-4 text-left transition-transform hover:-translate-y-1 ${preset.label === item.label ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary)/.65)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--background)/.35)]'}`} onClick={() => choosePreset(item)} disabled={running} data-testid={`button-pomodoro-preset-${item.label.replace(' ', '-')}`}><div className="flex items-center justify-between"><span className="font-bold">{item.label}</span>{preset.label === item.label && <CheckCircle2 size={16} className="text-[hsl(var(--primary))]" />}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">học {item.work} phút · nghỉ {item.rest} phút</div></button>)}</div></div></div></div>;
}

function AssistantPage() {
  const { data, notify } = useStudy();
  const [generatedAt, setGeneratedAt] = useState(Date.now());
  const today = historyFor(data);
  const phase = phaseForDay(dayNumber());
  const bySubject = SUBJECTS.map((subject) => {
    const tasks = data.tasks.filter((task) => task.subject === subject);
    const done = tasks.filter((task) => task.done).length;
    return { subject, total: tasks.length, done, percent: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
  }).filter((item) => item.total > 0);
  const weakest = bySubject.slice().sort((a, b) => a.percent - b.percent)[0];
  const remainingGoal = Math.max(0, data.settings.dailyGoal - today.minutes);
  const plan = [
    weakest ? `${weakest.subject} — ${Math.min(45, Math.max(25, remainingGoal))} phút: ưu tiên phần còn yếu nhất.` : 'Chọn một môn đang cần được củng cố — 35 phút tập trung.',
    'Làm một nhiệm vụ rõ đầu ra — 30 phút, không mở thêm mục tiêu mới.',
    'Ôn lại lỗi trong ngày và ghi một dòng vào nhật ký — 15 phút.',
  ];
  return <div className="pt-8"><PageHeading eyebrow="gợi ý từ dữ liệu của bạn" title="Trợ lý 300 ngày" description="Phân tích rule-based chạy hoàn toàn trong trình duyệt, không gửi dữ liệu đi đâu." action={<button className="primary-button" onClick={() => { setGeneratedAt(Date.now()); notify('Đã làm mới kế hoạch hôm nay.'); }} data-testid="button-generate-plan"><Sparkles size={17} /> Tạo kế hoạch</button>} /><div className="assistant-grid grid grid-cols-[.9fr_1.1fr] gap-5"><section className="rounded-[1.65rem] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-soft)] sm:p-9"><div className="flex items-start justify-between"><div><div className="eyebrow text-[hsl(var(--primary-foreground)/.65)]">bản đọc hôm nay</div><h2 className="serif mt-3 text-2xl font-semibold tracking-[-.04em]">Mình đang ở đâu?</h2></div><Lightbulb className="text-[hsl(var(--accent))]" size={25} /></div><div className="mt-8 space-y-4 text-sm leading-relaxed text-[hsl(var(--primary-foreground)/.8)]"><div className="flex gap-3"><span className="mono text-[hsl(var(--accent))]">01</span><span>Ngày {dayNumber()} / {TOTAL_DAYS}, còn {remainingDays()} ngày tới kỳ thi.</span></div><div className="flex gap-3"><span className="mono text-[hsl(var(--accent))]">02</span><span>Giai đoạn <strong className="text-[hsl(var(--primary-foreground))]">{phase.label}</strong> · {phase.detail}.</span></div><div className="flex gap-3"><span className="mono text-[hsl(var(--accent))]">03</span><span>Đã học {today.minutes} / {data.settings.dailyGoal} phút và hoàn thành {today.tasks} nhiệm vụ hôm nay.</span></div><div className="flex gap-3"><span className="mono text-[hsl(var(--accent))]">04</span><span>{weakest ? `Môn cần chú ý: ${weakest.subject} (${weakest.percent}% nhiệm vụ hiện tại đã xong).` : 'Thêm vài nhiệm vụ để trợ lý tìm ra môn cần chú ý.'}</span></div></div></section><section className="card-surface rounded-[1.65rem] p-7 sm:p-9"><div className="flex items-start justify-between"><div><div className="eyebrow">kế hoạch đề xuất</div><h2 className="serif mt-2 text-2xl font-semibold tracking-[-.04em]">Một buổi học vừa sức</h2></div><div className="rounded-full bg-[hsl(var(--secondary))] p-3 text-[hsl(var(--primary))]"><Target size={20} /></div></div><div className="mt-7 space-y-3">{plan.map((item, index) => <div className="flex gap-4 rounded-2xl bg-[hsl(var(--muted)/.55)] p-4" key={`${generatedAt}-${item}`}><span className="mono text-xs font-bold text-[hsl(var(--accent))]">0{index + 1}</span><p className="text-sm leading-relaxed">{item}</p></div>)}</div><div className="mt-6 flex items-center justify-between border-t border-[hsl(var(--border))] pt-5 text-xs text-[hsl(var(--muted-foreground))]"><span>{remainingGoal ? `Còn ${remainingGoal} phút để chạm mục tiêu.` : 'Mục tiêu thời gian hôm nay đã đạt.'}</span><span className="flex items-center gap-1"><BellRing size={13} /> rule-based</span></div></section></div><div className="mt-5 card-surface rounded-[1.65rem] p-6 sm:p-8"><div className="eyebrow">góc nhìn theo môn</div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{bySubject.length ? bySubject.map((item) => <div key={item.subject} className="rounded-2xl border border-[hsl(var(--border))] p-4"><div className="flex items-center justify-between"><span className={`rounded px-1.5 py-0.5 text-xs font-bold subject-${subjectTone[item.subject]}`}>{item.subject}</span><span className="mono text-xs">{item.percent}%</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${item.percent}%` }} /></div><p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{item.done}/{item.total} nhiệm vụ hoàn thành</p></div>) : <p className="text-sm text-[hsl(var(--muted-foreground))]">Chưa đủ dữ liệu để so sánh môn học.</p>}</div></div></div>;
}

function HistoryPage() {
  const { data } = useStudy();
  const dates = getLastDates(30);
  const activeDays = dates.filter((date) => historyFor(data, date).minutes > 0 || historyFor(data, date).tasks > 0).length;
  const totalMinutes = dates.reduce((sum, date) => sum + historyFor(data, date).minutes, 0);
  const maxMinutes = Math.max(1, ...dates.map((date) => historyFor(data, date).minutes));
  return <div className="pt-8"><PageHeading eyebrow="dấu chân học tập" title="Lịch sử học" description="Nhìn thấy những ngày đã có mặt sẽ giúp bạn tin hơn vào nhịp đang xây." /><div className="grid gap-4 sm:grid-cols-3"><StatCard icon={<CalendarDays size={18} />} label="Ngày có hoạt động" value={`${activeDays}`} unit="ngày" detail="trong 30 ngày gần nhất" accent="jade" testId="history-active-days" /><StatCard icon={<Clock3 size={18} />} label="Thời gian" value={`${totalMinutes}`} unit="phút" detail="trong 30 ngày gần nhất" accent="gold" testId="history-minutes" /><StatCard icon={<Flame size={18} />} label="Chuỗi hiện tại" value={`${data.streak}`} unit="ngày" detail="được ghi nhận liên tiếp" accent="coral" testId="history-streak" /></div><section className="card-surface mt-5 rounded-[1.65rem] p-6 sm:p-8"><div className="flex items-center justify-between"><div><div className="eyebrow">30 ngày vừa qua</div><h2 className="serif mt-2 text-2xl font-semibold tracking-[-.04em]">Nhịp học nhìn thấy được</h2></div><BarChart3 size={22} className="text-[hsl(var(--primary))]" /></div><div className="mt-7 grid grid-cols-5 gap-2 sm:grid-cols-10">{dates.map((date) => { const item = historyFor(data, date); const intensity = item.minutes ? Math.max(12, Math.round(item.minutes / maxMinutes * 100)) : 0; return <div key={date} className="group relative"><div className="aspect-square rounded-lg border border-[hsl(var(--border))]" style={{ background: intensity ? `hsl(var(--primary) / ${intensity / 100})` : 'hsl(var(--muted) / .45)' }} title={`${formatDate(parseDate(date), { day: '2-digit', month: '2-digit' })}: ${item.minutes} phút`} data-testid={`history-cell-${date}`} /><div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[hsl(var(--foreground))] px-2 py-1 text-[.64rem] text-[hsl(var(--background))] group-hover:block">{item.minutes} phút · {item.tasks} việc</div><div className="mt-1 truncate text-center text-[.55rem] text-[hsl(var(--muted-foreground))]">{parseDate(date).getDate()}/{parseDate(date).getMonth() + 1}</div></div>; })}</div><div className="mt-7 flex items-center justify-between border-t border-[hsl(var(--border))] pt-5 text-xs text-[hsl(var(--muted-foreground))]"><span>Ít hoạt động</span><div className="flex gap-1.5">{[.12, .35, .58, .8, 1].map((opacity) => <span key={opacity} className="h-3 w-3 rounded-sm bg-[hsl(var(--primary))]" style={{ opacity }} />)}</div><span>Nhiều hoạt động</span></div></section><section className="card-surface mt-5 rounded-[1.65rem] p-6 sm:p-8"><div className="eyebrow">dòng thời gian</div><div className="mt-5 divide-y divide-[hsl(var(--border))]">{dates.slice().reverse().filter((date) => { const item = historyFor(data, date); return item.minutes || item.tasks || item.note; }).map((date) => { const item = historyFor(data, date); return <div key={date} className="flex items-center justify-between gap-4 py-4"><div><div className="text-sm font-semibold capitalize">{formatDate(parseDate(date), { weekday: 'long', day: '2-digit', month: '2-digit' })}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{item.tasks} nhiệm vụ · {item.note ? 'đã viết nhật ký' : 'chưa có ghi chú'}</div></div><div className="text-right"><div className="mono text-sm font-bold text-[hsl(var(--primary))]">{item.minutes} phút</div><div className="text-[.65rem] text-[hsl(var(--muted-foreground))]">+{Math.max(0, Math.floor(item.minutes / 3))} XP từ thời gian</div></div></div>; })}</div>{!dates.some((date) => { const item = historyFor(data, date); return item.minutes || item.tasks || item.note; }) && <EmptyState icon={<History size={24} />} title="Lịch sử đang chờ ngày đầu tiên" description="Ghi một buổi học hoặc hoàn thành một nhiệm vụ để bắt đầu dòng thời gian." />}</section></div>;
}

function AssistantHint() {
  return <div className="rounded-[1.65rem] bg-[hsl(var(--secondary))] p-6"><Lightbulb size={20} className="text-[hsl(var(--accent))]" /><p className="mt-3 text-sm leading-relaxed text-[hsl(var(--foreground)/.7)]">Bạn có thể thay đổi mục tiêu bất cứ lúc nào. Dữ liệu vẫn nằm trong trình duyệt này.</p></div>;
}

function SettingsPage() {
  const { data, updateSettings, resetData, notify } = useStudy();
  const [settings, setSettings] = useState<StudySettings>(data.settings);
  useEffect(() => setSettings(data.settings), [data.settings]);
  const save = () => { updateSettings({ ...settings, dailyGoal: Math.max(1, Number(settings.dailyGoal) || 120) }); notify('Cài đặt đã được lưu.'); };
  const toggle = (key: 'focusReminder' | 'endDayReminder') => setSettings((current) => ({ ...current, [key]: !current[key] }));
  return <div className="pt-8"><PageHeading eyebrow="nhịp học của riêng mình" title="Cài đặt" description="Điều chỉnh mục tiêu và lời nhắc để 300 ngày vừa vặn với cuộc sống của bạn." action={<button className="primary-button" onClick={save} data-testid="button-save-settings"><Check size={16} /> Lưu thay đổi</button>} /><div className="grid gap-5 lg:grid-cols-[1fr_330px]"><section className="card-surface rounded-[1.65rem] p-6 sm:p-8"><div className="eyebrow">mục tiêu mỗi ngày</div><label className="mt-5 block max-w-sm"><span className="mb-2 block text-sm font-semibold">Thời gian học mục tiêu</span><div className="relative"><input className="field pr-20 text-xl font-semibold" type="number" min="1" max="1440" value={settings.dailyGoal} onChange={(event) => setSettings({ ...settings, dailyGoal: Number(event.target.value) })} data-testid="input-daily-goal" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">phút</span></div></label><div className="mt-9 border-t border-[hsl(var(--border))] pt-7"><div className="eyebrow">lời nhắc trong ứng dụng</div><div className="mt-4 divide-y divide-[hsl(var(--border))]"><SettingToggle title="Nhắc khi bắt đầu Pomodoro" description="Hiện lời nhắc tập trung khi bắt đầu phiên học." checked={settings.focusReminder} onChange={() => toggle('focusReminder')} testId="toggle-focus-reminder" /><SettingToggle title="Nhắc cuối ngày" description="Nhìn lại thời gian đã học trước giờ nghỉ." checked={settings.endDayReminder} onChange={() => toggle('endDayReminder')} testId="toggle-end-day-reminder" /></div>{settings.endDayReminder && <label className="mt-5 block max-w-xs"><span className="mb-2 block text-sm font-semibold">Giờ nhắc cuối ngày</span><input className="field" type="time" value={settings.endDayTime} onChange={(event) => setSettings({ ...settings, endDayTime: event.target.value })} data-testid="input-end-day-time" /></label>}</div></section><div className="space-y-5"><div className="card-surface rounded-[1.65rem] p-6"><div className="eyebrow">dữ liệu</div><h2 className="serif mt-2 text-xl font-semibold">Lưu trong trình duyệt</h2><p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Nhiệm vụ, thời gian, nhật ký và ảnh chỉ được lưu trong localStorage của thiết bị này.</p><div className="mt-5 rounded-xl bg-[hsl(var(--muted)/.6)] p-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">Dữ liệu V1 cũ được giữ lại và bổ sung các trường V2 khi bạn mở ứng dụng.</div></div><div className="rounded-[1.65rem] border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.06)] p-6"><div className="flex items-center gap-2 text-[hsl(var(--destructive))]"><Trash2 size={18} /><div className="eyebrow text-[hsl(var(--destructive))]">vùng cẩn thận</div></div><h2 className="serif mt-3 text-xl font-semibold">Đặt lại toàn bộ dữ liệu</h2><p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Xóa nhiệm vụ, lịch sử, nhật ký, ảnh và XP khỏi trình duyệt. Hành động này không thể hoàn tác.</p><button className="mt-5 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--destructive)/.4)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive)/.1)]" onClick={() => { if (window.confirm('Bạn chắc chắn muốn xóa toàn bộ dữ liệu 300 Ngày? Hành động này không thể hoàn tác.')) { resetData(); notify('Đã đặt lại dữ liệu.'); } }} data-testid="button-reset-data"><Trash2 size={15} /> Xóa toàn bộ dữ liệu</button></div><AssistantHint /></div></div></div>;
}

function SettingToggle({ title, description, checked, onChange, testId }: { title: string; description: string; checked: boolean; onChange: () => void; testId: string }) {
  return <div className="flex items-center justify-between gap-4 py-4"><div><div className="text-sm font-semibold">{title}</div><div className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{description}</div></div><button role="switch" aria-checked={checked} className={`switch-track relative h-6 w-11 shrink-0 rounded-full ${checked ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'}`} onClick={onChange} data-testid={testId}><span className={`switch-thumb absolute top-1 h-4 w-4 rounded-full bg-[hsl(var(--card))] shadow-sm ${checked ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>;
}

function EmptyState({ icon, title, description, onAction }: { icon: ReactNode; title: string; description: string; onAction?: () => void }) {
  return <div className="flex flex-col items-center rounded-2xl border border-dashed border-[hsl(var(--border))] px-5 py-12 text-center"><div className="rounded-full bg-[hsl(var(--secondary))] p-3 text-[hsl(var(--primary))]">{icon}</div><h3 className="serif mt-4 text-lg font-semibold">{title}</h3><p className="mt-1 max-w-[280px] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{description}</p>{onAction && <button className="secondary-button mt-5" onClick={onAction} data-testid="button-empty-action"><Plus size={15} /> Thêm nhiệm vụ</button>}</div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Dashboard} /><Route path="/tasks" component={TasksPage} /><Route path="/journal" component={JournalPage} /><Route path="/pomodoro" component={PomodoroPage} /><Route path="/assistant" component={AssistantPage} /><Route path="/history" component={HistoryPage} /><Route path="/settings" component={SettingsPage} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function App() {
  const study = useStudyData();
  const [notice, setNotice] = useState<string | null>(null);
  const reminderSent = useRef('');
  const notify = (message: string) => setNotice(message);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      const key = `${todayKey()}-${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (study.data.settings.endDayReminder && now.toTimeString().slice(0, 5) === study.data.settings.endDayTime && reminderSent.current !== key) {
        reminderSent.current = key;
        notify(`Cuối ngày rồi. Hôm nay bạn đã học ${historyFor(study.data).minutes} phút.`);
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [study.data]);
  if (!study.loaded) return <LoadingScreen />;
  return <StudyContext.Provider value={{ ...study, notify }}><AppShell><Router /></AppShell>{notice && <div className="toast-pop fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-4 py-3 text-xs font-semibold text-[hsl(var(--background))] shadow-[0_12px_30px_rgba(23,43,42,.2)]" role="status" data-testid="status-toast"><CheckCircle2 size={16} className="text-[hsl(var(--accent))]" />{notice}</div>}</StudyContext.Provider>;
}

export default App;
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  ListChecks,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const STORAGE_KEY = '300-ngay-study-data';
const EXAM_DATE = new Date(2027, 5, 14);
const SUBJECTS = ['Tất cả', 'Hóa', 'Toán', 'Anh', 'Tin', 'KHTN', 'Khác'] as const;
type Subject = (typeof SUBJECTS)[number];
type Task = { id: string; name: string; subject: Exclude<Subject, 'Tất cả'>; done: boolean };
type StudyData = { tasks: Task[]; studyMinutes: number; streak: number; lastStudy: string | null; todayMinutes: number };

const initialData: StudyData = {
  tasks: [
    { id: 'hoa-chuyen', name: 'Ôn Hóa chuyên', subject: 'Hóa', done: false },
    { id: 'on-toan', name: 'Ôn Toán', subject: 'Toán', done: false },
    { id: 'on-tieng-anh', name: 'Ôn Tiếng Anh', subject: 'Anh', done: false },
    { id: 'luyen-cpp', name: 'Luyện C++', subject: 'Tin', done: false },
  ],
  studyMinutes: 0,
  streak: 0,
  lastStudy: null,
  todayMinutes: 0,
};

const subjectColors: Record<Exclude<Subject, 'Tất cả'>, string> = {
  Hóa: 'coral', Toán: 'jade', Anh: 'gold', Tin: 'ink', KHTN: 'plum', Khác: 'clay',
};

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function daysUntilExam() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((EXAM_DATE.getTime() - today.getTime()) / 86400000));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function saveStudyData(data: StudyData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function readStudyData(): StudyData {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return initialData;
    return {
      ...initialData, ...saved,
      tasks: Array.isArray(saved.tasks) ? saved.tasks.map((task: Partial<Task>, index: number) => ({
        id: task.id || `task-${index}-${Date.now()}`,
        name: task.name || 'Nhiệm vụ chưa đặt tên',
        subject: task.subject || 'Khác',
        done: Boolean(task.done),
      })) : initialData.tasks,
      todayMinutes: saved.lastStudy === getTodayKey() ? Number(saved.todayMinutes || 0) : 0,
    };
  } catch {
    return initialData;
  }
}

function Home() {
  const [data, setData] = useState<StudyData>(initialData);
  const [loaded, setLoaded] = useState(false);
  const [activeSubject, setActiveSubject] = useState<Subject>('Tất cả');
  const [modal, setModal] = useState<'task' | 'minutes' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ name: '', subject: 'Hóa' as Exclude<Subject, 'Tất cả'> });
  const [minutesInput, setMinutesInput] = useState('30');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = readStudyData();
      setData(next);
      setLoaded(true);
    }, 180);
    const minuteTimer = window.setInterval(() => setNow(new Date()), 60000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(minuteTimer);
    };
  }, []);

  const filteredTasks = useMemo(
    () => activeSubject === 'Tất cả' ? data.tasks : data.tasks.filter((task) => task.subject === activeSubject),
    [activeSubject, data.tasks],
  );
  const completedCount = data.tasks.filter((task) => task.done).length;
  const progress = data.tasks.length ? Math.round((completedCount / data.tasks.length) * 100) : 0;
  const remaining = daysUntilExam();
  const todayLabel = formatDate(now);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2700);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const commit = (next: StudyData) => {
    setData(next);
    saveStudyData(next);
  };

  const toggleTask = (id: string) => {
    const task = data.tasks.find((item) => item.id === id);
    if (!task) return;
    const done = !task.done;
    commit({ ...data, tasks: data.tasks.map((item) => item.id === id ? { ...item, done } : item) });
    setNotice(done ? 'Nhiệm vụ đã hoàn thành. Tiến thêm một bước.' : 'Đã đưa nhiệm vụ về danh sách cần làm.');
  };

  const deleteTask = (id: string) => {
    const task = data.tasks.find((item) => item.id === id);
    if (!task || !window.confirm(`Xóa nhiệm vụ “${task.name}”?`)) return;
    commit({ ...data, tasks: data.tasks.filter((item) => item.id !== id) });
    setNotice('Đã xóa nhiệm vụ.');
  };

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newTask.name.trim();
    if (!name) return;
    const task: Task = { id: `task-${Date.now()}`, name, subject: newTask.subject, done: false };
    commit({ ...data, tasks: [...data.tasks, task] });
    setNewTask({ name: '', subject: 'Hóa' });
    setModal(null);
    setNotice('Đã thêm nhiệm vụ mới.');
  };

  const logMinutes = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minutes = Math.min(1440, Math.max(1, Number(minutesInput) || 0));
    if (!minutes) return;
    const today = getTodayKey();
    let nextStreak = data.streak;
    if (data.lastStudy !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      nextStreak = data.lastStudy === yesterdayKey ? data.streak + 1 : 1;
    }
    commit({
      ...data, studyMinutes: data.studyMinutes + minutes,
      todayMinutes: data.lastStudy === today ? data.todayMinutes + minutes : minutes,
      streak: nextStreak, lastStudy: today,
    });
    setMinutesInput('30');
    setModal(null);
    setNotice(`Đã ghi ${minutes} phút học. Giữ nhịp nhé.`);
  };

  if (!loaded) {
    return <div className="app-shell"><div className="grain" /><main className="page-wrap py-8"><div className="h-8 w-36 animate-pulse rounded-lg bg-muted" /><div className="mt-12 h-64 animate-pulse rounded-[1.5rem] bg-muted" /><div className="mt-5 grid grid-cols-2 gap-4"><div className="h-32 animate-pulse rounded-2xl bg-muted" /><div className="h-32 animate-pulse rounded-2xl bg-muted" /></div></main></div>;
  }

  return (
    <div className="app-shell">
      <div className="grain" />
      <header className="topbar page-wrap flex items-center justify-between py-7">
        <div className="flex items-center gap-3" data-testid="brand-300-ngay">
          <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_7px_16px_rgba(46,101,93,.2)]">
            <BookOpen size={19} strokeWidth={2.2} />
          </div>
          <div>
            <div className="serif text-[1.28rem] font-semibold leading-none tracking-[-.03em]">300 Ngày</div>
            <div className="mt-1 text-[.62rem] font-bold uppercase tracking-[.19em] text-[hsl(var(--muted-foreground))]">bạn học cùng mình</div>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-right sm:flex">
          <CalendarDays size={15} className="text-[hsl(var(--accent))]" />
          <span className="text-xs font-medium capitalize text-[hsl(var(--muted-foreground))]" data-testid="text-today">{todayLabel}</span>
        </div>
      </header>

      <main className="page-wrap pb-14">
        <section className="hero-grid grid grid-cols-[1.15fr_.85fr] gap-5">
          <div className="fade-rise relative overflow-hidden rounded-[1.65rem] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-soft)] sm:p-10">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-[hsl(var(--primary-foreground)/.1)]" />
            <div className="absolute -right-1 top-4 h-36 w-36 rounded-full border border-[hsl(var(--primary-foreground)/.1)]" />
            <div className="relative">
              <div className="eyebrow text-[hsl(var(--primary-foreground)/.65)]">điểm hẹn phía trước</div>
              <div className="mt-5 flex items-end gap-3">
                <span className="serif text-[clamp(5rem,13vw,9rem)] font-semibold leading-[.76] tracking-[-.085em]" data-testid="countdown-days">{remaining}</span>
                <span className="mb-1 text-lg font-medium text-[hsl(var(--primary-foreground)/.75)]">ngày</span>
              </div>
              <div className="mt-7 flex items-center gap-2 text-sm text-[hsl(var(--primary-foreground)/.76)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
                Kỳ thi ngày <strong className="font-semibold text-[hsl(var(--primary-foreground))]">14/06/2027</strong>
              </div>
              <p className="mt-8 max-w-[350px] text-[.93rem] leading-relaxed text-[hsl(var(--primary-foreground)/.72)]">
                Không cần chạy thật nhanh. Chỉ cần hôm nay có mặt và làm một việc nhỏ cho tương lai của mình.
              </p>
            </div>
          </div>
          <div className="fade-rise delay-1 card-surface flex min-h-[265px] flex-col justify-between rounded-[1.65rem] p-7 sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow">hôm nay</div>
                <h1 className="serif mt-3 max-w-[250px] text-[2rem] font-semibold leading-[1.08] tracking-[-.045em]">Mình học gì một chút nhé?</h1>
              </div>
              <div className="rounded-full bg-[hsl(var(--secondary))] p-3 text-[hsl(var(--accent))]"><Target size={20} /></div>
            </div>
            <div className="mt-7 flex items-center justify-between gap-4">
              <div>
                <div className="text-3xl font-semibold tracking-[-.06em]" data-testid="text-today-minutes">{data.todayMinutes}<span className="ml-1 text-sm font-medium tracking-normal text-[hsl(var(--muted-foreground))]">phút</span></div>
                <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">thời gian đã học hôm nay</div>
              </div>
              <button className="primary-button" onClick={() => setModal('minutes')} data-testid="button-log-minutes"><Plus size={16} /> Ghi thời gian</button>
            </div>
          </div>
        </section>

        <section className="stats-grid mt-5 grid grid-cols-4 gap-4">
          <StatCard icon={<ListChecks size={18} />} label="Tiến độ" value={`${progress}%`} detail={`${completedCount}/${data.tasks.length} việc xong`} accent="jade" delay="delay-1" testId="stat-progress" />
          <StatCard icon={<Clock3 size={18} />} label="Tổng thời gian" value={`${data.studyMinutes}`} unit="phút" detail="tích lũy từ đầu" accent="gold" delay="delay-2" testId="stat-minutes" />
          <StatCard icon={<Flame size={18} />} label="Chuỗi ngày" value={`${data.streak}`} unit="ngày" detail={data.streak ? 'đang được giữ nhịp' : 'bắt đầu từ hôm nay'} accent="coral" delay="delay-3" testId="stat-streak" />
          <div className="fade-rise delay-4 card-surface rounded-[1.2rem] p-5">
            <div className="flex items-center justify-between">
              <div className="eyebrow">hoàn thành</div>
              <CheckCircle2 size={18} className="text-[hsl(var(--primary))]" />
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
            <div className="mt-2 text-right text-xs font-medium text-[hsl(var(--muted-foreground))]">{progress === 100 ? 'Tuyệt vời!' : 'Cứ từng bước một'}</div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-[1.15fr_.85fr] gap-5 lg:mt-10">
          <div className="fade-rise delay-2 card-surface rounded-[1.65rem] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="eyebrow">bàn học hôm nay</div>
                <h2 className="serif mt-2 text-[1.8rem] font-semibold tracking-[-.045em]">Việc cần làm</h2>
              </div>
              <button className="primary-button" onClick={() => setModal('task')} data-testid="button-add-task"><Plus size={17} /> Thêm việc</button>
            </div>
            <div className="mt-6 flex gap-1.5 overflow-x-auto pb-1">
              {SUBJECTS.map((subject) => (
                <button key={subject} onClick={() => setActiveSubject(subject)} data-testid={`filter-subject-${subject}`}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${activeSubject === subject ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted)/.7)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'}`}>
                  {subject}
                </button>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-[hsl(var(--border))] px-5 py-12 text-center">
                  <div className="rounded-full bg-[hsl(var(--secondary))] p-3 text-[hsl(var(--primary))]"><ListChecks size={22} /></div>
                  <h3 className="serif mt-4 text-lg font-semibold">Bàn học đang trống</h3>
                  <p className="mt-1 max-w-[240px] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Thêm một việc nhỏ để bắt đầu buổi học của bạn.</p>
                  <button className="secondary-button mt-5" onClick={() => setModal('task')} data-testid="button-empty-add-task"><Plus size={15} /> Thêm nhiệm vụ</button>
                </div>
              ) : filteredTasks.map((task) => (
                <div key={task.id} className={`task-row flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 ${task.done ? 'completed' : ''}`} data-testid={`task-row-${task.id}`}>
                  <button onClick={() => toggleTask(task.id)} aria-label={task.done ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'} data-testid={`button-toggle-task-${task.id}`}
                    className={`task-check flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${task.done ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-transparent hover:border-[hsl(var(--primary))]'}`}>
                    <Check size={15} strokeWidth={3} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="task-name truncate text-sm font-semibold">{task.name}</div>
                    <div className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[.63rem] font-bold uppercase tracking-[.08em] subject-${subjectColors[task.subject]}`}>{task.subject}</div>
                  </div>
                  <button className="icon-button h-8 w-8" onClick={() => deleteTask(task.id)} aria-label={`Xóa ${task.name}`} data-testid={`button-delete-task-${task.id}`}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            {data.tasks.length > 0 && <div className="mt-5 flex items-center gap-3 border-t border-[hsl(var(--border))] pt-5 text-xs text-[hsl(var(--muted-foreground))]"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--accent))] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div><span data-testid="text-task-progress">{completedCount}/{data.tasks.length} hoàn thành</span></div>}
          </div>

          <div className="space-y-5">
            <div className="fade-rise delay-3 card-surface rounded-[1.65rem] p-6 sm:p-8">
              <div className="eyebrow">lời nhắc nhỏ</div>
              <div className="mt-5 flex gap-4">
                <div className="mt-1 text-[hsl(var(--accent))]"><BookOpen size={22} /></div>
                <div>
                  <h2 className="serif text-[1.55rem] font-semibold leading-tight tracking-[-.04em]">Đừng học để chạy trốn kỳ thi.</h2>
                  <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Học để ngày mai nhìn lại, bạn biết hôm nay mình đã cố gắng thật.</p>
                </div>
              </div>
              <div className="mt-7 h-px bg-[hsl(var(--border))]" />
              <div className="mt-4 flex items-center justify-between text-xs"><span className="font-semibold text-[hsl(var(--muted-foreground))]">mục tiêu của mình</span><ChevronRight size={15} className="text-[hsl(var(--accent))]" /></div>
            </div>
            <div className="fade-rise delay-4 rounded-[1.65rem] bg-[hsl(var(--secondary))] p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div className="eyebrow text-[hsl(var(--foreground)/.65)]">nhịp học</div>
                <Flame size={18} className="text-[hsl(var(--accent))]" />
              </div>
              <div className="mt-5 flex items-baseline gap-2"><span className="serif text-5xl font-semibold tracking-[-.08em]">{data.streak}</span><span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">ngày liên tiếp</span></div>
              <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--foreground)/.67)]">{data.streak > 0 ? 'Một nhịp nhỏ được giữ đều sẽ thành sức mạnh lớn.' : 'Ghi lại một buổi học để mở khóa ngày đầu tiên.'}</p>
              <button className="secondary-button mt-6 border-transparent bg-[hsl(var(--card)/.72)]" onClick={() => setModal('minutes')} data-testid="button-streak-log"><Clock3 size={15} /> Ghi buổi học</button>
            </div>
          </div>
        </section>

        <footer className="mt-12 flex flex-col justify-between gap-2 border-t border-[hsl(var(--border))] pt-5 text-[.68rem] font-medium text-[hsl(var(--muted-foreground))] sm:flex-row">
          <span>300 Ngày · một ngày một bước</span><span>Ngày thi: 14 tháng 6, 2027</span>
        </footer>
      </main>

      {notice && <div className="toast-pop fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-4 py-3 text-xs font-semibold text-[hsl(var(--background))] shadow-[0_12px_30px_rgba(23,43,42,.2)]" data-testid="status-toast"><CheckCircle2 size={16} className="text-[hsl(var(--accent))]" />{notice}</div>}

      {modal && (
        <div className="modal-backdrop fixed inset-0 z-40 flex items-end justify-center p-3 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          <div className="modal-card w-full max-w-md rounded-[1.5rem] bg-[hsl(var(--card))] p-6 shadow-[0_20px_60px_rgba(23,43,42,.2)] sm:p-8" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="flex items-start justify-between gap-4">
              <div><div className="eyebrow">{modal === 'task' ? 'thêm vào bàn học' : 'ghi nhận hôm nay'}</div><h2 id="modal-title" className="serif mt-2 text-2xl font-semibold tracking-[-.04em]">{modal === 'task' ? 'Một việc mới' : 'Bạn đã học bao lâu?'}</h2></div>
              <button className="icon-button" onClick={() => setModal(null)} aria-label="Đóng" data-testid="button-close-modal"><X size={18} /></button>
            </div>
            {modal === 'task' ? (
              <form className="mt-7 space-y-5" onSubmit={addTask}>
                <label className="block"><span className="mb-2 block text-xs font-bold text-[hsl(var(--muted-foreground))]">Tên nhiệm vụ</span><input autoFocus className="field" value={newTask.name} onChange={(event) => setNewTask({ ...newTask, name: event.target.value })} placeholder="Ví dụ: Làm đề Hóa số 5" data-testid="input-task-name" /></label>
                <label className="block"><span className="mb-2 block text-xs font-bold text-[hsl(var(--muted-foreground))]">Môn học</span><select className="field" value={newTask.subject} onChange={(event) => setNewTask({ ...newTask, subject: event.target.value as Exclude<Subject, 'Tất cả'> })} data-testid="select-task-subject">{SUBJECTS.slice(1).map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
                <div className="flex justify-end gap-2 pt-2"><button type="button" className="secondary-button" onClick={() => setModal(null)} data-testid="button-cancel-task">Để sau</button><button type="submit" className="primary-button" data-testid="button-submit-task"><Plus size={16} /> Thêm nhiệm vụ</button></div>
              </form>
            ) : (
              <form className="mt-7" onSubmit={logMinutes}>
                <label className="block"><span className="mb-2 block text-xs font-bold text-[hsl(var(--muted-foreground))]">Số phút đã học</span><div className="relative"><input autoFocus type="number" min="1" max="1440" className="field pr-20 text-2xl font-semibold" value={minutesInput} onChange={(event) => setMinutesInput(event.target.value)} data-testid="input-study-minutes" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">phút</span></div></label>
                <div className="mt-3 flex gap-2">{['25', '45', '60'].map((value) => <button type="button" key={value} onClick={() => setMinutesInput(value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${minutesInput === value ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`} data-testid={`button-minute-preset-${value}`}>{value} phút</button>)}</div>
                <p className="mt-5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Mỗi lần ghi thời gian sẽ giúp bạn giữ chuỗi ngày học đều.</p>
                <div className="mt-6 flex justify-end gap-2"><button type="button" className="secondary-button" onClick={() => setModal(null)} data-testid="button-cancel-minutes">Để sau</button><button type="submit" className="primary-button" data-testid="button-submit-minutes"><Check size={16} /> Lưu buổi học</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, unit, detail, accent, delay, testId }: { icon: ReactNode; label: string; value: string; unit?: string; detail: string; accent: string; delay: string; testId: string }) {
  return <div className={`fade-rise ${delay} card-surface rounded-[1.2rem] p-5`} data-testid={testId}>
    <div className={`stat-icon stat-${accent}`}>{icon}</div>
    <div className="mt-4 flex items-baseline gap-1"><span className="text-2xl font-semibold tracking-[-.06em]">{value}</span>{unit && <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{unit}</span>}</div>
    <div className="mt-1 text-[.7rem] text-[hsl(var(--muted-foreground))]">{label} · {detail}</div>
  </div>;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

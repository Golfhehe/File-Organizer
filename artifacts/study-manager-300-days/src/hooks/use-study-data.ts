import { useEffect, useState } from 'react';

export const STORAGE_KEY = '300-ngay-study-data';
export const START_DATE = '2026-08-18';
export const EXAM_DATE = '2027-06-14';
export const TOTAL_DAYS = 300;
export const SUBJECTS = ['Hóa', 'Toán', 'Anh', 'Tin', 'KHTN', 'Khác'] as const;
export type Subject = (typeof SUBJECTS)[number];

export type Task = {
  id: string;
  name: string;
  subject: Subject;
  done: boolean;
  xp: number;
};

export type JournalDay = {
  minutes: number;
  tasks: number;
  note: string;
  images: string[];
  completedTaskIds: string[];
};

export type StudySettings = {
  dailyGoal: number;
  focusReminder: boolean;
  endDayReminder: boolean;
  endDayTime: string;
};

export type StudyData = {
  tasks: Task[];
  studyMinutes: number;
  streak: number;
  lastStudy: string | null;
  todayMinutes: number;
  xp: number;
  history: Record<string, JournalDay>;
  settings: StudySettings;
};

const defaultTasks: Task[] = [
  { id: 'hoa-chuyen', name: 'Ôn Hóa chuyên', subject: 'Hóa', done: false, xp: 20 },
  { id: 'on-toan', name: 'Ôn Toán', subject: 'Toán', done: false, xp: 20 },
  { id: 'on-tieng-anh', name: 'Ôn Tiếng Anh', subject: 'Anh', done: false, xp: 20 },
  { id: 'luyen-cpp', name: 'Luyện C++', subject: 'Tin', done: false, xp: 20 },
];

export const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const emptyJournalDay = (): JournalDay => ({
  minutes: 0,
  tasks: 0,
  note: '',
  images: [],
  completedTaskIds: [],
});

export const defaultData = (): StudyData => ({
  tasks: defaultTasks.map((task) => ({ ...task })),
  studyMinutes: 0,
  streak: 0,
  lastStudy: null,
  todayMinutes: 0,
  xp: 0,
  history: {},
  settings: {
    dailyGoal: 120,
    focusReminder: true,
    endDayReminder: true,
    endDayTime: '21:30',
  },
});

const validSubject = (value: unknown): Subject =>
  SUBJECTS.includes(value as Subject) ? (value as Subject) : 'Khác';

const migrate = (saved: Partial<StudyData> | null): StudyData => {
  const base = defaultData();
  if (!saved || typeof saved !== 'object') return base;
  const source = saved as Record<string, unknown>;
  const rawHistory = source.history;
  const history: Record<string, JournalDay> = {};
  if (rawHistory && typeof rawHistory === 'object') {
    Object.entries(rawHistory as Record<string, Partial<JournalDay>>).forEach(([key, value]) => {
      history[key] = {
        ...emptyJournalDay(),
        ...(value || {}),
        minutes: Number(value?.minutes || 0),
        tasks: Number(value?.tasks || 0),
        note: typeof value?.note === 'string' ? value.note : '',
        images: Array.isArray(value?.images) ? value.images.filter((item): item is string => typeof item === 'string') : [],
        completedTaskIds: Array.isArray(value?.completedTaskIds)
          ? value.completedTaskIds.filter((item): item is string => typeof item === 'string')
          : [],
      };
    });
  }
  const rawTasks = Array.isArray(source.tasks) ? source.tasks : base.tasks;
  const tasks = rawTasks.map((task, index) => {
    const item = task as Partial<Task>;
    return {
      id: item.id || `task-${index}-${Date.now()}`,
      name: typeof item.name === 'string' && item.name.trim() ? item.name : 'Nhiệm vụ chưa đặt tên',
      subject: validSubject(item.subject),
      done: Boolean(item.done),
      xp: Math.max(1, Number(item.xp || 20)),
    };
  });
  const settings = {
    ...base.settings,
    ...((source.settings && typeof source.settings === 'object') ? source.settings as Partial<StudySettings> : {}),
  };
  const today = todayKey();
  const lastStudy = typeof source.lastStudy === 'string' ? source.lastStudy : null;
  if (lastStudy === today && !history[today]) {
    history[today] = { ...emptyJournalDay(), minutes: Number(source.todayMinutes || 0) };
  }
  return {
    tasks,
    studyMinutes: Math.max(0, Number(source.studyMinutes || 0)),
    streak: Math.max(0, Number(source.streak || 0)),
    lastStudy,
    todayMinutes: lastStudy === today ? Math.max(0, Number(source.todayMinutes || history[today]?.minutes || 0)) : 0,
    xp: Math.max(0, Number(source.xp || 0)),
    history,
    settings: {
      dailyGoal: Math.max(1, Number(settings.dailyGoal || 120)),
      focusReminder: settings.focusReminder !== false,
      endDayReminder: settings.endDayReminder !== false,
      endDayTime: typeof settings.endDayTime === 'string' ? settings.endDayTime : '21:30',
    },
  };
};

const readStorage = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return migrate(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultData();
  }
};

const writeStorage = (data: StudyData) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // The UI remains usable if storage is unavailable or full.
  }
};

export function useStudyData() {
  const [data, setData] = useState<StudyData>(() => defaultData());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = readStorage();
      setData(next);
      writeStorage(next);
      setLoaded(true);
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  const commit = (updater: (current: StudyData) => StudyData) => {
    setData((current) => {
      const next = updater(current);
      writeStorage(next);
      return next;
    });
  };

  const addTask = (name: string, subject: Subject) => {
    commit((current) => ({
      ...current,
      tasks: [...current.tasks, { id: `task-${Date.now()}`, name: name.trim(), subject, done: false, xp: 20 }],
    }));
  };

  const toggleTask = (id: string) => {
    commit((current) => {
      const task = current.tasks.find((item) => item.id === id);
      if (!task) return current;
      const nextDone = !task.done;
      const today = todayKey();
      const day = { ...emptyJournalDay(), ...(current.history[today] || {}) };
      const completedTaskIds = nextDone
        ? Array.from(new Set([...day.completedTaskIds, id]))
        : day.completedTaskIds.filter((taskId) => taskId !== id);
      const history = { ...current.history, [today]: { ...day, completedTaskIds, tasks: nextDone ? day.tasks + 1 : day.tasks } };
      return {
        ...current,
        xp: nextDone ? current.xp + task.xp : current.xp,
        history,
        tasks: current.tasks.map((item) => item.id === id ? { ...item, done: nextDone } : item),
      };
    });
  };

  const deleteTask = (id: string) => {
    commit((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
  };

  const logMinutes = (amount: number) => {
    const minutes = Math.min(1440, Math.max(1, Math.round(amount)));
    commit((current) => {
      const today = todayKey();
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
      const day = { ...emptyJournalDay(), ...(current.history[today] || {}) };
      const nextHistory = { ...current.history, [today]: { ...day, minutes: day.minutes + minutes } };
      const nextStreak = current.lastStudy === today
        ? current.streak
        : current.lastStudy === yesterday ? current.streak + 1 : 1;
      return {
        ...current,
        studyMinutes: current.studyMinutes + minutes,
        todayMinutes: current.lastStudy === today ? current.todayMinutes + minutes : minutes,
        streak: nextStreak,
        lastStudy: today,
        xp: current.xp + Math.max(1, Math.floor(minutes / 3)),
        history: nextHistory,
      };
    });
  };

  const saveJournal = (date: string, note: string) => {
    commit((current) => ({
      ...current,
      history: {
        ...current.history,
        [date]: { ...emptyJournalDay(), ...(current.history[date] || {}), note },
      },
    }));
  };

  const addJournalImages = (date: string, images: string[]) => {
    commit((current) => ({
      ...current,
      history: {
        ...current.history,
        [date]: { ...emptyJournalDay(), ...(current.history[date] || {}), images: [...(current.history[date]?.images || []), ...images] },
      },
    }));
  };

  const removeJournalImage = (date: string, imageIndex: number) => {
    commit((current) => ({
      ...current,
      history: {
        ...current.history,
        [date]: { ...emptyJournalDay(), ...(current.history[date] || {}), images: (current.history[date]?.images || []).filter((_, index) => index !== imageIndex) },
      },
    }));
  };

  const updateSettings = (settings: StudySettings) => {
    commit((current) => ({ ...current, settings }));
  };

  const resetData = () => {
    const next = defaultData();
    setData(next);
    writeStorage(next);
  };

  return {
    data,
    loaded,
    addTask,
    toggleTask,
    deleteTask,
    logMinutes,
    saveJournal,
    addJournalImages,
    removeJournalImage,
    updateSettings,
    resetData,
  };
}
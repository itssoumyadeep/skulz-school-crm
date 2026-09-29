export type AttendanceMark = {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: "Present" | "Absent" | "Late" | "Excused";
  method: "Manual" | "RFID" | "Face";
  period: string;
  endpoint: string;
};

const DB_NAME = "purple-cubby-offline";
const STORE_NAME = "attendance_queue";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000/api/v1";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => void,
  collect: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, mode);
  const store = tx.objectStore(STORE_NAME);
  runner(store);
  const result = await collect(tx);
  db.close();
  return result;
}

export async function queueAttendance(input: {
  studentId: string;
  classId: string;
  date: string;
  status: "Present" | "Absent" | "Late" | "Excused";
  method?: "Manual" | "RFID" | "Face";
  period?: string;
}): Promise<AttendanceMark> {
  const mark: AttendanceMark = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    studentId: input.studentId,
    classId: input.classId,
    date: input.date,
    status: input.status,
    method: input.method ?? "Manual",
    period: input.period ?? "AM",
    endpoint: `${API_BASE}/attendance/mark`,
  };

  await withStore(
    "readwrite",
    (store) => {
      store.put(mark);
    },
    (tx) =>
      new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );

  return mark;
}

export async function getQueuedAttendance(): Promise<AttendanceMark[]> {
  return withStore(
    "readonly",
    () => undefined,
    (tx) =>
      new Promise<AttendanceMark[]>((resolve, reject) => {
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () =>
          resolve((request.result as AttendanceMark[]) ?? []);
        request.onerror = () => reject(request.error);
      }),
  );
}

async function removeQueued(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  await withStore(
    "readwrite",
    (store) => {
      ids.forEach((id) => store.delete(id));
    },
    (tx) =>
      new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export async function syncQueuedAttendance(token?: string): Promise<number> {
  const queued = await getQueuedAttendance();
  const synced: string[] = [];

  for (const item of queued) {
    try {
      const response = await fetch(item.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          student_id: item.studentId,
          class_id: item.classId,
          date: item.date,
          status: item.status,
          method: item.method,
          period: item.period,
        }),
      });

      if (response.ok) {
        synced.push(item.id);
      }
    } catch {
      break;
    }
  }

  await removeQueued(synced);
  return synced.length;
}

export async function registerBackgroundSync(
  tag = "attendance-sync",
): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  const registration = await navigator.serviceWorker.ready;
  const syncCapable = registration as ServiceWorkerRegistration & {
    sync?: { register: (syncTag: string) => Promise<void> };
  };
  if (syncCapable.sync) {
    await syncCapable.sync.register(tag);
  }
}

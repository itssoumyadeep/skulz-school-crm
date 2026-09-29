self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const DB_NAME = "purple-cubby-offline";
const STORE_NAME = "attendance_queue";

function openDb() {
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

async function putRecord(record) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getAllRecords() {
  const db = await openDb();
  const rows = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows;
}

async function removeRecords(ids) {
  if (!ids.length) {
    return;
  }
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    ids.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function flushAttendanceQueue() {
  const all = await getAllRecords();
  const synced = [];

  for (const item of all) {
    try {
      const response = await fetch(item.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(item.token ? { Authorization: `Bearer ${item.token}` } : {}),
        },
        body: JSON.stringify({
          student_id: item.studentId,
          class_id: item.classId,
          date: item.date,
          status: item.status,
          method: item.method || "Manual",
          period: item.period || "AM",
        }),
      });

      if (response.ok) {
        synced.push(item.id);
      }
    } catch {
      break;
    }
  }

  await removeRecords(synced);
}

async function handleAttendancePost(request) {
  try {
    return await fetch(request.clone());
  } catch {
    const payload = await request.clone().json();
    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") || "";
    const record = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
      studentId: payload.student_id || payload.studentId || "unknown",
      classId:
        payload.class_id ||
        payload.classId ||
        "55555555-5555-4555-8555-555555555555",
      date: payload.date || new Date().toISOString().slice(0, 10),
      status: payload.status || "Present",
      method: payload.method || "Manual",
      period: payload.period || "AM",
      endpoint: request.url,
      token,
    };
    await putRecord(record);
    if (self.registration.sync) {
      await self.registration.sync.register("attendance-sync");
    }

    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method === "POST" &&
    url.pathname.endsWith("/api/v1/attendance/mark")
  ) {
    event.respondWith(handleAttendancePost(event.request));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "attendance-sync") {
    event.waitUntil(flushAttendanceQueue());
  }
});

"use client";

import { useMemo, useState } from "react";

type MessageItem = {
  id: string;
  sender: string;
  student: string;
  snippet: string;
  time: string;
  unread: boolean;
};

const initialMessages: MessageItem[] = [
  {
    id: "m-1",
    sender: "Ava Patel",
    student: "Ava Patel • Grade 4A",
    snippet: "Can we discuss the science assignment due Thursday?",
    time: "2 min ago",
    unread: true,
  },
  {
    id: "m-2",
    sender: "Noah Wilson",
    student: "Noah Wilson • Grade 5B",
    snippet: "Thanks for the update on attendance. We will review it.",
    time: "1 hour ago",
    unread: false,
  },
  {
    id: "m-3",
    sender: "Sofia Gomez",
    student: "Sofia Gomez • Grade 6C",
    snippet: "Please confirm the parent-teacher meeting slot.",
    time: "Yesterday",
    unread: false,
  },
];

export default function TeacherMessagesPage() {
  const [messages] = useState(initialMessages);
  const [selectedId, setSelectedId] = useState(initialMessages[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedId) ?? messages[0],
    [messages, selectedId],
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-blue-600">
            Communication
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Messages
          </h1>
        </div>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
          New message
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between px-2 py-2">
            <h2 className="font-medium text-slate-800">Inbox</h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {messages.filter((message) => message.unread).length} unread
            </span>
          </div>
          <div className="space-y-2">
            {messages.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => setSelectedId(message.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedMessage?.id === message.id
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={`truncate font-medium ${message.unread ? "text-slate-900" : "text-slate-700"}`}
                    >
                      {message.sender}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {message.student}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {message.time}
                  </span>
                </div>
                <p
                  className={`mt-2 text-sm ${message.unread ? "font-medium text-slate-700" : "text-slate-600"}`}
                >
                  {message.snippet}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {selectedMessage ? (
            <>
              <div className="mb-4 border-b border-slate-200 pb-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                  Thread
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {selectedMessage.sender}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedMessage.student}
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">Parent message</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {selectedMessage.snippet}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-sm text-blue-700">Teacher reply</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Thank you for the update. I have noted the changes and will
                    share the latest assessment summary by Friday.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
                <label className="block text-sm text-slate-600">
                  <span className="mb-1 block">Subject</span>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Optional subject"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block text-sm text-slate-600">
                  <span className="mb-1 block">Message</span>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={5}
                    placeholder="Write a response to the parent..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <div className="flex justify-end">
                  <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    Send reply
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-500">No messages available.</p>
          )}
        </section>
      </div>
    </div>
  );
}

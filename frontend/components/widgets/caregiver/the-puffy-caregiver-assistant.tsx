"use client";

import { useState } from "react";
import {
  Sparkles,
  X,
  Minus,
  Send,
  Pill,
  Clock,
  Bandage,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

interface ThePuffyCaregiverAssistantProps {
  caregiverName?: string;
  roomLabel?: string;
  pendingDosesCount?: number;
  unconfirmedRollCount?: number;
  onOpenBooBooModal?: () => void;
  onTriggerRollAudit?: () => void;
  onScrollToMedications?: () => void;
}

interface ChatMessage {
  id: string;
  sender: "puffy" | "user";
  text: string;
  timestamp: string;
}

export function ThePuffyCaregiverAssistant({
  caregiverName = "Clara Gomez",
  roomLabel = "Sunflowers Toddler & Pre-K",
  pendingDosesCount = 3,
  unconfirmedRollCount = 2,
  onOpenBooBooModal,
  onTriggerRollAudit,
  onScrollToMedications,
}: ThePuffyCaregiverAssistantProps) {
  // DEF-004: MUST BE CLOSED/DOCKED BY DEFAULT
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-1",
      sender: "puffy",
      text: `Hi ${caregiverName.split(" ")[0]}! I'm actively monitoring ${roomLabel}. ${pendingDosesCount} medication doses scheduled and ${unconfirmedRollCount} unconfirmed attendance roll checks pending. How can I assist you right now?`,
      timestamp: "Just now",
    },
  ]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const query = inputText.trim();
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: "Just now",
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");

    setTimeout(() => {
      let reply = `Understood. Analyzing Room 1A records regarding "${query}". All records are strictly scoped under caregiver role policies.`;
      const qLower = query.toLowerCase();
      if (qLower.includes("dose") || qLower.includes("medication")) {
        reply = `Active Prescription Schedule: Maya Lin (Amoxicillin 125mg/5mL at 11:30 AM) is pending nurse verification. Leo Vance (Salbutamol) was administered at 10:45 AM.`;
      } else if (qLower.includes("attendance") || qLower.includes("roll")) {
        reply = `Room 1A Roll Status: 14 checked in, 2 unconfirmed absences (Noah Parker, Charlotte Taylor). Roll modification window locks in 18 hours (Policy BR-03-01).`;
      } else if (qLower.includes("boo-boo") || qLower.includes("injury")) {
        reply = `Incident Log: 2 incidents registered today (Liam S. playground scrape, Zoe Zhao forehead bump). Both comply with 1-hour parent SLA notification requirements.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `p-${Date.now()}`,
          sender: "puffy",
          text: reply,
          timestamp: "Just now",
        },
      ]);
    }, 500);
  };

  return (
    // DEF-011: z-[80] floating stacking context
    <aside
      className="fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-3"
      aria-label="ThePuffy AI Caregiver Assistant"
    >
      {/* Expanded Chat Dialog Panel */}
      {isOpen && (
        <div
          className="w-[360px] sm:w-[400px] rounded-3xl bg-surface-container-lowest shadow-2xl border border-outline-variant/30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
          role="dialog"
          aria-label="ThePuffy AI Chat Window"
        >
          {/* Header */}
          <div className="p-4 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pastel-butter text-secondary flex items-center justify-center font-bold shadow-sm">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                  ThePuffy AI Agent
                </span>
                <span className="text-[11px] text-green-700 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
                  Online • Scoped: {caregiverName}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Minimize assistant"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Close assistant"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="p-4 flex flex-col gap-3.5 max-h-[340px] overflow-y-auto bg-surface-container-lowest text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col gap-1 ${
                  m.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`p-3.5 rounded-2xl leading-relaxed max-w-[85%] ${
                    m.sender === "user"
                      ? "bg-charcoal text-white rounded-tr-xs"
                      : "bg-surface-container-low text-on-surface border border-outline-variant/30 shadow-xs rounded-tl-xs"
                  }`}
                >
                  <p className="font-medium">{m.text}</p>
                </div>
                <span className="text-[10px] text-on-surface-variant px-1 font-medium">
                  {m.sender === "user" ? "You" : "ThePuffy"} • {m.timestamp}
                </span>
              </div>
            ))}

            {/* Quick Action Shortcuts */}
            <div className="flex flex-col gap-1.5 pt-2">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Suggested Actions
              </span>
              <button
                type="button"
                onClick={onScrollToMedications}
                className="w-full text-left p-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all flex items-center gap-2"
              >
                <Pill className="w-3.5 h-3.5 text-primary" />
                <span>Review medication consent logs</span>
              </button>
              <button
                type="button"
                onClick={onTriggerRollAudit}
                className="w-full text-left p-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all flex items-center gap-2"
              >
                <Clock className="w-3.5 h-3.5 text-secondary" />
                <span>Verify attendance roll call audit</span>
              </button>
              <button
                type="button"
                onClick={onOpenBooBooModal}
                className="w-full text-left p-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all flex items-center gap-2"
              >
                <Bandage className="w-3.5 h-3.5 text-terracotta" />
                <span>Log minor incident boo-boo note</span>
              </button>
            </div>
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-surface-container-low border-t border-outline-variant/30 flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-surface-container-lowest p-1 rounded-full border border-outline-variant/30 shadow-xs">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Ask ThePuffy anything about Room 1A..."
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
              />
              <button
                type="button"
                aria-label="Send query"
                onClick={handleSend}
                className="w-8 h-8 rounded-full bg-terracotta hover:opacity-90 active:scale-95 text-on-primary flex items-center justify-center transition-all shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between px-1 text-[10px] text-on-surface-variant">
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-mint" />
                Caregiver Scoped • FERPA &amp; RLS Enforced
              </span>
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: "init",
                      sender: "puffy",
                      text: "Chat cleared. What can I help you check next?",
                      timestamp: "Just now",
                    },
                  ])
                }
                className="font-semibold hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Docked Floating Pill Button */}
      <button
        type="button"
        id="puffy-launcher-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center gap-3 px-4 py-2.5 rounded-full bg-charcoal text-on-primary shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all border border-charcoal/40"
      >
        <div className="w-8 h-8 rounded-full bg-pastel-butter/30 text-pastel-butter flex items-center justify-center shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[10px] text-pastel-butter font-semibold">
            ThePuffy
          </span>
          <span className="text-xs font-bold text-on-primary">AI Agent</span>
        </div>
      </button>
    </aside>
  );
}

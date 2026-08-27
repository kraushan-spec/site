"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Send, User, Sparkles } from "lucide-react";

type Msg = { role: "user" | "assistant"; text: string; usedAi?: boolean };

const SUGGESTIONS = [
  "Сколько я могу потратить сегодня?",
  "Какой кредит лучше погасить первым?",
  "Почему у меня не хватает денег в этом месяце?",
  "Где я могу сократить расходы?",
  "Какие договоры сейчас требуют внимания?",
  "Какие оплаты мы ожидаем?",
  "Что изменилось в договорах за последнюю неделю?",
];

export function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "Здравствуйте! Спросите меня о финансах семьи или статусе договоров — я отвечу на основе данных вашего кошелька." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const autoSentRef = useRef(false);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: data.answer ?? "Не удалось получить ответ", usedAi: data.usedAi }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Произошла ошибка. Попробуйте ещё раз." }]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-110px)]">
      <div className="flex items-center gap-2 mb-3">
        <div className="icon-badge bg-primary text-white">
          <Bot size={18} />
        </div>
        <div>
          <div className="font-semibold text-sm">AI-помощник</div>
          <div className="text-xs text-muted">Отвечает на основе данных вашего кошелька</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 card p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bot size={14} />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-primary text-white rounded-tr-sm" : "bg-[#f4f5fa] rounded-tl-sm"
              }`}
            >
              {m.text}
              {m.role === "assistant" && m.usedAi === false && (
                <div className="text-[10px] text-muted mt-1.5 flex items-center gap-1">
                  <Sparkles size={10} /> расчёт приложения
                </div>
              )}
            </div>
            {m.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-[#f1f2f8] flex items-center justify-center shrink-0">
                <User size={14} />
              </div>
            )}
          </div>
        ))}
        {loading && <div className="text-xs text-muted pl-9">AI печатает...</div>}
        <div ref={endRef} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto py-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} className="shrink-0 px-3 py-1.5 rounded-full bg-[#f1f2f8] text-xs font-medium hover:bg-[#e6e8f2]">
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          className="input"
          placeholder="Задайте вопрос..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn btn-primary shrink-0" disabled={loading}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

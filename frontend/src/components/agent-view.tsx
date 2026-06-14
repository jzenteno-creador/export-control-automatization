"use client";

import { useState, useRef, useEffect } from "react";
import { PromptBox } from "@/components/ui/chatgpt-prompt-input";
import type { EnrichedRow } from "./dashboard";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const THINKING_PHRASES = [
  "Analizando órdenes...",
  "Revisando datos de embarque...",
  "Cruzando información de clientes...",
  "Consultando destinos...",
  "Procesando tu consulta...",
  "Buscando en las órdenes SAP...",
  "Verificando entidades...",
  "Armando la respuesta...",
];

function ThinkingBubble() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % THINKING_PHRASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start">
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-500 flex items-center gap-3">
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </span>
        <span className="transition-all duration-300">{THINKING_PHRASES[phraseIndex]}</span>
      </div>
    </div>
  );
}

export function AgentView({ rows }: { rows: EnrichedRow[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (text: string) => {
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          orders: rows.map(r => ({
            id: r.id,
            po: r._po,
            orderType: r._orderType,
            shipment: r._shipment,
            mot: r._motLabel,
            dest: r._dest || r._destFallback,
            soldTo: r._soldTo,
            shipTo: r._shipTo,
            items: r._items,
            containers: r._containers,
            rsd: r._rsd,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-3xl mx-auto">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin space-y-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-3xl font-semibold text-slate-800 mb-2">Agente 304</div>
            <p className="text-slate-500 max-w-md">
              Preguntá sobre las {rows.length} órdenes cargadas. Puedo buscar por PO, cliente, MOT, anomalías, comparar órdenes, y más.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-6 text-sm">
              {[
                "¿Cuántas órdenes marítimas hay?",
                "¿Qué clientes tienen más órdenes?",
                "Mostrá las órdenes STO a Brasil",
                "¿Hay órdenes con entidades faltantes?",
              ].map(q => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-800"
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && <ThinkingBubble />}
      </div>

      {/* Input */}
      <div className="py-4">
        <PromptBox onSend={handleSend} disabled={loading} />
      </div>
    </div>
  );
}

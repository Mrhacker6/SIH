"use client";
"use client";
import { useEffect, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "नमस्ते! मैं CampusSathi हूँ।" },
  ]);
  const [input, setInput] = useState("");
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [kbReady, setKbReady] = useState<boolean | null>(null);
  const [language, setLanguage] = useState<string>("English");

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("http://localhost:8000/status");
        if (!res.ok) throw new Error("status not available");
        const data = await res.json();
        if (active) setKbReady(!!data.kb_ready);
      } catch {
        if (active) setKbReady(false);
      } finally {
        if (active) setTimeout(poll, 5000);
      }
    }
    poll();
    return () => {
      active = false;
    };
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: uid || null, message: text, language }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "⚠️ Server unavailable. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function quickAsk(q: string) {
    setInput(q);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] h-dvh">
      <aside className="bg-[#0b3c66] text-white p-4 space-y-2">
        <div className="text-xl font-semibold mb-4">CampusSathi</div>
        <nav className="space-y-2">
          {[
            { label: "मुखपृष्ठ", icon: "🏠" },
            { label: "Services", icon: "🧰" },
            { label: "सेवाएँ", icon: "🧩" },
            { label: "खातें", icon: "📂" },
            { label: "सम्पर्क", icon: "☎️" },
          ].map((i) => (
            <button
              key={i.label}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <span>{i.icon}</span>
              <span className="text-white/95">{i.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="p-4 overflow-y-auto bg-slate-100">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-slate-800 font-semibold flex-1">Citizen</div>
            {kbReady === null && (
              <span className="text-xs bg-slate-100 text-slate-700 border border-slate-300 rounded-full px-2 py-1">
                Checking knowledge base…
              </span>
            )}
            {kbReady === false && (
              <span className="text-xs bg-yellow-100 text-yellow-900 border border-yellow-300 rounded-full px-2 py-1">
                Warming knowledge base…
              </span>
            )}
            {kbReady === true && (
              <span className="text-xs bg-green-100 text-green-900 border border-green-300 rounded-full px-2 py-1">
                Knowledge base ready
              </span>
            )}
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="UID (optional)"
              className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {messages.map((m, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div
                  className={`h-8 w-8 rounded-full ${
                    m.role === "assistant" ? "bg-blue-100" : "bg-slate-200"
                  }`}
                />
                <div
                  className={`${
                    m.role === "assistant"
                      ? "bg-blue-50 text-slate-900"
                      : "bg-slate-50 text-slate-900"
                  } rounded-lg px-3 py-2 shadow border border-slate-200 text-sm w-full leading-relaxed`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-sm text-slate-600">Typing…</div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="प्रश्न लिखें..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button
              onClick={send}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              भेजें
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Fees Status", "HOD Contact", "My Section", "Admin Contact"].map(
              (a) => (
                <button
                  key={a}
                  onClick={() => quickAsk(a)}
                  className="text-sm bg-orange-100 text-orange-800 hover:bg-orange-200 rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  {a}
                </button>
              )
            )}
          </div>
        </div>
      </main>

      <aside className="p-4 bg-slate-50 space-y-3">
        <div className="bg-[#0b3c66] text-white rounded-xl p-4 h-32 flex items-center justify-center">
          <span className="opacity-95">Hero Graphic</span>
        </div>
        <div className="bg-[#0b3c66] text-white rounded-xl p-4">
          <div className="text-sm opacity-95">नवीनतम अपडेट</div>
          <div className="mt-2 text-sm text-white">किसान सम्मान निधि जारी</div>
          <button className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-orange-300">
            और पढ़ें
          </button>
        </div>
        <div className="bg-white rounded-xl p-3 shadow">
          <div className="text-sm mb-2 text-slate-800">भाषा चुनें</div>
          <div className="flex flex-wrap gap-2">
            {["English", "हिंदी", "मराठी", "বাংলা"].map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                  language === l
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

// مكوّن React لدردشة الذكاء الاصطناعي المجاني (مع ذاكرة جلسة تلقائية)
// الاستخدام: <AiChat sessionKey="user-123" />
import { useState, useRef, useEffect } from "react";

const API = "https://superagent-2b61d5b9.base44.app/functions/opencodeChat";
const SESSIONS = "https://superagent-2b61d5b9.base44.app/functions/opencodeSessions";

export default function AiChat({ sessionKey = "guest", model = "beam-free" }) {
  const [messages, setMessages] = useState([]);       // [{role, content}]
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const logRef = useRef(null);

  // استرجاع سجل الجلسة المحفوظ في قاعدة البيانات عند فتح المكوّن
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(SESSIONS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get", session: sessionKey }),
        });
        const d = await r.json();
        if (Array.isArray(d.history)) setMessages(d.history);
      } catch { /* تجاهل: نبدأ بذاكرة فارغة */ }
    })();
  }, [sessionKey]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, busy]);

  async function send(e) {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setBusy(true);
    try {
      let res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, session: sessionKey, model }),
      });
      // النموذج معطل؟ ارجع لـ beam-free الذي لا يفشل تقريباً
      if (res.status === 502) {
        res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, session: sessionKey, model: "beam-free" }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessages((m) => [...m, { role: "assistant", content: data.content }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function clearChat() {
    await fetch(SESSIONS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear", session: sessionKey }),
    });
    setMessages([]);
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", height: 520 }}>
      <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: 12, background: "#f7f8fa", borderRadius: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            margin: "6px 0", padding: "8px 12px", borderRadius: 12, fontSize: 15, whiteSpace: "pre-wrap",
            alignSelf: m.role === "user" ? "flex-start" : "flex-end",
            background: m.role === "user" ? "#e3f0fd" : "#fff",
            maxWidth: "85%",
          }}>{m.content}</div>
        ))}
        {busy && <div style={{ opacity: 0.6, fontSize: 14 }}>... يكتب الرد</div>}
        {error && <div style={{ color: "#c5221f", fontSize: 13 }}>⚠️ {error}</div>}
      </div>
      <form onSubmit={send} style={{ display: "flex", gap: 8, padding: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب رسالتك..."
          style={{ flex: 1, padding: "10px 14px", borderRadius: 20, border: "1px solid #ddd", fontSize: 15 }}
        />
        <button disabled={busy} style={{ padding: "10px 20px", borderRadius: 20, border: "none", background: "#1a73e8", color: "#fff", cursor: "pointer" }}>
          إرسال
        </button>
        <button type="button" onClick={clearChat} style={{ padding: "10px 14px", borderRadius: 20, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>
          🗑️
        </button>
      </form>
    </div>
  );
}

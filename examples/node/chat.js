// وسيط Express لدردشة الذكاء الاصطناعي المجاني (Node.js)
// التشغيل: npm i express && node chat.js   ثم افتح http://localhost:3000
import express from "express";

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(express.static("public"));

const API = "https://superagent-2b61d5b9.base44.app/functions/opencodeChat";
const ALLOWED_MODELS = new Set(["beam-free", "cat-jam-free", "space-bunny-free",
  "deepseek-v4.1-flash-free", "exo-free", "nemotron-3.5-super-vl-free"]);

// جدول بسيط لحد المعدل لكل IP (حماية من الاستخدام المفرط على بوابة مجانية)
const hits = new Map();
setInterval(() => hits.clear(), 60_000);

app.post("/api/chat", async (req, res) => {
  const ip = req.ip;
  const n = (hits.get(ip) ?? 0) + 1;
  hits.set(ip, n);
  if (n > 30) return res.status(429).json({ error: "rate_limit_local" });

  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.slice(0, 8000) : "";
  const session = typeof req.body?.session === "string" ? req.body.session.slice(0, 120) : "";
  let model = typeof req.body?.model === "string" ? req.body.model : "beam-free";
  if (!ALLOWED_MODELS.has(model)) model = "beam-free";
  if (!prompt) return res.status(400).json({ error: "invalid_body" });

  try {
    let r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, session, model }),
      signal: AbortSignal.timeout(180_000),
    });
    // فشل نموذج؟ beam-free كخطة بديلة
    if (r.status === 502 && model !== "beam-free") {
      r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, session, model: "beam-free" }),
        signal: AbortSignal.timeout(180_000),
      });
    }
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(504).json({ error: "upstream_timeout", detail: String(e.message ?? e) });
  }
});

app.listen(3000, () => console.log("✅ http://localhost:3000"));

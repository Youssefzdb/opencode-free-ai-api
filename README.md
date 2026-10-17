# 🤖 OpenCode Free AI API — دليل الربط الكامل

> واجهة ذكاء اصطناعي **مجانية بالكامل** (بدون مفاتيح API) تعمل عبر Base44، تدعم 44 نموذجاً منها beam-free، مع **ذاكرة محادثات** و **System Prompt** و **فحص صحة النماذج**. تدعم CORS فيمكن استدعاؤها مباشرة من أي موقع ويب.

**Base URL:**
```
https://superagent-2b61d5b9.base44.app/functions
```

| الدالة | الطريقة | الوظيفة |
|---|---|---|
| `/opencodeChat` | POST | الدردشة (النص + التفكير) |
| `/opencodeSessions` | POST | إدارة الجلسات والذاكرة المشتركة |
| `/opencodeFreeModels` | GET | قائمة 44 نموذجاً مجانياً |
| `/opencodeTestModels` | POST | فحص حي لكل النماذج (أيها يعمل الآن؟) |
| `/opencodeDocs` | GET | التوثيق الكامل (أضف `?format=md`) |

---

## 🚀 البدء في 30 ثانية (JavaScript)

```js
const API = "https://superagent-2b61d5b9.base44.app/functions/opencodeChat";

const res = await fetch(API, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "أهلا! اشرح لي ما هو الذكاء الاصطناعي" })
});
const data = await res.json();
console.log(data.content);  // ← الرد
```

**لا يحتاج مفتاح API ولا توكن.** انسخ والصق في Console المتصفح وسيعمل.

---

## 🧠 الذاكرة المشتركة (الجلسات)

مرّر `session` بنفس المفتاح وسيتذكر النموذج المحادثة كلها — الذاكرة محفوظة في قاعدة بيانات Base44 ويعمل من أي جهاز/متصفح:

```js
// الرسالة الأولى
await fetch(API, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "اسمي سليم وأحب كرة القدم", session: "user-123" })
});

// رسالة لاحقة (أي وقت، من أي جهاز) — يتذكر تلقائياً
const r = await fetch(API, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "ما اسمي وما هوايتي؟", session: "user-123" })
});
// → "اسمك سليم وهوايتك كرة القدم ⚽"
```

- كل جلسة تخزن حتى **60 رسالة**، وتُرسل آخر **30** للنموذج في كل دور.
- لعرض سجل الدردشة عند فتح صفحتك: `POST /opencodeSessions` مع `{"action":"get","session":"user-123"}`.
- زر "محادثة جديدة" في موقعك = `{"action":"clear","session":"user-123"}`.

## 🎭 تخصيص الشخصية (System Prompt)

أولوية البرومبت: `system` في الطلب > برومبت الجلسة > البرومبت العام (مطبق تلقائياً دائماً).

```js
// شخصية دائمة لكل مستخدمي جلسة معينة (مثلاً: نافذة دعم فني في موقعك)
await fetch("https://superagent-2b61d5b9.base44.app/functions/opencodeSessions", {
  method: "POST",
  headers: { "Content-Type": "application/json" }),
  body: JSON.stringify({
    action: "set_system",
    session: "support-chat",
    system_prompt: "أنت مساعد خدمة عملاء لموقعنا. أجب بالعربية بلغة واضحة ومهذبة."
  })
});

// برومبت لطلب واحد فقط
{ prompt: "اكتب لي إيميل تسويقي", system: "أنت كاتب تسويقي محترف", session: "user-123" }
```

## ⚡ وضع الطاقة القصوى (الافتراضي)

كل طلب يُرسل تلقائياً بأقصى جهد تفكير (`reasoning_effort: max`) وحد إخراج كامل. للتحكم:

```js
{ prompt: "ترجم: hello", reasoning_effort: "off", max_tokens: 200 }  // أسرع وأرخص
{ prompt: "حل هذه المسألة", model: "beam-free", reasoning_effort: "low" }
```

`reasoning_effort` يُرسل فقط للنماذج الداعمة تلقائياً (لا يفشل الطلب أبداً).

## 🩺 فحص النماذج الحية الآن

التوفر يتغير — قبل عرض قائمة النماذج أو عند فشل نموذج:

```js
const r = await fetch("https://superagent-2b61d5b9.base44.app/functions/opencodeTestModels", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}"   // يفحص كل 44 نموذجاً بالتوازي
});
const d = await r.json();
console.log(d.live_count, "نموذجاً حياً:", d.live.map(m => m.model));
console.log(d.summary);  // unavailable / deprecated / overloaded لكل ميت
```

⚠️ المسح الكامل يستغرق 1-2 دقيقة (بعض نماذج nemotron بطيئة ~70s). استدعه من زر تحديث في لوحة التحكم وليس عند فتح الصفحة.

## 🛡️ معالجة الأخطاء في موقعك

```js
async function ask(prompt, session) {
  const body = { prompt, session, model: "beam-free" };
  let res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data = await res.json();

  if (res.status === 502) {                    // النموذج معطل → beam-free دائماً يعمل
    body.model = "beam-free";
    res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    data = await res.json();
  } else if (res.status === 429) {             // حد البوابة → انتظر وأعد
    await new Promise(r => setTimeout(r, 3000));
    return ask(prompt, session);
  }
  return data;
}
```

## 📋 كل باراميترات الدردشة

| الباراميتر | النوع | الافتراضي | الوظيفة |
|---|---|---|---|
| `prompt` | string | — | سؤال المستخدم (أو `messages` مصفوفة) |
| `session` | string | بدون | مفتاح الذاكرة المشتركة |
| `model` | string | `beam-free` | أي معرف من `/opencodeFreeModels` |
| `system` | string | البرومبت العام | برومبت لهذا الطلب فقط |
| `reasoning_effort` | string | تلقائي (أقصى) | `low/medium/high/xhigh/max` أو `off` |
| `max_tokens` | number | حد النموذج الكامل | تقليص طول الرد |
| `temperature` | number | تلقائي | العشوائية |

**شكل الرد:** `content` (الرد) • `reasoning` (سلسلة التفكير إن وجدت) • `usage` (التوكنات) • `session_messages` (عدد رسائل الجلسة) • `system_prompt_applied` • `applied_reasoning_effort`.

---

## 📁 الأمثلة الجاهزة في هذا المستودع

| الملف | المنصة |
|---|---|
| `examples/chat-widget.html` | صفحة دردشة كاملة جاهزة — افتحها في المتصفح وتعمل فوراً (HTML واحد) |
| `examples/react/Chat.jsx` | مكوّن React (نسخ + لصق في مشروعك) |
| `examples/node/chat.js` | سيرفر Node/Express (لإخفاء الـ API عن العميل إن أردت) |
| `examples/php/chat.php` | سكربت PHP (لمواقع WordPress أو أي استضافة PHP) |

## ⚠️ ملاحظات الإنتاج

- البوابة المنبع هي الخطة المجانية لـ OpenCode: الاستخدام المفرط قد يُحد (429) وقد تتغير الوصفة — لا تجعلها اعتمادك الإنتاجي الوحيد، ووفّر نموذجاً احتياطياً مدفوعاً.
- عدد النماذج الحية يدور (10-12 عادة من 44) — `beam-free` الأسرع والأثبت، اجعله الافتراضي دائماً.
- الدردشة نصية فقط (لا توليد صور/فيديو). `nemotron-3.5-super-vl-free` يستطيع تحليل صورة ترسلها.
- التوثيق الكامل: `https://superagent-2b61d5b9.base44.app/functions/opencodeDocs?format=md`

---

صُنع هذا المستودع كجزء من مشروع دمج الذكاء الاصطناعي المجاني مع Base44 🇹🇳

<?php
/**
 * وسيط PHP لدردشة الذكاء الاصطناعي المجاني.
 * فائدة: تخفي النداء عن متصفح الزائر، وتضيف تنقيح وحد معدل من جهتك.
 *
 * الاستدعاء من الواجهة:  fetch('/chat.php', { method:'POST', body: JSON.stringify({prompt:'مرحبا', session:'user-1'}) })
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'method_not_allowed']); exit; }

define('API', 'https://superagent-2b61d5b9.base44.app/functions/opencodeChat');

$in = json_decode(file_get_contents('php://input'), true) ?: [];

// 1) تنقيح المدخلات
$prompt  = isset($in['prompt']) ? mb_substr(trim($in['prompt']), 0, 8000) : '';
$session = isset($in['session']) ? substr(trim($in['session']), 0, 120) : '';
$model    = isset($in['model']) && $in['model'] ? $in['model'] : 'beam-free'; // اسمح فقط بقائمة بيضاء
$allowed  = ['beam-free','cat-jam-free','space-bunny-free','deepseek-v4.1-flash-free','exo-free','nemotron-3.5-super-vl-free'];
if (!in_array($model, $allowed, true)) $model = 'beam-free';

if ($prompt === '') { http_response_code(400); echo json_encode(['error' => 'invalid_body']); exit; }

// 2) نداء الدالة الخلفية
$body = json_encode([
    'prompt'  => $prompt,
    'session' => $session,
    'model'   => $model,
    'max_tokens' => 2048,   // اجعلها أصغر لردود أسرع
], JSON_UNESCAPED_UNICODE);

$ch = curl_init(API);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 180,   // النماذج البطيئة تحتاج وقتاً
]);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 3) النموذج معطل؟ أعد المحاولة بـ beam-free (دائماً متاح تقريباً)
if ($code >= 500 && $model !== 'beam-free') {
    $body = json_encode(['prompt' => $prompt, 'session' => $session, 'model' => 'beam-free'], JSON_UNESCAPED_UNICODE);
    $ch = curl_init(API);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 180]);
    $res = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
}

http_response_code($code ?: 502);
echo $res ?: json_encode(['error' => 'upstream_unreachable']);

<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, X-Anthropic-Key");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$payload = file_get_contents("php://input");

$anthropicKey = $_SERVER['HTTP_X_ANTHROPIC_KEY'] ?? '';
$anthropicKey = trim($anthropicKey);

if (empty($anthropicKey)) {
    http_response_code(400);
    echo json_encode([
        "error" => "missing_api_key",
        "message" => "Nenhuma chave Anthropic foi enviada no header X-Anthropic-Key."
    ]);
    exit;
}

$ch = curl_init("https://api.anthropic.com/v1/messages");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: " . $anthropicKey,
    "anthropic-version: 2023-06-01"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    $curlError = curl_error($ch);
    curl_close($ch);

    http_response_code(500);
    echo json_encode([
        "error" => "curl_error",
        "message" => $curlError
    ]);
    exit;
}

curl_close($ch);

http_response_code($httpCode);
echo $response;
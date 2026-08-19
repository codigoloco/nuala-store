<?php
/**
 * capturar_clic.php - Endpoint asíncrono para recibir y persistir coordenadas de clics en SQLite.
 * Variables PHP en snake_Case y uso estricto de sentencias preparadas PDO.
 */

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Se requiere POST.'
    ]);
    exit;
}

$raw_input = file_get_contents('php://input');
$post_data = !empty($raw_input) ? json_decode($raw_input, true) : $_POST;

if (!is_array($post_data)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Cuerpo de la petición inválido.'
    ]);
    exit;
}

$click_x = isset($post_data['click_x']) ? (int)$post_data['click_x'] : null;
$click_y = isset($post_data['click_y']) ? (int)$post_data['click_y'] : null;
$page_url = isset($post_data['page_url']) ? strtolower(trim((string)$post_data['page_url'])) : '/';
$viewport_width = isset($post_data['viewport_width']) ? (int)$post_data['viewport_width'] : 0;
$viewport_height = isset($post_data['viewport_height']) ? (int)$post_data['viewport_height'] : 0;

if ($click_x === null || $click_y === null || $click_x < 0 || $click_y < 0) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Coordenadas de clic inválidas o faltantes.'
    ]);
    exit;
}

$db_conn = get_db_connection();

try {
    $insert_stmt = $db_conn->prepare("
        INSERT INTO clics_heatmap (click_x, click_y, page_url, viewport_width, viewport_height)
        VALUES (:click_x, :click_y, :page_url, :viewport_width, :viewport_height)
    ");

    $insert_stmt->execute([
        ':click_x'         => $click_x,
        ':click_y'         => $click_y,
        ':page_url'        => $page_url,
        ':viewport_width'  => $viewport_width,
        ':viewport_height' => $viewport_height
    ]);

    echo json_encode([
        'success'  => true,
        'click_id' => (int)$db_conn->lastInsertId(),
        'message'  => 'Clic registrado exitosamente.'
    ]);
} catch (PDOException $pdo_error) {
    error_log('Error insertando clic de heatmap: ' . $pdo_error->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al persistir el clic en la base de datos.'
    ]);
}

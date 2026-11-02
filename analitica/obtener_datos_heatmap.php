<?php
/**
 * obtener_datos_heatmap.php - Endpoint JSON para suministrar los puntos de clics a Heatmap.js.
 * Variables PHP en snake_Case y sentencias preparadas PDO.
 */

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/../api/helpers/SecurityHelper.php';

header('Content-Type: application/json; charset=utf-8');

if (!is_admin_authenticated()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Acceso restringido a administradores autenticados.',
        'data' => []
    ]);
    exit;
}

$filter_url = isset($_GET['page_url']) ? strtolower(trim((string)$_GET['page_url'])) : null;
$db_conn = get_db_connection();

try {
    if ($filter_url !== null && $filter_url !== '' && $filter_url !== 'todas') {
        $select_stmt = $db_conn->prepare("
            SELECT click_x, click_y, viewport_width, viewport_height, COUNT(*) AS click_density
            FROM clics_heatmap
            WHERE page_url = :page_url
            GROUP BY click_x, click_y, viewport_width, viewport_height
        ");
        $select_stmt->execute([':page_url' => $filter_url]);
    } else {
        $select_stmt = $db_conn->query("
            SELECT click_x, click_y, viewport_width, viewport_height, COUNT(*) AS click_density
            FROM clics_heatmap
            GROUP BY click_x, click_y, viewport_width, viewport_height
        ");
    }

    $raw_points = $select_stmt->fetchAll();
    $heatmap_data = [];
    $max_density = 1;

    foreach ($raw_points as $point_row) {
        $density_val = (int)$point_row['click_density'];
        if ($density_val > $max_density) {
            $max_density = $density_val;
        }

        $heatmap_data[] = [
            'x'              => (int)$point_row['click_x'],
            'y'              => (int)$point_row['click_y'],
            'viewport_width' => (int)($point_row['viewport_width'] ?? 0),
            'value'          => $density_val
        ];
    }

    // Obtener también lista de URLs únicas disponibles para el filtro del panel
    $urls_stmt = $db_conn->query("SELECT DISTINCT page_url FROM clics_heatmap ORDER BY page_url ASC");
    $available_urls = $urls_stmt->fetchAll(PDO::FETCH_COLUMN);

    // Conteo total de clics
    $total_clics_stmt = $db_conn->query("SELECT COUNT(*) FROM clics_heatmap");
    $total_clics = (int)$total_clics_stmt->fetchColumn();

    echo json_encode([
        'success'        => true,
        'max'            => max($max_density, 5),
        'data'           => $heatmap_data,
        'total_clics'    => $total_clics,
        'points_count'   => count($heatmap_data),
        'available_urls' => $available_urls,
        'page_url'       => $filter_url ?? 'todas'
    ]);
} catch (PDOException $pdo_error) {
    error_log('Error obteniendo datos para heatmap: ' . $pdo_error->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al consultar datos de heatmap en la base de datos.',
        'data'    => []
    ]);
}

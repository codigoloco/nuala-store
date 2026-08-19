<?php
/**
 * contador.php - Lógica y endpoint para el registro y consulta de visitas únicas en SQLite.
 * Variables PHP en snake_Case y principios SOLID.
 */

declare(strict_types=1);

require_once __DIR__ . '/db_config.php';

/**
 * Obtiene la IP real del cliente considerando posibles proxies reversos comunes.
 *
 * @return string Dirección IP sanitizada
 */
function get_client_ip(): string
{
    $ip_headers = [
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_FORWARDED',
        'HTTP_X_CLUSTER_CLIENT_IP',
        'HTTP_FORWARDED_FOR',
        'HTTP_FORWARDED',
        'REMOTE_ADDR'
    ];

    foreach ($ip_headers as $header_key) {
        if (!empty($_SERVER[$header_key])) {
            $ip_list = explode(',', (string)$_SERVER[$header_key]);
            $first_ip = trim($ip_list[0]);
            if (filter_var($first_ip, FILTER_VALIDATE_IP)) {
                return $first_ip;
            }
        }
    }

    return '127.0.0.1';
}

/**
 * Registra una visita única en la base de datos para la URL dada y la fecha actual.
 *
 * @param string $page_url URL o ruta de la página visitada
 * @return bool True si fue una visita nueva registrada hoy, False si ya estaba contabilizada
 */
function register_unique_visit(string $page_url = '/'): bool
{
    $db_conn = get_db_connection();
    $client_ip = get_client_ip();
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';

    // Generar un hash no reversible para proteger privacidad de IP
    $ip_hash = hash('sha256', $client_ip . '|' . $user_agent);
    $visit_date = date('Y-m-d');
    $normalized_url = strtolower(trim($page_url));

    try {
        $insert_stmt = $db_conn->prepare("
            INSERT OR IGNORE INTO contador_visitas (ip_hash, page_url, visit_date, user_agent)
            VALUES (:ip_hash, :page_url, :visit_date, :user_agent)
        ");

        $insert_stmt->execute([
            ':ip_hash'    => $ip_hash,
            ':page_url'   => $normalized_url,
            ':visit_date' => $visit_date,
            ':user_agent' => substr($user_agent, 0, 255),
        ]);

        return $insert_stmt->rowCount() > 0;
    } catch (PDOException $pdo_error) {
        error_log('Error registrando visita única: ' . $pdo_error->getMessage());
        return false;
    }
}

/**
 * Obtiene el total de visitas únicas registradas.
 *
 * @param string|null $page_url URL opcional para filtrar, o null para el total global
 * @return int Conteo total de visitas únicas
 */
function get_total_unique_visits(?string $page_url = null): int
{
    $db_conn = get_db_connection();

    try {
        if ($page_url !== null && $page_url !== '') {
            $normalized_url = strtolower(trim($page_url));
            $count_stmt = $db_conn->prepare("SELECT COUNT(*) AS total_count FROM contador_visitas WHERE page_url = :page_url");
            $count_stmt->execute([':page_url' => $normalized_url]);
        } else {
            $count_stmt = $db_conn->query("SELECT COUNT(*) AS total_count FROM contador_visitas");
        }

        $result_row = $count_stmt->fetch();
        return (int)($result_row['total_count'] ?? 0);
    } catch (PDOException $pdo_error) {
        error_log('Error consultando visitas: ' . $pdo_error->getMessage());
        return 0;
    }
}

// Si se accede directamente vía HTTP a contador.php (API endpoint)
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    header('Content-Type: application/json; charset=utf-8');

    $request_method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $raw_input = file_get_contents('php://input');
    $post_data = !empty($raw_input) ? json_decode($raw_input, true) : $_POST;

    if ($request_method === 'POST') {
        $target_url = isset($post_data['page_url']) ? (string)$post_data['page_url'] : '/';
        $is_new_visit = register_unique_visit($target_url);
        $total_visits = get_total_unique_visits();

        echo json_encode([
            'success'      => true,
            'is_new_visit' => $is_new_visit,
            'total_visits' => $total_visits,
            'page_url'     => strtolower(trim($target_url))
        ]);
        exit;
    }

    // GET: Consulta el total de visitas
    $filter_url = isset($_GET['page_url']) ? (string)$_GET['page_url'] : null;
    $total_visits = get_total_unique_visits($filter_url);

    echo json_encode([
        'success'      => true,
        'total_visits' => $total_visits,
        'page_url'     => $filter_url !== null ? strtolower(trim($filter_url)) : 'global'
    ]);
    exit;
}

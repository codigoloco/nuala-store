<?php
require_once __DIR__ . '/AuditHelper.php';

/**
 * SecurityHelper.php - Gestión reutilizable de sesiones seguras, CSRF, límite de intentos
 * y limpieza segura de archivos multimedia huérfanos.
 * Sigue principios SOLID y evita duplicación de código (DRY). Variables en snake_case.
 */

if (!function_exists('init_secure_session')) {
    /**
     * Inicia la sesión PHP con parámetros endurecidos contra robo de cookies y XSS.
     */
    function init_secure_session() {
        if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
            $is_https = (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off');
            session_set_cookie_params([
                'lifetime' => 0,
                'path' => '/',
                'secure' => $is_https,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
            @session_start();
        }
    }
}

if (!function_exists('is_admin_authenticated')) {
    /**
     * Verifica si la sesión actual tiene privilegios administrativos activos.
     */
    function is_admin_authenticated() {
        init_secure_session();
        if (empty($_SESSION['nuala_admin_auth']) || $_SESSION['nuala_admin_auth'] !== true) {
            return false;
        }
        // Expiración por inactividad de 2 horas
        $max_idle = 7200;
        if (isset($_SESSION['nuala_last_activity']) && (time() - (int) $_SESSION['nuala_last_activity']) > $max_idle) {
            $_SESSION['nuala_admin_auth'] = false;
            return false;
        }
        $_SESSION['nuala_last_activity'] = time();
        return true;
    }
}

if (!function_exists('get_csrf_token')) {
    /**
     * Obtiene o genera un token criptográfico CSRF para la sesión actual.
     */
    function get_csrf_token() {
        init_secure_session();
        if (empty($_SESSION['nuala_csrf_token'])) {
            $_SESSION['nuala_csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['nuala_csrf_token'];
    }
}

if (!function_exists('grant_admin_session')) {
    /**
     * Otorga sesión administrativa regenerando el ID de sesión para prevenir Session Fixation.
     */
    function grant_admin_session() {
        init_secure_session();
        if (session_status() === PHP_SESSION_ACTIVE && !headers_sent()) {
            @session_regenerate_id(true);
        }
        $_SESSION['nuala_admin_auth'] = true;
        $_SESSION['nuala_last_activity'] = time();
        $_SESSION['nuala_pin_failures'] = 0;
        $_SESSION['nuala_pin_lock_until'] = 0;
        return get_csrf_token();
    }
}

if (!function_exists('revoke_admin_session')) {
    /**
     * Cierra la sesión administrativa de forma segura.
     */
    function revoke_admin_session() {
        init_secure_session();
        $_SESSION['nuala_admin_auth'] = false;
        unset($_SESSION['nuala_csrf_token'], $_SESSION['nuala_last_activity']);
    }
}

if (!function_exists('require_admin_auth')) {
    /**
     * Exige sesión administrativa válida y token CSRF para endpoints transaccionales.
     */
    function require_admin_auth($accion_intentada = 'OPERACION_ADMIN') {
        if (!is_admin_authenticated()) {
            registrar_auditoria($accion_intentada, 'seguridad', null, null, ['motivo' => 'Sesion no autenticada'], 'DENEGADO');
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'auth_required' => true,
                'message' => 'Sesión administrativa expirada o no autorizada. Ingresa tu PIN nuevamente.'
            ]);
            exit();
        }

        $header_token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $session_token = get_csrf_token();

        if (empty($header_token) || !hash_equals($session_token, (string) $header_token)) {
            registrar_auditoria($accion_intentada, 'seguridad', null, null, ['motivo' => 'Token CSRF invalido o ausente'], 'DENEGADO');
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'auth_required' => true,
                'message' => 'Token de seguridad inválido. Recarga el panel e intenta nuevamente.'
            ]);
            exit();
        }
    }
}

if (!function_exists('check_pin_rate_limit')) {
    /**
     * Protege contra ataques de fuerza bruta al PIN administrativo (máximo 5 intentos cada 5 minutos).
     */
    function check_pin_rate_limit() {
        init_secure_session();
        $lock_until = isset($_SESSION['nuala_pin_lock_until']) ? (int) $_SESSION['nuala_pin_lock_until'] : 0;
        if ($lock_until > time()) {
            $remaining_seconds = $lock_until - time();
            return [
                'allowed' => false,
                'remaining_seconds' => $remaining_seconds
            ];
        }
        return ['allowed' => true, 'remaining_seconds' => 0];
    }
}

if (!function_exists('record_failed_pin_attempt')) {
    /**
     * Incrementa el contador de intentos fallidos de PIN y aplica bloqueo temporal si supera el umbral.
     */
    function record_failed_pin_attempt() {
        init_secure_session();
        $failures = isset($_SESSION['nuala_pin_failures']) ? ((int) $_SESSION['nuala_pin_failures'] + 1) : 1;
        $_SESSION['nuala_pin_failures'] = $failures;

        if ($failures >= 5) {
            $_SESSION['nuala_pin_lock_until'] = time() + 300; // 5 minutos
            $_SESSION['nuala_pin_failures'] = 0;
        }
    }
}

if (!function_exists('cleanup_orphan_image')) {
    /**
     * Elimina físicamente una imagen subida en assets/images/ únicamente si no es imagen base
     * y ningún producto, tienda o configuración la sigue utilizando.
     */
    function cleanup_orphan_image(PDO $db_conn, $image_url) {
        $clean_url = trim((string) $image_url);
        if (empty($clean_url) || strpos($clean_url, 'assets/images/') !== 0) {
            return;
        }

        // Proteger imágenes semilla corporativas por defecto (comparación normalizada en minúsculas)
        $protected_defaults = [
            'assets/images/tienda-nuala.jpg',
            'assets/images/tienda-nuala.webp',
            'assets/images/lenceria-femenina.jpg',
            'assets/images/lenceria-femenina.webp',
            'assets/images/lenceria-masculina.jpg',
            'assets/images/lenceria-masculina.webp'
        ];
        if (in_array(strtolower($clean_url), $protected_defaults, true)) {
            return;
        }

        // Prevenir Path Traversal
        $base_name = basename($clean_url);
        if ('assets/images/' . $base_name !== $clean_url) {
            return;
        }

        $stmt_c = $db_conn->prepare("SELECT COUNT(*) AS total FROM carousel_items WHERE LOWER(image) = LOWER(:img)");
        $stmt_c->execute([':img' => $clean_url]);
        $in_carousel = (int) $stmt_c->fetch()['total'];

        $stmt_s = $db_conn->prepare("SELECT COUNT(*) AS total FROM stores WHERE LOWER(image) = LOWER(:img)");
        $stmt_s->execute([':img' => $clean_url]);
        $in_stores = (int) $stmt_s->fetch()['total'];

        $stmt_cfg = $db_conn->prepare("SELECT COUNT(*) AS total FROM site_config WHERE LOWER(config_value) = LOWER(:img)");
        $stmt_cfg->execute([':img' => $clean_url]);
        $in_config = (int) $stmt_cfg->fetch()['total'];

        if ($in_carousel === 0 && $in_stores === 0 && $in_config === 0) {
            $full_file_path = __DIR__ . '/../../assets/images/' . $base_name;
            if (file_exists($full_file_path) && is_file($full_file_path)) {
                @unlink($full_file_path);
            }
        }
    }
}

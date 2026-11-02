<?php
@ini_set('upload_max_filesize', '50M');
@ini_set('post_max_size', '50M');
@ini_set('memory_limit', '256M');

require_once __DIR__ . '/helpers/SecurityHelper.php';
require_once __DIR__ . '/helpers/AuditHelper.php';
require_once __DIR__ . '/models/ConfigModel.php';
require_once __DIR__ . '/models/CarouselModel.php';
require_once __DIR__ . '/models/StoreModel.php';

init_secure_session();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

// CORS restringido únicamente al mismo origen
$request_origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$server_host = $_SERVER['HTTP_HOST'] ?? '';
if (!empty($request_origin) && !empty($server_host)) {
    $parsed_origin_host = parse_url($request_origin, PHP_URL_HOST);
    $parsed_origin_port = parse_url($request_origin, PHP_URL_PORT);
    $origin_full_host = $parsed_origin_host . ($parsed_origin_port ? ':' . $parsed_origin_port : '');
    if (strtolower($origin_full_host) === strtolower($server_host)) {
        header('Access-Control-Allow-Origin: ' . $request_origin);
        header('Access-Control-Allow-Credentials: true');
    }
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$action = isset($_GET['action']) ? strtolower(trim((string) $_GET['action'])) : '';

$input_raw = file_get_contents('php://input');
$decoded_json = !empty($input_raw) ? json_decode($input_raw, true) : null;
$input_data = is_array($decoded_json) ? $decoded_json : $_POST;

$config_model = new ConfigModel();
$carousel_model = new CarouselModel();
$store_model = new StoreModel();

/**
 * Procesa, recorta al centro y convierte obligatoriamente cualquier imagen válida a formato WebP (.webp).
 * Rechaza archivos corruptos o que no sean imágenes reales para evitar cargas maliciosas.
 */
function process_and_convert_to_webp($source_path, $destination_path, $target_w = 900, $target_h = 900, $quality = 82) {
    $image_info = @getimagesize($source_path);
    if (!$image_info || empty($image_info[0]) || empty($image_info[1])) {
        return false;
    }

    $orig_w = (int) $image_info[0];
    $orig_h = (int) $image_info[1];
    $mime = strtolower((string) ($image_info['mime'] ?? ''));

    switch ($mime) {
        case 'image/jpeg':
        case 'image/jpg':
            $src_img = @imagecreatefromjpeg($source_path);
            break;
        case 'image/png':
            $src_img = @imagecreatefrompng($source_path);
            break;
        case 'image/webp':
            $src_img = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($source_path) : false;
            break;
        case 'image/gif':
            $src_img = @imagecreatefromgif($source_path);
            break;
        default:
            return false;
    }

    if (!$src_img) {
        return false;
    }

    $src_aspect = $orig_w / $orig_h;
    $target_aspect = $target_w / $target_h;

    if ($src_aspect > $target_aspect) {
        $crop_h = $orig_h;
        $crop_w = (int) ($orig_h * $target_aspect);
        $crop_x = (int) (($orig_w - $crop_w) / 2);
        $crop_y = 0;
    } else {
        $crop_w = $orig_w;
        $crop_h = (int) ($orig_w / $target_aspect);
        $crop_x = 0;
        $crop_y = (int) (($orig_h - $crop_h) / 2);
    }

    $dest_img = imagecreatetruecolor($target_w, $target_h);
    imagealphablending($dest_img, false);
    imagesavealpha($dest_img, true);

    imagecopyresampled(
        $dest_img,
        $src_img,
        0, 0,
        $crop_x, $crop_y,
        $target_w, $target_h,
        $crop_w, $crop_h
    );

    $success = function_exists('imagewebp')
        ? @imagewebp($dest_img, $destination_path, $quality)
        : @imagejpeg($dest_img, $destination_path, $quality);

    imagedestroy($src_img);
    imagedestroy($dest_img);

    return $success;
}

try {
    switch ($action) {
        case 'get_data':
            $is_admin = is_admin_authenticated();
            $response_payload = [
                'success' => true,
                'config' => $config_model->get_all_config(),
                'products' => $carousel_model->get_all_items(),
                'stores' => $store_model->get_all_stores(false),
                'is_admin' => $is_admin
            ];
            if ($is_admin) {
                $response_payload['csrf_token'] = get_csrf_token();
                $response_payload['admin_stores'] = $store_model->get_all_stores(true);
                $response_payload['audit_logs'] = obtener_auditoria_reciente(35);
            }
            echo json_encode($response_payload);
            break;

        case 'verify_pin':
            $rate_status = check_pin_rate_limit();
            if (!$rate_status['allowed']) {
                registrar_auditoria('LOGIN_ADMIN_BLOQUEADO', 'seguridad', null, null, ['segundos_restantes' => $rate_status['remaining_seconds']], 'DENEGADO');
                http_response_code(429);
                echo json_encode([
                    'success' => false,
                    'message' => 'Demasiados intentos fallidos. Espera ' . ceil($rate_status['remaining_seconds'] / 60) . ' minuto(s) por seguridad.'
                ]);
                break;
            }

            $pin_input = isset($input_data['pin']) ? (string) $input_data['pin'] : '';
            $is_valid = $config_model->verify_pin($pin_input);

            if ($is_valid) {
                $csrf_token = grant_admin_session();
                registrar_auditoria('LOGIN_ADMIN', 'seguridad', 'admin_panel', null, ['acceso' => 'concedido'], 'EXITOSO');
                echo json_encode([
                    'success' => true,
                    'csrf_token' => $csrf_token,
                    'admin_stores' => $store_model->get_all_stores(true),
                    'audit_logs' => obtener_auditoria_reciente(35),
                    'message' => 'Acceso concedido al panel de configuración.'
                ]);
            } else {
                record_failed_pin_attempt();
                registrar_auditoria('LOGIN_ADMIN_FALLIDO', 'seguridad', 'admin_panel', null, ['acceso' => 'denegado'], 'DENEGADO');
                echo json_encode([
                    'success' => false,
                    'message' => 'PIN de seguridad incorrecto.'
                ]);
            }
            break;

        case 'logout_admin':
            if (is_admin_authenticated()) {
                registrar_auditoria('LOGOUT_ADMIN', 'seguridad', 'admin_panel', null, ['sesion' => 'cerrada'], 'EXITOSO');
            }
            revoke_admin_session();
            echo json_encode([
                'success' => true,
                'message' => 'Sesión administrativa cerrada correctamente.'
            ]);
            break;

        case 'track_store_click':
            $store_id = isset($input_data['store_id']) ? (int) $input_data['store_id'] : 0;
            $channel = isset($input_data['channel']) ? (string) $input_data['channel'] : '';
            $recorded = $store_model->record_store_interaction($store_id, $channel);
            echo json_encode(['success' => $recorded]);
            break;

        case 'upload_image':
            require_admin_auth('SUBIR_IMAGEN');
            if (isset($_FILES['image_file']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK) {
                $file_tmp = $_FILES['image_file']['tmp_name'];
                $file_name = $_FILES['image_file']['name'];
                $file_size = (int) ($_FILES['image_file']['size'] ?? 0);

                if ($file_size <= 0 || $file_size > 15 * 1024 * 1024) {
                    echo json_encode([
                        'success' => false,
                        'message' => 'El tamaño de la imagen no debe superar los 15 MB.'
                    ]);
                    exit();
                }

                $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
                $allowed_extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

                if (!in_array($file_ext, $allowed_extensions, true)) {
                    registrar_auditoria('SUBIR_IMAGEN_RECHAZADA', 'multimedia', null, null, ['ext' => $file_ext], 'DENEGADO');
                    echo json_encode([
                        'success' => false,
                        'message' => 'Formato no permitido. Solo se aceptan JPG, PNG, WEBP y GIF.'
                    ]);
                    exit();
                }

                $target_dir = __DIR__ . '/../assets/images/';
                if (!file_exists($target_dir)) {
                    mkdir($target_dir, 0777, true);
                }

                $new_filename = 'nuala_' . time() . '_' . random_int(100, 999) . '.webp';
                $destination_path = $target_dir . $new_filename;

                $converted_ok = process_and_convert_to_webp($file_tmp, $destination_path, 900, 900, 82);

                if (!$converted_ok) {
                    registrar_auditoria('SUBIR_IMAGEN_INVALIDA', 'multimedia', null, null, ['archivo' => basename($file_name)], 'ERROR');
                    echo json_encode([
                        'success' => false,
                        'message' => 'El archivo no es una imagen válida o está dañado.'
                    ]);
                    exit();
                }

                $relative_url = 'assets/images/' . $new_filename;
                registrar_auditoria('SUBIR_IMAGEN', 'multimedia', $new_filename, null, ['image_url' => $relative_url], 'EXITOSO');

                echo json_encode([
                    'success' => true,
                    'message' => 'Imagen procesada, optimizada y convertida a WebP (.webp) correctamente.',
                    'image_url' => $relative_url,
                    'audit_logs' => obtener_auditoria_reciente(35)
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'No se recibió ningún archivo de imagen válido.'
                ]);
            }
            break;

        case 'save_config':
            require_admin_auth('ACTUALIZAR_CONFIGURACION');
            $configs_to_save = isset($input_data['configs']) && is_array($input_data['configs']) ? $input_data['configs'] : [];
            if (!empty($configs_to_save)) {
                $config_model->save_configs($configs_to_save);
                echo json_encode([
                    'success' => true,
                    'message' => 'Configuración actualizada correctamente.',
                    'config' => $config_model->get_all_config(),
                    'audit_logs' => obtener_auditoria_reciente(35)
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'No se enviaron datos de configuración.']);
            }
            break;

        case 'add_product':
            require_admin_auth('CREAR_PRODUCTO');
            $new_product = $carousel_model->add_item($input_data);
            echo json_encode([
                'success' => true,
                'message' => 'Prenda añadida al carrusel correctamente.',
                'product' => $new_product,
                'products' => $carousel_model->get_all_items(),
                'audit_logs' => obtener_auditoria_reciente(35)
            ]);
            break;

        case 'update_product':
            require_admin_auth('ACTUALIZAR_PRODUCTO');
            $product_id = isset($input_data['id']) ? (int) $input_data['id'] : 0;
            if ($product_id > 0) {
                $updated_product = $carousel_model->update_item($product_id, $input_data);
                echo json_encode([
                    'success' => true,
                    'message' => 'Prenda actualizada correctamente.',
                    'product' => $updated_product,
                    'products' => $carousel_model->get_all_items(),
                    'audit_logs' => obtener_auditoria_reciente(35)
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ID de prenda inválido.']);
            }
            break;

        case 'delete_product':
            require_admin_auth('ELIMINAR_PRODUCTO');
            $product_id = isset($input_data['id']) ? (int) $input_data['id'] : 0;
            if ($product_id > 0) {
                $carousel_model->delete_item($product_id);
                echo json_encode([
                    'success' => true,
                    'message' => 'Prenda eliminada del proyecto.',
                    'products' => $carousel_model->get_all_items(),
                    'audit_logs' => obtener_auditoria_reciente(35)
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ID de prenda inválido.']);
            }
            break;

        case 'add_store':
            require_admin_auth('CREAR_TIENDA');
            $new_store = $store_model->add_store($input_data);
            echo json_encode([
                'success' => true,
                'message' => 'Tienda registrada correctamente.',
                'store' => $new_store,
                'stores' => $store_model->get_all_stores(false),
                'admin_stores' => $store_model->get_all_stores(true),
                'audit_logs' => obtener_auditoria_reciente(35)
            ]);
            break;

        case 'update_store':
            require_admin_auth('ACTUALIZAR_TIENDA');
            $store_id = isset($input_data['id']) ? (int) $input_data['id'] : 0;
            if ($store_id > 0) {
                $updated_store = $store_model->update_store($store_id, $input_data);
                echo json_encode([
                    'success' => true,
                    'message' => 'Tienda y dirección actualizadas correctamente.',
                    'store' => $updated_store,
                    'stores' => $store_model->get_all_stores(false),
                    'admin_stores' => $store_model->get_all_stores(true),
                    'audit_logs' => obtener_auditoria_reciente(35)
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ID de tienda inválido.']);
            }
            break;

        case 'toggle_store_status':
            require_admin_auth('CAMBIAR_ESTATUS_TIENDA');
            $store_id = isset($input_data['id']) ? (int) $input_data['id'] : 0;
            $store_active = isset($input_data['store_active']) ? (int) $input_data['store_active'] : 1;
            if ($store_id > 0) {
                $updated_store = $store_model->toggle_store_status($store_id, $store_active);
                echo json_encode([
                    'success' => true,
                    'message' => $store_active ? 'Tienda publicada en el sitio.' : 'Tienda pausada/oculta temporalmente.',
                    'store' => $updated_store,
                    'stores' => $store_model->get_all_stores(false),
                    'admin_stores' => $store_model->get_all_stores(true),
                    'audit_logs' => obtener_auditoria_reciente(35)
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ID de tienda inválido.']);
            }
            break;

        case 'delete_store':
            require_admin_auth('ELIMINAR_TIENDA');
            $store_id = isset($input_data['id']) ? (int) $input_data['id'] : 0;
            if ($store_id > 0) {
                $store_model->delete_store($store_id);
                echo json_encode([
                    'success' => true,
                    'message' => 'Tienda eliminada del proyecto.',
                    'stores' => $store_model->get_all_stores(false),
                    'admin_stores' => $store_model->get_all_stores(true),
                    'audit_logs' => obtener_auditoria_reciente(35)
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ID de tienda inválido.']);
            }
            break;

        case 'get_audit_logs':
            require_admin_auth('CONSULTAR_AUDITORIA');
            echo json_encode([
                'success' => true,
                'audit_logs' => obtener_auditoria_reciente(50)
            ]);
            break;

        default:
            echo json_encode([
                'success' => false,
                'message' => 'Acción no reconocida en la API.'
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el servidor: ' . $e->getMessage()
    ]);
}

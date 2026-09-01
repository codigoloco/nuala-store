<?php
@ini_set('upload_max_filesize', '500M');
@ini_set('post_max_size', '500M');
@ini_set('memory_limit', '512M');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/models/ConfigModel.php';
require_once __DIR__ . '/models/CarouselModel.php';
require_once __DIR__ . '/models/StoreModel.php';

$action = isset($_GET['action']) ? strtolower(trim($_GET['action'])) : '';

$input_raw = file_get_contents('php://input');
$input_data = json_decode($input_raw, true) ?? $_POST;

$config_model = new ConfigModel();
$carousel_model = new CarouselModel();
$store_model = new StoreModel();

/**
 * Procesa, recorta al centro y convierte automáticamente cualquier imagen subida al formato ultraliviano WebP (.webp).
 * Se ejecuta automáticamente cada vez que se sube un nuevo archivo para garantizar un peso mínimo (~30-50KB).
 */
function process_and_convert_to_webp($source_path, $destination_path, $target_w = 900, $target_h = 900, $quality = 82) {
    $image_info = getimagesize($source_path);
    if (!$image_info) return false;

    $orig_w = $image_info[0];
    $orig_h = $image_info[1];
    $mime = strtolower($image_info['mime']);

    switch ($mime) {
        case 'image/jpeg':
        case 'image/jpg':
            $src_img = @imagecreatefromjpeg($source_path);
            break;
        case 'image/png':
            $src_img = @imagecreatefrompng($source_path);
            break;
        case 'image/webp':
            $src_img = @imagecreatefromwebp($source_path);
            break;
        case 'image/gif':
            $src_img = @imagecreatefromgif($source_path);
            break;
        default:
            return false;
    }

    if (!$src_img) return false;

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

    // Preservar canal alfa (transparencia) si procede antes de convertir a WebP
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

    // Guardar en formato moderno WebP
    $success = imagewebp($dest_img, $destination_path, $quality);

    imagedestroy($src_img);
    imagedestroy($dest_img);

    return $success;
}

try {
    switch ($action) {
        case 'upload_image':
            if (isset($_FILES['image_file']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK) {
                $file_tmp = $_FILES['image_file']['tmp_name'];
                $file_name = $_FILES['image_file']['name'];

                $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
                $allowed_extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

                if (!in_array($file_ext, $allowed_extensions)) {
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

                // Generar nombre de destino estandarizado en formato WebP (.webp)
                $new_filename = 'nuala_' . time() . '_' . rand(100, 999) . '.webp';
                $destination_path = $target_dir . $new_filename;

                // Ejecutar compresión y conversión automática a WebP
                $converted_ok = process_and_convert_to_webp($file_tmp, $destination_path, 900, 900, 82);

                if (!$converted_ok) {
                    move_uploaded_file($file_tmp, $destination_path);
                }

                $relative_url = 'assets/images/' . $new_filename;
                echo json_encode([
                    'success' => true,
                    'message' => 'Imagen procesada, optimizada y convertida a WebP (.webp) correctamente.',
                    'image_url' => $relative_url
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'No se recibió ningún archivo de imagen válido.'
                ]);
            }
            break;

        case 'get_data':
            echo json_encode([
                'success' => true,
                'config' => $config_model->get_all_config(),
                'products' => $carousel_model->get_all_items(),
                'stores' => $store_model->get_all_stores()
            ]);
            break;

        case 'verify_pin':
            $pin_input = isset($input_data['pin']) ? $input_data['pin'] : '';
            $is_valid = $config_model->verify_pin($pin_input);
            echo json_encode([
                'success' => $is_valid,
                'message' => $is_valid ? 'Acceso concedido al panel de configuración.' : 'PIN de seguridad incorrecto.'
            ]);
            break;

        case 'save_config':
            $configs_to_save = isset($input_data['configs']) ? $input_data['configs'] : [];
            if (!empty($configs_to_save)) {
                $config_model->save_configs($configs_to_save);
                echo json_encode([
                    'success' => true,
                    'message' => 'Configuración actualizada correctamente.',
                    'config' => $config_model->get_all_config()
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'No se enviaron datos de configuración.']);
            }
            break;

        case 'add_product':
            $new_product = $carousel_model->add_item($input_data);
            echo json_encode([
                'success' => true,
                'message' => 'Prenda añadida al carrusel correctamente.',
                'product' => $new_product,
                'products' => $carousel_model->get_all_items()
            ]);
            break;

        case 'update_product':
            $product_id = isset($input_data['id']) ? (int) $input_data['id'] : 0;
            if ($product_id > 0) {
                $updated_product = $carousel_model->update_item($product_id, $input_data);
                echo json_encode([
                    'success' => true,
                    'message' => 'Prenda actualizada correctamente.',
                    'product' => $updated_product,
                    'products' => $carousel_model->get_all_items()
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ID de prenda inválido.']);
            }
            break;

        case 'delete_product':
            $product_id = isset($input_data['id']) ? (int) $input_data['id'] : 0;
            if ($product_id > 0) {
                $carousel_model->delete_item($product_id);
                echo json_encode([
                    'success' => true,
                    'message' => 'Prenda y archivo de imagen eliminados del proyecto.',
                    'products' => $carousel_model->get_all_items()
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ID de prenda inválido.']);
            }
            break;

        case 'add_store':
            $new_store = $store_model->add_store($input_data);
            echo json_encode([
                'success' => true,
                'message' => 'Tienda registrada correctamente.',
                'store' => $new_store,
                'stores' => $store_model->get_all_stores()
            ]);
            break;

        case 'update_store':
            $store_id = isset($input_data['id']) ? (int) $input_data['id'] : 0;
            if ($store_id > 0) {
                $updated_store = $store_model->update_store($store_id, $input_data);
                echo json_encode([
                    'success' => true,
                    'message' => 'Tienda y dirección actualizadas correctamente.',
                    'store' => $updated_store,
                    'stores' => $store_model->get_all_stores()
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ID de tienda inválido.']);
            }
            break;

        case 'delete_store':
            $store_id = isset($input_data['id']) ? (int) $input_data['id'] : 0;
            if ($store_id > 0) {
                $store_model->delete_store($store_id);
                echo json_encode([
                    'success' => true,
                    'message' => 'Tienda y archivo de imagen eliminados del proyecto.',
                    'stores' => $store_model->get_all_stores()
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'ID de tienda inválido.']);
            }
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

<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../helpers/AuditHelper.php';
require_once __DIR__ . '/../helpers/SecurityHelper.php';

/**
 * Modelo para gestionar los productos/diapositivas del carrusel (carousel_items).
 * Incluye especificación obligatoria de Docena o Unidad (preferencia por Docena).
 * Sigue el principio de Responsabilidad Única (SRP - SOLID) y snake_case.
 */
class CarouselModel {
    private $db_connection;

    public function __construct() {
        $this->db_connection = Database::get_instance()->get_connection();
    }

    /**
     * Normaliza la unidad de presentación del producto (Docena por defecto o Unidad).
     */
    private function normalize_unit_type($raw_unit) {
        $normalized = mb_strtolower(trim((string) $raw_unit), 'UTF-8');
        if ($normalized === 'unidad' || $normalized === 'unidades') {
            return 'Unidad';
        }
        return 'Docena';
    }

    /**
     * Obtiene todos los ítems del carrusel especificando su unidad (Docena / Unidad).
     */
    public function get_all_items() {
        $stmt_query = $this->db_connection->query("SELECT * FROM carousel_items ORDER BY id DESC");
        $items = $stmt_query->fetchAll();
        foreach ($items as &$item_row) {
            $item_row['unit_type'] = $this->normalize_unit_type($item_row['unit_type'] ?? 'Docena');
        }
        return $items;
    }

    /**
     * Obtiene un ítem del carrusel por su ID.
     */
    public function get_item_by_id($item_id) {
        $stmt_query = $this->db_connection->prepare("SELECT * FROM carousel_items WHERE id = :id");
        $stmt_query->execute([':id' => (int) $item_id]);
        $item_row = $stmt_query->fetch();
        if ($item_row) {
            $item_row['unit_type'] = $this->normalize_unit_type($item_row['unit_type'] ?? 'Docena');
        }
        return $item_row;
    }

    /**
     * Agrega un nuevo producto/diapositiva al carrusel registrando auditoría.
     */
    public function add_item($data_item) {
        $unit_type = $this->normalize_unit_type($data_item['unit_type'] ?? 'Docena');

        $stmt_insert = $this->db_connection->prepare("
            INSERT INTO carousel_items (name, category, price, unit_type, description, image)
            VALUES (:name, :category, :price, :unit_type, :description, :image)
        ");
        $stmt_insert->execute([
            ':name' => trim((string) ($data_item['name'] ?? '')),
            ':category' => trim((string) ($data_item['category'] ?? 'Dama')),
            ':price' => trim((string) ($data_item['price'] ?? '')),
            ':unit_type' => $unit_type,
            ':description' => isset($data_item['description']) ? trim((string) $data_item['description']) : '',
            ':image' => isset($data_item['image']) && !empty($data_item['image']) ? trim((string) $data_item['image']) : 'assets/images/lenceria-femenina.webp'
        ]);

        $new_id = (int) $this->db_connection->lastInsertId();
        $created_item = $this->get_item_by_id($new_id);

        registrar_auditoria('CREAR_PRODUCTO', 'productos', $new_id, null, $created_item, 'EXITOSO');

        return $created_item;
    }

    /**
     * Actualiza un ítem/imagen existente del carrusel registrando auditoría.
     */
    public function update_item($item_id, $data_item) {
        $previous_item = $this->get_item_by_id($item_id);
        if (!$previous_item) {
            return null;
        }

        $unit_type = $this->normalize_unit_type($data_item['unit_type'] ?? $previous_item['unit_type'] ?? 'Docena');
        $new_image = isset($data_item['image']) && !empty($data_item['image']) ? trim((string) $data_item['image']) : $previous_item['image'];

        $stmt_update = $this->db_connection->prepare("
            UPDATE carousel_items
            SET name = :name,
                category = :category,
                price = :price,
                unit_type = :unit_type,
                description = :description,
                image = :image
            WHERE id = :id
        ");
        $stmt_update->execute([
            ':id' => (int) $item_id,
            ':name' => trim((string) ($data_item['name'] ?? $previous_item['name'])),
            ':category' => trim((string) ($data_item['category'] ?? $previous_item['category'])),
            ':price' => trim((string) ($data_item['price'] ?? $previous_item['price'])),
            ':unit_type' => $unit_type,
            ':description' => isset($data_item['description']) ? trim((string) $data_item['description']) : $previous_item['description'],
            ':image' => $new_image
        ]);

        if (!empty($previous_item['image']) && strtolower($previous_item['image']) !== strtolower($new_image)) {
            cleanup_orphan_image($this->db_connection, $previous_item['image']);
        }

        $updated_item = $this->get_item_by_id($item_id);
        registrar_auditoria('ACTUALIZAR_PRODUCTO', 'productos', $item_id, $previous_item, $updated_item, 'EXITOSO');

        return $updated_item;
    }

    /**
     * Elimina un ítem del carrusel por su ID, limpia su archivo huérfano y registra auditoría.
     */
    public function delete_item($item_id) {
        $previous_item = $this->get_item_by_id($item_id);
        if (!$previous_item) {
            return false;
        }

        $stmt_delete = $this->db_connection->prepare("DELETE FROM carousel_items WHERE id = :id");
        $result = $stmt_delete->execute([':id' => (int) $item_id]);

        if ($result) {
            cleanup_orphan_image($this->db_connection, $previous_item['image']);
            registrar_auditoria('ELIMINAR_PRODUCTO', 'productos', $item_id, $previous_item, null, 'EXITOSO');
        }

        return $result;
    }
}

<?php
/**
 * Clase Singleton para gestionar la conexión a SQLite3 mediante PDO.
 * Sigue el principio de Responsabilidad Única (SRP) y Patrón Singleton (SOLID).
 * Variables en snake_case.
 */
class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        $db_dir = __DIR__ . '/../../database';
        if (!file_exists($db_dir)) {
            mkdir($db_dir, 0777, true);
        }

        $db_path = $db_dir . '/nuala.db';
        $this->pdo = new PDO('sqlite:' . $db_path);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        // Mejorar concurrencia e integridad en SQLite3
        $this->pdo->exec('PRAGMA foreign_keys = ON;');
        $this->pdo->exec('PRAGMA journal_mode = WAL;');

        $this->init_tables();
    }

    /**
     * Obtiene la instancia única de la base de datos (Singleton).
     */
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    /**
     * Retorna la conexión PDO.
     */
    public function get_connection() {
        return $this->pdo;
    }

    /**
     * Catálogo oficial depurado de las 30 tiendas NUALA en 17 estados.
     * Centralizado en un único método para evitar duplicación de datos (DRY).
     */
    public static function get_official_stores_catalog() {
        return [
            [
                'name' => 'Nuala Catia III',
                'city' => 'Caracas',
                'state' => 'Distrito Capital',
                'address' => 'Boulevard de Catia, Av. España, frente a Perfumes Factory, Caracas.',
                'phone' => '',
                'whatsapp' => '',
                'whatsapp_active' => 0,
                'instagram' => '@nuala.catia1',
                'instagram_active' => 1,
                'tiktok' => '@nuala.catia.1',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.google.com/maps?q=10.511477,-66.9470344&z=17&hl=es',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Catia II',
                'city' => 'Caracas',
                'state' => 'Distrito Capital',
                'address' => 'Boulevard de Catia, entre la 2da. y 3ra. Avenida, al lado de La Casa del Perfume, Caracas.',
                'phone' => '',
                'whatsapp' => '',
                'whatsapp_active' => 0,
                'instagram' => '@nuala.catia2',
                'instagram_active' => 1,
                'tiktok' => '@nuala.catia.2',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.google.com/maps/search/La%20Casa%20del%20Perfume%20Catia/@10.51216552,-66.94706612,17z?hl=es',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala La Hoyada (Detal)',
                'city' => 'Caracas',
                'state' => 'Distrito Capital',
                'address' => 'Av. Cují, esquina Salvador de León, a media cuadra del Metro La Hoyada en dirección Av. Urdaneta, diagonal al Tijerazo y frente a tienda Wax, Caracas.',
                'phone' => '',
                'whatsapp' => '04149021586',
                'whatsapp_active' => 1,
                'instagram' => '@nuala.lahoyada',
                'instagram_active' => 1,
                'tiktok' => '@nuala.hoyada',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/n6PMRtVfZMpYRsfM7',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Sabana Grande',
                'city' => 'Caracas',
                'state' => 'Distrito Capital',
                'address' => 'Boulevard de Sabana Grande, al lado de la Prefectura de Sabana Grande, Caracas.',
                'phone' => '',
                'whatsapp' => '04142855982',
                'whatsapp_active' => 1,
                'instagram' => '@nuala.sabanagrande',
                'instagram_active' => 1,
                'tiktok' => '@nualasabanagrande',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/hPUKmvhZfNbKRVbw6',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala La Hoyada (Mayor)',
                'city' => 'Caracas',
                'state' => 'Distrito Capital',
                'address' => 'Av. Cují con esquina Salvador de León, diagonal a la tienda Wrangler, La Hoyada, Caracas.',
                'phone' => '',
                'whatsapp' => '04120239438',
                'whatsapp_active' => 1,
                'instagram' => '@nuala.mayor',
                'instagram_active' => 1,
                'tiktok' => '@nuala.mayorccs',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/Wv3xKzcwmxSn3Cte7',
                'maps_active' => 1,
                'cashea_active' => 0,
                'sale_type' => 'Mayor',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 8:30 AM - 6:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Maracay I',
                'city' => 'Maracay',
                'state' => 'Aragua',
                'address' => 'Av. Bolívar, frente a Mundo Total, Maracay.',
                'phone' => '',
                'whatsapp' => '04220045196',
                'whatsapp_active' => 1,
                'instagram' => '@nuala.mcy',
                'instagram_active' => 1,
                'tiktok' => '@nualamaracay',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/nz4roXGdv3HrG2vU6',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Maracay II',
                'city' => 'Maracay',
                'state' => 'Aragua',
                'address' => 'Av. Bolívar Oeste, diagonal al Boulevard Pérez Almarza, al lado de Ovejita, Maracay.',
                'phone' => '',
                'whatsapp' => '',
                'whatsapp_active' => 0,
                'instagram' => '@nualamaracay',
                'instagram_active' => 1,
                'tiktok' => '',
                'tiktok_active' => 0,
                'maps_url' => 'https://maps.app.goo.gl/tvkEWh6ZSX9r7MWQA',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala La Victoria I',
                'city' => 'La Victoria',
                'state' => 'Aragua',
                'address' => 'Av. Francisco de Loreto, cruce con calle Libertador, antigua Zapatería La Elegancia, La Victoria.',
                'phone' => '',
                'whatsapp' => '04226445657',
                'whatsapp_active' => 1,
                'instagram' => '@nuala_lavictoria1',
                'instagram_active' => 1,
                'tiktok' => '@nuala.lavictoria1',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/eqLPN2d8JLKhGuqx7',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala La Victoria II',
                'city' => 'La Victoria',
                'state' => 'Aragua',
                'address' => 'Av. Francisco de Loreto con calle Campo Elías, frente a la plaza, al lado de Farmacias SAAS, La Victoria.',
                'phone' => '',
                'whatsapp' => '04220074949',
                'whatsapp_active' => 1,
                'instagram' => '@nuala.lavictoria2',
                'instagram_active' => 1,
                'tiktok' => '@nuala.lavictoria2',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/mW6KYU9E2rTmwtmP7',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Puerto La Cruz',
                'city' => 'Puerto La Cruz',
                'state' => 'Anzoátegui',
                'address' => 'Calle Sucre con Av. 5 de Julio, Edificio Ely Cohen, Puerto La Cruz.',
                'phone' => '',
                'whatsapp' => '04128667330',
                'whatsapp_active' => 1,
                'instagram' => '@nuala.puertolacruz',
                'instagram_active' => 1,
                'tiktok' => '@nuala.puertolacruz',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/28fqohGtMav1bEcs5',
                'maps_active' => 1,
                'cashea_active' => 0,
                'sale_type' => 'Mayor y Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Barinas',
                'city' => 'Barinas',
                'state' => 'Barinas',
                'address' => 'Av. Medina Jiménez con calle Camejo, diagonal a la Plaza del Estudiante, al lado de El Castillo, Barinas.',
                'phone' => '',
                'whatsapp' => '04129741073',
                'whatsapp_active' => 1,
                'instagram' => '@nualabarinas',
                'instagram_active' => 1,
                'tiktok' => '@nuala.barinas',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/4xNkToLmYQPGcSER6',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala San Félix',
                'city' => 'San Félix',
                'state' => 'Bolívar',
                'address' => 'Calle Ramírez, sector Centro, frente al Palacio del Blumer, San Félix.',
                'phone' => '',
                'whatsapp' => '04120846599',
                'whatsapp_active' => 1,
                'instagram' => '@nualasanfelix',
                'instagram_active' => 1,
                'tiktok' => '@nuala.sanfelix',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/DMzS3BBzPcjwj76y9',
                'maps_active' => 1,
                'cashea_active' => 0,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Valencia I',
                'city' => 'Valencia',
                'state' => 'Carabobo',
                'address' => 'Calle Díaz Moreno, diagonal a Banesco y al Banco de Venezuela, Centro, Valencia.',
                'phone' => '',
                'whatsapp' => '04127426679',
                'whatsapp_active' => 1,
                'instagram' => '@nualavalencia',
                'instagram_active' => 1,
                'tiktok' => '@nualavalencia',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/XJepQw1kdHqa26M18',
                'maps_active' => 1,
                'cashea_active' => 0,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Valencia II (Mayor)',
                'city' => 'Valencia',
                'state' => 'Carabobo',
                'address' => 'Mercado Guajiro, calle 73, Urb. La Castellana, al lado del Palacio del Blumer, Valencia.',
                'phone' => '',
                'whatsapp' => '04242928284',
                'whatsapp_active' => 1,
                'instagram' => '@nualavalenciamayor',
                'instagram_active' => 1,
                'tiktok' => '@nualavalenciamayor',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/3xRsjoDbhc3hjLQ3A',
                'maps_active' => 1,
                'cashea_active' => 0,
                'sale_type' => 'Mayor',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 8:30 AM - 6:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Coro',
                'city' => 'Coro',
                'state' => 'Falcón',
                'address' => 'Av. Manaure, frente a la Plaza Linares, antiguo Gina, Coro.',
                'phone' => '',
                'whatsapp' => '04246188886',
                'whatsapp_active' => 1,
                'instagram' => '@nualacoro',
                'instagram_active' => 1,
                'tiktok' => '@nualacoroo',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/1zmF9JKgs4Gjrbpa8',
                'maps_active' => 1,
                'cashea_active' => 0,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Punto Fijo',
                'city' => 'Punto Fijo',
                'state' => 'Falcón',
                'address' => 'Av. Colombia, entre calles Garcés y Zamora, diagonal a la antigua línea de transporte La Responsable, Punto Fijo.',
                'phone' => '',
                'whatsapp' => '04121014597',
                'whatsapp_active' => 1,
                'instagram' => '@nualapuntofijo',
                'instagram_active' => 1,
                'tiktok' => '@nualapuntofijo',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/BCx7TyrxfDZ41UJXA',
                'maps_active' => 1,
                'cashea_active' => 0,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Barquisimeto',
                'city' => 'Barquisimeto',
                'state' => 'Lara',
                'address' => 'Av. 20, entre calles 27 y 28, frente al antiguo Beco, Barquisimeto.',
                'phone' => '',
                'whatsapp' => '04125226694',
                'whatsapp_active' => 1,
                'instagram' => '@nualabqto',
                'instagram_active' => 1,
                'tiktok' => '',
                'tiktok_active' => 0,
                'maps_url' => 'https://maps.app.goo.gl/YefKzc6BxY7SHv8U6',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala La Guaira',
                'city' => 'Maiquetía',
                'state' => 'La Guaira',
                'address' => 'Calle Cristo a Jefatura, sector Maiquetía, frente a la tienda Canguro, La Guaira.',
                'phone' => '',
                'whatsapp' => '04149225052',
                'whatsapp_active' => 1,
                'instagram' => '@nuala.laguaira',
                'instagram_active' => 1,
                'tiktok' => '@nuala_laguaira',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.google.com/maps?q=10.5956233,-66.9514873&z=17&hl=es',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala El Vigía',
                'city' => 'El Vigía',
                'state' => 'Mérida',
                'address' => 'Calle 3 con Av. 13, al lado de la Librería Carmina, El Vigía.',
                'phone' => '',
                'whatsapp' => '04129526347',
                'whatsapp_active' => 1,
                'instagram' => '@nuala_elvigia',
                'instagram_active' => 1,
                'tiktok' => '@nuala_elvigia',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/ghuBhpniE7fog1gB7',
                'maps_active' => 1,
                'cashea_active' => 0,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Maturín I',
                'city' => 'Maturín',
                'state' => 'Monagas',
                'address' => 'Av. Bolívar, sector Centro, frente a CANTV/Ipostel, al lado de Optiahorro, Maturín.',
                'phone' => '',
                'whatsapp' => '04126523280',
                'whatsapp_active' => 1,
                'instagram' => '@nualamaturin',
                'instagram_active' => 1,
                'tiktok' => '@nualamaturin',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/z413avnj56YQfXA67',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Maturín II',
                'city' => 'Maturín',
                'state' => 'Monagas',
                'address' => 'Av. Juncal con Av. Bolívar, antiguo Tejidos Fernández, Maturín.',
                'phone' => '',
                'whatsapp' => '04226825222',
                'whatsapp_active' => 1,
                'instagram' => '@nuala.maturin2',
                'instagram_active' => 1,
                'tiktok' => '@nuala.maturin2',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/NAKr6UKNMDqyLxJN6',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Santa Teresa',
                'city' => 'Santa Teresa del Tuy',
                'state' => 'Miranda',
                'address' => 'Calle Ayacucho, entre Boulevard Libertador y calle El Carmen, Casco Central, al lado de Mundo Total, Santa Teresa del Tuy.',
                'phone' => '',
                'whatsapp' => '04242314388',
                'whatsapp_active' => 1,
                'instagram' => '@nualasantateresa',
                'instagram_active' => 1,
                'tiktok' => '@nualasantateresa',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/oAPN3zWqsZg6feZ4A',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Charallave',
                'city' => 'Charallave',
                'state' => 'Miranda',
                'address' => 'Av. Bolívar, sector Pueblo Abajo, al lado de La Casa del Perfume, Charallave.',
                'phone' => '',
                'whatsapp' => '04122993611',
                'whatsapp_active' => 1,
                'instagram' => '@nuala_charallave',
                'instagram_active' => 1,
                'tiktok' => '@nuala.charallave',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.google.com/maps?q=10.240075,-66.8586522&z=17&hl=es',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Acarigua',
                'city' => 'Acarigua',
                'state' => 'Portuguesa',
                'address' => 'Av. Libertador con calle 29, frente a la Zapatería Maracaibo, Acarigua.',
                'phone' => '',
                'whatsapp' => '04245980110',
                'whatsapp_active' => 1,
                'instagram' => '@nualaacarigua',
                'instagram_active' => 1,
                'tiktok' => '@nualaacarigua0',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/t3sqnvky9ekC1RKr6',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Cumaná',
                'city' => 'Cumaná',
                'state' => 'Sucre',
                'address' => 'Av. Bermúdez con calle Gutiérrez, frente al Banco Mercantil, Cumaná.',
                'phone' => '',
                'whatsapp' => '04122084312',
                'whatsapp_active' => 1,
                'instagram' => '@nuala_cumana',
                'instagram_active' => 1,
                'tiktok' => '@nualacumana',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/ia5t6iKBcC5W4EmS6',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Valera',
                'city' => 'Valera',
                'state' => 'Trujillo',
                'address' => 'Av. 10, entre calles 10 y 11, frente a Total Panda, al lado de Kazamarca, Valera.',
                'phone' => '',
                'whatsapp' => '04122927511',
                'whatsapp_active' => 1,
                'instagram' => '@nuala.valera',
                'instagram_active' => 1,
                'tiktok' => '@nuala.valera',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/cWToaQEYgZYJKJ3J9',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala San Felipe',
                'city' => 'San Felipe',
                'state' => 'Yaracuy',
                'address' => '5ta. Avenida con calle Patria, frente a Daka, San Felipe.',
                'phone' => '',
                'whatsapp' => '04262972295',
                'whatsapp_active' => 1,
                'instagram' => '@nualasanfelipe',
                'instagram_active' => 1,
                'tiktok' => '@nualasanfelipe',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/kWTfWp6FxRsUPoc68',
                'maps_active' => 1,
                'cashea_active' => 0,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Maracaibo Galerías',
                'city' => 'Maracaibo',
                'state' => 'Zulia',
                'address' => 'Av. La Limpia, C.C. Galerías Mall, Nivel Planta Baja, frente a la pista de hielo, Maracaibo.',
                'phone' => '',
                'whatsapp' => '04246139031',
                'whatsapp_active' => 1,
                'instagram' => '@nualamcbogalerias',
                'instagram_active' => 1,
                'tiktok' => '@nualamcbogalerias',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/Uu7hmvyFzjdYuZdj8',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 10:00 AM - 8:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Maracaibo Plaza Lago',
                'city' => 'Maracaibo',
                'state' => 'Zulia',
                'address' => 'Av. Libertador, C.C. Plaza Lago, Planta Baja, frente a Variedades Lima, Maracaibo.',
                'phone' => '',
                'whatsapp' => '04122530745',
                'whatsapp_active' => 1,
                'instagram' => '@nualaplazalago',
                'instagram_active' => 1,
                'tiktok' => '@nualaplazalago2',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/9X1jKoBJtMSgKM61A',
                'maps_active' => 1,
                'cashea_active' => 1,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ],
            [
                'name' => 'Nuala Ciudad Ojeda',
                'city' => 'Ciudad Ojeda',
                'state' => 'Zulia',
                'address' => 'Av. Bolívar, Edificio Gina, diagonal a Mundo Total, Ciudad Ojeda.',
                'phone' => '',
                'whatsapp' => '04246633766',
                'whatsapp_active' => 1,
                'instagram' => '@nualaojeda',
                'instagram_active' => 1,
                'tiktok' => '@nualaojeda0',
                'tiktok_active' => 1,
                'maps_url' => 'https://maps.app.goo.gl/PfZ6T6pvJJFcEivo6',
                'maps_active' => 1,
                'cashea_active' => 0,
                'sale_type' => 'Detal',
                'store_active' => 1,
                'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM',
                'image' => 'assets/images/tienda-nuala.webp'
            ]
        ];
    }

    /**
     * Inicializa las tablas, ejecuta migraciones seguras e índices.
     */
    private function init_tables() {
        // 1. Tabla de configuración general (site_config)
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS site_config (
                config_key TEXT PRIMARY KEY,
                config_value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // 2. Tabla de carrusel (carousel_items) con unidad de venta (Docena por defecto)
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS carousel_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price TEXT NOT NULL,
                unit_type TEXT DEFAULT 'Docena',
                description TEXT,
                image TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // 3. Tabla de tiendas (stores) con campos omnicanal y de crecimiento
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS stores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                city TEXT NOT NULL,
                state TEXT NOT NULL,
                address TEXT NOT NULL,
                phone TEXT NOT NULL DEFAULT '',
                schedule TEXT NOT NULL,
                image TEXT NOT NULL,
                whatsapp TEXT DEFAULT '',
                whatsapp_active INTEGER DEFAULT 1,
                instagram TEXT DEFAULT '',
                instagram_active INTEGER DEFAULT 1,
                tiktok TEXT DEFAULT '',
                tiktok_active INTEGER DEFAULT 1,
                maps_url TEXT DEFAULT '',
                maps_active INTEGER DEFAULT 1,
                cashea_active INTEGER DEFAULT 0,
                sale_type TEXT DEFAULT 'Detal',
                store_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // 4. Tabla obligatoria de auditoría (auditoria)
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS auditoria (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accion TEXT NOT NULL,
                modulo TEXT NOT NULL,
                entidad_id TEXT DEFAULT NULL,
                detalle_anterior TEXT DEFAULT NULL,
                detalle_nuevo TEXT DEFAULT NULL,
                estatus TEXT NOT NULL DEFAULT 'EXITOSO',
                ip_hash TEXT NOT NULL,
                user_agent TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // 5. Tabla de métricas de conversión por tienda (clics en WhatsApp, Maps, IG, TikTok)
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS store_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                store_id INTEGER NOT NULL,
                channel TEXT NOT NULL,
                ip_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // Migración automática segura de columnas en carousel_items
        try {
            $item_cols_stmt = $this->pdo->query("PRAGMA table_info(carousel_items)");
            $existing_item_cols = [];
            while ($col = $item_cols_stmt->fetch()) {
                $existing_item_cols[] = strtolower($col['name']);
            }
            if (!in_array('unit_type', $existing_item_cols)) {
                $this->pdo->exec("ALTER TABLE carousel_items ADD COLUMN unit_type TEXT DEFAULT 'Docena'");
                $this->pdo->exec("UPDATE carousel_items SET unit_type = 'Docena' WHERE unit_type IS NULL OR TRIM(unit_type) = ''");
            }
        } catch (Exception $e) {
            // Silencioso si falla
        }

        // Migración automática segura de columnas en stores
        try {
            $columns_stmt = $this->pdo->query("PRAGMA table_info(stores)");
            $existing_columns = [];
            while ($col = $columns_stmt->fetch()) {
                $existing_columns[] = strtolower($col['name']);
            }

            $store_migrations = [
                'whatsapp' => "ALTER TABLE stores ADD COLUMN whatsapp TEXT DEFAULT ''",
                'whatsapp_active' => "ALTER TABLE stores ADD COLUMN whatsapp_active INTEGER DEFAULT 1",
                'instagram' => "ALTER TABLE stores ADD COLUMN instagram TEXT DEFAULT ''",
                'instagram_active' => "ALTER TABLE stores ADD COLUMN instagram_active INTEGER DEFAULT 1",
                'tiktok' => "ALTER TABLE stores ADD COLUMN tiktok TEXT DEFAULT ''",
                'tiktok_active' => "ALTER TABLE stores ADD COLUMN tiktok_active INTEGER DEFAULT 1",
                'maps_url' => "ALTER TABLE stores ADD COLUMN maps_url TEXT DEFAULT ''",
                'maps_active' => "ALTER TABLE stores ADD COLUMN maps_active INTEGER DEFAULT 1",
                'cashea_active' => "ALTER TABLE stores ADD COLUMN cashea_active INTEGER DEFAULT 0",
                'sale_type' => "ALTER TABLE stores ADD COLUMN sale_type TEXT DEFAULT 'Detal'",
                'store_active' => "ALTER TABLE stores ADD COLUMN store_active INTEGER DEFAULT 1"
            ];

            foreach ($store_migrations as $col_name => $alter_sql) {
                if (!in_array($col_name, $existing_columns)) {
                    $this->pdo->exec($alter_sql);
                }
            }
        } catch (Exception $e) {
            // Silencioso si falla la verificación
        }

        // Creación de índices para escalabilidad y crecimiento
        $this->pdo->exec("CREATE INDEX IF NOT EXISTS idx_stores_state ON stores(state)");
        $this->pdo->exec("CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(store_active)");
        $this->pdo->exec("CREATE INDEX IF NOT EXISTS idx_stores_sale_type ON stores(sale_type)");
        $this->pdo->exec("CREATE INDEX IF NOT EXISTS idx_auditoria_created ON auditoria(created_at DESC)");
        $this->pdo->exec("CREATE INDEX IF NOT EXISTS idx_interactions_store ON store_interactions(store_id, channel)");

        // Migración de claves de configuración para sección de estadísticas si no existen
        try {
            $default_stats_migration = [
                'stats_tagline' => 'Cerca de ti',
                'stats_number' => '+30',
                'stats_heading' => 'Tiendas en todo el país',
                'stats_description' => 'Llevamos el confort y la elegancia de NUALA a cada rincón de Venezuela. Encuentra tu boutique más cercana y vive una experiencia de compra personalizada.',
                'stats_button_text' => 'Explorar Tiendas',
                'stats_bg_image' => 'assets/images/tienda-nuala.jpg',
                'stats_section_active' => '1',
                'stats_bg_active' => '1',
                'stats_tagline_active' => '1',
                'stats_number_active' => '1',
                'stats_heading_active' => '1',
                'stats_description_active' => '1',
                'stats_button_active' => '1'
            ];
            $stmt_check_key = $this->pdo->prepare("SELECT COUNT(*) as total FROM site_config WHERE LOWER(config_key) = :config_key");
            $stmt_insert_key = $this->pdo->prepare("INSERT INTO site_config (config_key, config_value) VALUES (:config_key, :config_value)");
            foreach ($default_stats_migration as $s_key => $s_val) {
                $stmt_check_key->execute([':config_key' => $s_key]);
                if ((int)$stmt_check_key->fetch()['total'] === 0) {
                    $stmt_insert_key->execute([':config_key' => $s_key, ':config_value' => $s_val]);
                }
            }
        } catch (Exception $e) {
            // Silencioso si falla
        }

        // Asegurar que el PIN administrativo existente esté encriptado con password_hash
        $this->upgrade_legacy_plaintext_pin();

        $this->seed_default_data_once();
    }

    /**
     * Convierte automáticamente cualquier PIN antiguo en texto plano a hash seguro Bcrypt.
     */
    private function upgrade_legacy_plaintext_pin() {
        try {
            $stmt_pin = $this->pdo->prepare("SELECT config_value FROM site_config WHERE LOWER(config_key) = 'admin_pin'");
            $stmt_pin->execute();
            $row_pin = $stmt_pin->fetch();
            if ($row_pin && !empty($row_pin['config_value'])) {
                $raw_val = $row_pin['config_value'];
                $hash_info = password_get_info($raw_val);
                if (empty($hash_info['algo'])) {
                    $hashed_pin = password_hash(trim($raw_val), PASSWORD_DEFAULT);
                    $stmt_upd = $this->pdo->prepare("UPDATE site_config SET config_value = :val, updated_at = CURRENT_TIMESTAMP WHERE LOWER(config_key) = 'admin_pin'");
                    $stmt_upd->execute([':val' => $hashed_pin]);
                }
            }
        } catch (Exception $e) {
            // Silencioso si falla
        }
    }

    /**
     * Siembra datos por defecto UNA SOLA VEZ al crear la BD por primera vez.
     * Si los elementos son eliminados por el usuario, NUNCA se vuelven a sembrar.
     */
    private function seed_default_data_once() {
        $stmt_check_seed = $this->pdo->prepare("SELECT config_value FROM site_config WHERE LOWER(config_key) = 'is_db_seeded'");
        $stmt_check_seed->execute();
        $row_seed = $stmt_check_seed->fetch();

        if ($row_seed && $row_seed['config_value'] === '1') {
            return;
        }

        $stmt_mark_seeded = $this->pdo->prepare("INSERT OR REPLACE INTO site_config (config_key, config_value) VALUES ('is_db_seeded', '1')");
        $stmt_mark_seeded->execute();

        // 1. Configuraciones iniciales con PIN hasheado
        $default_configs = [
            'hero_title' => 'El arte de la intimidad',
            'hero_subtitle' => 'Colección Exclusiva',
            'hero_description' => 'Siluetas delicadas diseñadas para abrazar tu esencia. Confort y sofisticación en armonía perfecta para dama y caballero.',
            'carousel_height' => '520',
            'carousel_object_fit' => 'cover',
            'stats_tagline' => 'Cerca de ti',
            'stats_number' => '+30',
            'stats_heading' => 'Tiendas en todo el país',
            'stats_description' => 'Llevamos el confort y la elegancia de NUALA a cada rincón de Venezuela. Encuentra tu boutique más cercana y vive una experiencia de compra personalizada.',
            'stats_button_text' => 'Explorar Tiendas',
            'stats_bg_image' => 'assets/images/tienda-nuala.jpg',
            'stats_section_active' => '1',
            'stats_bg_active' => '1',
            'stats_tagline_active' => '1',
            'stats_number_active' => '1',
            'stats_heading_active' => '1',
            'stats_description_active' => '1',
            'stats_button_active' => '1',
            'admin_pin' => password_hash('1234', PASSWORD_DEFAULT),
            'is_db_seeded' => '1'
        ];

        $stmt_insert_config = $this->pdo->prepare("INSERT OR REPLACE INTO site_config (config_key, config_value) VALUES (:config_key, :config_value)");
        foreach ($default_configs as $key => $val) {
            $stmt_insert_config->execute([
                ':config_key' => $key,
                ':config_value' => $val
            ]);
        }

        // 2. Productos de carrusel por defecto (especificando Docena según regla de negocio)
        $stmt_count_c = $this->pdo->query("SELECT COUNT(*) AS total FROM carousel_items");
        if ((int) $stmt_count_c->fetch()['total'] === 0) {
            $default_products = [
                [
                    'name' => 'Bralette Encaje Rosa',
                    'category' => 'Dama',
                    'price' => '$45.00',
                    'unit_type' => 'Docena',
                    'image' => 'assets/images/lenceria-femenina.webp',
                    'description' => 'Encaje francés premium en color rosa empolvado'
                ],
                [
                    'name' => 'Set Boxer Algodón Orgánico',
                    'category' => 'Caballero',
                    'price' => '$35.00',
                    'unit_type' => 'Docena',
                    'image' => 'assets/images/lenceria-masculina.webp',
                    'description' => 'Algodón premium ultra suave en color verde salvia y gris'
                ],
                [
                    'name' => 'Bralette Floral Pastel',
                    'category' => 'Dama',
                    'price' => '$42.00',
                    'unit_type' => 'Docena',
                    'image' => 'assets/images/lenceria-femenina.webp',
                    'description' => 'Copas suaves de encaje con tirantes ajustables'
                ],
                [
                    'name' => 'Classic Boxer Briefs',
                    'category' => 'Caballero',
                    'price' => '$38.00',
                    'unit_type' => 'Docena',
                    'image' => 'assets/images/lenceria-masculina.webp',
                    'description' => 'Ajuste perfecto con banda elástica cepillada'
                ]
            ];

            $stmt_insert_carousel = $this->pdo->prepare("
                INSERT INTO carousel_items (name, category, price, unit_type, description, image)
                VALUES (:name, :category, :price, :unit_type, :description, :image)
            ");
            foreach ($default_products as $prod) {
                $stmt_insert_carousel->execute([
                    ':name' => $prod['name'],
                    ':category' => $prod['category'],
                    ':price' => $prod['price'],
                    ':unit_type' => $prod['unit_type'],
                    ':description' => $prod['description'],
                    ':image' => $prod['image']
                ]);
            }
        }

        // 3. Tiendas físicas oficiales (sólo si stores está totalmente vacía en el sembrado inicial)
        $stmt_count_s = $this->pdo->query("SELECT COUNT(*) AS total FROM stores");
        if ((int) $stmt_count_s->fetch()['total'] === 0) {
            $official_stores = self::get_official_stores_catalog();
            $stmt_insert_store = $this->pdo->prepare("
                INSERT INTO stores (
                    name, city, state, address, phone, schedule, image,
                    whatsapp, whatsapp_active, instagram, instagram_active,
                    tiktok, tiktok_active, maps_url, maps_active,
                    cashea_active, sale_type, store_active
                ) VALUES (
                    :name, :city, :state, :address, :phone, :schedule, :image,
                    :whatsapp, :whatsapp_active, :instagram, :instagram_active,
                    :tiktok, :tiktok_active, :maps_url, :maps_active,
                    :cashea_active, :sale_type, :store_active
                )
            ");
            foreach ($official_stores as $store) {
                $stmt_insert_store->execute([
                    ':name' => $store['name'],
                    ':city' => $store['city'],
                    ':state' => $store['state'],
                    ':address' => $store['address'],
                    ':phone' => $store['phone'],
                    ':schedule' => $store['schedule'],
                    ':image' => $store['image'],
                    ':whatsapp' => $store['whatsapp'],
                    ':whatsapp_active' => $store['whatsapp_active'],
                    ':instagram' => $store['instagram'],
                    ':instagram_active' => $store['instagram_active'],
                    ':tiktok' => $store['tiktok'],
                    ':tiktok_active' => $store['tiktok_active'],
                    ':maps_url' => $store['maps_url'],
                    ':maps_active' => $store['maps_active'],
                    ':cashea_active' => $store['cashea_active'],
                    ':sale_type' => $store['sale_type'],
                    ':store_active' => $store['store_active']
                ]);
            }
        }
    }
}

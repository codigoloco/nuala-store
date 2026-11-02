/**
 * Helper reutilizable para normalizar textos en comparaciones (minúsculas y sin tildes).
 * Garantiza que ambos lados del match estén exactamente en las mismas condiciones.
 */
export function normalizeComparableText(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Clase NualaModel - Gestiona los datos, sesión administrativa y comunicación con la API SQLite3.
 * Sigue el principio de Responsabilidad Única (SRP - SOLID).
 * Variables JavaScript estrictamente en camelCase.
 */
export class NualaModel {
    constructor() {
        this.apiBaseUrl = 'api/index.php';
        this.productsKey = 'nuala_products_v3';
        this.storesKey = 'nuala_stores_v4';
        this.configKey = 'nuala_config_v3';

        this.config = {};
        this.products = [];
        this.stores = [];
        this.adminStores = [];
        this.auditLogs = [];

        this.isApiConnected = false;
        this.isAdminAuthenticated = false;
        this.csrfToken = '';
    }

    /**
     * Mapea un registro de producto proveniente de la API al modelo en camelCase.
     */
    mapProductRecord(rawProduct) {
        const rawUnit = normalizeComparableText(rawProduct.unit_type || rawProduct.unitType || 'Docena');
        const unitType = rawUnit === 'unidad' || rawUnit === 'unidades' ? 'Unidad' : 'Docena';
        return {
            id: parseInt(rawProduct.id, 10),
            name: rawProduct.name || '',
            category: rawProduct.category || 'Dama',
            price: rawProduct.price || '',
            unitType,
            description: rawProduct.description || '',
            image: rawProduct.image || 'assets/images/lenceria-femenina.webp'
        };
    }

    /**
     * Mapea un registro de tienda proveniente de la API al modelo en camelCase.
     */
    mapStoreRecord(rawStore) {
        const parseFlag = (val, fallback = 1) => {
            if (val === undefined || val === null || val === '') return fallback;
            return parseInt(val, 10) === 1 ? 1 : 0;
        };

        return {
            id: parseInt(rawStore.id, 10),
            name: rawStore.name || '',
            city: rawStore.city || '',
            state: rawStore.state || 'Distrito Capital',
            address: rawStore.address || '',
            phone: rawStore.phone || '',
            schedule: rawStore.schedule || 'Lunes a Sábado: 9:00 AM - 7:00 PM',
            image: rawStore.image || 'assets/images/tienda-nuala.webp',
            whatsapp: rawStore.whatsapp || '',
            whatsappActive: parseFlag(rawStore.whatsapp_active ?? rawStore.whatsappActive, rawStore.whatsapp ? 1 : 0),
            instagram: rawStore.instagram || '',
            instagramActive: parseFlag(rawStore.instagram_active ?? rawStore.instagramActive, rawStore.instagram ? 1 : 0),
            tiktok: rawStore.tiktok || '',
            tiktokActive: parseFlag(rawStore.tiktok_active ?? rawStore.tiktokActive, rawStore.tiktok ? 1 : 0),
            mapsUrl: rawStore.maps_url ?? rawStore.mapsUrl ?? '',
            mapsActive: parseFlag(rawStore.maps_active ?? rawStore.mapsActive, (rawStore.maps_url || rawStore.mapsUrl) ? 1 : 0),
            casheaActive: parseFlag(rawStore.cashea_active ?? rawStore.casheaActive, 0),
            saleType: rawStore.sale_type || rawStore.saleType || 'Detal',
            storeActive: parseFlag(rawStore.store_active ?? rawStore.storeActive, 1),
            clicksWhatsapp: parseInt(rawStore.clicks_whatsapp ?? rawStore.clicksWhatsapp ?? 0, 10),
            clicksMaps: parseInt(rawStore.clicks_maps ?? rawStore.clicksMaps ?? 0, 10),
            clicksInstagram: parseInt(rawStore.clicks_instagram ?? rawStore.clicksInstagram ?? 0, 10),
            clicksTiktok: parseInt(rawStore.clicks_tiktok ?? rawStore.clicksTiktok ?? 0, 10)
        };
    }

    /**
     * Convierte un objeto de tienda en camelCase al payload snake_case esperado por PHP.
     */
    buildStorePayload(storeData) {
        return {
            name: storeData.name,
            city: storeData.city,
            state: storeData.state,
            address: storeData.address,
            phone: storeData.phone || '',
            schedule: storeData.schedule || 'Lunes a Sábado: 9:00 AM - 7:00 PM',
            image: storeData.image || 'assets/images/tienda-nuala.webp',
            whatsapp: storeData.whatsapp || '',
            whatsapp_active: storeData.whatsappActive ? 1 : 0,
            instagram: storeData.instagram || '',
            instagram_active: storeData.instagramActive ? 1 : 0,
            tiktok: storeData.tiktok || '',
            tiktok_active: storeData.tiktokActive ? 1 : 0,
            maps_url: storeData.mapsUrl || '',
            maps_active: storeData.mapsActive ? 1 : 0,
            cashea_active: storeData.casheaActive ? 1 : 0,
            sale_type: storeData.saleType || 'Detal',
            store_active: storeData.storeActive !== undefined ? (storeData.storeActive ? 1 : 0) : 1
        };
    }

    /**
     * Construye cabeceras HTTP incluyendo el token CSRF de sesión.
     */
    buildAuthHeaders(includeJsonContentType = true) {
        const headers = {};
        if (includeJsonContentType) {
            headers['Content-Type'] = 'application/json';
        }
        if (this.csrfToken) {
            headers['X-CSRF-Token'] = this.csrfToken;
        }
        return headers;
    }

    /**
     * Inicializa los datos cargando desde SQLite3 vía API PHP.
     */
    async initData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}?action=get_data`, {
                credentials: 'same-origin'
            });
            if (response.ok) {
                const apiResult = await response.json();
                if (apiResult.success) {
                    this.isApiConnected = true;
                    this.config = apiResult.config || {};
                    this.products = Array.isArray(apiResult.products)
                        ? apiResult.products.map(item => this.mapProductRecord(item))
                        : [];
                    this.stores = Array.isArray(apiResult.stores)
                        ? apiResult.stores.map(store => this.mapStoreRecord(store))
                        : [];

                    this.isAdminAuthenticated = Boolean(apiResult.is_admin);
                    if (apiResult.csrf_token) {
                        this.csrfToken = apiResult.csrf_token;
                    }
                    if (Array.isArray(apiResult.admin_stores)) {
                        this.adminStores = apiResult.admin_stores.map(store => this.mapStoreRecord(store));
                    } else {
                        this.adminStores = [...this.stores];
                    }
                    if (Array.isArray(apiResult.audit_logs)) {
                        this.auditLogs = apiResult.audit_logs;
                    }

                    this.syncLocalStorage();
                    return true;
                }
            }
        } catch (error) {
            console.warn('API PHP offline, utilizando caché local:', error);
        }

        this.loadLocalStorage();
        return false;
    }

    /**
     * Carga caché desde localStorage eliminando claves antiguas obsoletas.
     */
    loadLocalStorage() {
        try {
            localStorage.removeItem('nuala_config');
            localStorage.removeItem('nuala_stores_v2');
            localStorage.removeItem('nuala_stores_v3');

            const localConfig = localStorage.getItem(this.configKey);
            const localProducts = localStorage.getItem(this.productsKey);
            const localStores = localStorage.getItem(this.storesKey);

            if (localConfig) this.config = JSON.parse(localConfig);
            if (localProducts) this.products = JSON.parse(localProducts).map(item => this.mapProductRecord(item));
            if (localStores) {
                this.stores = JSON.parse(localStores).map(store => this.mapStoreRecord(store));
                if (this.adminStores.length === 0) {
                    this.adminStores = [...this.stores];
                }
            }
        } catch (err) {
            console.warn('Error al leer de localStorage:', err);
        }
    }

    /**
     * Sincroniza únicamente datos públicos seguros en localStorage (nunca credenciales).
     */
    syncLocalStorage() {
        try {
            const safeConfig = { ...this.config };
            delete safeConfig.admin_pin;

            const sanitizedProducts = this.products.map(product => ({
                ...product,
                image: (product.image && product.image.startsWith('data:image/'))
                    ? 'assets/images/lenceria-femenina.webp'
                    : product.image
            }));

            const sanitizedStores = this.stores.map(store => ({
                ...store,
                image: (store.image && store.image.startsWith('data:image/'))
                    ? 'assets/images/tienda-nuala.webp'
                    : store.image
            }));

            localStorage.setItem(this.configKey, JSON.stringify(safeConfig));
            localStorage.setItem(this.productsKey, JSON.stringify(sanitizedProducts));
            localStorage.setItem(this.storesKey, JSON.stringify(sanitizedStores));
        } catch (err) {
            console.warn('Advertencia al sincronizar localStorage:', err);
        }
    }

    getConfig() {
        return this.config;
    }

    getAuditLogs() {
        return this.auditLogs;
    }

    /**
     * Valida el PIN de seguridad en el servidor iniciando sesión protegida con CSRF.
     */
    async verifyAdminPin(pinInput) {
        try {
            const response = await fetch(`${this.apiBaseUrl}?action=verify_pin`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pinInput })
            });
            const result = await response.json();
            if (result && result.success) {
                this.isAdminAuthenticated = true;
                this.csrfToken = result.csrf_token || '';
                if (Array.isArray(result.admin_stores)) {
                    this.adminStores = result.admin_stores.map(store => this.mapStoreRecord(store));
                }
                if (Array.isArray(result.audit_logs)) {
                    this.auditLogs = result.audit_logs;
                }
                return { success: true, message: result.message || 'Acceso concedido.' };
            }
            return {
                success: false,
                message: (result && result.message) ? result.message : 'PIN de seguridad incorrecto.'
            };
        } catch (err) {
            console.warn('Error al verificar PIN vía API:', err);
            return { success: false, message: 'No se pudo conectar con el servidor de autenticación.' };
        }
    }

    /**
     * Cierra la sesión administrativa activa en el servidor.
     */
    async logoutAdmin() {
        try {
            await fetch(`${this.apiBaseUrl}?action=logout_admin`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: this.buildAuthHeaders(true)
            });
        } catch (err) {
            console.warn('Error al cerrar sesión:', err);
        }
        this.isAdminAuthenticated = false;
        this.csrfToken = '';
    }

    /**
     * Sube una imagen recortada al servidor validando sesión y token CSRF.
     */
    async uploadImage(imageFile) {
        if (!imageFile) {
            return { success: false, message: 'No se seleccionó ningún archivo de imagen.' };
        }

        try {
            const formData = new FormData();
            formData.append('image_file', imageFile);

            const response = await fetch(`${this.apiBaseUrl}?action=upload_image`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: this.buildAuthHeaders(false),
                body: formData
            });

            const result = await response.json();
            if (result && Array.isArray(result.audit_logs)) {
                this.auditLogs = result.audit_logs;
            }
            return result;
        } catch (err) {
            console.warn('Error al subir imagen a la API PHP:', err);
            return { success: false, message: 'Error de red al subir la imagen.' };
        }
    }

    /**
     * Guarda la configuración general del sitio.
     */
    async saveConfig(configsObj) {
        const response = await fetch(`${this.apiBaseUrl}?action=save_config`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: this.buildAuthHeaders(true),
            body: JSON.stringify({ configs: configsObj })
        });
        const result = await response.json();
        if (result && result.success && result.config) {
            this.config = { ...this.config, ...result.config };
            if (Array.isArray(result.audit_logs)) {
                this.auditLogs = result.audit_logs;
            }
            this.syncLocalStorage();
        }
        return result;
    }

    getProducts() {
        return this.products;
    }

    getProductById(productId) {
        const targetId = parseInt(productId, 10);
        return this.products.find(product => product.id === targetId);
    }

    /**
     * Filtra productos por categoría normalizando ambos textos a minúsculas.
     */
    getProductsByCategory(category) {
        if (!category) return this.products;
        const targetCategory = normalizeComparableText(category);
        return this.products.filter(product =>
            normalizeComparableText(product.category) === targetCategory
        );
    }

    async addProduct(productData) {
        const payload = {
            name: productData.name,
            category: productData.category,
            price: productData.price,
            unit_type: productData.unitType || 'Docena',
            description: productData.description || '',
            image: productData.image || 'assets/images/lenceria-femenina.webp'
        };

        const response = await fetch(`${this.apiBaseUrl}?action=add_product`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: this.buildAuthHeaders(true),
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result && result.success && Array.isArray(result.products)) {
            this.products = result.products.map(item => this.mapProductRecord(item));
            if (Array.isArray(result.audit_logs)) this.auditLogs = result.audit_logs;
            this.syncLocalStorage();
        }
        return result;
    }

    async updateProduct(productId, productData) {
        const payload = {
            id: parseInt(productId, 10),
            name: productData.name,
            category: productData.category,
            price: productData.price,
            unit_type: productData.unitType || 'Docena',
            description: productData.description || '',
            image: productData.image || 'assets/images/lenceria-femenina.webp'
        };

        const response = await fetch(`${this.apiBaseUrl}?action=update_product`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: this.buildAuthHeaders(true),
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result && result.success && Array.isArray(result.products)) {
            this.products = result.products.map(item => this.mapProductRecord(item));
            if (Array.isArray(result.audit_logs)) this.auditLogs = result.audit_logs;
            this.syncLocalStorage();
        }
        return result;
    }

    async deleteProduct(productId) {
        const response = await fetch(`${this.apiBaseUrl}?action=delete_product`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: this.buildAuthHeaders(true),
            body: JSON.stringify({ id: parseInt(productId, 10) })
        });
        const result = await response.json();
        if (result && result.success && Array.isArray(result.products)) {
            this.products = result.products.map(item => this.mapProductRecord(item));
            if (Array.isArray(result.audit_logs)) this.auditLogs = result.audit_logs;
            this.syncLocalStorage();
        }
        return result;
    }

    getStores() {
        return this.stores;
    }

    getAdminStores() {
        return this.adminStores.length > 0 ? this.adminStores : this.stores;
    }

    getStoreById(storeId) {
        const targetId = parseInt(storeId, 10);
        return this.getAdminStores().find(store => store.id === targetId)
            || this.stores.find(store => store.id === targetId);
    }

    /**
     * Filtra tiendas combinando Estado, Búsqueda libre, Cashea y Modalidad (Mayor/Detal).
     * Lleva todos los valores comparados a las mismas condiciones (minúsculas sin acentos).
     */
    filterStores(criteria = {}) {
        const stateNorm = normalizeComparableText(criteria.state || 'todas');
        const queryNorm = normalizeComparableText(criteria.searchQuery || '');
        const quickModeNorm = normalizeComparableText(criteria.quickFilter || 'todos');

        return this.stores.filter(store => {
            if (stateNorm && stateNorm !== 'todas') {
                if (normalizeComparableText(store.state) !== stateNorm) {
                    return false;
                }
            }

            if (quickModeNorm === 'cashea' && store.casheaActive !== 1) {
                return false;
            } else if (quickModeNorm === 'mayor') {
                const saleNorm = normalizeComparableText(store.saleType);
                if (saleNorm !== 'mayor' && saleNorm !== 'mayor y detal') {
                    return false;
                }
            } else if (quickModeNorm === 'detal') {
                const saleNorm = normalizeComparableText(store.saleType);
                if (saleNorm !== 'detal' && saleNorm !== 'mayor y detal') {
                    return false;
                }
            }

            if (queryNorm) {
                const searchableBlob = normalizeComparableText(
                    `${store.name} ${store.city} ${store.state} ${store.address} ${store.instagram} ${store.tiktok} ${store.saleType} ${store.casheaActive ? 'cashea' : ''}`
                );
                if (!searchableBlob.includes(queryNorm)) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Filtra la lista de tiendas en el panel administrativo por texto.
     */
    filterAdminStores(adminQuery = '') {
        const allItems = this.getAdminStores();
        const queryNorm = normalizeComparableText(adminQuery);
        if (!queryNorm) return allItems;

        return allItems.filter(store => {
            const haystack = normalizeComparableText(
                `${store.name} ${store.city} ${store.state} ${store.address} ${store.instagram} ${store.whatsapp}`
            );
            return haystack.includes(queryNorm);
        });
    }

    /**
     *Sincroniza las listas locales tras una respuesta de mutación de tiendas.
     */
    applyStoresMutationResult(result) {
        if (result && result.success) {
            if (Array.isArray(result.stores)) {
                this.stores = result.stores.map(store => this.mapStoreRecord(store));
            }
            if (Array.isArray(result.admin_stores)) {
                this.adminStores = result.admin_stores.map(store => this.mapStoreRecord(store));
            }
            if (Array.isArray(result.audit_logs)) {
                this.auditLogs = result.audit_logs;
            }
            this.syncLocalStorage();
        }
    }

    async addStore(storeData) {
        const response = await fetch(`${this.apiBaseUrl}?action=add_store`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: this.buildAuthHeaders(true),
            body: JSON.stringify(this.buildStorePayload(storeData))
        });
        const result = await response.json();
        this.applyStoresMutationResult(result);
        return result;
    }

    async updateStore(storeId, storeData) {
        const payload = {
            id: parseInt(storeId, 10),
            ...this.buildStorePayload(storeData)
        };
        const response = await fetch(`${this.apiBaseUrl}?action=update_store`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: this.buildAuthHeaders(true),
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        this.applyStoresMutationResult(result);
        return result;
    }

    async toggleStoreStatus(storeId, storeActive) {
        const response = await fetch(`${this.apiBaseUrl}?action=toggle_store_status`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: this.buildAuthHeaders(true),
            body: JSON.stringify({
                id: parseInt(storeId, 10),
                store_active: storeActive ? 1 : 0
            })
        });
        const result = await response.json();
        this.applyStoresMutationResult(result);
        return result;
    }

    async deleteStore(storeId) {
        const response = await fetch(`${this.apiBaseUrl}?action=delete_store`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: this.buildAuthHeaders(true),
            body: JSON.stringify({ id: parseInt(storeId, 10) })
        });
        const result = await response.json();
        this.applyStoresMutationResult(result);
        return result;
    }

    /**
     * Registra de forma asíncrona (no bloqueante) el clic en un canal de una tienda.
     */
    trackStoreClick(storeId, channel) {
        try {
            const payload = JSON.stringify({
                store_id: parseInt(storeId, 10),
                channel
            });
            if (navigator.sendBeacon) {
                const blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon(`${this.apiBaseUrl}?action=track_store_click`, blob);
            } else {
                fetch(`${this.apiBaseUrl}?action=track_store_click`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                    keepalive: true
                }).catch(() => {});
            }
        } catch (err) {
            // No bloquear la navegación del usuario
        }
    }

    /**
     * Extrae dinámicamente todos los estados únicos registrados en las tiendas activas.
     * Normaliza comparaciones en minúsculas sin acentos para evitar estados duplicados.
     */
    getUniqueStates() {
        const seen = new Set();
        const uniqueStates = [];

        this.stores.forEach(store => {
            if (store.state) {
                const normalized = normalizeComparableText(store.state);
                if (normalized && !seen.has(normalized)) {
                    seen.add(normalized);
                    uniqueStates.push(store.state.trim());
                }
            }
        });

        return uniqueStates.sort((a, b) => a.localeCompare(b, 'es'));
    }
}

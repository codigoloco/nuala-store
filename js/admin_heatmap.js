/**
 * admin_heatmap.js - Controlador de visualización del Heatmap para el Dashboard de Administración.
 * Utiliza Heatmap.js para renderizar los clics sobre el frame completo del sitio web con auto-ajuste de altura y normalización de coordenadas.
 * Variables en camelCase y principios SOLID.
 */

/* global h337 */

class AdminHeatmapController {
    constructor() {
        this.heatmapWrapper = document.getElementById('heatmap-wrapper');
        this.heatmapContainer = document.getElementById('heatmap-area');
        this.previewFrame = document.getElementById('site-preview-frame');
        this.urlSelect = document.getElementById('heatmap-url-select');
        this.radiusInput = document.getElementById('heatmap-radius');
        this.radiusValueDisplay = document.getElementById('radius-val');
        this.opacityInput = document.getElementById('heatmap-opacity');
        this.opacityValueDisplay = document.getElementById('opacity-val');
        this.btnRefresh = document.getElementById('btn-refresh-heatmap');
        this.btnClearFilters = document.getElementById('btn-clear-filters');
        
        // Elementos de resumen de métricas
        this.statTotalClicks = document.getElementById('stat-total-clicks');
        this.statUniquePoints = document.getElementById('stat-unique-points');
        this.statCurrentUrl = document.getElementById('stat-current-url');

        this.heatmapInstance = null;
        this.currentData = [];
        this.currentMaxDensity = 5;
        this.isSyncingDimensions = false;

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupFrameSync();
        this.loadHeatmapData();
    }

    /**
     * Inicializa o recrea la instancia de Heatmap.js adaptada a las dimensiones actuales
     */
    initHeatmapInstance() {
        if (!this.heatmapContainer) return;

        // Limpiar canvas anterior si existía para forzar recalculo de dimensiones
        const existingCanvas = this.heatmapContainer.querySelector('.heatmap-canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }

        const currentRadius = parseInt(this.radiusInput ? this.radiusInput.value : '28', 10);
        const currentOpacity = parseFloat(this.opacityInput ? this.opacityInput.value : '0.65');

        if (typeof h337 !== 'undefined') {
            this.heatmapInstance = h337.create({
                container: this.heatmapContainer,
                radius: currentRadius,
                maxOpacity: currentOpacity,
                minOpacity: 0.05,
                blur: 0.85,
                gradient: {
                    0.25: '#53c2ba',
                    0.55: '#f3d375',
                    0.80: '#ee96c0',
                    1.0: '#e76eaa'
                }
            });
        } else {
            console.error('Heatmap.js no está cargado en el documento.');
        }
    }

    /**
     * Sincroniza la altura y ancho del iframe con el contenedor del mapa de calor
     */
    setupFrameSync() {
        if (!this.previewFrame) return;

        const onFrameLoaded = () => {
            this.syncFrameDimensions();
            // Re-ejecutar tras pequeño retardo por carga de imágenes o fuentes asíncronas
            setTimeout(() => this.syncFrameDimensions(), 400);
            setTimeout(() => this.syncFrameDimensions(), 1200);
        };

        this.previewFrame.addEventListener('load', onFrameLoaded);

        // Si ya estuviera cargado previamente
        if (this.previewFrame.contentDocument && this.previewFrame.contentDocument.readyState === 'complete') {
            onFrameLoaded();
        }
    }

    /**
     * Calcula la altura real completa del documento embebido y expande el visor
     */
    syncFrameDimensions() {
        if (!this.previewFrame) return;

        try {
            const frameDoc = this.previewFrame.contentDocument || this.previewFrame.contentWindow?.document;
            if (!frameDoc || !frameDoc.body) return;

            // Ocultar scrollbar interna del iframe para evitar barras dobles
            frameDoc.documentElement.style.overflow = 'hidden';
            frameDoc.body.style.overflow = 'hidden';

            const fullHeight = Math.max(
                frameDoc.body.scrollHeight,
                frameDoc.documentElement.scrollHeight,
                frameDoc.body.offsetHeight,
                frameDoc.documentElement.offsetHeight,
                frameDoc.body.clientHeight,
                frameDoc.documentElement.clientHeight,
                800
            );

            const frameWidth = this.previewFrame.clientWidth || this.heatmapWrapper?.clientWidth || 1200;

            // Ajustar altura de los 3 elementos clave
            if (this.heatmapWrapper) {
                this.heatmapWrapper.style.height = `${fullHeight}px`;
            }
            this.previewFrame.style.height = `${fullHeight}px`;
            this.heatmapContainer.style.height = `${fullHeight}px`;
            this.heatmapContainer.style.width = '100%';

            // Recrear heatmap con las nuevas dimensiones de contenedor
            this.initHeatmapInstance();
            this.renderHeatmap();
        } catch (err) {
            console.warn('Analytics: No se pudo acceder a las dimensiones internas del iframe:', err);
        }
    }

    bindEvents() {
        if (this.urlSelect) {
            this.urlSelect.addEventListener('change', () => {
                this.loadHeatmapData();
                this.syncFrameUrl();
            });
        }

        if (this.radiusInput) {
            this.radiusInput.addEventListener('input', (e) => {
                const newRadius = parseInt(e.target.value, 10);
                if (this.radiusValueDisplay) this.radiusValueDisplay.textContent = `${newRadius}px`;
                this.initHeatmapInstance();
                this.renderHeatmap();
            });
        }

        if (this.opacityInput) {
            this.opacityInput.addEventListener('input', (e) => {
                const newOpacity = parseFloat(e.target.value);
                if (this.opacityValueDisplay) this.opacityValueDisplay.textContent = `${Math.round(newOpacity * 100)}%`;
                this.initHeatmapInstance();
                this.renderHeatmap();
            });
        }

        if (this.btnRefresh) {
            this.btnRefresh.addEventListener('click', () => {
                this.loadHeatmapData();
                this.syncFrameDimensions();
            });
        }

        if (this.btnClearFilters) {
            this.btnClearFilters.addEventListener('click', () => {
                if (this.urlSelect) this.urlSelect.value = 'todas';
                this.loadHeatmapData();
                this.syncFrameUrl();
            });
        }

        // Redimensionar el mapa al cambiar el tamaño del navegador
        window.addEventListener('resize', () => {
            this.syncFrameDimensions();
        });
    }

    syncFrameUrl() {
        if (!this.previewFrame || !this.urlSelect) return;
        const selectedUrl = this.urlSelect.value;
        if (selectedUrl && selectedUrl !== 'todas') {
            let cleanPath = selectedUrl;
            if (cleanPath.startsWith('/nuala-store/')) {
                cleanPath = cleanPath.substring('/nuala-store/'.length);
            } else if (cleanPath.startsWith('/')) {
                cleanPath = cleanPath.substring(1);
            }
            this.previewFrame.src = cleanPath ? `../${cleanPath}` : '../index.php';
        } else {
            this.previewFrame.src = '../index.php';
        }
    }

    async loadHeatmapData() {
        const selectedUrl = this.urlSelect ? this.urlSelect.value : 'todas';
        const apiUrl = `../analitica/obtener_datos_heatmap.php?page_url=${encodeURIComponent(selectedUrl)}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Error en respuesta de red');

            const result = await response.json();
            if (result.success) {
                this.currentData = result.data || [];
                this.currentMaxDensity = result.max || 5;
                this.updateMetrics(result);
                this.updateUrlSelectOptions(result.available_urls, selectedUrl);
                this.renderHeatmap(this.currentMaxDensity);
            }
        } catch (err) {
            console.error('Error cargando datos del heatmap:', err);
        }
    }

    updateMetrics(result) {
        if (this.statTotalClicks) {
            this.statTotalClicks.textContent = Number(result.total_clics || 0).toLocaleString('es-VE');
        }
        if (this.statUniquePoints) {
            this.statUniquePoints.textContent = Number(result.points_count || 0).toLocaleString('es-VE');
        }
        if (this.statCurrentUrl) {
            this.statCurrentUrl.textContent = result.page_url === 'todas' ? 'Todas las páginas' : result.page_url;
        }
    }

    updateUrlSelectOptions(availableUrls, currentSelected) {
        if (!this.urlSelect || !Array.isArray(availableUrls)) return;

        const currentOptionsCount = this.urlSelect.options.length;
        if (currentOptionsCount > 1 && currentOptionsCount === availableUrls.length + 1) {
            return;
        }

        const prevValue = currentSelected || this.urlSelect.value || 'todas';
        this.urlSelect.innerHTML = '<option value="todas">Todas las URLs registradas</option>';

        availableUrls.forEach(urlPath => {
            const option = document.createElement('option');
            option.value = urlPath;
            option.textContent = urlPath;
            if (urlPath.toLowerCase() === prevValue.toLowerCase()) {
                option.selected = true;
            }
            this.urlSelect.appendChild(option);
        });
    }

    /**
     * Renderiza los puntos en el heatmap aplicando normalización y escalado de coordenadas
     */
    renderHeatmap(customMax) {
        if (!this.heatmapInstance || !this.currentData) return;

        const currentFrameWidth = this.previewFrame ? this.previewFrame.clientWidth : (this.heatmapContainer ? this.heatmapContainer.clientWidth : 1200);

        // Normalizar puntos X/Y en función del ancho actual del visor
        const normalizedPoints = this.currentData.map(point => {
            let normalizedX = point.x;
            
            // Si tenemos el ancho original de captura y el ancho actual difiere, escalar proporcionalmente
            if (point.viewport_width && point.viewport_width > 0 && currentFrameWidth > 0) {
                const scaleRatio = currentFrameWidth / point.viewport_width;
                normalizedX = Math.round(point.x * scaleRatio);
            }

            return {
                x: Math.max(0, Math.min(normalizedX, currentFrameWidth)),
                y: Math.max(0, point.y),
                value: point.value || 1
            };
        });

        const maxVal = customMax || (normalizedPoints.length > 0 ? Math.max(...normalizedPoints.map(d => d.value)) : 5);

        this.heatmapInstance.setData({
            max: Math.max(maxVal, 3),
            data: normalizedPoints
        });
    }
}

// Inicializar cuando cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
    new AdminHeatmapController();
});

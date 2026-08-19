/**
 * admin_heatmap.js - Controlador de visualización del Heatmap para el Dashboard de Administración.
 * Utiliza Heatmap.js para renderizar los clics sobre el frame o contenedor del sitio.
 * Variables en camelCase y principios SOLID.
 */

/* global h337 */

class AdminHeatmapController {
    constructor() {
        this.heatmapContainer = document.getElementById('heatmap-area');
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
        this.previewFrame = document.getElementById('site-preview-frame');

        this.heatmapInstance = null;
        this.currentData = [];

        this.init();
    }

    init() {
        this.initHeatmapInstance();
        this.bindEvents();
        this.loadHeatmapData();
    }

    initHeatmapInstance() {
        if (!this.heatmapContainer) return;

        // Limpiar canvas anterior si existía
        const existingCanvas = this.heatmapContainer.querySelector('.heatmap-canvas');
        if (existingCanvas) existingCanvas.remove();

        const currentRadius = parseInt(this.radiusInput ? this.radiusInput.value : '25', 10);
        const currentOpacity = parseFloat(this.opacityInput ? this.opacityInput.value : '0.6');

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
            if (this.heatmapInstance && this.currentData.length > 0) {
                this.renderHeatmap();
            }
        });
    }

    syncFrameUrl() {
        if (!this.previewFrame || !this.urlSelect) return;
        const selectedUrl = this.urlSelect.value;
        if (selectedUrl && selectedUrl !== 'todas') {
            this.previewFrame.src = `..${selectedUrl}`;
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
                this.updateMetrics(result);
                this.updateUrlSelectOptions(result.available_urls, selectedUrl);
                this.renderHeatmap(result.max);
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

        // Si ya tiene más de 1 opción ('todas'), no reconstruir a menos que haya nuevas
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

    renderHeatmap(customMax) {
        if (!this.heatmapInstance) return;

        const maxVal = customMax || (this.currentData.length > 0 ? Math.max(...this.currentData.map(d => d.value)) : 5);

        this.heatmapInstance.setData({
            max: Math.max(maxVal, 3),
            data: this.currentData
        });
    }
}

// Inicializar cuando cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
    new AdminHeatmapController();
});

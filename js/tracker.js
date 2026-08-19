/**
 * tracker.js - Script de tracking cliente ligero para analítica web y mapa de calor.
 * Captura clics globales respecto al documento completo y contabiliza visitas únicas.
 * Sigue principios SOLID y variables en camelCase.
 */

(function () {
    'use strict';

    class AnalyticsTracker {
        constructor() {
            // Resolver rutas relativas dinámicamente según la ubicación del script
            this.baseAnaliticaUrl = this.resolveApiBaseUrl();
            this.counterEndpoint = `${this.baseAnaliticaUrl}contador.php`;
            this.clickEndpoint = `${this.baseAnaliticaUrl}capturar_clic.php`;
            
            this.init();
        }

        resolveApiBaseUrl() {
            const currentScript = document.currentScript;
            if (currentScript && currentScript.src) {
                const scriptUrl = new URL(currentScript.src);
                const basePath = scriptUrl.pathname.substring(0, scriptUrl.pathname.lastIndexOf('/js/'));
                return `${basePath}/analitica/`;
            }
            return 'analitica/';
        }

        init() {
            this.trackPageView();
            this.setupClickTracking();
        }

        /**
         * Registra la visita única y actualiza los badges de contador si existen en el DOM
         */
        async trackPageView() {
            const currentUrl = window.location.pathname || '/';
            
            try {
                const response = await fetch(this.counterEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ page_url: currentUrl })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.total_visits !== undefined) {
                        this.updateCounterElements(result.total_visits);
                    }
                }
            } catch (err) {
                console.warn('Analytics: No se pudo registrar la visita única:', err);
            }
        }

        /**
         * Actualiza cualquier elemento en el DOM destinado a mostrar el contador de visitas
         */
        updateCounterElements(totalVisits) {
            const counterElements = document.querySelectorAll('.visitor-counter-val, #visitor-counter-number');
            const formattedTotal = Number(totalVisits).toLocaleString('es-VE');
            
            counterElements.forEach(elem => {
                elem.textContent = formattedTotal;
            });
        }

        /**
         * Configura el listener global de clics en el document
         */
        setupClickTracking() {
            document.addEventListener('click', (event) => {
                this.handleClickEvent(event);
            }, { passive: true, capture: true });
        }

        /**
         * Procesa el evento de clic y calcula coordenadas absolutas respecto al documento
         */
        handleClickEvent(event) {
            // Coordenadas respecto al documento completo (incluyendo scroll)
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || 0;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;

            const clickX = Math.round(event.pageX !== undefined ? event.pageX : (event.clientX + scrollLeft));
            const clickY = Math.round(event.pageY !== undefined ? event.pageY : (event.clientY + scrollTop));

            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const pageUrl = window.location.pathname || '/';

            const payload = {
                click_x: clickX,
                click_y: clickY,
                page_url: pageUrl,
                viewport_width: viewportWidth,
                viewport_height: viewportHeight
            };

            this.sendClickData(payload);
        }

        /**
         * Envía los datos del clic de forma no bloqueante
         */
        sendClickData(payload) {
            const jsonPayload = JSON.stringify(payload);

            // Intentar primero con navigator.sendBeacon para garantizar entrega
            if (navigator.sendBeacon) {
                const blob = new Blob([jsonPayload], { type: 'application/json' });
                const beaconSent = navigator.sendBeacon(this.clickEndpoint, blob);
                if (beaconSent) return;
            }

            // Fallback con fetch asíncrono
            fetch(this.clickEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonPayload,
                keepalive: true
            }).catch(err => {
                console.warn('Analytics: Error enviando clic de heatmap:', err);
            });
        }
    }

    // Inicializar tracker cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new AnalyticsTracker());
    } else {
        new AnalyticsTracker();
    }
})();

<?php
/**
 * dashboard.php - Panel de Administración y Visualización del Mapa de Calor (Heatmap).
 * Variables PHP en snake_Case y HTML en kebab-kase.
 */

declare(strict_types=1);

require_once __DIR__ . '/../analitica/contador.php';
require_once __DIR__ . '/../api/helpers/SecurityHelper.php';
require_once __DIR__ . '/../api/models/ConfigModel.php';

init_secure_session();

$dashboard_login_error = '';
if (isset($_POST['dashboard_logout'])) {
    registrar_auditoria('LOGOUT_DASHBOARD', 'seguridad', 'dashboard_heatmap', null, null, 'EXITOSO');
    revoke_admin_session();
    header('Location: dashboard.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['dashboard_pin'])) {
    $rate_check = check_pin_rate_limit();
    if (!$rate_check['allowed']) {
        $dashboard_login_error = 'Demasiados intentos. Intenta nuevamente en unos minutos.';
    } else {
        $cfg_model = new ConfigModel();
        if ($cfg_model->verify_pin((string) $_POST['dashboard_pin'])) {
            grant_admin_session();
            registrar_auditoria('LOGIN_DASHBOARD', 'seguridad', 'dashboard_heatmap', null, ['acceso' => 'concedido'], 'EXITOSO');
            header('Location: dashboard.php');
            exit;
        } else {
            record_failed_pin_attempt();
            registrar_auditoria('LOGIN_DASHBOARD_FALLIDO', 'seguridad', 'dashboard_heatmap', null, ['acceso' => 'denegado'], 'DENEGADO');
            $dashboard_login_error = 'PIN de seguridad incorrecto.';
        }
    }
}

$is_dashboard_auth = is_admin_authenticated();
$total_visits_count = $is_dashboard_auth ? get_total_unique_visits() : 0;
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NUALA Analytics | Dashboard de Heatmap y Visitas</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --color-bg: #f8f9fa;
            --color-surface: #ffffff;
            --color-primary: #ee96c0;
            --color-primary-dark: #e76eaa;
            --color-secondary: #53c2ba;
            --color-text-main: #1a1a1a;
            --color-text-muted: #666666;
            --color-border: #ececec;
            --font-sans: 'Montserrat', sans-serif;
            --font-complementary: 'Jost', sans-serif;
            --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--font-sans);
            background-color: var(--color-bg);
            color: var(--color-text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Cabecera del Dashboard */
        .dashboard-header {
            background: var(--color-surface);
            border-bottom: 1px solid var(--color-border);
            padding: 18px 35px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .brand-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .brand-title {
            font-size: 1.4rem;
            font-weight: 700;
            letter-spacing: 3px;
            color: var(--color-text-main);
        }

        .brand-badge {
            background: var(--color-primary);
            color: #ffffff;
            font-size: 0.7rem;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .dashboard-pin-wrapper {
            max-width: 420px;
            margin: 80px auto;
            background: var(--color-surface);
            padding: 36px 32px;
            border-radius: 18px;
            border: 1px solid var(--color-border);
            box-shadow: var(--shadow-card);
            text-align: center;
        }

        .dashboard-pin-wrapper h2 {
            font-size: 1.25rem;
            margin-bottom: 10px;
        }

        .dashboard-pin-wrapper p {
            font-size: 0.85rem;
            color: var(--color-text-muted);
            margin-bottom: 20px;
        }

        .dashboard-pin-input {
            width: 100%;
            padding: 12px 16px;
            border-radius: 10px;
            border: 1px solid var(--color-border);
            font-size: 1rem;
            text-align: center;
            letter-spacing: 4px;
            margin-bottom: 14px;
            outline: none;
        }

        .dashboard-pin-error {
            color: #d93025;
            font-size: 0.8rem;
            margin-bottom: 12px;
        }

        .btn-view-site {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            padding: 8px 18px;
            border-radius: 20px;
            color: var(--color-text-main);
            font-size: 0.8rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s ease;
        }

        .btn-view-site:hover {
            border-color: var(--color-primary);
            color: var(--color-primary-dark);
        }

        /* Contenido Principal */
        .dashboard-container {
            max-width: 1400px;
            width: 100%;
            margin: 25px auto;
            padding: 0 25px;
            display: flex;
            flex-direction: column;
            gap: 25px;
            flex: 1;
        }

        /* Tarjetas de Métricas */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
        }

        .metric-card {
            background: var(--color-surface);
            border-radius: 14px;
            padding: 22px 25px;
            border: 1px solid var(--color-border);
            box-shadow: var(--shadow-card);
            display: flex;
            align-items: center;
            gap: 18px;
        }

        .metric-icon-wrap {
            width: 52px;
            height: 52px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.4rem;
        }

        .metric-icon-wrap.pink {
            background: #fdf2f7;
            color: var(--color-primary-dark);
        }

        .metric-icon-wrap.teal {
            background: #ebfbf9;
            color: var(--color-secondary);
        }

        .metric-icon-wrap.dark {
            background: #f3f3f3;
            color: var(--color-text-main);
        }

        .metric-info h4 {
            font-size: 0.8rem;
            font-weight: 500;
            color: var(--color-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .metric-info p {
            font-size: 1.7rem;
            font-weight: 700;
            color: var(--color-text-main);
            font-family: var(--font-complementary);
        }

        /* Barra de Controles del Heatmap */
        .controls-toolbar {
            background: var(--color-surface);
            border-radius: 14px;
            padding: 16px 25px;
            border: 1px solid var(--color-border);
            box-shadow: var(--shadow-card);
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
        }

        .control-group {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .control-group label {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--color-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .control-group select,
        .control-group input[type="range"] {
            font-family: inherit;
            padding: 6px 12px;
            border-radius: 8px;
            border: 1px solid var(--color-border);
            outline: none;
            background: #fafafa;
            color: var(--color-text-main);
            font-size: 0.85rem;
        }

        .control-group select:focus {
            border-color: var(--color-primary);
        }

        .control-value-tag {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--color-primary-dark);
            min-width: 40px;
        }

        .btn-action {
            background: var(--color-primary);
            color: #ffffff;
            border: none;
            padding: 8px 18px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: background 0.2s ease;
        }

        .btn-action:hover {
            background: var(--color-primary-dark);
        }

        .btn-action.secondary {
            background: #f0f0f0;
            color: var(--color-text-main);
        }

        .btn-action.secondary:hover {
            background: #e4e4e4;
        }

        /* Contenedor del Visor y Capa Heatmap */
        .viewer-card {
            background: var(--color-surface);
            border-radius: 14px;
            border: 1px solid var(--color-border);
            box-shadow: var(--shadow-card);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .viewer-header {
            padding: 12px 20px;
            background: #fafafa;
            border-bottom: 1px solid var(--color-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8rem;
            color: var(--color-text-muted);
        }

        .heatmap-viewport {
            position: relative;
            width: 100%;
            height: 80vh;
            min-height: 650px;
            overflow-y: auto;
            overflow-x: hidden;
            background: #ffffff;
            scroll-behavior: smooth;
        }

        .heatmap-wrapper {
            position: relative;
            width: 100%;
            min-height: 100%;
            transform-origin: top left;
        }

        .site-preview-frame {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            pointer-events: none;
            display: block;
            overflow: hidden;
        }

        .heatmap-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        }
    </style>
</head>
<body>

    <!-- Header Superior -->
    <header class="dashboard-header">
        <div class="brand-section">
            <span class="brand-title">NUALA</span>
            <span class="brand-badge">Analítica Web & Heatmap</span>
        </div>
        <div class="header-actions">
            <a href="../index.php" target="_blank" class="btn-view-site">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir Sitio Web
            </a>
            <?php if ($is_dashboard_auth): ?>
            <form method="post" style="display:inline;">
                <button type="submit" name="dashboard_logout" value="1" class="btn-action secondary">
                    <i class="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
                </button>
            </form>
            <?php endif; ?>
        </div>
    </header>

    <?php if (!$is_dashboard_auth): ?>
    <main class="dashboard-container">
        <div class="dashboard-pin-wrapper">
            <h2><i class="fa-solid fa-shield-halved" style="color: var(--color-primary-dark);"></i> Acceso Restringido</h2>
            <p>Ingresa el PIN administrativo para visualizar métricas y mapas de calor.</p>
            <?php if ($dashboard_login_error !== ''): ?>
                <div class="dashboard-pin-error"><?php echo htmlspecialchars($dashboard_login_error, ENT_QUOTES, 'UTF-8'); ?></div>
            <?php endif; ?>
            <form method="post" autocomplete="off">
                <input type="password" name="dashboard_pin" class="dashboard-pin-input" maxlength="12" placeholder="****" required autofocus>
                <button type="submit" class="btn-action" style="width: 100%; justify-content: center; padding: 12px;">
                    <i class="fa-solid fa-right-to-bracket"></i> Desbloquear Dashboard
                </button>
            </form>
        </div>
    </main>
    <?php else: ?>
    <!-- Contenedor Principal -->
    <main class="dashboard-container">

        <!-- Métricas Rápidas -->
        <section class="metrics-grid">
            <div class="metric-card">
                <div class="metric-icon-wrap pink">
                    <i class="fa-solid fa-users"></i>
                </div>
                <div class="metric-info">
                    <h4>Visitas Únicas</h4>
                    <p id="stat-total-visits"><?php echo number_format($total_visits_count, 0, ',', '.'); ?></p>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon-wrap teal">
                    <i class="fa-solid fa-arrow-pointer"></i>
                </div>
                <div class="metric-info">
                    <h4>Total de Clics</h4>
                    <p id="stat-total-clicks">0</p>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon-wrap dark">
                    <i class="fa-solid fa-fire"></i>
                </div>
                <div class="metric-info">
                    <h4>Puntos de Densidad</h4>
                    <p id="stat-unique-points">0</p>
                </div>
            </div>
        </section>

        <!-- Barra de Controles -->
        <section class="controls-toolbar">
            <div class="control-group">
                <label for="heatmap-url-select"><i class="fa-solid fa-filter"></i> URL / Página:</label>
                <select id="heatmap-url-select">
                    <option value="todas">Todas las URLs registradas</option>
                </select>
            </div>

            <div class="control-group">
                <label for="heatmap-radius">Radio:</label>
                <input type="range" id="heatmap-radius" min="10" max="60" value="28">
                <span class="control-value-tag" id="radius-val">28px</span>
            </div>

            <div class="control-group">
                <label for="heatmap-opacity">Opacidad:</label>
                <input type="range" id="heatmap-opacity" min="0.1" max="1.0" step="0.05" value="0.65">
                <span class="control-value-tag" id="opacity-val">65%</span>
            </div>

            <div class="control-group">
                <button type="button" class="btn-action" id="btn-refresh-heatmap">
                    <i class="fa-solid fa-rotate"></i> Actualizar
                </button>
                <button type="button" class="btn-action secondary" id="btn-clear-filters">
                    <i class="fa-solid fa-broom"></i> Limpiar
                </button>
            </div>
        </section>

        <!-- Visor del Mapa de Calor -->
        <section class="viewer-card">
            <div class="viewer-header">
                <span><i class="fa-regular fa-eye"></i> Visualización Superpuesta (Heatmap.js sobre Sitio)</span>
                <span id="stat-current-url">Cargando...</span>
            </div>
            <div class="heatmap-viewport" id="heatmap-viewport">
                <div class="heatmap-wrapper" id="heatmap-wrapper">
                    <iframe id="site-preview-frame" class="site-preview-frame" src="../index.php" scrolling="no"></iframe>
                    <div class="heatmap-area" id="heatmap-area"></div>
                </div>
            </div>
        </section>

    </main>

    <!-- Librería Heatmap.js desde CDN -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/heatmap.js/2.0.2/heatmap.min.js"></script>
    
    <!-- Script de Control del Heatmap Admin -->
    <script src="../js/admin_heatmap.js"></script>
    <?php endif; ?>
</body>
</html>

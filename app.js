/**
 * @file app.js
 * @description Entry point principal de la aplicación modularizada con lazy loading
 * Responsabilidades:
 * - Inicializar módulos comunes inmediatamente
 * - Cargar módulos específicos bajo demanda (lazy loading)
 * - Manejar errores globales
 * - Coordinar navegación entre pestañas
 * - Gestionar ciclo de vida de la app
 */

class TradingDomeApp {
  constructor() {
    this.isInitialized = false;
    this.currentTab = null;
    this.modules = {};
    this.errorHandler = null;
    this.loadedModules = new Set(); // Rastrear módulos cargados para evitar cargas duplicadas
  }

  /**
   * Inicializa la aplicación
   */
  async initialize() {
    try {
      console.log('[APP] 🚀 Inicializando Trading Dome con lazy loading...');

      // 1. Cargar módulos comunes primero (siempre necesarios)
      await this.loadCommonModules();

      // 2. Cargar configuración
      await this.loadConfig();

      // 3. Cargar módulo de estado global
      await this.loadStateManagement();

      // 4. Cargar módulos críticos (navbar, análisis)
      await this.loadCriticalModules();

      // 5. Inicializar UI
      await this.initializeUI();

      // 6. Suscribirse a cambios de tab para lazy loading
      this.setupLazyLoading();

      this.isInitialized = true;
      console.log('[APP] ✅ Aplicación inicializada exitosamente (lazy loading activado)');

      return true;
    } catch (error) {
      console.error('[APP] ❌ Error durante inicialización:', error);
      this.errorHandler?.handleError('INIT_ERROR', error);
      return false;
    }
  }

  async loadCommonModules() {
    try {
      console.log('[APP] 📦 Cargando módulos comunes...');
      
      // Registrar error handler global
      this.errorHandler = typeof errorHandler !== 'undefined' ? errorHandler : null;
      
      if (this.errorHandler) {
        console.log('[APP] ✓ Error handler cargado');
      }
      
      if (typeof eventBus !== 'undefined') {
        console.log('[APP] ✓ Event bus cargado');
        this.modules.eventBus = eventBus;
      }
      
      if (typeof Validators !== 'undefined') {
        console.log('[APP] ✓ Validators cargado');
      }

      if (typeof StatsCalculator !== 'undefined') {
        console.log('[APP] ✓ StatsCalculator cargado');
      }

      if (typeof PositionsCacheManager !== 'undefined') {
        console.log('[APP] ✓ PositionsCache cargado');
      }

      // Inicializar Theme Manager
      if (typeof themeManager !== 'undefined') {
        themeManager.initialize();
        console.log('[APP] ✓ Theme manager inicializado');
        this.modules.themeManager = themeManager;
      }
    } catch (error) {
      console.error('[APP] Error cargando módulos comunes:', error);
      throw error;
    }
  }

  async loadConfig() {
    try {
      console.log('[APP] ⚙️ Cargando configuración...');
      
      if (typeof AppConfig !== 'undefined') {
        console.log('[APP] ✓ Configuración cargada');
        this.modules.config = AppConfig;
      }
    } catch (error) {
      console.error('[APP] Error cargando configuración:', error);
      throw error;
    }
  }

  async loadStateManagement() {
    try {
      console.log('[APP] 📊 Inicializando gestión de estado...');
      
      if (typeof stateManager !== 'undefined') {
        console.log('[APP] ✓ State manager cargado');
        this.modules.stateManager = stateManager;
      }

      // Inicializar profileManager (DEBE ser antes de profileDataService)
      if (typeof profileManager !== 'undefined') {
        profileManager.initialize();
        console.log('[APP] ✓ Profile manager inicializado');
        this.modules.profileManager = profileManager;
      }

      // Inicializar servicio de datos de perfil (punto único de verdad)
      if (typeof profileDataService !== 'undefined') {
        profileDataService.initialize();
        console.log('[APP] ✓ Profile data service inicializado');
        this.modules.profileDataService = profileDataService;
      }

      // Inicializar auto-save (Level 2)
      if (typeof profileAutoSave !== 'undefined') {
        profileAutoSave.start();
        console.log('[APP] ✓ Auto-save iniciado (cada 30 segundos)');
        this.modules.profileAutoSave = profileAutoSave;
      }

      // Configurar auto-snapshots (Level 2)
      if (typeof profileSnapshot !== 'undefined') {
        profileSnapshot.setupAutoSnapshots();
        console.log('[APP] ✓ Auto-snapshots configurados');
        this.modules.profileSnapshot = profileSnapshot;
      }

      // Change history ya está inicializado (Level 2)
      if (typeof changeHistory !== 'undefined') {
        changeHistory.setupAutoListeners();
        console.log('[APP] ✓ Change history inicializado con auto-listeners');
        this.modules.changeHistory = changeHistory;
      }
    } catch (error) {
      console.error('[APP] Error cargando state management:', error);
      throw error;
    }
  }

  /**
   * Carga módulos críticos necesarios para inicio (navbar y análisis)
   */
  async loadCriticalModules() {
    try {
      console.log('[APP] 🔌 Cargando módulos críticos...');
      
      // Cargar navbar (siempre necesario)
      if (typeof navbarModule !== 'undefined') {
        await navbarModule.initialize();
        this.modules.navbar = navbarModule;
        this.loadedModules.add('navbar');
        console.log('[APP] ✓ NavBar cargado');
      }
      
      // Cargar análisis (tab por defecto)
      if (typeof analisisModule !== 'undefined') {
        await analisisModule.initialize();
        this.modules.analisis = analisisModule;
        this.loadedModules.add('analisis');
        console.log('[APP] ✓ Análisis cargado');
      }

      // Inicializar APIs (para exponer bitgetConnector a otros módulos)
      if (typeof apisModule !== 'undefined') {
        await apisModule.initialize();
        this.modules.apis = apisModule;
        this.loadedModules.add('apis');
        console.log('[APP] ✓ APIs inicializado (bitgetConnector disponible globalmente)');
      }
      
      console.log('[APP] ✓ Módulos críticos cargados (otros se cargarán bajo demanda)');
    } catch (error) {
      console.error('[APP] Error cargando módulos críticos:', error);
      throw error;
    }
  }

  /**
   * Configura lazy loading de módulos
   */
  setupLazyLoading() {
    try {
      eventBus?.on('tab:changed', async (data) => {
        const tabId = data.tabId;
        console.log(`[APP] 🔄 Tab cambió a: ${tabId}, verificando si cargar...`);

        // Cargar módulo bajo demanda si no está cargado
        if (!this.loadedModules.has(tabId)) {
          await this.loadModuleOnDemand(tabId);
        }
      });

      console.log('[APP] ✓ Lazy loading configurado');
    } catch (error) {
      console.error('[APP] Error configurando lazy loading:', error);
    }
  }

  /**
   * Carga un módulo bajo demanda y lo muestra
   * @param {string} moduleName - Nombre del módulo a cargar
   */
  async loadModuleOnDemand(moduleName) {
    try {
      console.log(`[APP] 📥 Cargando módulo bajo demanda: ${moduleName}`);

      let module = null;

      switch (moduleName) {
        case 'apis':
          if (typeof apisModule !== 'undefined' && !this.loadedModules.has('apis')) {
            await apisModule.initialize();
            this.modules.apis = apisModule;
            this.loadedModules.add('apis');
            module = apisModule;
            console.log('[APP] ✓ APIs cargado bajo demanda');
          }
          break;

        case 'riesgo':
          if (typeof riesgoModule !== 'undefined' && !this.loadedModules.has('riesgo')) {
            await riesgoModule.initialize();
            this.modules.riesgo = riesgoModule;
            this.loadedModules.add('riesgo');
            module = riesgoModule;
            console.log('[APP] ✓ Riesgo cargado bajo demanda');
          }
          break;

        case 'posiciones':
          if (typeof posicionesModule !== 'undefined' && !this.loadedModules.has('posiciones')) {
            await posicionesModule.initialize();
            this.modules.posiciones = posicionesModule;
            this.loadedModules.add('posiciones');
            module = posicionesModule;
            console.log('[APP] ✓ Posiciones cargado bajo demanda');
          }
          break;

        case 'posiciones-abiertas':
          if (typeof posicionesAbiertasModule !== 'undefined' && !this.loadedModules.has('posiciones-abiertas')) {
            posicionesAbiertasModule.initialize();
            this.modules['posiciones-abiertas'] = posicionesAbiertasModule;
            this.loadedModules.add('posiciones-abiertas');
            module = posicionesAbiertasModule;
            console.log('[APP] ✓ Posiciones Abiertas cargado bajo demanda');
          }
          break;

        case 'monitoreo':
          if (typeof monitoreoModule !== 'undefined' && !this.loadedModules.has('monitoreo')) {
            await monitoreoModule.initialize();
            this.modules.monitoreo = monitoreoModule;
            this.loadedModules.add('monitoreo');
            module = monitoreoModule;
            console.log('[APP] ✓ Monitoreo cargado bajo demanda');
          }
          break;

        default:
          console.log(`[APP] ⚠️ Módulo desconocido: ${moduleName}`);
      }

      // Mostrar el módulo después de cargarlo
      if (module && typeof module.show === 'function') {
        module.show();
      }
    } catch (error) {
      console.error(`[APP] ❌ Error cargando módulo ${moduleName}:`, error);
      this.errorHandler?.handleError(`LAZY_LOAD_${moduleName.toUpperCase()}`, error);
    }
  }

  async initializeUI() {
    try {
      console.log('[APP] 🎨 Inicializando interfaz de usuario...');
      
      // Mostrar primer tab
      if (this.modules.navbar) {
        this.modules.navbar.selectTab('analisis');
        if (this.modules.analisis) {
          this.modules.analisis.show();
        }
      }
      
      console.log('[APP] ✓ UI inicializada');
    } catch (error) {
      console.error('[APP] Error inicializando UI:', error);
      throw error;
    }
  }

  /**
   * Navega a una pestaña específica
   */
  async navigateTo(tabName) {
    try {
      console.log(`[APP] 📍 Navegando a: ${tabName}`);
      this.currentTab = tabName;
      // Lógica de navegación
    } catch (error) {
      console.error(`[APP] ❌ Error navegando a ${tabName}:`, error);
      this.errorHandler?.handleError('NAV_ERROR', error);
    }
  }

  /**
   * Obtiene un módulo cargado
   */
  getModule(moduleName) {
    return this.modules[moduleName];
  }

  /**
   * Obtiene estado de carga de módulos
   */
  getLoadedModules() {
    return Array.from(this.loadedModules);
  }
}

// Instancia global de la aplicación
window.tradingDomeApp = new TradingDomeApp();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.tradingDomeApp.initialize();
  });
} else {
  window.tradingDomeApp.initialize();
}

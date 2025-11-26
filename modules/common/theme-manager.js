/**
 * @file theme-manager.js
 * @description Gestor independiente de:
 * - Modo de fondo (light-mode / dark-mode): Controlado por botón luna/sol
 * - Tema visual (theme-light / theme-dark): Colores de elementos, independiente del fondo
 */

class ThemeManager {
  constructor() {
    this.bgModeStorageKey = 'trading-dome-bg-mode'; // Modo de fondo (light/dark)
    this.themeStorageKey = 'trading-dome-theme'; // Tema visual (light/dark)
    this.currentBgMode = 'dark'; // Modo de fondo (controla background)
    this.currentTheme = 'dark'; // Tema visual (controla colores de elementos)
  }

  /**
   * Inicializa el gestor de temas
   */
  initialize() {
    console.log('[ThemeManager] 🎨 Inicializando gestor de temas y modos...');
    this.loadSavedSettings();
    this.applySettings();
    
    // Escuchar evento navbar:ready para configurar listener del botón
    if (typeof eventBus !== 'undefined') {
      eventBus.on('navbar:ready', () => {
        console.log('[ThemeManager] ✓ Navbar listo, configurando toggle listener');
        this.setupToggleListener();
      });
    } else {
      // Si no hay eventBus, intentar configurar directamente
      this.setupToggleListener();
    }
  }

  /**
   * Carga las configuraciones guardadas
   */
  loadSavedSettings() {
    this.currentBgMode = localStorage.getItem(this.bgModeStorageKey) || 'dark';
    this.currentTheme = localStorage.getItem(this.themeStorageKey) || 'dark';
    console.log(`[ThemeManager] ✓ Configuración cargada - Modo: ${this.currentBgMode}, Tema: ${this.currentTheme}`);
  }

  /**
   * Aplica las configuraciones actuales
   */
  applySettings() {
    // Aplicar modo de fondo
    if (this.currentBgMode === 'dark') {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
    }

    // Aplicar tema visual
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-desert');
    
    if (this.currentTheme === 'light') {
      document.body.classList.add('theme-light');
    } else if (this.currentTheme === 'desert') {
      document.body.classList.add('theme-desert');
    } else {
      document.body.classList.add('theme-dark');
    }

    console.log(`[ThemeManager] ✓ Estilos aplicados - Modo: ${this.currentBgMode}, Tema: ${this.currentTheme}`);
  }

  /**
   * Alterna SOLO el modo de fondo (luz/oscuro)
   * Controlado por botón luna/sol
   */
  toggleBackgroundMode() {
    if (this.currentBgMode === 'dark') {
      this.setBackgroundMode('light');
    } else {
      this.setBackgroundMode('dark');
    }
  }

  /**
   * Establece el modo de fondo
   */
  setBackgroundMode(mode) {
    this.currentBgMode = mode;
    if (mode === 'dark') {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
    }
    localStorage.setItem(this.bgModeStorageKey, mode);
    this.updateToggleIcon();
    console.log(`[ThemeManager] 🌓 Modo de fondo: ${mode}`);
  }

  /**
   * Cambia el tema visual (colores de elementos)
   * Soporta: 'dark' (Verde), 'light' (Azul), 'desert' (Desert)
   */
  setTheme(theme) {
    this.currentTheme = theme;
    
    // Remover todas las clases de tema
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-desert');
    
    // Agregar la clase del tema seleccionado
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else if (theme === 'desert') {
      document.body.classList.add('theme-desert');
    } else {
      // Por defecto: dark (Verde)
      document.body.classList.add('theme-dark');
    }
    
    localStorage.setItem(this.themeStorageKey, theme);
    this.updateThemeSelector();
    console.log(`[ThemeManager] 🎨 Tema visual: ${theme}`);
  }

  /**
   * Actualiza el selector visual de temas
   */
  updateThemeSelector() {
    const themeSelector = document.getElementById('themeSelector');
    if (themeSelector) {
      themeSelector.value = this.currentTheme;
    }
  }

  /**
   * Métodos heredados (compatibilidad hacia atrás)
   */
  enableDarkMode() {
    this.setBackgroundMode('dark');
  }

  enableLightMode() {
    this.setBackgroundMode('light');
  }

  toggleTheme() {
    this.toggleBackgroundMode();
  }

  /**
   * Configura listener para botón toggle
   */
  setupToggleListener() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        console.log('[ThemeManager] Botón clickeado');
        this.toggleBackgroundMode();
      });
      console.log('[ThemeManager] ✓ Listener agregado, actualizando icono...');
      this.updateToggleIcon();
    } else {
      console.warn('[ThemeManager] ⚠️ Botón themeToggle no encontrado');
    }
  }

  /**
   * Actualiza icono del toggle (luna/sol)
   */
  updateToggleIcon() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      const icon = themeToggle.querySelector('i');
      if (icon) {
        const newClass = this.currentBgMode === 'dark' ? 'bi bi-moon' : 'bi bi-sun';
        console.log(`[ThemeManager] Actualizando icono a: ${newClass} (modo actual: ${this.currentBgMode})`);
        icon.className = newClass;
      }
    }
  }
}

// Instancia global
const themeManager = new ThemeManager();

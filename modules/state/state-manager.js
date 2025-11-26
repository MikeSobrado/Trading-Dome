/**
 * @file state-manager.js
 * @description Gestor de estado global de la aplicación
 * Responsabilidades:
 * - Mantener estado global
 * - Notificar cambios de estado
 * - Persisti estado (cuando corresponda)
 * - Manejo de acciones
 */

class StateManager {
  constructor() {
    this.state = {
      user: null,
      theme: 'dark',
      language: 'es',
      config: {},
      data: {},
      ui: {
        currentTab: 'analisis',
        sidebarOpen: true,
        loading: false
      }
    };
    
    this.listeners = [];
    this.history = [];
    this.maxHistorySize = 50;
    this.loadState();
  }

  /**
   * Obtiene el estado actual
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Obtiene una parte específica del estado
   */
  getStateSlice(path) {
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Actualiza el estado
   */
  setState(updates) {
    const oldState = JSON.parse(JSON.stringify(this.state));
    
    // Deep merge
    this.state = this.deepMerge(this.state, updates);
    
    // Registrar en historial
    this.recordHistory(oldState, updates);
    
    // Notificar listeners
    this.notifyListeners(this.state, updates);
    
    // Persisti estado
    this.saveState();
    
    return this.state;
  }

  /**
   * Merge profundo de objetos
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(result[key])) {
          result[key] = this.deepMerge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Suscribirse a cambios de estado
   */
  subscribe(listener) {
    this.listeners.push(listener);
    
    // Retornar función para desuscribirse
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notifica a todos los listeners
   */
  notifyListeners(newState, updates) {
    console.log('[StateManager] 🔄 Estado actualizado:', updates);
    this.listeners.forEach(listener => {
      try {
        listener(newState, updates);
      } catch (error) {
        console.error('[StateManager] Error en listener:', error);
      }
    });
  }

  /**
   * Registra cambios en historial
   */
  recordHistory(oldState, updates) {
    this.history.push({
      timestamp: new Date().toISOString(),
      from: oldState,
      to: this.state,
      changes: updates
    });
    
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Valida si es un objeto
   */
  isObject(obj) {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
  }

  /**
   * Persisti estado en localStorage
   */
  saveState() {
    try {
      // Solo guardar estado no sensible
      const toSave = {
        theme: this.state.theme,
        language: this.state.language,
        ui: this.state.ui
      };
      localStorage.setItem('tradingDomeState', JSON.stringify(toSave));
    } catch (error) {
      console.error('[StateManager] Error guardando estado:', error);
    }
  }

  /**
   * Carga estado desde localStorage
   */
  loadState() {
    try {
      const saved = localStorage.getItem('tradingDomeState');
      if (saved) {
        const loaded = JSON.parse(saved);
        this.state = this.deepMerge(this.state, loaded);
      }
    } catch (error) {
      console.error('[StateManager] Error cargando estado:', error);
    }
  }

  /**
   * Obtiene historial de cambios
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Limpia el historial
   */
  clearHistory() {
    this.history = [];
  }
}

// Exportar singleton
const stateManager = new StateManager();

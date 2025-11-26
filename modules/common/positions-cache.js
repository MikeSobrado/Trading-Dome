/**
 * @file positions-cache.js
 * @description Caché global de posiciones para evitar N+1 API calls
 * Responsabilidades:
 * - Mantener caché de posiciones cerradas/abiertas
 * - Proporcionar interfaz consistente para todos los módulos
 * - Manejar invalidación de caché
 * - Notificar módulos cuando caché se actualiza
 * 
 * Uso:
 * const cache = PositionsCache.getInstance();
 * await cache.loadClosedPositions();
 * const positions = cache.getClosedPositions();
 * await cache.invalidate();
 */

class PositionsCacheManager {
  /**
   * Constructor privado para patrón singleton
   */
  constructor() {
    this.closedPositions = [];
    this.openPositions = [];
    this.lastUpdated = {
      closed: null,
      open: null
    };
    this.isLoading = {
      closed: false,
      open: false
    };
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    this.observers = []; // Para notificar cambios

    console.log('[PositionsCache] ✓ Instancia creada (singleton)');
  }

  /**
   * Obtiene instancia singleton
   * @returns {PositionsCacheManager} Instancia del caché
   */
  static getInstance() {
    if (!window._positionsCacheInstance) {
      window._positionsCacheInstance = new PositionsCacheManager();
    }
    return window._positionsCacheInstance;
  }

  /**
   * Carga posiciones cerradas desde sessionStorage o caché global
   * @param {boolean} forceRefresh - Fuerza recarga aunque caché sea válido
   * @returns {Promise<Array>} Array de posiciones cerradas
   */
  async loadClosedPositions(forceRefresh = false) {
    // Si caché es válido y no se fuerza recarga, devolver caché
    if (!forceRefresh && this._isCacheValid('closed')) {
      console.log('[PositionsCache] ✓ Retornando caché de posiciones cerradas (válido)');
      return this.closedPositions;
    }

    // Si ya se está cargando, esperar
    if (this.isLoading.closed) {
      console.log('[PositionsCache] ⏳ Esperando carga anterior de posiciones cerradas...');
      return new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!this.isLoading.closed) {
            clearInterval(checkInterval);
            resolve(this.closedPositions);
          }
        }, 100);
      });
    }

    this.isLoading.closed = true;

    try {
      console.log('[PositionsCache] 📡 Cargando posiciones cerradas desde sessionStorage...');
      
      // Intentar cargar de sessionStorage (cacheado por módulo APIs)
      const cachedData = sessionStorage.getItem('bitget_closed_positions');
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          this.closedPositions = parsed.data || [];
          this.lastUpdated.closed = Date.now();
          console.log(`[PositionsCache] ✓ Posiciones cerradas cargadas desde sessionStorage: ${this.closedPositions.length}`);
          this._notifyObservers('closed');
          return this.closedPositions;
        } catch (parseErr) {
          console.warn('[PositionsCache] ⚠️ Error parseando datos de sessionStorage:', parseErr);
        }
      }

      // Si no hay en sessionStorage, intentar cargar desde bitgetConnector si está disponible
      if (window.bitgetConnector) {
        console.log('[PositionsCache] 📡 Usando bitgetConnector para cargar posiciones...');
        const data = await bitgetConnector.getClosedPositions();
        this.closedPositions = data || [];
        this.lastUpdated.closed = Date.now();

        console.log(`[PositionsCache] ✓ Posiciones cerradas cargadas: ${this.closedPositions.length}`);
        this._notifyObservers('closed');

        return this.closedPositions;
      }

      // Si no hay datos en sessionStorage ni bitgetConnector disponible
      throw new Error('No hay posiciones cerradas disponibles. Conecta primero desde la pestaña APIs.');
    } catch (error) {
      console.error('[PositionsCache] ❌ Error cargando posiciones cerradas:', error);
      this._notifyObservers('closed', error);
      throw error;
    } finally {
      this.isLoading.closed = false;
    }
  }

  /**
   * Carga posiciones abiertas desde API (o retorna caché si es válido)
   * @param {boolean} forceRefresh - Fuerza recarga aunque caché sea válido
   * @returns {Promise<Array>} Array de posiciones abiertas
   */
  async loadOpenPositions(forceRefresh = false) {
    // Si caché es válido y no se fuerza recarga, devolver caché
    if (!forceRefresh && this._isCacheValid('open')) {
      console.log('[PositionsCache] ✓ Retornando caché de posiciones abiertas (válido)');
      return this.openPositions;
    }

    // Si ya se está cargando, esperar
    if (this.isLoading.open) {
      console.log('[PositionsCache] ⏳ Esperando carga anterior de posiciones abiertas...');
      return new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!this.isLoading.open) {
            clearInterval(checkInterval);
            resolve(this.openPositions);
          }
        }, 100);
      });
    }

    this.isLoading.open = true;

    try {
      console.log('[PositionsCache] 📡 Cargando posiciones abiertas desde API...');
      
      // Si bitgetConnector no está disponible, retornar array vacío en lugar de error
      if (!window.bitgetConnector) {
        console.log('[PositionsCache] ℹ️ bitgetConnector no disponible - retornando array vacío');
        this.openPositions = [];
        return [];
      }

      const data = await bitgetConnector.getOpenPositions();
      this.openPositions = data || [];
      this.lastUpdated.open = Date.now();

      console.log(`[PositionsCache] ✓ Posiciones abiertas cargadas: ${this.openPositions.length}`);
      this._notifyObservers('open');

      return this.openPositions;
    } catch (error) {
      console.error('[PositionsCache] ❌ Error cargando posiciones abiertas:', error);
      this.openPositions = [];
      this._notifyObservers('open', error);
      return [];
    } finally {
      this.isLoading.open = false;
    }
  }

  /**
   * Obtiene posiciones cerradas del caché (sin cargar)
   * @returns {Array} Array de posiciones cerradas
   */
  getClosedPositions() {
    return this.closedPositions;
  }

  /**
   * Obtiene posiciones abiertas del caché (sin cargar)
   * @returns {Array} Array de posiciones abiertas
   */
  getOpenPositions() {
    return this.openPositions;
  }

  /**
   * Obtiene estado del caché
   * @returns {Object} Estado actual del caché
   */
  getStatus() {
    return {
      closedPositions: this.closedPositions.length,
      openPositions: this.openPositions.length,
      lastUpdated: this.lastUpdated,
      isLoading: this.isLoading,
      isCacheValid: {
        closed: this._isCacheValid('closed'),
        open: this._isCacheValid('open')
      }
    };
  }

  /**
   * Invalida el caché (fuerza recarga en próxima lectura)
   * @param {string} type - 'closed', 'open', o 'all'
   */
  invalidate(type = 'all') {
    if (type === 'closed' || type === 'all') {
      this.lastUpdated.closed = null;
      console.log('[PositionsCache] 🔄 Caché de posiciones cerradas invalidado');
    }
    if (type === 'open' || type === 'all') {
      this.lastUpdated.open = null;
      console.log('[PositionsCache] 🔄 Caché de posiciones abiertas invalidado');
    }
    this._notifyObservers('invalidated');
  }

  /**
   * Suscribe un observador a cambios de caché
   * @param {Function} callback - Función a ejecutar cuando caché cambie
   */
  subscribe(callback) {
    this.observers.push(callback);
    console.log('[PositionsCache] ✓ Observador suscrito');
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
      console.log('[PositionsCache] ✓ Observador desuscrito');
    };
  }

  /**
   * Verifica si el caché es válido (no expirado)
   * @param {string} type - 'closed' o 'open'
   * @returns {boolean} true si el caché es válido
   * @private
   */
  _isCacheValid(type) {
    const lastUpdate = this.lastUpdated[type];
    
    if (!lastUpdate) {
      return false;
    }

    const ageMs = Date.now() - lastUpdate;
    const isValid = ageMs < this.cacheTimeout;

    if (!isValid) {
      console.log(`[PositionsCache] ⚠️ Caché de ${type} expirado (${Math.round(ageMs / 1000)}s de edad)`);
    }

    return isValid;
  }

  /**
   * Notifica a los observadores de cambios
   * @param {string} type - Tipo de cambio ('closed', 'open', 'invalidated')
   * @param {Error} error - Error si ocurrió algo
   * @private
   */
  _notifyObservers(type, error = null) {
    this.observers.forEach(callback => {
      try {
        callback({
          type,
          status: this.getStatus(),
          error
        });
      } catch (err) {
        console.error('[PositionsCache] ❌ Error en observador:', err);
      }
    });
  }

  /**
   * Limpia el caché completamente
   */
  clear() {
    this.closedPositions = [];
    this.openPositions = [];
    this.lastUpdated = { closed: null, open: null };
    console.log('[PositionsCache] 🗑️ Caché limpiado');
    this._notifyObservers('cleared');
  }
}

// Crear instancia global
const positionsCache = PositionsCacheManager.getInstance();

// Exportar para uso modular
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PositionsCacheManager;
}

/**
 * IndicatorsManager.js
 * Componente responsable de la gestión de indicadores técnicos
 * 
 * Responsabilidades:
 * - Gestionar estado de indicadores (crear, leer, actualizar, eliminar)
 * - Calcular decisiones basadas en indicadores activos
 * - Sincronizar con ProfileManager para persistencia por perfil
 * - Emitir eventos cuando cambia el estado
 * 
 * Uso:
 *   const manager = indicatorsManager;
 *   manager.addIndicator('Mi Indicador');
 *   manager.toggleLight('indicator-id', 'long');
 *   manager.updateScore('indicator-id', 'long', 75);
 *   manager.calculateDecision();
 */

class IndicatorsManager {
  constructor() {
    // Singleton pattern
    if (IndicatorsManager.instance) {
      return IndicatorsManager.instance;
    }

    this.indicators = [];
    this.thresholds = {
      long: 50,
      short: 50,
      wait: 20
    };
    this.decision = 'wait'; // 'long', 'short', 'wait'

    IndicatorsManager.instance = this;
  }

  /**
   * Estructura de un indicador:
   * {
   *   id: 'unique-string-id',
   *   name: 'Nombre del Indicador',
   *   longScore: 0-100,
   *   shortScore: 0-100,
   *   longActive: boolean,
   *   shortActive: boolean,
   *   createdAt: timestamp,
   *   updatedAt: timestamp
   * }
   */

  /**
   * Carga indicadores desde localStorage, profileManager o stateManager
   * @public
   */
  load() {
    try {
      const activeProfileId = profileManager?.activeProfile;
      
      // Intentar cargar desde localStorage primero
      const savedIndicators = localStorage.getItem('trading_dome_indicators');
      const savedThresholds = localStorage.getItem('trading_dome_thresholds');
      
      if (savedIndicators) {
        try {
          this.indicators = JSON.parse(savedIndicators);
          if (savedThresholds) {
            const parsed = JSON.parse(savedThresholds);
            this.thresholds = { ...this.thresholds, ...parsed };
          }
          console.log(`[IndicatorsManager] ✓ Indicadores cargados desde localStorage`);
          this._emitEvent('indicators:loaded', { count: this.indicators.length, profile: activeProfileId, source: 'localStorage' });
          return;
        } catch (e) {
          console.warn('[IndicatorsManager] ⚠️ Error parseando localStorage, intentando perfil...');
        }
      }
      
      // Intentar cargar desde profileManager (por perfil)
      if (activeProfileId && profileManager?.profiles?.[activeProfileId]?.indicators) {
        const profileData = profileManager.profiles[activeProfileId];
        
        if (Array.isArray(profileData.indicators) && profileData.indicators.length > 0) {
          this.indicators = profileData.indicators;
          // Cargar thresholds si existen
          if (profileData.thresholds) {
            this.thresholds.long = profileData.thresholds.long || 50;
            this.thresholds.short = profileData.thresholds.short || 50;
            this.thresholds.wait = profileData.thresholds.wait || 20;
          }
          console.log(`[IndicatorsManager] ✓ Indicadores cargados para perfil ${activeProfileId}`);
          this._emitEvent('indicators:loaded', { count: this.indicators.length, profile: activeProfileId });
          return;
        }
      }

      // Fallback: crear defaults si no hay datos
      this._createDefaults();
      console.log('[IndicatorsManager] ✓ Indicadores por defecto creados');
      this._emitEvent('indicators:loaded', { count: this.indicators.length, profile: activeProfileId });
    } catch (error) {
      console.error('[IndicatorsManager] ❌ Error cargando indicadores:', error);
      errorHandler?.handleError('INDICATORS_LOAD_ERROR', error);
      this._createDefaults();
    }
  }

  /**
   * Guarda indicadores en localStorage y profileDataService
   * @public
   */
  save() {
    try {
      const activeProfileId = profileManager?.activeProfile;
      
      // Guardar en localStorage
      localStorage.setItem('trading_dome_indicators', JSON.stringify(this.indicators));
      localStorage.setItem('trading_dome_thresholds', JSON.stringify({
        long: this.thresholds.long,
        short: this.thresholds.short,
        wait: this.thresholds.wait
      }));
      
      if (!activeProfileId) {
        console.warn('[IndicatorsManager] ⚠️ No active profile, solo guardado en localStorage');
        this._emitEvent('indicators:saved', { count: this.indicators.length, source: 'localStorage' });
        return;
      }

      // Guardar en servicio de datos (punto único de guardado)
      profileDataService?.save('indicators', this.indicators);
      profileDataService?.save('thresholds', {
        long: this.thresholds.long,
        short: this.thresholds.short,
        wait: this.thresholds.wait
      });

      console.log(`[IndicatorsManager] ✓ Indicadores guardados (localStorage + perfil ${activeProfileId})`);
      this._emitEvent('indicators:saved', { count: this.indicators.length, profile: activeProfileId });
    } catch (error) {
      console.error('[IndicatorsManager] ❌ Error guardando indicadores:', error);
      errorHandler?.handleError('INDICATORS_SAVE_ERROR', error);
    }
  }

  /**
   * Añade un nuevo indicador
   * @param {string} name - Nombre del indicador
   * @returns {object} Indicador creado
   * @public
   */
  add(name) {
    if (!name?.trim()) {
      throw new Error('El nombre del indicador es requerido');
    }

    const id = this._generateId(name);
    const newIndicator = {
      id,
      name: name.trim(),
      longScore: 10,
      shortScore: 10,
      longActive: false,
      shortActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.indicators.push(newIndicator);
    this.save();

    // Registrar cambio (Level 2)
    if (typeof recordChange !== 'undefined') {
      recordChange('indicator_added', profileManager?.activeProfile, {
        indicatorId: id,
        indicatorName: name,
        timestamp: Date.now()
      });
    }

    console.log('[IndicatorsManager] ✅ Indicador creado:', name);
    this._emitEvent('indicator:added', newIndicator);

    return newIndicator;
  }

  /**
   * Actualiza el nombre de un indicador
   * @param {string} id - ID del indicador
   * @param {string} newName - Nuevo nombre
   * @public
   */
  updateName(id, newName) {
    const indicator = this._findById(id);
    if (!indicator) throw new Error(`Indicador ${id} no encontrado`);

    const oldName = indicator.name;
    indicator.name = newName?.trim() || indicator.name;
    indicator.updatedAt = Date.now();

    this.save();

    console.log(`[IndicatorsManager] ✏️ Indicador ${id} renombrado: ${oldName} → ${indicator.name}`);
    this._emitEvent('indicator:updated', indicator);
  }

  /**
   * Actualiza el score de un indicador
   * @param {string} id - ID del indicador
   * @param {string} type - 'long' o 'short'
   * @param {number} value - Valor 0-100
   * @public
   */
  updateScore(id, type, value) {
    const indicator = this._findById(id);
    if (!indicator) throw new Error(`Indicador ${id} no encontrado`);
    if (!['long', 'short'].includes(type)) throw new Error('Tipo debe ser "long" o "short"');

    const validScore = Math.max(0, Math.min(100, Math.round(value)));
    const field = type === 'long' ? 'longScore' : 'shortScore';
    
    indicator[field] = validScore;
    indicator.updatedAt = Date.now();

    this.save();
    this.calculateDecision();

    console.log(`[IndicatorsManager] 📊 ${id} ${type} score: ${validScore}`);
    this._emitEvent('indicator:scoreUpdated', { id, type, value: validScore });
  }

  /**
   * Alterna el estado de una luz (long/short) - Mutuamente exclusivas
   * Si se activa uno, se desactiva el otro
   * @param {string} id - ID del indicador
   * @param {string} type - 'long' o 'short'
   * @public
   */
  toggleLight(id, type) {
    const indicator = this._findById(id);
    if (!indicator) throw new Error(`Indicador ${id} no encontrado`);
    if (!['long', 'short'].includes(type)) throw new Error('Tipo debe ser "long" o "short"');

    const isLongType = type === 'long';
    
    // Si el light actual está encendido, apágalo
    if (isLongType && indicator.longActive) {
      indicator.longActive = false;
    } else if (!isLongType && indicator.shortActive) {
      indicator.shortActive = false;
    } else {
      // Si está apagado, enciéndelo y apaga el otro
      if (isLongType) {
        indicator.longActive = true;
        indicator.shortActive = false;
      } else {
        indicator.shortActive = true;
        indicator.longActive = false;
      }
    }

    indicator.updatedAt = Date.now();
    this.save();
    this.calculateDecision();

    const activeState = isLongType ? indicator.longActive : indicator.shortActive;
    console.log(`[IndicatorsManager] 💡 ${id} ${type} light: ${activeState}`);
    this._emitEvent('indicator:updated', { id, type, active: activeState });
  }

  /**
   * Elimina un indicador
   * @param {string} id - ID del indicador
   * @public
   */
  delete(id) {
    const index = this.indicators.findIndex(ind => ind.id === id);
    if (index === -1) throw new Error(`Indicador ${id} no encontrado`);

    const deleted = this.indicators.splice(index, 1)[0];
    this.save();
    this.calculateDecision();

    // Registrar cambio (Level 2)
    if (typeof recordChange !== 'undefined') {
      recordChange('indicator_deleted', profileManager?.activeProfile, {
        indicatorId: id,
        indicatorName: deleted.name,
        timestamp: Date.now()
      });
    }

    console.log('[IndicatorsManager] 🗑️ Indicador eliminado:', deleted.name);
    this._emitEvent('indicator:deleted', deleted);
  }

  /**
   * Calcula la decisión basada en indicadores activos
   * @public
   */
  calculateDecision() {
    // Sumar scores de indicadores activos
    const longScore = this.indicators
      .filter(ind => ind.longActive === true)
      .reduce((sum, ind) => sum + ind.longScore, 0);

    const shortScore = this.indicators
      .filter(ind => ind.shortActive === true)
      .reduce((sum, ind) => sum + ind.shortScore, 0);

    // Calcular diferencia absoluta entre rojos y verdes
    const difference = Math.abs(longScore - shortScore);

    // Determinar decisión con la nueva lógica de puertas AND
    let decision = 'wait';

    // Puerta AND para LONG: umbral_long Y diferencia >= umbral_espera
    if (longScore >= this.thresholds.long && 
        difference >= this.thresholds.wait && 
        longScore > shortScore) {
      decision = 'long';
    } 
    // Puerta AND para SHORT: umbral_short Y diferencia >= umbral_espera
    else if (shortScore >= this.thresholds.short && 
             difference >= this.thresholds.wait && 
             shortScore > longScore) {
      decision = 'short';
    } 
    // En cualquier otro caso (diferencia < umbral_espera, empate, etc.)
    else {
      decision = 'wait';
    }

    this.decision = decision;

    console.log(`[IndicatorsManager] 📈 Decisión: ${decision.toUpperCase()} (LONG: ${longScore}/${this.thresholds.long} | SHORT: ${shortScore}/${this.thresholds.short} | Diferencia: ${difference}/${this.thresholds.wait})`);
    this._emitEvent('decision:changed', { 
      decision, 
      longScore, 
      shortScore,
      difference,
      thresholds: this.thresholds 
    });
  }

  /**
   * Actualiza los umbrales
   * @param {string} type - 'long', 'short' o 'wait'
   * @param {number} value - Nuevo valor
   * @public
   */
  setThreshold(type, value) {
    if (!['long', 'short', 'wait'].includes(type)) throw new Error('Tipo debe ser "long", "short" o "wait"');
    
    const validValue = Math.max(0, Math.min(100, Math.round(value)));
    this.thresholds[type] = validValue;
    
    this.calculateDecision();
    this.save();
    
    console.log(`[IndicatorsManager] 🎚️ Threshold ${type}: ${validValue}`);
    this._emitEvent('threshold:changed', { type, value: validValue });
  }

  /**
   * Obtiene todos los indicadores
   * @returns {array} Array de indicadores
   * @public
   */
  getAll() {
    return [...this.indicators];
  }

  /**
   * Obtiene un indicador por ID
   * @param {string} id - ID del indicador
   * @returns {object|null} Indicador encontrado
   * @public
   */
  getById(id) {
    const indicator = this._findById(id);
    return indicator ? { ...indicator } : null;
  }

  /**
   * Obtiene la decisión actual
   * @returns {string} 'long', 'short' o 'wait'
   * @public
   */
  getDecision() {
    return this.decision;
  }

  /**
   * Obtiene los umbrales actuales
   * @returns {object} { long: number, short: number }
   * @public
   */
  getThresholds() {
    return { ...this.thresholds };
  }

  /**
   * PRIVATE METHODS
   */

  /**
   * Busca un indicador por ID
   * @private
   */
  _findById(id) {
    return this.indicators.find(ind => ind.id === id);
  }

  /**
   * Genera un ID único basado en el nombre
   * @private
   */
  _generateId(name) {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    return slug + '-' + Date.now();
  }

  /**
   * Crea indicadores por defecto
   * @private
   */
  _createDefaults() {
    this.indicators = [
      { id: 'rsi-divergencia', name: 'RSI Divergencia', longScore: 10, shortScore: 10, longActive: false, shortActive: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'rsi-sv-sc', name: 'RSI Sobreventa/Sobrecompra', longScore: 10, shortScore: 10, longActive: false, shortActive: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'sop-res', name: 'Soporte/Resistencia', longScore: 10, shortScore: 10, longActive: false, shortActive: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'macd-divergencia', name: 'MACD Divergencia', longScore: 10, shortScore: 10, longActive: false, shortActive: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'macd-cruces', name: 'MACD Cruces', longScore: 10, shortScore: 10, longActive: false, shortActive: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'tendencia', name: 'Tendencia', longScore: 10, shortScore: 10, longActive: false, shortActive: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'figuras', name: 'Figuras', longScore: 10, shortScore: 10, longActive: false, shortActive: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'media-movil', name: 'Media Móvil', longScore: 10, shortScore: 10, longActive: false, shortActive: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'fibonacci', name: 'Fibonacci', longScore: 10, shortScore: 10, longActive: false, shortActive: false, createdAt: Date.now(), updatedAt: Date.now() }
    ];
    this.save();
  }

  /**
   * Emite eventos a través del eventBus
   * @private
   */
  _emitEvent(eventName, data) {
    try {
      eventBus?.emit(`indicators:${eventName}`, data);
    } catch (error) {
      console.warn('[IndicatorsManager] ⚠️ Error emitiendo evento:', error);
    }
  }
}

// Exportar singleton
const indicatorsManager = new IndicatorsManager();

/**
 * @file profile-auto-save.js
 * @description Sistema de guardado automático periódico
 * 
 * Responsabilidades:
 * - Guardar datos automáticamente cada N segundos
 * - Evitar pérdida de datos si hay crash
 * - Notificar cambios pendientes de guardar
 * - Permitir activar/desactivar auto-save
 * 
 * Uso:
 *   profileAutoSave.start() comienza auto-save cada 30s
 *   profileAutoSave.stop() detiene auto-save
 *   profileAutoSave.isEnabled() boolean
 */

class ProfileAutoSave {
  constructor(intervalSeconds = 30) {
    this.intervalSeconds = intervalSeconds;
    this.intervalId = null;
    this.enabled = false;
    this.saveCount = 0;
    this.lastSaveTime = null;
    this.pendingChanges = false;
    this.onAutoSaveCallback = null; // Callback opcional para eventos
  }

  /**
   * Inicia el auto-save periódico
   */
  start() {
    if (this.enabled) {
      console.warn('[ProfileAutoSave] ⚠️ Auto-save ya está activo');
      return;
    }

    console.log(`[ProfileAutoSave] 🎯 Iniciando auto-save cada ${this.intervalSeconds} segundos...`);

    this.enabled = true;
    
    // Guardar inmediatamente la primera vez
    this._performAutoSave();

    // Luego cada N segundos
    this.intervalId = setInterval(() => {
      this._performAutoSave();
    }, this.intervalSeconds * 1000);

    // Escuchar cambios en perfiles para marcar pendingChanges
    this._setupChangeListeners();
  }

  /**
   * Detiene el auto-save
   */
  stop() {
    if (!this.enabled) {
      console.warn('[ProfileAutoSave] ⚠️ Auto-save no está activo');
      return;
    }

    console.log('[ProfileAutoSave] 🛑 Deteniendo auto-save...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.enabled = false;
  }

  /**
   * Realiza el auto-save
   * @private
   */
  _performAutoSave() {
    try {
      if (!this.pendingChanges) {
        console.log('[ProfileAutoSave] ℹ️ Sin cambios pendientes, saltando auto-save');
        return;
      }

      console.log('[ProfileAutoSave] 💾 Auto-save en progreso...');

      // Forzar guardado en stateManager
      const state = stateManager?.getState();
      if (state?.profiles) {
        stateManager?.setState({
          profiles: {
            activeProfile: profileManager?.activeProfile,
            list: profileManager?.profiles
          }
        });

        this.saveCount++;
        this.lastSaveTime = new Date();
        this.pendingChanges = false;

        console.log(`[ProfileAutoSave] ✓ Auto-save completado (${this.saveCount} total)`);
        
        // Ejecutar callback si existe
        if (this.onAutoSaveCallback) {
          this.onAutoSaveCallback({
            timestamp: this.lastSaveTime,
            saveCount: this.saveCount,
            profileId: profileManager?.activeProfile
          });
        }

        // Emitir evento
        eventBus?.emit('auto-save:completed', {
          timestamp: this.lastSaveTime,
          saveCount: this.saveCount
        });
      }
    } catch (error) {
      console.error('[ProfileAutoSave] ❌ Error en auto-save:', error);
    }
  }

  /**
   * Marca que hay cambios pendientes de guardar
   */
  markChanged() {
    this.pendingChanges = true;
  }

  /**
   * Configura listeners para detectar cambios
   * @private
   */
  _setupChangeListeners() {
    try {
      // Escuchar cambios de indicadores
      eventBus?.on('indicators:indicator:added', () => this.markChanged());
      eventBus?.on('indicators:indicator:deleted', () => this.markChanged());
      eventBus?.on('indicators:indicator:updated', () => this.markChanged());

      // Escuchar cambios de decisión (implica cambios de datos)
      eventBus?.on('indicators:decision:changed', () => this.markChanged());

      console.log('[ProfileAutoSave] ✓ Change listeners configurados');
    } catch (error) {
      console.warn('[ProfileAutoSave] ⚠️ Error configurando listeners:', error);
    }
  }

  /**
   * Obtiene estadísticas de auto-save
   */
  getStats() {
    return {
      enabled: this.enabled,
      saveCount: this.saveCount,
      lastSaveTime: this.lastSaveTime,
      pendingChanges: this.pendingChanges,
      intervalSeconds: this.intervalSeconds,
      status: this.enabled ? 'activo' : 'inactivo'
    };
  }

  /**
   * Obtiene estado legible
   */
  getStatus() {
    const stats = this.getStats();
    return `Auto-save: ${stats.status} | Guardados: ${stats.saveCount} | Pendientes: ${stats.pendingChanges ? 'Sí' : 'No'} | Último: ${stats.lastSaveTime ? stats.lastSaveTime.toLocaleTimeString('es-ES') : 'Nunca'}`;
  }

  /**
   * Establece callback para eventos de auto-save
   */
  onAutoSave(callback) {
    this.onAutoSaveCallback = callback;
  }

  /**
   * Configura el intervalo (en segundos)
   */
  setInterval(seconds) {
    if (seconds < 10) {
      console.warn('[ProfileAutoSave] ⚠️ Intervalo mínimo es 10 segundos');
      return;
    }

    this.intervalSeconds = seconds;
    
    if (this.enabled) {
      this.stop();
      this.start();
    }

    console.log(`[ProfileAutoSave] ⚙️ Intervalo configurado a ${seconds} segundos`);
  }
}

// Instancia global con intervalo por defecto de 30 segundos
const profileAutoSave = new ProfileAutoSave(30);
window.profileAutoSave = profileAutoSave;

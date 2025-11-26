/**
 * @file event-bus.js
 * @description Bus de eventos centralizado para comunicación entre módulos
 * Responsabilidades:
 * - Publicar eventos
 * - Suscribirse a eventos
 * - Desuscribirse de eventos
 * - Mantener historial de eventos (opcional)
 */

class EventBus {
  constructor() {
    this.events = {};
    this.eventHistory = [];
    this.maxHistorySize = 200;
  }

  /**
   * Suscribirse a un evento
   * @param {string} eventName - Nombre del evento
   * @param {Function} callback - Función a ejecutar
   * @returns {Function} Función para desuscribirse
   */
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    
    this.events[eventName].push(callback);
    
    // Retornar función para desuscribirse
    return () => this.off(eventName, callback);
  }

  /**
   * Suscribirse una sola vez a un evento
   */
  once(eventName, callback) {
    const wrappedCallback = (...args) => {
      callback(...args);
      this.off(eventName, wrappedCallback);
    };
    
    this.on(eventName, wrappedCallback);
  }

  /**
   * Desuscribirse de un evento
   */
  off(eventName, callback) {
    if (!this.events[eventName]) return;
    
    this.events[eventName] = this.events[eventName].filter(
      cb => cb !== callback
    );
  }

  /**
   * Emitir un evento
   */
  emit(eventName, data = null) {
    console.log(`[EventBus] 📡 Emitiendo: ${eventName}`, data);
    
    // Registrar en historial
    this.recordEvent(eventName, data);
    
    // Ejecutar callbacks
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error en callback de ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Registra un evento en el historial
   */
  recordEvent(eventName, data) {
    this.eventHistory.push({
      event: eventName,
      data,
      timestamp: new Date().toISOString()
    });
    
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Obtiene el historial de eventos
   */
  getHistory() {
    return [...this.eventHistory];
  }

  /**
   * Limpia el historial
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Obtiene información sobre eventos registrados
   */
  getEventStats() {
    const stats = {};
    Object.keys(this.events).forEach(eventName => {
      stats[eventName] = this.events[eventName].length;
    });
    return stats;
  }
}

// Exportar singleton
const eventBus = new EventBus();

/**
 * @file error-handler.js
 * @description Gestor centralizado de errores
 * Responsabilidades:
 * - Capturar y clasificar errores
 * - Registrar en console y/o sistema de logs
 * - Mostrar notificaciones al usuario
 * - Recuperarse de errores gracefully
 */

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.errorCallbacks = {};
    this.setupGlobalErrorHandling();
  }

  /**
   * Configura manejo de errores global
   */
  setupGlobalErrorHandling() {
    // Errores no capturados en JavaScript
    window.addEventListener('error', (event) => {
      this.handleError('UNCAUGHT_ERROR', event.error);
    });

    // Promesas rechazadas no manejadas
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('UNHANDLED_REJECTION', event.reason);
    });
  }

  /**
   * Maneja un error
   * @param {string} type - Tipo de error (API_ERROR, DOM_ERROR, etc.)
   * @param {Error|string} error - El error
   * @param {Object} context - Contexto adicional
   */
  handleError(type, error, context = {}) {
    const errorObj = {
      type,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      timestamp: new Date().toISOString(),
      context,
      ...context
    };

    console.error(`[ERROR] [${type}]`, errorObj);
    
    this.logError(errorObj);
    this.notifyUser(errorObj);
    this.triggerCallback(type, errorObj);
  }

  /**
   * Registra el error en el log
   */
  logError(errorObj) {
    this.errorLog.push(errorObj);
    
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  /**
   * Notifica al usuario sobre el error
   */
  notifyUser(errorObj) {
    // Aquí iría la lógica para mostrar notificaciones
    // Por ahora, solo console
    const message = `⚠️ ${errorObj.type}: ${errorObj.message}`;
    console.warn(message);
  }

  /**
   * Registra un callback para un tipo de error específico
   */
  onError(type, callback) {
    if (!this.errorCallbacks[type]) {
      this.errorCallbacks[type] = [];
    }
    this.errorCallbacks[type].push(callback);
  }

  /**
   * Dispara callbacks registrados para un tipo de error
   */
  triggerCallback(type, errorObj) {
    if (this.errorCallbacks[type]) {
      this.errorCallbacks[type].forEach(cb => cb(errorObj));
    }
  }

  /**
   * Obtiene el log de errores
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * Limpia el log de errores
   */
  clearErrorLog() {
    this.errorLog = [];
  }
}

// Exportar singleton
const errorHandler = new ErrorHandler();

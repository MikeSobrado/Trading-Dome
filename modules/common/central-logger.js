/**
 * @file central-logger.js
 * @description Sistema de logging centralizado para facilitar debugging
 * 
 * Responsabilidades:
 * - Proporcionar métodos de log consistentes para toda la app
 * - Categorizar mensajes por módulo y nivel
 * - Almacenar historial de logs (últimas 100 líneas)
 * - Permitir exportar logs para debugging
 * 
 * Uso:
 *   CentralLogger.info('[Module]', 'Mensaje')
 *   CentralLogger.warn('[Module]', 'Advertencia')
 *   CentralLogger.error('[Module]', 'Error')
 *   CentralLogger.getHistory() → últimas 100 líneas
 */

class CentralLogger {
  constructor() {
    this.maxHistorySize = 100;
    this.history = [];
    this.enabled = true;
    this.minLevel = 0; // 0=debug, 1=info, 2=warn, 3=error
  }

  /**
   * Log a nivel INFO
   */
  info(source, message, data = null) {
    this._log('INFO', source, message, data, 'log');
  }

  /**
   * Log a nivel WARN
   */
  warn(source, message, data = null) {
    this._log('WARN', source, message, data, 'warn');
  }

  /**
   * Log a nivel ERROR
   */
  error(source, message, data = null) {
    this._log('ERROR', source, message, data, 'error');
  }

  /**
   * Log a nivel DEBUG (verbose)
   */
  debug(source, message, data = null) {
    this._log('DEBUG', source, message, data, 'debug');
  }

  /**
   * Log interno
   * @private
   */
  _log(level, source, message, data, consoleMethod) {
    if (!this.enabled) return;

    const timestamp = new Date().toLocaleTimeString('es-ES');
    const logEntry = `[${timestamp}] ${level} ${source} ${message}`;

    // Agregar al historial
    this.history.push({
      timestamp,
      level,
      source,
      message,
      data,
      fullMessage: logEntry
    });

    // Limitar tamaño del historial
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Mostrar en console
    if (data) {
      console[consoleMethod](logEntry, data);
    } else {
      console[consoleMethod](logEntry);
    }
  }

  /**
   * Obtiene el historial de logs
   */
  getHistory(count = 20) {
    return this.history.slice(-count).map(entry => entry.fullMessage);
  }

  /**
   * Exporta logs a formato texto
   */
  exportLogs() {
    return this.history.map(entry => 
      `${entry.timestamp} [${entry.level}] ${entry.source} ${entry.message}${entry.data ? ' ' + JSON.stringify(entry.data) : ''}`
    ).join('\n');
  }

  /**
   * Limpia el historial
   */
  clearHistory() {
    this.history = [];
    this.info('[CentralLogger]', 'Historial limpiado');
  }

  /**
   * Habilita/deshabilita logging
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Exporta logs a archivo (descarga)
   * Útil para debugging en producción
   */
  downloadLogs() {
    const content = this.exportLogs();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-dome-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Muestra resumen en console
   */
  showSummary() {
    const summary = {
      totalLogs: this.history.length,
      errors: this.history.filter(e => e.level === 'ERROR').length,
      warnings: this.history.filter(e => e.level === 'WARN').length,
      lastLogs: this.getHistory(5)
    };
    console.table(summary);
  }
}

// Instancia global - accesible como window.centralLogger o centralLogger
const centralLogger = new CentralLogger();
window.centralLogger = centralLogger;

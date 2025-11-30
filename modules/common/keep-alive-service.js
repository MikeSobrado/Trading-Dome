/**
 * @file keep-alive-service.js
 * @description Servicio para mantener vivo el proxy de Render
 * Responsabilidades:
 * - Enviar peticiones periódicas al proxy para evitar hibernación
 * - Mantenerse activo independientemente de qué pestaña esté visible
 * - Puede pausarse si las credenciales no están configuradas
 */

class KeepAliveService {
  constructor() {
    // Usar variables globales expuestas por apisModule
    this.apiConfigManager = window.apiConfigManager;
    this.bitgetConnector = window.bitgetConnector;
    this.keepAliveInterval = null;
    this.keepAliveMs = 30000; // Ping cada 30 segundos
    this.isActive = false;

    if (!this.apiConfigManager || !this.bitgetConnector) {
      console.warn('[KeepAlive] ⚠️ Dependencias no disponibles globalmente');
    }
  }

  /**
   * Inicia el servicio keep-alive
   */
  start() {
    if (this.keepAliveInterval) {
      return;
    }

    console.log('[KeepAlive] ✓ Servicio iniciado (ping cada 30s)');
    this.isActive = true;

    // Primera petición inmediata
    this.sendKeepAlive();

    // Luego cada 30 segundos
    this.keepAliveInterval = setInterval(() => {
      this.sendKeepAlive();
    }, this.keepAliveMs);
  }

  /**
   * Envía una petición keep-alive al proxy
   * @private
   */
  async sendKeepAlive() {
    try {
      if (!this.apiConfigManager.isConfigured('bitget')) {
        return;
      }

      // Usar getOpenPositions en lugar de getAccountInfo (más confiable)
      // Es una petición ligera que ya sabemos que funciona
      await this.bitgetConnector.getOpenPositions();
    } catch (error) {
      // Silenciar errores - el servicio continúa intentando
      // El proxy podría estar temporalmente indisponible
    }
  }

  /**
   * Detiene el servicio keep-alive
   */
  stop() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      this.isActive = false;
    }
  }

  /**
   * Reinicia el servicio (útil cuando cambian credenciales)
   */
  restart() {
    this.stop();
    this.start();
  }

  /**
   * Obtiene estado del servicio
   */
  getStatus() {
    return {
      isActive: this.isActive,
      interval: this.keepAliveMs,
      configured: this.apiConfigManager.isConfigured('bitget')
    };
  }
}

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeepAliveService;
}

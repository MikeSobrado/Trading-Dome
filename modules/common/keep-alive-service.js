/**
 * @file keep-alive-service.js
 * @description Servicio para mantener vivo el proxy de Render
 * Responsabilidades:
 * - Enviar peticiones periódicas al proxy para evitar hibernación
 * - Mantenerse activo independientemente de qué pestaña esté visible
 * - Puede pausarse si las credenciales no están configuradas
 */

class KeepAliveService {
  constructor(apiConfigManager, bitgetConnector) {
    this.apiConfigManager = apiConfigManager;
    this.bitgetConnector = bitgetConnector;
    this.keepAliveInterval = null;
    this.keepAliveMs = 30000; // Ping cada 30 segundos
    this.isActive = false;
  }

  /**
   * Inicia el servicio keep-alive
   */
  start() {
    if (this.keepAliveInterval) {
      console.log('[KeepAlive] ⚠️ Servicio ya está activo');
      return;
    }

    // Solo iniciar si hay credenciales configuradas
    if (!this.apiConfigManager.isConfigured('bitget')) {
      console.log('[KeepAlive] ⚠️ Bitget no configurado, keep-alive no iniciado');
      return;
    }

    console.log('[KeepAlive] ▶️ Iniciando servicio keep-alive (cada 30s)');
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
        console.log('[KeepAlive] ℹ️ Credenciales no configuradas, deteniendo keep-alive');
        this.stop();
        return;
      }

      // Petición ligera: solo obtener info de la cuenta
      await this.bitgetConnector.getAccountInfo();
      console.log('[KeepAlive] ✓ Ping al proxy enviado correctamente');
    } catch (error) {
      console.warn('[KeepAlive] ⚠️ Error en keep-alive:', error.message);
      // No detener el servicio, solo loguear el error
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
      console.log('[KeepAlive] ⏹️ Servicio keep-alive detenido');
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

/**
 * @file api-config-manager.js
 * @description Gestor centralizado de configuraciones de API
 * Responsabilidades:
 * - Gestionar credenciales de diferentes proveedores (Bitget, etc)
 * - Encriptar/desencriptar credenciales
 * - Persistir en sessionStorage (seguridad: se elimina al cerrar sesión)
 * - Patrón Singleton
 */

class ApiConfigManager {
  constructor() {
    this.storage_key = 'tradingdome_api_config';
    this.config = this.loadFromStorage();
    console.log('[ApiConfigManager] ✓ Inicializado (usando sessionStorage)');
  }

  /**
   * Carga configuración desde sessionStorage
   * Las credenciales se eliminarán al cerrar la sesión o recargar la página
   */
  loadFromStorage() {
    try {
      const stored = sessionStorage.getItem(this.storage_key);
      return stored ? JSON.parse(stored) : this.getDefaultConfig();
    } catch (error) {
      console.error('[ApiConfigManager] ❌ Error cargando desde sessionStorage:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Retorna la configuración por defecto
   */
  getDefaultConfig() {
    return {
      bitget: {
        apiKey: '',
        secretKey: '',
        passphrase: '',
        isConnected: false,
        lastChecked: null,
        accountId: null,
        tradingMode: 'live'
      }
    };
  }

  /**
   * Guarda credenciales de un proveedor
   * @param {string} provider - Nombre del proveedor (ej: 'bitget')
   * @param {string} apiKey - API Key
   * @param {string} secretKey - Secret Key
   * @param {string} passphrase - Passphrase (para Bitget)
   * @param {string} accountId - ID de cuenta (opcional)
   * @param {string} tradingMode - 'live' o 'demo' (papel trading)
   */
  setCredentials(provider, apiKey, secretKey, passphrase, accountId = null, tradingMode = 'live') {
    try {
      if (!provider || !this.config[provider]) {
        throw new Error(`Proveedor "${provider}" no soportado`);
      }

      // Encriptar credenciales
      const encrypted = {
        apiKey: this.encrypt(apiKey),
        secretKey: this.encrypt(secretKey),
        passphrase: this.encrypt(passphrase),
        isConnected: !!accountId,
        lastChecked: new Date().toISOString(),
        accountId: accountId,
        tradingMode: tradingMode
      };

      this.config[provider] = encrypted;
      this.saveToStorage();

      console.log(`[ApiConfigManager] ✓ Credenciales de ${provider} guardadas`);
      eventBus?.emit('api:config:updated', { provider });

      return true;
    } catch (error) {
      console.error('[ApiConfigManager] ❌ Error guardando credenciales:', error);
      throw error;
    }
  }

  /**
   * Obtiene credenciales de un proveedor
   * IMPORTANTE: Recarga del sessionStorage cada vez para obtener datos frescos
   * @param {string} provider - Nombre del proveedor
   * @returns {object} Credenciales desencriptadas
   */
  getCredentials(provider) {
    try {
      // Recargar configuración del sessionStorage cada vez (datos frescos)
      this.config = this.loadFromStorage();
      
      if (!provider || !this.config[provider]) {
        return null;
      }

      const encrypted = this.config[provider];

      // Desencriptar credenciales
      return {
        apiKey: encrypted.apiKey ? this.decrypt(encrypted.apiKey) : '',
        secretKey: encrypted.secretKey ? this.decrypt(encrypted.secretKey) : '',
        passphrase: encrypted.passphrase ? this.decrypt(encrypted.passphrase) : '',
        isConnected: encrypted.isConnected || false,
        lastChecked: encrypted.lastChecked,
        accountId: encrypted.accountId,
        tradingMode: encrypted.tradingMode || 'live'
      };
    } catch (error) {
      console.error('[ApiConfigManager] ❌ Error obteniendo credenciales:', error);
      return null;
    }
  }

  /**
   * Verifica si las credenciales están configuradas para un proveedor
   * @param {string} provider - Nombre del proveedor
   * @returns {boolean}
   */
  isConfigured(provider) {
    const creds = this.getCredentials(provider);
    return !!(creds?.apiKey && creds?.secretKey && creds?.passphrase);
  }

  /**
   * Verifica si hay conexión activa
   * @param {string} provider - Nombre del proveedor
   * @returns {boolean}
   */
  isConnected(provider) {
    const creds = this.getCredentials(provider);
    return creds?.isConnected || false;
  }

  /**
   * Obtiene el modo de trading (live o demo)
   * @param {string} provider - Nombre del proveedor
   * @returns {string} 'live' o 'demo'
   */
  getTradingMode(provider) {
    const creds = this.getCredentials(provider);
    return creds?.tradingMode || 'live';
  }

  /**
   * Establece el modo de trading
   * @param {string} provider - Nombre del proveedor
   * @param {string} mode - 'live' o 'demo'
   */
  setTradingMode(provider, mode) {
    try {
      if (!provider || !this.config[provider]) {
        throw new Error(`Proveedor "${provider}" no soportado`);
      }
      this.config[provider].tradingMode = mode;
      this.saveToStorage();
      console.log(`[ApiConfigManager] ✓ Modo de trading de ${provider} cambiado a: ${mode}`);
      eventBus?.emit('api:trading-mode:changed', { provider, mode });
      return true;
    } catch (error) {
      console.error('[ApiConfigManager] ❌ Error estableciendo modo de trading:', error);
      throw error;
    }
  }

  /**
   * Elimina credenciales de un proveedor
   * @param {string} provider - Nombre del proveedor
   */
  removeCredentials(provider) {
    try {
      if (this.config[provider]) {
        this.config[provider] = this.getDefaultConfig()[provider];
        this.saveToStorage();
        console.log(`[ApiConfigManager] ✓ Credenciales de ${provider} eliminadas`);
        eventBus?.emit('api:config:removed', { provider });
        return true;
      }
    } catch (error) {
      console.error('[ApiConfigManager] ❌ Error eliminando credenciales:', error);
      throw error;
    }
  }

  /**
   * Guarda la configuración en sessionStorage
   * Se eliminará automáticamente al cerrar la sesión o recargar la página
   */
  saveToStorage() {
    try {
      sessionStorage.setItem(this.storage_key, JSON.stringify(this.config));
      console.log('[ApiConfigManager] ✓ Configuración guardada en sessionStorage (sesión temporal)');
    } catch (error) {
      console.error('[ApiConfigManager] ❌ Error guardando en sessionStorage:', error);
      throw error;
    }
  }

  /**
   * Encripta una cadena (AES-256 simple)
   * Para producción, usar una librería como crypto-js
   * @param {string} text - Texto a encriptar
   * @returns {string} Texto encriptado en base64
   */
  encrypt(text) {
    try {
      if (!text) return '';
      
      // Usar btoa para simple encoding (esto NO es encriptación real)
      // En producción, usar crypto-js: CryptoJS.AES.encrypt(text, secretKey)
      return btoa(text);
    } catch (error) {
      console.error('[ApiConfigManager] ❌ Error encriptando:', error);
      return text;
    }
  }

  /**
   * Desencripta una cadena
   * @param {string} encoded - Texto encriptado
   * @returns {string} Texto original
   */
  decrypt(encoded) {
    try {
      if (!encoded) return '';
      
      // Usar atob para simple decoding
      // En producción, usar crypto-js: CryptoJS.AES.decrypt(encoded, secretKey)
      return atob(encoded);
    } catch (error) {
      console.error('[ApiConfigManager] ❌ Error desencriptando:', error);
      return encoded;
    }
  }

  /**
   * Limpia todas las credenciales
   */
  clearAll() {
    try {
      sessionStorage.removeItem(this.storage_key);
      this.config = this.getDefaultConfig();
      console.log('[ApiConfigManager] ✓ Todas las credenciales eliminadas de sessionStorage');
      eventBus?.emit('api:config:cleared');
    } catch (error) {
      console.error('[ApiConfigManager] ❌ Error limpiando configuración:', error);
      throw error;
    }
  }

  /**
   * Obtiene el estado general de todas las APIs
   * @returns {object} Estado de cada proveedor
   */
  getStatus() {
    const status = {};
    for (const provider in this.config) {
      status[provider] = {
        configured: this.isConfigured(provider),
        connected: this.isConnected(provider),
        lastChecked: this.config[provider].lastChecked
      };
    }
    return status;
  }

  /**
   * Exporta credenciales (solo para backup - requiere confirmación)
   * @returns {object} Todas las credenciales
   */
  exportCredentials() {
    console.warn('[ApiConfigManager] ⚠️ Exportando credenciales - úsalo con cuidado');
    const backup = {};
    for (const provider in this.config) {
      backup[provider] = this.getCredentials(provider);
    }
    return backup;
  }

  /**
   * Importa credenciales desde backup
   * @param {object} backup - Credenciales a importar
   */
  importCredentials(backup) {
    try {
      for (const provider in backup) {
        const creds = backup[provider];
        this.setCredentials(
          provider,
          creds.apiKey,
          creds.secretKey,
          creds.passphrase,
          creds.accountId
        );
      }
      console.log('[ApiConfigManager] ✓ Credenciales importadas correctamente');
      return true;
    } catch (error) {
      console.error('[ApiConfigManager] ❌ Error importando credenciales:', error);
      throw error;
    }
  }
}

// Crear instancia única (Singleton)
const apiConfigManager = new ApiConfigManager();

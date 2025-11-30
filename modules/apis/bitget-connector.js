/**
 * @file bitget-connector.js
 * @description Conector a la API de Bitget
 * Responsabilidades:
 * - Generar signatures HMAC-SHA256
 * - Hacer requests autenticados a Bitget API
 * - Obtener posiciones abiertas y cerradas
 * - Obtener información de cuenta
 * 
 * NOTA: Requiere crypto-js para HMAC-SHA256
 * Instalar: npm install crypto-js
 */

class BitgetConnector {
  constructor(apiConfigManager) {
    this.apiConfigManager = apiConfigManager;
    this.baseURL = 'https://api.bitget.com';
    this.apiVersion = 'v2';
    console.log('[BitgetConnector] ✓ Inicializado');
  }

  /**
   * Obtiene la URL base del proxy según el ambiente
   * @returns {string} URL del proxy (local o Render)
   */
  getProxyUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000'; // Desarrollo local
    }
    // GitHub Pages y otros: usa Render
    return 'https://trading-dome-dashboard.onrender.com';
  }

  /**
   * Prueba conexión a Bitget
   * @param {string} apiKey 
   * @param {string} secretKey 
   * @param {string} passphrase 
   * @returns {Promise<{success: boolean, accountId?: string, error?: string}>}
   */
  async testConnection(apiKey, secretKey, passphrase) {
    try {
      // Obtener modo de trading
      const tradingMode = this.apiConfigManager.getTradingMode('bitget');
      const isPaperTrading = tradingMode === 'demo';

      const proxyUrl = this.getProxyUrl();

      const requestBody = {
        apiKey: apiKey,
        apiSecret: secretKey,
        apiPassphrase: passphrase,
        method: 'GET',
        path: '/api/v2/mix/position/all-position',
        params: { productType: 'USDT-FUTURES' },
        body: '',
        paptrading: isPaperTrading ? '1' : '0'
      };

      // Usar proxy del servidor
      const response = await fetch(`${proxyUrl}/api/bitget`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(isPaperTrading && { 'paptrading': '1' })
        },
        body: JSON.stringify(requestBody)
      });

      // Leer como texto primero para evitar "Body already consumed"
      const responseText = await response.text();
      // Intentar parsear como JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('[BitgetConnector] ⚠️ Error parseando respuesta');
        throw new Error('Respuesta del proxy no es válida');
      }

      if (result.code === '00000' && result.data) {
        console.log('[BitgetConnector] ✅ Conexión exitosa');
        return {
          success: true,
          accountId: result.data.uid || 'verified',
          method: 'proxy'
        };
      }
      
      // Si el proxy respondió pero sin código 00000
      if (result.error) {
        throw new Error(`Error del proxy: ${result.error} - ${result.message || ''}`);
      } else if (result.msg) {
        throw new Error(`Bitget error: ${result.msg}`);
      } else if (result.code) {
        throw new Error(`Error Bitget ${result.code}: ${result.msg || 'Sin mensaje'}`);
      } else {
        throw new Error('Respuesta inesperada de Bitget: ' + JSON.stringify(result).substring(0, 200));
      }
    } catch (error) {
      console.error('[BitgetConnector] ❌ Error probando conexión:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtiene posiciones abiertas del usuario
   * @returns {Promise<Array>} Array de posiciones abiertas
   */
  async getOpenPositions() {
    try {
      console.log('[BitgetConnector] 📂 Obteniendo posiciones abiertas...');

      if (!this.apiConfigManager.isConfigured('bitget')) {
        throw new Error('Credenciales de Bitget no configuradas');
      }

      const creds = this.apiConfigManager.getCredentials('bitget');

      // Endpoint para posiciones abiertas (FUTURES)
      // Documentación: https://www.bitget.com/api-doc/contract/position/get-all-position
      // Agregamos marginCoin para obtener más datos (openPriceAvg, breakEvenPrice, etc)
      const result = await this.makeRequest(
        'GET',
        '/api/v2/mix/position/all-position',
        { 
          productType: 'USDT-FUTURES',
          marginCoin: 'USDT'  // Agregado para obtener datos completos
        },
        creds
      );

      if (result.code === '00000' && result.data) {
        return result.data;
      } else {
        throw new Error(result.msg || 'Error obteniendo posiciones');
      }
    } catch (error) {
      console.error('[BitgetConnector] ❌ Error obteniendo posiciones abiertas:', error);
      throw error;
    }
  }

  /**
   * Obtiene información de una posición específica
   * @param {string} symbol - Símbolo (ej: BTCUSDT)
   * @param {string} productType - Tipo de producto (default: USDT-FUTURES)
   * @param {string} marginCoin - Moneda de margen (default: USDT)
   * @returns {Promise<Array>} Array con 1 posición (o vacío si no existe)
   */
  async getSinglePosition(symbol, productType = 'USDT-FUTURES', marginCoin = 'USDT') {
    try {
      console.log(`[BitgetConnector] 🔍 Obteniendo posición single: ${symbol}...`);

      if (!this.apiConfigManager.isConfigured('bitget')) {
        throw new Error('Credenciales de Bitget no configuradas');
      }

      const creds = this.apiConfigManager.getCredentials('bitget');

      // Endpoint para una posición específica
      // Documentación: https://www.bitget.com/api-doc/contract/position/get-single-position
      const result = await this.makeRequest(
        'GET',
        '/api/v2/mix/position/single-position',
        { 
          symbol,
          productType,
          marginCoin
        },
        creds
      );

      if (result.code === '00000' && result.data) {
        console.log(`[BitgetConnector] ✓ Posición single obtenida: ${symbol}`);
        
        // Loguear los campos disponibles en single-position
        if (result.data.length > 0) {
          console.log('[BitgetConnector] 📊 CAMPOS DISPONIBLES (single-position):');
          const pos = result.data[0];
          console.log('Campos:', Object.keys(pos).sort());
          console.log('marginSize:', pos.marginSize);
          console.log('marginRatio:', pos.marginRatio);
          console.log('totalFee:', pos.totalFee);
          console.log('deductedFee:', pos.deductedFee);
          console.log('marginMode:', pos.marginMode);
          console.log('achievedProfits:', pos.achievedProfits);
        }
        
        return result.data;
      } else {
        console.warn(`[BitgetConnector] ⚠️ No se encontró posición para ${symbol}`);
        return [];
      }
    } catch (error) {
      console.error(`[BitgetConnector] ❌ Error obteniendo single-position para ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene posiciones CERRADAS del usuario (histórico)
   * @param {object} params - Parámetros opcionales
   *   - startTime: timestamp inicial (ms)
   *   - endTime: timestamp final (ms)
   *   - limit: número máximo de registros (default: 100, max: 500)
   *   - idLessThan: para paginación
   * @returns {Promise<Array>} Array de posiciones cerradas
   */
  async getClosedPositions(params = {}) {
    try {
      console.log('[BitgetConnector] 📋 Obteniendo posiciones cerradas (histórico)...');

      if (!this.apiConfigManager.isConfigured('bitget')) {
        throw new Error('Credenciales de Bitget no configuradas');
      }

      const creds = this.apiConfigManager.getCredentials('bitget');

      // Parámetros por defecto
      const queryParams = {
        productType: 'USDT-FUTURES',
        limit: params.limit || 100,
        ...params
      };

      // Endpoint para histórico de posiciones cerradas (FUTURES)
      // Documentación: https://www.bitget.com/api-doc/contract/position/Get-History-Position
      const result = await this.makeRequest(
        'GET',
        '/api/v2/mix/position/history-position',
        queryParams,
        creds
      );

      console.log('[BitgetConnector] 📦 Respuesta de getClosedPositions:', result);
      console.log('[BitgetConnector] 📦 Type de result.data:', typeof result.data);
      console.log('[BitgetConnector] 📦 result.data es array?:', Array.isArray(result.data));
      console.log('[BitgetConnector] 📦 result.data keys:', Object.keys(result.data || {}));

      // Bitget puede devolver data como objeto con propiedades, hay que buscar el array
      let positionsArray = result.data;
      
      if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
        // Buscar la primera propiedad que sea un array
        for (const key of Object.keys(result.data)) {
          if (Array.isArray(result.data[key])) {
            console.log(`[BitgetConnector] 📦 Array encontrado en result.data.${key}`);
            positionsArray = result.data[key];
            break;
          }
        }
      }

      if (result.code === '00000' && positionsArray) {
        console.log(`[BitgetConnector] ✓ Se obtuvieron ${positionsArray.length} posiciones cerradas del histórico`);
        // Log de la primera posición para ver estructura - TODOS LOS CAMPOS
        if (positionsArray.length > 0) {
          console.log('[BitgetConnector] 📋 TODOS LOS CAMPOS de una posición:');
          const firstPos = positionsArray[0];
          Object.keys(firstPos).forEach(key => {
            console.log(`  - ${key}: ${JSON.stringify(firstPos[key])}`);
          });
        }
        return positionsArray;
      } else {
        console.warn('[BitgetConnector] ⚠️ Respuesta sin datos válidos:', result);
        throw new Error(result.msg || 'Error obteniendo posiciones cerradas');
      }
    } catch (error) {
      console.error('[BitgetConnector] ❌ Error obteniendo posiciones cerradas:', error);
      throw error;
    }
  }

  /**
   * Obtiene histórico de órdenes cerradas
   * @param {object} params - Parámetros opcionales
   * @returns {Promise<Array>} Array de órdenes
   */
  async getOrderHistory(params = {}) {
    try {
      console.log('[BitgetConnector] 📜 Obteniendo histórico de órdenes...');

      if (!this.apiConfigManager.isConfigured('bitget')) {
        throw new Error('Credenciales de Bitget no configuradas');
      }

      const creds = this.apiConfigManager.getCredentials('bitget');

      const queryParams = {
        productType: 'USDT-FUTURES',
        ordStatus: 'closed',
        limit: params.limit || 100,
        ...params
      };

      // Endpoint para histórico de órdenes
      const result = await this.makeRequest(
        'GET',
        '/api/v2/mix/order/orders-history',
        queryParams,
        creds
      );

      if (result.code === '00000' && result.data) {
        console.log(`[BitgetConnector] ✓ Se obtuvieron ${result.data.length} órdenes cerradas`);
        return result.data;
      } else {
        throw new Error(result.msg || 'Error obteniendo histórico');
      }
    } catch (error) {
      console.error('[BitgetConnector] ❌ Error obteniendo histórico de órdenes:', error);
      throw error;
    }
  }

  /**
   * Obtiene información de la cuenta
   * @returns {Promise<object>} Información de la cuenta
   */
  async getAccountInfo() {
    try {
      console.log('[BitgetConnector] 👤 Obteniendo información de cuenta...');

      if (!this.apiConfigManager.isConfigured('bitget')) {
        throw new Error('Credenciales de Bitget no configuradas');
      }

      const creds = this.apiConfigManager.getCredentials('bitget');

      const result = await this.makeRequest(
        'GET',
        '/account/v2/account/info',
        {},
        creds
      );

      if (result.code === '00000' && result.data) {
        console.log('[BitgetConnector] ✓ Información de cuenta obtenida');
        return result.data;
      } else {
        throw new Error(result.msg || 'Error obteniendo información');
      }
    } catch (error) {
      console.error('[BitgetConnector] ❌ Error obteniendo información de cuenta:', error);
      throw error;
    }
  }

  /**
   * Realiza una request autenticada a la API de Bitget através del proxy del servidor
   * El servidor genera la firma HMAC-SHA256 (más confiable que en navegador)
   * @param {string} method - GET, POST, etc
   * @param {string} path - Ruta del endpoint
   * @param {object} params - Parámetros de query o body
   * @param {object} credentials - {apiKey, secretKey, passphrase}
   * @returns {Promise<object>} Respuesta de la API
   */
  async makeRequest(method, path, params, credentials) {
    try {
      // Obtener modo de trading
      const tradingMode = this.apiConfigManager.getTradingMode('bitget');
      const isPaperTrading = tradingMode === 'demo';

      // Enviar al proxy del servidor que firma la petición
      // El servidor generará la firma con crypto.createHmac (confiable)
      // Endpoint: /api/bitget - mismo que en old/server.js
      const proxyUrl = this.getProxyUrl();
      const response = await fetch(`${proxyUrl}/api/bitget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isPaperTrading && { 'paptrading': '1' })
        },
        body: JSON.stringify({
          apiKey: credentials.apiKey,
          apiSecret: credentials.secretKey,  // Nota: "apiSecret" para el servidor
          apiPassphrase: credentials.passphrase,
          method: method,
          path: path,
          params: params || {},
          body: '',
          paptrading: isPaperTrading ? '1' : '0'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.msg || data.error || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      console.error('[BitgetConnector] ❌ Error en request:', error);
      throw error;
    }
  }

  /**
   * Genera firma HMAC-SHA256 (DEPRECADO - ahora se genera en servidor)
   * Se mantiene solo para compatibilidad y logging
   * @param {string} method 
   * @param {string} requestPath 
   * @param {string} body 
   * @param {string} timestamp 
   * @param {string} secretKey 
   * @returns {string} Firma en base64
   */
  generateSignature(method, requestPath, body, timestamp, secretKey) {
    return 'server-generated';
  }

  /**
   * Construye query string desde objeto
   * @param {object} params 
   * @returns {string}
   */
  buildQueryString(params) {
    if (!params || Object.keys(params).length === 0) return '';
    
    return Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * Procesa datos de posiciones cerradas para el dashboard
   * @param {Array} posiciones - Datos crudos de Bitget
   * @returns {Array} Posiciones formateadas
   */
  formatClosedPositions(posiciones) {
    return posiciones.map(pos => ({
      id: pos.posId || pos.id,
      symbol: pos.symbol,
      type: pos.holdSide === 'long' ? 'LONG' : 'SHORT',
      entryPrice: parseFloat(pos.averagePrice || pos.openPrice),
      exitPrice: parseFloat(pos.exitPrice || pos.closePrice),
      quantity: parseFloat(pos.total),
      openTime: new Date(parseInt(pos.openTime)).toISOString(),
      closeTime: new Date(parseInt(pos.closeTime)).toISOString(),
      pnl: parseFloat(pos.pnl),
      pnlPercent: parseFloat(pos.pnlRatio) * 100,
      commission: parseFloat(pos.fee || 0)
    }));
  }

  /**
   * Procesa datos de cuenta para el dashboard
   * @param {Array} accountInfo - Datos crudos de Bitget
   * @returns {object} Información procesada
   */
  formatAccountInfo(accountInfo) {
    if (!Array.isArray(accountInfo) || accountInfo.length === 0) {
      return null;
    }

    const account = accountInfo[0];
    return {
      userId: account.userId || account.uid,
      accountName: account.accountName || 'Default',
      totalEquity: parseFloat(account.totalEquity || 0),
      availableBalance: parseFloat(account.available || 0),
      unrealizedPnL: parseFloat(account.unrealizedPL || 0),
      updatedAt: new Date().toISOString()
    };
  }
}

// Crear instancia
const bitgetConnector = typeof apiConfigManager !== 'undefined' 
  ? new BitgetConnector(apiConfigManager)
  : null;

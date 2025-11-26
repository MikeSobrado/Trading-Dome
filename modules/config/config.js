/**
 * @file config.js
 * @description Configuración centralizada de la aplicación
 * Responsabilidades:
 * - Almacenar configuración global
 * - APIs endpoints
 * - Parámetros de aplicación
 * - Valores por defecto
 */

const AppConfig = {
  // Información de la aplicación
  app: {
    name: 'Trading Dome Dashboard',
    version: '1.0.0',
    author: 'Mike Sobrado',
    description: 'Dashboard de análisis de trading en tiempo real'
  },

  // URLs de API
  api: {
    // Local/desarrollo
    local: {
      proxy: 'http://localhost:3000',
      altProxy: 'http://localhost:8000'
    },
    
    // Producción
    production: {
      proxy: 'https://trading-dome-dashboard.onrender.com',
      github: 'https://mikesobrado.github.io/trading-dome-dashboard'
    },
    
    // Endpoints específicos
    endpoints: {
      bitget: '/api/bitget',
      dominance: '/api/dominance',
      fearGreed: '/api/fear-greed',
      coinmarketcap: '/api/cmc'
    }
  },

  // Configuración de timeouts
  timeouts: {
    apiCall: 15000,        // 15 segundos
    dataRefresh: 60000,    // 1 minuto
    debounce: 300,         // 300ms
    throttle: 1000         // 1 segundo
  },

  // Configuración de UI
  ui: {
    darkMode: true,
    language: 'es',
    defaultTab: 'analisis',
    animationsEnabled: true
  },

  // Configuración de logging
  logging: {
    enabled: true,
    level: 'info', // 'debug', 'info', 'warn', 'error'
    maxLogSize: 1000
  },

  // Configuración de cache
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutos
    maxSize: 50  // máximo de items
  },

  // Pares de trading por defecto
  trading: {
    defaultPairs: ['BTCUSDT', 'ETHUSDT'],
    updateInterval: 5000, // 5 segundos
    chartIntervals: ['1m', '5m', '15m', '1h', '4h', '1d']
  },

  // Configuración de notificaciones
  notifications: {
    enabled: true,
    position: 'top-right',
    duration: 5000
  }
};

// Función para obtener configuración
function getConfig(path) {
  const keys = path.split('.');
  let value = AppConfig;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      console.warn(`[Config] Configuración no encontrada: ${path}`);
      return undefined;
    }
  }
  
  return value;
}

// Función para establecer configuración
function setConfig(path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  let obj = AppConfig;
  
  for (const key of keys) {
    if (!(key in obj)) {
      obj[key] = {};
    }
    obj = obj[key];
  }
  
  obj[lastKey] = value;
  console.log(`[Config] Configuración actualizada: ${path}`);
}

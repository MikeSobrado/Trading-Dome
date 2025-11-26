/**
 * @file utils.js
 * @description Funciones de utilidad general reutilizables
 */

class Utils {
  /**
   * Formatea un número a moneda
   */
  static formatCurrency(value, decimals = 2) {
    if (!this.isNumber(value)) return '0.00';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  /**
   * Formatea un número con separadores de miles
   */
  static formatNumber(value, decimals = 2) {
    if (!this.isNumber(value)) return '0';
    return value.toLocaleString('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Formatea un porcentaje
   */
  static formatPercent(value, decimals = 2) {
    if (!this.isNumber(value)) return '0%';
    return `${this.formatNumber(value, decimals)}%`;
  }

  /**
   * Valida si es un número
   */
  static isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
  }

  /**
   * Validar si es objeto
   */
  static isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Clona un objeto profundamente
   */
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Espera un tiempo (ms)
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debounce una función
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle una función
   */
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Obtiene un parámetro de URL
   */
  static getURLParameter(paramName) {
    const params = new URLSearchParams(window.location.search);
    return params.get(paramName);
  }

  /**
   * Convierte objeto a query string
   */
  static toQueryString(obj) {
    return Object.keys(obj)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
      .join('&');
  }

  /**
   * Genera un ID único
   */
  static generateId(prefix = '') {
    return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

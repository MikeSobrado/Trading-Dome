/**
 * @file validators.js
 * @description Funciones de validación reutilizables
 * Responsabilidades:
 * - Validar datos de entrada
 * - Validar formato de APIs
 * - Validar configuración
 */

class Validators {
  /**
   * Valida si un valor es un número válido
   */
  static isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
  }

  /**
   * Valida si un valor es una cadena no vacía
   */
  static isString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Valida si un valor es un objeto
   */
  static isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Valida si un valor es un array
   */
  static isArray(value) {
    return Array.isArray(value);
  }

  /**
   * Valida si una URL es válida
   */
  static isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida si un JSON es válido
   */
  static isValidJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida un símbolo de trading (ej: BTCUSDT)
   */
  static isValidSymbol(symbol) {
    return this.isString(symbol) && /^[A-Z0-9]+USDT$/.test(symbol);
  }

  /**
   * Valida un número dentro de un rango
   */
  static isInRange(value, min, max) {
    return this.isNumber(value) && value >= min && value <= max;
  }

  /**
   * Valida que un objeto tenga todas las propiedades requeridas
   */
  static hasRequiredProps(obj, requiredProps) {
    return this.isObject(obj) && requiredProps.every(prop => prop in obj);
  }
}

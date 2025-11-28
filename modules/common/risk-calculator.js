/**
 * @file risk-calculator.js
 * @description Calculadora de riesgo reutilizable
 * Responsabilidades:
 * - Calcular todos los parámetros de riesgo desde inputs
 * - Proporcionar interfaz consistente para todos los módulos
 * - Permitir extensión de cálculos sin duplicar código
 * 
 * Uso:
 * const calculator = new RiskCalculator({
 *   capital: 1000,
 *   apalancamiento: 20,
 *   precioEntrada: 100,
 *   precioSL: 95,
 *   precioSalida: 110,
 *   riesgoBeneficio: 2,
 *   riesgoMaximo: 3,
 *   comision: 0.06,
 *   financiacion: 0,
 *   spread: 0,
 *   operacionTipo: 'long'
 * });
 * const results = calculator.calculate();
 * // results = { distanciaRiesgo, margen, posicionTotal, perdidaEnDolares, ganancia, ... }
 */

class RiskCalculator {
  /**
   * @param {Object} params - Parámetros de entrada
   */
  constructor(params = {}) {
    this.params = {
      capital: params.capital || 0,
      apalancamiento: params.apalancamiento || 1,
      riesgoMaximo: params.riesgoMaximo || 0,
      precioEntrada: params.precioEntrada || 0,
      precioSL: params.precioSL || 0,
      precioSalida: params.precioSalida || 0,
      riesgoBeneficio: params.riesgoBeneficio || 0,
      comision: params.comision || 0,
      financiacion: params.financiacion || 0,
      spread: params.spread || 0,
      operacionTipo: params.operacionTipo || 'long'
    };
    this.results = null;
  }

  /**
   * Calcula todos los parámetros de riesgo
   * @returns {Object} Objeto con todos los resultados calculados
   */
  calculate() {
    try {
      const {
        capital,
        apalancamiento,
        riesgoMaximo,
        precioEntrada,
        precioSL,
        precioSalida,
        riesgoBeneficio,
        comision,
        financiacion,
        spread,
        operacionTipo
      } = this.params;

      // Distancia de Riesgo (%)
      const distanciaRiesgo = precioEntrada > 0
        ? Math.abs(((precioEntrada - precioSL) / precioEntrada) * 100)
        : 0;

      // Margen
      const margen = distanciaRiesgo > 0
        ? ((capital * riesgoMaximo) / 100 / (distanciaRiesgo / 100)) / apalancamiento
        : 0;

      // Posición Total
      const posicionTotal = margen * apalancamiento;

      // Pérdida en Dólares
      const perdidaEnDolares = posicionTotal * (distanciaRiesgo / 100);

      // Ganancia según tipo de operación
      let ganancia = 0;
      if (operacionTipo === 'long') {
        ganancia = precioEntrada > 0
          ? posicionTotal * ((precioSalida / precioEntrada) - 1)
          : 0;
      } else {
        ganancia = precioEntrada > 0
          ? posicionTotal * ((precioEntrada - precioSalida) / precioEntrada)
          : 0;
      }

      // Costes
      const comisionEntrada = posicionTotal * (comision / 100);
      const comisionSalida = (posicionTotal + ganancia) * (comision / 100);
      const costeComisionDolares = comisionEntrada + comisionSalida;
      const financiacionDolares = (apalancamiento * margen * financiacion) / 100;
      const gastosTotalesDolares = costeComisionDolares + financiacionDolares + spread;

      // Break-even
      const porcentajeGananciaMinima = margen > 0 ? (gastosTotalesDolares / margen) * 100 : 0;
      let breakeven = 0;
      if (operacionTipo === 'long') {
        breakeven = precioEntrada * (1 + porcentajeGananciaMinima / 100);
      } else {
        // SHORT: el precio baja, así que restamos
        breakeven = precioEntrada * (1 - porcentajeGananciaMinima / 100);
      }

      // ROI
      const gananciaNeta = ganancia - gastosTotalesDolares;
      const roi = margen > 0 ? (gananciaNeta / margen) * 100 : 0;

      // Ratio Ganancia/Pérdida (para alarma)
      const ratioGanancia = perdidaEnDolares > 0 ? ganancia / perdidaEnDolares : 0;

      this.results = {
        distanciaRiesgo,
        margen,
        posicionTotal,
        perdidaEnDolares,
        ganancia,
        costeComisionDolares,
        gastosTotalesDolares,
        porcentajeGananciaMinima,
        breakeven,
        gananciaNeta,
        roi,
        tieneAlerta: ratioGanancia < riesgoBeneficio
      };

      return this.results;
    } catch (error) {
      console.error('[RiskCalculator] ❌ Error calculando riesgo:', error);
      return this._getEmptyResults();
    }
  }

  /**
   * Actualiza un parámetro y recalcula
   * @param {string} paramName - Nombre del parámetro
   * @param {number} value - Nuevo valor
   * @returns {Object} Resultados actualizados
   */
  updateParam(paramName, value) {
    if (paramName in this.params) {
      this.params[paramName] = value;
      return this.calculate();
    }
    console.warn(`[RiskCalculator] ⚠️ Parámetro desconocido: ${paramName}`);
    return this.results;
  }

  /**
   * Actualiza múltiples parámetros
   * @param {Object} updates - Objeto con parámetros a actualizar
   * @returns {Object} Resultados actualizados
   */
  updateParams(updates) {
    this.params = { ...this.params, ...updates };
    return this.calculate();
  }

  /**
   * Obtiene un resultado específico
   * @param {string} resultName - Nombre del resultado
   * @returns {number} Valor del resultado
   */
  getResult(resultName) {
    if (!this.results) this.calculate();
    return this.results[resultName];
  }

  /**
   * Obtiene todos los resultados
   * @returns {Object} Objeto con todos los resultados
   */
  getResults() {
    if (!this.results) this.calculate();
    return { ...this.results };
  }

  /**
   * Obtiene todos los parámetros de entrada
   * @returns {Object} Parámetros actuales
   */
  getParams() {
    return { ...this.params };
  }

  /**
   * Formatea un resultado para mostrar
   * @param {string} resultName - Nombre del resultado
   * @param {string} format - Tipo de formato ('currency', 'percent', 'number')
   * @returns {string} Resultado formateado
   */
  format(resultName, format = 'number') {
    const value = this.getResult(resultName);

    switch (format) {
      case 'currency':
        return `$${parseFloat(value).toFixed(2)}`;
      case 'percent':
        return `${parseFloat(value).toFixed(2)}%`;
      case 'number':
      default:
        return String(parseFloat(value).toFixed(2));
    }
  }

  /**
   * Retorna objeto de resultados vacío
   * @private
   */
  _getEmptyResults() {
    return {
      distanciaRiesgo: 0,
      margen: 0,
      posicionTotal: 0,
      perdidaEnDolares: 0,
      ganancia: 0,
      costeComisionDolares: 0,
      gastosTotalesDolares: 0,
      porcentajeGananciaMinima: 0,
      breakeven: 0,
      gananciaNeta: 0,
      roi: 0,
      tieneAlerta: false
    };
  }

  /**
   * Exporta datos para análisis o depuración
   * @returns {Object} Parámetros + resultados
   */
  export() {
    return {
      params: this.getParams(),
      results: this.getResults(),
      timestamp: new Date().toISOString()
    };
  }
}

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RiskCalculator;
}

/**
 * @file stats-calculator.js
 * @description Calculadora de estadísticas reutilizable
 * Responsabilidades:
 * - Calcular 8 métricas de trading desde un array de posiciones cerradas
 * - Proporcionar interfaz consistente para todos los módulos
 * - Permitir extensión de métricas sin duplicar código
 * 
 * Uso:
 * const calculator = new StatsCalculator(positions);
 * const stats = calculator.calculate();
 * // stats = { totalPnl, winners, losers, winRate, longCount, shortCount, maxProfit, maxLoss }
 */

class StatsCalculator {
  /**
   * @param {Array} positions - Array de posiciones cerradas
   */
  constructor(positions = []) {
    this.positions = positions;
    this.stats = {
      totalPnl: 0,
      winners: 0,
      losers: 0,
      winRate: 0,
      longCount: 0,
      shortCount: 0,
      maxProfit: 0,
      maxLoss: 0,
      avgWin: 0,
      avgLoss: 0
    };
  }

  /**
   * Calcula todas las estadísticas
   * @returns {Object} Objeto con todas las métricas
   */
  calculate() {
    if (!this.positions || this.positions.length === 0) {
      console.warn('[StatsCalculator] ⚠️ No hay posiciones para calcular');
      return this.stats;
    }

    try {
      this._calculatePnl();
      this._calculateWinners();
      this._calculateSideCounts();
      this._calculateWinRate();
      this._calculateExtremes();
      this._calculateAverages();
      
      console.log('[StatsCalculator] ✓ Estadísticas calculadas:', this.stats);
      return this.stats;
    } catch (error) {
      console.error('[StatsCalculator] ❌ Error calculando estadísticas:', error);
      return this.stats;
    }
  }

  /**
   * Calcula P&L total
   * @private
   */
  _calculatePnl() {
    this.stats.totalPnl = this.positions.reduce((sum, pos) => {
      const pnl = parseFloat(pos.pnl) || 0;
      return sum + pnl;
    }, 0);
    this.stats.totalPnl = Math.round(this.stats.totalPnl * 100) / 100;
  }

  /**
   * Calcula posiciones ganadoras/perdedoras
   * @private
   */
  _calculateWinners() {
    this.stats.winners = this.positions.filter(pos => parseFloat(pos.pnl) > 0).length;
    this.stats.losers = this.positions.filter(pos => parseFloat(pos.pnl) < 0).length;
  }

  /**
   * Calcula conteos de LONG/SHORT
   * @private
   */
  _calculateSideCounts() {
    this.stats.longCount = this.positions.filter(pos => {
      const sideValue = (pos.type || pos.side || pos.direction || '').toUpperCase();
      return sideValue === 'LONG';
    }).length;
    
    this.stats.shortCount = this.positions.filter(pos => {
      const sideValue = (pos.type || pos.side || pos.direction || '').toUpperCase();
      return sideValue === 'SHORT';
    }).length;
    
    console.log(`[StatsCalculator] 📊 Conteos - LONG: ${this.stats.longCount}, SHORT: ${this.stats.shortCount}`);
  }

  /**
   * Calcula tasa de acierto (%)
   * @private
   */
  _calculateWinRate() {
    const total = this.positions.length;
    this.stats.winRate = total > 0 ? Math.round((this.stats.winners / total) * 100) : 0;
  }

  /**
   * Calcula máxima ganancia y pérdida
   * @private
   */
  _calculateExtremes() {
    const pnls = this.positions.map(pos => parseFloat(pos.pnl) || 0);
    
    if (pnls.length === 0) {
      this.stats.maxProfit = 0;
      this.stats.maxLoss = 0;
      return;
    }

    this.stats.maxProfit = Math.max(...pnls, 0);
    this.stats.maxLoss = Math.min(...pnls, 0);
    
    // Redondear a 2 decimales
    this.stats.maxProfit = Math.round(this.stats.maxProfit * 100) / 100;
    this.stats.maxLoss = Math.round(this.stats.maxLoss * 100) / 100;
  }

  /**
   * Calcula promedio de ganancias y pérdidas
   * @private
   */
  _calculateAverages() {
    const wins = this.positions.filter(pos => parseFloat(pos.pnl) > 0);
    const losses = this.positions.filter(pos => parseFloat(pos.pnl) < 0);
    
    if (wins.length > 0) {
      const sumWins = wins.reduce((sum, pos) => sum + parseFloat(pos.pnl), 0);
      this.stats.avgWin = Math.round((sumWins / wins.length) * 100) / 100;
    }
    
    if (losses.length > 0) {
      const sumLosses = losses.reduce((sum, pos) => sum + parseFloat(pos.pnl), 0);
      this.stats.avgLoss = Math.round((sumLosses / losses.length) * 100) / 100;
    }
  }

  /**
   * Obtiene una métrica específica
   * @param {string} metric - Nombre de la métrica
   * @returns {number|string} Valor de la métrica
   */
  get(metric) {
    return this.stats[metric];
  }

  /**
   * Obtiene todas las estadísticas
   * @returns {Object} Objeto de estadísticas
   */
  getAll() {
    return { ...this.stats };
  }

  /**
   * Formatea una métrica para mostrar
   * @param {string} metric - Nombre de la métrica
   * @param {string} format - Tipo de formato ('currency', 'percent', 'number')
   * @returns {string} Métrica formateada
   */
  format(metric, format = 'number') {
    const value = this.stats[metric];
    
    switch (format) {
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'percent':
        return `${value}%`;
      case 'number':
      default:
        return String(value);
    }
  }
}

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatsCalculator;
}

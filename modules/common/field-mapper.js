/**
 * @file field-mapper.js
 * @description Mapea campos de API de Bitget al formato esperado por la UI
 * Transforma respuestas de Bitget a estructura utilizable en componentes
 */

class FieldMapper {
  /**
   * Detecta si una posición es de Bitget (tiene campos de Bitget)
   * @param {object} position - Posición a verificar
   * @returns {boolean}
   */
  static isBitgetPosition(position) {
    return position && (
      typeof position.openAvgPrice !== 'undefined' || 
      typeof position.closeAvgPrice !== 'undefined' ||
      typeof position.holdSide !== 'undefined'
    );
  }

  /**
   * Mapea posición de Bitget al formato de la tabla
   * @param {object} bitgetPosition - Posición desde Bitget API
   * @returns {object} Posición transformada
   */
  static mapBitgetPosition(bitgetPosition) {
    if (!bitgetPosition) return null;

    try {
      // Calcular P&L porcentaje
      const openPrice = parseFloat(bitgetPosition.openAvgPrice || 0);
      const closeQty = parseFloat(bitgetPosition.closeTotalPos || 0);
      const pnlValue = parseFloat(bitgetPosition.pnl || 0);
      
      const notionalValue = openPrice * closeQty;
      const pnlPercent = notionalValue > 0 ? (pnlValue / notionalValue) * 100 : 0;

      const mapped = {
        // Identidad
        positionId: bitgetPosition.positionId || '',
        symbol: bitgetPosition.symbol || 'N/A',
        
        // Fechas (convertir de timestamp)
        closeTime: bitgetPosition.utime ? parseInt(bitgetPosition.utime) : null,
        openTime: bitgetPosition.ctime ? parseInt(bitgetPosition.ctime) : null,
        
        // Precios
        entryPrice: openPrice,
        exitPrice: parseFloat(bitgetPosition.closeAvgPrice || 0),
        openAvgPrice: openPrice,
        closeAvgPrice: parseFloat(bitgetPosition.closeAvgPrice || 0),
        
        // Cantidades
        quantity: closeQty,
        openTotalPos: parseFloat(bitgetPosition.openTotalPos || 0),
        closeTotalPos: closeQty,
        
        // P&L
        pnl: pnlValue,
        pnlPercent: isFinite(pnlPercent) ? pnlPercent : 0,
        netProfit: parseFloat(bitgetPosition.netProfit || 0),
        
        // Fees y financiamiento
        openFee: parseFloat(bitgetPosition.openFee || 0),
        closeFee: parseFloat(bitgetPosition.closeFee || 0),
        totalFunding: parseFloat(bitgetPosition.totalFunding || 0),
        
        // Tipo de posición - IMPORTANTE: convertir holdSide a type
        type: bitgetPosition.holdSide ? (
          bitgetPosition.holdSide.toLowerCase() === 'long' ? 'LONG' : 
          bitgetPosition.holdSide.toLowerCase() === 'short' ? 'SHORT' : 
          'UNKNOWN'
        ) : (bitgetPosition.type || 'UNKNOWN'),
        holdSide: bitgetPosition.holdSide,
        
        // Modo
        marginMode: bitgetPosition.marginMode || '',
        posMode: bitgetPosition.posMode || '',
        marginCoin: bitgetPosition.marginCoin || ''
      };

      return mapped;
    } catch (error) {
      console.error('[FieldMapper] ❌ Error mapeando posición:', error, bitgetPosition);
      return null;
    }
  }

  /**
   * Mapea array de posiciones de Bitget
   * @param {array} bitgetPositions - Array de posiciones desde Bitget
   * @returns {array} Array de posiciones transformadas
   */
  static mapBitgetPositions(bitgetPositions) {
    if (!Array.isArray(bitgetPositions)) {
      console.warn('[FieldMapper] ⚠️ Input no es array:', bitgetPositions);
      return [];
    }

    console.log(`[FieldMapper] 📊 Mapeando ${bitgetPositions.length} posiciones...`);
    
    const mapped = bitgetPositions
      .map(pos => this.mapBitgetPosition(pos))
      .filter(pos => pos !== null);

    console.log(`[FieldMapper] ✓ ${mapped.length} posiciones mapeadas exitosamente`);
    return mapped;
  }
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FieldMapper;
}

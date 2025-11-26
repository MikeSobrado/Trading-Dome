/**
 * @file posiciones-abiertas-details.js
 * @description Gestor de modal expandido para posiciones abiertas
 * 
 * Responsabilidades:
 * - Obtener datos adicionales del endpoint single-position
 * - Validar que el símbolo sea correcto
 * - Renderizar modal con datos enriquecidos
 * - Manejar errores y fallbacks gracefully
 */

class PosicionesAbiertasDetails {
  constructor(bitgetConnector, apiConfigManager) {
    this.bitgetConnector = bitgetConnector;
    this.apiConfigManager = apiConfigManager;
    console.log('[PosicionesAbiertasDetails] ✓ Inicializado');
  }

  /**
   * Muestra modal con detalles enriquecidos
   * @param {Object} cachedPos - Datos del cache (all-position endpoint)
   */
  async showDetailsModal(cachedPos) {
    if (!cachedPos) return;

    const symbol = cachedPos.symbol || 'N/A';
    const holdSide = (cachedPos.holdSide || 'unknown').toUpperCase();
    const side = holdSide === 'LONG' 
      ? '<span class="badge badge-long">LONG</span>' 
      : '<span class="badge badge-short">SHORT</span>';

    // Datos del cache (siempre disponibles)
    const unrealizedPnl = parseFloat(cachedPos.unrealizedPL || 0).toFixed(2);
    const unrealizedPnlPercent = (parseFloat(cachedPos.unrealizedPLRatio || 0) * 100).toFixed(2);
    const margin = parseFloat(cachedPos.margin || 0).toFixed(2);
    const marginRate = parseFloat(cachedPos.marginRate || 0) * 100;
    const liquidationPrice = parseFloat(cachedPos.liquidationPrice || 0).toFixed(4);
    const openTime = new Date(parseInt(cachedPos.openTime || 0)).toLocaleString('es-ES');

    const pnlClass = parseFloat(unrealizedPnl) >= 0 ? 'positive' : 'negative';

    // Datos del single-position (se cargan después)
    let singlePosData = null;
    let loadingError = false;

    // Intentar obtener datos del single-position
    try {
      console.log(`[PosicionesAbiertasDetails] 📡 Obteniendo datos para ${symbol}...`);
      
      const productType = cachedPos.productType || 'UMCBL';
      const marginCoin = cachedPos.marginCoin || 'USDT';
      
      singlePosData = await this.bitgetConnector.getSinglePosition(symbol, productType, marginCoin);
      
      // Validar que el símbolo coincida
      if (singlePosData && singlePosData.length > 0) {
        const responsedSymbol = singlePosData[0].symbol;
        if (responsedSymbol !== symbol) {
          console.warn(`[PosicionesAbiertasDetails] ⚠️ Símbolo mismatch: ${symbol} vs ${responsedSymbol}`);
          singlePosData = null;
        } else {
          console.log(`[PosicionesAbiertasDetails] ✓ Datos single-position obtenidos correctamente`);
          singlePosData = singlePosData[0];
        }
      }
    } catch (error) {
      console.warn(`[PosicionesAbiertasDetails] ⚠️ Error obteniendo single-position:`, error);
      loadingError = true;
      singlePosData = null;
    }

    // Renderizar modal
    this.renderModal(
      symbol,
      side,
      cachedPos,
      singlePosData,
      loadingError,
      unrealizedPnl,
      unrealizedPnlPercent,
      margin,
      marginRate,
      liquidationPrice,
      openTime,
      pnlClass
    );
  }

  /**
   * Renderiza el modal con la estructura definitiva
   */
  renderModal(symbol, side, cachedPos, singlePosData, loadingError, unrealizedPnl, unrealizedPnlPercent, margin, marginRate, liquidationPrice, openTime, pnlClass) {
    // Extraer datos del single-position si están disponibles
    const marginSize = singlePosData ? parseFloat(singlePosData.marginSize || 0).toFixed(2) : null;
    const marginRatio = singlePosData ? (parseFloat(singlePosData.marginRatio || 0) * 100).toFixed(2) : null;
    const totalFee = singlePosData ? parseFloat(singlePosData.totalFee || 0).toFixed(2) : null;
    const deductedFee = singlePosData ? parseFloat(singlePosData.deductedFee || 0).toFixed(2) : null;
    const marginMode = singlePosData ? this.formatMarginMode(singlePosData.marginMode) : null;
    const achievedProfits = singlePosData ? parseFloat(singlePosData.achievedProfits || 0).toFixed(2) : null;

    const achievedProfitsClass = achievedProfits !== null && parseFloat(achievedProfits) >= 0 ? 'positive' : 'negative';

    const modal = document.createElement('div');
    modal.className = 'modal-posicion-abierta';
    modal.innerHTML = `
      <div class="modal-content-abiertas">
        <div class="modal-header-abiertas">
          <h5>${symbol} - ${side}</h5>
          <button class="btn-close-modal"><i class="bi bi-x"></i></button>
        </div>
        <div class="modal-body-abiertas">
          <div class="detalles-grid">
            <!-- RESUMEN RÁPIDO -->
            <div class="detalle-section-title">Resumen Rápido</div>
            
            <div class="detalle-item">
              <label>P&L No Realizado</label>
              <value class="${pnlClass}">$${unrealizedPnl} (${unrealizedPnlPercent}%)</value>
            </div>
            
            <div class="detalle-item">
              <label>Precio Liquidación</label>
              <value>$${liquidationPrice}</value>
            </div>
            
            <div class="detalle-item full">
              <label>Abierto desde</label>
              <value>${openTime}</value>
            </div>

            <!-- MARGEN & RIESGO -->
            <div class="detalle-section-title">Margen & Riesgo</div>
            
            <div class="detalle-item">
              <label>Margen Usado</label>
              <value>$${margin}</value>
            </div>

            ${marginSize !== null ? `
            <div class="detalle-item">
              <label>Capital Expuesto</label>
              <value>$${marginSize}</value>
            </div>
            ` : ''}
            
            <div class="detalle-item">
              <label>Ratio Margen</label>
              <value>${marginRate.toFixed(2)}%</value>
            </div>

            ${marginRatio !== null ? `
            <div class="detalle-item">
              <label>Ratio Mantenimiento</label>
              <value>${marginRatio}%</value>
            </div>
            ` : ''}

            <!-- COMISIONES & COSTOS -->
            ${(totalFee !== null || deductedFee !== null) ? `
            <div class="detalle-section-title">Comisiones & Costos</div>
            ` : ''}

            ${totalFee !== null ? `
            <div class="detalle-item">
              <label>Comisiones Funding</label>
              <value>$${totalFee}</value>
            </div>
            ` : ''}

            ${deductedFee !== null ? `
            <div class="detalle-item">
              <label>Comisiones Transacción</label>
              <value>$${deductedFee}</value>
            </div>
            ` : ''}

            <!-- OPERACIÓN -->
            ${(marginMode !== null || achievedProfits !== null) ? `
            <div class="detalle-section-title">Operación</div>
            ` : ''}

            ${marginMode !== null ? `
            <div class="detalle-item">
              <label>Modo Margen</label>
              <value>${marginMode}</value>
            </div>
            ` : ''}

            ${achievedProfits !== null ? `
            <div class="detalle-item">
              <label>Ganancias Realizadas</label>
              <value class="${achievedProfitsClass}">$${achievedProfits}</value>
            </div>
            ` : ''}

            <!-- ESTADO DE CARGA -->
            ${loadingError ? `
            <div class="detalle-item full alert-warning">
              <small>⚠️ Algunos datos adicionales no pudieron cargarse. Se muestran los datos disponibles.</small>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.btn-close-modal');
    closeBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  /**
   * Formatea el modo de margen para mostrar
   * @param {string} mode - isolated o crossed
   * @returns {string}
   */
  formatMarginMode(mode) {
    if (!mode) return 'N/A';
    const modeMap = {
      'isolated': 'Aislado',
      'crossed': 'Compartido'
    };
    return modeMap[mode.toLowerCase()] || mode;
  }
}

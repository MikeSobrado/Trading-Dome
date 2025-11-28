/**
 * @file posiciones.js
 * @description Módulo de posiciones (pestaña Posiciones)
 * Responsabilidades:
 * - Mostrar tabla con historial de posiciones cerradas
 * - Cargar datos desde caché global (PositionsCache) para evitar N+1 calls
 * - Renderizar y actualizar interfaz
 * 
 * Dependencias:
 * - modules/common/positions-cache.js (PositionsCache)
 * - modules/common/field-mapper.js (FieldMapper)
 */

class PosicionesModule {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.rendered = false;
    this.positions = [];
    this.cachedClosedPositions = null; // Posiciones cacheadas del evento
    this.positionsCache = typeof positionsCache !== 'undefined' ? positionsCache : null;
    this.apiConfigManager = typeof apiConfigManager !== 'undefined' ? apiConfigManager : null;
    this.bitgetConnector = typeof bitgetConnector !== 'undefined' ? bitgetConnector : null;
    this.eventUnsubscribers = [];
    this.tabChangeUnsubscriber = null; // Unsubscriber del evento tab:changed (NO se limpia en destroy)
    this.domListenersAttached = false; // Flag para evitar re-adjuntar listeners de DOM
  }

  /**
   * Inicializa el módulo
   */
  async initialize() {
    try {
      console.log('[Posiciones] 🎯 Inicializando módulo Posiciones...');
      
      // Crear contenedor
      this.container = document.getElementById('posicionesTab') || this.createContainer();
      
      // Suscribirse a evento tab:changed (NUNCA se limpia)
      this.tabChangeUnsubscriber = eventBus?.on('tab:changed', (data) => this.onTabChanged(data));
      
      // Suscribirse a evento de posiciones cacheadas (para recargar cuando APIs las cachea)
      const cachedUnsubscriber = eventBus?.on('bitget:closed-positions:cached', (data) => {
        console.log(`[Posiciones] 🔔 Notificación: Se cachearon ${data.count} posiciones. Guardando localmente...`);
        // Guardar datos directamente en la instancia
        sessionStorage.setItem('bitget_closed_positions_data', JSON.stringify(data));
        
        if (this.isVisible) {
          this.loadPositions();
        }
      });
      if (cachedUnsubscriber) {
        this.eventUnsubscribers.push(cachedUnsubscriber);
      }
      
      return true;
    } catch (error) {
      console.error('[Posiciones] ❌ Error inicializando:', error);
      errorHandler?.handleError('POSICIONES_INIT_ERROR', error);
      return false;
    }
  }

  /**
   * Crea el contenedor
   */
  createContainer() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      console.error('[Posiciones] ❌ No se encontró #main-content en el DOM');
      throw new Error('main-content not found');
    }
    
    const container = document.createElement('div');
    container.id = 'posicionesTab';
    container.className = 'tab-content posiciones-tab';
    mainContent.appendChild(container);
    console.log('[Posiciones] ✓ Contenedor creado y añadido al DOM');
    return container;
  }

  /**
   * Maneja cambio de tab
   */
  onTabChanged(data) {
    if (data.tabId === 'posiciones') {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Muestra el contenido
   */
  show() {
    console.log('[Posiciones] 👁️ Mostrando tab Posiciones');
    this.isVisible = true;
    this.container.style.display = 'block';
    this.container.classList.add('active');
    
    // Solo renderizar la primera vez
    if (!this.rendered) {
      console.log('[Posiciones] ✓ Primera vez renderizando...');
      this.render();
      this.attachEventListeners();
      this.loadPositions();
      this.rendered = true;
    } else {
      console.log('[Posiciones] ⚠️ Ya fue renderizado, recargando datos...');
      // Re-adjuntar listeners porque fueron eliminados en destroy()
      this.attachEventListeners();
      // IMPORTANTE: Recargar datos en caso de que hayan cambiado
      this.loadPositions();
    }
  }

  /**
   * Oculta el contenido
   */
  hide() {
    console.log('[Posiciones] 👁️ Ocultando tab Posiciones');
    this.isVisible = false;
    this.container.style.display = 'none';
    this.container.classList.remove('active');
    this.destroy(); // Limpiar listeners
  }

  /**
   * Destruye listeners y limpia memoria
   */
  destroy() {
    try {
      console.log('[Posiciones] 🧹 Limpiando listeners...');
      
      // Limpiar solo listeners que NO son tab:changed
      // NO limpiar tabChangeUnsubscriber para que siga escuchando tab:changed
      if (this.eventUnsubscribers && this.eventUnsubscribers.length > 0) {
        this.eventUnsubscribers.forEach((unsubscriber) => {
          if (typeof unsubscriber === 'function') {
            unsubscriber();
          }
        });
        console.log(`[Posiciones] ✓ ${this.eventUnsubscribers.length} listeners eliminados`);
        this.eventUnsubscribers = [];
      }
    } catch (error) {
      console.error('[Posiciones] ❌ Error limpiando listeners:', error);
    }
  }

  /**
   * Renderiza el contenido
   */
  render() {
    try {
      console.log('[Posiciones] 🎨 Iniciando render del contenido...');
      
      this.container.innerHTML = `
      <div class="posiciones-container">
        
        <!-- Tabla de Posiciones Cerradas -->
        <div class="posiciones-table-card">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-clipboard-data"></i>
              Historial de Posiciones Cerradas
            </h5>
          </div>
          <div class="card-body">
            <!-- Filtros y Botones -->
            <div class="posiciones-actions">
              <div class="filters-section">
                <button class="filter-btn active" data-filter="all">
                  <i class="bi bi-funnel me-1"></i>Todos
                </button>
                <button class="filter-btn" data-filter="long">
                  <i class="bi bi-arrow-up-right me-1"></i>LONG
                </button>
                <button class="filter-btn" data-filter="short">
                  <i class="bi bi-arrow-down-left me-1"></i>SHORT
                </button>
              </div>
              <div class="export-section">
                <button id="refresh-positions-btn" class="export-btn" title="Actualizar posiciones">
                  <i class="bi bi-arrow-clockwise me-1"></i>Actualizar
                </button>
                <button id="download-pdf-btn" class="export-btn" title="Descargar historial en PDF">
                  <i class="bi bi-file-pdf me-1"></i>Descargar PDF
                </button>
              </div>
            </div>

            <!-- Tabla -->
            <div class="table-wrapper" id="positions-table-wrapper">
              <p class="text-muted text-center">
                Conecta a la API en la pestaña de "APIs" para cargar tu historial de posiciones
              </p>
            </div>
          </div>
        </div>

      </div>
    `;
      
      console.log('[Posiciones] ✓ Contenido renderizado en el DOM');
    } catch (error) {
      console.error('[Posiciones] ❌ Error durante render:', error);
      errorHandler?.handleError('POSICIONES_RENDER_ERROR', error);
    }
  }

  /**
   * Adjunta event listeners
   */
  attachEventListeners() {
    try {
      // Solo adjuntar listeners de DOM una sola vez
      if (this.domListenersAttached) {
        console.log('[Posiciones] ⚠️ Listeners de DOM ya están adjuntados, saltando...');
        return;
      }

      // Botones de filtro
      const filterBtns = this.container.querySelectorAll('.filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const filter = btn.dataset.filter;
          this.applyFilter(filter);
        });
      });

      // Botón de descargar PDF
      const pdfBtn = this.container.querySelector('#download-pdf-btn');
      if (pdfBtn) {
        pdfBtn.addEventListener('click', () => this.downloadPDF());
      }

      // Botón de actualizar
      const refreshBtn = this.container.querySelector('#refresh-positions-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => this.refreshPositionsFromAPI());
      }

      this.domListenersAttached = true;

      console.log('[Posiciones] ✓ Event listeners adjuntados');
    } catch (error) {
      console.error('[Posiciones] ❌ Error adjuntando listeners:', error);
    }
  }

  /**
   * Carga posiciones desde la API
   */
  async loadPositions() {
    try {
      console.log('[Posiciones] 📂 Cargando posiciones desde sessionStorage o caché...');

      // Mostrar estado de carga
      const wrapper = this.container.querySelector('#positions-table-wrapper');
      const statsGrid = this.container.querySelector('#stats-grid');
      if (wrapper) wrapper.innerHTML = '<p class="text-center"><i class="bi bi-hourglass-split"></i> Cargando posiciones...</p>';
      if (statsGrid) statsGrid.innerHTML = '<p class="text-center"><i class="bi bi-hourglass-split"></i> Cargando estadísticas...</p>';

      // Intentar cargar de sessionStorage primero (cacheado por módulo APIs)
      let positionsData = null;
      
      // Primero intenta desde el almacenamiento reciente del evento
      const cachedData = sessionStorage.getItem('bitget_closed_positions_data');
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          console.log('[Posiciones] 📦 Datos parseados del evento:', typeof parsed, Array.isArray(parsed) ? `array[${parsed.length}]` : typeof parsed);
          
          // El evento pasa los datos en la propiedad 'data'
          positionsData = parsed.data || parsed;
          
          if (Array.isArray(positionsData)) {
            console.log(`[Posiciones] ✅ Se cargaron ${positionsData.length} posiciones desde sessionStorage (evento reciente)`);
          } else {
            console.warn('[Posiciones] ⚠️ positionsData no es array:', typeof positionsData);
            positionsData = null;
          }
        } catch (parseErr) {
          console.error('[Posiciones] ❌ Error parseando datos del evento:', parseErr);
        }
      } else {
        console.log('[Posiciones] ℹ️ No hay datos en bitget_closed_positions_data');
      }

      // Si no hay en el almacenamiento del evento, intenta del almacenamiento original
      if (!positionsData) {
        const originalCache = sessionStorage.getItem('bitget_closed_positions');
        if (originalCache) {
          try {
            const parsed = JSON.parse(originalCache);
            console.log('[Posiciones] 📦 Datos parseados del caché original:', typeof parsed);
            positionsData = parsed.data;
            
            if (Array.isArray(positionsData)) {
              console.log(`[Posiciones] ✅ Se cargaron ${positionsData.length} posiciones desde sessionStorage (almacenamiento original)`);
            } else {
              console.warn('[Posiciones] ⚠️ positionsData no es array:', typeof positionsData);
              positionsData = null;
            }
          } catch (parseErr) {
            console.error('[Posiciones] ❌ Error parseando datos de sessionStorage:', parseErr);
          }
        } else {
          console.log('[Posiciones] ℹ️ No hay datos en bitget_closed_positions');
        }
      }

      // Si no hay en sessionStorage, intentar cargar desde caché global
      if (!positionsData) {
        console.log('[Posiciones] 📡 Intentando cargar del caché global...');
        try {
          positionsData = await this.positionsCache.loadClosedPositions();
          if (Array.isArray(positionsData)) {
            console.log(`[Posiciones] ✓ Se obtuvieron ${positionsData.length} posiciones del caché global`);
          } else {
            console.warn('[Posiciones] ⚠️ Caché global retornó no-array:', typeof positionsData);
            positionsData = null;
          }
        } catch (cacheErr) {
          console.error('[Posiciones] ❌ Error cargando de caché global:', cacheErr);
          positionsData = null;
        }
      }

      // Si no hay datos en ningún lado, mostrar mensaje apropiado
      if (!positionsData) {
        console.warn('[Posiciones] ⚠️ No hay datos de posiciones disponibles');
        
        if (!this.apiConfigManager?.isConfigured('bitget')) {
          console.warn('[Posiciones] ℹ️ Bitget no está configurado');
          this.showNotConfiguredMessage();
        } else {
          console.warn('[Posiciones] ℹ️ Bitget está configurado pero sin datos en caché');
          // Mostrar mensaje genérico si Bitget está configurado pero sin datos
          const wrapper = this.container.querySelector('#positions-table-wrapper');
          if (wrapper) {
            wrapper.innerHTML = `
              <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                No hay posiciones cerradas disponibles. Descarga los datos desde la pestaña <strong>APIs</strong>.
              </div>
            `;
          }
        }
        return;
      }

      // Validar y asignar
      if (Array.isArray(positionsData)) {
        // Mapear posiciones si es necesario (si son de Bitget)
        if (typeof FieldMapper !== 'undefined' && positionsData.length > 0 && FieldMapper.isBitgetPosition(positionsData[0])) {
          console.log('[Posiciones] 🔄 Mapeando posiciones de Bitget...');
          this.positions = FieldMapper.mapBitgetPositions(positionsData);
          console.log(`[Posiciones] ✅ ${this.positions.length} posiciones mapeadas`);
        } else {
          this.positions = positionsData;
          console.log(`[Posiciones] 📊 ${this.positions.length} posiciones asignadas a this.positions`);
        }
      } else {
        console.error('[Posiciones] ❌ No se pudo obtener positionsData válida');
        this.positions = [];
      }

      // Renderizar tabla
      this.renderPositionsTable();

      // 📡 IMPORTANTE: Emitir evento para que otros módulos sepan que hay posiciones cargadas
      if (eventBus && this.positions.length > 0) {
        console.log('[Posiciones] 📡 Emitiendo evento: positions:loaded');
        eventBus.emit('positions:loaded', {
          count: this.positions.length,
          positions: this.positions
        });
      }

    } catch (error) {
      console.error('[Posiciones] ❌ Error cargando posiciones:', error);
      const wrapper = this.container.querySelector('#positions-table-wrapper');
      if (wrapper) {
        wrapper.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message}</div>`;
      }
    }
  }

  /**
   * Renderiza la tabla de posiciones
   */
  renderPositionsTable() {
    const wrapper = this.container.querySelector('#positions-table-wrapper');
    if (!wrapper) {
      console.error('[Posiciones] ❌ No se encontró #positions-table-wrapper');
      return;
    }

    if (!this.positions || this.positions.length === 0) {
      console.warn('[Posiciones] ⚠️ No hay posiciones para renderizar');
      wrapper.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle me-2"></i>No hay posiciones cerradas</div>';
      return;
    }

    console.log(`[Posiciones] 🎨 Renderizando tabla con ${this.positions.length} posiciones...`);

    // Renderizar header FUERA del wrapper
    const headerHtml = `
      <table class="positions-table-header">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Par</th>
            <th>Lado</th>
            <th>Entrada</th>
            <th>Salida</th>
            <th>Cantidad</th>
            <th>P&L</th>
            <th>%</th>
          </tr>
        </thead>
      </table>
    `;
    
    // Insertar header antes del wrapper
    if (!wrapper.previousElementSibling || !wrapper.previousElementSibling.classList.contains('positions-table-header')) {
      wrapper.insertAdjacentHTML('beforebegin', headerHtml);
    }

    let html = `
      <div class="table-responsive-scrollable">
        <table class="positions-table">
          <tbody>
    `;

    let rowsRendered = 0;
    let rowsSkipped = 0;

    this.positions.forEach((pos, index) => {
      try {
        // Las posiciones ya están mapeadas en loadPositions(), usar directamente
        const displayPos = pos;

        // Extraer datos con valores por defecto seguros
        const closeTime = displayPos.closeTime || displayPos.utime;
        const date = closeTime ? new Date(parseInt(closeTime)).toLocaleString('es-ES') : 'N/A';
        const symbol = displayPos.symbol || 'N/A';
        const type = (displayPos.type || displayPos.holdSide || 'UNKNOWN').toUpperCase();
        const side = type === 'LONG' 
          ? '<span class="badge badge-long">LONG</span>' 
          : type === 'SHORT'
          ? '<span class="badge badge-short">SHORT</span>'
          : `<span class="badge badge-unknown">${type}</span>`;

        const entryPrice = parseFloat(displayPos.entryPrice || displayPos.openAvgPrice || 0).toFixed(4);
        const exitPrice = parseFloat(displayPos.exitPrice || displayPos.closeAvgPrice || 0).toFixed(4);
        const quantity = parseFloat(displayPos.quantity || displayPos.closeTotalPos || 0).toFixed(8);
        const pnl = parseFloat(displayPos.pnl || 0).toFixed(2);
        const pnlPercent = parseFloat(displayPos.pnlPercent || 0).toFixed(2);
        const pnlClass = parseFloat(pnl) >= 0 ? 'positive' : 'negative';

        html += `
          <tr>
            <td><strong>${date}</strong></td>
            <td><strong>${symbol}</strong></td>
            <td>${side}</td>
            <td><strong>${entryPrice}</strong></td>
            <td><strong>${exitPrice}</strong></td>
            <td><strong>${quantity}</strong></td>
            <td class="${pnlClass}"><strong>${pnl}</strong></td>
            <td class="${pnlClass}"><strong>${pnlPercent}%</strong></td>
          </tr>
        `;
        rowsRendered++;
      } catch (e) {
        console.warn(`[Posiciones] ⚠️ Error renderizando posición ${index}:`, e, pos);
        rowsSkipped++;
      }
    });

    html += `
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <i class="bi bi-check-circle me-2"></i>
        <strong>Total: ${rowsRendered} posiciones</strong> | 
        <strong>Actualizado: ${new Date().toLocaleString('es-ES')}</strong>
      </div>
    `;

    wrapper.innerHTML = html;
    console.log(`[Posiciones] ✓ Tabla renderizada: ${rowsRendered} filas, ${rowsSkipped} saltadas`);
  }

  /**
   * Aplica filtro a la tabla
   */
  applyFilter(filter) {
    const rows = this.container.querySelectorAll('.positions-table tbody tr');
    rows.forEach(row => {
      if (filter === 'all') {
        row.style.display = '';
      } else if (filter === 'long') {
        const badge = row.querySelector('.badge-long');
        row.style.display = badge ? '' : 'none';
      } else if (filter === 'short') {
        const badge = row.querySelector('.badge-short');
        row.style.display = badge ? '' : 'none';
      }
    });
  }

  /**
   * Descarga PDF con historial de posiciones
   */
  downloadPDF() {
    if (!this.positions || this.positions.length === 0) {
      alert('No hay posiciones para descargar');
      return;
    }

    try {
      console.log('[Posiciones] 📄 Generando PDF...');

      // Calcular estadísticas
      const totalPnl = this.positions.reduce((sum, pos) => sum + (parseFloat(pos.pnl) || 0), 0);
      const pnlValues = this.positions.map(pos => parseFloat(pos.pnl) || 0);
      const avgPnl = pnlValues.length > 0 ? pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length : 0;
      const maxProfit = Math.max(...pnlValues, 0);
      const maxLoss = Math.min(...pnlValues, 0);
      const winners = this.positions.filter(pos => parseFloat(pos.pnl) > 0).length;
      const losers = this.positions.filter(pos => parseFloat(pos.pnl) < 0).length;
      const winRate = this.positions.length > 0 ? Math.round((winners / this.positions.length) * 100) : 0;
      const totalOps = this.positions.length;

      // Cargar la imagen del logo
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Convertir imagen a base64
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgBase64 = canvas.toDataURL('image/png');

        // Crear contenido HTML para el PDF
        let htmlContent = `
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Historial de Posiciones Trading Dome</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; background: white; padding: 0; }
                .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; }
                .header { display: flex; gap: 30px; margin-bottom: 30px; border-bottom: 3px solid #00d4ff; padding-bottom: 20px; align-items: center; }
                .header-logo { width: 120px; height: 80px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .header-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
                .header-content { flex: 1; text-align: center; }
                .header-content h1 { color: #00d4ff; font-size: 28px; margin-bottom: 5px; }
                .header-content p { color: #666; font-size: 14px; }
                .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
                .stat-box { padding: 15px; background: #f9f9f9; border-left: 4px solid #00d4ff; border-radius: 4px; }
                .stat-label { font-size: 11px; color: #999; text-transform: uppercase; margin-bottom: 8px; font-weight: bold; letter-spacing: 0.5px; }
                .stat-value { font-size: 18px; font-weight: bold; color: #333; }
                .stat-value.positive { color: #00d14a; }
                .stat-value.negative { color: #ff6b6b; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                thead { background: #f0f0f0; }
                th { padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #00d4ff; color: #333; font-size: 13px; }
                td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 12px; }
                tr:hover { background: #f9f9f9; }
                .long { color: #00d14a; font-weight: bold; }
                .short { color: #ff6b6b; font-weight: bold; }
                .positive { color: #00d14a; font-weight: bold; }
                .negative { color: #ff6b6b; font-weight: bold; }
                .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="header-logo">
                    <img src="${imgBase64}" alt="Logo">
                  </div>
                  <div class="header-content">
                    <h1>📊 Trading Dome - Historial de Posiciones</h1>
                    <p>Reporte generado el ${new Date().toLocaleString('es-ES')}</p>
                  </div>
                </div>

                <div class="stats">
                  <div class="stat-box">
                    <div class="stat-label">P&L Total</div>
                    <div class="stat-value ${totalPnl >= 0 ? 'positive' : 'negative'}">$${totalPnl.toFixed(2)}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Promedio P&L</div>
                    <div class="stat-value ${avgPnl >= 0 ? 'positive' : 'negative'}">$${avgPnl.toFixed(2)}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Máxima Ganancia</div>
                    <div class="stat-value positive">$${maxProfit.toFixed(2)}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Máxima Pérdida</div>
                    <div class="stat-value negative">$${maxLoss.toFixed(2)}</div>
                  </div>
                </div>

                <div class="stats">
                  <div class="stat-box">
                    <div class="stat-label">Tasa de Aciertos</div>
                    <div class="stat-value" style="color: ${winRate >= 50 ? '#00d14a' : '#ff6b6b'};">${winRate}%</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Operaciones Ganadoras</div>
                    <div class="stat-value positive">${winners}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Operaciones Perdedoras</div>
                    <div class="stat-value negative">${losers}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Total Operaciones</div>
                    <div class="stat-value">${totalOps}</div>
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Par</th>
                      <th>Lado</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Cantidad</th>
                      <th>P&L</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
        `;

        // Agregar filas de la tabla
        this.positions.forEach(pos => {
          const closeTime = pos.closeTime || pos.utime;
          const date = closeTime ? new Date(parseInt(closeTime)).toLocaleString('es-ES') : 'N/A';
          const symbol = pos.symbol || 'N/A';
          const type = (pos.type || pos.holdSide || 'UNKNOWN').toUpperCase();
          const sideClass = type === 'LONG' ? 'long' : type === 'SHORT' ? 'short' : '';
          const entryPrice = parseFloat(pos.entryPrice || pos.openAvgPrice || 0).toFixed(4);
          const exitPrice = parseFloat(pos.exitPrice || pos.closeAvgPrice || 0).toFixed(4);
          const quantity = parseFloat(pos.quantity || pos.closeTotalPos || 0).toFixed(8);
          const pnl = parseFloat(pos.pnl || 0).toFixed(2);
          const pnlPercent = parseFloat(pos.pnlPercent || 0).toFixed(2);
          const pnlClass = parseFloat(pnl) >= 0 ? 'positive' : 'negative';

          htmlContent += `
            <tr>
              <td>${date}</td>
              <td><strong>${symbol}</strong></td>
              <td><span class="${sideClass}">${type}</span></td>
              <td>${entryPrice}</td>
              <td>${exitPrice}</td>
              <td>${quantity}</td>
              <td class="${pnlClass}">${pnl}</td>
              <td class="${pnlClass}">${pnlPercent}%</td>
            </tr>
          `;
        });

        htmlContent += `
                  </tbody>
                </table>

                <div class="footer">
                  <p>Trading Dome © 2025 - Reporte confidencial de trading</p>
                </div>
              </div>
            </body>
          </html>
        `;

        // Crear elemento temporal para convertir a PDF
        const element = document.createElement('div');
        element.innerHTML = htmlContent;
        
        const options = {
          margin: [10, 10, 10, 10],
          filename: `Trading_Dome_Posiciones_${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, precision: 16 },
          pagebreak: { mode: ['avoid-all'] }
        };

        html2pdf().set(options).from(element.innerHTML).save();
        console.log('[Posiciones] ✓ PDF descargado exitosamente');
      };

      img.onerror = () => {
        console.warn('[Posiciones] ⚠️ No se pudo cargar el logo, continuando sin imagen...');
        // Continuar sin imagen si falla la carga
        this.generatePDFWithoutImage(totalPnl, avgPnl, maxProfit, maxLoss, winners, losers, winRate, totalOps);
      };

      img.src = 'favicon/navlogo.png';
    } catch (error) {
      console.error('[Posiciones] ❌ Error descargando PDF:', error);
      alert('Error al descargar el PDF');
    }
  }

  /**
   * Genera PDF sin imagen (fallback)
   */
  generatePDFWithoutImage(totalPnl, avgPnl, maxProfit, maxLoss, winners, losers, winRate, totalOps) {
    let htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Historial de Posiciones Trading Dome</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: white; padding: 0; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #00d4ff; padding-bottom: 20px; }
            .header h1 { color: #00d4ff; font-size: 28px; margin-bottom: 5px; }
            .header p { color: #666; font-size: 14px; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .stat-box { padding: 15px; background: #f9f9f9; border-left: 4px solid #00d4ff; border-radius: 4px; }
            .stat-label { font-size: 11px; color: #999; text-transform: uppercase; margin-bottom: 8px; font-weight: bold; letter-spacing: 0.5px; }
            .stat-value { font-size: 18px; font-weight: bold; color: #333; }
            .stat-value.positive { color: #00d14a; }
            .stat-value.negative { color: #ff6b6b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            thead { background: #f0f0f0; }
            th { padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #00d4ff; color: #333; font-size: 13px; }
            td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 12px; }
            tr:hover { background: #f9f9f9; }
            .long { color: #00d14a; font-weight: bold; }
            .short { color: #ff6b6b; font-weight: bold; }
            .positive { color: #00d14a; font-weight: bold; }
            .negative { color: #ff6b6b; font-weight: bold; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Trading Dome - Historial de Posiciones</h1>
              <p>Reporte generado el ${new Date().toLocaleString('es-ES')}</p>
            </div>

            <div class="stats">
              <div class="stat-box">
                <div class="stat-label">P&L Total</div>
                <div class="stat-value ${totalPnl >= 0 ? 'positive' : 'negative'}">$${totalPnl.toFixed(2)}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Promedio P&L</div>
                <div class="stat-value ${avgPnl >= 0 ? 'positive' : 'negative'}">$${avgPnl.toFixed(2)}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Máxima Ganancia</div>
                <div class="stat-value positive">$${maxProfit.toFixed(2)}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Máxima Pérdida</div>
                <div class="stat-value negative">$${maxLoss.toFixed(2)}</div>
              </div>
            </div>

            <div class="stats">
              <div class="stat-box">
                <div class="stat-label">Tasa de Aciertos</div>
                <div class="stat-value" style="color: ${winRate >= 50 ? '#00d14a' : '#ff6b6b'};">${winRate}%</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Operaciones Ganadoras</div>
                <div class="stat-value positive">${winners}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Operaciones Perdedoras</div>
                <div class="stat-value negative">${losers}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Total Operaciones</div>
                <div class="stat-value">${totalOps}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Par</th>
                  <th>Lado</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Cantidad</th>
                  <th>P&L</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
    `;

    this.positions.forEach(pos => {
      const closeTime = pos.closeTime || pos.utime;
      const date = closeTime ? new Date(parseInt(closeTime)).toLocaleString('es-ES') : 'N/A';
      const symbol = pos.symbol || 'N/A';
      const type = (pos.type || pos.holdSide || 'UNKNOWN').toUpperCase();
      const sideClass = type === 'LONG' ? 'long' : type === 'SHORT' ? 'short' : '';
      const entryPrice = parseFloat(pos.entryPrice || pos.openAvgPrice || 0).toFixed(4);
      const exitPrice = parseFloat(pos.exitPrice || pos.closeAvgPrice || 0).toFixed(4);
      const quantity = parseFloat(pos.quantity || pos.closeTotalPos || 0).toFixed(8);
      const pnl = parseFloat(pos.pnl || 0).toFixed(2);
      const pnlPercent = parseFloat(pos.pnlPercent || 0).toFixed(2);
      const pnlClass = parseFloat(pnl) >= 0 ? 'positive' : 'negative';

      htmlContent += `
        <tr>
          <td>${date}</td>
          <td><strong>${symbol}</strong></td>
          <td><span class="${sideClass}">${type}</span></td>
          <td>${entryPrice}</td>
          <td>${exitPrice}</td>
          <td>${quantity}</td>
          <td class="${pnlClass}">${pnl}</td>
          <td class="${pnlClass}">${pnlPercent}%</td>
        </tr>
      `;
    });

    htmlContent += `
              </tbody>
            </table>

            <div class="footer">
              <p>Trading Dome © 2025 - Reporte confidencial de trading</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    
    const options = {
      margin: [10, 10, 10, 10],
      filename: `Trading_Dome_Posiciones_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, precision: 16 },
      pagebreak: { mode: ['avoid-all'] }
    };

    html2pdf().set(options).from(element.innerHTML).save();
    console.log('[Posiciones] ✓ PDF descargado exitosamente (sin imagen)');
  }

  /**
   * Recarga las posiciones desde la API y las cachea
   */
  async refreshPositionsFromAPI() {
    try {
      const wrapper = this.container.querySelector('#positions-table-wrapper');
      if (wrapper) wrapper.innerHTML = '<p class="text-center"><i class="bi bi-hourglass-split"></i> Actualizando posiciones...</p>';

      if (!this.bitgetConnector) {
        console.error('[Posiciones] ❌ BitgetConnector no disponible');
        return;
      }

      console.log('[Posiciones] 📊 Recargando posiciones cerradas desde la API...');
      const positions = await this.bitgetConnector.getClosedPositions({ limit: 100 });

      if (positions && positions.length > 0) {
        // Guardar en sessionStorage
        sessionStorage.setItem('bitget_closed_positions', JSON.stringify({
          data: positions,
          timestamp: Date.now()
        }));

        console.log(`[Posiciones] ✅ ${positions.length} posiciones cerradas actualizadas`);
        
        // Emitir evento
        eventBus?.emit('bitget:closed-positions:cached', { count: positions.length, data: positions });
        
        // Cargar en la UI
        this.loadPositions();
      } else {
        console.log('[Posiciones] ℹ️ No hay posiciones cerradas para actualizar');
        this.loadPositions();
      }
    } catch (error) {
      console.error('[Posiciones] ❌ Error actualizando posiciones:', error);
    }
  }

  /**
   * Muestra mensaje de no configurado
   */
  showNotConfiguredMessage() {
    const wrapper = this.container.querySelector('#positions-table-wrapper');

    const message = '<div class="alert alert-warning"><i class="bi bi-shield-exclamation me-2"></i>Configura las credenciales en la pestaña de "APIs" para ver tus posiciones</div>';

    if (wrapper) wrapper.innerHTML = message;
  }
}

// Exportar
const posicionesModule = new PosicionesModule();

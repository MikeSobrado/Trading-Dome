/**
 * @file posiciones-abiertas.js
 * @description Módulo para mostrar posiciones abiertas en tiempo real
 * 
 * Características:
 * - Tabla con posiciones abiertas actuales
 * - Resumen de estadísticas
 * - Modal expandible para detalles completos
 * - Actualización en tiempo real (polling)
 * - Integración con caché global
 */

class PosicionesAbiertasModule {
  constructor(eventBus, apiConfigManager, positionsCache, bitgetConnector) {
    this.container = null;
    this.eventBus = eventBus;
    this.apiConfigManager = apiConfigManager;
    this.positionsCache = positionsCache;
    this.bitgetConnector = bitgetConnector;
    
    // Inicializar gestor de detalles
    this.detailsManager = new PosicionesAbiertasDetails(bitgetConnector, apiConfigManager);
    
    this.openPositions = [];
    this.rendered = false;
    this.domListenersAttached = false;
    this.eventUnsubscribers = [];
    this.updateInterval = null;
    this.updateIntervalMs = 5000; // Actualizar cada 5 segundos
    this.isLoading = false; // Bandera para evitar llamadas simultáneas
    this.isVisible = false; // Rastrear si el tab está visible
    this.autoUpdateStarted = false; // Bandera para evitar reiniciar auto-update múltiples veces
    this.lastUpdateTime = 0; // Rastrear tiempo de última actualización (debouncing)
    this.updateDebounceMs = 800; // Esperar 800ms entre actualizaciones de UI
    this.pendingLoad = null; // Para debouncing de loadPositions()
    
    console.log('[PosicionesAbiertas] ✓ Módulo inicializado');
  }

  /**
   * Establece el contenedor
   */
  setContainer(container) {
    this.container = container;
    if (this.container) {
      this.container.className = 'tab-content posiciones-abiertas-tab';
    }
  }

  /**
   * Inicializa el módulo
   */
  initialize() {
    try {
      console.log('[PosicionesAbiertas] 🚀 Inicializando módulo...');
      
      // Crear contenedor si no existe
      this.container = document.getElementById('posicionesAbiertasTab') || this.createContainer();
      
      // Suscribirse a evento tab:changed
      this.tabChangeUnsubscriber = this.eventBus?.on('tab:changed', (data) => this.onTabChanged(data));
      
      // Suscribirse a evento de posiciones abiertas cacheadas
      const cachedUnsubscriber = this.eventBus?.on('bitget:open-positions:cached', (data) => {
        console.log(`[PosicionesAbiertas] 🔔 Notificación: Se cachearon ${data.count} posiciones abiertas. Reloadando...`);
        if (this.container?.style.display !== 'none') {
          this.loadPositions();
        }
      });
      if (cachedUnsubscriber) {
        this.eventUnsubscribers.push(cachedUnsubscriber);
      }
      
      console.log('[PosicionesAbiertas] ✓ Módulo inicializado');
      return true;
    } catch (error) {
      console.error('[PosicionesAbiertas] ❌ Error inicializando:', error);
      return false;
    }
  }

  /**
   * Crea el contenedor
   */
  createContainer() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      console.error('[PosicionesAbiertas] ❌ No se encontró #main-content en el DOM');
      throw new Error('main-content not found');
    }
    
    const container = document.createElement('div');
    container.id = 'posicionesAbiertasTab';
    container.className = 'tab-content posiciones-abiertas-tab';
    mainContent.appendChild(container);
    this.container = container;
    console.log('[PosicionesAbiertas] ✓ Contenedor creado y añadido al DOM');
    return container;
  }

  /**
   * Lifecycle: Se llama cuando el tab se hace visible
   */
  onTabChanged(data) {
    if (data.tabId === 'posiciones-abiertas') {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Muestra el contenido
   */
  show() {
    try {
      console.log('[PosicionesAbiertas] 👁️ Mostrando tab');
      if (!this.container) {
        console.error('[PosicionesAbiertas] ❌ No hay contenedor');
        return;
      }

      this.isVisible = true;
      this.container.style.display = 'block';
      this.container.classList.add('active');
      
      if (!this.rendered) {
        console.log('[PosicionesAbiertas] ✓ Primera vez renderizando...');
        this.render();
        this.attachEventListeners();
        this.rendered = true;
      } else {
        console.log('[PosicionesAbiertas] ⚠️ Ya fue renderizado, re-adjuntando listeners...');
        this.attachEventListeners();
      }

      // SIEMPRE cargar datos frescos de la API cuando se muestra el tab
      console.log('[PosicionesAbiertas] 📂 Recargando datos frescos de la API...');
      this.loadPositions(true);
    } catch (error) {
      console.error('[PosicionesAbiertas] ❌ Error en show:', error);
    }
  }

  /**
   * Oculta el contenido del tab
   */
  hide() {
    try {
      console.log('[PosicionesAbiertas] 👁️ Ocultando tab');
      if (!this.container) return;
      this.isVisible = false;
      this.container.style.display = 'none';
      this.container.classList.remove('active');
      this.stopAutoUpdate();
      this.autoUpdateStarted = false; // Reset flag cuando se oculta el tab
    } catch (error) {
      console.error('[PosicionesAbiertas] ❌ Error en hide:', error);
    }
  }

  /**
   * Destruye el módulo y limpia listeners
   */
  destroy() {
    try {
      console.log('[PosicionesAbiertas] 🧹 Limpiando módulo...');
      this.stopAutoUpdate();
      this.eventUnsubscribers.forEach(unsubscriber => unsubscriber());
      this.eventUnsubscribers = [];
      console.log('[PosicionesAbiertas] ✓ Módulo destruido');
    } catch (error) {
      console.error('[PosicionesAbiertas] ❌ Error destruyendo:', error);
    }
  }

  /**
   * Renderiza el HTML del tab
   */
  render() {
    try {
      if (!this.container) {
        console.error('[PosicionesAbiertas] ❌ No hay container');
        return;
      }

      this.container.innerHTML = `
        <div class="posiciones-abiertas-container">
          <!-- Resumen estadísticas -->
          <div id="stats-abiertas" class="stats-abiertas-grid">
            <div class="stat-card">
              <div class="stat-label">Posiciones Abiertas</div>
              <div class="stat-value" id="total-posiciones">0</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">P&L Total</div>
              <div class="stat-value" id="pnl-total">$0.00</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Margen Usado</div>
              <div class="stat-value" id="margen-usado">$0.00</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Ratio Margen</div>
              <div class="stat-value" id="margin-ratio">0.00%</div>
            </div>
          </div>

          <!-- Tarjeta de tabla -->
          <div class="posiciones-abiertas-card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-lightning me-2"></i>
                Posiciones Abiertas
              </h5>
            </div>
            <div class="card-body">
              <!-- Acciones -->
              <div class="posiciones-acciones">
                <div class="filtros-seccion">
                  <button class="filtro-btn active" data-filtro="all">
                    <i class="bi bi-funnel me-1"></i>Todas
                  </button>
                  <button class="filtro-btn" data-filtro="long">
                    <i class="bi bi-arrow-up-right me-1"></i>LONG
                  </button>
                  <button class="filtro-btn" data-filtro="short">
                    <i class="bi bi-arrow-down-left me-1"></i>SHORT
                  </button>
                </div>
              </div>

              <!-- Tabla -->
              <div class="table-wrapper-abiertas" id="positions-abiertas-wrapper">
                <p class="text-muted text-center">
                  Cargando posiciones abiertas...
                </p>
              </div>
            </div>
          </div>
        </div>
      `;

      console.log('[PosicionesAbiertas] ✓ Contenido renderizado en el DOM');
    } catch (error) {
      console.error('[PosicionesAbiertas] ❌ Error durante render:', error);
    }
  }

  /**
   * Adjunta event listeners
   */
  attachEventListeners() {
    try {
      if (this.domListenersAttached) {
        console.log('[PosicionesAbiertas] ⚠️ Listeners ya adjuntados');
        return;
      }

      // Botones de filtro
      const filterBtns = this.container.querySelectorAll('.filtro-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const filter = btn.dataset.filtro;
          this.applyFilter(filter);
        });
      });

      this.domListenersAttached = true;
      console.log('[PosicionesAbiertas] ✓ Event listeners adjuntados');
    } catch (error) {
      console.error('[PosicionesAbiertas] ❌ Error adjuntando listeners:', error);
    }
  }

  /**
   * Carga posiciones abiertas desde API o caché
   */
  async loadPositions(forceRefresh = false) {
    // Debouncing: Si ya hay una carga pendiente, esperar
    if (this.pendingLoad) {
      return;
    }
    
    // Evitar llamadas simultáneas
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.pendingLoad = Date.now();

    try {
      const wrapper = this.container?.querySelector('#positions-abiertas-wrapper');
      const isFirstLoad = !wrapper || !this.container.querySelector('#positions-tbody');
      
      // Solo mostrar "Cargando" en la PRIMERA carga
      if (isFirstLoad && wrapper) {
        wrapper.innerHTML = '<p class="text-center"><i class="bi bi-hourglass-split"></i> Cargando...</p>';
      }

      let positionsData = null;

      // Durante auto-update o refresh forzado, siempre obtener de la API
      if (forceRefresh && this.positionsCache) {
        try {
          console.log('[PosicionesAbiertas] 🔄 Obteniendo datos frescos de la API...');
          positionsData = await this.positionsCache.loadOpenPositions(true); // true = forceRefresh
          if (Array.isArray(positionsData)) {
            console.log(`[PosicionesAbiertas] ✓ ${positionsData.length} posiciones obtenidas de la API`);
          } else {
            positionsData = null;
          }
        } catch (apiErr) {
          console.log('[PosicionesAbiertas] ⚠️ Error en API:', apiErr.message);
          positionsData = null;
        }
      } else {
        // Carga inicial: intentar sessionStorage primero
        try {
          const sessionData = sessionStorage.getItem('bitget_open_positions');
          if (sessionData) {
            const parsed = JSON.parse(sessionData);
            if (parsed.data && Array.isArray(parsed.data)) {
              console.log(`[PosicionesAbiertas] 📦 Datos encontrados en sessionStorage: ${parsed.data.length} posiciones`);
              positionsData = parsed.data;
            }
          }
        } catch (sessionErr) {
          console.log('[PosicionesAbiertas] ℹ️ No hay datos en sessionStorage:', sessionErr.message);
        }

        // Si no hay en sessionStorage, intentar desde caché global
        if (!positionsData && this.positionsCache) {
          try {
            console.log('[PosicionesAbiertas] 📡 Intentando cargar del caché global...');
            positionsData = await this.positionsCache.loadOpenPositions();
            if (Array.isArray(positionsData)) {
              console.log(`[PosicionesAbiertas] ✓ ${positionsData.length} posiciones obtenidas del caché`);
            } else {
              positionsData = null;
            }
          } catch (cacheErr) {
            console.log('[PosicionesAbiertas] ℹ️ No se pudo cargar del caché:', cacheErr.message);
            positionsData = null;
          }
        }
      }

      // Si no hay datos en caché, mostrar mensaje informativo
      if (!positionsData) {
        console.warn('[PosicionesAbiertas] ⚠️ No hay posiciones abiertas disponibles');
        
        if (!this.apiConfigManager?.isConfigured('bitget')) {
          console.warn('[PosicionesAbiertas] ℹ️ Bitget no está configurado');
          this.showNotConfiguredMessage();
        } else {
          console.warn('[PosicionesAbiertas] ℹ️ Sin datos de posiciones');
          const wrapper = this.container?.querySelector('#positions-abiertas-wrapper');
          if (wrapper) {
            wrapper.innerHTML = `
              <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                No hay posiciones abiertas. Descarga los datos desde la pestaña <strong>APIs</strong>.
              </div>
            `;
          }
        }
        // NO iniciar auto-actualización si no hay datos
        this.stopAutoUpdate();
        this.isLoading = false;
        return;
      }

      // Asignar datos
      this.openPositions = Array.isArray(positionsData) ? positionsData : [];
      
      // Primera renderización vs actualizaciones posteriores
      const wasAlreadyRendered = this.container.querySelector('#positions-tbody') !== null;
      
      if (!wasAlreadyRendered) {
        // PRIMERA RENDERIZACIÓN: Crear estructura completa
        this.renderPositionsTable();
      } else {
        // ACTUALIZACIONES POSTERIORES: Solo actualizar precios (SIN parpadeo)
        this.updatePositionsPricesOnly();
      }
      
      this.updateStats();

      // Enriquecer con datos de margen de forma asíncrona
      this.enrichPositionsWithMarginData().catch(err => {
        console.warn('[PosicionesAbiertas] ⚠️ Error enriqueciendo margen:', err.message);
      });

      // Iniciar auto-actualización SOLO si hay datos y no está ya iniciado
      if (!this.autoUpdateStarted) {
        console.log('[PosicionesAbiertas] 🚀 Iniciando auto-actualización por primera vez');
        this.autoUpdateStarted = true;
        this.startAutoUpdate();
      }

      console.log(`[PosicionesAbiertas] ✅ ${this.openPositions.length} posiciones cargadas`);
      this.isLoading = false;
      this.pendingLoad = null;
    } catch (error) {
      console.error('[PosicionesAbiertas] ❌ Error cargando posiciones:', error);
      const wrapper = this.container?.querySelector('#positions-abiertas-wrapper');
      if (wrapper) {
        wrapper.innerHTML = `
          <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Error cargando posiciones: ${error.message}
          </div>
        `;
      }
      this.stopAutoUpdate();
      this.isLoading = false;
      this.pendingLoad = null;
      this.isLoading = false;
    }
  }

  /**
   * Renderiza la tabla de posiciones (INICIAL - solo la primera vez)
   */
  renderPositionsTable() {
    const wrapper = this.container.querySelector('#positions-abiertas-wrapper');
    if (!wrapper) return;

    // Si ya existe tbody, NO re-renderizar, solo actualizar
    const existingTbody = wrapper.querySelector('#positions-tbody');
    if (existingTbody) {
      this.updatePositionsPricesOnly();
      return;
    }

    if (!this.openPositions || this.openPositions.length === 0) {
      wrapper.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle me-2"></i>No hay posiciones abiertas</div>';
      return;
    }

    console.log(`[PosicionesAbiertas] 🎨 Renderizando INICIAL ${this.openPositions.length} posiciones...`);

    // Header (solo la primera vez)
    const headerHtml = `
      <table class="positions-abiertas-header">
        <thead>
          <tr>
            <th>Par</th>
            <th>Lado</th>
            <th>Entrada</th>
            <th>Equilibrio</th>
            <th>Actual</th>
            <th>Liquidación</th>
            <th>Cantidad</th>
            <th>P&L</th>
            <th>Apalancamiento</th>
            <th>Acción</th>
          </tr>
        </thead>
      </table>
    `;

    // Insertar header si no existe
    if (!wrapper.previousElementSibling || !wrapper.previousElementSibling.classList.contains('positions-abiertas-header')) {
      wrapper.insertAdjacentHTML('beforebegin', headerHtml);
    }

    // Body - crear tabla con data attributes para actualizaciones rápidas
    let bodyHtml = `
      <div class="table-responsive-scrollable-abiertas">
        <table class="positions-abiertas-table">
          <tbody id="positions-tbody">
    `;

    this.openPositions.forEach((pos, index) => {
      try {
        const symbol = pos.symbol || 'N/A';
        const holdSide = (pos.holdSide || '').toLowerCase();
        const side = holdSide === 'long' 
          ? '<span class="badge badge-long">LONG</span>' 
          : holdSide === 'short'
          ? '<span class="badge badge-short">SHORT</span>'
          : `<span class="badge badge-unknown">UNKNOWN</span>`;

        const openPrice = parseFloat(pos.openPriceAvg || pos.openPrice || 0).toFixed(4);
        const marketPrice = parseFloat(pos.markPrice || pos.marketPrice || 0).toFixed(4);
        const breakEvenPrice = parseFloat(pos.breakEvenPrice || 0).toFixed(4);
        const liquidationPrice = parseFloat(pos.liquidationPrice || 0).toFixed(4);
        const quantity = parseFloat(pos.total || 0).toFixed(8);
        const unrealizedPnl = parseFloat(pos.unrealizedPL || 0).toFixed(2);
        const unrealizedPnlPercent = parseFloat(pos.unrealizedPLRatio || 0) * 100;
        const leverage = pos.leverage || 1;
        
        const pnlClass = parseFloat(unrealizedPnl) >= 0 ? 'positive' : 'negative';

        bodyHtml += `
          <tr class="posicion-abierta-row" data-index="${index}" data-symbol="${symbol}">
            <td class="cell-symbol"><strong>${symbol}</strong></td>
            <td class="cell-side">${side}</td>
            <td class="cell-open-price"><strong>$${openPrice}</strong></td>
            <td class="cell-break-even"><strong>$${breakEvenPrice}</strong></td>
            <td class="cell-market-price"><strong>$${marketPrice}</strong></td>
            <td class="cell-liquidation"><strong>$${liquidationPrice}</strong></td>
            <td class="cell-quantity"><strong>${quantity}</strong></td>
            <td class="cell-pnl ${pnlClass}"><strong>$${unrealizedPnl}</strong></td>
            <td class="cell-leverage"><strong>${leverage}x</strong></td>
            <td>
              <button class="btn-detalles" title="Ver detalles completos">
                <i class="bi bi-eye"></i>
              </button>
            </td>
          </tr>
        `;
      } catch (e) {
        console.warn(`[PosicionesAbiertas] ⚠️ Error renderizando posición ${index}:`, e);
      }
    });

    bodyHtml += `
          </tbody>
        </table>
      </div>
    `;

      wrapper.innerHTML = bodyHtml;

    // Adjuntar listeners de detalles
    this.attachDetailListeners();
  }

  /**
   * Actualiza solo las celdas que cambian (SIN re-renderizar toda la tabla)
   * Esto elimina el parpadeo - usa textContent cuando es posible para mejor performance
   * Con debouncing para evitar actualizaciones excesivas
   */
  updatePositionsPricesOnly() {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    
    // Si hace poco se actualizó, no actualizar de nuevo (debouncing)
    if (timeSinceLastUpdate < this.updateDebounceMs) {
      return;
    }
    
    this.lastUpdateTime = now;

    const tbody = this.container.querySelector('#positions-tbody');
    if (!tbody) {
      return;
    }

    const rows = tbody.querySelectorAll('.posicion-abierta-row');

    rows.forEach((row, index) => {
      const pos = this.openPositions[index];
      if (!pos) return;

      try {
        // Actualizar solo los precios y P&L (las celdas que cambian)
        const marketPrice = parseFloat(pos.markPrice || pos.marketPrice || 0).toFixed(4);
        const liquidationPrice = parseFloat(pos.liquidationPrice || 0).toFixed(4);
        const unrealizedPnl = parseFloat(pos.unrealizedPL || 0).toFixed(2);
        const pnlClass = parseFloat(unrealizedPnl) >= 0 ? 'positive' : 'negative';

        // Actualizar celda de precio actual
        const cellPrice = row.querySelector('.cell-market-price small');
        if (cellPrice) {
          cellPrice.textContent = `$${marketPrice}`;
        }

        // Actualizar celda de liquidación
        const cellLiquidation = row.querySelector('.cell-liquidation small');
        if (cellLiquidation) {
          cellLiquidation.textContent = `$${liquidationPrice}`;
        }

        // Actualizar celda de P&L
        const cellPnl = row.querySelector('.cell-pnl');
        if (cellPnl) {
          const strong = cellPnl.querySelector('strong');
          if (strong) {
            strong.textContent = `$${unrealizedPnl}`;
          }
          // Solo actualizar clase si cambió de positive a negative o vice versa
          const wasPositive = cellPnl.classList.contains('positive');
          const shouldBePositive = pnlClass === 'positive';
          if (wasPositive !== shouldBePositive) {
            cellPnl.classList.remove('positive', 'negative');
            cellPnl.classList.add(pnlClass);
          }
        }
      } catch (e) {
        console.warn(`[PosicionesAbiertas] ⚠️ Error actualizando fila ${index}:`, e);
      }
    });
  }

  /**
   * Adjunta listeners para botones de detalles
   */
  attachDetailListeners() {
    const btns = this.container.querySelectorAll('.btn-detalles');
    btns.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        this.showDetailsModal(index);
      });
    });
  }

  /**
   * Muestra modal con detalles enriquecidos
   */
  showDetailsModal(index) {
    const pos = this.openPositions[index];
    if (!pos) return;

    // Delegar al gestor de detalles
    this.detailsManager.showDetailsModal(pos);
  }

  /**
   * Aplica filtros a la tabla
   */
  applyFilter(filter) {
    const rows = this.container.querySelectorAll('.posicion-abierta-row');
    rows.forEach(row => {
      if (filter === 'all') {
        row.style.display = '';
      } else if (filter === 'long') {
        const hasLong = row.querySelector('.badge-long');
        row.style.display = hasLong ? '' : 'none';
      } else if (filter === 'short') {
        const hasShort = row.querySelector('.badge-short');
        row.style.display = hasShort ? '' : 'none';
      }
    });
  }

  /**
   * Actualiza estadísticas
   */
  updateStats() {
    const totalPosiciones = this.openPositions.length;
    let pnlTotal = 0;
    let marginTotal = 0;

    this.openPositions.forEach(pos => {
      pnlTotal += parseFloat(pos.unrealizedPL || 0);
      // Usar marginSize si está disponible (del single-position endpoint)
      const margin = parseFloat(pos.marginSize || pos.margin || 0);
      marginTotal += margin;
    });

    const totalEquity = marginTotal + pnlTotal; // Aproximación
    const marginRatio = totalEquity > 0 ? (marginTotal / totalEquity * 100) : 0;

    const totalPosicionesEl = this.container.querySelector('#total-posiciones');
    const pnlTotalEl = this.container.querySelector('#pnl-total');
    const margenUsadoEl = this.container.querySelector('#margen-usado');
    const marginRatioEl = this.container.querySelector('#margin-ratio');

    if (totalPosicionesEl) totalPosicionesEl.textContent = totalPosiciones;
    if (pnlTotalEl) {
      pnlTotalEl.textContent = `$${pnlTotal.toFixed(2)}`;
      pnlTotalEl.className = `stat-value ${pnlTotal >= 0 ? 'positive' : 'negative'}`;
    }
    if (margenUsadoEl) margenUsadoEl.textContent = `$${marginTotal.toFixed(2)}`;
    if (marginRatioEl) marginRatioEl.textContent = `${marginRatio.toFixed(2)}%`;
  }

  /**
   * Enriquece posiciones con datos de margen desde single-position
   */
  async enrichPositionsWithMarginData() {
    if (!this.openPositions || this.openPositions.length === 0 || !this.bitgetConnector) {
      console.log('[PosicionesAbiertas] ⚠️ No hay posiciones o bitgetConnector no disponible');
      return;
    }

    const config = this.apiConfigManager?.getConfig('bitget');
    if (!config) {
      console.log('[PosicionesAbiertas] ⚠️ Bitget no configurado');
      return;
    }

    console.log('[PosicionesAbiertas] 📊 Enriqueciendo posiciones con datos de margen...');

    // Para cada posición, obtener marginSize del endpoint single-position
    for (const pos of this.openPositions) {
      try {
        const singlePosData = await this.bitgetConnector.getSinglePosition(
          pos.symbol,
          'USDT-FUTURES',
          'USDT'
        );

        if (singlePosData && singlePosData.length > 0) {
          pos.marginSize = parseFloat(singlePosData[0].marginSize || 0);
          pos.marginRatio = parseFloat(singlePosData[0].marginRatio || 0);
          console.log(`[PosicionesAbiertas] ✓ ${pos.symbol}: marginSize=$${pos.marginSize.toFixed(2)}`);
        }
      } catch (err) {
        console.warn(`[PosicionesAbiertas] ⚠️ Error en ${pos.symbol}:`, err.message);
      }
    }

    // Actualizar estadísticas después de enriquecer
    this.updateStats();
  }

  /**
   * Inicia actualización automática
   */
  startAutoUpdate() {
    // Detener si ya está corriendo para reiniciar limpio
    if (this.updateInterval) {
      clearTimeout(this.updateInterval);
      this.updateInterval = null;
    }

    console.log(`[PosicionesAbiertas] 🔄 Iniciando auto-actualización (cada ${this.updateIntervalMs}ms)`);
    
    // Función recursiva que respeta el intervalo
    const scheduleNextUpdate = () => {
      if (!this.isVisible) {
        this.updateInterval = null;
        return;
      }

      this.updateInterval = setTimeout(async () => {
        if (this.isVisible && !this.isLoading) {
          await this.loadPositions(true); // true = forceRefresh para obtener datos frescos
        }
        // Programar la siguiente actualización
        scheduleNextUpdate();
      }, this.updateIntervalMs);
    };

    // Programar la siguiente actualización
    scheduleNextUpdate();
  }

  /**
   * Detiene actualización automática
   */
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearTimeout(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Muestra mensaje de no configurado
   */
  showNotConfiguredMessage() {
    const wrapper = this.container.querySelector('#positions-abiertas-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        <strong>Bitget no configurado</strong><br>
        Conecta tus credenciales desde la pestaña <strong>APIs</strong> para ver posiciones abiertas.
      </div>
    `;
  }
}

// Exportar para uso global
const posicionesAbiertasModule = typeof eventBus !== 'undefined' 
  ? new PosicionesAbiertasModule(
      eventBus,
      apiConfigManager,
      positionsCache,
      bitgetConnector
    )
  : null;

console.log('[APP] ✓ Posiciones Abiertas cargado bajo demanda');

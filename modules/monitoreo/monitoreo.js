/**
 * @file monitoreo.js
 * @description Módulo de monitoreo (pestaña Monitoreo)
 * Responsabilidades:
 * - Mostrar 6 gráficas de monitoreo en tiempo real
 * - Usar StatsCalculator para calcular métricas
 * - Usar PositionsCache para obtener datos
 * - Actualizar gráficas cuando cambian posiciones
 * 
 * Gráficas:
 * 1. Ganancia/Pérdida Total (línea temporal)
 * 2. Win Rate (porcentaje)
 * 3. Ratio Ganancias/Pérdidas
 * 4. Posiciones Largas vs Cortas (gráfico de barras)
 * 5. Distribución de Ganancias (histograma)
 * 6. Estadísticas Clave (tarjetas métricas)
 * 
 * Dependencias:
 * - modules/common/stats-calculator.js (StatsCalculator)
 * - modules/common/positions-cache.js (PositionsCache)
 * - chart.js (CDN para gráficas)
 */

class MonitoreoModule {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.rendered = false;
    this.positionsCache = typeof positionsCache !== 'undefined' ? positionsCache : null;
    this.statsCalculator = null;
    this.charts = {}; // Almacenar instancias de Chart.js
    this.eventUnsubscribers = [];
    this.tabChangeUnsubscriber = null; // Unsubscriber del evento tab:changed (NO se limpia en destroy)
    this.selectedPeriod = '3m'; // Período seleccionado: '3m', '1m', '1w'
  }

  /**
   * Inicializa el módulo
   */
  async initialize() {
    try {
      console.log('[Monitoreo] 🎯 Inicializando módulo Monitoreo...');
      
      // Crear contenedor
      this.container = document.getElementById('monitoreoTab') || this.createContainer();
      
      // Obtener referencias a dependencias globales
      this.positionsCache = typeof positionsCache !== 'undefined' ? positionsCache : null;
      
      // Suscribirse a evento tab:changed (NUNCA se limpia)
      this.tabChangeUnsubscriber = eventBus?.on('tab:changed', (data) => this.onTabChanged(data));
      
      // Escuchar cambios en posiciones para actualizar gráficas (se limpia en destroy)
      this.eventUnsubscribers.push(
        eventBus?.on('positions:loaded', (data) => {
          console.log(`[Monitoreo] 📡 Evento positions:loaded recibido (${data.count} posiciones)`);
          if (this.isVisible) {
            this.updateAllCharts();
          }
        })
      );
      
      // Escuchar cuando se conecta a Bitget (para actualizar gráficas)
      this.eventUnsubscribers.push(
        eventBus?.on('bitget:closed-positions:cached', (data) => {
          console.log(`[Monitoreo] 📡 Evento bitget:closed-positions:cached recibido (${data.count} posiciones)`);
          if (this.isVisible) {
            this.updateAllCharts();
          }
        })
      );
      
      return true;
    } catch (error) {
      console.error('[Monitoreo] ❌ Error inicializando:', error);
      errorHandler?.handleError('MONITOREO_INIT_ERROR', error);
      return false;
    }
  }

  /**
   * Crea el contenedor
   */
  createContainer() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      console.error('[Monitoreo] ❌ No se encontró #main-content en el DOM');
      throw new Error('main-content not found');
    }
    
    const container = document.createElement('div');
    container.id = 'monitoreoTab';
    container.className = 'tab-content monitoreo-tab';
    mainContent.appendChild(container);
    console.log('[Monitoreo] ✓ Contenedor creado');
    return container;
  }

  /**
   * Maneja cambio de tab
   */
  onTabChanged(data) {
    if (data.tabId === 'monitoreo') {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Muestra el contenido
   */
  show() {
    console.log('[Monitoreo] 👁️ Mostrando tab Monitoreo');
    
    this.isVisible = true;
    this.container.style.display = 'block';
    this.container.classList.add('active');
    
    // Solo renderizar la primera vez
    if (!this.rendered) {
      console.log('[Monitoreo] ✓ Primera vez renderizando...');
      this.render();
      this.initializeCharts();
      this.rendered = true;
    } else {
      console.log('[Monitoreo] ⚠️ Ya fue renderizado, actualizando gráficas...');
      // Simplemente actualizar gráficas
      this.updateAllCharts();
    }
  }

  /**
   * Oculta el contenido
   */
  hide() {
    console.log('[Monitoreo] 👁️ Ocultando tab Monitoreo');
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
      console.log('[Monitoreo] 🧹 Limpiando listeners y gráficas...');
      
      // Destruir gráficas
      Object.values(this.charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
      this.charts = {};
      
      // Limpiar solo listeners que NO son tab:changed
      // NO limpiar tabChangeUnsubscriber para que siga escuchando tab:changed
      if (this.eventUnsubscribers && this.eventUnsubscribers.length > 0) {
        this.eventUnsubscribers.forEach((unsubscriber) => {
          if (typeof unsubscriber === 'function') {
            unsubscriber();
          }
        });
        console.log(`[Monitoreo] ✓ ${this.eventUnsubscribers.length} listeners eliminados`);
        this.eventUnsubscribers = [];
      }
    } catch (error) {
      console.error('[Monitoreo] ❌ Error limpiando:', error);
    }
  }

  /**
   * Configura reactividad a eventos (listeners ya configurados en initialize)
   * Este método existe para mantener consistencia con otros módulos
   */
  setupReactivity() {
    // Los listeners ya están configurados en initialize()
    console.log('[Monitoreo] ✓ Reactividad ya configurada en initialize()');
  }

  /**
   * Renderiza el contenido
   */
  render() {
    try {
      console.log('[Monitoreo] 🎨 Renderizando contenido...');
      
      this.container.innerHTML = `
      <div class="monitoreo-container">
        <div class="monitoreo-header">
          <div class="monitoreo-header-top">
            <div>
              <h2>
                <i class="bi bi-graph-up me-2"></i>
                Monitoreo de Posiciones
              </h2>
              <p class="monitoreo-subtitle">Visualización en tiempo real de estadísticas de trading</p>
            </div>
            <div class="period-selector-wrapper">
              <select id="periodSelector" class="period-selector" title="Seleccionar período de análisis">
                <option value="3m">Últimos 3 Meses</option>
                <option value="1m">Último Mes</option>
                <option value="1w">Última Semana</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Grid de gráficas -->
        <div class="monitoreo-grid">
          <!-- Gráfica 1: PnL Total (Línea temporal) -->
          <div class="monitoreo-card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-graph-up-arrow me-2"></i>
                Ganancia/Pérdida Total
              </h5>
            </div>
            <div class="card-body">
              <canvas id="chart-pnl-timeline"></canvas>
            </div>
          </div>

          <!-- Gráfica 2: Comisiones Acumuladas -->
          <div class="monitoreo-card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-cash-coin me-2"></i>
                Comisiones Acumuladas
              </h5>
            </div>
            <div class="card-body">
              <canvas id="chart-accumulated-fees"></canvas>
            </div>
          </div>

          <!-- Gráfica 3: Ratio Ganancias/Pérdidas -->
          <div class="monitoreo-card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-balance-scale me-2"></i>
                Ratio R/R
              </h5>
            </div>
            <div class="card-body">
              <canvas id="chart-ratio"></canvas>
            </div>
          </div>

          <!-- Gráfica 4: P&L por Posición (Barras horizontales) -->
          <div class="monitoreo-card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-bar-chart-line me-2"></i>
                P&L por Posición
              </h5>
            </div>
            <div class="card-body">
              <canvas id="chart-pnl-by-position"></canvas>
            </div>
          </div>

          <!-- Gráfica 5: Drawdown Máximo -->
          <div class="monitoreo-card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-graph-down me-2"></i>
                Drawdown Máximo
              </h5>
            </div>
            <div class="card-body">
              <canvas id="chart-drawdown"></canvas>
            </div>
          </div>

          <!-- Gráfica 6: Long vs Short (Barras) -->
          <div class="monitoreo-card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-arrow-left-right me-2"></i>
                Posiciones: Long vs Short
              </h5>
            </div>
            <div class="card-body">
              <canvas id="chart-long-short"></canvas>
            </div>
          </div>

          <!-- Gráfica 7: Distribución de Ganancias (Histograma) -->
          <div class="monitoreo-card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-bar-chart me-2"></i>
                Distribución de Ganancias
              </h5>
            </div>
            <div class="card-body">
              <canvas id="chart-distribution"></canvas>
            </div>
          </div>

          <!-- Gráfica 8: Estadísticas Clave (Tarjetas) -->
          <div class="monitoreo-card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-lightning-charge me-2"></i>
                Estadísticas Clave
              </h5>
            </div>
            <div class="card-body" id="stats-container">
              <!-- Se rellena dinámicamente -->
            </div>
          </div>
        </div>
      </div>
      `;
      
      console.log('[Monitoreo] ✓ Contenido renderizado');
    } catch (error) {
      console.error('[Monitoreo] ❌ Error durante render:', error);
      errorHandler?.handleError('MONITOREO_RENDER_ERROR', error);
    }
  }

  /**
   * Inicializa todas las gráficas
   */
  async initializeCharts() {
    try {
      console.log('[Monitoreo] 📊 Inicializando gráficas...');
      
      // Cargar datos
      const allPositions = await this.getPositions();
      const positions = this.filterPositionsByPeriod(allPositions);
      const stats = this.calculateStats(positions);
      
      // Crear cada gráfica
      this.createPnlChart(positions);
      this.createAccumulatedFeesChart(positions);
      this.createRatioChart(stats);
      this.createPnlByPositionChart(positions);
      this.createDrawdownChart(positions);
      this.createLongShortChart(stats);
      this.createDistributionChart(positions);
      this.createStatsCards(stats);
      
      // Configurar selector de período
      this.setupPeriodSelector();
      
      console.log('[Monitoreo] ✓ Gráficas inicializadas');
    } catch (error) {
      console.error('[Monitoreo] ❌ Error inicializando gráficas:', error);
    }
  }

  /**
   * Actualiza todas las gráficas
   */
  async updateAllCharts() {
    try {
      console.log('[Monitoreo] 🔄 Actualizando todas las gráficas...');
      
      // Destruir gráficas existentes
      Object.values(this.charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
      this.charts = {};
      
      // Reinicializar
      await this.initializeCharts();
      
      console.log('[Monitoreo] ✓ Gráficas actualizadas');
    } catch (error) {
      console.error('[Monitoreo] ❌ Error actualizando gráficas:', error);
    }
  }

  /**
   * Obtiene posiciones desde caché o API
   */
  async getPositions() {
    try {
      let closedPositions = null;

      // ESTRATEGIA 1: Intentar desde sessionStorage (datos frescos de APIs)
      console.log('[Monitoreo] 📂 Buscando posiciones en sessionStorage...');
      const sessionData = sessionStorage.getItem('bitget_closed_positions');
      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          closedPositions = parsed.data || parsed;
          console.log(`[Monitoreo] ✅ ${closedPositions.length} posiciones desde sessionStorage (bitget_closed_positions)`);
        } catch (parseErr) {
          console.warn('[Monitoreo] ⚠️ Error parseando sessionStorage:', parseErr);
        }
      }

      // ESTRATEGIA 2: Si no hay en sessionStorage, intentar desde PositionsCache
      if (!closedPositions || closedPositions.length === 0) {
        if (this.positionsCache) {
          console.log('[Monitoreo] 📡 Intentando desde PositionsCache...');
          closedPositions = await this.positionsCache.getClosedPositions();
          if (closedPositions && closedPositions.length > 0) {
            console.log(`[Monitoreo] ✅ ${closedPositions.length} posiciones desde PositionsCache`);
          }
        } else {
          console.warn('[Monitoreo] ⚠️ PositionsCache no disponible');
        }
      }

      if (!closedPositions || closedPositions.length === 0) {
        console.warn('[Monitoreo] ⚠️ Sin posiciones disponibles');
        return [];
      }

      // Mapear posiciones si son de Bitget
      if (typeof FieldMapper !== 'undefined' && closedPositions.length > 0 && FieldMapper.isBitgetPosition(closedPositions[0])) {
        console.log('[Monitoreo] 🔄 Mapeando posiciones de Bitget para gráficas...');
        closedPositions = FieldMapper.mapBitgetPositions(closedPositions);
        console.log(`[Monitoreo] ✅ ${closedPositions.length} posiciones mapeadas`);
      }

      return closedPositions || [];
    } catch (error) {
      console.error('[Monitoreo] ❌ Error obteniendo posiciones:', error);
      return [];
    }
  }

  /**
   * Calcula estadísticas usando StatsCalculator
   */
  calculateStats(positions) {
    try {
      if (!positions || positions.length === 0) {
        return {
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
      
      const calculator = new StatsCalculator(positions);
      const stats = calculator.calculate();
      return stats;
    } catch (error) {
      console.error('[Monitoreo] ❌ Error calculando estadísticas:', error);
      return {};
    }
  }

  /**
   * Crea gráfica de PnL temporal
   */
  createPnlChart(positions) {
    try {
      if (!positions || positions.length === 0) {
        console.warn('[Monitoreo] ⚠️ Sin posiciones para PnL chart');
        return;
      }
      
      const canvas = this.container.querySelector('#chart-pnl-timeline');
      if (!canvas) return;
      
      // Preparar datos acumulativos
      let cumulativePnl = 0;
      const labels = [];
      const data = [];
      
      positions.forEach((pos, index) => {
        const pnl = pos.pnl || 0;
        cumulativePnl += pnl;
        labels.push(`Pos ${index + 1}`);
        data.push(cumulativePnl);
      });
      
      this.charts.pnl = new Chart(canvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'PnL Acumulado ($)',
            data: data,
            borderColor: '#00d4ff',
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#00d4ff',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: { display: true, labels: { color: '#a0a0a0' } },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              cornerRadius: 8,
              titleFont: { size: 12, weight: 'bold' },
              bodyFont: { size: 11 },
              displayColors: true
            }
          },
          scales: {
            y: { 
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            x: { 
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });
      
      console.log('[Monitoreo] ✓ Gráfica PnL creada');
    } catch (error) {
      console.error('[Monitoreo] ❌ Error creando PnL chart:', error);
    }
  }

  /**
   * Crea gráfica de comisiones acumuladas
   */
  createAccumulatedFeesChart(positions) {
    try {
      const canvas = this.container.querySelector('#chart-accumulated-fees');
      if (!canvas) return;
      
      if (!positions || positions.length === 0) {
        console.warn('[Monitoreo] ⚠️ Sin posiciones para Accumulated Fees');
        return;
      }

      // Calcular comisiones acumuladas
      let accumulatedFees = 0;
      const feesData = positions.map((pos) => {
        const openFee = parseFloat(pos.openFee || 0);
        const closeFee = parseFloat(pos.closeFee || 0);
        const fundingFee = parseFloat(pos.totalFunding || 0);
        const totalPositionFee = openFee + closeFee + fundingFee;
        accumulatedFees += totalPositionFee;
        // Invertir el signo para mostrar como gasto (positivo hacia arriba)
        return -accumulatedFees;
      });

      // Crear labels con fechas
      const labels = positions.map((pos) => {
        if (pos.closeTime) {
          const timestamp = parseInt(pos.closeTime);
          if (timestamp > 0 && timestamp <= Date.now() * 2) {
            const date = new Date(timestamp);
            return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
          }
        }
        return '';
      });

      this.charts.accumulatedFees = new Chart(canvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Comisiones Acumuladas (USDT)',
            data: feesData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: '#f59e0b'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: { display: true, labels: { color: '#a0a0a0' } }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            x: {
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });
      
      console.log('[Monitoreo] ✓ Gráfica Comisiones Acumuladas creada');
    } catch (error) {
      console.error('[Monitoreo] ❌ Error creando Accumulated Fees chart:', error);
    }
  }

  /**
   * Crea gráfica de P&L por Posición (barras horizontales)
   */
  createPnlByPositionChart(positions) {
    try {
      const canvas = this.container.querySelector('#chart-pnl-by-position');
      if (!canvas) return;
      
      if (!positions || positions.length === 0) return;

      const labels = [];
      const data = [];
      const colors = [];

      // Mostrar últimas 20 posiciones
      positions.slice(-20).forEach((position, index) => {
        const symbol = position.symbol || `Trade ${index + 1}`;
        const pnl = parseFloat(position.pnl) || 0;
        
        labels.push(symbol);
        data.push(pnl.toFixed(2));
        colors.push(pnl >= 0 ? '#10b981' : '#ef4444');
      });

      this.charts.pnlByPosition = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'P&L (USDT)',
            data: data,
            backgroundColor: colors,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            y: {
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });

      console.log('[Monitoreo] ✓ Gráfica P&L por Posición creada');
    } catch (error) {
      console.error('[Monitoreo] ❌ Error creando P&L by Position chart:', error);
    }
  }

  /**
   * Crea gráfica de Drawdown Máximo
   */
  createDrawdownChart(positions) {
    try {
      const canvas = this.container.querySelector('#chart-drawdown');
      if (!canvas) return;
      
      if (!positions || positions.length === 0) return;

      // Calcular equity curve acumulada
      const equityCurve = [];
      let runningTotal = 0;

      positions.forEach(position => {
        const pnl = parseFloat(position.pnl) || 0;
        runningTotal += pnl;
        equityCurve.push(runningTotal);
      });

      // Calcular drawdown en cada punto
      const drawdowns = [];
      let peak = 0;
      
      equityCurve.forEach((value) => {
        if (value > peak) {
          peak = value;
        }
        const drawdown = value - peak;
        drawdowns.push(drawdown);
      });

      const labels = positions.map((_, idx) => idx + 1);

      this.charts.drawdown = new Chart(canvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Drawdown (USDT)',
            data: drawdowns,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: { display: true, labels: { color: '#a0a0a0' } },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  return `Drawdown: ${context.parsed.y.toFixed(2)} USDT`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            x: {
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });

      console.log('[Monitoreo] ✓ Gráfica Drawdown creada');
    } catch (error) {
      console.error('[Monitoreo] ❌ Error creando Drawdown chart:', error);
    }
  }

  /**
   * Crea gráfica de Win Rate
   */
  createWinRateChart(stats) {
    try {
      const canvas = this.container.querySelector('#chart-win-rate');
      if (!canvas) return;
      
      const winRate = stats.winRate || 0;
      
      this.charts.winRate = new Chart(canvas, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [winRate, 100 - winRate],
            backgroundColor: ['#00d4ff', 'rgba(255, 0, 0, 0.3)'],
            borderColor: '#1a1a1a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          }
        }
      });
      
      // Añadir texto central
      const textCanvas = canvas.parentElement;
      textCanvas.innerHTML += `<div class="chart-center-text">${winRate.toFixed(1)}%</div>`;
      
      console.log('[Monitoreo] ✓ Gráfica Win Rate creada');
    } catch (error) {
      console.error('[Monitoreo] ❌ Error creando Win Rate chart:', error);
    }
  }

  /**
   * Crea gráfica de Ratio R/R
   */
  createRatioChart(stats) {
    try {
      const canvas = this.container.querySelector('#chart-ratio');
      if (!canvas) return;
      
      const avgWin = stats.avgWin || 0;
      const avgLoss = Math.abs(stats.avgLoss || 0);
      const ratio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 0;
      
      this.charts.ratio = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: ['Promedio Ganancia', 'Promedio Pérdida'],
          datasets: [{
            label: 'USD',
            data: [avgWin, avgLoss],
            backgroundColor: ['#00d4ff', '#ff6b6b'],
            borderColor: '#a0a0a0',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          indexAxis: 'y',
          plugins: {
            legend: { display: true, labels: { color: '#a0a0a0' } }
          },
          scales: {
            x: { 
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            y: { 
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });
      
      console.log('[Monitoreo] ✓ Gráfica Ratio creada (R/R: ' + ratio + ')');
    } catch (error) {
      console.error('[Monitoreo] ❌ Error creando Ratio chart:', error);
    }
  }

  /**
   * Crea gráfica Long vs Short
   */
  createLongShortChart(stats) {
    try {
      const canvas = this.container.querySelector('#chart-long-short');
      if (!canvas) return;
      
      this.charts.longShort = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: ['LONG', 'SHORT'],
          datasets: [{
            label: 'Cantidad',
            data: [stats.longCount || 0, stats.shortCount || 0],
            backgroundColor: ['#00d4ff', '#ff6b6b'],
            borderColor: '#a0a0a0',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true, labels: { color: '#a0a0a0' } }
          },
          scales: {
            y: { 
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            x: { 
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });
      
      console.log('[Monitoreo] ✓ Gráfica Long/Short creada');
    } catch (error) {
      console.error('[Monitoreo] ❌ Error creando Long/Short chart:', error);
    }
  }

  /**
   * Crea gráfica de distribución de ganancias
   */
  createDistributionChart(positions) {
    try {
      const canvas = this.container.querySelector('#chart-distribution');
      if (!canvas) return;
      
      if (!positions || positions.length === 0) {
        console.warn('[Monitoreo] ⚠️ Sin posiciones para distribución');
        return;
      }
      
      // Crear bins para el histograma
      const pnlValues = positions.map(p => p.pnl || 0).sort((a, b) => a - b);
      const min = Math.min(...pnlValues);
      const max = Math.max(...pnlValues);
      const range = max - min || 1;
      const binSize = range / 10;
      const bins = Array(10).fill(0);
      
      pnlValues.forEach(pnl => {
        const binIndex = Math.min(9, Math.floor((pnl - min) / binSize));
        bins[binIndex]++;
      });
      
      const binLabels = Array.from({ length: 10 }, (_, i) => 
        `${(min + i * binSize).toFixed(0)}-${(min + (i + 1) * binSize).toFixed(0)}`
      );
      
      this.charts.distribution = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: binLabels,
          datasets: [{
            label: 'Cantidad de Posiciones',
            data: bins,
            backgroundColor: '#00d4ff',
            borderColor: '#a0a0a0',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true, labels: { color: '#a0a0a0' } }
          },
          scales: {
            y: { 
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            x: { 
              ticks: { color: '#a0a0a0' },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });
      
      console.log('[Monitoreo] ✓ Gráfica Distribución creada');
    } catch (error) {
      console.error('[Monitoreo] ❌ Error creando Distribution chart:', error);
    }
  }

  /**
   * Crea tarjetas de estadísticas clave
   */
  createStatsCards(stats) {
    try {
      const container = this.container.querySelector('#stats-container');
      if (!container) return;
      
      const totalOperations = (stats.winners || 0) + (stats.losers || 0);
      const avgPnl = totalOperations > 0 ? stats.totalPnl / totalOperations : 0;
      
      const cards = `
        <div class="stats-columns">
          <!-- Primera Fila (2 columnas) -->
          <div class="stat-card">
            <div class="stat-label">PnL Total</div>
            <div class="stat-value ${(stats.totalPnl || 0) >= 0 ? 'text-success' : 'text-danger'}">
              $${(stats.totalPnl || 0).toFixed(2)}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Promedio P&L</div>
            <div class="stat-value ${avgPnl >= 0 ? 'text-success' : 'text-danger'}">
              $${avgPnl.toFixed(2)}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Máxima Ganancia</div>
            <div class="stat-value text-success">$${(stats.maxProfit || 0).toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Máxima Pérdida</div>
            <div class="stat-value text-danger">$${(stats.maxLoss || 0).toFixed(2)}</div>
          </div>
          
          <!-- Segunda Fila -->
          <div class="stat-card">
            <div class="stat-label">Tasa de Aciertos</div>
            <div class="stat-value ${(stats.winRate || 0) >= 50 ? 'text-success' : 'text-warning'}">
              ${stats.winRate || 0}%
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Operaciones Ganadoras</div>
            <div class="stat-value text-success">${stats.winners || 0}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Operaciones Perdedoras</div>
            <div class="stat-value text-danger">${stats.losers || 0}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total de Operaciones</div>
            <div class="stat-value text-info">${totalOperations}</div>
          </div>
        </div>
      `;
      
      container.innerHTML = cards;
      console.log('[Monitoreo] ✓ Tarjetas de estadísticas creadas');
    } catch (error) {
      console.error('[Monitoreo] ❌ Error creando stats cards:', error);
    }
  }

  /**
   * Configura el listener del selector de período
   */
  setupPeriodSelector() {
    try {
      const selector = document.getElementById('periodSelector');
      if (selector) {
        selector.value = this.selectedPeriod;
        selector.addEventListener('change', (e) => {
          console.log(`[Monitoreo] 📅 Período cambiado a: ${e.target.value}`);
          this.selectedPeriod = e.target.value;
          this.updateAllCharts();
        });
        console.log('[Monitoreo] ✓ Period selector configurado');
      }
    } catch (error) {
      console.error('[Monitoreo] ❌ Error configurando period selector:', error);
    }
  }

  /**
   * Filtra posiciones por período
   */
  filterPositionsByPeriod(positions) {
    if (!positions || positions.length === 0) {
      return [];
    }

    const now = new Date();
    let cutoffDate;

    switch (this.selectedPeriod) {
      case '1w':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Últimos 7 días
        break;
      case '1m':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Últimos 30 días
        break;
      case '3m':
      default:
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // Últimos 90 días
    }

    return positions.filter(pos => {
      const closeTime = pos.closeTime || pos.timestamp;
      if (!closeTime) return true;
      
      const date = new Date(closeTime);
      return date >= cutoffDate;
    });
  }
}

// Exportar
const monitoreoModule = new MonitoreoModule();

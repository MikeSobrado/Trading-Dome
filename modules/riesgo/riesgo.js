/**
 * @file riesgo.js
 * @description Módulo de gestión de riesgo - Calculadora de riesgo y costes
 * Responsabilidades:
 * - Mostrar formulario de parámetros de riesgo
 * - Renderizar resultados calculados en tiempo real usando RiskCalculator
 * - Emitir eventos cuando cambian los parámetros
 * - Persistir datos en stateManager
 * 
 * Dependencias:
 * - modules/common/risk-calculator.js (RiskCalculator)
 */

// Valores por defecto para el estado de riesgo
const DEFAULT_RISK_STATE = {
  capital: 1000,
  apalancamiento: 10,
  riesgoMaximo: 1,
  precioEntrada: 100,
  precioSL: 95,
  precioSalida: 110,
  riesgoBeneficio: 2,
  comision: 0.06,
  financiacion: 0.001,
  spread: 0,
  operacionTipo: 'long'
};

class RiesgoModule {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.rendered = false;
    this.warningDisplayed = false;
    this.riskCalculator = null; // Instancia de RiskCalculator
    this.eventUnsubscribers = []; // Array para guardar unsubscribers (NO incluye tab:changed)
    this.tabChangeUnsubscriber = null; // Unsubscriber del evento tab:changed (NO se limpia en destroy)
    this.profileDataUnsubscriber = null; // Unsubscriber del evento profile:changed (NO se limpia en destroy)
    this.domListenersAttached = false; // Flag para evitar re-adjuntar listeners de DOM
    
    // Estado de riesgo - SIEMPRE crear copia nueva de defaults
    this.riskState = { ...DEFAULT_RISK_STATE };
  }

  /**
   * Inicializa el módulo
   */
  async initialize() {
    try {
      console.log('[Riesgo] 🎯 Inicializando módulo Riesgo...');
      
      // Crear contenedor
      this.container = document.getElementById('riesgoTab') || this.createContainer();
      
      // Cargar estado inicial
      this.loadRiskState();
      
      // Suscribirse a cambios del servicio de datos
      this.profileDataUnsubscriber = profileDataService?.on('loaded', (data) => {
        console.log('[Riesgo] 📥 Datos del perfil cargados desde servicio');
        // REINICIAR con defaults y hacer copia profunda
        if (data.risk && Object.keys(data.risk).length > 0) {
          const deepCopyRisk = JSON.parse(JSON.stringify(data.risk));
          this.riskState = { ...DEFAULT_RISK_STATE, ...deepCopyRisk };
        } else {
          this.riskState = { ...DEFAULT_RISK_STATE };
        }
        
        this.updateInputsFromState();
        this.updateCalculations();
      });
      
      // Suscribirse a evento tab:changed (NUNCA se limpia)
      this.tabChangeUnsubscriber = eventBus?.on('tab:changed', (data) => this.onTabChanged(data));
      
      return true;
    } catch (error) {
      console.error('[Riesgo] ❌ Error inicializando:', error);
      errorHandler?.handleError('RIESGO_INIT_ERROR', error);
      return false;
    }
  }

  /**
   * Crea el contenedor
   */
  createContainer() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      console.error('[Riesgo] ❌ No se encontró #main-content');
      throw new Error('main-content not found');
    }
    
    const container = document.createElement('div');
    container.id = 'riesgoTab';
    container.className = 'tab-content riesgo-tab';
    mainContent.appendChild(container);
    console.log('[Riesgo] ✓ Contenedor creado');
    return container;
  }

  /**
   * Carga estado del riesgo desde stateManager
   */
  loadRiskState() {
    const activeProfileId = profileManager?.activeProfile;
    
    // Intentar cargar datos específicos del perfil desde profileManager
    if (activeProfileId && profileManager?.profiles?.[activeProfileId]?.risk) {
      const profileRiskData = profileManager.profiles[activeProfileId].risk;
      if (Object.keys(profileRiskData).length > 0) {
        // COPIA PROFUNDA del objeto del perfil + defaults
        const deepCopy = JSON.parse(JSON.stringify(profileRiskData));
        this.riskState = { ...DEFAULT_RISK_STATE, ...deepCopy };
        console.log(`[Riesgo] ✓ Estado cargado para perfil ${activeProfileId}`);
        return;
      }
    }
    
    // Fallback: cargar del stateManager
    const state = stateManager?.getState();
    if (state?.riskState) {
      const deepCopy = JSON.parse(JSON.stringify(state.riskState));
      this.riskState = { ...DEFAULT_RISK_STATE, ...deepCopy };
      console.log('[Riesgo] ✓ Estado cargado desde stateManager');
    } else {
      this.riskState = { ...DEFAULT_RISK_STATE };
      console.log('[Riesgo] ℹ️ Usando valores por defecto');
    }
  }

  /**
   * Maneja cambio de tab
   */
  onTabChanged(data) {
    if (data.tabId === 'riesgo') {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Maneja cambio de perfil
   */
  /**
   * Maneja cambio de perfil
   * NOTA: El servicio de datos se encargará de cargar automáticamente
   */
  onProfileChanged(data) {
    console.log(`[Riesgo] 📊 Perfil cambió a: ${data.profileId}`);
    // El listener del servicio en initialize() se encargará de cargar los datos
    // No necesitamos hacer nada aquí
  }

  /**
   * Muestra el contenido
   */
  show() {
    console.log('[Riesgo] 👁️ Mostrando tab Riesgo');
    
    this.isVisible = true;
    this.container.style.display = 'block';
    this.container.classList.add('active');
    
    // Re-suscribirse a cambios del servicio de datos (por si se limpió en destroy())
    if (!this.profileDataUnsubscriber || typeof this.profileDataUnsubscriber !== 'function') {
      this.profileDataUnsubscriber = profileDataService?.on('loaded', (data) => {
        console.log('[Riesgo] 📥 Datos del perfil cargados desde servicio');
        if (data.risk && Object.keys(data.risk).length > 0) {
          const deepCopyRisk = JSON.parse(JSON.stringify(data.risk));
          this.riskState = { ...DEFAULT_RISK_STATE, ...deepCopyRisk };
        } else {
          this.riskState = { ...DEFAULT_RISK_STATE };
        }
        
        this.updateInputsFromState();
        this.updateCalculations();
      });
    }
    
    // Solo renderizar la primera vez
    if (!this.rendered) {
      console.log('[Riesgo] ✓ Renderizando por primera vez...');
      this.render();
      this.attachEventListeners();
      this.renderProfileSelector();
      this.rendered = true;
    } else {
      console.log('[Riesgo] ⚠️ Ya fue renderizado, recargando estado del perfil actual...');
      // Re-cargar estado del perfil actual (en caso de que cambió el perfil)
      this.loadRiskState();
      this.updateInputsFromState();
      this.updateCalculations();
      // Re-adjuntar listeners porque fueron eliminados en destroy()
      this.attachEventListeners();
      this.renderProfileSelector();
    }
  }

  /**
   * Oculta el contenido
   */
  hide() {
    console.log('[Riesgo] 👁️ Ocultando tab Riesgo');
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
      console.log('[Riesgo] 🧹 Limpiando listeners...');
      
      // Limpiar listener del servicio de datos
      if (this.profileDataUnsubscriber && typeof this.profileDataUnsubscriber === 'function') {
        this.profileDataUnsubscriber();
        this.profileDataUnsubscriber = null;
      }
      
      // Limpiar solo listeners que NO son tab:changed
      // NO limpiar tabChangeUnsubscriber para que siga escuchando tab:changed
      if (this.eventUnsubscribers && this.eventUnsubscribers.length > 0) {
        this.eventUnsubscribers.forEach((unsubscriber) => {
          if (typeof unsubscriber === 'function') {
            unsubscriber();
          }
        });
        console.log(`[Riesgo] ✓ ${this.eventUnsubscribers.length} listeners eliminados`);
        this.eventUnsubscribers = [];
      }
    } catch (error) {
      console.error('[Riesgo] ❌ Error limpiando listeners:', error);
    }
  }

  /**
   * Renderiza el contenido
   */
  render() {
    try {
      console.log('[Riesgo] 🎨 Iniciando render...');
      
      this.container.innerHTML = `
      <div class="riesgo-container">
        
        <!-- Header -->
        <div class="riesgo-header-card">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-calculator me-2"></i>
              Calculadora de Riesgo y Costes
            </h5>
          </div>
          <div class="card-body">
            <p class="card-text">
              Calcula todos los aspectos de tu gestión de riesgo: margen, pérdida, ganancia, 
              comisiones y costes totales. Todos los cálculos se actualizan automáticamente.
            </p>
          </div>
        </div>

        <!-- Calculadora -->
        <div class="riesgo-calculator-card">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-sliders me-2"></i>
              Parámetros y Resultados
            </h5>
          </div>
          <div class="card-body">
            <div class="calculator-grid">
              
              <!-- COLUMNA INPUTS -->
              <div class="calculator-inputs">
                <h6 class="section-title">
                  <i class="bi bi-pencil-square me-2"></i>Parámetros de Entrada
                </h6>

                <div class="input-group">
                  <div class="input-header">
                    <label for="capital-total">Capital de la Cuenta ($)</label>
                    <small>Tu capital total disponible</small>
                  </div>
                  <input type="number" id="capital-total" value="${this.riskState.capital}" min="1" step="1">
                </div>

                <div class="input-group">
                  <div class="input-header">
                    <label for="riesgo-maximo">Riesgo Máximo (%)</label>
                    <small>Máxima pérdida por operación (%)</small>
                  </div>
                  <input type="number" id="riesgo-maximo" value="${this.riskState.riesgoMaximo}" min="0.1" step="0.1">
                </div>

                <div class="input-group">
                  <div class="input-header">
                    <label for="apalancamiento">Apalancamiento</label>
                    <small>Multiplicador de posición</small>
                  </div>
                  <input type="number" id="apalancamiento" value="${this.riskState.apalancamiento}" min="1" step="0.1">
                </div>

                <div class="input-group">
                  <label>Tipo de Operación</label>
                  <div class="toggle-buttons">
                    <button class="toggle-btn ${this.riskState.operacionTipo === 'long' ? 'active' : ''}" data-value="long">
                      <i class="bi bi-arrow-up me-1"></i>LONG
                    </button>
                    <button class="toggle-btn ${this.riskState.operacionTipo === 'short' ? 'active' : ''}" data-value="short">
                      <i class="bi bi-arrow-down me-1"></i>SHORT
                    </button>
                  </div>
                  <input type="hidden" id="operacion-tipo" value="${this.riskState.operacionTipo}">
                </div>

                <hr>

                <div class="input-group">
                  <div class="input-header">
                    <label for="precio-entrada">Precio Entrada ($)</label>
                    <small>Precio de compra/entrada</small>
                  </div>
                  <input type="number" id="precio-entrada" value="${this.riskState.precioEntrada}" min="0.01" step="0.01">
                </div>

                <div class="input-group">
                  <div class="input-header">
                    <label for="precio-sl">Precio SL ($)</label>
                    <small>Stop Loss - Control de pérdidas</small>
                  </div>
                  <input type="number" id="precio-sl" value="${this.riskState.precioSL}" min="0.01" step="0.01">
                </div>

                <div class="input-group">
                  <div class="input-header">
                    <label for="precio-salida">Precio Salida ($)</label>
                    <small>Take Profit - Precio objetivo</small>
                  </div>
                  <input type="number" id="precio-salida" value="${this.riskState.precioSalida}" min="0.01" step="0.01">
                </div>

                <div class="input-group">
                  <div class="input-header">
                    <label for="riesgo-beneficio">Riesgo/Beneficio</label>
                    <small>$ ganados por cada $1 arriesgado</small>
                  </div>
                  <input type="number" id="riesgo-beneficio" value="${this.riskState.riesgoBeneficio}" min="0.01" step="0.01">
                </div>

                <hr>

                <div class="input-group">
                  <div class="input-header">
                    <label for="comision">Comisión (%)</label>
                    <small>Comisión entrada + salida</small>
                  </div>
                  <input type="number" id="comision" value="${this.riskState.comision}" min="0" step="0.01">
                </div>

                <div class="input-group">
                  <div class="input-header">
                    <label for="financiacion">Financiación (%)</label>
                    <small>Costes overnight (8h)</small>
                  </div>
                  <input type="number" id="financiacion" value="${this.riskState.financiacion}" min="0" step="0.01">
                </div>

                <div class="input-group">
                  <div class="input-header">
                    <label for="spread">Spread ($)</label>
                    <small>Diferencia bid/ask</small>
                  </div>
                  <input type="number" id="spread" value="${this.riskState.spread}" min="0" step="0.01">
                </div>
              </div>

              <!-- PANEL DE USUARIO (CENTRO) -->
              <div class="user-panel">
                <div class="user-panel-content">
                  <h6 class="section-title">
                    <i class="bi bi-person-circle me-2"></i>Perfil de trading
                  </h6>
                  <div id="riesgo-profile-selector" class="profile-selector-container"></div>
                </div>
              </div>

              <!-- COLUMNA RESULTADOS -->
              <div class="calculator-results">
                <h6 class="section-title">
                  <i class="bi bi-file-ruled"></i>Resultados Calculados
                </h6>

                <div class="results-section">
                  <h6 class="subsection-title">📊 Márgenes Resultantes</h6>
                  
                  <div class="result-row">
                    <span class="result-label">Margen</span>
                    <span class="result-value" id="result-margen">$0.00</span>
                  </div>

                  <div class="result-row">
                    <span class="result-label">Distancia de Riesgo</span>
                    <span class="result-value" id="result-distancia">0.00%</span>
                  </div>

                  <div class="result-row">
                    <span class="result-label">Pérdida Neta</span>
                    <span class="result-value" id="result-perdida">$0.00</span>
                  </div>

                  <div class="result-row">
                    <span class="result-label">Ganancia Neta</span>
                    <span class="result-value" id="result-ganancia">$0.00</span>
                  </div>

                  <div class="result-row">
                    <span class="result-label">Break-even</span>
                    <span class="result-value" id="result-breakeven">$0.00</span>
                  </div>

                  <div class="result-row">
                    <span class="result-label">ROI</span>
                    <span class="result-value" id="result-roi">0.00%</span>
                  </div>
                </div>

                <div class="results-section">
                  <h6 class="subsection-title">💰 Costes y Ganancia Mínima</h6>
                  
                  <div class="result-row">
                    <span class="result-label">Comisiones</span>
                    <span class="result-value" id="result-comision">$0.00</span>
                  </div>

                  <div class="result-row">
                    <span class="result-label">Gastos Totales</span>
                    <span class="result-value" id="result-gastos">$0.00</span>
                  </div>

                  <div class="result-row">
                    <span class="result-label">% Mínimo para Cubrir</span>
                    <span class="result-value" id="result-porcentaje">0.00%</span>
                  </div>
                </div>

                <div class="alert alert-warning" id="alert-rr" style="display: none;">
                  <i class="bi bi-exclamation-triangle me-2"></i>
                  <strong>Alerta de Riesgo/Beneficio</strong><br>
                  El ratio R:R es menor al objetivo establecido
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
      `;
      
      console.log('[Riesgo] ✓ Contenido renderizado');
    } catch (error) {
      console.error('[Riesgo] ❌ Error durante render:', error);
      errorHandler?.handleError('RIESGO_RENDER_ERROR', error);
    }
  }

  /**
   * Adjunta event listeners
   */
  attachEventListeners() {
    try {
      // Solo adjuntar listeners de DOM una sola vez
      if (this.domListenersAttached) {
        console.log('[Riesgo] ⚠️ Listeners de DOM ya están adjuntados, saltando...');
        this.updateCalculations();
        return;
      }

      // Inputs
      const inputs = [
        'capital-total', 'riesgo-maximo', 'apalancamiento',
        'precio-entrada', 'precio-sl', 'precio-salida', 'riesgo-beneficio',
        'comision', 'financiacion', 'spread'
      ];

      inputs.forEach(inputId => {
        const input = this.container.querySelector(`#${inputId}`);
        if (input) {
          input.addEventListener('change', () => this.onInputChange());
          input.addEventListener('input', () => this.onInputChange());
        }
      });

      // Botones toggle LONG/SHORT
      const toggleBtns = this.container.querySelectorAll('.toggle-btn');
      toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => this.onToggleOperationType(e.target));
      });

      // Selector de perfiles
      this.attachProfileSelectorListeners();

      this.domListenersAttached = true;
      console.log('[Riesgo] ✓ Event listeners adjuntados');
      
      // Calcular inicial
      this.updateCalculations();
    } catch (error) {
      console.error('[Riesgo] Error adjuntando listeners:', error);
    }
  }

  /**
   * Adjunta listeners al selector de perfiles
   */
  attachProfileSelectorListeners() {
    const prevBtn = this.container.querySelector('#profile-prev-btn');
    const nextBtn = this.container.querySelector('#profile-next-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        profileManager?.previousProfile();
        this.loadRiskState(); // Recargar estado del nuevo perfil
        this.updateInputsFromState(); // Actualizar inputs
        this.renderProfileSelector();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        profileManager?.nextProfile();
        this.loadRiskState(); // Recargar estado del nuevo perfil
        this.updateInputsFromState(); // Actualizar inputs
        this.renderProfileSelector();
      });
    }
  }

  /**
   * Renderiza el selector de perfiles
   */
  renderProfileSelector() {
    const container = this.container.querySelector('#riesgo-profile-selector');
    if (!container) return;

    const profileName = profileManager?.getActiveProfileName() || 'Desconocido';

    container.innerHTML = `
      <div class="profile-selector">
        <div class="profile-nav">
          <button id="profile-prev-btn" class="profile-nav-btn" title="Perfil anterior">
            <i class="bi bi-chevron-left"></i>
          </button>
          <span class="profile-name">${profileName}</span>
          <button id="profile-next-btn" class="profile-nav-btn" title="Perfil siguiente">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    `;

    // Re-adjuntar listeners
    this.attachProfileSelectorListeners();
  }

  /**
   * Maneja cambios en inputs
   */
  onInputChange() {
    this.loadInputValues();
    this.updateCalculations();
  }

  /**
   * Maneja toggle LONG/SHORT
   */
  onToggleOperationType(btn) {
    const value = btn.dataset.value;
    
    // Actualizar visualmente
    const parent = btn.parentElement;
    parent.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Actualizar valor
    this.riskState.operacionTipo = value;
    this.container.querySelector('#operacion-tipo').value = value;
    
    this.updateCalculations();
  }

  /**
   * Carga valores de los inputs
   */
  loadInputValues() {
    this.riskState = {
      capital: parseFloat(this.container.querySelector('#capital-total')?.value) || 0,
      apalancamiento: parseFloat(this.container.querySelector('#apalancamiento')?.value) || 1,
      riesgoMaximo: parseFloat(this.container.querySelector('#riesgo-maximo')?.value) || 0,
      precioEntrada: parseFloat(this.container.querySelector('#precio-entrada')?.value) || 0,
      precioSL: parseFloat(this.container.querySelector('#precio-sl')?.value) || 0,
      precioSalida: parseFloat(this.container.querySelector('#precio-salida')?.value) || 0,
      riesgoBeneficio: parseFloat(this.container.querySelector('#riesgo-beneficio')?.value) || 0,
      comision: parseFloat(this.container.querySelector('#comision')?.value) || 0,
      financiacion: parseFloat(this.container.querySelector('#financiacion')?.value) || 0,
      spread: parseFloat(this.container.querySelector('#spread')?.value) || 0,
      operacionTipo: this.container.querySelector('#operacion-tipo')?.value || 'long'
    };
  }

  /**
   * Actualiza los inputs del DOM con valores del estado
   */
  updateInputsFromState() {
    if (!this.rendered) return;

    this.container.querySelector('#capital-total').value = this.riskState.capital;
    this.container.querySelector('#apalancamiento').value = this.riskState.apalancamiento;
    this.container.querySelector('#riesgo-maximo').value = this.riskState.riesgoMaximo;
    this.container.querySelector('#precio-entrada').value = this.riskState.precioEntrada;
    this.container.querySelector('#precio-sl').value = this.riskState.precioSL;
    this.container.querySelector('#precio-salida').value = this.riskState.precioSalida;
    this.container.querySelector('#riesgo-beneficio').value = this.riskState.riesgoBeneficio;
    this.container.querySelector('#comision').value = this.riskState.comision;
    this.container.querySelector('#financiacion').value = this.riskState.financiacion;
    this.container.querySelector('#spread').value = this.riskState.spread;
    this.container.querySelector('#operacion-tipo').value = this.riskState.operacionTipo;

    // Actualizar toggle visual
    const toggleBtns = this.container.querySelectorAll('.toggle-btn');
    toggleBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === this.riskState.operacionTipo);
    });
  }

  /**
   * Obtiene la instancia actual del calculador de riesgo
   */
  getRiskCalculator() {
    if (!this.riskCalculator) {
      this.riskCalculator = new RiskCalculator(this.riskState);
    }
    return this.riskCalculator;
  }

  /**
   * Actualiza resultados en la UI
   */
  updateCalculations() {
    // Asegurar que riskState tiene los valores actuales del DOM
    this.loadInputValues();
    
    // Usar RiskCalculator en lugar de calculateRisk()
    this.riskCalculator = new RiskCalculator(this.riskState);
    const results = this.riskCalculator.calculate();

    // Mapear resultados a elementos del DOM
    // Usar valores NETOS (sin gastos)
    const displayMap = {
      'result-margen': `${results.margen.toFixed(2)}$`,
      'result-distancia': `${results.distanciaRiesgo.toFixed(2)}%`,
      'result-perdida': `${results.perdidaEnDolares.toFixed(2)}$`,
      'result-ganancia': `${results.ganancia.toFixed(2)}$`,
      'result-breakeven': `${results.breakeven.toFixed(2)}$`,
      'result-roi': `${results.roi.toFixed(2)}%`,
      'result-comision': `${results.costeComisionDolares.toFixed(2)}$`,
      'result-gastos': `${results.gastosTotalesDolares.toFixed(2)}$`,
      'result-porcentaje': `${results.porcentajeGananciaMinima.toFixed(2)}%`
    };

    Object.entries(displayMap).forEach(([elementId, value]) => {
      const element = this.container.querySelector(`#${elementId}`);
      if (element) {
        element.textContent = value;
      }
    });

    // Mostrar/ocultar alerta
    const alertBox = this.container.querySelector('#alert-rr');
    if (results.tieneAlerta) {
      alertBox.style.display = 'block';
      this.warningDisplayed = true;
    } else {
      alertBox.style.display = 'none';
      this.warningDisplayed = false;
    }

    // Guardar en servicio de datos (punto único de guardado)
    profileDataService?.save('risk', { ...this.riskState });

    // Guardar en stateManager para persistencia
    stateManager?.setState({ 
      riskState: this.riskState,
      riskResults: results 
    });

    // Emitir evento
    eventBus?.emit('risk:updated', { results, hasWarning: results.tieneAlerta });

    console.log('[Riesgo] 📊 Cálculos actualizados (usando RiskCalculator)');
  }
}// Exportar
const riesgoModule = new RiesgoModule();

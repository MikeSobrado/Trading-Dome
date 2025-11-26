/**
 * @file analisis.js
 * @description Módulo de análisis (pestaña principal)
 * Responsabilidades:
 * - Mostrar panel de decisión (LONG/WAIT/SHORT)
 * - Gestionar indicadores de trading
 * - Mostrar widget de perfiles
 * - Renderizar y actualizar interfaz
 * - Limpiar listeners al ocultar para evitar memory leaks
 */

class AnalisisModule {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.rendered = false;
    this.indicators = [];
    this.eventUnsubscribers = [];
    this.tabChangeUnsubscriber = null;
    this.profileChangeUnsubscriber = null; // Nuevo: para limpiar listener de profile:changed
    this.profileDataUnsubscriber = null;
    this.domListenersAttached = false;
  }

  /**
   * Inicializa el módulo
   */
  async initialize() {
    try {
      console.log('[Analisis] 🎯 Inicializando módulo Análisis...');
      
      // Crear contenedor
      this.container = document.getElementById('analisisTab') || this.createContainer();
      
      // Inicializar indicadores desde estado
      this.loadIndicators();
      
      // Suscribirse al evento tab:changed (NUNCA se limpia)
      this.tabChangeUnsubscriber = eventBus?.on('tab:changed', (data) => this.onTabChanged(data));

      // Suscribirse a cambios de perfil directamente en eventBus (más directo que ProfileDataService)
      this.profileChangeUnsubscriber = eventBus?.on('profile:changed', (data) => {
        console.log('[Analisis] 🔄 Perfil cambió (desde eventBus), recargando indicadores...');
        // Recargar desde IndicatorsManager para asegurar sincronización
        indicatorsManager?.load();
        this.loadIndicators();
        this.renderIndicators();
        this.updateThresholdInputs();
        this.calculateDecision();
      });

      // Suscribirse a cambios del servicio de datos
      this.profileDataUnsubscriber = profileDataService?.on('loaded', (data) => {
        console.log('[Analisis] 📥 Datos del perfil cargados desde servicio');
        // Recargar desde IndicatorsManager para asegurar sincronización
        indicatorsManager?.load();
        this.loadIndicators();
        this.renderIndicators();
        this.updateThresholdInputs();
        this.calculateDecision();
      });
      
      return true;
    } catch (error) {
      console.error('[Analisis] ❌ Error inicializando:', error);
      errorHandler?.handleError('ANALISIS_INIT_ERROR', error);
      return false;
    }
  }

  /**
   * Carga indicadores del estado
   */
  /**
   * Carga indicadores desde el gestor de indicadores
   */
  loadIndicators() {
    indicatorsManager?.load();
    this.indicators = indicatorsManager?.getAll() || [];
    console.log('[Analisis] ✓ Indicadores cargados desde IndicatorsManager');
  }

  /**
   * Guarda indicadores a través del gestor
   */
  saveIndicators() {
    indicatorsManager?.save();
  }

  /**
   * Crea el contenedor
   */
  createContainer() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      console.error('[Analisis] ❌ No se encontró #main-content en el DOM');
      console.error('[Analisis] DOM actual:', document.body.innerHTML.substring(0, 500));
      throw new Error('main-content not found');
    }
    
    const container = document.createElement('div');
    container.id = 'analisisTab';
    container.className = 'tab-content analisis-tab';
    mainContent.appendChild(container);
    console.log('[Analisis] ✓ Contenedor creado y añadido al DOM');
    return container;
  }

  /**
   * Maneja cambio de tab
   */
  onTabChanged(data) {
    if (data.tabId === 'analisis') {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Muestra el contenido
   */
  show() {
    console.log('[Analisis] 👁️ Mostrando tab Análisis');
    
    this.isVisible = true;
    this.container.style.display = 'block';
    this.container.classList.add('active');
    
    // Solo renderizar la primera vez
    if (!this.rendered) {
      console.log('[Analisis] ✓ Primera vez renderizando...');
      this.render();
      this.attachEventListeners();
      this.setupReactivity();
      this.calculateDecision(); // Calcular decisión inicial
      
      // Inicializar widget de perfiles
      if (typeof profileWidget !== 'undefined') {
        profileWidget.initialize();
        console.log('[Analisis] ✓ Widget de perfiles inicializado');
      }
      
      this.rendered = true;
      console.log('[Analisis] ✓ Renderizado completado');
    } else {
      console.log('[Analisis] ⚠️ Ya fue renderizado, recargando indicadores del perfil actual...');
      // Re-adjuntar listeners porque fueron eliminados en destroy()
      this.attachEventListeners();
      this.setupReactivity();
      // IMPORTANTE: Recargar indicadores del perfil actual
      indicatorsManager?.load();
      this.loadIndicators();
      this.renderIndicators();
      this.updateThresholdInputs();
      this.calculateDecision(); // Recalcular con datos actuales
    }
  }

  /**
   * Oculta el contenido y limpia listeners
   */
  hide() {
    console.log('[Analisis] 👁️ Ocultando tab Análisis');
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
      console.log('[Analisis] 🧹 Limpiando listeners...');
      
      // Limpiar listener del servicio de datos
      if (this.profileDataUnsubscriber && typeof this.profileDataUnsubscriber === 'function') {
        this.profileDataUnsubscriber();
        this.profileDataUnsubscriber = null;
      }
      
      // Limpiar listeners de attachEventListeners (botón y thresholds)
      if (this.addIndicatorHandler) {
        const addIndicatorBtn = this.container?.querySelector('#add-indicator-btn');
        if (addIndicatorBtn) {
          addIndicatorBtn.removeEventListener('click', this.addIndicatorHandler);
        }
        this.addIndicatorHandler = null;
      }
      
      if (this.greenThresholdHandler) {
        const greenThreshold = this.container?.querySelector('#green-threshold');
        if (greenThreshold) {
          greenThreshold.removeEventListener('change', this.greenThresholdHandler);
        }
        this.greenThresholdHandler = null;
      }
      
      if (this.yellowThresholdHandler) {
        const yellowThreshold = this.container?.querySelector('#yellow-threshold');
        if (yellowThreshold) {
          yellowThreshold.removeEventListener('change', this.yellowThresholdHandler);
        }
        this.yellowThresholdHandler = null;
      }
      
      if (this.redThresholdHandler) {
        const redThreshold = this.container?.querySelector('#red-threshold');
        if (redThreshold) {
          redThreshold.removeEventListener('change', this.redThresholdHandler);
        }
        this.redThresholdHandler = null;
      }

      // Limpiar listener de indicadores (event delegation)
      if (this.indicatorListHandler) {
        const indicatorList = this.container?.querySelector('#indicator-list');
        if (indicatorList) {
          indicatorList.removeEventListener('change', this.indicatorListHandler);
          indicatorList.removeEventListener('blur', this.indicatorListHandler, true);
          indicatorList.removeEventListener('keypress', this.indicatorListHandler);
          indicatorList.removeEventListener('click', this.indicatorListHandler);
        }
        this.indicatorListHandler = null;
      }
      
      // Limpiar solo listeners de setupReactivity (indicadores, decisión, perfil)
      // NO limpiar tabChangeUnsubscriber ni profileChangeUnsubscriber para que sigan escuchando incluso ocultos
      if (this.eventUnsubscribers && this.eventUnsubscribers.length > 0) {
        this.eventUnsubscribers.forEach((unsubscriber) => {
          if (typeof unsubscriber === 'function') {
            unsubscriber();
          }
        });
        console.log(`[Analisis] ✓ ${this.eventUnsubscribers.length} listeners de setupReactivity eliminados`);
        this.eventUnsubscribers = [];
      }
    } catch (error) {
      console.error('[Analisis] ❌ Error limpiando listeners:', error);
    }
  }

  /**
   * Renderiza el contenido
   */
  render() {
    try {
      console.log('[Analisis] 🎨 Iniciando render del contenido...');
      console.log('[Analisis] Container:', this.container);
      console.log('[Analisis] Container ID:', this.container?.id);
      
      this.container.innerHTML = `
      <div class="analisis-container">
        
        <!-- Widget de Perfiles -->
        <div class="analisis-profiles-card">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-person-lines-fill me-2"></i>
              Perfiles de Usuario
            </h5>
          </div>
          <div class="card-body" id="profiles-widget-analisis">
            <!-- Widget de perfiles se inyecta aquí -->
            <p class="text-muted">Cargando perfiles...</p>
          </div>
        </div>

        <!-- Panel de Decisión -->
        <div class="analisis-decision-card">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-lightning-charge me-2"></i>
              Panel de Decisión Trading
            </h5>
          </div>
          <div class="card-body">
            <div class="decision-panel">
              <div class="decision-icons-container">
                
                <!-- LONG Signal -->
                <div class="decision-item decision-buy" id="buy-signal">
                  <svg class="decision-icon" viewBox="0 0 24 24">
                    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.85-1.26l3.03-7.08c.09-.23.12-.47.12-.66v-2z"/>
                  </svg>
                  <div class="decision-controls">
                    <span class="decision-label">LONG</span>
                    <input type="number" class="threshold-input" id="green-threshold" value="50" min="1">
                  </div>
                </div>

                <!-- WAIT Signal -->
                <div class="decision-item decision-wait active" id="wait-signal">
                  <svg class="decision-icon" viewBox="0 0 24 24">
                    <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6z"/>
                  </svg>
                  <div class="decision-controls">
                    <span class="decision-label">ESPERA</span>
                    <input type="number" class="threshold-input" id="yellow-threshold" value="20" min="1">
                  </div>
                </div>

                <!-- SHORT Signal -->
                <div class="decision-item decision-sell" id="sell-signal">
                  <svg class="decision-icon" viewBox="0 0 24 24">
                    <path d="M15 3H6c-.83 0-1.54.5-1.85 1.26l-3.03 7.08c-.09.23-.12.47-.12.66v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
                  </svg>
                  <div class="decision-controls">
                    <span class="decision-label">SHORT</span>
                    <input type="number" class="threshold-input" id="red-threshold" value="50" min="1">
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <!-- Panel de Indicadores -->
        <div class="analisis-indicators-card">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-graph-up me-2"></i>
              Indicadores de Trading
            </h5>
          </div>
          <div class="card-body">
            <div class="indicators-panel">
              <ul class="indicator-list" id="indicator-list">
                <!-- Los indicadores se cargarán dinámicamente -->
              </ul>
              <div class="text-center mt-3">
                <button type="button" class="refresh-btn" id="add-indicator-btn">
                  <i class="bi bi-plus-circle me-2"></i>
                  Añadir Indicador
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
      
      console.log('[Analisis] ✓ Contenido renderizado en el DOM');
    } catch (error) {
      console.error('[Analisis] ❌ Error durante render:', error);
      errorHandler?.handleError('ANALISIS_RENDER_ERROR', error);
    }
  }

  /**
   * Adjunta event listeners
   */
  attachEventListeners() {
    try {
      // Renderizar indicadores
      this.renderIndicators();
      this.attachIndicatorListeners();
      
      // Actualizar inputs de threshold con valores del perfil
      this.updateThresholdInputs();

      // Usar event delegation para el botón de añadir indicador
      // Remover listener anterior si existe
      if (this.addIndicatorHandler) {
        const addIndicatorBtn = this.container.querySelector('#add-indicator-btn');
        if (addIndicatorBtn) {
          addIndicatorBtn.removeEventListener('click', this.addIndicatorHandler);
        }
      }
      
      // Guardar el handler para poder removerlo después
      this.addIndicatorHandler = () => this.onAddIndicator();
      const addIndicatorBtn = this.container.querySelector('#add-indicator-btn');
      if (addIndicatorBtn) {
        addIndicatorBtn.addEventListener('click', this.addIndicatorHandler);
      }

      // Inputs de threshold - Remover listeners anteriores
      const greenThreshold = this.container.querySelector('#green-threshold');
      const yellowThreshold = this.container.querySelector('#yellow-threshold');
      const redThreshold = this.container.querySelector('#red-threshold');
      
      if (this.greenThresholdHandler && greenThreshold) {
        greenThreshold.removeEventListener('change', this.greenThresholdHandler);
      }
      if (this.yellowThresholdHandler && yellowThreshold) {
        yellowThreshold.removeEventListener('change', this.yellowThresholdHandler);
      }
      if (this.redThresholdHandler && redThreshold) {
        redThreshold.removeEventListener('change', this.redThresholdHandler);
      }
      
      // Guardar los handlers
      this.greenThresholdHandler = (e) => this.onThresholdChanged('long', e.target.value);
      this.yellowThresholdHandler = (e) => this.onThresholdChanged('wait', e.target.value);
      this.redThresholdHandler = (e) => this.onThresholdChanged('short', e.target.value);
      
      if (greenThreshold) {
        greenThreshold.addEventListener('change', this.greenThresholdHandler);
      }
      
      if (yellowThreshold) {
        yellowThreshold.addEventListener('change', this.yellowThresholdHandler);
      }
      
      if (redThreshold) {
        redThreshold.addEventListener('change', this.redThresholdHandler);
      }

      console.log('[Analisis] ✓ Event listeners adjuntados');
    } catch (error) {
      console.error('[Analisis] Error adjuntando listeners:', error);
    }
  }

  /**
   * Configura listeners de eventos de indicatorsManager
   */
  setupReactivity() {
    try {
      // Limpiar listeners previos si existen (en caso de re-adjunción)
      if (this.eventUnsubscribers && this.eventUnsubscribers.length > 0) {
        console.log('[Analisis] 🧹 Limpiando listeners previos antes de re-adjuntar...');
        this.eventUnsubscribers.forEach((unsubscriber) => {
          if (typeof unsubscriber === 'function') {
            unsubscriber();
          }
        });
        this.eventUnsubscribers = [];
      }

      // Escuchar cambios en indicadores
      this.eventUnsubscribers.push(
        eventBus?.on('indicators:indicator:added', () => {
          console.log('[Analisis] 🔄 Indicador añadido, re-renderizando...');
          this.loadIndicators();
          this.renderIndicators();
        })
      );

      this.eventUnsubscribers.push(
        eventBus?.on('indicators:indicator:deleted', () => {
          console.log('[Analisis] 🔄 Indicador eliminado, re-renderizando...');
          this.loadIndicators();
          this.renderIndicators();
        })
      );

      this.eventUnsubscribers.push(
        eventBus?.on('indicators:indicator:updated', () => {
          console.log('[Analisis] 🔄 Indicador actualizado, re-renderizando...');
          this.loadIndicators();
          this.renderIndicators();
        })
      );

      // Escuchar cambios en la decisión
      this.eventUnsubscribers.push(
        eventBus?.on('indicators:decision:changed', (data) => {
          console.log('[Analisis] 📊 Decisión cambió a:', data.decision);
          this.updateDecisionPanel(data.decision);
        })
      );

      // NOTA: El listener de profile:changed se adjunta en initialize() para que siempre esté activo
      // NO se limpia en destroy() para que continúe funcionando aunque la pestaña esté oculta

      console.log('[Analisis] ✓ Reactividad configurada');
    } catch (error) {
      console.error('[Analisis] ❌ Error configurando reactividad:', error);
    }
  }

  /**
   * Renderiza los indicadores en la lista
   */
  renderIndicators() {
    const indicatorList = this.container.querySelector('#indicator-list');
    if (!indicatorList) return;

    indicatorList.innerHTML = this.indicators.map(indicator => `
      <li class="indicator-item" data-indicator-id="${indicator.id}">
        <div class="indicator-header">
          <input type="text" class="indicator-name" value="${indicator.name}" title="Click para editar el nombre">
          <button type="button" class="indicator-delete" title="Eliminar indicador">
            <i class="bi bi-x-circle"></i>
          </button>
        </div>
        <div class="indicator-lights">
          <button type="button" class="indicator-light light-long ${indicator.longActive ? 'active' : ''}" title="Señal alcista (LONG)">
            <i class="bi bi-arrow-up"></i>
          </button>
          <input type="number" class="indicator-score" value="${indicator.longScore || 0}" min="0" max="100" title="Puntuación">
          <button type="button" class="indicator-light light-short ${indicator.shortActive ? 'active' : ''}" title="Señal bajista (SHORT)">
            <i class="bi bi-arrow-down"></i>
          </button>
        </div>
      </li>
    `).join('');
  }

  /**
   * Adjunta listeners a los indicadores usando event delegation
   */
  attachIndicatorListeners() {
    const indicatorList = this.container?.querySelector('#indicator-list');
    if (!indicatorList) return;

    // Remover listener anterior si existe
    if (this.indicatorListHandler) {
      indicatorList.removeEventListener('change', this.indicatorListHandler);
      indicatorList.removeEventListener('blur', this.indicatorListHandler);
      indicatorList.removeEventListener('keypress', this.indicatorListHandler);
      indicatorList.removeEventListener('click', this.indicatorListHandler);
    }

    // Usar event delegation para manejar todos los eventos de indicadores
    this.indicatorListHandler = (e) => {
      const item = e.target.closest('.indicator-item');
      if (!item) return;

      const indicatorId = item.dataset.indicatorId;
      const nameInput = item.querySelector('.indicator-name');
      const scoreInput = item.querySelector('.indicator-score');
      const deleteBtn = item.querySelector('.indicator-delete');
      const longLight = item.querySelector('.light-long');
      const shortLight = item.querySelector('.light-short');

      // Cambiar nombre (blur)
      if (e.type === 'blur' && e.target === nameInput) {
        indicatorsManager?.updateName(indicatorId, nameInput.value);
      }

      // Cambiar nombre (keypress Enter)
      if (e.type === 'keypress' && e.target === nameInput) {
        if (e.key === 'Enter') nameInput.blur();
      }

      // Cambiar score
      if (e.type === 'change' && e.target === scoreInput) {
        const value = parseFloat(scoreInput.value);
        indicatorsManager?.updateScore(indicatorId, 'long', value);
        indicatorsManager?.updateScore(indicatorId, 'short', value);
      }

      // Eliminar
      if (e.type === 'click' && e.target.closest('.indicator-delete')) {
        e.preventDefault();
        indicatorsManager?.delete(indicatorId);
      }

      // Toggle luces long
      if (e.type === 'click' && e.target.closest('.light-long')) {
        e.preventDefault();
        indicatorsManager?.toggleLight(indicatorId, 'long');
      }

      // Toggle luces short
      if (e.type === 'click' && e.target.closest('.light-short')) {
        e.preventDefault();
        indicatorsManager?.toggleLight(indicatorId, 'short');
      }
    };

    // Adjuntar event delegation listeners una sola vez
    indicatorList.addEventListener('change', this.indicatorListHandler);
    indicatorList.addEventListener('blur', this.indicatorListHandler, true); // Usar capture para blur
    indicatorList.addEventListener('keypress', this.indicatorListHandler);
    indicatorList.addEventListener('click', this.indicatorListHandler);
  }

  /**
   * Maneja cambio de nombre del indicador (delegado a indicatorsManager)
   */
  onIndicatorNameChanged(id, newName) {
    indicatorsManager?.updateName(id, newName);
  }

  /**
   * Maneja cambio de score del indicador (long o short) (delegado a indicatorsManager)
   */
  onIndicatorScoreChanged(id, type, newScore) {
    indicatorsManager?.updateScore(id, type, newScore);
  }

  /**
   * Alterna el estado activo (delegado a indicatorsManager)
   */
  onToggleLight(indicatorId, type) {
    indicatorsManager?.toggleLight(indicatorId, type);
  }

  /**
   * Maneja eliminación de indicador (delegado a indicatorsManager)
   */
  onDeleteIndicator(id) {
    indicatorsManager?.delete(id);
  }

  /**
   * Calcula y actualiza la decisión (delegado a indicatorsManager)
   */
  calculateDecision() {
    indicatorsManager?.calculateDecision();
    const decision = indicatorsManager?.getDecision() || 'wait';
    this.updateDecisionPanel(decision);
  }

  /**
   * Actualiza el Panel de Decisión visualmente
   */
  updateDecisionPanel(decision) {
    const buySignal = this.container.querySelector('#buy-signal');
    const waitSignal = this.container.querySelector('#wait-signal');
    const sellSignal = this.container.querySelector('#sell-signal');

    // Limpiar estados previos
    [buySignal, waitSignal, sellSignal].forEach(el => el?.classList.remove('active'));

    // Aplicar nueva decisión
    switch (decision) {
      case 'long':
        buySignal?.classList.add('active');
        console.log('[Analisis] ✅ Decisión: LONG (COMPRA)');
        break;
      case 'short':
        sellSignal?.classList.add('active');
        console.log('[Analisis] ✅ Decisión: SHORT (VENTA)');
        break;
      case 'wait':
      default:
        waitSignal?.classList.add('active');
        console.log('[Analisis] ✅ Decisión: ESPERA');
    }
  }

  /**
   * Maneja añadir nuevo indicador (delegado a indicatorsManager)
   */
  onAddIndicator() {
    const name = prompt('Nombre del nuevo indicador:');
    if (!name || name.trim() === '') {
      console.log('[Analisis] ⚠️ Indicador cancelado');
      return;
    }
    indicatorsManager?.add(name);
  }

  /**
   * Actualiza los inputs de threshold con los valores del perfil activo
   */
  updateThresholdInputs() {
    const greenThreshold = this.container?.querySelector('#green-threshold');
    const yellowThreshold = this.container?.querySelector('#yellow-threshold');
    const redThreshold = this.container?.querySelector('#red-threshold');
    const thresholds = indicatorsManager?.getThresholds() || { long: 50, short: 50, wait: 20 };

    if (greenThreshold) greenThreshold.value = thresholds.long;
    if (yellowThreshold) yellowThreshold.value = thresholds.wait;
    if (redThreshold) redThreshold.value = thresholds.short;
    
    console.log('[Analisis] ✓ Thresholds actualizados:', thresholds);
  }

  /**
   * Maneja cambio de threshold (delegado a indicatorsManager)
   */
  onThresholdChanged(type, value) {
    indicatorsManager?.setThreshold(type, value);
    this.updateDecisionPanel(indicatorsManager?.getDecision());
  }
}

// Exportar
const analisisModule = new AnalisisModule();

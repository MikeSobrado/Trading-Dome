/**
 * @file navbar.js
 * @description Módulo de barra de navegación
 * Responsabilidades:
 * - Renderizar navbar
 * - Manejar navegación entre pestañas
 * - Mostrar información de usuario/tema
 * - Responder a eventos de UI
 */

class NavbarModule {
  constructor() {
    this.container = null;
    this.currentTab = 'analisis';
    this.tabs = [
      { id: 'analisis', name: 'Análisis', icon: 'bi-graph-up' },
      { id: 'riesgo', name: 'Gestión de Riesgo', icon: 'bi-calculator' },
      { id: 'posiciones', name: 'Posiciones', icon: 'bi-pie-chart' },
      { id: 'posiciones-abiertas', name: 'Abiertas', icon: 'bi-lightning' },
      { id: 'monitoreo', name: 'Monitoreo', icon: 'bi-speedometer' },
      { id: 'apis', name: 'APIs', icon: 'bi-plug' }
    ];
    this.usefulLinks = [
      { label: 'TradingView', url: 'https://es.tradingview.com/chart/', icon: 'bi-graph-up-arrow' },
      { label: 'Fear & Greed Index', url: 'https://alternative.me/crypto/fear-and-greed-index/', icon: 'bi-emoji-frown' },
      { label: 'Bitcoin Dominance', url: 'https://coinmarketcap.com/es/charts/bitcoin-dominance/', icon: 'bi-percent' },
      { label: 'Coinglass Liquidations', url: 'https://www.coinglass.com/es/pro/futures/LiquidationHeatMap', icon: 'bi-fire' },
      { label: 'Bitget Futures', url: 'https://www.bitget.com/es/futures/usdt/BTCUSDT', icon: 'bi-lightning-fill' },
      { label: 'Soporte', url: 'mailto:wvnxzopeq@mozmail.com', icon: 'bi-life-preserver' },
      { label: 'Ayuda', url: 'docs/instrucciones.pdf', icon: 'bi-question-circle' }
    ];
  }

  /**
   * Inicializa el módulo navbar
   */
  async initialize() {
    try {
      console.log('[NavBar] 🎯 Inicializando navbar...');
      this.container = document.getElementById('navbar') || this.createNavbarContainer();
      this.render();
      this.renderLinks();
      this.attachEventListeners();
      
      // Emitir evento para que otros módulos (como themeManager) se configuren
      if (typeof eventBus !== 'undefined') {
        eventBus.emit('navbar:ready');
      }
      
      return true;
    } catch (error) {
      console.error('[NavBar] ❌ Error inicializando navbar:', error);
      return false;
    }
  }

  /**
   * Crea el contenedor del navbar si no existe
   */
  createNavbarContainer() {
    // El contenedor ya existe en el HTML
    let container = document.getElementById('navbar');
    if (!container) {
      // Si no existe, crearlo
      container = document.createElement('nav');
      container.id = 'navbar';
      container.className = 'navbar-container';
      document.body.insertBefore(container, document.body.firstChild);
    }
    console.log('[NavBar] ✓ Contenedor navbar encontrado/creado');
    return container;
  }

  /**
   * Renderiza el navbar
   */
  render() {
    this.container.innerHTML = `
      <div class="navbar-content">
        <a href="https://mikesobrado.github.io/Trading-Dome/" class="navbar-logo" title="Ir a Trading Dome">
          <img src="favicon/logo.png" alt="Trading Dome" class="logo-img">
          <span class="logo-text">Trading Dome</span>
        </a>
        
        <div class="navbar-tabs">
          ${this.tabs.map(tab => `
            <button 
              class="navbar-tab ${tab.id === this.currentTab ? 'active' : ''}"
              data-tab-id="${tab.id}"
              title="${tab.name}"
            >
              <i class="bi ${tab.icon}"></i>
              <span class="tab-name">${tab.name}</span>
            </button>
          `).join('')}
        </div>
        
        <div class="navbar-controls">
          <!-- Selector de Tema Visual -->
          <div class="theme-selector-wrapper">
            <select id="themeSelector" class="theme-selector" title="Cambiar tema visual">
              <option value="dark">Tema Emerald</option>
              <option value="light">Tema Azure</option>
              <option value="desert">Tema Safari</option>
            </select>
          </div>
          
          <!-- Toggle Modo de Fondo (Luna/Sol) -->
          <button id="themeToggle" class="control-btn" title="Cambiar modo (claro/oscuro)">
            <i class="bi bi-moon"></i>
          </button>
          <div class="navbar-dropdown">
            <button id="linksBtn" class="control-btn" title="Enlaces útiles">
              <i class="bi bi-link-45deg"></i>
            </button>
            <div class="dropdown-menu" id="linksMenu">
              <!-- Los enlaces se inyectarán aquí -->
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Adjunta event listeners
   */
  attachEventListeners() {
    // Event listeners para tabs
    this.container.querySelectorAll('.navbar-tab').forEach(btn => {
      btn.addEventListener('click', (e) => this.onTabClick(e));
    });

    // Theme selector (cambiar tema visual)
    const themeSelector = this.container.querySelector('#themeSelector');
    if (themeSelector) {
      themeSelector.addEventListener('change', (e) => {
        const selectedTheme = e.target.value;
        if (typeof themeManager !== 'undefined') {
          themeManager.setTheme(selectedTheme);
          console.log(`[NavBar] 🎨 Tema cambiado a: ${selectedTheme}`);
        }
      });
      // Cargar tema guardado en el selector
      if (typeof themeManager !== 'undefined') {
        themeSelector.value = themeManager.currentTheme;
      }
    }

    // Theme toggle es manejado por themeManager
    // (no agregamos listener aquí)

    // Links dropdown - con mejor manejo de eventos
    const linksBtn = this.container.querySelector('#linksBtn');
    const linksMenu = this.container.querySelector('#linksMenu');
    
    console.log('[NavBar] 🔗 linksBtn:', linksBtn);
    console.log('[NavBar] 🔗 linksMenu:', linksMenu);
    
    if (linksBtn && linksMenu) {
      // Abrir/cerrar dropdown al hacer click en el botón
      linksBtn.addEventListener('click', (e) => {
        console.log('[NavBar] 🔗 Click en linksBtn');
        e.stopPropagation();
        const isActive = linksMenu.classList.contains('active');
        console.log('[NavBar] 🔗 Estado actual:', isActive ? 'ABIERTO' : 'CERRADO');
        
        linksMenu.classList.toggle('active');
        console.log('[NavBar] 🔗 Nuevo estado:', linksMenu.classList.contains('active') ? 'ABIERTO' : 'CERRADO');
      });

      // Cerrar dropdown al hacer click fuera
      document.addEventListener('click', (e) => {
        if (!linksBtn.contains(e.target) && !linksMenu.contains(e.target)) {
          linksMenu.classList.remove('active');
        }
      });

      // Evitar que los clicks dentro del menú cierren el dropdown
      linksMenu.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    } else {
      console.warn('[NavBar] ⚠️ No se encontraron los elementos del dropdown');
    }
  }

  /**
   * Maneja click en tab
   */
  onTabClick(event) {
    const tabId = event.currentTarget.dataset.tabId;
    if (tabId && tabId !== this.currentTab) {
      this.selectTab(tabId);
    }
  }

  /**
   * Selecciona una tab
   */
  selectTab(tabId) {
    console.log(`[NavBar] 📍 Seleccionando tab: ${tabId}`);
    
    // Actualizar estado visual
    this.container.querySelectorAll('.navbar-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tabId === tabId);
    });
    
    this.currentTab = tabId;
    
    // Emitir evento
    eventBus?.emit('tab:changed', { tabId });
  }

  /**
   * Maneja toggle de tema
   */
  onThemeToggle() {
    console.log('[NavBar] 🌙 Cambiando tema...');
    if (typeof themeManager !== 'undefined') {
      themeManager.toggleTheme();
    }
    eventBus?.emit('theme:toggle');
  }

  /**
   * Renderiza los enlaces útiles en el dropdown
   */
  renderLinks() {
    const linksMenu = document.getElementById('linksMenu');
    if (!linksMenu) {
      console.warn('[NavBar] ⚠️ No se encontró #linksMenu');
      return;
    }

    const html = this.usefulLinks.map(link => `
      <a href="${link.url}" target="_blank" rel="noopener noreferrer" title="${link.label}">
        <i class="bi ${link.icon}"></i>
        <span>${link.label}</span>
      </a>
    `).join('');

    linksMenu.innerHTML = html;
    console.log('[NavBar] 🔗 Enlaces renderizados:', this.usefulLinks.length);
    console.log('[NavBar] 🔗 Contenido HTML:', linksMenu.innerHTML);
    console.log('[NavBar] 🔗 Height:', linksMenu.offsetHeight);
    console.log('[NavBar] 🔗 Children count:', linksMenu.children.length);
  }

  /**
   * Obtiene la tab actualmente seleccionada
   */
  getCurrentTab() {
    return this.currentTab;
  }
}

// Exportar
const navbarModule = new NavbarModule();



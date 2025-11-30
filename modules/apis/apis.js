/**
 * @file apis.js
 * @description Módulo de configuración de APIs
 * Responsabilidades:
 * - Gestionar credenciales de Bitget
 * - Validar conexión con APIs
 * - Mostrar formulario de configuración
 */

class ApisModule {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.rendered = false;
    this.apiConfigManager = null;
    this.bitgetConnector = null;
    this.eventUnsubscribers = [];
    this.tabChangeUnsubscriber = null; // Unsubscriber del evento tab:changed (NO se limpia en destroy)
    this.domListenersAttached = false; // Flag para evitar re-adjuntar listeners de DOM
  }

  /**
   * Inicializa el módulo
   */
  async initialize() {
    try {
      console.log('[Apis] 🔐 Inicializando módulo APIs...');
      
      // Crear contenedor
      this.container = document.getElementById('apisTab') || this.createContainer();
      
      // Inicializar gestores
      this.apiConfigManager = new ApiConfigManager();
      this.bitgetConnector = new BitgetConnector(this.apiConfigManager);
      
      // Exponer a window para que otros módulos puedan usarlo
      window.bitgetConnector = this.bitgetConnector;
      window.apiConfigManager = this.apiConfigManager;
      
      // Suscribirse a evento tab:changed (NUNCA se limpia)
      this.tabChangeUnsubscriber = eventBus?.on('tab:changed', (data) => this.onTabChanged(data));
      
      return true;
    } catch (error) {
      console.error('[Apis] ❌ Error inicializando:', error);
      errorHandler?.handleError('APIS_INIT_ERROR', error);
      return false;
    }
  }

  /**
   * Crea el contenedor
   */
  createContainer() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      console.error('[Apis] ❌ No se encontró #main-content en el DOM');
      throw new Error('main-content not found');
    }
    
    const container = document.createElement('div');
    container.id = 'apisTab';
    container.className = 'tab-content apis-tab';
    mainContent.appendChild(container);
    console.log('[Apis] ✓ Contenedor creado y añadido al DOM');
    return container;
  }

  /**
   * Maneja cambio de tab
   */
  onTabChanged(data) {
    if (data.tabId === 'apis') {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Muestra el contenido
   */
  show() {
    console.log('[Apis] 👁️ Mostrando tab APIs');
    this.isVisible = true;
    this.container.style.display = 'block';
    this.container.classList.add('active');
    
    // Solo renderizar la primera vez
    if (!this.rendered) {
      console.log('[Apis] ✓ Primera vez renderizando...');
      this.render();
      this.attachEventListeners();
      this.updateStatus();
      this.rendered = true;
    } else {
      console.log('[Apis] ⚠️ Ya fue renderizado, re-adjuntando listeners...');
      // Re-adjuntar listeners porque fueron eliminados en destroy()
      this.attachEventListeners();
      this.updateStatus();
    }
  }

  /**
   * Oculta el contenido
   */
  hide() {
    console.log('[Apis] 👁️ Ocultando tab APIs');
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
      console.log('[Apis] 🧹 Limpiando listeners...');
      
      // Limpiar solo listeners que NO son tab:changed
      // NO limpiar tabChangeUnsubscriber para que siga escuchando tab:changed
      if (this.eventUnsubscribers && this.eventUnsubscribers.length > 0) {
        this.eventUnsubscribers.forEach((unsubscriber) => {
          if (typeof unsubscriber === 'function') {
            unsubscriber();
          }
        });
        console.log(`[Apis] ✓ ${this.eventUnsubscribers.length} listeners eliminados`);
        this.eventUnsubscribers = [];
      }
    } catch (error) {
      console.error('[Apis] ❌ Error limpiando listeners:', error);
    }
  }

  /**
   * Renderiza el contenido
   */
  render() {
    try {
      console.log('[Apis] 🎨 Iniciando render del contenido...');
      
      const bitgetConfig = this.apiConfigManager?.getCredentials('bitget') || {};
      
      this.container.innerHTML = `
      <div class="apis-container">
        
        <!-- Encabezado -->
        <div class="apis-header">
          <h2>
            <i class="bi bi-key me-2"></i>
            Configuración de APIs
          </h2>
          <p class="text-muted">Gestiona tus credenciales de APIs de forma segura</p>
        </div>

        <!-- Card de Bitget -->
        <div class="api-card bitget-card">
          <div class="card-header">
            <div class="provider-info">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23FF6600'/%3E%3C/svg%3E" alt="Bitget" class="provider-icon">
              <div>
                <h4 class="mb-0">Bitget Exchange</h4>
                <span class="provider-subtitle">Trading API v2</span>
              </div>
            </div>
            <div class="connection-status" id="connection-status">
              <span class="status-indicator disconnected"></span>
              <span class="status-text">No configurado</span>
            </div>
          </div>

          <div class="card-body">
            <!-- Selector de Modo de Trading -->
            <div class="trading-mode-selector" style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <label class="form-label">
                <i class="bi bi-toggles me-1"></i>
                Modo de Trading
              </label>
              <div class="btn-group w-100" role="group">
                <input type="radio" class="btn-check" name="trading-mode" id="trading-mode-live" value="live" ${bitgetConfig.tradingMode === 'demo' ? '' : 'checked'}>
                <label class="btn btn-outline-info" for="trading-mode-live">
                  <i class="bi bi-lightning-fill me-2"></i>
                  Trading Real
                </label>
                
                <input type="radio" class="btn-check" name="trading-mode" id="trading-mode-demo" value="demo" ${bitgetConfig.tradingMode === 'demo' ? 'checked' : ''}>
                <label class="btn btn-outline-warning" for="trading-mode-demo">
                  <i class="bi bi-beaker me-2"></i>
                  Paper Trading (Demo)
                </label>
              </div>
              <small class="form-text text-white d-block mt-2">
                Las claves de API son distintas en las cuentas de Trading Real y Paper Trading. Descarga las tuyas y selecciona el modo correcto.
              </small>
            </div>

            <!-- Formulario de credenciales -->
            <div class="credentials-form">
              
              <!-- API Key -->
              <div class="form-group">
                <label for="bitget-api-key" class="form-label">
                  <i class="bi bi-key-fill me-1"></i>
                  API Key
                </label>
                <div class="input-wrapper">
                  <input 
                    type="password" 
                    id="bitget-api-key" 
                    class="form-control api-credential"
                    placeholder="Ingresa tu API Key de Bitget"
                    value="${bitgetConfig.apiKey || ''}"
                  >
                  <button type="button" class="btn-toggle-visibility" title="Mostrar/Ocultar">
                    <i class="bi bi-eye"></i>
                  </button>
                </div>
                <small class="form-text text-white">
                  Obtén tu API Key en <a href="https://www.bitget.com" target="_blank">bitget.com</a>
                </small>
              </div>

              <!-- Secret Key -->
              <div class="form-group">
                <label for="bitget-secret-key" class="form-label">
                  <i class="bi bi-shield-lock-fill me-1"></i>
                  Secret Key
                </label>
                <div class="input-wrapper">
                  <input 
                    type="password" 
                    id="bitget-secret-key" 
                    class="form-control api-credential"
                    placeholder="Ingresa tu Secret Key de Bitget"
                    value="${bitgetConfig.secretKey || ''}"
                  >
                  <button type="button" class="btn-toggle-visibility" title="Mostrar/Ocultar">
                    <i class="bi bi-eye"></i>
                  </button>
                </div>
              </div>

              <!-- Passphrase -->
              <div class="form-group">
                <label for="bitget-passphrase" class="form-label">
                  <i class="bi bi-lock-fill me-1"></i>
                  Passphrase
                </label>
                <div class="input-wrapper">
                  <input 
                    type="password" 
                    id="bitget-passphrase" 
                    class="form-control api-credential"
                    placeholder="Ingresa tu Passphrase de Bitget"
                    value="${bitgetConfig.passphrase || ''}"
                  >
                  <button type="button" class="btn-toggle-visibility" title="Mostrar/Ocultar">
                    <i class="bi bi-eye"></i>
                  </button>
                </div>
              </div>

            </div>

            <!-- Botones de acción -->
            <div class="form-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-start; width: fit-content;">
              <button type="button" class="btn btn-primary btn-sm" id="test-connection-btn" style="white-space: nowrap; padding: 0.375rem 0.75rem;">
                <i class="bi bi-plug me-2"></i>
                Conectar
              </button>
              <button type="button" class="btn btn-info btn-sm" id="export-credentials-btn" style="white-space: nowrap; padding: 0.375rem 0.75rem;">
                <i class="bi bi-download me-2"></i>
                Exportar Llave
              </button>
              <button type="button" class="btn btn-info btn-sm" id="import-credentials-btn" style="white-space: nowrap; padding: 0.375rem 0.75rem;">
                <i class="bi bi-upload me-2"></i>
                Importar Llave
              </button>
              <button type="button" class="btn btn-outline-danger btn-sm" id="delete-credentials-btn" style="white-space: nowrap; padding: 0.375rem 0.75rem;">
                <i class="bi bi-trash me-2"></i>
                Eliminar
              </button>
            </div>

            <!-- Estado de conexión detallado -->
            <div class="connection-details" id="connection-details" style="display: none;">
              <div class="detail-item">
                <span class="detail-label">Estado de Conexión:</span>
                <span class="detail-value" id="connection-state">—</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Cuenta ID:</span>
                <span class="detail-value" id="account-id">—</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Última Actualización:</span>
                <span class="detail-value" id="last-updated">—</span>
              </div>
            </div>

          </div>
        </div>

        <!-- Información de seguridad -->
        <div class="security-info">
          <div class="alert alert-info">
            <h5>
              <i class="bi bi-shield-check me-2"></i>
              Información de Seguridad
            </h5>
            <ul>
              <li><strong>Encriptación:</strong> Las credenciales se encriptan con AES-256</li>
              <li><strong>Almacenamiento:</strong> Se guardan únicamente en tu navegador</li>
              <li><strong>Privacidad:</strong> Se eliminan automáticamente al cerrar la página</li>
              <li><strong>Seguridad:</strong> Nunca se envían a servidores terceros</li>
              <li><strong>Uso:</strong> Solo se utilizan para llamadas autenticadas a Bitget API</li>
              <li><strong>Recomendación:</strong> Crea una cuenta API con permisos de solo lectura</li>
            </ul>
          </div>
        </div>

      </div>
    `;
      
      console.log('[Apis] ✓ Contenido renderizado en el DOM');
    } catch (error) {
      console.error('[Apis] ❌ Error durante render:', error);
      errorHandler?.handleError('APIS_RENDER_ERROR', error);
    }
  }

  /**
   * Adjunta event listeners
   */
  attachEventListeners() {
    try {
      // Solo adjuntar listeners de DOM una sola vez
      if (this.domListenersAttached) {
        console.log('[Apis] ⚠️ Listeners de DOM ya están adjuntados, saltando...');
        return;
      }

      // Toggle visibility de inputs
      const toggleButtons = this.container.querySelectorAll('.btn-toggle-visibility');
      toggleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const input = btn.previousElementSibling;
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          btn.querySelector('i').className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
        });
      });

      // Botón probar conexión
      const testBtn = this.container.querySelector('#test-connection-btn');
      if (testBtn) {
        testBtn.addEventListener('click', () => this.onTestConnection());
      }

      // Selector de modo de trading
      const tradingModeRadios = this.container.querySelectorAll('input[name="trading-mode"]');
      tradingModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          const mode = e.target.value;
          this.apiConfigManager?.setTradingMode('bitget', mode);
          console.log(`[Apis] 🔄 Modo de trading cambiado a: ${mode}`);
        });
      });

      this.domListenersAttached = true;

      // Botón eliminar credenciales
      const deleteBtn = this.container.querySelector('#delete-credentials-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => this.onDeleteCredentials());
      }

      // Botón exportar credenciales
      const exportBtn = this.container.querySelector('#export-credentials-btn');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => this.onExportCredentials());
      }

      // Botón importar credenciales
      const importBtn = this.container.querySelector('#import-credentials-btn');
      if (importBtn) {
        importBtn.addEventListener('click', () => this.onImportCredentials());
      }

      console.log('[Apis] ✓ Event listeners adjuntados');
    } catch (error) {
      console.error('[Apis] ❌ Error adjuntando listeners:', error);
    }
  }

  /**
   * Actualiza el estado de conexión en la UI
   */
  updateStatus() {
    try {
      const config = this.apiConfigManager?.getCredentials('bitget') || {};
      const statusElement = this.container?.querySelector('#connection-status');
      const detailsElement = this.container?.querySelector('#connection-details');
      
      if (!statusElement) return;

      const isConnected = config.isConnected;
      const indicator = statusElement.querySelector('.status-indicator');
      const text = statusElement.querySelector('.status-text');

      if (isConnected) {
        indicator.classList.remove('disconnected');
        indicator.classList.add('connected');
        text.textContent = 'Conectado';
        
        if (detailsElement) {
          detailsElement.style.display = 'block';
          this.container.querySelector('#connection-state').textContent = '✅ Activa';
          this.container.querySelector('#account-id').textContent = config.accountId || '—';
          this.container.querySelector('#last-updated').textContent = 
            new Date(config.lastChecked).toLocaleString() || '—';
        }
      } else {
        indicator.classList.add('disconnected');
        indicator.classList.remove('connected');
        text.textContent = 'No configurado';
        
        if (detailsElement) {
          detailsElement.style.display = 'none';
        }
      }

      console.log('[Apis] ✓ Estado actualizado');
    } catch (error) {
      console.error('[Apis] ❌ Error actualizando estado:', error);
    }
  }

  /**
   * Maneja probar conexión
   */
  async onTestConnection() {
    try {
      // Obtener valores y limpiar espacios en blanco
      const apiKey = this.container?.querySelector('#bitget-api-key').value?.trim();
      const secretKey = this.container?.querySelector('#bitget-secret-key').value?.trim();
      const passphrase = this.container?.querySelector('#bitget-passphrase').value?.trim();

      console.log('[ApisModule] 🔍 Validando credenciales:');
      console.log(`  - API Key vacía: ${!apiKey}`);
      console.log(`  - Secret Key vacía: ${!secretKey}`);
      console.log(`  - Passphrase vacío: ${!passphrase}`);
      console.log(`  - API Key length: ${apiKey?.length || 0}`);
      console.log(`  - Secret Key length: ${secretKey?.length || 0}`);
      console.log(`  - Passphrase length: ${passphrase?.length || 0}`);

      if (!apiKey || !secretKey || !passphrase) {
        alert('⚠️ Por favor ingresa todas las credenciales');
        return;
      }

      const testBtn = this.container?.querySelector('#test-connection-btn');
      if (testBtn) {
        testBtn.disabled = true;
        testBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Conectando...';
      }

      // Crear connector temporal para test
      const testConnector = new BitgetConnector(this.apiConfigManager);
      const result = await testConnector.testConnection(apiKey, secretKey, passphrase);

      if (result.success) {
        alert(`✅ ¡Conexión exitosa!\nCuenta: ${result.accountId}`);
        
        // Obtener modo de trading actual
        const currentTradingMode = this.apiConfigManager.getTradingMode('bitget');
        
        // Guardar credenciales válidas CON el modo de trading actual
        this.apiConfigManager.setCredentials('bitget', apiKey, secretKey, passphrase, result.accountId, currentTradingMode);
        
        // Cargar posiciones cerradas y abiertas automáticamente
        this.loadAndCacheClosedPositions();
        this.loadAndCacheOpenPositions();
        
        this.updateStatus();
      } else {
        alert(`❌ Error en la conexión:\n${result.error}`);
      }

    } catch (error) {
      console.error('[Apis] Error probando conexión:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      const testBtn = this.container?.querySelector('#test-connection-btn');
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.innerHTML = '<i class="bi bi-plug me-2"></i>Conectar';
      }
    }
  }

  /**
   * Carga posiciones cerradas y las guarda en sessionStorage
   */
  async loadAndCacheClosedPositions() {
    try {
      console.log('[Apis] 📊 Cargando posiciones cerradas para cachear...');
      const positions = await this.bitgetConnector.getClosedPositions({ limit: 100 });

      if (positions && positions.length > 0) {
        // Guardar en sessionStorage
        sessionStorage.setItem('bitget_closed_positions', JSON.stringify({
          data: positions,
          timestamp: Date.now()
        }));

        console.log(`[Apis] ✅ ${positions.length} posiciones cerradas cacheadas en sessionStorage`);
        // Emitir evento con los datos incluidos
        eventBus?.emit('bitget:closed-positions:cached', { count: positions.length, data: positions });
      } else {
        console.log('[Apis] ℹ️ No hay posiciones cerradas para cachear');
      }
    } catch (error) {
      console.error('[Apis] ⚠️ Error cacheando posiciones cerradas:', error);
      // No interrumpir el flujo si falla - solo log
    }
  }

  /**
   * Carga posiciones abiertas y emite evento para notificar a otros módulos
   */
  async loadAndCacheOpenPositions() {
    try {
      console.log('[Apis] 📊 Cargando posiciones abiertas para cachear...');
      const positions = await this.bitgetConnector.getOpenPositions();

      if (positions && positions.length > 0) {
        // Guardar en sessionStorage
        sessionStorage.setItem('bitget_open_positions', JSON.stringify({
          data: positions,
          timestamp: Date.now()
        }));

        console.log(`[Apis] ✅ ${positions.length} posiciones abiertas cacheadas en sessionStorage`);
        // Emitir evento con los datos incluidos
        eventBus?.emit('bitget:open-positions:cached', { count: positions.length, data: positions });
      } else {
        console.log('[Apis] ℹ️ No hay posiciones abiertas para cachear');
      }
    } catch (error) {
      console.error('[Apis] ⚠️ Error cacheando posiciones abiertas:', error);
      // No interrumpir el flujo si falla - solo log
    }
  }

  /**
   * Maneja eliminar credenciales
   */
  onDeleteCredentials() {
    try {
      if (!confirm('⚠️ ¿Estás seguro de que deseas eliminar las credenciales? Esta acción no se puede deshacer.')) {
        return;
      }

      this.apiConfigManager.removeCredentials('bitget');
      
      // Limpiar inputs
      this.container.querySelector('#bitget-api-key').value = '';
      this.container.querySelector('#bitget-secret-key').value = '';
      this.container.querySelector('#bitget-passphrase').value = '';
      
      // Limpiar todos los datos de sessionStorage relacionados con Bitget
      sessionStorage.removeItem('bitget_open_positions');
      sessionStorage.removeItem('bitget_closed_positions');
      sessionStorage.removeItem('bitget_closed_positions_data');
      
      // Limpiar el caché global si existe
      if (typeof positionsCache !== 'undefined' && positionsCache) {
        positionsCache.clear();
        console.log('[Apis] 🧹 Caché global de posiciones limpiado');
      }
      
      // Emitir eventos para que otros módulos limpien sus datos
      eventBus?.emit('bitget:closed-positions:cached', { count: 0, data: [] });
      eventBus?.emit('bitget:open-positions:cached', { count: 0, data: [] });
      eventBus?.emit('apis:credentials:removed', { provider: 'bitget' });
      
      alert('✅ Credenciales y datos eliminados correctamente');
      this.updateStatus();

    } catch (error) {
      console.error('[Apis] Error eliminando credenciales:', error);
      alert(`❌ Error: ${error.message}`);
    }
  }

  /**
   * Maneja exportar credenciales a archivo cifrado
   */
  async onExportCredentials() {
    try {
      // Verificar que CryptoManager esté disponible e inicializado
      if (typeof cryptoManager === 'undefined') {
        alert('❌ Error: Gestor de criptografía no disponible');
        return;
      }

      // Inicializar si aún no está
      if (!cryptoManager.initialized) {
        console.log('[Apis] ⏳ Inicializando gestor de criptografía...');
        await cryptoManager.initialize();
      }

      // Obtener credenciales actuales del formulario
      const credentials = {
        bitget: {
          apiKey: this.container.querySelector('#bitget-api-key').value,
          secretKey: this.container.querySelector('#bitget-secret-key').value,
          passphrase: this.container.querySelector('#bitget-passphrase').value
        }
      };

      if (!credentials.bitget.apiKey || !credentials.bitget.secretKey) {
        alert('⚠️ Por favor completa todos los campos antes de exportar');
        return;
      }

      // Solicitar contraseña
      const password = await cryptoManager.promptPassword(
        '🔐 Ingresa una contraseña para proteger tus credenciales:'
      );
      
      if (!password) {
        console.log('[Apis] ℹ️ Exportación cancelada');
        return;
      }

      // Exportar con contraseña
      const fileData = cryptoManager.exportCredentials(credentials, password);
      cryptoManager.downloadFile(fileData, 'Llave Segura.json');

      alert('✅ Credenciales exportadas correctamente');
      console.log('[Apis] ✓ Archivo descargado');
      eventBus?.emit('apis:credentials:exported', { provider: 'bitget' });

    } catch (error) {
      console.error('[Apis] ❌ Error exportando credenciales:', error);
      alert(`❌ Error al exportar: ${error.message}`);
    }
  }

  /**
   * Maneja importar credenciales desde archivo cifrado
   */
  async onImportCredentials() {
    try {
      // Verificar que CryptoManager esté disponible e inicializado
      if (typeof cryptoManager === 'undefined') {
        alert('❌ Error: Gestor de criptografía no disponible');
        return;
      }

      // Inicializar si aún no está
      if (!cryptoManager.initialized) {
        console.log('[Apis] ⏳ Inicializando gestor de criptografía...');
        await cryptoManager.initialize();
      }

      // Cargar archivo
      const fileData = await cryptoManager.uploadFile();

      if (!fileData || !fileData.encrypted) {
        alert('❌ Archivo inválido. Por favor selecciona un archivo de "Llave Segura"');
        return;
      }

      // Solicitar contraseña
      const password = await cryptoManager.promptPassword(
        '🔐 Ingresa la contraseña para descifrar tus credenciales:'
      );
      
      if (!password) {
        console.log('[Apis] ℹ️ Importación cancelada');
        return;
      }

      // Desencriptar credenciales
      const credentials = cryptoManager.importCredentials(fileData, password);

      if (!credentials.bitget) {
        alert('❌ El archivo no contiene credenciales válidas de Bitget');
        return;
      }

      // Poblar campos con credenciales importadas
      const bitgetCreds = credentials.bitget;
      this.container.querySelector('#bitget-api-key').value = bitgetCreds.apiKey || '';
      this.container.querySelector('#bitget-secret-key').value = bitgetCreds.secretKey || '';
      this.container.querySelector('#bitget-passphrase').value = bitgetCreds.passphrase || '';

      alert('✅ Credenciales importadas correctamente');
      console.log('[Apis] ✓ Credenciales cargadas desde archivo');
      this.updateStatus();
      eventBus?.emit('apis:credentials:imported', { provider: 'bitget' });

    } catch (error) {
      console.error('[Apis] ❌ Error importando credenciales:', error);
      alert(`❌ Error al importar: ${error.message}`);
    }
  }
}

// Exportar
const apisModule = new ApisModule();

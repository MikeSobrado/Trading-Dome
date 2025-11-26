/**
 * @file profile-widget.js
 * @description Widget de gestión de perfiles para la pestaña Análisis
 * Responsabilidades:
 * - Renderizar interfaz de perfiles
 * - Manejar navegación entre perfiles
 * - Gestionar agregar/renombrar/eliminar perfiles
 * - Sincronizar con profileManager
 */

class ProfileWidget {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
  }

  /**
   * Inicializa el widget
   */
  initialize() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.warn(`[ProfileWidget] ⚠️ Contenedor ${this.containerId} no encontrado`);
      return false;
    }

    console.log(`[ProfileWidget] 🎯 Inicializando widget en ${this.containerId}...`);
    this.render();
    this.attachEventListeners();
    
    // Escuchar cambios de perfil
    eventBus?.on('profile:changed', () => this.updateDisplay());
    
    return true;
  }

  /**
   * Renderiza el widget
   */
  render() {
    if (!this.container) return;

    const profileCount = Object.keys(profileManager?.profiles || {}).length;
    const profileName = profileManager?.getActiveProfileName() || 'Sin perfil activo';

    // Si no hay perfiles, mostrar mensaje de bienvenida
    if (profileCount === 0) {
      this.container.innerHTML = `
        <div class="profile-widget-content">
          <div class="profile-empty-state">
            <p class="text-muted">
              <i class="bi bi-inbox me-2"></i>
              No hay perfiles. Crea uno nuevo o importa desde archivo.
            </p>
            <div class="profile-actions-group">
              <button id="profile-add-btn" class="profile-action-btn" title="Crear nuevo perfil">
                <i class="bi bi-plus-circle"></i>
              </button>
              <button id="profile-load-btn" class="profile-action-btn" title="Importar perfil">
                <i class="bi bi-upload"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      // Si hay perfiles, mostrar navegación normal
      this.container.innerHTML = `
        <div class="profile-widget-content">
          <div class="profile-widget-row">
            <!-- Navegación de perfiles -->
            <div class="profile-nav-group">
              <button id="profile-prev-btn" class="profile-nav-btn" title="Perfil anterior">
                <i class="bi bi-chevron-left"></i>
              </button>
              <span id="current-profile-name" class="profile-badge">${profileName}</span>
              <button id="profile-next-btn" class="profile-nav-btn" title="Perfil siguiente">
                <i class="bi bi-chevron-right"></i>
              </button>
            </div>

            <!-- Botones de gestión -->
            <div class="profile-actions-group">
              <button id="profile-add-btn" class="profile-action-btn" title="Agregar perfil">
                <i class="bi bi-plus-circle"></i>
              </button>
              <button id="profile-rename-btn" class="profile-action-btn" title="Renombrar perfil">
                <i class="bi bi-pencil"></i>
              </button>
              <button id="profile-delete-btn" class="profile-action-btn" title="Eliminar perfil">
                <i class="bi bi-trash"></i>
              </button>
              <button id="profile-save-btn" class="profile-action-btn" title="Guardar perfil">
                <i class="bi bi-download"></i>
              </button>
              <button id="profile-load-btn" class="profile-action-btn" title="Cargar perfil">
                <i class="bi bi-upload"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Adjunta event listeners
   */
  attachEventListeners() {
    if (!this.container) return;

    // Navegación
    const prevBtn = this.container.querySelector('#profile-prev-btn');
    const nextBtn = this.container.querySelector('#profile-next-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        profileManager?.previousProfile();
        this.updateDisplay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        profileManager?.nextProfile();
        this.updateDisplay();
      });
    }

    // Acciones
    const addBtn = this.container.querySelector('#profile-add-btn');
    const renameBtn = this.container.querySelector('#profile-rename-btn');
    const deleteBtn = this.container.querySelector('#profile-delete-btn');
    const saveBtn = this.container.querySelector('#profile-save-btn');
    const loadBtn = this.container.querySelector('#profile-load-btn');

    if (addBtn) {
      addBtn.addEventListener('click', () => this.onAddProfile());
    }

    if (renameBtn) {
      renameBtn.addEventListener('click', () => this.onRenameProfile());
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.onDeleteProfile());
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.onSaveProfile());
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.onLoadProfile());
    }
  }

  /**
   * Actualiza la visualización del widget
   */
  updateDisplay() {
    // Si cambió el número de perfiles (de 0 a 1+ o viceversa), re-renderizar completamente
    const profileCount = Object.keys(profileManager?.profiles || {}).length;
    const isEmptyState = this.container?.querySelector('.profile-empty-state') !== null;
    
    if ((profileCount === 0 && !isEmptyState) || (profileCount > 0 && isEmptyState)) {
      this.render();
      this.attachEventListeners();
    } else if (profileCount > 0) {
      // Solo actualizar el nombre si hay perfiles
      const nameElement = this.container?.querySelector('#current-profile-name');
      if (nameElement) {
        nameElement.textContent = profileManager?.getActiveProfileName() || 'Desconocido';
      }
    }
  }

  /**
   * Maneja agregar perfil
   */
  onAddProfile() {
    const name = prompt('Nombre del nuevo perfil (ej: Bitcoin, Ethereum):');
    if (!name || !name.trim()) {
      console.log('[ProfileWidget] ⚠️ Creación de perfil cancelada');
      return;
    }

    const profileId = name.toLowerCase().replace(/\s+/g, '-');
    const icon = '📊'; // Icono por defecto

    const created = profileManager?.createProfile(profileId, name.trim(), icon || '📊');
    
    if (created) {
      // Si es el primer perfil, establecerlo como activo
      if (!profileManager.activeProfile) {
        profileManager.setActiveProfile(profileId);
      }
      
      console.log(`[ProfileWidget] ✓ Perfil "${name}" creado`);
      this.updateDisplay();
      
      // Emitir evento de cambio
      eventBus?.emit('profile:changed', { 
        profileId, 
        profileName: name.trim() 
      });
    } else {
      alert('Error: Este perfil ya existe');
    }
  }

  /**
   * Maneja renombrar perfil
   */
  onRenameProfile() {
    const currentName = profileManager?.getActiveProfileName();
    const newName = prompt(`Nuevo nombre para "${currentName}":`, currentName);
    
    if (!newName || !newName.trim() || newName === currentName) return;

    profileManager.profiles[profileManager.activeProfile].name = newName.trim();

    stateManager?.setState({
      profiles: {
        activeProfile: profileManager.activeProfile,
        list: profileManager.profiles
      }
    });

    console.log(`[ProfileWidget] ✓ Perfil renombrado a "${newName}"`);
    this.updateDisplay();
  }

  /**
   * Maneja eliminar perfil
   */
  onDeleteProfile() {
    const profileIds = Object.keys(profileManager.profiles);
    const confirmed = confirm(`¿Eliminar perfil "${profileManager.getActiveProfileName()}"?`);
    if (!confirmed) return;

    const currentProfileId = profileManager.activeProfile;
    
    // Eliminar perfil
    delete profileManager.profiles[currentProfileId];

    // Si hay más perfiles, cambiar a otro
    const remainingIds = Object.keys(profileManager.profiles);
    if (remainingIds.length > 0) {
      const newActiveProfile = remainingIds[0];
      profileManager.setActiveProfile(newActiveProfile);
    } else {
      // Si no hay más perfiles, volver al estado vacío
      profileManager.activeProfile = null;
      stateManager?.setState({
        profiles: {
          activeProfile: null,
          list: {}
        }
      });
    }

    console.log(`[ProfileWidget] ✓ Perfil eliminado`);
    this.updateDisplay();
  }

  /**
   * Guarda el perfil actual como archivo JSON
   */
  /**
   * Guarda el perfil actual en un archivo JSON
   * Incluye: indicadores, thresholds, y parámetros de riesgo
   */
  onSaveProfile() {
    if (typeof profileExportImport !== 'undefined') {
      profileExportImport.exportProfile();
    } else {
      console.error('[ProfileWidget] ❌ profileExportImport no disponible');
      alert('Error: módulo de exportación no disponible');
    }
  }

  /**
   * Carga un perfil desde archivo JSON
   * Restaura: indicadores, thresholds, y parámetros de riesgo
   */
  onLoadProfile() {
    if (typeof profileExportImport !== 'undefined') {
      profileExportImport.importProfile();
    } else {
      console.error('[ProfileWidget] ❌ profileExportImport no disponible');
      alert('Error: módulo de importación no disponible');
    }
  }

  /**
   * Destruye el widget
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Instancia global para Análisis
const profileWidget = new ProfileWidget('profiles-widget-analisis');

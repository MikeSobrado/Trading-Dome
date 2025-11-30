/**
 * @file profile-manager.js
 * @description Gestor de perfiles de trading
 * Responsabilidades:
 * - Gestionar perfiles (Bitcoin, Ethereum, etc)
 * - Sincronizar cambios entre pestañas
 * - Persistir datos en stateManager
 * - Emitir eventos al cambiar perfil
 */

class ProfileManager {
  constructor() {
    this.activeProfile = null;
    this.profiles = {};
  }

  /**
   * Inicializa el gestor de perfiles
   */
  initialize() {
    console.log('[ProfileManager] 🎯 Inicializando gestor de perfiles...');
    this.loadFromLocalStorage();
    this.loadFromStateManager();
    
    // Auto-crear perfil por defecto si no hay ninguno
    if (Object.keys(this.profiles).length === 0) {
      console.log('[ProfileManager] ⚠️ No hay perfiles, creando perfil por defecto...');
      this.createDefaultProfile();
    }
  }

  /**
   * Carga perfiles del localStorage
   */
  loadFromLocalStorage() {
    try {
      const savedProfiles = localStorage.getItem('trading_dome_profiles');
      const savedActiveProfile = localStorage.getItem('trading_dome_active_profile');
      
      if (savedProfiles) {
        this.profiles = JSON.parse(savedProfiles);
        this.activeProfile = savedActiveProfile || 'bitcoin';
        console.log(`[ProfileManager] ✓ ${Object.keys(this.profiles).length} perfiles cargados desde localStorage`);
        return true;
      }
    } catch (error) {
      console.error('[ProfileManager] ❌ Error cargando de localStorage:', error);
    }
    return false;
  }

  /**
   * Carga perfiles del stateManager
   */
  loadFromStateManager() {
    const state = stateManager?.getState();
    if (state?.profiles) {
      this.profiles = state.profiles.list || this.profiles;
      this.activeProfile = state.profiles.activeProfile || this.activeProfile || 'bitcoin';
      console.log('[ProfileManager] ✓ Perfiles sincronizados desde stateManager');
    }
  }

  /**
   * Crea un perfil por defecto
   * @private
   */
  createDefaultProfile() {
    const defaultProfileId = 'bitcoin';
    const defaultProfile = {
      id: defaultProfileId,
      name: 'Bitcoin',
      icon: '📊',
      indicators: [],
      thresholds: {
        long: 40,
        short: 40
      },
      risk: {}
    };

    this.profiles[defaultProfileId] = defaultProfile;
    this.activeProfile = defaultProfileId;

    // Persistir
    stateManager?.setState({
      profiles: {
        activeProfile: defaultProfileId,
        list: this.profiles
      }
    });

    console.log('[ProfileManager] ✓ Perfil por defecto "Bitcoin" creado');
  }

  /**
   * Obtiene el perfil activo
   */
  getActiveProfile() {
    return this.profiles[this.activeProfile];
  }

  /**
   * Obtiene el nombre del perfil activo
   */
  getActiveProfileName() {
    return this.profiles[this.activeProfile]?.name || 'Desconocido';
  }

  /**
   * Obtiene todos los perfiles
   */
  getAllProfiles() {
    return this.profiles;
  }

  /**
   * Cambia el perfil activo
   */
  setActiveProfile(profileId) {
    if (!this.profiles[profileId]) {
      console.warn(`[ProfileManager] ⚠️ Perfil ${profileId} no existe`);
      return false;
    }

    this.activeProfile = profileId;
    
    // Guardar en stateManager
    stateManager?.setState({
      profiles: {
        activeProfile: profileId,
        list: this.profiles
      }
    });

    // Guardar en localStorage para persistencia
    localStorage.setItem('trading_dome_profiles', JSON.stringify(this.profiles));
    localStorage.setItem('trading_dome_active_profile', profileId);

    console.log(`[ProfileManager] ✓ Perfil cambiado a: ${profileId}`);
    
    // Emitir evento
    eventBus?.emit('profile:changed', { profileId, profileName: this.getActiveProfileName() });
    
    return true;
  }

  /**
   * Obtiene el siguiente perfil
   */
  getNextProfile() {
    const profileIds = Object.keys(this.profiles);
    if (profileIds.length === 0) return null;
    const currentIndex = profileIds.indexOf(this.activeProfile);
    const nextIndex = (currentIndex + 1) % profileIds.length;
    return profileIds[nextIndex];
  }

  /**
   * Obtiene el perfil anterior
   */
  getPreviousProfile() {
    const profileIds = Object.keys(this.profiles);
    if (profileIds.length === 0) return null;
    const currentIndex = profileIds.indexOf(this.activeProfile);
    const prevIndex = (currentIndex - 1 + profileIds.length) % profileIds.length;
    return profileIds[prevIndex];
  }

  /**
   * Navega al siguiente perfil
   */
  nextProfile() {
    const next = this.getNextProfile();
    if (next) {
      this.setActiveProfile(next);
    }
    return next;
  }

  /**
   * Navega al perfil anterior
   */
  previousProfile() {
    const prev = this.getPreviousProfile();
    if (prev) {
      this.setActiveProfile(prev);
    }
    return prev;
  }

  /**
   * Crea un nuevo perfil
   * @param {string} profileId - ID único del perfil
   * @param {string} profileName - Nombre del perfil (ej: Bitcoin, Ethereum)
   * @param {string} icon - Icono o símbolo (ej: ₿, Ξ)
   */
  createProfile(profileId, profileName, icon = '📊') {
    if (this.profiles[profileId]) {
      console.warn(`[ProfileManager] ⚠️ Perfil ${profileId} ya existe`);
      return false;
    }

    this.profiles[profileId] = {
      id: profileId,
      name: profileName,
      icon: icon,
      indicators: [],
      thresholds: { long: 40, short: 40 },
      risk: {}
    };

    // Si es el primer perfil, hacerlo activo
    if (!this.activeProfile) {
      this.activeProfile = profileId;
    }

    // Guardar en stateManager
    stateManager?.setState({
      profiles: {
        activeProfile: this.activeProfile,
        list: this.profiles
      }
    });

    // Guardar en localStorage para persistencia
    localStorage.setItem('trading_dome_profiles', JSON.stringify(this.profiles));
    localStorage.setItem('trading_dome_active_profile', this.activeProfile);

    console.log(`[ProfileManager] ✓ Perfil creado: ${profileName} (${profileId})`);
    
    return true;
  }

  /**
   * Guarda datos del perfil actual
   */
  saveProfileData(type, data) {
    if (!this.profiles[this.activeProfile]) {
      console.warn('[ProfileManager] ⚠️ Perfil activo no existe');
      return;
    }

    this.profiles[this.activeProfile][type] = data;
    stateManager?.setState({
      profiles: {
        activeProfile: this.activeProfile,
        list: this.profiles
      }
    });

    console.log(`[ProfileManager] ✓ Datos guardados para ${type} en ${this.activeProfile}`);
  }

  /**
   * Carga datos del perfil actual
   */
  getProfileData(type) {
    return this.profiles[this.activeProfile]?.[type] || {};
  }
}

// Instancia global
const profileManager = new ProfileManager();

/**
 * @file profile-data-service.js
 * @description Servicio centralizado de datos de perfil
 * 
 * Responsabilidades:
 * - Punto único de guardar/cargar datos de perfil
 * - Sincronizar entre módulos (Riesgo, Análisis)
 * - Emitir eventos cuando cambian datos
 * - Persistir en profileManager y stateManager
 * 
 * Uso:
 *   profileDataService.save('risk', riskStateObject)
 *   profileDataService.load() → carga todo del perfil actual
 *   profileDataService.on('loaded', (data) => {})
 */

class ProfileDataService {
  constructor() {
    this.currentProfileId = null;
    this.currentData = {
      indicators: [],
      thresholds: { long: 40, short: 40 },
      risk: {}
    };
    this.listeners = {}; // { eventName: [callbacks] }
    this.initialized = false; // Flag para evitar inicializar múltiples veces
  }

  /**
   * Inicializa el servicio (solo la primera vez)
   */
  initialize() {
    if (this.initialized) {
      console.log('[ProfileDataService] ℹ️ Ya inicializado');
      return;
    }

    console.log('[ProfileDataService] 🎯 Inicializando...');
    
    // Escuchar cambios de perfil
    eventBus?.on('profile:changed', (data) => {
      console.log('[ProfileDataService] 🔄 Perfil cambió, recargando...');
      this.load();
    });

    this.initialized = true;
  }

  /**
   * Carga TODOS los datos del perfil actual
   */
  load() {
    try {
      const profileId = profileManager?.activeProfile;
      if (!profileId) {
        console.warn('[ProfileDataService] ⚠️ No active profile');
        return;
      }

      this.currentProfileId = profileId;

      // Cargar desde profileManager
      if (profileManager?.profiles?.[profileId]) {
        let profile = profileManager.profiles[profileId];
        
        // Validar y reparar si es necesario
        if (!ProfileDataValidator?.validate(profile)) {
          console.warn('[ProfileDataService] 🔧 Reparando perfil corrupto...');
          profile = ProfileDataValidator?.repair(profile);
          profileManager.profiles[profileId] = profile;
        }
        
        // COPIA PROFUNDA para evitar referencias compartidas
        this.currentData = {
          indicators: JSON.parse(JSON.stringify(profile.indicators || [])),
          thresholds: JSON.parse(JSON.stringify(profile.thresholds || { long: 40, short: 40 })),
          risk: JSON.parse(JSON.stringify(profile.risk || {}))
        };

        console.log(`[ProfileDataService] ✓ Datos cargados para perfil: ${profileId}`);
        console.log('[ProfileDataService] 📊 Datos actuales:', this.currentData);

        // Emitir evento
        this._emit('loaded', this.currentData);
        return this.currentData;
      }

      console.warn('[ProfileDataService] ⚠️ Perfil no existe en profileManager');
      return null;
    } catch (error) {
      console.error('[ProfileDataService] ❌ Error cargando datos:', error);
      return null;
    }
  }

  /**
   * Guarda datos de un tipo específico (indicators, risk, thresholds)
   */
  save(type, data) {
    try {
      const profileId = profileManager?.activeProfile;
      if (!profileId) {
        console.warn('[ProfileDataService] ⚠️ No active profile');
        return false;
      }

      // Validar tipo
      if (!['indicators', 'risk', 'thresholds'].includes(type)) {
        console.error(`[ProfileDataService] ❌ Tipo desconocido: ${type}`);
        return false;
      }

      // Actualizar memoria local (COPIA PROFUNDA para evitar referencias compartidas)
      this.currentData[type] = JSON.parse(JSON.stringify(data));

      // Guardar en profileManager (TAMBIÉN con copia profunda)
      if (profileManager?.profiles?.[profileId]) {
        profileManager.profiles[profileId][type] = JSON.parse(JSON.stringify(data));
      }

      // Guardar en stateManager
      stateManager?.setState({
        profiles: {
          activeProfile: profileId,
          list: profileManager?.profiles
        }
      });

      console.log(`[ProfileDataService] 💾 ${type} guardado para perfil: ${profileId}`);

      // Emitir evento
      this._emit('saved', { type, data, profileId });
      return true;
    } catch (error) {
      console.error(`[ProfileDataService] ❌ Error guardando ${type}:`, error);
      return false;
    }
  }

  /**
   * Obtiene datos del perfil actual
   */
  getData(type = null) {
    if (type) {
      return this.currentData[type];
    }
    return this.currentData;
  }

  /**
   * Obtiene el perfil activo actual
   */
  getCurrentProfileId() {
    return this.currentProfileId;
  }

  /**
   * Se suscribe a eventos del servicio
   */
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
    console.log(`[ProfileDataService] 👂 Listener registrado: ${eventName}`);
    
    // Retornar función para desuscribirse
    return () => {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    };
  }

  /**
   * Emite un evento a todos los listeners
   * @private
   */
  _emit(eventName, data) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[ProfileDataService] ❌ Error en listener ${eventName}:`, error);
        }
      });
    }
  }
}

// Instancia global
const profileDataService = new ProfileDataService();

/**
 * @file profile-export-import.js
 * @description Módulo para exportar e importar perfiles completos (indicadores, decisiones, riesgo)
 * Permite guardar y restaurar toda la configuración de trading en archivos JSON
 * 
 * Uso:
 *   profileExportImport.exportProfile() - Descarga archivo JSON con todos los datos
 *   profileExportImport.importProfile() - Carga archivo JSON
 */

class ProfileExportImport {
  constructor() {
    this.fileInput = null;
  }

  /**
   * Exporta todos los perfiles cargados a un archivo JSON
   * Descarga automáticamente el archivo con toda la colección
   * @public
   */
  exportProfile() {
    try {
      if (!profileManager) {
        throw new Error('ProfileManager no disponible');
      }

      // Recopilar todos los perfiles
      const allProfiles = profileManager.profiles;
      const profileIds = Object.keys(allProfiles);

      if (profileIds.length === 0) {
        throw new Error('No hay perfiles para exportar');
      }

      // Crear estructura de exportación con todos los perfiles
      const profilesList = {};
      profileIds.forEach(profileId => {
        const profileData = allProfiles[profileId];
        profilesList[profileId] = {
          id: profileId,
          name: profileData.name,
          icon: profileData.icon || '📊',
          indicators: profileData.indicators || [],
          thresholds: profileData.thresholds || { long: 40, short: 40 },
          risk: profileData.risk || {}
        };
      });

      // Crear estructura de exportación
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        totalProfiles: profileIds.length,
        activeProfile: profileManager.activeProfile,
        profiles: profilesList
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Crear nombre del archivo con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `trading-dome-backup-${profileIds.length}perfiles-${timestamp}.json`;

      // Descargar archivo
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 100);

      console.log('[ProfileExportImport] ✅ Perfiles exportados:', fileName);
      console.log('[ProfileExportImport] 📊 Datos exportados:', {
        totalProfiles: profileIds.length,
        perfiles: profileIds,
        activeProfile: profileManager.activeProfile
      });

      return exportData;
    } catch (error) {
      console.error('[ProfileExportImport] ❌ Error exportando perfiles:', error);
      errorHandler?.handleError('PROFILE_EXPORT_ERROR', error);
      alert('Error al exportar perfiles: ' + error.message);
    }
  }

  /**
   * Importa un perfil desde un archivo JSON
   * Muestra selector de archivo al usuario
   * @public
   */
  importProfile() {
    try {
      if (!this.fileInput) {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.json';
        this.fileInput.style.display = 'none';

        this.fileInput.addEventListener('change', (e) => this._handleFileSelected(e));
        document.body.appendChild(this.fileInput);
      }

      this.fileInput.click();
    } catch (error) {
      console.error('[ProfileExportImport] ❌ Error importando perfil:', error);
      errorHandler?.handleError('PROFILE_IMPORT_ERROR', error);
      alert('Error al importar perfil: ' + error.message);
    }
  }

  /**
   * Maneja la selección de archivo
   * @private
   */
  _handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const importData = JSON.parse(content);

        // Detectar si es un archivo de backup (múltiples perfiles) o un perfil individual
        const isBackupFile = importData.profiles && typeof importData.profiles === 'object';
        const isSingleProfile = importData.profileId && importData.data;

        if (!isBackupFile && !isSingleProfile) {
          throw new Error('Formato de archivo inválido. Se espera un archivo de backup o un perfil individual.');
        }

        if (isBackupFile) {
          // Importar múltiples perfiles
          this._importMultipleProfiles(importData);
        } else {
          // Importar perfil individual (backward compatibility)
          this._importSingleProfile(importData);
        }
      } catch (error) {
        console.error('[ProfileExportImport] ❌ Error parseando archivo:', error);
        alert('Error al importar: ' + error.message);
      }
    };

    reader.onerror = () => {
      console.error('[ProfileExportImport] ❌ Error leyendo archivo');
      alert('Error al leer archivo');
    };

    reader.readAsText(file);

    // Limpiar input
    event.target.value = '';
  }

  /**
   * Importa múltiples perfiles desde archivo de backup
   * @private
   */
  _importMultipleProfiles(importData) {
    try {
      const totalProfiles = Object.keys(importData.profiles).length;
      const confirmMessage = `¿Importar ${totalProfiles} perfil(es)?\n\nEsto reemplazará todos los perfiles actuales.\n\nPerfiles:\n${Object.values(importData.profiles).map(p => `  • ${p.name} (${p.indicators?.length || 0} indicadores)`).join('\n')}`;
      
      const confirm = window.confirm(confirmMessage);

      if (!confirm) {
        console.log('[ProfileExportImport] ⚠️ Importación cancelada por usuario');
        return;
      }

      // Restaurar todos los perfiles
      profileManager.profiles = {};
      Object.values(importData.profiles).forEach(profileData => {
        profileManager.profiles[profileData.id] = {
          id: profileData.id,
          name: profileData.name,
          icon: profileData.icon || '📊',
          indicators: profileData.indicators || [],
          thresholds: profileData.thresholds || { long: 40, short: 40 },
          risk: profileData.risk || {}
        };
      });

      // Restaurar perfil activo si existe
      if (importData.activeProfile && profileManager.profiles[importData.activeProfile]) {
        profileManager.activeProfile = importData.activeProfile;
      } else {
        // Si no existe, usar el primer perfil
        const firstProfileId = Object.keys(profileManager.profiles)[0];
        profileManager.activeProfile = firstProfileId || null;
      }

      // Guardar en stateManager
      stateManager?.setState({
        profiles: {
          activeProfile: profileManager.activeProfile,
          list: profileManager.profiles
        }
      });

      // Recargar indicadores si hay un perfil activo
      if (profileManager.activeProfile && indicatorsManager) {
        indicatorsManager.load();
        eventBus?.emit('indicators:reloaded', { count: indicatorsManager.getAll().length });
      }

      // Emitir evento global de cambio
      eventBus?.emit('profile:changed', { 
        profileId: profileManager.activeProfile,
        multiple: true,
        count: totalProfiles
      });

      console.log('[ProfileExportImport] ✅ Múltiples perfiles importados exitosamente');
      alert(`✅ ${totalProfiles} perfil(es) importado(s) correctamente`);
    } catch (error) {
      console.error('[ProfileExportImport] ❌ Error importando múltiples perfiles:', error);
      alert('Error al importar: ' + error.message);
    }
  }

  /**
   * Importa un perfil individual (backward compatibility)
   * @private
   */
  _importSingleProfile(importData) {
    try {
      // Validar estructura
      if (!importData.profileId || !importData.data) {
        throw new Error('Formato de archivo inválido');
      }

      // Confirmar antes de importar
      const profileExists = !!profileManager.profiles[importData.profileId];
      const confirmMessage = profileExists
        ? `¿Sobrescribir perfil "${importData.profileName}"?\n\nIndicadores: ${importData.data.indicators?.length || 0}\nThresholds: ${JSON.stringify(importData.data.thresholds)}\nDatos de Riesgo: ${Object.keys(importData.data.risk || {}).length} campos`
        : `¿Importar nuevo perfil "${importData.profileName}"?\n\nIndicadores: ${importData.data.indicators?.length || 0}\nThresholds: ${JSON.stringify(importData.data.thresholds)}\nDatos de Riesgo: ${Object.keys(importData.data.risk || {}).length} campos`;
      
      const confirm = window.confirm(confirmMessage);

      if (!confirm) {
        console.log('[ProfileExportImport] ⚠️ Importación cancelada por usuario');
        return;
      }

      // Actualizar profileManager
      if (!profileManager.profiles[importData.profileId]) {
        console.warn('[ProfileExportImport] ⚠️ Perfil no existe, creando...');
        profileManager.profiles[importData.profileId] = {
          id: importData.profileId,
          name: importData.profileName,
          icon: '📊',
          indicators: [],
          thresholds: { long: 40, short: 40 },
          risk: {}
        };
      }

      // Restaurar datos
      profileManager.profiles[importData.profileId].indicators = importData.data.indicators || [];
      profileManager.profiles[importData.profileId].thresholds = importData.data.thresholds || { long: 40, short: 40 };
      profileManager.profiles[importData.profileId].risk = importData.data.risk || {};

      // Guardar en stateManager
      stateManager?.setState({
        profiles: {
          activeProfile: profileManager.activeProfile,
          list: profileManager.profiles
        }
      });

      // Cambiar al perfil importado si es diferente
      if (profileManager.activeProfile !== importData.profileId) {
        profileManager.setActiveProfile(importData.profileId);
      } else {
        // Si ya está activo el perfil, solo emitir el evento de cambio
        eventBus?.emit('profile:changed', { 
          profileId: importData.profileId, 
          profileName: importData.profileName 
        });
      }

      // Recargar todos los módulos
      if (indicatorsManager) {
        indicatorsManager.load();
        eventBus?.emit('indicators:reloaded', { count: indicatorsManager.getAll().length });
      }

      console.log('[ProfileExportImport] ✅ Perfil importado exitosamente');
      console.log('[ProfileExportImport] 📊 Datos importados:', {
        indicators: importData.data.indicators?.length,
        thresholds: importData.data.thresholds,
        risk: Object.keys(importData.data.risk || {}).length
      });
      
      alert('✅ Perfil importado correctamente');

      // Emitir evento de importación
      eventBus?.emit('profile:imported', {
        profileId: importData.profileId,
        profileName: importData.profileName
      });
    } catch (error) {
      console.error('[ProfileExportImport] ❌ Error importando perfil individual:', error);
      alert('Error al importar: ' + error.message);
    }
  }
}

// Instancia global
const profileExportImport = new ProfileExportImport();

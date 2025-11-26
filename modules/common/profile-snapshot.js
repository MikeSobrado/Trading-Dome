/**
 * @file profile-snapshot.js
 * @description Sistema de snapshots para deshacer cambios
 * 
 * Responsabilidades:
 * - Crear snapshot de perfil antes de cambios importantes
 * - Permitir restaurar a snapshot anterior
 * - Mantener historial de snapshots (últimos 10)
 * - Detectar cambios automáticamente
 * 
 * Uso:
 *   profileSnapshot.createSnapshot(profileId, 'Cambio de umbral')
 *   profileSnapshot.restore(snapshotId)
 *   profileSnapshot.getHistory()
 */

class ProfileSnapshot {
  constructor(maxSnapshots = 10) {
    this.maxSnapshots = maxSnapshots;
    this.snapshots = {}; // { profileId: [snapshots] }
    this.lastSnapshotTime = {};
    this.minIntervalMs = 5000; // Mínimo 5 segundos entre snapshots automáticos
  }

  /**
   * Crea un snapshot manual de un perfil
   */
  createSnapshot(profileId, reason = 'Manual snapshot', metadata = {}) {
    try {
      if (!profileManager?.profiles?.[profileId]) {
        console.warn('[ProfileSnapshot] ⚠️ Perfil no existe:', profileId);
        return null;
      }

      const profile = profileManager.profiles[profileId];
      const now = Date.now();

      // Verificar intervalo mínimo para auto-snapshots
      if (reason.startsWith('Auto:') && this.lastSnapshotTime[profileId]) {
        if (now - this.lastSnapshotTime[profileId] < this.minIntervalMs) {
          return null; // Descartar snapshot muy frecuente
        }
      }

      // Crear snapshot con copia profunda
      const snapshot = {
        id: `snap_${profileId}_${now}`,
        profileId,
        timestamp: now,
        reason,
        metadata,
        data: {
          indicators: JSON.parse(JSON.stringify(profile.indicators || [])),
          thresholds: JSON.parse(JSON.stringify(profile.thresholds || {})),
          risk: JSON.parse(JSON.stringify(profile.risk || {}))
        }
      };

      // Inicializar array si no existe
      if (!this.snapshots[profileId]) {
        this.snapshots[profileId] = [];
      }

      // Agregar snapshot
      this.snapshots[profileId].push(snapshot);
      this.lastSnapshotTime[profileId] = now;

      // Limitar cantidad de snapshots
      if (this.snapshots[profileId].length > this.maxSnapshots) {
        this.snapshots[profileId].shift(); // Eliminar el más antiguo
      }

      console.log(`[ProfileSnapshot] ✓ Snapshot creado: ${snapshot.id} (${reason})`);
      
      // Emitir evento
      eventBus?.emit('snapshot:created', { snapshotId: snapshot.id, profileId, reason });

      return snapshot;
    } catch (error) {
      console.error('[ProfileSnapshot] ❌ Error creando snapshot:', error);
      return null;
    }
  }

  /**
   * Crea snapshot automático (desde listeners)
   */
  createAutoSnapshot(profileId, reason) {
    return this.createSnapshot(profileId, `Auto: ${reason}`);
  }

  /**
   * Restaura un perfil a partir de un snapshot
   */
  restore(snapshotId) {
    try {
      // Buscar snapshot
      let snapshot = null;
      let profileId = null;

      for (const pId in this.snapshots) {
        const found = this.snapshots[pId].find(s => s.id === snapshotId);
        if (found) {
          snapshot = found;
          profileId = pId;
          break;
        }
      }

      if (!snapshot) {
        console.warn('[ProfileSnapshot] ⚠️ Snapshot no encontrado:', snapshotId);
        return false;
      }

      // Restaurar datos
      if (profileManager?.profiles?.[profileId]) {
        profileManager.profiles[profileId].indicators = JSON.parse(JSON.stringify(snapshot.data.indicators));
        profileManager.profiles[profileId].thresholds = JSON.parse(JSON.stringify(snapshot.data.thresholds));
        profileManager.profiles[profileId].risk = JSON.parse(JSON.stringify(snapshot.data.risk));

        // Persistir
        stateManager?.setState({
          profiles: {
            activeProfile: profileManager.activeProfile,
            list: profileManager.profiles
          }
        });

        console.log(`[ProfileSnapshot] ✓ Restaurado desde snapshot: ${snapshot.reason}`);
        
        // Emitir evento
        eventBus?.emit('snapshot:restored', {
          snapshotId: snapshot.id,
          profileId,
          timestamp: snapshot.timestamp
        });

        // Recargar en todos los módulos
        profileDataService?.load();

        return true;
      }

      return false;
    } catch (error) {
      console.error('[ProfileSnapshot] ❌ Error restaurando snapshot:', error);
      return false;
    }
  }

  /**
   * Obtiene historial de snapshots para un perfil
   */
  getHistory(profileId = null) {
    if (profileId) {
      return this.snapshots[profileId] || [];
    }

    // Devolver todos los snapshots
    const allSnapshots = [];
    for (const pId in this.snapshots) {
      allSnapshots.push(...this.snapshots[pId]);
    }

    return allSnapshots.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Obtiene snapshot más reciente
   */
  getLatest(profileId) {
    const history = this.getHistory(profileId);
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Elimina snapshots antiguos
   */
  cleanup(profileId = null) {
    if (profileId) {
      if (this.snapshots[profileId]) {
        const count = this.snapshots[profileId].length;
        delete this.snapshots[profileId];
        console.log(`[ProfileSnapshot] 🗑️ ${count} snapshots eliminados para ${profileId}`);
      }
    } else {
      // Limpiar todos
      const totalCount = Object.values(this.snapshots)
        .reduce((sum, arr) => sum + arr.length, 0);
      this.snapshots = {};
      console.log(`[ProfileSnapshot] 🗑️ ${totalCount} snapshots eliminados`);
    }
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    const stats = {};
    for (const profileId in this.snapshots) {
      stats[profileId] = this.snapshots[profileId].length;
    }
    return stats;
  }

  /**
   * Configura listeners automáticos para crear snapshots
   */
  setupAutoSnapshots() {
    try {
      // Snapshot antes de cambiar perfil
      eventBus?.on('profile:changed', (data) => {
        const oldProfile = profileManager?.activeProfile;
        // Se crea después del cambio, así que no hacemos nada aquí
      });

      // Snapshot antes de agregar indicador
      eventBus?.on('indicators:indicator:added', (data) => {
        this.createAutoSnapshot(profileManager?.activeProfile, 'Indicador agregado');
      });

      // Snapshot antes de eliminar indicador
      eventBus?.on('indicators:indicator:deleted', (data) => {
        this.createAutoSnapshot(profileManager?.activeProfile, 'Indicador eliminado');
      });

      console.log('[ProfileSnapshot] ✓ Auto-snapshots configurados');
    } catch (error) {
      console.warn('[ProfileSnapshot] ⚠️ Error configurando auto-snapshots:', error);
    }
  }

  /**
   * Exporta snapshots a JSON
   */
  exportSnapshots() {
    return JSON.stringify(this.snapshots, null, 2);
  }
}

// Instancia global
const profileSnapshot = new ProfileSnapshot(10);
window.profileSnapshot = profileSnapshot;

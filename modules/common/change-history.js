/**
 * @file change-history.js
 * @description Historial de cambios para auditoría
 * 
 * Responsabilidades:
 * - Registrar qué cambió, cuándo, dónde, en qué perfil
 * - Mantener historial de cambios (últimos 100)
 * - Exportar historial para análisis
 * - Filtrar cambios por tipo, fecha, perfil
 * 
 * Uso:
 *   changeHistory.getChanges(profileId)
 *   changeHistory.filterByDate(startDate, endDate)
 *   changeHistory.exportHistory()
 */

class ChangeHistory {
  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries;
    this.changes = [];
    this.changeTypes = {
      INDICATOR_ADDED: 'indicator_added',
      INDICATOR_UPDATED: 'indicator_updated',
      INDICATOR_DELETED: 'indicator_deleted',
      THRESHOLD_CHANGED: 'threshold_changed',
      RISK_UPDATED: 'risk_updated',
      PROFILE_SWITCHED: 'profile_switched',
      AUTO_SAVE: 'auto_save'
    };
  }

  /**
   * Registra un cambio
   */
  logChange(type, profileId, details = {}) {
    try {
      const change = {
        id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        type,
        profileId,
        profileName: profileManager?.profiles?.[profileId]?.name || 'Desconocido',
        details,
        userAgent: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Otro'
      };

      this.changes.push(change);

      // Limitar cantidad
      if (this.changes.length > this.maxEntries) {
        this.changes.shift();
      }

      console.log(`[ChangeHistory] 📝 Cambio registrado: ${type} en ${profileId}`);

      // Emitir evento
      eventBus?.emit('change:recorded', change);

      return change;
    } catch (error) {
      console.error('[ChangeHistory] ❌ Error registrando cambio:', error);
      return null;
    }
  }

  /**
   * Obtiene cambios para un perfil
   */
  getChanges(profileId = null, limit = 20) {
    let filtered = this.changes;

    if (profileId) {
      filtered = filtered.filter(c => c.profileId === profileId);
    }

    return filtered.slice(-limit).reverse();
  }

  /**
   * Obtiene cambios por tipo
   */
  getChangesByType(type, limit = 20) {
    return this.changes
      .filter(c => c.type === type)
      .slice(-limit)
      .reverse();
  }

  /**
   * Filtra cambios por rango de fechas
   */
  filterByDate(startDate, endDate, profileId = null) {
    let filtered = this.changes;

    if (profileId) {
      filtered = filtered.filter(c => c.profileId === profileId);
    }

    return filtered.filter(c => 
      c.timestamp >= startDate && c.timestamp <= endDate
    ).reverse();
  }

  /**
   * Obtiene resumen de cambios
   */
  getSummary(profileId = null) {
    let filtered = this.changes;

    if (profileId) {
      filtered = filtered.filter(c => c.profileId === profileId);
    }

    const summary = {
      totalChanges: filtered.length,
      changesByType: {},
      changesByProfile: {},
      lastChange: filtered.length > 0 ? filtered[filtered.length - 1] : null,
      timeRange: {
        first: filtered.length > 0 ? filtered[0].timestamp : null,
        last: filtered.length > 0 ? filtered[filtered.length - 1].timestamp : null
      }
    };

    // Agrupar por tipo
    filtered.forEach(change => {
      if (!summary.changesByType[change.type]) {
        summary.changesByType[change.type] = 0;
      }
      summary.changesByType[change.type]++;
    });

    // Agrupar por perfil
    filtered.forEach(change => {
      if (!summary.changesByProfile[change.profileId]) {
        summary.changesByProfile[change.profileId] = 0;
      }
      summary.changesByProfile[change.profileId]++;
    });

    return summary;
  }

  /**
   * Exporta historial a formato texto legible
   */
  exportHistory(profileId = null) {
    const changes = this.getChanges(profileId, this.maxEntries);
    
    const lines = [
      '=== HISTORIAL DE CAMBIOS ===',
      `Generado: ${new Date().toLocaleString('es-ES')}`,
      `Total de cambios: ${changes.length}`,
      '',
      '---'
    ];

    changes.forEach(change => {
      const time = change.timestamp.toLocaleTimeString('es-ES');
      const date = change.timestamp.toLocaleDateString('es-ES');
      lines.push(
        `[${date} ${time}] ${change.type}`,
        `  Perfil: ${change.profileName}`,
        `  Detalles: ${JSON.stringify(change.details)}`,
        ''
      );
    });

    return lines.join('\n');
  }

  /**
   * Exporta a CSV (para análisis en Excel)
   */
  exportCSV(profileId = null) {
    const changes = this.getChanges(profileId, this.maxEntries);

    const headers = ['Fecha', 'Hora', 'Tipo', 'Perfil', 'Detalles'];
    const rows = changes.map(c => [
      c.timestamp.toLocaleDateString('es-ES'),
      c.timestamp.toLocaleTimeString('es-ES'),
      c.type,
      c.profileName,
      JSON.stringify(c.details)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(col => `"${col}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Descarga historial como archivo
   */
  downloadHistory(format = 'txt') {
    const content = format === 'csv' ? this.exportCSV() : this.exportHistory();
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-dome-change-history-${new Date().toISOString()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Limpia historial
   */
  clear(profileId = null) {
    if (profileId) {
      const beforeCount = this.changes.length;
      this.changes = this.changes.filter(c => c.profileId !== profileId);
      console.log(`[ChangeHistory] 🗑️ ${beforeCount - this.changes.length} cambios eliminados`);
    } else {
      const count = this.changes.length;
      this.changes = [];
      console.log(`[ChangeHistory] 🗑️ ${count} cambios eliminados`);
    }
  }

  /**
   * Obtiene constantes de tipos de cambio
   */
  getChangeTypes() {
    return this.changeTypes;
  }

  /**
   * Configura listeners automáticos para registrar cambios
   */
  setupAutoListeners() {
    try {
      // Cambios de indicadores
      eventBus?.on('indicators:indicator:added', (data) => {
        this.logChange(this.changeTypes.INDICATOR_ADDED, profileManager?.activeProfile, {
          indicatorId: data.id,
          indicatorName: data.name
        });
      });

      eventBus?.on('indicators:indicator:deleted', (data) => {
        this.logChange(this.changeTypes.INDICATOR_DELETED, profileManager?.activeProfile, {
          indicatorId: data.id,
          indicatorName: data.name
        });
      });

      eventBus?.on('indicators:indicator:updated', (data) => {
        this.logChange(this.changeTypes.INDICATOR_UPDATED, profileManager?.activeProfile, {
          indicatorId: data.id,
          type: data.type,
          active: data.active
        });
      });

      // Cambios de decisión
      eventBus?.on('indicators:decision:changed', (data) => {
        this.logChange('decision_changed', profileManager?.activeProfile, {
          decision: data.decision,
          longScore: data.longScore,
          shortScore: data.shortScore
        });
      });

      // Auto-save completado
      eventBus?.on('auto-save:completed', (data) => {
        this.logChange(this.changeTypes.AUTO_SAVE, profileManager?.activeProfile, {
          saveCount: data.saveCount
        });
      });

      // Cambio de perfil
      eventBus?.on('profile:changed', (data) => {
        this.logChange(this.changeTypes.PROFILE_SWITCHED, data.profileId, {
          profileName: data.profileName
        });
      });

      console.log('[ChangeHistory] ✓ Auto-listeners configurados');
    } catch (error) {
      console.warn('[ChangeHistory] ⚠️ Error configurando auto-listeners:', error);
    }
  }
}

// Instancia global
const changeHistory = new ChangeHistory(100);
window.changeHistory = changeHistory;

// Helper para registrar cambios fácilmente
const recordChange = (type, profileId, details) => {
  changeHistory.logChange(type, profileId, details);
};

window.recordChange = recordChange;

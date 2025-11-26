/**
 * @file profile-data-validator.js
 * @description Validador centralizado para estructura de datos de perfiles
 * 
 * Responsabilidades:
 * - Validar que los datos cargados tengan la estructura correcta
 * - Detectar corrupción o datos incompletos
 * - Reparar datos defectuosos si es posible
 * - Emitir advertencias para debugging
 * 
 * Uso:
 *   ProfileDataValidator.validate(profile)
 *   ProfileDataValidator.repair(profile)
 */

class ProfileDataValidator {
  /**
   * Estructura esperada de un perfil
   */
  static PROFILE_SCHEMA = {
    id: 'string',
    name: 'string',
    icon: 'string',
    indicators: 'array',
    thresholds: 'object',
    risk: 'object'
  };

  static INDICATOR_SCHEMA = {
    id: 'string',
    name: 'string',
    longScore: 'number',
    shortScore: 'number',
    longActive: 'boolean',
    shortActive: 'boolean',
    createdAt: 'number',
    updatedAt: 'number'
  };

  static THRESHOLDS_SCHEMA = {
    long: 'number',
    short: 'number'
  };

  static RISK_SCHEMA = {
    capital: 'number',
    apalancamiento: 'number',
    riesgoMaximo: 'number',
    precioEntrada: 'number',
    precioSL: 'number',
    precioSalida: 'number',
    riesgoBeneficio: 'number',
    comision: 'number',
    financiacion: 'number',
    spread: 'number',
    operacionTipo: 'string'
  };

  /**
   * Valida un perfil completo
   * @returns {boolean} true si es válido, false si tiene problemas
   */
  static validate(profile) {
    if (!profile) {
      console.warn('[ProfileDataValidator] ⚠️ Perfil nulo/indefinido');
      return false;
    }

    const issues = [];

    // Validar campos básicos
    if (typeof profile.id !== 'string' || !profile.id.trim()) {
      issues.push('id: falta o no es string');
    }
    if (typeof profile.name !== 'string' || !profile.name.trim()) {
      issues.push('name: falta o no es string');
    }

    // Validar indicators (array)
    if (!Array.isArray(profile.indicators)) {
      issues.push('indicators: no es array');
    } else {
      profile.indicators.forEach((ind, idx) => {
        const indIssues = this._validateIndicator(ind, idx);
        issues.push(...indIssues);
      });
    }

    // Validar thresholds (objeto)
    if (typeof profile.thresholds !== 'object' || profile.thresholds === null) {
      issues.push('thresholds: no es objeto válido');
    } else {
      if (typeof profile.thresholds.long !== 'number') issues.push('thresholds.long: no es número');
      if (typeof profile.thresholds.short !== 'number') issues.push('thresholds.short: no es número');
    }

    // Validar risk (objeto, puede estar vacío)
    if (typeof profile.risk !== 'object' || profile.risk === null) {
      issues.push('risk: no es objeto válido');
    }

    if (issues.length > 0) {
      console.warn(`[ProfileDataValidator] ⚠️ Perfil "${profile.name}" tiene ${issues.length} problemas:`, issues);
      return false;
    }

    console.log(`[ProfileDataValidator] ✓ Perfil "${profile.name}" válido`);
    return true;
  }

  /**
   * Repara un perfil defectuoso, restaurando valores por defecto
   * @returns {object} Perfil reparado
   */
  static repair(profile) {
    if (!profile) {
      console.log('[ProfileDataValidator] 🔧 Reparando perfil nulo, creando por defecto...');
      return this._createDefaultProfile('default');
    }

    const repaired = { ...profile };

    // Reparar campos básicos
    if (typeof repaired.id !== 'string' || !repaired.id.trim()) {
      repaired.id = profile.id || `profile_${Date.now()}`;
    }
    if (typeof repaired.name !== 'string' || !repaired.name.trim()) {
      repaired.name = profile.name || 'Sin nombre';
    }
    if (typeof repaired.icon !== 'string') {
      repaired.icon = '📊';
    }

    // Reparar indicators
    if (!Array.isArray(repaired.indicators)) {
      console.warn('[ProfileDataValidator] 🔧 Reparando indicators (no es array)');
      repaired.indicators = [];
    } else {
      repaired.indicators = repaired.indicators.map((ind, idx) => 
        this._repairIndicator(ind, idx, repaired.id)
      );
    }

    // Reparar thresholds
    if (typeof repaired.thresholds !== 'object' || repaired.thresholds === null) {
      console.warn('[ProfileDataValidator] 🔧 Reparando thresholds (no es objeto)');
      repaired.thresholds = { long: 40, short: 40 };
    } else {
      if (typeof repaired.thresholds.long !== 'number') repaired.thresholds.long = 40;
      if (typeof repaired.thresholds.short !== 'number') repaired.thresholds.short = 40;
    }

    // Reparar risk
    if (typeof repaired.risk !== 'object' || repaired.risk === null) {
      console.warn('[ProfileDataValidator] 🔧 Reparando risk (no es objeto)');
      repaired.risk = {};
    }

    console.log(`[ProfileDataValidator] ✓ Perfil "${repaired.name}" reparado`);
    return repaired;
  }

  /**
   * Valida un indicador individual
   * @private
   */
  static _validateIndicator(indicator, index) {
    const issues = [];

    if (typeof indicator.id !== 'string') issues.push(`indicators[${index}].id: no es string`);
    if (typeof indicator.name !== 'string') issues.push(`indicators[${index}].name: no es string`);
    if (typeof indicator.longScore !== 'number') issues.push(`indicators[${index}].longScore: no es número`);
    if (typeof indicator.shortScore !== 'number') issues.push(`indicators[${index}].shortScore: no es número`);
    if (typeof indicator.longActive !== 'boolean') issues.push(`indicators[${index}].longActive: no es boolean`);
    if (typeof indicator.shortActive !== 'boolean') issues.push(`indicators[${index}].shortActive: no es boolean`);

    return issues;
  }

  /**
   * Repara un indicador individual
   * @private
   */
  static _repairIndicator(indicator, index, profileId) {
    const repaired = { ...indicator };

    if (typeof repaired.id !== 'string') repaired.id = `ind_${profileId}_${index}`;
    if (typeof repaired.name !== 'string') repaired.name = `Indicador ${index}`;
    if (typeof repaired.longScore !== 'number') repaired.longScore = 10;
    if (typeof repaired.shortScore !== 'number') repaired.shortScore = 10;
    if (typeof repaired.longActive !== 'boolean') repaired.longActive = false;
    if (typeof repaired.shortActive !== 'boolean') repaired.shortActive = false;
    if (typeof repaired.createdAt !== 'number') repaired.createdAt = Date.now();
    if (typeof repaired.updatedAt !== 'number') repaired.updatedAt = Date.now();

    return repaired;
  }

  /**
   * Crea un perfil por defecto
   * @private
   */
  static _createDefaultProfile(id = 'default') {
    return {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      icon: '📊',
      indicators: [],
      thresholds: {
        long: 40,
        short: 40
      },
      risk: {}
    };
  }

  /**
   * Valida la estructura completa de perfiles (stateManager)
   */
  static validateProfiles(profiles) {
    if (typeof profiles !== 'object' || profiles === null) {
      console.warn('[ProfileDataValidator] ⚠️ Perfiles no es objeto válido');
      return false;
    }

    const profileIds = Object.keys(profiles);
    if (profileIds.length === 0) {
      console.warn('[ProfileDataValidator] ⚠️ No hay perfiles');
      return false;
    }

    let allValid = true;
    profileIds.forEach(id => {
      if (!this.validate(profiles[id])) {
        allValid = false;
      }
    });

    return allValid;
  }

  /**
   * Repara todos los perfiles
   */
  static repairProfiles(profiles) {
    if (typeof profiles !== 'object' || profiles === null) {
      console.warn('[ProfileDataValidator] 🔧 Reparando estructura de perfiles nula');
      return {};
    }

    const repaired = {};
    Object.keys(profiles).forEach(id => {
      repaired[id] = this.repair(profiles[id]);
    });

    return repaired;
  }
}

// Accesible globalmente
window.ProfileDataValidator = ProfileDataValidator;

/**
 * @file crypto-manager.js
 * @description Gestor de cifrado/descifrado de credenciales
 * Responsabilidades:
 * - Cifrar credenciales en formato JSON
 * - Descifrar archivos de credenciales
 * - Generar y gestionar contraseñas de cifrado
 * - Exportar e importar archivos "Llave Segura"
 * 
 * Usa CryptoJS para AES-256 encryption
 */

class CryptoManager {
  constructor() {
    this.defaultPassword = null;
    this.initialized = false;
  }

  /**
   * Inicializa el gestor de criptografía
   */
  async initialize() {
    try {
      // Si ya está inicializado, no hacer nada
      if (this.initialized) {
        console.log('[CryptoManager] ℹ️ Ya está inicializado');
        return true;
      }

      // Cargar CryptoJS si no está disponible
      if (typeof CryptoJS === 'undefined') {
        console.log('[CryptoManager] ⏳ Cargando CryptoJS...');
        await this.loadCryptoJS();
      }
      
      this.initialized = true;
      console.log('[CryptoManager] ✓ Gestor de criptografía inicializado');
      return true;
    } catch (error) {
      console.error('[CryptoManager] ❌ Error inicializando:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Carga la librería CryptoJS desde CDN
   */
  loadCryptoJS() {
    return new Promise((resolve, reject) => {
      // Si ya está cargado, resolver inmediatamente
      if (typeof CryptoJS !== 'undefined') {
        console.log('[CryptoManager] ✓ CryptoJS ya estaba disponible');
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
      script.async = true;
      
      script.onload = () => {
        // Esperar un poco para asegurar que CryptoJS esté completamente cargado
        setTimeout(() => {
          if (typeof CryptoJS !== 'undefined') {
            console.log('[CryptoManager] ✓ CryptoJS cargado desde CDN');
            resolve();
          } else {
            reject(new Error('CryptoJS no se cargó correctamente'));
          }
        }, 100);
      };
      
      script.onerror = () => {
        reject(new Error('Error cargando CryptoJS desde CDN'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Cifra datos usando AES-256
   * @param {Object} data - Datos a cifrar
   * @param {string} password - Contraseña para el cifrado
   * @returns {string} Datos cifrados en base64
   */
  encrypt(data, password) {
    try {
      if (typeof CryptoJS === 'undefined') {
        throw new Error('CryptoJS no está disponible');
      }

      const jsonString = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonString, password).toString();
      
      console.log('[CryptoManager] ✓ Datos cifrados correctamente');
      return encrypted;
    } catch (error) {
      console.error('[CryptoManager] ❌ Error cifrando datos:', error);
      throw error;
    }
  }

  /**
   * Descifra datos usando AES-256
   * @param {string} encryptedData - Datos cifrados
   * @param {string} password - Contraseña para descifrar
   * @returns {Object} Datos descifrados
   */
  decrypt(encryptedData, password) {
    try {
      if (typeof CryptoJS === 'undefined') {
        throw new Error('CryptoJS no está disponible');
      }

      const decrypted = CryptoJS.AES.decrypt(encryptedData, password).toString(CryptoJS.enc.Utf8);
      const data = JSON.parse(decrypted);
      
      console.log('[CryptoManager] ✓ Datos descifrados correctamente');
      return data;
    } catch (error) {
      console.error('[CryptoManager] ❌ Error descifrando datos:', error);
      throw error;
    }
  }

  /**
   * Exporta credenciales a un archivo JSON cifrado
   * @param {Object} credentials - Credenciales a exportar
   * @param {string} password - Contraseña para cifrado
   * @returns {Object} Objeto con estructura de "Llave Segura"
   */
  exportCredentials(credentials, password) {
    try {
      // Cifrar credenciales
      const encryptedData = this.encrypt(credentials, password);

      // Crear estructura de archivo
      const fileData = {
        data: encryptedData,
        timestamp: new Date().toISOString(),
        version: 2,
        encrypted: true
      };

      console.log('[CryptoManager] ✓ Credenciales exportadas');
      return fileData;
    } catch (error) {
      console.error('[CryptoManager] ❌ Error exportando credenciales:', error);
      throw error;
    }
  }

  /**
   * Importa credenciales desde un archivo JSON cifrado
   * @param {Object} fileData - Contenido del archivo "Llave Segura"
   * @param {string} password - Contraseña para descifrar
   * @returns {Object} Credenciales descifradas
   */
  importCredentials(fileData, password) {
    try {
      if (!fileData.encrypted || fileData.version !== 2) {
        throw new Error('Formato de archivo no válido o versión no soportada');
      }

      // Descifrar datos
      const credentials = this.decrypt(fileData.data, password);

      console.log('[CryptoManager] ✓ Credenciales importadas');
      return credentials;
    } catch (error) {
      console.error('[CryptoManager] ❌ Error importando credenciales:', error);
      throw error;
    }
  }

  /**
   * Descarga un archivo JSON al cliente
   * @param {Object} data - Datos a descargar
   * @param {string} filename - Nombre del archivo
   */
  downloadFile(data, filename = 'Llave Segura.json') {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('[CryptoManager] ✓ Archivo descargado:', filename);
    } catch (error) {
      console.error('[CryptoManager] ❌ Error descargando archivo:', error);
      throw error;
    }
  }

  /**
   * Carga un archivo JSON desde el cliente
   * @returns {Promise<Object>} Contenido del archivo
   */
  uploadFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error('No se seleccionó archivo'));
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            console.log('[CryptoManager] ✓ Archivo cargado');
            resolve(data);
          } catch (error) {
            reject(new Error('Archivo JSON inválido'));
          }
        };
        reader.onerror = () => reject(new Error('Error leyendo archivo'));
        reader.readAsText(file);
      };
      input.click();
    });
  }

  /**
   * Valida la contraseña solicitando confirmación
   * @param {string} message - Mensaje para el usuario
   * @returns {Promise<string>} Contraseña ingresada
   */
  async promptPassword(message = 'Ingresa una contraseña para proteger tus credenciales:') {
    return new Promise((resolve) => {
      const password = prompt(message);
      if (password === null) {
        resolve(null);
      } else {
        resolve(password);
      }
    });
  }
}

// Crear instancia global
const cryptoManager = new CryptoManager();

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    cryptoManager.initialize();
  });
} else {
  cryptoManager.initialize();
}

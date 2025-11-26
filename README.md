# 🚀 Trading Dome - Dashboard de Trading Profesional

> Un dashboard web completo y moderno para gestionar operaciones de trading en futuros y derivados, con análisis técnico integrado, gestión avanzada de riesgo, y monitoreo en tiempo real.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-v14%2B-brightgreen)

---

## 📋 Características Principales

### 📊 **Análisis Técnico**
- Panel de decisión automático (LONG/SHORT/WAIT)
- Gestión de indicadores técnicos personalizados
- Sistema de umbral configurable para señales de trading
- Cálculo de decisiones basado en múltiples indicadores

### 💰 **Gestión de Riesgo Avanzada**
- Calculadora de riesgo y costes en tiempo real
- Cálculo automático de:
  - Margen requerido
  - Pérdida máxima en dólares
  - Ganancia potencial
  - Break-even point
  - ROI (Retorno sobre inversión)
  - Costes totales (comisiones, financiación, spread)
- Soporte para operaciones LONG y SHORT
- Parámetros guardados por perfil

### 📈 **Monitoreo en Tiempo Real**
- Estadísticas de trading en vivo (P&L, posiciones abiertas, margen usado)
- Conexión integrada con API de Bitget
- Actualización automática de datos (5s polling)
- Gráficas interactivas de dominancia del mercado

### 📍 **Gestión de Posiciones**
- Historial completo de posiciones cerradas
- Vista de posiciones abiertas con estadísticas
- Tabla filtrable y responsive
- Modal detallado de información de posiciones

### 🎯 **Múltiples Perfiles de Trading**
- Crear y gestionar perfiles de usuario independientes
- Configuración específica por perfil (indicadores, parámetros de riesgo)
- Cambio rápido entre perfiles con navegación intuitiva
- Persistencia automática de datos por perfil

### 🔐 **Gestión Segura de APIs**
- Almacenamiento seguro de credenciales (encriptación local)
- Proxy servidor para conexiones a Bitget API
- Validación y sanitización de credenciales
- Soporte para múltiples cuentas

### 🌙 **Tema Dark/Light**
- Interfaz oscura profesional por defecto
- Tema claro para trabajar en ambientes iluminados
- Toggle rápido sin recarga de página
- Persistencia de preferencia de tema

### 📱 **Responsive Design**
- Fully responsive en desktop, tablet y móvil
- Menú mobile colapsable
- Optimizado para todo tipo de pantallas
- Interfaz touch-friendly

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: Node.js + Express
- **API Externa**: Bitget Trading API
- **Gráficas**: Chart.js
- **Widgets**: TradingView Lightweight Charts
- **Exportación**: html2pdf.js
- **Almacenamiento**: localStorage, sessionStorage
- **Iconos**: Bootstrap Icons

---

## 🚀 Instalación y Uso

### Requisitos Previos
- Node.js v14 o superior
- npm o yarn
- Navegador moderno (Chrome, Firefox, Edge, Safari)

### Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/MikeSobrado/Trading-Dome.git
cd Trading-Dome

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start

# Acceder a la aplicación
# http://localhost:3000
```

### Scripts Disponibles

```bash
# Iniciar servidor
npm start

# Build para producción
npm run build
```

---

## 📱 Módulos de la Aplicación

### **Análisis (Pestaña Análisis)**
- Panel de decisión con indicadores técnicos
- Gestión de indicadores personalizados
- Cálculo automático de señales de trading
- Widget de perfil integrado
- Ideado para esta aplicación

### **Gestión de Riesgo (Pestaña Gestión de Riesgo)**
- Calculadora avanzada de riesgo
- Cálculo de parámetros de operación
- Visualización de resultados en tiempo real
- Selector de perfil integrado
- Ideado para esta aplicación

### **Posiciones (Pestaña Posiciones)**
- Historial de posiciones cerradas
- Tabla con filtrado y búsqueda
- Visualización de ganancias/pérdidas
- Exportación a PDF

### **Posiciones Abiertas (Pestaña Abiertas)**
- Visualización de operaciones activas
- Estadísticas resumen (P&L, margen usado, ratio)
- Auto-actualización cada 5 segundos
- Modal detallado de posición

### **Monitoreo (Pestaña Monitoreo)**
- Estadísticas de trading en tiempo real
- Gráficas de dominancia (BTC, ETH, Altcoins)
- Datos actualizados automáticamente
- Integración con API de Bitget

### **APIs (Pestaña APIs)**
- Gestión segura de credenciales
- Configuración de conexión a Bitget
- Validación de credenciales
- Almacenamiento encriptado local
- Creación de llave rápida

---

## 📊 Estructura del Proyecto

```
Trading-Dome/
├── index.html                          # Página principal
├── app.js                              # Entry point
├── server.js                           # Servidor Node.js
│
├── modules/
│   ├── analisis/                       # Análisis técnico
│   ├── posiciones/                     # Historial de posiciones
│   ├── posiciones-abiertas/           # Posiciones activas
│   ├── riesgo/                         # Gestión de riesgo
│   ├── monitoreo/                      # Monitoreo en tiempo real
│   ├── apis/                           # Gestión de APIs
│   ├── navbar/                         # Navegación
│   └── common/                         # Módulos compartidos
│
├── components/
│   ├── indicators/                     # Componente indicadores
│   ├── charts/                         # Componentes gráficas
│   └── widgets/                        # Widgets reutilizables
│
├── assets/
│   ├── css/                            # Estilos CSS
│   └── images/                         # Imágenes
│
├── styles/
│   ├── variables.css                   # Variables globales
│   └── light-mode.css                  # Tema claro
│
└── package.json                        # Dependencias del proyecto
```

---

## 🌐 Despliegue

### Entornos Disponibles

#### 1. **Localhost (Desarrollo)**
```bash
npm start
# http://localhost:3000
```

#### 2. **GitHub Pages (Estático)**
```bash
git push origin main
```
URL: `https://MikeSobrado.github.io/Trading-Dome`

#### 3. **Render (Producción)**
- Conectado a rama `main`
- Auto-despliegue en cada push
- URL: `https://trading-dome.render.com`

---

## 💾 Almacenamiento de Datos

### sessionStorage
- **sessionData**: Datos de la sesión actual
- **positionsCache**: Caché de posiciones (5 min TTL)
- **statsCache**: Caché de estadísticas (5 min TTL)

### localStorage
- **profiles**: Perfiles de usuario guardados
- **theme**: Preferencia de tema (dark/light)
- **indicators**: Indicadores técnicos personalizados

---

## 🔐 Seguridad

- **Credenciales**: Almacenadas solo localmente (nunca en servidor)
- **Proxy API**: Todas las peticiones pasan por servidor proxy
- **CORS**: Configurado para máxima seguridad
- **Validación**: Sanitización de inputs en todos los formularios
- **HTTPS**: Recomendado para producción

---

## 🐛 Troubleshooting

### Problema: "No se conecta a Bitget API"
**Solución**: 
- Verifica que las credenciales sean correctas
- Comprueba que el proxy esté ejecutándose
- Revisa la consola del navegador (F12)

### Problema: "Datos no se actualizan"
**Solución**:
- Refresca la página (F5)
- Limpia el sessionStorage: `sessionStorage.clear()`
- Verifica la conexión a internet

### Problema: "Tema no persiste"
**Solución**:
- Comprueba que localStorage esté habilitado
- Limpia datos del navegador
- Intenta en otra pestaña

---

## 📝 Licencia

Este proyecto está bajo licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

## 👨‍💻 Autor

**Mike Sobrado**  
GitHub: [@MikeSobrado](https://github.com/MikeSobrado)

---

## 🙏 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📞 Soporte

Si tienes preguntas o encuentras problemas:

1. Revisa los [issues existentes](https://github.com/MikeSobrado/Trading-Dome/issues)
2. Crea un [issue nuevo](https://github.com/MikeSobrado/Trading-Dome/issues/new) con detalles
3. Incluye screenshots o logs si es posible

---

## 🎯 Roadmap Futuro

- [ ] Soporte para múltiples exchanges (Binance, Kraken, OKX)
- [ ] Histórico de análisis y backtest
- [ ] Alertas por email/SMS
- [ ] App móvil nativa
- [ ] Integración con bots de trading
- [ ] Reportes avanzados de performance
- [ ] Colaboración multiusuario en tiempo real

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0.0

```
Trading-Dome/
├── 🌐 FRONTEND (Raíz)
│   ├── index.html                    # Página principal
│   ├── app.js                        # Entry point de la aplicación
│   │
│   ├── modules/                      # Módulos de la aplicación
│   │   ├── common/                   # Utilidades compartidas
│   │   │   ├── event-bus.js          # Sistema de eventos
│   │   │   ├── error-handler.js      # Manejo de errores
│   │   │   ├── validators.js         # Validadores
│   │   │   ├── field-mapper.js       # Mapeo de datos Bitget
│   │   │   └── stats-calculator.js   # Cálculo de estadísticas
│   │   │
│   │   ├── apis/                     # Conectores de API
│   │   │   └── bitget-connector.js   # Proxy para Bitget API
│   │   │
│   │   ├── state/                    # Gestión de estado
│   │   │   └── state-manager.js      # Estado global
│   │   │
│   │   ├── analisis/                 # Análisis técnico
│   │   ├── posiciones/               # Historial de posiciones
│   │   ├── graficas/                 # Gráficas y charts
│   │   ├── riesgo/                   # Gestión de riesgo
│   │   ├── monitoreo/                # Monitoreo en tiempo real
│   │   └── navbar/                   # Navegación
│   │
│   ├── assets/                       # Recursos estáticos
│   │   ├── css/                      # Estilos compilados/globales
│   │   │   ├── main.css
│   │   │   ├── posiciones.css
│   │   │   ├── monitoreo.css
│   │   │   ├── dark-mode.css
│   │   │   └── responsive.css
│   │   └── images/                   # Imágenes del dashboard
│   │
│   ├── styles/                       # Variables y temas globales
│   │   ├── variables.css             # Variables CSS
│   │   └── light-mode.css            # Tema light
│   │
│   ├── lib/                          # Utilidades compartidas
│   │   ├── utils.js
│   │   └── helpers.js
│   │
│   ├── components/                   # Componentes HTML reutilizables
│   │   ├── mobile-menu.html
│   │   ├── sections/
│   │   ├── widgets/
│   │   └── indicators/
│   │
│   └── favicon/                      # Iconos y logos
│       ├── favicon.ico
│       ├── navlogo.png
│       └── site.webmanifest
│
├── 🖥️ BACKEND
│   ├── server.js                     # Express server
│   │   └── CORS habilitado para:
│   │       • http://localhost:3000
│   │       • https://github.com/MikeSobrado
│   │       • https://trading-dome-dashboard.onrender.com
│   │
│   └── Proxy Bitget en /api/bitget
│       └── Firma requests con credenciales del cliente
│
├── 📦 CONFIGURACIÓN & DEPENDENCIAS
│   ├── package.json                  # Dependencies (Express, CORS, node-fetch)
│   ├── package-lock.json
│   ├── netlify.toml                  # Config Netlify
│   └── Llave Segura.json             # ⚠️ Credenciales API (no commitear)
│
├── 📊 DATOS
│   ├── Coins.json                    # Metadata de criptomonedas
│   ├── perfil-*.json                 # Perfiles guardados (generados)
│   └── *.pdf                         # PDFs exportados (generados)
│
├── 📝 DOCUMENTACIÓN
│   ├── README.md                     # Este archivo
│   ├── ARCHITECTURE-PROXY.md         # Arquitectura del proxy
│   ├── DEPLOY-GITHUB-RENDER-PASO-A-PASO.md
│   ├── CREDENCIALES-EXPORT-IMPORT.md
│   ├── PROFILE-EXPORT-IMPORT-GUIDE.md
│   └── BITGET-API-INFO-NECESARIA.md
│
├── 🔧 GIT & DEPLOY
│   ├── .git/                         # Control de versión
│   ├── .gitignore
│   ├── deploy-github.bat             # Script deploy GitHub Pages
│   └── (NO commitear: Llave Segura.json, *.pdf, perfil-*.json)
│
└── src/                              # ⚠️ Vacío (proyecto migrado a raíz)
```

## 🚀 Inicialización

1. **index.html** - Carga `app.js` y todos los módulos
2. **app.js** - Entry point, inicializa módulos comunes
3. **Módulos comunes** - event-bus, error-handler, validators, state-manager
4. **Módulos específicos** - Se cargan bajo demanda (lazy loading)
5. **UI** - Renderización inicial y navegación entre pestañas

## 📡 Comunicación entre módulos

### Event Bus
Los módulos se comunican a través de eventos:

```javascript
// Emitir evento
eventBus.emit('tab:changed', { tabId: 'analisis' });

// Escuchar evento
eventBus.on('tab:changed', (data) => {
  console.log('Tab cambió a:', data.tabId);
});
```

### State Manager
Estado global compartido:

```javascript
// Obtener estado
const state = stateManager.getState();

// Actualizar estado
stateManager.setState({ 
  ui: { currentTab: 'analisis' } 
});

// Suscribirse a cambios
stateManager.subscribe((newState, changes) => {
  console.log('Estado cambió:', changes);
});
```

## ⚙️ Configuración

Ver `modules/config/config.js` para:
- URLs de API
- Timeouts
- Configuración de UI
- Parámetros de trading
- etc.

## 🐛 Manejo de errores

```javascript
// En cualquier módulo:
errorHandler.handleError('MODULE_NAME_ERROR', error, {
  context: 'additional info'
});

// Registrar callback:
errorHandler.onError('API_ERROR', (errorObj) => {
  console.log('Error de API:', errorObj);
});
```

## 📦 Crear un nuevo módulo

Plantilla para nuevo módulo en `modules/nuevo/`:

```javascript
// nuevo.js
class NuevoModule {
  constructor() {
    this.container = null;
  }

  async initialize() {
    console.log('[Nuevo] Inicializando...');
    this.container = document.getElementById('nuevoTab');
    eventBus.on('tab:changed', (data) => this.onTabChanged(data));
    return true;
  }

  onTabChanged(data) {
    if (data.tabId === 'nuevo') this.show();
    else this.hide();
  }

  show() {
    this.container.style.display = 'block';
  }

  hide() {
    this.container.style.display = 'none';
  }
}

const nuevoModule = new NuevoModule();
```

## 🔧 Desarrollo

- Cada módulo es independiente
- Los módulos se comunican por eventos/estado, NO directamente
- Siempre usar errorHandler para errores
- Respetar la estructura de carpetas
- Un archivo JS + un archivo CSS por módulo (mínimo)

## 🚀 Deployment

### Ambientes soportados

**1. Desarrollo Local** (`localhost:3000`)
```bash
npm start
# → node server.js
# → Sirve index.html + assets desde raíz
# → API calls a http://localhost:3000 (mismo servidor)
```

**2. GitHub Pages** (Deploy estático)
```
Flujo:
1. GitHub Pages sirve index.html + assets/
2. bitget-connector.js detecta "github.com" 
3. API calls redirigidas a proxy Render
4. Render responde con datos (CORS habilitado)
```

**3. Render** (Deploy principal)
```
Flujo:
1. npm start → node server.js en Render
2. Express sirve index.html + assets/
3. bitget-connector.js detecta onrender.com
4. API calls a http://localhost:3000 (mismo servidor, sin CORS)
```

### Credenciales (Llave Segura.json)
⚠️ **NUNCA commitear** - Se ignora en `.gitignore`
- Para desarrollo local: crear en raíz
- Para producción: Variables de entorno en Render

## 📝 Notas

- **NO** mezclar lógica de módulos
- Usar camelCase para nombres de módulos
- Usar snake_case para IDs de eventos
- Documentar con comentarios JSDoc
- **Estructura estable**: No mover carpetas sin actualizar referencias
- **src/ vacío**: Proyecto migrado completamente a raíz

### 📋 Producido entre octubre y noviembre de 2025

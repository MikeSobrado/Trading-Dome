const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const BITGET_BASE = 'https://api.bitget.com';

// Configurar CORS para aceptar peticiones desde GitHub Pages y localhost
const corsOptions = {
  origin: function (origin, callback) {
    // Orígenes permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      'https://mikesobrado.github.io',
      'https://MikeSobrado.github.io',
      'https://trading-dome-dashboard.onrender.com',
      'https://trading-dome.netlify.app',
      'https://github.com'
    ];
    
    // En desarrollo, permitir peticiones sin origen (ej: curl, Postman)
    if (!origin || allowedOrigins.some(allowed => origin.includes(allowed)) || origin.includes('.onrender.com')) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked request from origin: ${origin}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Headers de seguridad
app.use((req, res, next) => {
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Servir archivos estáticos desde la raíz
app.use(express.static(path.join(__dirname)));

// Handle preflight requests (CORS)
app.options('*', cors(corsOptions));

/**
 * BITGET PROXY ENDPOINT
 * Recibe credenciales del cliente y firma las peticiones a Bitget
 * Copia exacta del funcionador old/server.js
 */
app.post('/api/bitget', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      apiKey,
      apiSecret,
      apiPassphrase,
      method = 'GET',
      path: endpointPath,
      params = {},
      body: bodyData = '',
      paptrading = '0'
    } = req.body;

    // Validar credenciales
    if (!apiKey || !apiSecret || !apiPassphrase) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'apiKey, apiSecret, y apiPassphrase son requeridos'
      });
    }

    // Validar endpoint
    if (!endpointPath || typeof endpointPath !== 'string') {
      return res.status(400).json({
        error: 'Invalid path',
        message: 'path debe ser una ruta válida de Bitget API'
      });
    }

    // Construir query string si params existe
    let fullPath = endpointPath;
    if (method === 'GET' && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      fullPath = endpointPath + (queryString ? '?' + queryString : '');
    }

    // Generar firma (HMAC-SHA256)
    const timestamp = Date.now().toString();
    const bodyForSignature = method === 'GET' ? '' : (typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    
    const pathForSignature = method === 'GET' ? fullPath : endpointPath;
    const stringToSign = timestamp + method + pathForSignature + bodyForSignature;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(stringToSign)
      .digest('base64');

    // Headers para Bitget
    const bitgetHeaders = {
      'ACCESS-KEY': apiKey,
      'ACCESS-SIGN': signature,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-PASSPHRASE': apiPassphrase,
      'Content-Type': 'application/json'
    };

    // Agregar header paptrading si está en modo demo
    if (paptrading === '1') {
      bitgetHeaders['paptrading'] = '1';
      console.log('🎯 Modo DEMO: Se agregó header paptrading: 1');
    } else {
      console.log('🎯 Modo REAL: Trading en cuenta real');
    }

    console.log('🔐 FIRMA DEBUG:');
    console.log(`   - Timestamp: ${timestamp}`);
    console.log(`   - Method: ${method}`);
    console.log(`   - EndpointPath: ${endpointPath}`);
    console.log(`   - FullPath (con query): ${fullPath}`);
    console.log(`   - PathForSignature: ${pathForSignature}`);
    console.log(`   - Body: "${bodyForSignature}"`);
    console.log(`   - StringToSign: "${stringToSign}"`);
    console.log(`   - Signature: ${signature}`);

    console.log('📤 Headers enviados a Bitget:', {
      'ACCESS-KEY': '***',
      'ACCESS-SIGN': signature.substring(0, 10) + '...',
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-PASSPHRASE': '***'
    });

    // Realizar petición a Bitget
    const BITGET_BASE = 'https://api.bitget.com';
    const url = BITGET_BASE + fullPath;
    console.log(`🔗 [${new Date().toISOString()}] ${method} ${url}`);

    // Crear AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`⏱️ Timeout (15s) en Bitget - abortando fetch`);
      controller.abort();
    }, 15000);

    let bitgetResponse;
    let responseBody;
    
    try {
      bitgetResponse = await fetch(url, {
        method: method,
        headers: bitgetHeaders,
        body: bodyForSignature ? bodyForSignature : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      responseBody = await bitgetResponse.text();
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      
      let errorMsg = fetchErr.message;
      if (fetchErr.name === 'AbortError') {
        errorMsg = 'Timeout al conectar con Bitget (15s)';
      }
      
      console.error(`🚨 Error en fetch Bitget:`, errorMsg);
      return res.status(504).json({
        error: 'Gateway Timeout',
        message: errorMsg,
        timestamp: new Date().toISOString()
      });
    }
    
    const duration = Date.now() - startTime;

    // Log del resultado
    console.log(`✅ [${new Date().toISOString()}] Bitget ${method} ${endpointPath} - ${bitgetResponse.status} (${duration}ms)`);

    // Reenviamos la respuesta exacta de Bitget (sin parsear)
    res.status(bitgetResponse.status)
      .set({ 'Content-Type': 'application/json' })
      .send(responseBody);

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`🚨 Error en proxy Bitget (${duration}ms):`, err.message);

    res.status(502).json({
      error: 'Proxy error',
      message: process.env.NODE_ENV === 'production' ? 'Error al conectar con Bitget' : err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all para SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🔗 Proxy de Bitget disponible en /api/bitget`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🌐 Visit http://localhost:${PORT}`);
  }
});

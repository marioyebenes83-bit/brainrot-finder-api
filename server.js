const express = require('express');
const cors = require('cors');
const app = express();

// ===== CONFIGURACIÓN =====
app.use(cors()); // Permite peticiones desde Roblox
app.use(express.json()); // Permite recibir JSON

// Base de datos temporal en memoria
let serverReports = [];
let totalSearches = 0;

console.log('🧠 Brainrot Finder API iniciando...');

// ===== ENDPOINTS =====

// Página de inicio (verificar que funciona)
app.get('/', (req, res) => {
    res.json({
        status: '✅ ONLINE',
        message: '🧠 Brainrot Finder API funcionando correctamente',
        version: '1.0.0',
        endpoints: {
            report: 'POST /api/report',
            search: 'GET /api/search?pet=NOMBRE&minValue=VALOR',
            reports: 'GET /api/reports',
            stats: 'GET /api/stats'
        },
        stats: {
            totalReports: serverReports.length,
            totalSearches: totalSearches,
            uptime: Math.floor(process.uptime()) + ' segundos'
        }
    });
});

// Endpoint para reportar pets encontrados
app.post('/api/report', (req, res) => {
    try {
        const { jobId, petName, value, playerName, timestamp } = req.body;
        
        // Validar datos
        if (!jobId || !petName || value === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: 'Datos incompletos. Se requiere: jobId, petName, value' 
            });
        }
        
        // Crear reporte
        const report = {
            jobId: String(jobId),
            petName: String(petName),
            value: parseFloat(value),
            playerName: playerName || 'Anónimo',
            timestamp: timestamp || Date.now(),
            reportedAt: new Date().toISOString()
        };
        
        // Limpiar reportes antiguos (más de 10 minutos)
        const now = Date.now();
        const TEN_MINUTES = 10 * 60 * 1000;
        serverReports = serverReports.filter(r => 
            now - r.timestamp < TEN_MINUTES
        );
        
        // Agregar nuevo reporte
        serverReports.push(report);
        
        console.log(`📊 Nuevo reporte: ${petName} = ${value} (Servidor: ${jobId.substring(0, 8)}...)`);
        console.log(`📈 Total reportes activos: ${serverReports.length}`);
        
        res.json({ 
            success: true, 
            message: 'Reporte guardado exitosamente',
            data: {
                reportId: serverReports.length,
                totalActiveReports: serverReports.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error en /api/report:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// Endpoint para buscar mejores servidores
app.get('/api/search', (req, res) => {
    try {
        const { pet, minValue } = req.query;
        
        totalSearches++;
        
        // Validar parámetros
        if (!pet) {
            return res.status(400).json({ 
                found: false, 
                error: 'Falta el parámetro "pet". Ejemplo: /api/search?pet=Huge&minValue=1000000' 
            });
        }
        
        const minVal = parseFloat(minValue) || 0;
        
        console.log(`🔍 Búsqueda #${totalSearches}: "${pet}" (valor mínimo: ${minVal})`);
        
        // Limpiar reportes antiguos
        const now = Date.now();
        const TEN_MINUTES = 10 * 60 * 1000;
        serverReports = serverReports.filter(r => 
            now - r.timestamp < TEN_MINUTES
        );
        
        // Buscar coincidencias
        const matches = serverReports.filter(r => {
            const nameMatch = r.petName.toLowerCase().includes(pet.toLowerCase());
            const valueMatch = r.value >= minVal;
            return nameMatch && valueMatch;
        });
        
        // Si no hay resultados
        if (matches.length === 0) {
            console.log(`❌ Sin resultados para "${pet}"`);
            return res.json({ 
                found: false, 
                searching: true,
                message: `No se encontraron servidores con "${pet}" (valor mínimo: ${minVal})`,
                suggestion: 'Espera unos minutos mientras los usuarios escanean más servidores',
                totalReportsChecked: serverReports.length
            });
        }
        
        // Ordenar por valor descendente
        matches.sort((a, b) => b.value - a.value);
        
        // Preparar resultados
        const results = matches.slice(0, 10).map(r => ({
            jobId: r.jobId,
            petName: r.petName,
            value: r.value,
            playerName: r.playerName,
            minutesAgo: Math.floor((now - r.timestamp) / 60000),
            timestamp: r.timestamp
        }));
        
        console.log(`✅ Encontrados ${matches.length} servidores. Devolviendo top ${results.length}`);
        
        res.json({
            found: true,
            totalMatches: matches.length,
            results: results,
            bestServer: results[0],
            searchStats: {
                totalReportsChecked: serverReports.length,
                matchesFound: matches.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error en /api/search:', error.message);
        res.status(500).json({ 
            found: false, 
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// Endpoint para ver todos los reportes activos
app.get('/api/reports', (req, res) => {
    try {
        const now = Date.now();
        const TEN_MINUTES = 10 * 60 * 1000;
        
        // Limpiar reportes antiguos
        serverReports = serverReports.filter(r => 
            now - r.timestamp < TEN_MINUTES
        );
        
        // Preparar reportes con información adicional
        const reportsWithAge = serverReports.map(r => ({
            ...r,
            minutesAgo: Math.floor((now - r.timestamp) / 60000),
            expiresIn: Math.floor((TEN_MINUTES - (now - r.timestamp)) / 60000) + ' minutos'
        }));
        
        res.json({
            success: true,
            totalReports: reportsWithAge.length,
            reports: reportsWithAge,
            note: 'Los reportes expiran después de 10 minutos'
        });
        
    } catch (error) {
        console.error('❌ Error en /api/reports:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

// Endpoint de estadísticas
app.get('/api/stats', (req, res) => {
    try {
        const now = Date.now();
        const TEN_MINUTES = 10 * 60 * 1000;
        
        // Limpiar reportes antiguos
        serverReports = serverReports.filter(r => 
            now - r.timestamp < TEN_MINUTES
        );
        
        // Calcular estadísticas
        const uniqueServers = new Set(serverReports.map(r => r.jobId)).size;
        const uniquePlayers = new Set(serverReports.map(r => r.playerName)).size;
        const uniquePets = new Set(serverReports.map(r => r.petName)).size;
        
        const avgValue = serverReports.length > 0
            ? serverReports.reduce((sum, r) => sum + r.value, 0) / serverReports.length
            : 0;
        
        const maxValue = serverReports.length > 0
            ? Math.max(...serverReports.map(r => r.value))
            : 0;
        
        res.json({
            success: true,
            statistics: {
                totalReports: serverReports.length,
                uniqueServers: uniqueServers,
                uniquePlayers: uniquePlayers,
                uniquePets: uniquePets,
                averageValue: Math.floor(avgValue),
                maxValue: maxValue,
                totalSearches: totalSearches,
                uptimeSeconds: Math.floor(process.uptime())
            },
            serverInfo: {
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'production',
                nodeVersion: process.version
            }
        });
        
    } catch (error) {
        console.error('❌ Error en /api/stats:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

// Endpoint para limpiar todos los reportes (útil para testing)
app.delete('/api/clear', (req, res) => {
    try {
        const before = serverReports.length;
        serverReports = [];
        totalSearches = 0;
        
        console.log(`🗑️ Base de datos limpiada. Eliminados ${before} reportes.`);
        
        res.json({
            success: true,
            message: `Base de datos limpiada exitosamente`,
            reportsDeleted: before,
            searchesReset: true
        });
        
    } catch (error) {
        console.error('❌ Error en /api/clear:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

// ===== LIMPIEZA AUTOMÁTICA =====

// Limpiar reportes viejos cada 2 minutos
setInterval(() => {
    const before = serverReports.length;
    const now = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000;
    
    serverReports = serverReports.filter(r => 
        now - r.timestamp < TEN_MINUTES
    );
    
    const cleaned = before - serverReports.length;
    if (cleaned > 0) {
        console.log(`🧹 Limpieza automática: ${cleaned} reportes eliminados. Quedan ${serverReports.length}`);
    }
}, 120000); // Cada 2 minutos

// ===== MANEJO DE ERRORES =====

// Errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error.message);
    console.error(error.stack);
});

// Promesas rechazadas
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada:', reason);
});

// ===== INICIAR SERVIDOR =====

const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('='.repeat(50));
    console.log('🧠 BRAINROT FINDER API');
    console.log('='.repeat(50));
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 Endpoints disponibles:`);
    console.log(`   GET  /              - Página de inicio`);
    console.log(`   POST /api/report    - Reportar pet encontrado`);
    console.log(`   GET  /api/search    - Buscar mejores servidores`);
    console.log(`   GET  /api/reports   - Ver todos los reportes`);
    console.log(`   GET  /api/stats     - Estadísticas de uso`);
    console.log(`   DELETE /api/clear   - Limpiar base de datos`);
    console.log('='.repeat(50));
    console.log('');
});
```

4. Baja y en **"Commit new file":**
   - Deja el mensaje: `Create server.js`
   - Click en **"Commit new file"**

---

### **✅ Verificar que los archivos están correctos**

Deberías ver en tu repositorio:
- 📄 `README.md`
- 📄 `package.json`
- 📄 `server.js`

Si los ves, **¡perfecto!** Continuamos.

---

## 🎨 PARTE 2: Desplegar en Render

### **Paso 2.1: Crear Cuenta en Render**

1. Ve a: **https://render.com**

2. Click en **"Get Started"** o **"Sign Up"**

3. **Opciones de registro:**
   - **GitHub** (✅ RECOMENDADO - más fácil)
   - **GitLab**
   - **Email**

4. **Si eliges GitHub:**
   - Click en **"GitHub"**
   - Te redirigirá a GitHub
   - Click en **"Authorize Render"**
   - Puede pedirte tu contraseña de GitHub (escríbela)
   - Te regresará a Render

5. **Completar perfil (si te lo pide):**
   - Name: Tu nombre
   - Click en **"Complete Sign Up"**

6. **¡Listo!** Ya estás en el dashboard de Render

---

### **Paso 2.2: Crear Web Service**

1. En el dashboard de Render, click en **"New +"** (arriba a la derecha)

2. Selecciona **"Web Service"**

3. **Conectar repositorio:**
   - Verás una lista de tus repositorios de GitHub
   - Busca `brainrot-finder-api`
   - Click en **"Connect"** al lado de tu repositorio

   **Si NO ves tu repositorio:**
   - Click en **"Configure account"** (abajo)
   - Te llevará a GitHub
   - En "Repository access" selecciona:
     - **"Only select repositories"**
     - Selecciona `brainrot-finder-api`
   - Click en **"Save"**
   - Regresa a Render y refresca la página

---

### **Paso 2.3: Configurar el Servicio**

Ahora verás un formulario de configuración. Complétalo así:

#### **Sección: Settings**

1. **Name:** `brainrot-finder-api`
   - (Este será parte de tu URL)

2. **Region:** `Frankfurt (EU Central)` o el más cercano a ti
   - Para España: **Frankfurt** es bueno

3. **Branch:** `main`
   - (Debe estar seleccionado automáticamente)

4. **Root Directory:** (déjalo vacío)

5. **Runtime:** `Node`
   - (Debe detectarlo automáticamente)

6. **Build Command:** `npm install`
   - (Debe estar así por defecto)

7. **Start Command:** `npm start`
   - (Debe estar así por defecto)

#### **Sección: Plan**

8. **Instance Type:** Selecciona **"Free"**
   - $0/month
   - 750 horas gratis

#### **Sección: Advanced (opcional, puedes dejarlo)**

9. **Environment Variables:** (déjalo vacío, no necesitas ninguna)

10. **Auto-Deploy:** ✅ Debe estar activado
    - Esto desplegará automáticamente cuando hagas cambios en GitHub

---

### **Paso 2.4: Desplegar**

1. Baja hasta el final de la página

2. Click en el botón azul **"Create Web Service"**

3. **Espera...** Render empezará a:
   - ✅ Clonar tu repositorio
   - ✅ Instalar dependencias (`npm install`)
   - ✅ Iniciar el servidor (`npm start`)

4. Verás los logs en tiempo real. Debes ver algo como:
```
==> Cloning from https://github.com/tu-usuario/brainrot-finder-api...
==> Running 'npm install'
added 50 packages
==> Running 'npm start'

==================================================
🧠 BRAINROT FINDER API
==================================================
✅ Servidor corriendo en puerto 10000
🌐 Endpoints disponibles:
   GET  /              - Página de inicio
   POST /api/report    - Reportar pet encontrado
   ...
==================================================

==> Your service is live 🎉
```

5. Cuando veas **"Your service is live 🎉"**, ¡está funcionando!

---

### **Paso 2.5: Obtener tu URL**

1. En la parte superior de la página, verás tu URL:
```
   https://brainrot-finder-api.onrender.com

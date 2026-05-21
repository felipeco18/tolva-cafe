# INSTRUCCIONES DE DESPLIEGUE — Tolva de Café
## Universidad Católica de Pereira · Circuitos I · 2026

---

## RESUMEN DEL FLUJO COMPLETO

```
Arduino UNO
    │ Serial (D0/D1)
    ▼
  ESP-32  ─── WiFi ───▶  Firebase Realtime DB
                               │
                               │ Real-time
                               ▼
                         App Web (GitHub Pages)
                     https://usuario.github.io/tolva-cafe
```

---

## PARTE 1 — CREAR PROYECTO FIREBASE (GRATIS)

### Paso 1.1 — Crear cuenta y proyecto

1. Ir a **https://console.firebase.google.com**
2. Iniciar sesión con una cuenta Google (Gmail)
3. Clic en **"Crear un proyecto"**
4. Nombre del proyecto: `tolva-cafe` (o cualquier nombre)
5. Desactivar Google Analytics → clic en **Crear proyecto**
6. Esperar ~30 segundos → clic en **Continuar**

### Paso 1.2 — Crear la base de datos

1. En el menú izquierdo → **Compilación** → **Realtime Database**
2. Clic en **"Crear una base de datos"**
3. Ubicación: **Estados Unidos** (la más rápida)
4. Modo de seguridad: elegir **"Modo de prueba"** → Siguiente
   (permite leer y escribir sin autenticación — perfecto para el proyecto)
5. Clic en **Habilitar**
6. Copiar la URL que aparece arriba, tiene este formato:
   `https://tolva-cafe-XXXXX-default-rtdb.firebaseio.com`
   ← **Guardar esta URL, la necesitamos después**

### Paso 1.3 — Obtener la configuración para la app web

1. En el panel de Firebase → clic en el ícono de engranaje ⚙️ → **Configuración del proyecto**
2. Bajar hasta la sección **"Tus apps"**
3. Si no hay ninguna app, clic en el ícono **`</>`** (Web)
4. Nombre de la app: `tolva-web` → clic en **Registrar app**
5. Aparece un bloque de código como este — **copiar todo el objeto firebaseConfig**:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "tolva-cafe-XXXXX.firebaseapp.com",
  databaseURL: "https://tolva-cafe-XXXXX-default-rtdb.firebaseio.com",
  projectId: "tolva-cafe-XXXXX",
  storageBucket: "tolva-cafe-XXXXX.appspot.com",
  messagingSenderId: "XXXXXXXXXXXX",
  appId: "1:XXXXXXXXXXXX:web:XXXXXXXXXXXXXXXX"
};
```

---

## PARTE 2 — CONFIGURAR EL ESP32

### Paso 2.1 — Editar el archivo esp32_tolva_wifi.ino

Abrir el archivo `esp32_tolva_wifi/esp32_tolva_wifi.ino` y cambiar estas 3 líneas:

```cpp
const char* WIFI_SSID  = "TU_WIFI_NOMBRE";      // ← nombre real del WiFi
const char* WIFI_PASS  = "TU_WIFI_CONTRASEÑA";  // ← contraseña real
const char* FB_HOST    = "https://tolva-cafe-XXXXX-default-rtdb.firebaseio.com";
// ↑ pegar la URL de Firebase del paso 1.2
```

### Paso 2.2 — Subir el código al ESP32

1. En Arduino IDE: **Herramientas → Placa → ESP32 Dev Module**
2. **Herramientas → Puerto → COM4** (el del ESP32)
3. Abrir `esp32_tolva_wifi.ino`
4. Clic en **→ Subir**
5. Cuando aparezca `Connecting.....` → presionar botón **BOOT** del ESP32
6. Soltar cuando aparezca la barra de progreso

### Paso 2.3 — Verificar en Monitor Serial (115200 baudios)

Debe aparecer algo así:
```
==============================================
  ESP32 — Tolva de Café · WiFi + Firebase
==============================================
Conectando a WiFi: MiRedWiFi
..........
WiFi conectado!
IP: 192.168.1.XXX
Sistema listo. Esperando datos del Arduino...
[Arduino]: FC37=965 Lluvia=NO Hum=69% Temp=28C ...
[Arduino]: {"lluvia":0,"humedad":69,"temp":28,"techo":0}
Enviando a Firebase: {"lluvia":0,"humedad":69,"temp":28,"techo":0,"fc37":965,"ts":12345}
Firebase OK: 200
```

### Paso 2.4 — Verificar en Firebase Console

1. Ir a Firebase Console → Realtime Database
2. Debe aparecer esta estructura de datos actualizándose en tiempo real:
```json
{
  "tolva": {
    "lluvia": 0,
    "humedad": 69,
    "temp": 28,
    "techo": 0,
    "fc37": 965,
    "ts": 1234567890
  }
}
```

---

## PARTE 3 — CONFIGURAR LA APP WEB

### Paso 3.1 — Editar app.js

Abrir `app.js` y reemplazar el bloque FIREBASE_CONFIG con los datos reales:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain:        "tolva-cafe-XXXXX.firebaseapp.com",
  databaseURL:       "https://tolva-cafe-XXXXX-default-rtdb.firebaseio.com",
  projectId:         "tolva-cafe-XXXXX",
  storageBucket:     "tolva-cafe-XXXXX.appspot.com",
  messagingSenderId: "XXXXXXXXXXXX",
  appId:             "1:XXXXXXXXXXXX:web:XXXXXXXXXXXXXXXX"
};
```

La línea `const MODO_DEMO = ...` detecta automáticamente si está configurado.
Cuando el apiKey ya no sea "YOUR_API_KEY", activa Firebase solo.

### Paso 3.2 — Probar localmente

Abrir `index.html` en Chrome. Si Firebase está bien configurado, el indicador
en la esquina superior derecha debe decir **"Datos en vivo · Firebase"** en verde.

---

## PARTE 4 — DESPLEGAR EN GITHUB PAGES (GRATIS, CON LINK PÚBLICO)

### Paso 4.1 — Crear cuenta en GitHub

1. Ir a **https://github.com** → Sign up
2. Elegir un nombre de usuario (será parte de la URL)
3. Verificar el correo

### Paso 4.2 — Crear repositorio

1. Clic en el botón verde **New** (o **+** → New repository)
2. Repository name: `tolva-cafe`
3. Seleccionar **Public**
4. NO marcar ninguna casilla adicional
5. Clic en **Create repository**

### Paso 4.3 — Subir los archivos de la app

En la página del repositorio vacío → clic en **"uploading an existing file"**

Subir estos 3 archivos (SOLO ESTOS TRES):
- `index.html`
- `style.css`
- `app.js`

Clic en **Commit changes**

### Paso 4.4 — Activar GitHub Pages

1. En el repositorio → pestaña **Settings** (arriba a la derecha)
2. En el menú izquierdo → **Pages**
3. En "Branch" → seleccionar **main** → carpeta **/ (root)**
4. Clic en **Save**
5. Esperar 1-2 minutos
6. Aparece el link:
   `https://TU-USUARIO.github.io/tolva-cafe`

¡Ese link funciona desde cualquier celular o computador del mundo!

---

## PARTE 5 — FLUJO COMPLETO EN FUNCIONAMIENTO

Una vez todo configurado:

1. **Arduino UNO** lee sensores y envía datos cada 2 segundos por Serial
2. **ESP32** recibe los datos, se conecta al WiFi y los sube a Firebase
3. **Firebase** almacena los datos en tiempo real
4. **App web** (en el link de GitHub Pages) escucha Firebase y actualiza
   la pantalla instantáneamente sin recargar
5. Desde cualquier celular con el link, se ve el estado del techo,
   temperatura, humedad y lluvia en tiempo real

---

## REGLAS DE FIREBASE (para más seguridad — opcional)

En Firebase Console → Realtime Database → Reglas, pegar esto:
```json
{
  "rules": {
    "tolva": {
      ".read": true,
      ".write": true
    }
  }
}
```

---

## RESUMEN DE ARCHIVOS

| Archivo                            | Qué hace                                      |
|------------------------------------|-----------------------------------------------|
| `index.html`                       | App web — estructura HTML                     |
| `style.css`                        | App web — diseño visual                       |
| `app.js`                           | App web — lógica + Firebase real-time         |
| `esp32_tolva_wifi.ino`             | Firmware ESP32 — WiFi + Firebase REST API     |

---

*Proyecto: Tolva de Café · Universidad Católica de Pereira · Circuitos I 2026*
*Equipo: Alejandro Piedrahita, Daniel Colorado, Sebastián Patiño*
*Docente: Eliana Piedrahita*

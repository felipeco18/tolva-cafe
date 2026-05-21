// ================================================================
// ESP-32 — Tolva Café · WiFi + Firebase
// Universidad Católica de Pereira — Circuitos I 2026
// Equipo: Alejandro Piedrahita · Daniel Colorado · Sebastián Patiño
// ================================================================
// Recibe datos del Arduino UNO por Serial2 y los sube a Firebase
// en tiempo real para que la app web los muestre.
//
// CONEXIONES FÍSICAS:
//   ESP32 RX2 (GPIO16) ← Arduino TX (D1) · con resistencia 1kΩ
//   ESP32 TX2 (GPIO17) → Arduino RX (D0) · directo
//   ESP32 GND ← Riel azul de la protoboard
//
// *** CONFIGURAR ESTAS 3 VARIABLES ANTES DE SUBIR ***
// ================================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>

// ─── CONFIGURACIÓN — CAMBIAR ESTOS DATOS ──────────────────────
const char* WIFI_SSID  = "DC";               // Nombre de tu red WiFi
const char* WIFI_PASS  = "2708david.";       // Contraseña WiFi
const char* FB_HOST    = "https://tolva-cafe-4eb9e-default-rtdb.firebaseio.com";
// Ejemplo: "https://tolva-cafe-abc12-default-rtdb.firebaseio.com"
// ──────────────────────────────────────────────────────────────

#define RX2_PIN 16   // ESP32 recibe del Arduino TX
#define TX2_PIN 17   // ESP32 envía al Arduino RX

HardwareSerial SerialArduino(2);  // UART2 del ESP32

// Variables de estado
int    lastFC37       = 900;
String ultimoComando  = "";
unsigned long tUltimaEnvio  = 0;
unsigned long tUltimoCmd    = 0;
const unsigned long INTERVALO_FIREBASE = 2000;  // cada 2 segundos
const unsigned long INTERVALO_CMD      = 5000;  // revisar comandos cada 5s

// ─── WIFI ─────────────────────────────────────────────────────
void conectarWifi() {
  Serial.print("Conectando a WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi conectado!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi FALLO — modo sin conexión activo");
  }
}

// ─── FIREBASE PUT (sube datos del sensor) ─────────────────────
void enviarFirebase(String json) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sin WiFi, datos no enviados");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();  // sin verificación SSL (ok para proyecto)

  HTTPClient http;
  String url = String(FB_HOST) + "/tolva.json";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  int codigo = http.PUT(json);

  if (codigo == 200 || codigo == 204) {
    Serial.println("Firebase OK: " + String(codigo));
  } else {
    Serial.println("Firebase ERROR: " + String(codigo));
  }
  http.end();
}

// ─── FIREBASE GET (lee comandos manuales de la app) ────────────
String leerComandoFirebase() {
  if (WiFi.status() != WL_CONNECTED) return "";

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(FB_HOST) + "/tolva/comando.json";
  http.begin(client, url);

  int codigo = http.GET();
  String resp = "";

  if (codigo == 200) {
    resp = http.getString();
    resp.replace("\"", "");  // quitar comillas del string JSON
    resp.trim();
    if (resp == "null") resp = "";
  }
  http.end();
  return resp;
}

// ─── FIREBASE — limpiar comando ya ejecutado ──────────────────
void limpiarComandoFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(FB_HOST) + "/tolva/comando.json";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.PUT("null");
  http.end();
}

// ─── SETUP ────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("==============================================");
  Serial.println("  ESP32 — Tolva de Café · WiFi + Firebase");
  Serial.println("==============================================");

  // Inicializar comunicación con el Arduino
  SerialArduino.begin(9600, SERIAL_8N1, RX2_PIN, TX2_PIN);
  Serial.println("Serial2 listo (Arduino)");

  // Conectar WiFi
  conectarWifi();
  Serial.println("Sistema listo. Esperando datos del Arduino...");
}

// ─── LOOP ─────────────────────────────────────────────────────
void loop() {

  // --- Reconectar WiFi si se perdió ---
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi perdido, reconectando...");
    conectarWifi();
  }

  // --- Leer líneas del Arduino ---
  if (SerialArduino.available()) {
    String linea = SerialArduino.readStringUntil('\n');
    linea.trim();

    if (linea.length() == 0) return;

    Serial.println("[Arduino]: " + linea);

    // Extraer valor FC37 de la línea de texto plano
    // Ejemplo: "FC37=965 Lluvia=NO Hum=69% Temp=28C ..."
    if (linea.startsWith("FC37=")) {
      int ini = linea.indexOf('=') + 1;
      int fin = linea.indexOf(' ', ini);
      if (fin < 0) fin = linea.length();
      lastFC37 = linea.substring(ini, fin).toInt();
    }

    // Cuando llega el JSON del Arduino, enviarlo a Firebase
    // Ejemplo: {"lluvia":0,"humedad":69,"temp":28,"techo":0}
    if (linea.startsWith("{") && millis() - tUltimaEnvio >= INTERVALO_FIREBASE) {
      tUltimaEnvio = millis();

      // Agregar fc37 y timestamp al JSON antes de enviarlo
      // Quitamos el "}" final y agregamos los campos extra
      String jsonCompleto = linea.substring(0, linea.length() - 1)
                          + ",\"fc37\":"  + String(lastFC37)
                          + ",\"ts\":"    + String(millis())
                          + "}";

      Serial.println("Enviando a Firebase: " + jsonCompleto);
      enviarFirebase(jsonCompleto);
    }
  }

  // --- Revisar comandos manuales desde la app web ---
  // La app escribe en Firebase: /tolva/comando = "ABRIR" o "CERRAR"
  if (millis() - tUltimoCmd >= INTERVALO_CMD) {
    tUltimoCmd = millis();

    String cmd = leerComandoFirebase();

    if (cmd.length() > 0 && cmd != ultimoComando) {
      ultimoComando = cmd;
      Serial.println("Comando recibido de app: " + cmd);

      // Reenviar comando al Arduino por Serial2
      // El Arduino debe leer "CMD:ABRIR" o "CMD:CERRAR" en su loop
      SerialArduino.println("CMD:" + cmd);

      // Limpiar el comando en Firebase para no ejecutarlo dos veces
      limpiarComandoFirebase();
      ultimoComando = "";
    }
  }

  delay(10);
}

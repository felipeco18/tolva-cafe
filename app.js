// ================================================================
// TOLVA DE CAFÉ — Lógica de la aplicación
// Universidad Católica de Pereira — Circuitos I 2026
// ================================================================
//
// *** PASO 1: PEGAR AQUÍ LA CONFIGURACIÓN DE FIREBASE ***
// (La encuentras en Firebase Console > Configuración del proyecto
//  > Tus apps > Config)
//
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBzLTaRQoQailHjeQRP9eW-36nLNLDwuGo",
  authDomain:        "tolva-cafe-4eb9e.firebaseapp.com",
  databaseURL:       "https://tolva-cafe-4eb9e-default-rtdb.firebaseio.com",
  projectId:         "tolva-cafe-4eb9e",
  storageBucket:     "tolva-cafe-4eb9e.firebasestorage.app",
  messagingSenderId: "539429982071",
  appId:             "1:539429982071:web:05054159929a603c1e5b72"
};
//
// Cuando pegues los datos reales, cambia MODO_DEMO a false:
const MODO_DEMO = false; // Firebase configurado
// ================================================================

// ─── ESTADO GLOBAL ─────────────────────────────────────────────
const state = {
  rain:       false,
  fc37:       820,
  humidity:   65,
  temperature:24,
  roofState: 'ABIERTO',  // ABIERTO | CERRANDO | CERRADO | ABRIENDO
  mode:      'AUTOMATICO',
  history:   [],
  events:    [],
  firebaseOK: false
};

const UMBRAL_LLUVIA   = 500;
const UMBRAL_HUM_CER  = 75;
const DURACION_MOTOR  = 3000;

// ─── ELEMENTOS DOM ─────────────────────────────────────────────
const el = {
  heroState:      document.getElementById('hero-state'),
  heroCondition:  document.getElementById('hero-condition'),
  heroTime:       document.getElementById('hero-time'),
  roofSlider:     document.getElementById('roof-slider'),
  connPill:       document.getElementById('connection-pill'),
  connText:       document.getElementById('connection-text'),

  valueRain:      document.getElementById('value-rain'),
  metaRain:       document.getElementById('meta-rain'),
  barRain:        document.getElementById('bar-rain'),
  cardRain:       document.getElementById('card-rain'),

  valueHumidity:  document.getElementById('value-humidity'),
  metaHumidity:   document.getElementById('meta-humidity'),
  barHumidity:    document.getElementById('bar-humidity'),

  valueTemp:      document.getElementById('value-temp'),
  metaTemp:       document.getElementById('meta-temp'),
  barTemp:        document.getElementById('bar-temp'),

  valueRoof:      document.getElementById('value-roof'),
  metaRoof:       document.getElementById('meta-roof'),
  cardRoof:       document.getElementById('card-roof'),
  barRoof:        document.getElementById('bar-roof'),

  modeValue:      document.getElementById('mode-value'),
  btnOpen:        document.getElementById('btn-open'),
  btnClose:       document.getElementById('btn-close'),
  btnAuto:        document.getElementById('btn-auto'),

  eventsList:     document.getElementById('events-list'),

  chartGrid:      document.getElementById('chart-grid'),
  chartTempLine:  document.getElementById('chart-temp-line'),
  chartTempArea:  document.getElementById('chart-temp-area'),
  chartHumLine:   document.getElementById('chart-hum-line'),
  chartHumArea:   document.getElementById('chart-hum-area'),
};

// ─── RENDER COMPLETO ───────────────────────────────────────────
function renderAll() {
  renderHero();
  renderMetrics();
  renderChart();
  renderButtons();
}

function renderHero() {
  const labels = {
    ABIERTO:  ['ABIERTO',  'Condiciones favorables · Café secándose'],
    CERRANDO: ['CERRANDO', 'Lluvia detectada · Protegiendo el grano'],
    CERRADO:  ['CERRADO',  'Techo cerrado · Grano protegido'],
    ABRIENDO: ['ABRIENDO', 'Condición seca · Reabriendo para secar']
  };
  const [label, cond] = labels[state.roofState] || labels.ABIERTO;

  el.heroState.textContent = label;
  el.heroCondition.textContent = cond;

  // Animación del techo en el SVG
  const targetY = (state.roofState === 'CERRADO' || state.roofState === 'CERRANDO') ? 20 : 40;
  const slider = el.roofSlider;
  slider.style.transition = 'transform 1s ease';
  slider.style.transform = `translateY(${targetY - 40}px)`;
}

function renderMetrics() {
  // Lluvia
  el.valueRain.textContent = state.rain ? 'SÍ' : 'NO';
  el.metaRain.textContent = `Sensor FC-37 leyendo ${state.fc37}`;
  el.barRain.style.width = state.rain ? '90%' : `${Math.max(0, 100 - (state.fc37 / 10.23))}%`;
  el.cardRain.classList.toggle('metric-alert', state.rain);

  // Humedad
  el.valueHumidity.textContent = state.humidity;
  const humLabel = state.humidity >= 75 ? 'Alta — techo se cerrará' :
                   state.humidity >= 60 ? 'Moderada · Lectura normal' : 'Baja · Secado activo';
  el.metaHumidity.textContent = `DHT11 · ${humLabel}`;
  el.barHumidity.style.width = `${state.humidity}%`;

  // Temperatura
  el.valueTemp.textContent = state.temperature;
  const tempLabel = state.temperature > 30 ? 'Cálido · Secado rápido' :
                    state.temperature > 20 ? 'Rango normal' : 'Fresco · Secado lento';
  el.metaTemp.textContent = `DHT11 · ${tempLabel}`;
  el.barTemp.style.width = `${Math.min(100, (state.temperature / 40) * 100)}%`;

  // Techo
  el.valueRoof.textContent = state.roofState;
  const roofMeta = {
    ABIERTO:  'Café recibiendo sol directo',
    CERRANDO: 'Motor activo · cerrando',
    CERRADO:  'Grano protegido',
    ABRIENDO: 'Motor activo · abriendo'
  };
  el.metaRoof.textContent = roofMeta[state.roofState] || '';
  el.barRoof.style.width = state.roofState === 'CERRADO' ? '100%' :
                            state.roofState === 'ABIERTO' ? '5%'  : '50%';
  el.cardRoof.classList.toggle('metric-alert', state.roofState === 'CERRADO' || state.roofState === 'CERRANDO');

  // Modo
  el.modeValue.textContent = state.mode;
}

function renderButtons() {
  const enMovimiento = state.roofState === 'CERRANDO' || state.roofState === 'ABRIENDO';
  el.btnOpen.disabled  = enMovimiento || state.roofState === 'ABIERTO';
  el.btnClose.disabled = enMovimiento || state.roofState === 'CERRADO';
  el.btnAuto.disabled  = state.mode === 'AUTOMATICO';
}

// ─── BARRA DE CONEXIÓN ─────────────────────────────────────────
function setConexion(tipo) {
  // tipo: 'live' | 'demo' | 'error'
  const configs = {
    live:  { text: 'Datos en vivo · Firebase',  color: '#2E7D55' },
    demo:  { text: 'Modo demo · sin Firebase',   color: '#A85432' },
    error: { text: 'Error de conexión',          color: '#c0392b' }
  };
  const c = configs[tipo] || configs.demo;
  el.connText.textContent = c.text;
  el.connPill.style.background = c.color + '22';
  el.connPill.querySelector('.status-dot').style.background = c.color;
}

// ─── HISTORIAL / CHART ─────────────────────────────────────────
function agregarAlHistorial(temp, hum) {
  // Ignorar lecturas con valores cero o inválidos (DHT11 en error)
  if (!temp || !hum || temp <= 0 || hum <= 0) return;
  state.history.push({ t: Date.now(), temp, hum });
  if (state.history.length > 30) state.history.shift();
}

function renderChart() {
  // Filtrar puntos con valores inválidos antes de graficar
  const pts = state.history.filter(p => p.temp > 0 && p.hum > 0 && isFinite(p.temp) && isFinite(p.hum));
  if (pts.length < 2) return;

  const W = 800, H = 280, padT = 20, padB = 30, padL = 10, padR = 10;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const mapX = i => padL + (i / (pts.length - 1)) * innerW;
  const mapY = (v, min, max) => padT + innerH - ((v - min) / (max - min + 1)) * innerH;

  const allTemps = pts.map(p => p.temp);
  const allHums  = pts.map(p => p.hum);
  const tMin = Math.min(...allTemps) - 2, tMax = Math.max(...allTemps) + 2;
  const hMin = Math.min(...allHums)  - 5, hMax = Math.max(...allHums)  + 5;

  const tPts = pts.map((p, i) => ({ x: mapX(i), y: mapY(p.temp, tMin, tMax) }));
  const hPts = pts.map((p, i) => ({ x: mapX(i), y: mapY(p.hum,  hMin, hMax) }));

  const line = arr => arr.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = (lineD, arr) => lineD + ` L${arr[arr.length-1].x.toFixed(1)} ${H-padB} L${arr[0].x.toFixed(1)} ${H-padB} Z`;

  const tLine = line(tPts), hLine = line(hPts);

  el.chartTempLine.setAttribute('d', tLine);
  el.chartTempArea.setAttribute('d', area(tLine, tPts));
  el.chartHumLine.setAttribute('d', hLine);
  el.chartHumArea.setAttribute('d', area(hLine, hPts));
}

// ─── BITÁCORA DE EVENTOS ───────────────────────────────────────
function addEvent(msg, tipo = 'sensor') {
  const icons = { sensor: '🌡', system: '⚙️', motor: '⚡' };
  const now = new Date();
  const time = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  state.events.unshift({ msg, tipo, time });
  if (state.events.length > 10) state.events.pop();

  el.eventsList.innerHTML = state.events.map(e =>
    `<li class="event-item event-${e.tipo}">
      <span class="event-icon">${icons[e.tipo] || '·'}</span>
      <span class="event-msg">${e.msg}</span>
      <span class="event-time">${e.time}</span>
    </li>`
  ).join('');
}

// ─── LÓGICA AUTOMÁTICA (demo mode) ────────────────────────────
let motorTimer = null;

function iniciarMovimiento(hacia) {
  state.roofState = hacia;
  clearTimeout(motorTimer);
  motorTimer = setTimeout(() => {
    state.roofState = hacia === 'CERRANDO' ? 'CERRADO' : 'ABIERTO';
    addEvent(`Techo <strong>${state.roofState}</strong>`, 'motor');
    renderAll();
  }, DURACION_MOTOR);
}

function simularLectura() {
  // Simula variaciones realistas de los sensores
  state.fc37     = Math.max(0, Math.min(1023, state.fc37 + (Math.random() - 0.5) * 60));
  state.humidity = Math.max(20, Math.min(95, state.humidity + (Math.random() - 0.49) * 1.5));
  state.temperature = Math.max(15, Math.min(38, state.temperature + (Math.random() - 0.5) * 0.8));
  state.rain = state.fc37 < UMBRAL_LLUVIA;

  agregarAlHistorial(state.temperature, state.humidity);

  const debeCerrar = state.rain || state.humidity >= UMBRAL_HUM_CER;

  if (state.mode === 'AUTOMATICO') {
    if (debeCerrar && state.roofState === 'ABIERTO') {
      iniciarMovimiento('CERRANDO');
      addEvent(`Lluvia/humedad detectada · <strong>cerrando techo</strong>`, 'motor');
    } else if (!debeCerrar && state.roofState === 'CERRADO') {
      iniciarMovimiento('ABRIENDO');
      addEvent(`Condición seca · <strong>abriendo techo</strong>`, 'motor');
    }
  }

  renderAll();
}

// ─── RELOJ ─────────────────────────────────────────────────────
function formatTime(d) {
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(() => { el.heroTime.textContent = formatTime(new Date()); }, 1000);

// ─── FIREBASE — MODO EN VIVO ───────────────────────────────────
function iniciarFirebase() {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    const db = firebase.database();

    // Escuchar cambios en tiempo real en /tolva
    db.ref('tolva').on('value', (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const estadosRoof = ['ABIERTO', 'CERRANDO', 'CERRADO', 'ABRIENDO'];
      const prevRoof = state.roofState;

      state.rain        = data.lluvia === 1;
      state.fc37        = data.fc37   !== undefined ? data.fc37   : (data.lluvia ? 100 : 900);
      state.humidity    = data.humedad || 0;
      state.temperature = data.temp   || 0;
      state.roofState   = estadosRoof[data.techo] || 'ABIERTO';

      agregarAlHistorial(state.temperature, state.humidity);

      // Registrar eventos relevantes
      if (state.rain && !state.rain_prev) {
        addEvent('Lluvia detectada · FC-37 = ' + state.fc37, 'sensor');
      }
      if (state.roofState !== prevRoof) {
        addEvent(`Techo cambió a <strong>${state.roofState}</strong>`, 'motor');
      }
      state.rain_prev = state.rain;

      setConexion('live');
      state.firebaseOK = true;
      renderAll();
    }, (error) => {
      console.error('Firebase error:', error);
      setConexion('error');
    });

    // Botón Abrir → escribe comando en Firebase
    el.btnOpen.addEventListener('click', () => {
      if (el.btnOpen.disabled) return;
      db.ref('tolva/comando').set('ABRIR');
      state.mode = 'MANUAL';
      addEvent('<strong>Manual:</strong> comando ABRIR enviado', 'system');
      renderAll();
    });

    // Botón Cerrar
    el.btnClose.addEventListener('click', () => {
      if (el.btnClose.disabled) return;
      db.ref('tolva/comando').set('CERRAR');
      state.mode = 'MANUAL';
      addEvent('<strong>Manual:</strong> comando CERRAR enviado', 'system');
      renderAll();
    });

    // Botón Auto
    el.btnAuto.addEventListener('click', () => {
      db.ref('tolva/comando').set('AUTO');
      state.mode = 'AUTOMATICO';
      addEvent('<strong>Modo automático</strong> reactivado', 'system');
      renderAll();
    });

    addEvent('Firebase conectado · datos en vivo activos', 'system');
    console.log('Firebase inicializado correctamente');

  } catch (e) {
    console.error('Error iniciando Firebase:', e);
    setConexion('error');
    iniciarModoDemo();
  }
}

// ─── DEMO — MODO SIN FIREBASE ──────────────────────────────────
function iniciarModoDemo() {
  setConexion('demo');

  el.btnOpen.addEventListener('click', () => {
    if (el.btnOpen.disabled) return;
    state.mode = 'MANUAL';
    if (state.roofState === 'CERRADO' || state.roofState === 'ABIERTO') {
      iniciarMovimiento('ABRIENDO');
      addEvent('<strong>Manual demo:</strong> abriendo techo', 'system');
    }
  });

  el.btnClose.addEventListener('click', () => {
    if (el.btnClose.disabled) return;
    state.mode = 'MANUAL';
    if (state.roofState === 'ABIERTO' || state.roofState === 'CERRADO') {
      iniciarMovimiento('CERRANDO');
      addEvent('<strong>Manual demo:</strong> cerrando techo', 'system');
    }
  });

  el.btnAuto.addEventListener('click', () => {
    state.mode = 'AUTOMATICO';
    addEvent('<strong>Automático</strong> reactivado', 'system');
    renderAll();
  });

  setInterval(simularLectura, 2000);
  addEvent('Modo demo activo · configure Firebase para datos reales', 'system');
}

// ─── INICIALIZACIÓN ────────────────────────────────────────────
function init() {
  // Histórico inicial para que el gráfico no arranque vacío
  const ahora = Date.now();
  for (let i = 0; i < 20; i++) {
    state.history.push({
      t:    ahora - (20 - i) * 60000,
      temp: 22 + Math.sin(i / 3) * 2 + Math.random() * 1.5,
      hum:  60 + Math.cos(i / 4) * 8 + Math.random() * 3
    });
  }

  addEvent('Sistema <strong>iniciado correctamente</strong>', 'system');
  addEvent('Sensores DHT11 y FC-37 <strong>conectados</strong>', 'sensor');
  addEvent('Pantalla OLED <strong>en línea</strong> · 0x3C', 'system');

  if (MODO_DEMO) {
    console.warn('Firebase no configurado — modo demo activo');
    iniciarModoDemo();
  } else {
    console.log('Iniciando Firebase...');
    iniciarFirebase();
  }

  renderAll();
}

init();

/* ============================================================
   CALA — un Townscaper ambientat a la Costa Brava
   ------------------------------------------------------------
   El codi és repartit en scripts clàssics (no mòduls) que
   comparteixen les variables globals, i per això funciona
   obrint index.html directament. S'han de carregar en aquest
   ordre, perquè el codi que s'executa en carregar-se només
   pot fer servir el que ja s'ha carregat abans:

     base.js              utilitats, paleta de colors i mides
     quadricula.js        la quadrícula irregular
     geometria.js         parets, finestres, vegetació, mobiliari, torres
     platja-ponts.js      platja i ponts
     cobertes-carrers.js  cantonades, voltes, cobertes, carrers i escales
     poble.js             estat del poble, anàlisi i construcció de la malla
     escena.js            llums, mar, barques, gavines, dia i nit
     controls.js          ressaltat, càmera, ratolí i tàctil, botons, teclat
     partida.js           desar, desfer i exportar
     main.js              bucle d'animació i arrencada
   ============================================================ */

/* Cala · utilitats, paleta de colors i mides */

/* ---------- 1. Utilitats ---------- */

function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash3(a,b,c){
  let h = (a*73856093) ^ (b*19349663) ^ (c*83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function shuffle(arr, rnd){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(rnd()*(i+1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
function C(hex){ const c = new THREE.Color(hex); c.convertSRGBToLinear(); return [c.r,c.g,c.b]; }

/* ---------- 3. Paleta ---------- */

// paleta triable per a les façanes (calç, sorra, ocre, rosa vell, blau i verd pàl·lids)
const PALETA_HEX = ['#f7f2e8','#e9dcc2','#e0bb7c','#cf9042','#c2734f','#b55648',
                    '#e3a8a2','#a8c3cf','#5f93a8','#9fb58c','#5d7f63'];
const PALETA_NOMS = ['Calç','Sorra','Ocre clar','Ocre','Terracota','Almagre',
                     'Rosa vell','Blau pàl·lid','Blau mar','Verd sàlvia','Verd pi'];
const PALETA = PALETA_HEX.map(C);
const PARETS = ['#f6f1e6','#efe7d6','#eadfc9','#e9d9c2','#f0e2dc','#e3e6e2','#f3ece0'].map(C);
const TEULES = ['#bd5b3b','#c9714a','#b04f37','#c86747'].map(C);
const ROCA_A = C('#8b8375'), ROCA_B = C('#6f6a5e');
const BLAU   = C('#2f6f8f');   // porticons
const FOSC   = C('#3a3630');   // buit de finestra
const FUSTA  = C('#8a6b4a');
const VERD   = C('#3d5a45');
const TERRA  = C('#c9bda6');
const LLOSA  = ['#bcb3a3','#b2a898','#c5bcac','#a79d8d'].map(C);  // llambordes
const TEST   = C('#b06a45');   // test de terracota
const BUGA   = C('#c2467d');   // buguenvíl·lea
const LLUM   = C('#f7e2b0');   // fanal encès
const FERRO  = C('#2b2825');   // forja de fanals i baranes
const PEDRA  = C('#dccfb4');   // marcs, ampits i bancs de pedra
const MARC   = C('#fbf8f1');   // marcs emblanquinats
const SOCOL  = C('#9c968a');   // sòcol de pedra grisa
const TORRE  = C('#cdbb98');   // pedra de les torres de guaita
const BRONZE = C('#8a6a3a');   // campanes
const XIPRER = C('#2c4733');
const PI_C   = C('#4b6a41');   // capçada de pi pinyoner
const OLIVA  = C('#8d9c6c');
const ESCORCA = C('#6a5541');
const GERANI = C('#d8433a');
const CALID  = C('#ffd27f');   // llum de dins de casa, de nit
const SORRA_SECA = C('#e8d6ab'), SORRA_MULLADA = C('#b9a177');
// porticons i portes: sobretot blau, però també verd, fusta i almagre
const PORTICONS = ['#2f6f8f','#2f6f8f','#285b78','#3d7a68','#56755a','#7b5b3f','#6d8894','#8b4237'].map(C);

const MIDA_CALA = 7.5;   // radi de la silueta, en arestes de la malla triangular
const ALT = 0.78;     // alçada d'un bloc
const ROCA = 1.7;     // fondària del sòcol de roca
const MAX_H = 8;
const CARRER_Y = 0.09;         // alçada del paviment sobre el nivell zero
const ARC_YS = ALT*0.30;       // arrencada de l'arc
const ARC_YC = ALT*0.80;       // clau de l'arc
const ARC_K  = 12;             // segments de la corba

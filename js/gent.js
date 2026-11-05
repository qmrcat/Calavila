/* Cala · la gent: vianants pels carrers, i gent asseguda als bancs, prenent el sol i pescant */

/* ============================================================
   GENT
   ------------------------------------------------------------
   S'activa a Configuració (per defecte no hi és) i es recorda en
   aquest navegador, com les gavines. No es desa a la partida.
   Quan hi és:
   - Homes, dones, nens i nenes es passegen pels carrers, les
     places, els molls, els ponts, les escales i per sota de les
     voltes i els porxos. Surten per la porta d'una casa o d'un
     local, fan unes quantes cel·les i tornen a entrar per una
     altra porta (els locals en criden més). Alguns van amb un nen
     o una nena, amb una altra persona o amb un gos, que els
     segueixen pel mateix camí. De tant en tant s'aturen una
     estona. També hi ha algun gat, que va pel seu compte i
     s'atura sovint.
   - Als bancs hi seu gent: al cap d'una estona s'aixeca i se'n
     va caminant, i qui passeja pot anar a seure en un banc lliure.
   - A les terrasses dels bars i dels restaurants, gent asseguda a
     les taules prenent alguna cosa; a la platja, gent estirada a
     la tovallola o a les gandules (només de dia); i als molls,
     algú pescant, assegut a la vora amb les cames penjant.
   De nit, pel carrer i als bancs n'hi ha menys. La gent quieta
   (terrasses, platja i molls) surt d'un hash del lloc i sempre és
   la mateixa; els vianants i els dels bancs van amb el seu propi
   generador. Si el sistema demana reduir el moviment, ningú no
   camina ni s'aixeca.

   On pot anar la gent ho apunta la construcció de la malla
   (construirMalla): les portes (paret i facanaBarG), els bancs i
   el que fa nosa als carrers i als molls (mobiliari i
   mobiliariMoll) i la platja (sorra). Amb això es fa la xarxa de
   camins: un punt de pas a cada cel·la caminable i el mig de cada
   aresta per on es pot passar d'una a l'altra al mateix nivell.
   ============================================================ */

let ambGent = false;

// el que apunta construirMalla
let PORTES = [];        // {ci (la casa), e, x, z, nx, nz, y, local}
let BANCS = [];         // {ci, k, x, z, ux, uz, y, mar}: mar, si mira a l'aresta k (als molls)
let OBST = new Map();   // cel·la -> aresta que tapa un banc o unes caixes, o -1 si hi ha un arbre al mig
let SORRES = [];        // {ci, bl, hy}: les cel·les de platja, amb la seva superfície
let TAULES = [];        // {ci, k, x, z, vx, vz, y, rest}: les taules de les terrasses (les cadires, a ±0,15 al llarg de v)

let XARXA = null;       // {via: Map ci -> {x, y, z}, veins: Map ci -> [{b, e, x, z}]}
let portesDe = new Map();   // cel·la de carrer -> portes que hi donen
let bancsDe = new Map();    // cel·la -> bancs on es pot seure (amb clau: la cel·la i l'aresta)
let AL_SOL = new Set(), PESCADORS = new Map(), A_TERRASSA = new Set();   // per a la fitxa de consulta (els pescadors, amb on són)
let grups = [], gentDeDia = true, neixT = 0, rndGent = mulberry32(1);
let gentQuieta = null;   // malla de la gent que no es mou

/* --- vectors [x, y, z] --- */
const vSuma = (a, b, k = 1) => [a[0] + b[0]*k, a[1] + b[1]*k, a[2] + b[2]*k];
const vResta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vEsc = (a, k) => [a[0]*k, a[1]*k, a[2]*k];
const vCreu = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const vUnit = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
const vEntre = (a, b, t) => [a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t, a[2] + (b[2]-a[2])*t];

/* --- peces: triangle orientat, membre (cilindre entre dos punts) i el·lipsoide --- */
function triO(G, a, b, c, col, nd){
  const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2], vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
  if((uy*vz - uz*vy)*nd[0] + (uz*vx - ux*vz)*nd[1] + (ux*vy - uy*vx)*nd[2] < 0) tri(G, a, c, b, col);
  else tri(G, a, b, c, col);
}
// la secció és perpendicular a l'eix (tronc() la fa sempre horitzontal), i es pot tapar pels caps
function membre(G, A, B, r0, r1, col, n = 6, tapes = true){
  const d = vUnit(vResta(B, A)), ref = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = vUnit(vCreu(d, ref)), v = vCreu(d, u), R = [];
  for(let k=0;k<n;k++){ const a = k*6.2832/n; R.push(vSuma(vEsc(u, Math.cos(a)), v, Math.sin(a))); }
  const pa = R.map(r => vSuma(A, r, r0)), pb = R.map(r => vSuma(B, r, r1));
  for(let k=0;k<n;k++){
    const k1 = (k+1)%n, nd = vSuma(R[k], R[k1]);
    triO(G, pa[k], pa[k1], pb[k1], col, nd);
    triO(G, pa[k], pb[k1], pb[k], col, nd);
  }
  if(!tapes) return;
  const nA = vEsc(d, -1);
  for(let k=1;k<n-1;k++){
    if(r0 > 0) triO(G, pa[0], pa[k], pa[k+1], col, nA);
    if(r1 > 0) triO(G, pb[0], pb[k], pb[k+1], col, d);
  }
}
// el·lipsoide de centre c, amb els semieixos rx, ry i rz al llarg de R, U i F
function esfera(G, c, R, U, F, rx, ry, rz, col, n = 6, m = 4){
  const P = (i, j) => {
    const th = Math.PI*i/m, ph = 6.2832*j/n, st = Math.sin(th);
    const a = Math.cos(ph)*st*rx, b = Math.cos(th)*ry, d = Math.sin(ph)*st*rz;
    return [c[0] + R[0]*a + U[0]*b + F[0]*d, c[1] + R[1]*a + U[1]*b + F[1]*d, c[2] + R[2]*a + U[2]*b + F[2]*d];
  };
  for(let i=0;i<m;i++) for(let j=0;j<n;j++){
    const a = P(i, j), b = P(i, j+1), cc = P(i+1, j+1), d = P(i+1, j);
    const nd = vResta(vEsc(vSuma(vSuma(a, b), vSuma(cc, d)), 0.25), c);
    if(i > 0) triO(G, a, b, cc, col, nd);          // al pol de dalt, a i b són el mateix punt
    if(i < m-1) triO(G, a, cc, d, col, nd);        // i al de baix, cc i d
  }
}

/* --- colors --- */
const COLS_PELL = ['#f3d2b3', '#eabf9b', '#d9a77f', '#bf8a62', '#9a6844', '#6e4a31'].map(C);
const COLS_CABELL = ['#2a2420', '#3d2b1f', '#5e4028', '#8a5a2e', '#c2944f', '#1d1b1a', '#6b3a22'].map(C);
const COLS_CANOS = ['#a9a6a0', '#d6d3cc', '#8d8a84'].map(C);
const COLS_SAMARRETA = ['#f4f1ea', '#f4f1ea', '#2f6f8f', '#24396e', '#c8322b', '#e0a63a', '#3d7a68', '#e3a8a2',
                        '#f2d68a', '#8fb3c4', '#6b3f7a', '#d97a4a'].map(C);
const COLS_PANTALO = ['#2b3a55', '#3b4f6e', '#d8cdb5', '#c4b393', '#3a3630', '#5a6b7a', '#6d5a44', '#efe8d8'].map(C);
const COLS_VESTIT = ['#c8322b', '#2f6f8f', '#f2d68a', '#3d7a68', '#e3a8a2', '#f4f1ea', '#24396e', '#d97a4a', '#8a5aa0'].map(C);
const COLS_SABATA = ['#2a2522', '#5a3d2a', '#f4f1ea', '#7a6a58', '#2f3f5a'].map(C);
const COLS_BANY = ['#c8322b', '#2f6f8f', '#24396e', '#e0a63a', '#3d9a5a', '#e07a9a', '#2a2522', '#f2c230'].map(C);
const COLS_GOS = ['#8a5a32', '#2a2522', '#e8dcc6', '#b07a3c', '#f4f1ea', '#6b5a4a'].map(C);
const COLS_GAT = ['#2a2522', '#d08a3a', '#8a8a86', '#efece6', '#7a5a3a'].map(C);
const COL_PALLA = C('#e3c98a'), COL_CINTA = C('#5a3d2a'), COL_NAS = C('#1d1b1a');
const COL_CANYA = C('#3a3530'), COL_FIL = C('#e8e4da'), COLS_GALLEDA = ['#2f6f8f', '#c8322b', '#e0a63a'].map(C);

/* ============================================================
   EL COS
   ------------------------------------------------------------
   Una persona es dibuixa a partir de les articulacions (J): peus,
   genolls, malucs, pelvis, coll, espatlles, colzes, mans i el cap,
   amb el seu marc (R, U i F: de costat, amunt i endavant). Cada
   postura (dreta, asseguda, estirada, pescant) en dona unes
   altres, en coordenades pròpies; figura() les porta al món.
   Una persona adulta fa mig metre d'alt, més o menys: per les
   portes (0,6) hi passa bé, i un pis (0,78) li va sobrat.
   ============================================================ */

// trets d'una persona: d'on surten els colors de la roba, de la pell, dels cabells...
function trets(tipus, rnd, banyador = false){
  const tria = l => l[Math.floor(rnd()*l.length)];
  const nen = tipus === 'nen' || tipus === 'nena', dona = tipus === 'dona' || tipus === 'nena';
  const gran = !nen && rnd() < 0.18;
  const t = {tipus, nen, dona, gran, pell: tria(COLS_PELL), cabell: gran ? tria(COLS_CANOS) : tria(COLS_CABELL),
             sabata: tria(COLS_SABATA), barret: null, vestit: null};
  t.k = nen ? 0.62 + rnd()*0.12 : (dona ? 1.0 : 1.06) + (rnd() - 0.5)*0.06;   // l'alçada
  t.hk = nen ? 1.3 : 1;                                                        // les criatures, amb el cap més gros
  t.pentinat = dona ? (rnd() < 0.45 ? 'llarg' : rnd() < 0.5 ? 'cua' : 'curt') : (gran && rnd() < 0.5 ? 'calb' : 'curt');
  if(banyador){                                    // a la platja
    const b = tria(COLS_BANY);
    t.samarreta = dona ? b : t.pell; t.pantalo = b; t.maniga = 'cap';
    t.cuixa = t.cama = t.sabata = t.pell;
    return t;
  }
  t.samarreta = tria(COLS_SAMARRETA); t.maniga = rnd() < 0.7 ? 'curta' : 'llarga';
  t.pantalo = tria(COLS_PANTALO);
  if(dona && rnd() < (nen ? 0.55 : 0.45)){         // un vestit
    t.vestit = t.samarreta = t.pantalo = tria(COLS_VESTIT);
    t.maniga = rnd() < 0.5 ? 'cap' : 'curta';
    t.cuixa = t.cama = t.pell;
  } else {
    t.cuixa = t.pantalo;
    t.cama = rnd() < (nen ? 0.75 : 0.4) ? t.pell : t.pantalo;   // pantalons curts o llargs
  }
  if(rnd() < 0.14) t.barret = 'palla';
  else if(!dona && rnd() < 0.16) t.barret = 'gorra';
  return t;
}

const P_ = k => (x, y, z) => [x*k, y*k, z*k];
// dreta, mirant cap a +z, amb els peus a terra
function poseDreta(k, hk){
  const P = P_(k);
  return {k, hk, dret: true, R: [1,0,0], U: [0,1,0], F: [0,0,1],
    malE: P(0.026, 0.235, 0), genE: P(0.027, 0.125, 0.003), peuE: P(0.028, 0.012, 0),
    malD: P(-0.026, 0.235, 0), genD: P(-0.027, 0.125, 0.003), peuD: P(-0.028, 0.012, 0),
    pelvis: P(0, 0.228, 0), coll: P(0, 0.385, 0),
    espE: P(0.056, 0.37, 0), colzeE: P(0.062, 0.292, -0.004), maE: P(0.064, 0.218, 0.006),
    espD: P(-0.056, 0.37, 0), colzeD: P(-0.062, 0.292, -0.004), maD: P(-0.064, 0.218, 0.006),
    cap: [0, 0.385*k + 0.034*k*hk, 0.003*k]};
}
// asseguda: l'origen és al seient, sota la pelvis
function poseAsseguda(k, hk){
  const P = P_(k);
  return {k, hk, R: [1,0,0], U: [0,1,0], F: [0,0,1],
    malE: P(0.026, 0.022, -0.005), genE: P(0.028, 0.024, 0.105), peuE: P(0.03, -0.088, 0.13),
    malD: P(-0.026, 0.022, -0.005), genD: P(-0.028, 0.024, 0.105), peuD: P(-0.03, -0.088, 0.13),
    pelvis: P(0, 0.02, -0.015), coll: P(0, 0.172, -0.035),
    espE: P(0.056, 0.158, -0.033), colzeE: P(0.066, 0.085, -0.012), maE: P(0.05, 0.05, 0.058),
    espD: P(-0.056, 0.158, -0.033), colzeD: P(-0.066, 0.085, -0.012), maD: P(-0.05, 0.05, 0.058),
    cap: [0, 0.172*k + 0.034*k*hk, -0.032*k]};
}
// asseguda a una taula de terrassa (el seient, a 0,115 de terra; el tauler, 0,065 més amunt i a 0,06 davant):
// una mica inclinada endavant, amb els avantbraços sobre la taula i els peus a terra, sota el tauler
function poseTaula(k, hk){
  const P = P_(k), ma = 0.074/k, mz = 0.088/k;     // les mans, a l'alçada del tauler sigui quina sigui la mida
  return {k, hk, R: [1,0,0], U: [0,1,0], F: [0,0,1],
    malE: P(0.026, 0.022, -0.005), genE: P(0.028, 0.024, 0.105), peuE: P(0.03, -0.098, 0.1),
    malD: P(-0.026, 0.022, -0.005), genD: P(-0.028, 0.024, 0.105), peuD: P(-0.03, -0.098, 0.1),
    pelvis: P(0, 0.02, -0.015), coll: P(0, 0.17, -0.012),
    espE: P(0.056, 0.156, -0.012), colzeE: P(0.072, 0.086, 0.022), maE: P(0.04, ma, mz),
    espD: P(-0.056, 0.156, -0.012), colzeD: P(-0.072, 0.086, 0.022), maD: P(-0.03, ma, mz - 0.006/k),
    cap: [0, 0.17*k + 0.034*k*hk, -0.006*k]};
}
// una postura a mig camí entre dues (per asseure's i aixecar-se); el cap i el marc, els de la primera
function poseEntre(Ja, Jb, u){
  const J = {k: Ja.k, hk: Ja.hk, R: Ja.R, U: Ja.U, F: Ja.F};
  for(const n in Ja) if(Array.isArray(Ja[n]) && !VECTORS_J.includes(n)) J[n] = vEntre(Ja[n], Jb[n], u);
  return J;
}
// la mateixa postura, desplaçada
function poseMou(J, d){
  const out = {...J};
  for(const n in J) if(Array.isArray(J[n]) && !VECTORS_J.includes(n)) out[n] = vSuma(J[n], d);
  return out;
}
// pescant, assegut a la vora del moll: l'origen és a la vora, i les cames pengen cap a +z
function posePescant(k, hk){
  const P = P_(k);
  return {k, hk, R: [1,0,0], U: [0,1,0], F: [0,0,1],
    malE: P(0.026, 0.022, -0.03), genE: P(0.028, 0.024, 0.08), peuE: P(0.03, -0.087, 0.1),
    malD: P(-0.026, 0.022, -0.03), genD: P(-0.028, 0.024, 0.08), peuD: P(-0.03, -0.087, 0.1),
    pelvis: P(0, 0.02, -0.04), coll: P(0, 0.172, -0.012),
    espE: P(0.056, 0.158, -0.014), colzeE: P(0.058, 0.1, 0.032), maE: P(0.014, 0.104, 0.082),
    espD: P(-0.056, 0.158, -0.014), colzeD: P(-0.058, 0.098, 0.028), maD: P(-0.01, 0.098, 0.07),
    cap: [0, 0.172*k + 0.034*k*hk, -0.008*k],
    canya0: P(0.004, 0.07, 0.02), canya1: P(0.08, 0.36, 0.5)};
}
// estirada d'esquena (o de bocaterrosa): l'origen és a terra, sota la pelvis, i el cap cap a +z.
// incl aixeca l'esquena (a les gandules); mans, si les té sota el cap
function poseEstirada(k, hk, mans, incl = 0, bocaterrosa = false){
  const P = P_(k), c = Math.cos(incl), s = Math.sin(incl);
  const pv = P(0, 0.038, 0);
  const alca = p => { const y = p[1] - pv[1], z = p[2] - pv[2]; return [p[0], pv[1] + y*c + z*s, pv[2] - y*s + z*c]; };
  const F = bocaterrosa ? [0,-1,0] : [0,1,0];
  const dalt = {coll: P(0, 0.04, 0.157), espE: P(0.056, 0.036, 0.142), espD: P(-0.056, 0.036, 0.142),
    colzeE: mans ? P(0.088, 0.05, 0.19) : P(0.072, 0.022, 0.065), maE: mans ? P(0.022, 0.036, 0.205) : P(0.075, 0.016, -0.005),
    colzeD: mans ? P(-0.088, 0.05, 0.19) : P(-0.072, 0.022, 0.065), maD: mans ? P(-0.022, 0.036, 0.205) : P(-0.075, 0.016, -0.005),
    cap: [0, 0.033*k*hk, 0.157*k + 0.034*k*hk]};
  const J = {k, hk, R: [1,0,0], U: [0,0,1], F,
    malE: P(0.026, 0.022, 0), genE: P(0.029, 0.021, -0.11), peuE: P(0.031, 0.022, -0.222),
    malD: P(-0.026, 0.022, 0), genD: P(-0.029, 0.021, -0.11), peuD: P(-0.031, 0.022, -0.222),
    pelvis: pv};
  for(const n in dalt) J[n] = alca(dalt[n]);
  // el cap gira amb l'esquena
  const u = [0, s, c], f = bocaterrosa ? [0, -c, s] : [0, c, -s];
  J.hU = u; J.hF = f; J.hR = vCreu(u, f);
  return J;
}

// porta unes articulacions al món: origen O i marc (Rw, Uw, Fw)
const VECTORS_J = ['R', 'U', 'F', 'hR', 'hU', 'hF'];
function aMon(J, O, Rw, Uw, Fw){
  const out = {k: J.k, hk: J.hk, dret: J.dret};
  for(const n in J){
    const p = J[n]; if(!Array.isArray(p)) continue;
    const v = [Rw[0]*p[0] + Uw[0]*p[1] + Fw[0]*p[2], Rw[1]*p[0] + Uw[1]*p[1] + Fw[1]*p[2], Rw[2]*p[0] + Uw[2]*p[1] + Fw[2]*p[2]];
    out[n] = VECTORS_J.includes(n) ? v : vSuma(O, v);
  }
  return out;
}

// dibuixa una persona: Gs = {cos, camaE, camaD, bracE, bracD} (poden ser la mateixa)
function cosHuma(Gs, J, t){
  const {k, hk, R, U, F} = J, kh = k*hk;
  const eix = vUnit(vResta(J.coll, J.pelvis));
  const faldilla = t.vestit && J.dret;            // dreta, el vestit fa campana; asseguda, cobreix les cuixes
  const cuixa = t.vestit && !J.dret ? t.vestit : t.cuixa, rc = t.vestit && !J.dret ? 0.027*k : 0.021*k;
  // les cames
  for(const [s, Gc] of [['E', Gs.camaE], ['D', Gs.camaD]]){
    const mal = J['mal' + s], gen = J['gen' + s], peu = J['peu' + s];
    membre(Gc, mal, gen, rc, 0.017*k, cuixa, 6);
    membre(Gc, gen, peu, 0.016*k, 0.012*k, t.cama, 6);
    esfera(Gc, vSuma(peu, F, 0.011*k), R, U, F, 0.015*k, 0.011*k, 0.026*k, t.sabata, 5, 3);
  }
  // els malucs, el tors i les espatlles
  const G = Gs.cos;
  membre(G, vSuma(J.pelvis, eix, -0.014*k), vSuma(J.pelvis, eix, 0.045*k), 0.042*k, 0.042*k, t.pantalo, 7);
  membre(G, vSuma(J.pelvis, eix, 0.04*k), J.coll, 0.041*k, (t.dona ? 0.044 : 0.048)*k, t.samarreta, 7);
  membre(G, J.espE, J.espD, 0.02*k, 0.02*k, t.samarreta, 6);
  if(faldilla){
    const peus = J.genE[1] - 0.012*k;
    membre(G, vSuma(J.pelvis, eix, 0.05*k), [J.pelvis[0], peus, J.pelvis[2]], 0.04*k, 0.07*k, t.vestit, 8);
  }
  // els braços
  for(const [s, Gb] of [['E', Gs.bracE], ['D', Gs.bracD]]){
    const esp = J['esp' + s], colze = J['colze' + s], ma = J['ma' + s];
    membre(Gb, esp, colze, 0.015*k, 0.013*k, t.maniga === 'cap' ? t.pell : t.samarreta, 5);
    membre(Gb, colze, ma, 0.013*k, 0.011*k, t.maniga === 'llarga' ? t.samarreta : t.pell, 5);
    esfera(Gb, ma, R, U, F, 0.012*k, 0.014*k, 0.012*k, t.pell, 5, 3);
  }
  // el coll i el cap
  membre(G, vSuma(J.coll, eix, -0.006*k), vSuma(J.coll, eix, 0.02*k), 0.014*k, 0.013*k, t.pell, 5);
  const hR = J.hR || R, hU = J.hU || U, hF = J.hF || F, C0 = J.cap;
  const al = (u, f) => vSuma(vSuma(C0, hU, u*kh), hF, f*kh);
  esfera(G, C0, hR, hU, hF, 0.031*kh, 0.037*kh, 0.033*kh, t.pell, 7, 5);
  if(t.pentinat === 'calb') esfera(G, al(-0.004, -0.012), hR, hU, hF, 0.033*kh, 0.022*kh, 0.026*kh, t.cabell, 7, 4);
  else esfera(G, al(0.011, -0.007), hR, hU, hF, 0.034*kh, 0.031*kh, 0.033*kh, t.cabell, 7, 4);
  if(t.pentinat === 'llarg') esfera(G, al(-0.022, -0.016), hR, hU, hF, 0.031*kh, 0.042*kh, 0.02*kh, t.cabell, 6, 4);
  if(t.pentinat === 'cua') membre(G, al(0.014, -0.03), al(-0.03, -0.046), 0.012*kh, 0.005*kh, t.cabell, 5);
  // el barret: de palla, d'ala ampla, o una gorra amb visera
  if(t.barret === 'palla'){
    const b = al(0.02, -0.003);
    membre(G, b, vSuma(b, hU, 0.005*kh), 0.064*kh, 0.064*kh, COL_PALLA, 9);
    membre(G, vSuma(b, hU, 0.004*kh), vSuma(b, hU, 0.03*kh), 0.035*kh, 0.031*kh, COL_PALLA, 8);
    membre(G, vSuma(b, hU, 0.005*kh), vSuma(b, hU, 0.012*kh), 0.0355*kh, 0.0345*kh, COL_CINTA, 8, false);
  } else if(t.barret === 'gorra'){
    esfera(G, al(0.013, -0.004), hR, hU, hF, 0.035*kh, 0.03*kh, 0.035*kh, t.samarreta === t.pell ? COLS_BANY[1] : t.pantalo, 7, 4);
    membre(G, al(0.014, 0.02), al(0.012, 0.058), 0.022*kh, 0.02*kh, t.pantalo, 6);
  }
}

// una persona quieta, dibuixada al món: J en coordenades pròpies, O i el marc diuen on i cap on
function figura(G, J, O, Rw, Uw, Fw, t){
  const Jw = aMon(J, O, Rw, Uw, Fw);
  cosHuma({cos: G, camaE: G, camaD: G, bracE: G, bracD: G}, Jw, t);
  return Jw;
}

/* ============================================================
   MODELS QUE ES MOUEN
   ------------------------------------------------------------
   Els que caminen es fan una sola vegada, drets i mirant a +z, en
   peces: el cos, i les cames i els braços (o les potes), que
   pengen d'un pivot i es balancegen. A cada fotograma, compon()
   gira cada peça, la porta al seu lloc i ho posa tot en una sola
   malla, que es dibuixa d'un sol cop.
   ============================================================ */

const part = (G, py = 0, pz = 0, amp = 0, off = 0) =>
  ({p: Float32Array.from(G.p), n: Float32Array.from(G.n), c: Float32Array.from(G.c), py, pz, amp, off});

function modelPersona(t){
  const Gs = {cos: newG(), camaE: newG(), camaD: newG(), bracE: newG(), bracD: newG()};
  cosHuma(Gs, poseDreta(t.k, t.hk), t);
  const k = t.k, mal = 0.235*k, esp = 0.37*k;
  return {tipus: t.tipus, pas: 0.17*k, bot: 0.006*k, parts: [part(Gs.cos),
    part(Gs.camaE, mal, 0, 0.4, 0), part(Gs.camaD, mal, 0, 0.4, Math.PI),
    part(Gs.bracE, esp, 0, 0.32, Math.PI), part(Gs.bracD, esp, 0, 0.32, 0)]};
}
// una persona quieta en una postura, d'una sola peça (asseguda al banc, o aixecant-se'n)
function modelQuiet(J, t){
  const G = newG();
  cosHuma({cos: G, camaE: G, camaD: G, bracE: G, bracD: G}, J, t);
  return {tipus: t.tipus, pas: 1, bot: 0, parts: [part(G)]};
}

// gos: de mida i color variats
function modelGos(rnd){
  const k = 0.85 + rnd()*0.45, col = COLS_GOS[Math.floor(rnd()*COLS_GOS.length)], P = P_(k);
  const R = [1,0,0], U = [0,1,0], F = [0,0,1], G = newG();
  membre(G, P(0, 0.078, -0.052), P(0, 0.084, 0.045), 0.026*k, 0.028*k, col, 7);      // el cos
  membre(G, P(0, 0.09, 0.038), P(0, 0.118, 0.064), 0.016*k, 0.014*k, col, 6);       // el coll
  esfera(G, P(0, 0.122, 0.07), R, U, F, 0.019*k, 0.019*k, 0.022*k, col, 6, 4);       // el cap
  membre(G, P(0, 0.119, 0.082), P(0, 0.112, 0.106), 0.011*k, 0.008*k, col, 5);       // el morro
  esfera(G, P(0, 0.114, 0.107), R, U, F, 0.005*k, 0.005*k, 0.005*k, COL_NAS, 4, 3);
  for(const s of [1, -1])                                                             // les orelles
    membre(G, P(s*0.012, 0.136, 0.066), P(s*0.022, 0.11, 0.062), 0.007*k, 0.004*k, fosc(col, 0.7), 4);
  membre(G, P(0, 0.09, -0.05), P(0, 0.132, -0.084), 0.007*k, 0.003*k, col, 4);       // la cua, enlaire
  const potes = [[1, 1, 0], [-1, 1, Math.PI], [1, -1, Math.PI], [-1, -1, 0]].map(([x, z, off]) => {
    const Gp = newG();
    membre(Gp, P(x*0.016, 0.078, z*0.038), P(x*0.016, 0.004, z*0.04), 0.009*k, 0.007*k, col, 5);
    return part(Gp, 0.078*k, z*0.038*k, 0.55, off);
  });
  return {tipus: 'gos', pas: 0.085*k, bot: 0.004*k, parts: [part(G), ...potes]};
}

// gat: més petit, amb la cua llarga i enlaire
function modelGat(rnd){
  const k = 0.9 + rnd()*0.2, col = COLS_GAT[Math.floor(rnd()*COLS_GAT.length)], P = P_(k);
  const R = [1,0,0], U = [0,1,0], F = [0,0,1], G = newG();
  membre(G, P(0, 0.05, -0.04), P(0, 0.053, 0.03), 0.017*k, 0.018*k, col, 6);
  esfera(G, P(0, 0.072, 0.046), R, U, F, 0.017*k, 0.015*k, 0.016*k, col, 6, 4);
  for(const s of [1, -1]){                                                            // les orelles, punxegudes
    const a = P(s*0.011, 0.082, 0.046), b = P(s*0.005, 0.084, 0.05), c = P(s*0.011, 0.097, 0.045);
    triO(G, a, b, c, col, [0, 0, 1]); triO(G, a, b, c, fosc(col, 0.8), [0, 0, -1]);
  }
  membre(G, P(0, 0.054, -0.04), P(0, 0.075, -0.066), 0.005*k, 0.0045*k, col, 4);     // la cua
  membre(G, P(0, 0.075, -0.066), P(0, 0.112, -0.07), 0.0045*k, 0.003*k, col, 4);
  const potes = [[1, 1, 0], [-1, 1, Math.PI], [1, -1, Math.PI], [-1, -1, 0]].map(([x, z, off]) => {
    const Gp = newG();
    membre(Gp, P(x*0.01, 0.05, z*0.03), P(x*0.01, 0.003, z*0.031), 0.0055*k, 0.005*k, col, 4);
    return part(Gp, 0.05*k, z*0.03*k, 0.55, off);
  });
  return {tipus: 'gat', pas: 0.055*k, bot: 0.003*k, parts: [part(G), ...potes]};
}

/* --- la malla dels que es mouen, que es refà a cada fotograma --- */
let gentMov = null, capGent = 0;
function preparaMalla(n){
  if(gentMov && n <= capGent) return;
  capGent = Math.max(n, capGent*2, 60000);
  const g = new THREE.BufferGeometry();
  for(const [nom, mida] of [['position', 3], ['normal', 3], ['color', 3]]){
    const a = new THREE.BufferAttribute(new Float32Array(capGent*mida), mida);
    a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute(nom, a);
  }
  if(gentMov){ gentMov.geometry.dispose(); gentMov.geometry = g; return; }
  gentMov = new THREE.Mesh(g, matPoble);
  gentMov.castShadow = true; gentMov.receiveShadow = true;
  gentMov.frustumCulled = false;   // es mou: la capsa no se sap
  scene.add(gentMov);
}

// posa tots els que caminen a la malla: cada peça girada pel seu pivot, i el conjunt al seu lloc
function compon(){
  let n = 0;
  for(const g of grups) for(const m of g.m) if(m.vis) for(const p of m.model.parts) n += p.p.length/3;
  preparaMalla(n);
  const geo = gentMov.geometry, PA = geo.attributes.position.array, NA = geo.attributes.normal.array, CA = geo.attributes.color.array;
  let o = 0;
  for(const g of grups) for(const m of g.m){
    if(!m.vis) continue;
    const cy = Math.cos(m.yaw), sy = Math.sin(m.yaw);
    for(const p of m.model.parts){
      let ca = 1, sa = 0;
      if(p.amp){ const a = p.amp*m.amp*Math.sin(m.fase + p.off); ca = Math.cos(a); sa = Math.sin(a); }
      const P = p.p, N = p.n, py = p.py, pz = p.pz;
      for(let i=0;i<P.length;i+=3){
        const x = P[i], y = P[i+1] - py, z = P[i+2] - pz;
        const y2 = y*ca - z*sa + py, z2 = y*sa + z*ca + pz;
        PA[o+i] = m.x + x*cy + z2*sy; PA[o+i+1] = m.y + y2; PA[o+i+2] = m.z - x*sy + z2*cy;
        const nx = N[i], ny = N[i+1]*ca - N[i+2]*sa, nz = N[i+1]*sa + N[i+2]*ca;
        NA[o+i] = nx*cy + nz*sy; NA[o+i+1] = ny; NA[o+i+2] = -nx*sy + nz*cy;
      }
      CA.set(p.c, o);
      o += P.length;
    }
  }
  geo.setDrawRange(0, o/3);
  for(const nom of ['position', 'normal', 'color']){
    const a = geo.attributes[nom];
    a.updateRange.offset = 0; a.updateRange.count = Math.max(3, o);
    a.needsUpdate = true;
  }
  gentMov.visible = ambGent && o > 0;
  redibuixa();
}

/* ============================================================
   LA XARXA DE CAMINS
   ============================================================ */

// es pot caminar per aquesta cel·la? un carrer, una plaça, un moll, una escala, un pont o un porxo,
// sense res al mig que faci nosa (un far, una parada, una terrassa, l'arbre de Nadal, els gegants)
function caminable(ci){
  if(ci < 0) return false;
  if(pont[ci] > 0) return true;
  if(!esCarrer[ci] || !nvC[ci] || muntSup[ci] || esMunt(ci)) return false;
  if(heights[ci] > 0 && !span[ci]) return false;
  if(fars[ci] && !span[ci]) return false;
  if(esMercat(ci) || terrassaDe.has(ci) || (nadal && arbreNadalAqui(ci)) || gegantsAqui(ci)) return false;
  if(moll[ci] && esPuntaMoll(ci) && !span[ci] && hash3(ci, 160, 1) < 0.7) return false;   // el far de la punta
  return true;
}
const migAresta = (ci, e) => entre(cells[ci].p[e], cells[ci].p[(e+1)%4], 0.5);
// fins on és el punt (x, z) entre A (0) i B (1)
function sobre(A, B, x, z){
  const dx = B.x - A.x, dz = B.z - A.z, l2 = dx*dx + dz*dz || 1;
  return Math.min(1, Math.max(0, ((x - A.x)*dx + (z - A.z)*dz)/l2));
}
// l'alçada del terra on es trepitja: el paviment, els graons d'una escala o l'esquena d'ase d'un pont
function alcadaCami(ci, x, z){
  if(pont[ci] > 0){
    const [eA, eB] = pont[ci] === 1 ? [0, 2] : [3, 1];
    const ya = riba(ci, eA), yb = riba(ci, eB), s = sobre(migAresta(ci, eA), migAresta(ci, eB), x, z);
    return ya + (yb - ya)*s + 0.14*Math.sin(Math.PI*s);
  }
  const Y = nvC[ci], e = escalaE[ci];
  if(e < 0) return Y[0]*ALT + CARRER_Y;
  const y0 = Y[(e+2)%4]*ALT + CARRER_Y, y1 = Y[e]*ALT + CARRER_Y;
  const s = sobre(migAresta(ci, (e+2)%4), migAresta(ci, e), x, z);
  const n = Math.max(3, Math.round((y1 - y0)/0.15)), q = s*n, g = Math.min(n, Math.floor(q));
  return y0 + (y1 - y0)/n*(g + ss(0, 0.3, q - g));   // graó a graó
}
// per l'aresta e d'una cel·la caminable s'hi pot entrar? un pont, pels caps; una escala, per dalt i per baix
function potPassar(ci, e){
  if(OBST.get(ci) === e) return false;
  if(pont[ci] > 0) return pont[ci] === 1 ? e % 2 === 0 : e % 2 === 1;
  const s = escalaE[ci];
  return s < 0 || e === s || e === (s+2)%4;
}

function refaXarxa(){
  const via = new Map(), veins = new Map();
  for(let ci=0; ci<cells.length; ci++){
    if(!caminable(ci)) continue;
    const cel = cells[ci], o = OBST.has(ci) ? OBST.get(ci) : null;
    let v = cel.c;
    if(o === -1) v = entre(cel.c, cel.p[Math.floor(hash3(ci, 730, 1)*4)], 0.45);   // un arbre al mig: s'hi passa pel costat
    else if(o !== null) v = entre(cel.c, migAresta(ci, (o+2)%4), 0.4);              // lluny del banc o de les caixes
    via.set(ci, {x: v.x, z: v.z, y: alcadaCami(ci, v.x, v.z)});
  }
  for(const ci of via.keys()){
    const l = [];
    for(let e=0;e<4;e++){
      const b = cells[ci].nb[e];
      if(!via.has(b) || !potPassar(ci, e)) continue;
      const j = cells[b].nb.indexOf(ci);
      if(j < 0 || !potPassar(b, j)) continue;
      const m = migAresta(ci, e);
      if(Math.abs(alcadaCami(ci, m.x, m.z) - alcadaCami(b, m.x, m.z)) > 0.03) continue;   // un desnivell: no
      l.push({b, e, x: m.x, z: m.z});
    }
    veins.set(ci, l);
  }
  XARXA = {via, veins};
}

// les portes que donen a un carrer pla on es pot caminar, sense res al davant
function refaPortes(){
  portesDe = new Map();
  for(const p of PORTES){
    const st = cells[p.ci].nb[p.e];
    if(!XARXA.via.has(st) || escalaE[st] >= 0 || pont[st] || !XARXA.veins.get(st).length) continue;
    if(OBST.get(st) === cells[st].nb.indexOf(p.ci)) continue;
    if(Math.abs(alcadaCami(st, p.x, p.z) - (p.y + CARRER_Y)) > 0.05) continue;
    p.st = st; p.clau = p.ci + '_' + p.e;
    p.davant = {x: p.x + p.nx*0.13, z: p.z + p.nz*0.13};
    if(!portesDe.has(st)) portesDe.set(st, []);
    portesDe.get(st).push(p);
  }
}

/* ============================================================
   ELS QUE CAMINEN
   ------------------------------------------------------------
   Van en grups: el primer (el cap) segueix el camí, i els altres
   (una criatura, una altra persona, un gos) el segueixen per la
   petja que deixa, una mica enrere i de costat. El camí va d'un
   punt de pas al mig de l'aresta i al punt de pas de la cel·la
   següent; el cap camina una mica decantat (el carril).
   ============================================================ */

// qui hi ha en un grup nou
function membresGrup(rnd){
  const nen = () => trets(rnd() < 0.5 ? 'nen' : 'nena', rnd), gran = () => trets(rnd() < 0.5 ? 'home' : 'dona', rnd);
  if(gentDeDia && rnd() < 0.16){                   // una criatura sola, o dues
    const l = [{t: nen()}];
    if(rnd() < 0.5) l.push({t: nen(), lag: 0.05, costat: 0.1});
    return l;
  }
  const l = [{t: gran()}], r = rnd();
  if(gentDeDia && r < 0.2) l.push({t: nen(), lag: 0.02, costat: 0.1});
  else if(r < 0.36) l.push({gos: true, lag: 0.17, costat: -0.035});
  else if(r < 0.5) l.push({t: gran(), lag: 0.01, costat: 0.115});
  return l;
}

function nouGrup(gat, membres = null){
  const rnd = rndGent;
  const ms = gat ? [{gat: true}] : membres || membresGrup(rnd);
  const m = ms.map(d => ({
    model: d.gat ? modelGat(rnd) : d.gos ? modelGos(rnd) : modelPersona(d.t), t: d.t || null,
    lag: d.lag || 0, costat: d.costat || 0, x: 0, y: 0, z: 0, yaw: 0, fase: rnd()*6.28, amp: 0, vis: false, px: null, pz: null}));
  const t0 = ms[0].t;
  const vel = gat ? 0.11 + rnd()*0.04 : t0.nen ? 0.27 + rnd()*0.05 : t0.gran ? 0.16 + rnd()*0.03
            : (ms.length > 1 && ms[1].t && ms[1].t.nen) ? 0.19 + rnd()*0.03 : 0.21 + rnd()*0.06;
  const c0 = ms.length > 1 ? 0.02 : 0.03 + rnd()*0.05;
  return {m, gat, vel, cami: [], bx: 0, bz: 0, ci: -1, ant: -1, entrada: -1, yaw: 0, dir: 0,
          carril: 0, carril0: (rnd() < 0.5 ? -1 : 1)*c0, passos: 4 + Math.floor(rnd()*12), estat: 'camina',
          espera: 0, petja: [], extra: 0, porta: null, origen: null, y: 0,
          banc: null, seients: null, haSegut: false, fase: 0, faseT: 0, despres: null};
}

// el pas següent, quan arriba al punt de pas d'una cel·la: cap a una porta si ja ha fet prou camí, o a l'atzar
function planeja(g){
  if(!g.gat && g.passos <= 0){
    if(potSeure(g) && rndGent() < 0.4 && camiBanc(g)) return;   // a seure una estona en un banc
    if(portesDe.size && camiPorta(g)) return;
    g.passos = 4 + Math.floor(rndGent()*6);
  }
  const l = XARXA.veins.get(g.ci) || [];
  if(!l.length){ g.estat = 'atura'; g.espera = 2; g.passos--; return; }   // no hi ha cap sortida: s'espera
  let ops = l.filter(n => n.b !== g.ant);
  if(!ops.length) ops = l;                                               // un atzucac: tomba
  const pes = ops.map(n => g.entrada >= 0 && n.e === (g.entrada + 2)%4 ? 2.5 : 1);   // més aviat recte
  let r = rndGent()*pes.reduce((a, b) => a + b, 0), i = 0;
  while(i < ops.length - 1 && r > pes[i]){ r -= pes[i]; i++; }
  const n = ops[i], v = XARXA.via.get(n.b);
  g.cami.push({x: n.x, z: n.z, ci: g.ci, tipus: 'mig'}, {x: v.x, z: v.z, ci: n.b, tipus: 'via'});
  g.ant = g.ci; g.entrada = cells[n.b].nb.indexOf(g.ci);
}

// recorre la xarxa des d'on és el grup i recull el que troba (troba(cel·la) -> llista) a les cel·les més
// properes, i fins a tres passos més enllà; prev diu per on s'hi va
function cerca(g, troba){
  const veins = XARXA.veins, A = g.ci, prev = new Map([[A, null]]), cua = [A], cand = [], dist = new Map([[A, 0]]);
  let dmax = Infinity;
  for(let i=0; i<cua.length; i++){
    const a = cua[i], d = dist.get(a);
    if(d > dmax) break;
    for(const x of troba(a)) cand.push(x);
    if(cand.length && dmax === Infinity) dmax = d + 3;
    for(const n of veins.get(a)) if(!dist.has(n.b)){ dist.set(n.b, d + 1); prev.set(n.b, {a, n}); cua.push(n.b); }
  }
  return {cand, prev};
}
// el camí fins a la cel·la c, de punt de pas en punt de pas
function ruta(g, prev, c){
  const trams = [];
  for(; prev.get(c); c = prev.get(c).a) trams.unshift({...prev.get(c), c});
  for(const {a, n, c: cc} of trams){
    const v = XARXA.via.get(cc);
    g.cami.push({x: n.x, z: n.z, ci: a, tipus: 'mig'}, {x: v.x, z: v.z, ci: cc, tipus: 'via'});
  }
}

// el camí més curt fins a una porta (els locals en criden més), i hi entra
function camiPorta(g){
  const {cand, prev} = cerca(g, a => (portesDe.get(a) || []).filter(p => p !== g.origen));
  if(!cand.length) return false;
  const pes = cand.map(p => p.local ? 3 : 1);
  let r = rndGent()*pes.reduce((a, b) => a + b, 0), i = 0;
  while(i < cand.length - 1 && r > pes[i]){ r -= pes[i]; i++; }
  const p = cand[i];
  ruta(g, prev, p.st);
  g.cami.push({x: p.davant.x, z: p.davant.z, ci: p.st, tipus: 'davant'}, {x: p.x, z: p.z, ci: p.st, tipus: 'porta'});
  g.porta = p;
  return true;
}

/* ============================================================
   ELS BANCS
   ------------------------------------------------------------
   Qui passeja pot anar a seure en un banc lliure (una o dues
   persones, sense gos), i al cap d'una estona s'aixeca i torna a
   caminar. Asseure's i aixecar-se es fa en dos passos, amb dues
   postures a mig camí. Als bancs dels molls, que miren a l'aigua,
   s'hi va pel costat, perquè el punt de pas queda al darrere.
   ============================================================ */

const PAS_SEURE = 0.2;   // la durada de cada postura, en asseure's o aixecar-se

// els bancs on es pot seure: a la xarxa, al nivell del carrer i amb lloc davant per arribar-hi
function refaBancs(){
  bancsDe = new Map();
  for(const b of BANCS){
    if(!XARXA.via.has(b.ci) || Math.abs(alcadaCami(b.ci, b.x, b.z) - b.y) > 0.03) continue;
    b.clau = b.ci + '_' + b.k;
    const cap = b.mar ? migAresta(b.ci, b.k) : cells[b.ci].c;   // mira a la plaça, o a l'aigua
    b.fx = -b.uz; b.fz = b.ux;
    if(b.fx*(cap.x - b.x) + b.fz*(cap.z - b.z) < 0){ b.fx = -b.fx; b.fz = -b.fz; }
    const v = XARXA.via.get(b.ci), lloc = (o, f) => ({x: b.x + b.ux*o + b.fx*f, z: b.z + b.uz*o + b.fz*f});
    b.volta = [];
    if(b.fx*(v.x - b.x) + b.fz*(v.z - b.z) < 0){   // el punt de pas és al darrere: s'hi passa pel costat
      const s = b.ux*(v.x - b.x) + b.uz*(v.z - b.z) < 0 ? -1 : 1;
      b.volta = [lloc(s*0.32, -0.12), lloc(s*0.32, 0.13)];
    }
    if(![...b.volta, lloc(-0.1, 0.13), lloc(0.1, 0.13)].every(p => dinsCella(b.ci, p.x, p.z, 0))) continue;
    if(!bancsDe.has(b.ci)) bancsDe.set(b.ci, []);
    bancsDe.get(b.ci).push(b);
  }
}
const nBancs = () => { let n = 0; for(const l of bancsDe.values()) n += l.length; return n; };
const nAsseguts = () => grups.filter(g => g.banc).length;   // també els que hi van
const bancLliure = b => !grups.some(g => g.banc && g.banc.clau === b.clau);
const hiHaAsseguts = ci => grups.some(g => g.banc && g.banc.ci === ci && (g.estat === 'seu' || g.estat === 'transicio'));
// pot anar a seure? una o dues persones, sense gos, que no s'acabin d'aixecar; de nit, menys
const potSeure = g => !g.gat && !g.haSegut && !g.porta && g.m.length <= 2 && g.m.every(m => m.t)
  && nAsseguts() < nBancs()*(gentDeDia ? 0.6 : 0.25);

// on seu cadascú (O, el seient; yaw, cap on mira) i on es posa dret (S, davant del banc)
function seientsBanc(b, n){
  const os = n > 1 ? [-0.1, 0.1] : [(rndGent() - 0.5)*0.16], yaw = Math.atan2(b.fx, b.fz);
  return os.map(o => ({O: [b.x + b.ux*o - b.fx*0.012, b.y + 0.15, b.z + b.uz*o - b.fz*0.012], yaw,
                       S: {x: b.x + b.ux*o + b.fx*0.13, z: b.z + b.uz*o + b.fz*0.13}}));
}
// les postures entre dreta (davant del banc) i asseguda, per a una persona
function posturesSeure(m, s, y){
  const {k, hk} = m.t, Js = poseAsseguda(k, hk), Jd = poseMou(poseDreta(k, hk), [0, y - s.O[1], 0.142]);
  return [modelQuiet(poseEntre(Js, Jd, 0.7), m.t), modelQuiet(poseEntre(Js, Jd, 0.35), m.t), modelQuiet(Js, m.t)];
}
function posaAlSeient(m, s, model){
  if(!m.mDret) m.mDret = m.model;
  m.model = model; m.x = s.O[0]; m.y = s.O[1]; m.z = s.O[2]; m.yaw = s.yaw;
  m.vis = true; m.amp = 0; m.px = null;
}

// cap al banc: tria els seients i hi va (pel costat, si cal)
function vaASeure(g, b){
  g.banc = b; g.seients = seientsBanc(b, g.m.length);
  const S = g.seients[0].S;
  for(const p of b.volta) g.cami.push({x: p.x, z: p.z, ci: b.ci, tipus: 'volta'});
  g.cami.push({x: S.x, z: S.z, ci: b.ci, tipus: 'seient'});
}
// el banc lliure més a prop
function camiBanc(g){
  const {cand, prev} = cerca(g, a => (bancsDe.get(a) || []).filter(bancLliure));
  if(!cand.length) return false;
  const b = cand[Math.floor(rndGent()*cand.length)];
  ruta(g, prev, b.ci);
  vaASeure(g, b);
  return true;
}
// arriba davant del banc i s'hi asseu, tot el grup alhora
function asseu(g){
  const S = g.seients[0].S;
  g.ci = g.banc.ci; g.bx = S.x; g.bz = S.z; g.y = alcadaCami(g.ci, S.x, S.z);
  g.m.forEach((m, i) => { m.seq = posturesSeure(m, g.seients[i], g.y); posaAlSeient(m, g.seients[i], m.seq[0]); });
  g.cami = []; g.petja = []; g.haSegut = true;
  g.estat = 'transicio'; g.fase = 0; g.faseT = 0; g.despres = 'seu';
}
// al cap d'una estona, s'aixeca
function aixeca(g){
  g.m.forEach((m, i) => { m.seq = posturesSeure(m, g.seients[i], g.y).slice(0, 2).reverse(); m.model = m.seq[0]; });
  g.estat = 'transicio'; g.fase = 0; g.faseT = 0; g.despres = 'marxa';
}
// ja dret, torna a caminar: cap al punt de pas (pel costat, si cal) i després on vulgui
function marxa(g){
  const b = g.banc, v = XARXA.via.get(b.ci), S = g.seients[0].S;
  g.m.forEach((m, i) => {
    const s = g.seients[i];
    m.model = m.mDret || modelPersona(m.t); m.mDret = null;
    m.x = s.S.x; m.y = g.y; m.z = s.S.z; m.yaw = s.yaw; m.px = null; m.amp = 0;
  });
  g.cami = [...b.volta].reverse().map(p => ({x: p.x, z: p.z, ci: b.ci, tipus: 'volta'}));
  g.cami.push({x: v.x, z: v.z, ci: b.ci, tipus: 'via'});
  const w = g.cami[0], dir = Math.atan2(w.x - S.x, w.z - S.z), dx = Math.sin(dir), dz = Math.cos(dir);
  g.ci = b.ci; g.bx = S.x; g.bz = S.z; g.dir = dir; g.yaw = g.seients[0].yaw; g.carril = 0;
  // una mica de petja al darrere, perquè l'acompanyant surti al seu costat
  g.petja = [{x: S.x - dx*0.3, y: g.y, z: S.z - dz*0.3, s: 0}, {x: S.x, y: g.y, z: S.z, s: 0.3}];
  g.extra = 0; g.passos = 2 + Math.floor(rndGent()*8); g.ant = -1; g.entrada = -1; g.origen = g.porta = null;
  g.banc = null; g.seients = null; g.estat = 'camina';
}
// assegut, o asseient-se o aixecant-se
function pasSeient(g, dt){
  if(g.estat === 'seu'){ g.espera -= dt; if(g.espera <= 0) aixeca(g); return; }
  g.faseT += dt;
  if(g.faseT < PAS_SEURE) return;
  g.faseT = 0; g.fase++;
  if(g.fase < g.m[0].seq.length){ for(const m of g.m) m.model = m.seq[g.fase]; return; }
  for(const m of g.m) m.seq = null;
  if(g.despres === 'seu'){ g.estat = 'seu'; g.espera = gentDeDia ? 20 + rndGent()*50 : 8 + rndGent()*20; }
  else marxa(g);
}
// quan surt la gent, n'hi ha que ja són asseguts
function ompleBancs(){
  const persona = () => trets(gentDeDia && rndGent() < 0.2 ? (rndGent() < 0.5 ? 'nen' : 'nena') : (rndGent() < 0.5 ? 'home' : 'dona'), rndGent);
  for(const l of bancsDe.values()) for(const b of l){
    if(hash3(b.ci, 760, 1) > (gentDeDia ? 0.55 : 0.22) || !bancLliure(b)) continue;
    const ms = [{t: persona()}];
    if(hash3(b.ci, 760, 2) < 0.35){ const t = persona(); ms.push({t, lag: t.nen ? 0.02 : 0.01, costat: t.nen ? 0.1 : 0.115}); }
    const g = nouGrup(false, ms);
    g.banc = b; g.seients = seientsBanc(b, ms.length); g.haSegut = true;
    const S = g.seients[0].S;
    g.ci = b.ci; g.bx = S.x; g.bz = S.z; g.y = alcadaCami(b.ci, S.x, S.z);
    g.m.forEach((m, i) => posaAlSeient(m, g.seients[i], modelQuiet(poseAsseguda(m.t.k, m.t.hk), m.t)));
    g.estat = 'seu'; g.espera = 5 + rndGent()*(gentDeDia ? 60 : 25);
    grups.push(g);
  }
}

function arribat(g, w){
  if(w.tipus === 'porta'){ g.estat = 'entra'; g.extra = 0; g.m[0].vis = false; return; }
  if(w.tipus === 'seient'){ asseu(g); return; }
  if(w.tipus !== 'via' || g.cami.length) return;
  g.passos--;
  // si hi ha un banc lliure aquí mateix, potser s'hi asseu
  if(potSeure(g) && rndGent() < (gentDeDia ? 0.35 : 0.12)){
    const l = (bancsDe.get(g.ci) || []).filter(bancLliure);
    if(l.length){ vaASeure(g, l[Math.floor(rndGent()*l.length)]); return; }
  }
  if(rndGent() < (g.gat ? 0.3 : 0.08)){             // s'atura una estona
    g.estat = 'atura';
    g.espera = g.gat ? 3 + rndGent()*8 : 1.5 + rndGent()*3.5;
  } else planeja(g);
}

// avança el punt base d cap als punts del camí
function avanca(g, d){
  while(d > 1e-6 && g.cami.length && g.estat === 'camina'){
    const w = g.cami[0], dx = w.x - g.bx, dz = w.z - g.bz, l = Math.hypot(dx, dz);
    g.ci = w.ci;
    if(l > 1e-6) g.dir = Math.atan2(dx, dz);
    if(l <= d){ g.bx = w.x; g.bz = w.z; d -= l; g.cami.shift(); arribat(g, w); }
    else { g.bx += dx/l*d; g.bz += dz/l*d; d = 0; }
  }
}
const giraCap = (a, b, t) => { const d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d*Math.min(1, t); };

// un punt de la petja, a la distància s del començament
function puntPetja(pj, s){
  let i = pj.length - 1;
  while(i > 0 && pj[i-1].s > s) i--;
  if(i === 0) return {x: pj[0].x, y: pj[0].y, z: pj[0].z, dir: null};
  const a = pj[i-1], b = pj[i], t = (s - a.s)/((b.s - a.s) || 1), u = Math.min(1, Math.max(0, t));
  return {x: a.x + (b.x - a.x)*u, y: a.y + (b.y - a.y)*u, z: a.z + (b.z - a.z)*u, dir: Math.atan2(b.x - a.x, b.z - a.z)};
}

// un membre camina fins a (x, y, z): la fase de les cames avança amb el camí fet
function trepitja(m, x, y, z, yaw, dt, dt8){
  const d = m.px === null ? 0 : Math.hypot(x - m.px, z - m.pz);
  m.fase += d/m.model.pas*Math.PI;
  m.amp += ((d > 1e-5 ? 1 : 0) - m.amp)*dt8;
  m.x = x; m.z = z; m.px = x; m.pz = z; m.yaw = yaw;
  m.y = y + Math.abs(Math.sin(m.fase))*m.model.bot*m.amp;
}

const A_TOCAR = new Set(['porta', 'davant', 'seient', 'volta']);   // punts on el cap no va decantat
function pasGrup(g, dt){
  if(g.estat === 'seu' || g.estat === 'transicio'){ pasSeient(g, dt); return; }
  const dt8 = Math.min(1, dt*8), cap = g.m[0];
  if(g.estat === 'entra') g.extra += g.vel*dt;
  else if(g.estat === 'atura'){
    g.espera -= dt;
    if(g.espera <= 0){ g.estat = 'camina'; if(!g.cami.length) planeja(g); }
  } else avanca(g, g.vel*dt);
  if(g.estat === 'transicio') return;               // s'acaba d'asseure
  if(g.estat !== 'entra'){
    g.yaw = giraCap(g.yaw, g.dir, dt*7);
    const w = g.cami[0], aprop = w && A_TOCAR.has(w.tipus) || (g.origen && g.petja.length && g.petja[g.petja.length-1].s < 0.25);
    g.carril += ((aprop ? 0 : g.carril0) - g.carril)*Math.min(1, dt*3);
    g.y = alcadaCami(g.ci, g.bx, g.bz);
    const x = g.bx + Math.cos(g.yaw)*g.carril, z = g.bz - Math.sin(g.yaw)*g.carril;
    trepitja(cap, x, g.y, z, g.yaw, dt, dt8);
    cap.vis = true;
    // la petja, perquè els altres el segueixin
    const pj = g.petja, ult = pj[pj.length - 1];
    if(!ult) pj.push({x, y: g.y, z, s: 0});
    else { const d = Math.hypot(x - ult.x, z - ult.z); if(d > 0.02) pj.push({x, y: g.y, z, s: ult.s + d}); }
  }
  // els que el segueixen
  const pj = g.petja, fi = pj[pj.length - 1];
  let dins = g.estat === 'entra';
  for(let i=1; i<g.m.length; i++){
    const m = g.m[i], s = fi.s + g.extra - m.lag;
    if(s < pj[0].s - 1e-6 || (g.estat === 'entra' && s >= fi.s)){ m.vis = false; m.px = null; continue; }
    dins = false;
    const q = puntPetja(pj, s), yaw = q.dir === null ? g.yaw : q.dir;
    // de costat, però no quan passa per una porta
    let c = m.costat;
    for(const p of [g.porta, g.origen]) if(p) c *= Math.min(1, Math.hypot(q.x - p.x, q.z - p.z)/0.3);
    trepitja(m, q.x + Math.cos(yaw)*c, q.y, q.z - Math.sin(yaw)*c, yaw, dt, dt8);
    m.vis = true;
  }
  if(dins) g.estat = 'fi';                          // tots a dins
  while(pj.length > 2 && pj[1].s < fi.s - 0.5) pj.shift();
}

// on pot néixer un grup
function neixPorta(){
  const llista = [];
  for(const ps of portesDe.values()) for(const p of ps) llista.push(p);
  if(!llista.length) return false;
  const pes = llista.map(p => p.local ? 2 : 1);
  let r = rndGent()*pes.reduce((a, b) => a + b, 0), i = 0;
  while(i < llista.length - 1 && r > pes[i]){ r -= pes[i]; i++; }
  const p = llista[i], g = nouGrup(false), v = XARXA.via.get(p.st);
  g.bx = p.x; g.bz = p.z; g.ci = p.st; g.origen = p;
  g.dir = g.yaw = Math.atan2(p.nx, p.nz);
  g.cami.push({x: p.davant.x, z: p.davant.z, ci: p.st, tipus: 'davant'}, {x: v.x, z: v.z, ci: p.st, tipus: 'via'});
  grups.push(g);
  return true;
}
function neixCarrer(gat, simula){
  const ll = [...XARXA.veins.keys()].filter(ci => XARXA.veins.get(ci).length);
  if(!ll.length) return false;
  const ci = ll[Math.floor(rndGent()*ll.length)], v = XARXA.via.get(ci), g = nouGrup(gat);
  g.bx = v.x; g.bz = v.z; g.ci = ci;
  planeja(g);
  grups.push(g);
  // es fa caminar una estona, perquè no surtin tots alhora ni amb els acompanyants amagats
  if(simula) for(let k = 20 + Math.floor(rndGent()*30); k > 0; k--) pasGrup(g, 0.12);
  return true;
}

// quants n'hi ha d'haver: segons les cases, i de nit menys
function objectiusGent(){
  const cases = heights.filter(h => h > 0).length, n = XARXA ? XARXA.via.size : 0;
  let gent = Math.round(Math.min(26, cases/5, n/3));
  if(!gentDeDia) gent = Math.round(gent*0.4);
  return [gent, Math.min(3, Math.round(cases/30), Math.floor(n/6))];
}
const nGent = () => grups.filter(g => !g.gat && g.estat !== 'fi' && g.estat !== 'seu' && g.estat !== 'transicio').length;   // els que caminen
const nGats = () => grups.filter(g => g.gat).length;

// a cada fotograma: es mouen, en neixen de nous i es dibuixen
function mouGent(dt){
  if(!ambGent || !XARXA) return;
  for(const g of grups) pasGrup(g, dt);
  grups = grups.filter(g => g.estat !== 'fi');
  neixT -= dt;
  if(neixT <= 0){
    neixT = 0.7 + rndGent()*1.8;
    const [ng, nt] = objectiusGent();
    if(nGent() < ng){ if(!neixPorta()) neixCarrer(false, false); }
    else if(nGats() < nt) neixCarrer(true, false);
  }
  compon();
}

// el punt (x, z) és dins la cel·la ci, o a tocar de la vora
function dinsCella(ci, x, z, tol = 0.03){
  const p = cells[ci].p;
  let s = 0;
  for(let k=0;k<4;k++){
    const A = p[k], B = p[(k+1)%4], l = Math.hypot(B.x - A.x, B.z - A.z) || 1;
    const c = ((B.x - A.x)*(z - A.z) - (B.z - A.z)*(x - A.x))/l;
    if(k === 0) s = Math.sign(c) || 1;
    if(c*s < -tol) return false;
  }
  return true;
}

// després de refer la malla: si el camí d'un grup ja no hi és (s'hi ha fet una casa, una escala...), se'n va
function grupValid(g){
  const via = XARXA.via;
  if(!via.has(g.ci) || !dinsCella(g.ci, g.bx, g.bz)) return false;
  if(g.porta && !(portesDe.get(g.porta.st) || []).some(p => p.clau === g.porta.clau)) return false;
  if(g.banc){                                       // el banc on seu o on va ha de ser el mateix, al mateix lloc
    const b = (bancsDe.get(g.banc.ci) || []).find(x => x.clau === g.banc.clau);
    if(!b || Math.hypot(b.x - g.banc.x, b.z - g.banc.z) > 1e-6 || Math.abs(b.y - g.banc.y) > 1e-6) return false;
    g.banc = b;
  }
  let ant = g.ci;
  for(const w of g.cami){
    if(!via.has(w.ci)) return false;
    if(w.ci !== ant && !XARXA.veins.get(ant).some(n => n.b === w.ci)) return false;
    if(w.tipus === 'via'){ const v = via.get(w.ci); w.x = v.x; w.z = v.z; }   // el punt de pas pot haver canviat
    ant = w.ci;
  }
  return Math.abs(alcadaCami(g.ci, g.bx, g.bz) - g.y) < 0.05;
}

/* ============================================================
   LA GENT QUIETA
   ============================================================ */

const TOVALLOLES_G = ['#f2d68a', '#e3a8a2', '#a8c3cf', '#fbf8f1', '#d9473b', '#2f6f8f', '#3d9a5a'].map(C);

// una tovallola estesa (de llarg al llarg de a, al costat de s), amb dues ratlles, i algú estirat a sobre
function alSol(G, O, s, up, a, ci, rnd){
  const T = (x, z, h) => vSuma(vSuma(vSuma(O, s, x), a, z), up, h);
  const c1 = TOVALLOLES_G[Math.floor(rnd()*TOVALLOLES_G.length)], c2 = TOVALLOLES_G[Math.floor(rnd()*TOVALLOLES_G.length)];
  const W = 0.1, L = 0.27;
  cara(G, T(-W, -L, 0.018), T(W, -L, 0.018), T(W, L, 0.018), T(-W, L, 0.018), c1, up);
  for(const z of [-0.2, 0.17]) cara(G, T(-W, z, 0.02), T(W, z, 0.02), T(W, z + 0.03, 0.02), T(-W, z + 0.03, 0.02), c2, up);
  const t = trets(rnd() < 0.5 ? 'home' : 'dona', rnd, true);
  const J = poseEstirada(t.k, t.hk, rnd() < 0.35, 0, rnd() < 0.3);
  figura(G, J, T(0, -0.01*t.k, 0.02), s, up, a, t);
}

const COL_PLAT = C('#f4f1ea'), COL_VI = C('#6a1a2a'), COL_VIDRE = C('#d8e4e4'), COL_CERVESA = C('#e0a12a'),
      COL_ESCUMA = C('#fbf8f1'), COL_CAFE = C('#3a2418'), COLS_REFRESC = ['#c8322b', '#e0a63a', '#3d9a5a', '#2a2522'].map(C);

// què pren qui seu a la terrassa, al tauler (a l'alçada y), davant seu (F) i una mica a la dreta (R)
function beguda(G, x, z, y, R, F, rest, nen, rnd){
  if(rest){                                          // al restaurant, un plat i una copa de vi
    con(G, x, z, 0.03, 0.033, y, y + 0.005, 9, COL_PLAT, true);
    const gx = x - R[0]*0.045 + F[0]*0.02, gz = z - R[2]*0.045 + F[2]*0.02;
    con(G, gx, gz, 0.007, 0.007, y, y + 0.002, 5, COL_VIDRE, true);
    con(G, gx, gz, 0.0018, 0.0018, y + 0.002, y + 0.016, 3, COL_VIDRE, false);
    con(G, gx, gz, 0.004, 0.0085, y + 0.016, y + 0.034, 6, nen ? COLS_REFRESC[1] : COL_VI, true);
    return;
  }
  const r = nen ? 2 : Math.floor(rnd()*3), bx = x - R[0]*0.012, bz = z - R[2]*0.012;
  if(r === 0){                                       // un cafè, amb el platet
    con(G, bx, bz, 0.016, 0.016, y, y + 0.003, 7, COL_PLAT, true);
    con(G, bx, bz, 0.008, 0.009, y + 0.003, y + 0.015, 6, COL_PLAT, false);
    con(G, bx, bz, 0.0085, 0.0085, y + 0.014, y + 0.014, 6, COL_CAFE, true);
  } else if(r === 1){                                // una cervesa, amb escuma
    con(G, bx, bz, 0.0075, 0.0085, y, y + 0.026, 6, COL_CERVESA, false);
    con(G, bx, bz, 0.0086, 0.0088, y + 0.026, y + 0.032, 6, COL_ESCUMA, true);
  } else {                                           // un refresc
    con(G, bx, bz, 0.0065, 0.0065, y, y + 0.03, 6, COLS_REFRESC[Math.floor(rnd()*COLS_REFRESC.length)], true);
  }
}

// tothom qui no es mou: a les terrasses, a la platja (de dia) i pescant als molls
function quietaGent(){
  const G = newG();
  AL_SOL = new Set(); PESCADORS = new Map(); A_TERRASSA = new Set();
  // a les terrasses: a cada taula, ningú, una persona o dues, cara a cara (de nit, el restaurant s'omple més que el bar)
  for(const tb of TAULES){
    if(hash3(tb.ci, tb.k, 764) > (gentDeDia ? (tb.rest ? 0.45 : 0.6) : (tb.rest ? 0.65 : 0.35))) continue;
    const rnd = mulberry32(tb.ci*7717 + tb.k*131 + (gentDeDia ? 0 : 5));
    const costats = hash3(tb.ci, tb.k, 765) < 0.55 ? [-1, 1] : [hash3(tb.ci, tb.k, 766) < 0.5 ? -1 : 1];
    for(const s of costats){
      const F = [-tb.vx*s, 0, -tb.vz*s], R = [F[2], 0, -F[0]], cx = tb.x + tb.vx*s*0.15, cz = tb.z + tb.vz*s*0.15;
      const t = trets(gentDeDia && rnd() < 0.15 ? (rnd() < 0.5 ? 'nen' : 'nena') : (rnd() < 0.5 ? 'home' : 'dona'), rnd);
      figura(G, poseTaula(t.k, t.hk), [cx - F[0]*0.006, tb.y + 0.115, cz - F[2]*0.006], R, [0, 1, 0], F, t);
      beguda(G, cx + F[0]*0.105, cz + F[2]*0.105, tb.y + 0.18, R, F, tb.rest, t.nen, rnd);
    }
    A_TERRASSA.add(tb.ci);
  }
  // a la platja, només de dia
  if(gentDeDia) for(const sr of SORRES){
    const {ci, bl, hy} = sr, el = platja[ci], rnd = mulberry32(ci*104729 + 7);
    if(el === 1 || el === 2){
      // a l'arena, una tovallola; amb para-sol, a la seva ombra (on hi havia la tovallola petita)
      if(hash3(ci, 761, 1) > (el === 1 ? 0.5 : 0.75)) continue;
      const u = el === 1 ? llocSec(hy).u : Math.min(0.76, Math.max(0.24, ((0.35 + hash3(ci, 62, 1)*0.3) > 0.5 ? 0.06 : 0.66) + 0.13));
      const capV = hy(u, 0.1) >= hy(u, 0.9) ? 0.1 : 0.9;   // el cap, cap amunt
      const A = bl(u, 1 - capV), B = bl(u, capV);
      const A3 = [A.x, hy(u, 1 - capV), A.z], B3 = [B.x, hy(u, capV), B.z];
      const a = vUnit(vResta(B3, A3)), up = vUnit(vResta([0, 1, 0], vEsc(a, a[1])));
      alSol(G, vEntre(A3, B3, 0.5), vCreu(a, up), up, a, ci, rnd);
      AL_SOL.add(ci);
    } else if(el === 3){
      // a les gandules: en una, mig incorporat contra el respatller
      if(hash3(ci, 761, 2) > 0.6) continue;
      const L = llocElement(bl, hy, ci), cr = Math.cos(L.gir), sr = Math.sin(L.gir);
      const px = -0.06, pz = hash3(ci, 761, 3) < 0.5 ? 0.17 : -0.17;
      const O = [L.x + px*cr + pz*sr, L.y + 0.105, L.z - px*sr + pz*cr];
      const t = trets(rnd() < 0.5 ? 'home' : 'dona', rnd, true);
      figura(G, poseEstirada(t.k, t.hk, rnd() < 0.4, 0.45), O, [sr, 0, cr], [0, 1, 0], [-cr, 0, sr], t);
      AL_SOL.add(ci);
    }
  }
  // pescant als molls: assegut a la vora, on no hi ha cap barca amarrada ni res al darrere
  const cands = [];
  for(let ci=0; ci<cells.length; ci++){
    if(!moll[ci] || !XARXA.via.has(ci) || escalaE[ci] >= 0 || span[ci]) continue;
    for(let e=0;e<4;e++){
      const w = cells[ci].nb[e];
      if(!(w < 0 || aiguaLliure(w)) || OBST.get(ci) === e) continue;
      if(w >= 0 && amarrats.has(w + '_' + ci + '_' + e)) continue;
      const h = hash3(ci, e, 762);
      if(h < 0.3) cands.push({ci, e, h});
    }
  }
  // les cames i el fil no poden caure sobre cap barca amarrada (n'hi ha que ocupen tres cel·les d'aigua)
  const lliure = (x, z) => [...amarrats.values()].every(b => {
    const r = b.mesh.rotation.y, ux = Math.cos(r), uz = -Math.sin(r);
    const t = Math.max(-0.8, Math.min(0.8, (x - b.x)*ux + (z - b.z)*uz));
    return Math.hypot(x - b.x - ux*t, z - b.z - uz*t) > 0.32;
  });
  cands.sort((a, b) => a.h - b.h);
  let nP = 0;
  for(const {ci, e} of cands){
    if(nP >= 4) break;
    const cel = cells[ci], A = cel.p[e], B = cel.p[(e+1)%4], n = normalFora(A, B, cel.c);
    const P = entre(A, B, hash3(ci, e, 763) < 0.5 ? 0.28 : 0.72), y = nvC[ci][0]*ALT + CARRER_Y + 0.012;
    if(![0.12, 0.3, 0.5].every(o => lliure(P.x + n.x*o, P.z + n.z*o))) continue;
    nP++;
    const rnd = mulberry32(ci*31337 + e), t = trets(rnd() < 0.8 ? 'home' : 'dona', rnd);
    if(!t.barret && rnd() < 0.5) t.barret = rnd() < 0.5 ? 'palla' : 'gorra';
    const F = [n.x, 0, n.z], R = [n.z, 0, -n.x];
    const J = figura(G, posePescant(t.k, t.hk), [P.x, y, P.z], R, [0, 1, 0], F, t);
    // la canya, el fil fins a l'aigua i la galleda
    membre(G, J.canya0, J.canya1, 0.0045, 0.0018, COL_CANYA, 4);
    membre(G, J.canya0, vEntre(J.canya0, J.canya1, 0.18), 0.007, 0.006, FUSTA, 5);
    membre(G, J.canya1, [J.canya1[0], mar.position.y - 0.05, J.canya1[2]], 0.0012, 0.0012, COL_FIL, 3, false);
    const gx = P.x - n.x*0.05 + R[0]*0.1, gz = P.z - n.z*0.05 + R[2]*0.1;
    con(G, gx, gz, 0.02, 0.025, y - 0.012, y + 0.035, 7, COLS_GALLEDA[Math.floor(rnd()*3)], false);
    con(G, gx, gz, 0.019, 0.019, y + 0.02, y + 0.02, 7, C('#2c5c6c'), true);   // l'aigua de dins
    PESCADORS.set(ci, {x: P.x, y, z: P.z, fx: n.x, fz: n.z});
  }

  if(gentQuieta){ gentQuieta.geometry.dispose(); scene.remove(gentQuieta); gentQuieta = null; }
  if(!G.p.length) return;
  gentQuieta = new THREE.Mesh(toGeom(G), matPoble);
  gentQuieta.castShadow = true; gentQuieta.receiveShadow = true;
  scene.add(gentQuieta);
}

/* --- engegar, refer i apagar --- */

// després de cada construirMalla, si hi ha gent
let cellsGent = null;
function refaGent(){
  refaXarxa();
  refaPortes();
  refaBancs();
  quietaGent();
  const nova = cells !== cellsGent;
  if(nova){ grups = []; cellsGent = cells; }       // una cala nova: les cel·les ja no són les mateixes
  grups = grups.filter(grupValid);
  if(nova || !nAsseguts()) ompleBancs();           // n'hi ha que ja són asseguts als bancs
  // la primera vegada (o si no n'hi ha gaires) se n'hi posen de cop, ja caminant
  const [ng, nt] = objectiusGent();
  if(nGent() < ng*0.5) for(let i = nGent(); i < Math.round(ng*0.85); i++) neixCarrer(false, true);
  while(nGats() < nt && neixCarrer(true, true));
  grups = grups.filter(g => g.estat !== 'fi');     // n'hi pot haver que, caminant, ja han entrat
  compon();
}
function engegaGent(){
  rndGent = mulberry32(seed + 777);
  grups = []; cellsGent = null;
  refaGent();
}
function treuGent(){
  grups = []; XARXA = null; portesDe = new Map(); bancsDe = new Map();
  AL_SOL = new Set(); PESCADORS = new Map(); A_TERRASSA = new Set();
  if(gentQuieta){ gentQuieta.geometry.dispose(); scene.remove(gentQuieta); gentQuieta = null; }
  if(gentMov) gentMov.visible = false;
  redibuixa();
}
// de dia o de nit: la platja es buida, i pel carrer i als bancs n'hi ha menys
function horaGent(dia){
  const d = dia > 0.35;
  if(d === gentDeDia) return;
  gentDeDia = d;
  if(!ambGent || !XARXA) return;
  quietaGent();
  const [ng] = objectiusGent();
  let n = 0;
  for(const g of grups){
    if(g.gat || g.banc) continue;
    if(++n > ng) g.passos = 0;                      // els que sobren tornen cap a casa
  }
  // de nit, la majoria dels que seuen als bancs s'aixequen aviat
  if(!d) for(const g of grups) if(g.estat === 'seu' && rndGent() < 0.65) g.espera = Math.min(g.espera, 1 + rndGent()*12);
}

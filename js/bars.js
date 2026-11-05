/* Cala · locals de la planta baixa: bars, restaurants, botigues i hotels, i les terrasses */

/* ============================================================
   LOCALS
   ------------------------------------------------------------
   En mode Locals, clicant una casa la seva planta baixa es torna
   un local, i cada clic més el canvia pel següent (bar[ci]):
     1 bar, 2 restaurant, 3 botiga de queviures, 4 forn de pa,
     5 quiosc, 6 hotel, i torna a començar.
   Els cinc primers tenen aparador de vidre que de nit s'encén,
   tendal de ratlles i rètol, i cadascun el seu aparador: caixes
   de fruita, pa, revistes. L'hotel té portes de vidre, una
   marquesina i un rètol vertical que fa llum.

   Els bars i els restaurants poden tenir terrassa: si davant
   d'una façana hi ha dues cel·les buides seguides, a la que
   toca la casa s'hi posa la terrassa, amb taules i cadires, i
   l'altra queda de pas. La de la terrassa ha de ser un carrer o
   una plaça plans al nivell de la planta baixa; la de més enllà
   pot ser un altre carrer, la platja o l'aigua. Si no n'hi ha,
   el local es fa igualment, sense terrassa.
   ============================================================ */

let terrassaDe = new Map();   // cel·la de terrassa -> casa del bar
let barFront = new Map();     // casa del local -> aresta de la façana

// els locals, en l'ordre en què van sortint en clicar
const LOCALS = ['', 'un bar', 'un restaurant', 'una botiga de queviures', 'un forn de pa', 'un quiosc', 'un hotel'];
const LOCAL_MAX = LOCALS.length - 1;
const RETOL_LOCAL = ['', 'BAR', 'RESTAURANT', 'QUEVIURES', 'FORN', 'QUIOSC', 'HOTEL'];
const ambTerrassa = ci => bar[ci] === 1 || bar[ci] === 2;

const TENDALS = [[C('#2f6b4f'), C('#f1ece2')], [C('#a8322b'), C('#f1ece2')], [C('#2f5f86'), C('#f1ece2')], [C('#d39b2e'), C('#f1ece2')]];
const RETOLS  = [C('#24453a'), C('#5a1f1c'), C('#1f3550')];
const LLETRA_BAR = C('#ffd66b'), LLETRA_REST = C('#fff4dc');
const ESTOVALLES = C('#f4f1ea'), ALUMINI = C('#a7a9a6'), PISSARRA = C('#2f3431');
const FRUITES = ['#e8892a', '#c8322b', '#7bb03c', '#f2d23a', '#8a3a6a'].map(C);
const CROSTA = [C('#c98b45'), C('#a8672e'), C('#d9a560')];
const REVISTES = ['#d9473b', '#2f6f8f', '#f2c230', '#3d9a5a', '#fbf8f1', '#e07a9a', '#6b3f7a'].map(C);
const MARQUESINA = C('#2b3a3a'), LLETRA_HOTEL = C('#fff1c4'), MARBRE = C('#e8e2d4');

// terra pla i lliure, al nivell L: hi cap una terrassa
const lliureTerrassa = (b, L) => b >= 0 && esCarrer[b] && heights[b] === 0 && !span[b] && escalaE[b] < 0
  && !fars[b] && !mercat[b] && !esMunt(b) && !pont[b] && nivEf[b] === L;
// la cel·la de més enllà: un carrer o una plaça lliures, la platja o l'aigua (per on es passa o es mira)
const lliurePas = b => b >= 0 && heights[b] === 0 && !span[b] && !mercat[b] && !pont[b] && !esMunt(b) && !fars[b]
  && (!esCarrer[b] || escalaE[b] < 0);

// la terrassa d'una casa: {e, n1, n2} o null. ocupades: cel·les que ja fan de terrassa o de pas
function llocTerrassa(ci, ocupades = new Set()){
  if(!(heights[ci] > 0) || span[ci]) return null;
  const nb = cells[ci].nb, h = Math.floor(hash3(ci, 320, 1)*4);
  for(let k=0;k<4;k++){
    const e = (h + k) % 4, n1 = nb[e];
    if(!lliureTerrassa(n1, base[ci]) || ocupades.has(n1)) continue;
    const j = cells[n1].nb.indexOf(ci), n2 = j < 0 ? -1 : cells[n1].nb[(j+2)%4];
    if(!lliurePas(n2) || terrassaDe.has(n2)) continue;
    return {e, n1, n2};
  }
  return null;
}
// sense terrassa: la façana de la planta baixa que dona a un carrer (o, si no, a fora)
function facanaBar(ci){
  const cel = cells[ci], {ext} = cantons(cel, base[ci]), h = Math.floor(hash3(ci, 321, 1)*4);
  let alt = -1;
  for(let k=0;k<4;k++){
    const e = (h + k) % 4; if(!ext[e]) continue;
    if(nivellVora(cel.nb[e], ci) === base[ci]) return e;
    if(alt < 0) alt = e;
  }
  return alt;
}
// es pot fer un local aquí? una casa amb alguna façana a la planta baixa
const potBar = ci => ci >= 0 && heights[ci] > 0 && !span[ci] && cantons(cells[ci], base[ci]).ext.some(Boolean);

// on va cada local i cada terrassa: cada casa, per ordre, tria la primera façana que pot.
// Només els bars i els restaurants busquen terrassa
function triaBars(){
  terrassaDe = new Map(); barFront = new Map();
  const ocupades = new Set();
  for(let ci=0; ci<cells.length; ci++){
    if(!bar[ci] || !(heights[ci] > 0) || span[ci]) continue;
    const t = ambTerrassa(ci) ? llocTerrassa(ci, ocupades) : null;
    if(t){ terrassaDe.set(t.n1, ci); ocupades.add(t.n1); ocupades.add(t.n2); barFront.set(ci, t.e); continue; }
    const f = facanaBar(ci);
    if(f >= 0) barFront.set(ci, f);
  }
}

/* --- rètols: lletres de 3x5 punts --- */
const LLETRES = {
  A: ['010','101','111','101','101'], B: ['110','101','110','101','110'], C: ['011','100','100','100','011'],
  E: ['111','100','110','100','111'], F: ['111','100','110','100','100'], H: ['101','101','111','101','101'],
  I: ['111','010','010','010','111'], L: ['100','100','100','100','111'], N: ['101','111','111','111','101'],
  O: ['111','101','101','101','111'], Q: ['010','101','101','110','011'], R: ['110','101','110','101','101'],
  S: ['011','100','010','001','110'], T: ['111','010','010','010','010'], U: ['101','101','101','101','111'],
  V: ['101','101','101','101','010']
};
// escriu text amb punts quadrats de costat px. punt(col, fila, x, y) en rep cada un:
// en horitzontal (x avança amb la lletra) o en vertical (les lletres l'una sota l'altra)
function escriu(text, vertical, punt){
  for(let i=0;i<text.length;i++){
    const g = LLETRES[text[i]];
    for(let r=0;r<5;r++) for(let cc=0;cc<3;cc++)
      if(g[r][cc] === '1') punt(vertical ? cc : i*4 + cc, vertical ? i*6 + r : r);
  }
}

// la façana del local, a la planta baixa de l'aresta e
function facanaBarG(G, cel, ci){
  const e = barFront.get(ci); if(e === undefined) return;
  const {rodo} = cantons(cel, base[ci]);
  const S = rodo[e] ? arcCanto(cel, e)[ARR_K] : cel.p[e];
  const T = rodo[(e+1)%4] ? arcCanto(cel, (e+1)%4)[0] : cel.p[(e+1)%4];
  const dx = T.x - S.x, dz = T.z - S.z, len = Math.hypot(dx, dz);
  if(len < 0.3) return;
  const ux = dx/len, uz = dz/len, nx = -uz, nz = ux, N = [nx, 0, nz];
  const P = (t, y, o) => [S.x + dx*t + nx*o, y, S.z + dz*t + nz*o];
  const q = (t0, t1, ya, yb, o, col, GG = G) => cara(GG, P(t0,ya,o), P(t1,ya,o), P(t1,yb,o), P(t0,yb,o), col, N);
  const f = {G, P, q, len, ux, uz, nx, nz, N, y0: base[ci]*ALT, ci};
  if(bar[ci] === 6) hotelG(f);
  else botigaG(f, bar[ci]);
}

// rètol horitzontal amb lletres que fan llum, centrat a tm, entre ry0 i dalt
function retol(f, text, tm, wt, ry0, fons, lletra){
  const {q, len} = f;
  const px = Math.min(0.03, (wt*len - 0.04) / (text.length*4 - 1));
  const ry1 = ry0 + px*5 + 0.04;
  q(tm - wt/2, tm + wt/2, ry0, ry1, 0.02, fons);
  const amp = (text.length*4 - 1)*px / len;                       // amplada del text, en t
  escriu(text, false, (x, r) => {
    const tx = tm - amp/2 + x*px/len, yy = ry1 - 0.02 - (r+1)*px;
    q(tx, tx + px/len, yy, yy + px, 0.024, lletra, GL);
  });
}

// bar, restaurant, queviures, forn o quiosc: aparador, tendal i rètol, i el que hi ha a l'aparador
function botigaG(f, tipus){
  const {G, P, q, len, nx, nz, y0, ci} = f;
  const rest = tipus === 2;
  const marc = rest || tipus === 4 ? FUSTA : colorPorticons(ci);
  const [c1, c2] = TENDALS[Math.floor(hash3(ci, 322, 1)*TENDALS.length)];

  // aparador: vidre que s'encén de nit, amb marc, travesser, porta i sòcol de fusta
  const t0 = 0.12, t1 = 0.88, ya = y0 + 0.1, yb = y0 + 0.52, o = 0.03;
  q(t0, t1, y0, ya, o, fosc(marc, 0.85));
  q(t0, t1, ya, yb, o, fosc(CALID, 0.85), GF);
  for(const [a, b] of [[t0 - 0.02, t0 + 0.01], [t1 - 0.01, t1 + 0.02], [0.6, 0.62]]) q(a, b, y0, yb + 0.02, o + 0.004, marc);
  q(t0 - 0.02, t1 + 0.02, yb, yb + 0.03, o + 0.004, marc);
  q(t0, 0.6, ya + 0.27, ya + 0.29, o + 0.004, marc);                // travesser de l'aparador
  // tendal de ratlles, amb el volant que penja
  const ta = 0.06, tb = 0.94, yt = y0 + 0.64, yf = y0 + 0.5, of = 0.3, NR = 7;
  for(let k=0;k<NR;k++){
    const s0 = ta + (tb - ta)*k/NR, s1 = ta + (tb - ta)*(k+1)/NR, col = k % 2 ? c2 : c1;
    cara(G, P(s0, yt, 0.01), P(s1, yt, 0.01), P(s1, yf, of), P(s0, yf, of), col, [nx, 1, nz]);
    cara(G, P(s0, yt, 0.01), P(s1, yt, 0.01), P(s1, yf, of), P(s0, yf, of), fosc(col, 0.6), [-nx, -1, -nz]);
    q(s0, s1, yf - 0.06, yf, of, col);
    cara(G, P(s0, yf - 0.06, of - 0.002), P(s1, yf - 0.06, of - 0.002), P(s1, yf, of - 0.002), P(s0, yf, of - 0.002),
         fosc(col, 0.7), [-nx, 0, -nz]);                           // per dins del volant
  }
  for(const s of [ta, tb]){                                         // els costats del tendal
    const a = P(s, yt, 0.01), b = P(s, yf, of), c = P(s, yf, 0.01);
    tri(G, a, b, c, fosc(c1, 0.8)); tri(G, a, c, b, fosc(c1, 0.8));
  }
  // el rètol, a sobre del tendal
  const text = RETOL_LOCAL[tipus];
  retol(f, text, 0.5, text.length > 4 ? 0.8 : 0.42, yt + 0.015, RETOLS[Math.floor(hash3(ci, 323, 1)*RETOLS.length)],
        tipus === 1 ? LLETRA_BAR : LLETRA_REST);

  // a cada botiga, el seu aparador (a l'esquerra de la porta, que és a 0.6)
  const W = (t, y, o) => { const p = P(t, y, o); return {x: p[0], y: p[1], z: p[2]}; };
  if(tipus === 3){
    // queviures: caixes de fruita a fora, sobre un banc baix
    const bc = W(0.35, 0, 0.17);
    caixa(G, bc.x, bc.z, f.ux, f.uz, 0.21*len, 0.1, y0 + 0.08, y0 + 0.1, FUSTA);
    for(const t of [0.17, 0.53]) for(const s of [-1, 1]) { const p = W(t, 0, 0.17 + s*0.07); con(G, p.x, p.z, 0.008, 0.008, y0, y0 + 0.08, 3, fosc(FUSTA, 0.8), false); }
    for(let k=0;k<3;k++){
      const tc = 0.2 + k*0.15, c = W(tc, 0, 0.17), fr = FRUITES[Math.floor(hash3(ci, 330, k)*FRUITES.length)];
      caixa(G, c.x, c.z, f.ux, f.uz, 0.065, 0.05, y0 + 0.1, y0 + 0.15, C('#c9a36b'));
      for(let i=0;i<3;i++) for(let j=0;j<2;j++){                     // la fruita, en dues fileres de tres
        const p = W(tc + (i - 1)*0.042/len, 0, 0.17 + (j - 0.5)*0.045);
        bola(G, p.x, y0 + 0.165, p.z, 0.022, 0.02, fr, ci*13 + k*7 + i*2 + j, 5);
      }
    }
  } else if(tipus === 4){
    // forn: pans i barres a l'aparador, sobre un prestatge
    const pr = W(0.36, 0, o + 0.03);
    caixa(G, pr.x, pr.z, f.ux, f.uz, 0.22*len, 0.03, ya + 0.08, ya + 0.095, FUSTA);
    for(let k=0;k<4;k++){
      const p = W(0.19 + k*0.11, 0, o + 0.035), col = CROSTA[k % CROSTA.length];
      if(k % 2) bola(G, p.x, ya + 0.125, p.z, 0.038, 0.03, col, ci*5 + k, 6);                  // pa rodó
      else tronc(G, p.x - f.ux*0.045, ya + 0.112, p.z - f.uz*0.045, p.x + f.ux*0.045, ya + 0.112, p.z + f.uz*0.045, 0.016, 0.016, col, 5);   // barra
    }
    for(let k=0;k<3;k++){                                            // i a baix, més barres dretes en un cistell
      const p = W(0.72 + k*0.04, 0, o + 0.04);
      tronc(G, p.x, y0 + 0.12, p.z, p.x + f.ux*0.02, y0 + 0.3, p.z + f.uz*0.02, 0.014, 0.012, CROSTA[k], 4);
    }
    const ci2 = W(0.76, 0, o + 0.045);
    con(G, ci2.x, ci2.z, 0.05, 0.06, y0 + 0.02, y0 + 0.14, 7, C('#b88a4a'), true);
  } else if(tipus === 5){
    // quiosc: expositors de revistes a banda i banda de la porta, i diaris en un taulell
    const expositor = (ta, tb) => {
      q(ta, tb, y0 + 0.06, y0 + 0.5, 0.06, ALUMINI);
      const fil = 4, col = Math.max(2, Math.round((tb - ta)*len/0.075));
      for(let r=0;r<fil;r++) for(let c=0;c<col;c++){
        const a = ta + (tb - ta)*(c + 0.1)/col, b = ta + (tb - ta)*(c + 0.9)/col;
        const yy = y0 + 0.08 + r*0.105;
        q(a, b, yy, yy + 0.085, 0.064, REVISTES[Math.floor(hash3(ci, 331 + r, c)*REVISTES.length)]);
      }
    };
    expositor(0.14, 0.56); expositor(0.66, 0.86);
    const tl = W(0.35, 0, 0.16);
    caixa(G, tl.x, tl.z, f.ux, f.uz, 0.18*len, 0.06, y0, y0 + 0.16, fosc(ALUMINI, 0.8));
    for(let k=0;k<4;k++){
      const p = W(0.2 + k*0.1, 0, 0.16);
      caixa(G, p.x, p.z, f.ux, f.uz, 0.04, 0.05, y0 + 0.16, y0 + 0.17 + k*0.004, k % 2 ? C('#efe8d8') : C('#e3dccb'));
    }
  }
}

// l'hotel: portes de vidre amb marc de marbre, una marquesina, dos testos i el rètol
function hotelG(f){
  const {G, P, q, len, nx, nz, y0, ci} = f;
  const W = (t, y, o) => { const p = P(t, y, o); return {x: p[0], y: p[1], z: p[2]}; };
  // l'entrada: marc de marbre i portes de vidre que s'encenen
  const t0 = 0.3, t1 = 0.7, yb = y0 + 0.55, o = 0.03;
  q(t0 - 0.05, t1 + 0.05, y0, yb + 0.05, o, MARBRE);
  q(t0, t1, y0 + 0.02, yb, o + 0.003, fosc(CALID, 0.9), GF);
  q(0.495, 0.505, y0 + 0.02, yb, o + 0.006, MARQUESINA);
  for(const t of [t0 + 0.04, t1 - 0.04]) q(t - 0.006, t + 0.006, y0 + 0.2, y0 + 0.34, o + 0.008, BRONZE);   // poms
  const gr = W(0.5, 0, 0.09);                                       // el graó
  caixa(G, gr.x, gr.z, f.ux, f.uz, (t1 - t0 + 0.14)*len/2, 0.06, y0, y0 + 0.03, MARBRE);
  // la marquesina, sostinguda per dos tirants
  const yq = y0 + 0.66, om = 0.34;
  cara(G, P(t0 - 0.1, yq, 0.01), P(t1 + 0.1, yq, 0.01), P(t1 + 0.1, yq, om), P(t0 - 0.1, yq, om), MARQUESINA, [nx, 1, nz]);
  cara(G, P(t0 - 0.1, yq - 0.04, 0.01), P(t1 + 0.1, yq - 0.04, 0.01), P(t1 + 0.1, yq - 0.04, om), P(t0 - 0.1, yq - 0.04, om), fosc(MARQUESINA, 0.8), [-nx, -1, -nz]);
  q(t0 - 0.1, t1 + 0.1, yq - 0.04, yq, om, MARQUESINA);
  for(const t of [t0 - 0.08, t1 + 0.08]){
    const a = W(t, y0 + 0.9, 0.01), b = W(t, yq, om - 0.02);
    tronc(G, a.x, a.y, a.z, b.x, b.y, b.z, 0.006, 0.006, FERRO, 3);
  }
  // llums sota la marquesina
  for(const t of [0.4, 0.6]){ const p = W(t, 0, om*0.6); bombeta(p.x, yq - 0.05, p.z, CALIDA, 0.018); LLUMS.push(p.x, yq - 0.06, p.z); }
  // dos testos amb arbustos retallats, a banda i banda
  for(const t of [t0 - 0.12, t1 + 0.12]){
    const p = W(t, 0, 0.1);
    con(G, p.x, p.z, 0.05, 0.04, y0, y0 + 0.11, 6, MARBRE, true);
    bola(G, p.x, y0 + 0.2, p.z, 0.06, 0.1, C('#3f6b44'), ci + Math.round(t*100), 6);
  }
  // el rètol: vertical a la banda de la façana si la casa té pisos a sobre; si no, damunt la marquesina
  const fons = C('#1f2a2a');
  if(heights[ci] >= 2){
    const px = 0.024, h = (5*6 - 1)*px + 0.06, ta = 0.06, wpx = px/len, tb = ta + 3*wpx + 0.05/len;
    const yA = y0 + ALT + 0.08, yB = yA + h;
    q(ta, tb, yA, yB, 0.02, fons);
    escriu('HOTEL', true, (c, r) => {
      const tx = ta + 0.025/len + c*wpx, yy = yB - 0.03 - (r + 1)*px;
      q(tx, tx + wpx, yy, yy + px, 0.024, LLETRA_HOTEL, GL);
    });
    // tres estrelles sota el rètol
    for(let k=0;k<3;k++){
      const tk = (ta + tb)/2 + (k - 1)*0.035/len;
      q(tk - 0.008/len, tk + 0.008/len, yA - 0.04, yA - 0.024, 0.02, C('#e0b84a'), GL);
    }
  } else {
    retol(f, 'HOTEL', 0.5, 0.42, yq + 0.01, fons, LLETRA_HOTEL);
  }
}

/* --- la terrassa: taules amb cadires; al bar, para-sols; al restaurant, estovalles --- */
function cadira(G, x, y, z, ux, uz, col){                // mira cap a (ux, uz)
  caixa(G, x, z, ux, uz, 0.035, 0.035, y + 0.1, y + 0.115, col);
  for(const [a, b] of [[-1,-1],[1,-1],[-1,1],[1,1]])
    con(G, x + ux*a*0.028 - uz*b*0.028, z + uz*a*0.028 + ux*b*0.028, 0.005, 0.005, y, y + 0.1, 3, fosc(col, 0.8), false);
  caixa(G, x - ux*0.033, z - uz*0.033, ux, uz, 0.006, 0.035, y + 0.115, y + 0.2, col);   // respatller
}
function terrassa(G, cel, ci, y){
  const casa = terrassaDe.get(ci), rest = bar[casa] === 2;
  const [c1, c2] = TENDALS[Math.floor(hash3(casa, 322, 1)*TENDALS.length)];
  const colCad = rest ? FUSTA : ALUMINI;
  const c = cel.c, salta = Math.floor(hash3(ci, 324, 1)*4);
  for(let k=0;k<4;k++){
    if(k === salta) continue;                                      // tres taules: n'hi ha prou
    const p = entre(c, cel.p[k], 0.46);
    // taula: peu i tauler (amb estovalles al restaurant)
    con(G, p.x, p.z, 0.015, 0.012, y, y + 0.17, 4, FERRO, false);
    con(G, p.x, p.z, rest ? 0.105 : 0.09, rest ? 0.105 : 0.09, y + 0.165, y + 0.18, 8, rest ? ESTOVALLES : ALUMINI, true);
    if(rest) con(G, p.x, p.z, 0.106, 0.1, y + 0.13, y + 0.168, 8, ESTOVALLES, false);   // les estovalles que pengen
    // dues cadires, una a cada banda, mirant la taula
    const A = cel.p[k], B = cel.p[(k+1)%4], l = Math.hypot(B.x-A.x, B.z-A.z) || 1;
    const vx = (B.x-A.x)/l, vz = (B.z-A.z)/l;
    for(const s of [-1, 1]) cadira(G, p.x + vx*s*0.15, y, p.z + vz*s*0.15, -vx*s, -vz*s, colCad);
    // para-sol, al bar; al restaurant, una espelma
    if(!rest){
      con(G, p.x, p.z, 0.008, 0.008, y + 0.18, y + 0.52, 4, FUSTA, false);
      const r = 0.2, n = 8;
      for(let j=0;j<n;j++){
        const a0 = j*6.283/n, a1 = (j+1)*6.283/n, col = j % 2 ? c2 : c1;
        const v = [p.x, y + 0.56, p.z], a = [p.x + Math.cos(a0)*r, y + 0.47, p.z + Math.sin(a0)*r], b = [p.x + Math.cos(a1)*r, y + 0.47, p.z + Math.sin(a1)*r];
        tri(G, v, b, a, col); tri(G, v, a, b, fosc(col, 0.7));
      }
    } else {
      bombeta(p.x, y + 0.2, p.z, CALIDA, 0.012);
    }
  }
  // al restaurant, la pissarra del menú; al bar, un test
  const m = entre(c, cel.p[salta], 0.45);
  if(rest){
    caixa(G, m.x, m.z, 1, 0, 0.01, 0.06, y, y + 0.22, PISSARRA);
    caixa(G, m.x, m.z, 1, 0, 0.012, 0.065, y + 0.22, y + 0.24, FUSTA);
  } else test(G, m.x, y, m.z, ci, 1.1);
}

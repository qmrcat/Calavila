/* Cala · bars i restaurants: la planta baixa d'una casa i la seva terrassa */

/* ============================================================
   BARS I RESTAURANTS
   ------------------------------------------------------------
   En mode Bars, clicant una casa la seva planta baixa es torna
   un bar o un restaurant (bar[ci] = 1 o 2; tornant-hi a clicar,
   canvia d'un a l'altre). La façana té un aparador de vidre que
   de nit s'encén, un tendal de ratlles i un rètol.

   Si davant d'una façana hi ha dues cel·les buides seguides,
   a la que toca la casa s'hi posa la terrassa, amb taules i
   cadires, i l'altra queda de pas. La de la terrassa ha de ser
   un carrer o una plaça plans al nivell de la planta baixa; la
   de més enllà pot ser un altre carrer, la platja o l'aigua.
   Si no n'hi ha, el bar es fa igualment, sense terrassa.
   ============================================================ */

let terrassaDe = new Map();   // cel·la de terrassa -> casa del bar
let barFront = new Map();     // casa del bar -> aresta de la façana del bar

const TENDALS = [[C('#2f6b4f'), C('#f1ece2')], [C('#a8322b'), C('#f1ece2')], [C('#2f5f86'), C('#f1ece2')], [C('#d39b2e'), C('#f1ece2')]];
const RETOLS  = [C('#24453a'), C('#5a1f1c'), C('#1f3550')];
const LLETRA_BAR = C('#ffd66b'), LLETRA_REST = C('#fff4dc');
const ESTOVALLES = C('#f4f1ea'), ALUMINI = C('#a7a9a6'), PISSARRA = C('#2f3431');

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
// es pot fer un bar aquí? una casa amb alguna façana a la planta baixa
const potBar = ci => ci >= 0 && heights[ci] > 0 && !span[ci] && cantons(cells[ci], base[ci]).ext.some(Boolean);

// on va cada bar i cada terrassa: cada casa, per ordre, tria la primera façana que pot
function triaBars(){
  terrassaDe = new Map(); barFront = new Map();
  const ocupades = new Set();
  for(let ci=0; ci<cells.length; ci++){
    if(!bar[ci] || !(heights[ci] > 0) || span[ci]) continue;
    const t = llocTerrassa(ci, ocupades);
    if(t){ terrassaDe.set(t.n1, ci); ocupades.add(t.n1); ocupades.add(t.n2); barFront.set(ci, t.e); continue; }
    const f = facanaBar(ci);
    if(f >= 0) barFront.set(ci, f);
  }
}

/* --- rètols: lletres de 3x5 punts --- */
const LLETRES = {
  B: ['110','101','110','101','110'], A: ['010','101','111','101','101'], R: ['110','101','110','101','101'],
  E: ['111','100','110','100','111'], S: ['011','100','010','001','110'], T: ['111','010','010','010','010'],
  U: ['101','101','101','101','111'], N: ['101','111','111','111','101']
};

// la façana del bar: aparador, tendal i rètol, a la planta baixa de l'aresta e
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
  const y0 = base[ci]*ALT, rest = bar[ci] === 2;
  const marc = rest ? FUSTA : colorPorticons(ci);
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
  // rètol a sobre del tendal, amb les lletres que fan llum
  const text = rest ? 'RESTAURANT' : 'BAR';
  const fons = RETOLS[Math.floor(hash3(ci, 323, 1)*RETOLS.length)];
  const wt = Math.min(0.8, rest ? 0.8 : 0.42), tm = 0.5;
  const px = Math.min(0.03, (wt*len - 0.04) / (text.length*4 - 1));
  const ry0 = yt + 0.015, ry1 = ry0 + px*5 + 0.04;
  q(tm - wt/2, tm + wt/2, ry0, ry1, 0.02, fons);
  const amp = (text.length*4 - 1)*px / len;                        // amplada del text, en t
  for(let i=0;i<text.length;i++){
    const g = LLETRES[text[i]];
    for(let r=0;r<5;r++) for(let cc=0;cc<3;cc++){
      if(g[r][cc] !== '1') continue;
      const tx = tm - amp/2 + (i*4 + cc)*px/len, yy = ry1 - 0.02 - (r+1)*px;
      q(tx, tx + px/len, yy, yy + px, 0.024, rest ? LLETRA_REST : LLETRA_BAR, GL);
    }
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

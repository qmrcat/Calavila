/* Cala · guarniments de Nadal: llums a les cases i als carrers, i arbres de Nadal */

/* ============================================================
   NADAL
   ------------------------------------------------------------
   S'activa a Configuració, i es recorda en aquest navegador (no
   a la partida). Quan és activat:
   - una de cada tres cases, més o menys, té una garlanda de
     bombetes sota el ràfec, per les façanes que donen a fora;
   - els carrers estrets entre dues cases prou altes tenen
     una tira de llums penjada d'una façana a l'altra, amb una
     estrella al mig;
   - en algunes places i carrers hi ha un arbre de Nadal amb
     boles, llums i una estrella al capdamunt;
   - es pot fer un mercat de Nadal (vegeu més avall).
   Quines cases i quins carrers es guarneixen surt d'un hash de
   la cel·la: sempre són els mateixos. Les bombetes fan llum
   pròpia (GL) i de nit s'encenen del tot.
   ============================================================ */

let nadal = false;

const BOMBETES = ['#fff1c4', '#ff5a4a', '#6be08a', '#ffcc4a', '#6ab8ff'].map(C);
const CALIDA   = C('#ffe6a8');                 // bombeta blanca calenta
const OR       = C('#ffcf4d');
const AVET     = C('#2f5a3a');
const BOLES    = ['#c8322b', '#d9a632', '#3a6fb0', '#e8e4dc'].map(C);

// una bombeta: un rombe petit que fa llum pròpia
function bombeta(x, y, z, col, r = 0.03){
  con(GL, x, z, 0, r, y - r, y, 4, col, false);
  con(GL, x, z, r, 0, y, y + r, 4, col, false);
}

// tira de llums entre A i B (x, y, z) que fa panxa: el cable i les bombetes
// colors: una llista per anar alternant, o un sol color
function garlanda(A, B, panxa, cols, llavor){
  const l = Math.hypot(B.x-A.x, B.z-A.z);
  const n = Math.max(2, Math.round(l/0.1));
  const P = t => ({x: A.x + (B.x-A.x)*t, y: A.y + (B.y-A.y)*t - panxa*4*t*(1-t), z: A.z + (B.z-A.z)*t});
  const M = Math.min(8, n);
  for(let k=0;k<M;k++){                                  // el cable, en uns quants trams
    const a = P(k/M), b = P((k+1)/M);
    tronc(GL, a.x, a.y, a.z, b.x, b.y, b.z, 0.005, 0.005, fosc(FERRO, 1), 3);
  }
  for(let k=1;k<n;k++){
    const p = P(k/n);
    bombeta(p.x, p.y - 0.025, p.z, cols[(k + llavor) % cols.length]);
  }
}

// quina mena de llums té cada casa o carrer: tot blanc calent, o de colors
const colorsDe = ci => hash3(ci, 302, 1) < PAR.llumsBlanques ? [CALIDA] : BOMBETES;

/* --- cases: garlanda sota el ràfec, per les façanes exteriors del darrer pis --- */
const casaGuarnida = ci => hash3(ci, 301, 1) < PAR.casesNadal;

function garlandaCasa(G, cel, ci, h){
  const {ext, rodo} = cantons(cel, h - 1);
  const y = h*ALT - 0.06, c = cel.c, cols = colorsDe(ci);
  for(let e=0;e<4;e++){
    if(!ext[e]) continue;
    const S = rodo[e] ? arcCanto(cel, e)[ARR_K] : cel.p[e];
    const T = rodo[(e+1)%4] ? arcCanto(cel, (e+1)%4)[0] : cel.p[(e+1)%4];
    // una mica enfora de la paret
    const m = entre(S, T, 0.5), dx = m.x - c.x, dz = m.z - c.z, d = Math.hypot(dx, dz) || 1;
    const o = 0.035, ox = dx/d*o, oz = dz/d*o;
    garlanda({x: S.x+ox, y, z: S.z+oz}, {x: T.x+ox, y, z: T.z+oz}, 0.07, cols, e);
  }
}

/* --- carrers: tira de llums d'una façana a la de davant --- */
// l'eix (0 o 1) on hi ha cases enfrontades prou altes per penjar-hi els llums, o -1
function eixLlums(ci){
  if(!esCarrer[ci] || span[ci] || esMunt(ci) || hash3(ci, 303, 1) >= PAR.carrersNadal) return -1;
  const sota = Math.max(...nvC[ci])*ALT + CARRER_Y + 1.15;   // prou amunt per passar-hi per sota
  const alta = b => b >= 0 && heff[b] > 0 && !span[b] && heff[b]*ALT > sota + 0.25 && base[b]*ALT < sota - 0.3;
  const nb = cells[ci].nb, prim = hash3(ci, 303, 2) < 0.5 ? 0 : 1;
  for(const e of [prim, 1 - prim]) if(alta(nb[e]) && alta(nb[e+2])) return e;
  return -1;
}
function llumsCarrer(G, cel, ci){
  const e = eixLlums(ci); if(e < 0) return;
  const y = Math.max(...nvC[ci])*ALT + CARRER_Y + 1.15 + hash3(ci, 304, 1)*0.25;
  const A = entre(cel.p[e], cel.p[(e+1)%4], 0.5), B = entre(cel.p[e+2], cel.p[(e+3)%4], 0.5);
  const cols = colorsDe(ci);
  garlanda({x: A.x, y, z: A.z}, {x: B.x, y, z: B.z}, 0.16, cols, 0);
  // al mig, una estrella (o un estel) que penja
  const m = entre(A, B, 0.5), ym = y - 0.16 - 0.05;
  const ux = (B.x - A.x), uz = (B.z - A.z), l = Math.hypot(ux, uz) || 1;
  estrella(m.x, ym - 0.13, m.z, ux/l, uz/l, 0.12, cols.length > 1 ? OR : CALIDA);
  LLUMS.push(m.x, ym - 0.13, m.z);
}
// estrella plana de cinc puntes, al pla vertical que segueix (ux, uz), visible per les dues cares
function estrella(x, y, z, ux, uz, r, col){
  const pt = (k, rr) => { const a = Math.PI/2 + k*Math.PI/5; return [x + ux*Math.cos(a)*rr, y + Math.sin(a)*rr, z + uz*Math.cos(a)*rr]; };
  const c = [x, y, z];
  for(let k=0;k<10;k++){
    const a = pt(k, k%2 ? r*0.45 : r), b = pt(k+1, (k+1)%2 ? r*0.45 : r);
    tri(GL, c, a, b, col); tri(GL, c, b, a, col);
  }
}

/* --- arbres de Nadal: a les places, més sovint; als carrers, de tant en tant --- */
// Se'n posa un per cada quinze llocs on hi podria anar (com a mínim un), mai dos de tocar.
// Primer les places (les que es fan soles o les que toquen tres cases), després els carrers;
// i dins de cada grup, l'ordre el decideix el hash de la cel·la
let arbresNadal = new Set();
function triaArbresNadal(){
  arbresNadal = new Set();
  const llocs = [];
  for(let ci=0; ci<cells.length; ci++){
    if(!esCarrer[ci] || span[ci] || escalaE[ci] >= 0 || fars[ci] || moll[ci] || mercat[ci] || terrassaDe.has(ci) || esMunt(ci)) continue;
    const cases = cells[ci].nb.filter(b => b >= 0 && heights[b] > 0).length;
    const placa = !carrer[ci] || cases >= 3;
    llocs.push([ci, hash3(ci, 305, 1) - (placa ? 1 : 0)]);
  }
  llocs.sort((a, b) => a[1] - b[1]);
  const n = Math.max(1, Math.round(llocs.length / 15));
  for(const [ci] of llocs){
    if(arbresNadal.size >= n) break;
    if(cells[ci].nb.some(b => arbresNadal.has(b))) continue;
    arbresNadal.add(ci);
  }
}
const arbreNadalAqui = ci => arbresNadal.has(ci);
function arbreNadal(G, x, y, z, ci){
  const H = 1.05 + 0.25*hash3(ci, 306, 1), gir = hash3(ci, 306, 2)*6.283;
  con(G, x, z, 0.12, 0.11, y, y + 0.1, 8, TEST, true, gir);               // el test
  con(G, x, z, 0.03, 0.03, y + 0.1, y + 0.22, 5, ESCORCA, false);
  // tres pisos de branques
  const pisos = [[0.20, 0.42, 0.40], [0.42, 0.33, 0.36], [0.62, 0.23, 0.34]];
  for(const [h0, r, alt] of pisos){
    const ya = y + 0.1 + h0*H, yb = ya + alt*H;
    con(G, x, z, r*H, 0, ya, yb, 9, AVET, false, gir);
    for(let k=0;k<9;k++){                                                  // per sota, tapat
      const a0 = gir - k*6.283/9, a1 = gir - (k+1)*6.283/9;
      tri(G, [x, ya, z], [x + Math.cos(a1)*r*H, ya, z + Math.sin(a1)*r*H], [x + Math.cos(a0)*r*H, ya, z + Math.sin(a0)*r*H], fosc(AVET, 0.7));
    }
  }
  // boles i una espiral de llums
  const rnd = mulberry32((ci*2654435761) | 0);
  for(let k=0;k<9;k++){
    const t = 0.15 + 0.7*rnd(), a = rnd()*6.283;
    const yy = y + 0.1 + (0.2 + 0.78*t)*H, rr = (0.42 - 0.36*t)*H*0.95;
    bola(G, x + Math.cos(a)*rr, yy - 0.03, z + Math.sin(a)*rr, 0.032, 0.06, BOLES[k % BOLES.length], ci*31 + k, 5);
  }
  const cols = colorsDe(ci);
  for(let k=0;k<22;k++){
    const t = k/22, a = gir + t*6.283*3;
    const yy = y + 0.1 + (0.24 + 0.72*t)*H, rr = (0.40 - 0.35*t)*H;
    bombeta(x + Math.cos(a)*rr, yy, z + Math.sin(a)*rr, cols[k % cols.length], 0.024);
  }
  const yt = y + 0.1 + 0.98*H;                                             // l'estrella del capdamunt
  for(const [ux, uz] of [[1, 0], [0, 1]]) estrella(x, yt + 0.06, z, ux, uz, 0.085, OR);
  LLUMS.push(x, yt + 0.06, z);
}

/* ============================================================
   MERCAT DE NADAL
   ------------------------------------------------------------
   Amb els guarniments activats, el mode Mercat de Nadal posa
   una parada en un carrer o una plaça plans (a l'aigua, hi fa
   el terra i tot). Clicant les cel·les del costat el mercat
   creix: les parades veïnes s'enllacen amb tires de llums i es
   giren cap al passadís. Cada parada és una caseta de fusta amb
   teulada de ratlles, un taulell amb molsa, figures i tions, i
   de vegades avets per vendre. Les parades es desen a la
   partida, però només es veuen quan els guarniments hi són.
   ============================================================ */

const FUSTA_C   = C('#b48654');   // fusta de les casetes
const FUSTA_F   = C('#7c5634');
const RATLLA    = [C('#c0392b'), C('#f3eee4')];
const MOLSA     = C('#4f7a3a');
const BARRETINA = C('#c8322b');

// cel·la on hi pot anar una parada: carrer, plaça o aigua plans, sense volta, ni casa, ni roca, ni escala
const potMercat = ci => ci >= 0 && heights[ci] === 0 && !pont[ci] && !span[ci] && !forcat[ci] && !roca[ci]
                        && !escales[ci] && (!esCarrer[ci] || escalaE[ci] < 0);
// cel·la que es dibuixa com a parada
const esMercat = ci => ci >= 0 && nadal && mercat[ci] > 0 && esCarrer[ci] && escalaE[ci] < 0 && !span[ci] && !esMunt(ci);

// cap a on mira la parada: cap a una altra parada (el passadís), si no cap a un carrer, i si no a l'atzar
function frontMercat(ci){
  const nb = cells[ci].nb, h = Math.floor(hash3(ci, 310, 1)*4);
  for(const ok of [b => esMercat(b), b => b >= 0 && esCarrer[b] && !esMunt(b), b => b >= 0 && !(heff[b] > 0)])
    for(let k=0;k<4;k++){ const e = (h + k) % 4; if(ok(nb[e])) return e; }
  return h;
}

// el tió: un tronc ajagut amb barretina i dues potes, mirant cap a (ux, uz)
function tio(G, x, y, z, ux, uz, s){
  const vx = -uz, vz = ux, L = 0.11*s, r = 0.035*s, ty = y + r + 0.03*s;
  tronc(G, x - vx*L, ty, z - vz*L, x + vx*L, ty, z + vz*L, r, r*0.95, FUSTA, 6);
  for(const k of [-0.5, 0.5])                                          // potes
    tronc(G, x + vx*L*k, y, z + vz*L*k, x + vx*L*k, ty, z + vz*L*k, 0.01*s, 0.01*s, FUSTA_F, 4);
  const hx = x + vx*L*1.02, hz = z + vz*L*1.02;
  tronc(G, hx, ty, hz, hx + vx*0.002, ty + r*0.3, hz + vz*0.002, r*0.92, r*0.92, C('#e8d2a8'), 6);   // la cara, de fusta clara
  con(G, hx + vx*0.01, hz + vz*0.01, r*0.85, 0, ty + r*0.55, ty + r*2.4, 6, BARRETINA, false);       // barretina
}

function parada(G, cel, ci, y){
  const c = cel.c, f = frontMercat(ci);
  const mf = entre(cel.p[f], cel.p[(f+1)%4], 0.5);
  let ux = mf.x - c.x, uz = mf.z - c.z; const lu = Math.hypot(ux, uz) || 1; ux /= lu; uz /= lu;
  const vx = -uz, vz = ux;
  const D = 0.17, W = 0.27, H = 0.42, R = 0.6;      // mitja fondària, mitja amplada, ràfec i carener
  const cx = c.x - ux*0.1, cz = c.z - uz*0.1;      // la caseta, enrere: al davant hi queda el passadís
  const P = (a, b, yy) => [cx + ux*a + vx*b, yy, cz + uz*a + vz*b];

  // la caseta: tancada pels costats i pel darrere, i amb el davant obert sobre el taulell
  caixa(G, cx - ux*(D - 0.02), cz - uz*(D - 0.02), ux, uz, 0.02, W, y, y + H, FUSTA_C);         // darrere
  for(const s of [-1, 1])
    caixa(G, cx + vx*s*(W - 0.02), cz + vz*s*(W - 0.02), ux, uz, D, 0.02, y, y + H, FUSTA_C);    // costats
  caixa(G, cx + ux*(D - 0.04), cz + uz*(D - 0.04), ux, uz, 0.05, W - 0.02, y, y + 0.2, FUSTA_F); // taulell
  cara(G, P(-D + 0.04, -W + 0.04, y + 0.005), P(-D + 0.04, W - 0.04, y + 0.005), P(D - 0.09, W - 0.04, y + 0.005), P(D - 0.09, -W + 0.04, y + 0.005), fosc(FUSTA_F, 0.5), [0,1,0]);
  cara(G, P(-D + 0.045, -W + 0.04, y), P(-D + 0.045, W - 0.04, y), P(-D + 0.045, W - 0.04, y + H), P(-D + 0.045, -W + 0.04, y + H), fosc(FUSTA_F, 0.6), [ux, 0, uz]);  // l'interior, a l'ombra

  // teulada a dues aigües, de ratlles, amb el carener paral·lel al davant i un ràfec que fa de tendal
  const O = 0.09, N = 6;
  for(let k=0;k<N;k++){
    const b0 = -W - 0.03 + (2*W + 0.06)*k/N, b1 = -W - 0.03 + (2*W + 0.06)*(k+1)/N, col = RATLLA[k % 2];
    const dv = P(D + O, b0, y + H - 0.06), dw = P(D + O, b1, y + H - 0.06), cv = P(0, b0, y + R), cw = P(0, b1, y + R);
    const rv = P(-D - 0.05, b0, y + H - 0.03), rw = P(-D - 0.05, b1, y + H - 0.03);
    cara(G, dv, dw, cw, cv, col, [ux, 1, uz]);                    // davant
    cara(G, dv, dw, cw, cv, fosc(col, 0.55), [-ux, -1, -uz]);     // per sota del tendal
    cara(G, rv, rw, cw, cv, col, [-ux, 1, -uz]);                  // darrere
  }
  for(const s of [-1, 1]){                                     // els frontons, de fusta
    const b = s*W;
    tri(G, P(-D, b, y + H), P(D, b, y + H), P(0, b, y + R - 0.01), FUSTA_C);
    tri(G, P(D, b, y + H), P(-D, b, y + H), P(0, b, y + R - 0.01), FUSTA_C);
  }
  // llums sota el ràfec
  const A = P(D + O, -W - 0.03, y + H - 0.07), B = P(D + O, W + 0.03, y + H - 0.07);
  garlanda({x: A[0], y: A[1], z: A[2]}, {x: B[0], y: B[1], z: B[2]}, 0.04, colorsDe(ci), 0);

  // la mercaderia: molsa, figures i un tió sobre el taulell
  const tq = (a, b) => ({x: cx + ux*a + vx*b, z: cz + uz*a + vz*b});
  for(let k=0;k<3;k++){
    const p = tq(D - 0.04, -W*0.62 + k*W*0.62), t = hash3(ci, k, 311);
    if(t < 0.4) bola(G, p.x, y + 0.2, p.z, 0.05, 0.04, MOLSA, ci*7 + k, 6);
    else if(t < 0.75) for(let j=0;j<3;j++)
      bola(G, p.x + vx*(j-1)*0.03, y + 0.2, p.z + vz*(j-1)*0.03, 0.013, 0.05, BOLES[(k + j) % BOLES.length], ci*11 + j, 5);
    else tio(G, p.x, y + 0.2, p.z, ux, uz, 0.7);
  }
  // al davant, a terra: un tió gros o uns avets per vendre
  const t = hash3(ci, 312, 1);
  if(t < 0.4){
    const p = tq(D + 0.2, W*0.6);
    tio(G, p.x, y, p.z, ux, uz, 1.3);
  } else if(t < 0.75){
    for(let j=0;j<2;j++){
      const p = tq(D + 0.14, (j ? 1 : -1)*W*0.85), hh = 0.26 + 0.06*j;
      con(G, p.x, p.z, 0.02, 0.02, y, y + 0.05, 4, FUSTA_F, false);
      con(G, p.x, p.z, 0.075, 0, y + 0.04, y + hh, 7, AVET, false);
    }
  }
}

// tires de llums d'una parada a les del costat (cada parella, un sol cop), per sobre de les teulades
function llumsMercat(G, cel, ci, y){
  for(const b of cel.nb){
    if(b < ci || !esMercat(b)) continue;
    const yb = Math.max(...nvC[b])*ALT + CARRER_Y;
    const a = cel.c, c = cells[b].c;
    garlanda({x: a.x, y: y + 0.68, z: a.z}, {x: c.x, y: yb + 0.68, z: c.z}, 0.06, colorsDe(Math.min(ci, b)), b);
  }
}

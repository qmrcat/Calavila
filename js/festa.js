/* Cala · la Festa Major: damassos als balcons i banderetes als carrers; i els gegants a la plaça */

/* ============================================================
   FESTA MAJOR
   ------------------------------------------------------------
   S'activa a Configuració, i es recorda en aquest navegador (no
   a la partida), com Nadal i la Diada; totes tres poden anar
   alhora. Quan és activada:
   - un 30 % dels balcons, més o menys, tenen un damàs penjat de
     la barana. Si la Diada també hi és, aquell balcó no hi penja
     la bandera: la casa la posa en un altre lloc;
   - els carrers entre dues cases prou altes tenen dues tires de
     banderetes de colors d'una façana a l'altra. Van a banda i
     banda del mig del carrer, on Nadal hi penja els llums.
   Els gegants van a part, amb el seu botó (vegeu més avall).
   Tot surt d'un hash de la cel·la: sempre és igual.
   ============================================================ */

let festa = false;

const BANDERETES = ['#d9473b', '#f2c230', '#2f6f8f', '#3d9a5a', '#fbf8f1', '#e07a9a'].map(C);
const DAMASSOS = [                                // fons, dibuix i vora
  [C('#8c1d2c'), C('#d9b45a'), C('#e6c46a')],     // granat i or
  [C('#b3202a'), C('#f0d27a'), C('#f0d27a')],     // vermell i groc
  [C('#24396e'), C('#d9b45a'), C('#e6c46a')],     // blau i or
  [C('#efe4c8'), C('#b3202a'), C('#b3202a')],     // crema i vermell
];
const CORDILL = C('#5a5249');

/* --- damassos --- */
// cada balcó, pel seu compte: un 30 %, més o menys (vegeu parametres.js)
function damasAqui(ci, L, e){ return festa && hash3(ci*7 + e, L, 501) < PAR.damassos; }

// un damàs penjat d'una barana: A, el cantó de dalt d'un costat; U, al llarg de la paret; N, enfora.
// Fons llis, una vora, un rombe al mig amb un altre a dins i serrell a baix
function damas(G, A, U, N, w, hb, ci, L, e){
  const [fons, dib, vora] = DAMASSOS[Math.floor(hash3(ci*7 + e, L, 502)*DAMASSOS.length)];
  const Nv = [N.x, 0, N.z];
  const F = (u, v, o) => [A.x + U.x*u*w + N.x*o, A.y - v*hb, A.z + U.z*u*w + N.z*o];
  const rect = (u0, u1, v0, v1, o, col) => cara(G, F(u0,v0,o), F(u1,v0,o), F(u1,v1,o), F(u0,v1,o), col, Nv);
  rect(0, 1, 0, 0.9, 0, fons);
  // la vora, a tot el voltant
  const bu = 0.07, bv = 0.05;
  rect(0, 1, 0, bv, 0.002, vora); rect(0, 1, 0.9 - bv, 0.9, 0.002, vora);
  rect(0, bu, 0, 0.9, 0.002, vora); rect(1 - bu, 1, 0, 0.9, 0.002, vora);
  // el rombe del mig, i un de més petit a dins, del color del fons
  const romb = (r, o, col) => {
    const cu = 0.5, cv = 0.45, ru = r*0.5, rv = r*0.62;
    cara(G, F(cu, cv - rv, o), F(cu + ru, cv, o), F(cu, cv + rv, o), F(cu - ru, cv, o), col, Nv);
  };
  romb(0.62, 0.003, dib); romb(0.3, 0.004, fons);
  // el serrell, en dents
  const nd = 7;
  for(let k=0;k<nd;k++){
    const u0 = k/nd, u1 = (k+1)/nd;
    const a = F(u0, 0.9, 0.001), b = F(u1, 0.9, 0.001), c = F((u0+u1)/2, 1, 0.001);
    cara(G, a, b, c, c, vora, Nv);
  }
}

/* --- banderetes als carrers --- */
// l'eix (0 o 1) on hi ha cases enfrontades prou altes per penjar-hi les banderetes, o -1
function eixFesta(ci){
  if(!esCarrer[ci] || span[ci] || esMunt(ci) || hash3(ci, 503, 1) >= PAR.banderetes) return -1;
  const sota = Math.max(...nvC[ci])*ALT + CARRER_Y + 1.1;
  const alta = b => b >= 0 && heff[b] > 0 && !span[b] && heff[b]*ALT > sota + 0.3 && base[b]*ALT < sota - 0.3;
  const nb = cells[ci].nb, prim = hash3(ci, 503, 2) < 0.5 ? 0 : 1;
  for(const e of [prim, 1 - prim]) if(alta(nb[e]) && alta(nb[e+2])) return e;
  return -1;
}

// una tira de banderetes de A a B (x, y, z), que fa panxa
function tiraBanderetes(G, A, B, panxa, llavor){
  const P = t => ({x: A.x + (B.x-A.x)*t, y: A.y + (B.y-A.y)*t - panxa*4*t*(1-t), z: A.z + (B.z-A.z)*t});
  const M = 8;
  for(let k=0;k<M;k++){
    const a = P(k/M), b = P((k+1)/M);
    tronc(G, a.x, a.y, a.z, b.x, b.y, b.z, 0.004, 0.004, CORDILL, 3);
  }
  const l = Math.hypot(B.x-A.x, B.z-A.z), n = Math.max(3, Math.round(l/0.085));
  for(let k=0;k<n;k++){
    const t0 = (k + 0.12)/n, t1 = (k + 0.88)/n, a = P(t0), b = P(t1), m = P((t0+t1)/2);
    const c = [m.x, m.y - 0.085, m.z], col = BANDERETES[(k + llavor) % BANDERETES.length];
    tri(G, [a.x,a.y,a.z], [b.x,b.y,b.z], c, col);
    tri(G, [b.x,b.y,b.z], [a.x,a.y,a.z], c, col);
  }
}

// dues tires de façana a façana, a banda i banda del mig del carrer (al mig hi van els llums de Nadal)
function banderetesCarrer(G, cel, ci){
  const e = eixFesta(ci); if(e < 0) return;
  const p = cel.p, y0 = Math.max(...nvC[ci])*ALT + CARRER_Y + 1.25;
  [0.2, 0.8].forEach((t, i) => {
    const A = entre(p[e], p[(e+1)%4], t), B = entre(p[(e+3)%4], p[(e+2)%4], t);
    const y = y0 + hash3(ci, 504, i)*0.18;
    tiraBanderetes(G, {x: A.x, y, z: A.z}, {x: B.x, y, z: B.z}, 0.12, Math.floor(hash3(ci, 505, i)*6));
  });
}

/* --- gegants ---------------------------------------------
   Tenen el seu propi botó a Configuració (per defecte, apagat),
   i no depenen de la Festa Major. Tots van junts, com en una
   trobada: a la plaça amb més lloc al voltant i, si cal, a les
   cel·les planes del costat, dos a cada cel·la i com a molt
   MAX_GEGANTS. Miren tots cap al mig del grup.
   ------------------------------------------------------------ */
let ambGegants = false;
const MAX_GEGANTS = 8;
let llocsGegants = new Set(), centreGegants = null;

function triaGegants(){
  llocsGegants = new Set(); centreGegants = null;
  const pot = ci => ci >= 0 && esCarrer[ci] && !heights[ci] && !span[ci] && escalaE[ci] < 0 && !fars[ci] && !moll[ci]
                 && !mercat[ci] && !terrassaDe.has(ci) && !esMunt(ci) && !(nadal && arbreNadalAqui(ci));
  // quant carrer pla hi ha al voltant: els gegants necessiten lloc
  const obert = ci => cells[ci].nb.filter(pot).length;
  let millor = -1, mv = Infinity;
  for(let ci=0; ci<cells.length; ci++){
    if(!pot(ci)) continue;
    const v = hash3(ci, 506, 1) - obert(ci);
    if(v < mv){ mv = v; millor = ci; }
  }
  if(millor < 0) return;
  llocsGegants.add(millor);
  const veins = cells[millor].nb.filter(pot).sort((a, b) => (obert(b) - obert(a)) || (hash3(a, 506, 2) - hash3(b, 506, 2)));
  for(const b of veins){ if(llocsGegants.size*2 >= MAX_GEGANTS) break; llocsGegants.add(b); }
  // el punt cap on miren: el mig del grup
  let x = 0, z = 0;
  for(const c of llocsGegants){ x += cells[c].c.x; z += cells[c].c.z; }
  centreGegants = {x: x/llocsGegants.size, z: z/llocsGegants.size};
}
const gegantsAqui = ci => ambGegants && llocsGegants.has(ci);

const PELL = C('#e9c3a0'), CABELL = [C('#3a2a20'), C('#6b4a2e'), C('#2a2522')];
const VESTITS = [[C('#8c1d2c'), C('#d9b45a')], [C('#24396e'), C('#e6c46a')], [C('#3d6a4a'), C('#efe4c8')], [C('#6b3f7a'), C('#e6c46a')]];

// un gegant (rei) o una geganta (reina), dret a (x, y, z), mirant cap a (dx, dz)
function gegant(G, x, y, z, dx, dz, reina, ci, k){
  const [vest, galo] = VESTITS[Math.floor(hash3(ci, 507, k)*VESTITS.length)];
  const cab = CABELL[Math.floor(hash3(ci, 508, k)*CABELL.length)];
  const s = 1;   // escala
  // la faldilla llarga, que arriba a terra (el gegant té el cos buit: per sota hi va el geganter)
  con(G, x, z, 0.19*s, 0.11*s, y, y + 0.72*s, 10, vest, false);
  con(G, x, z, 0.195*s, 0.19*s, y, y + 0.06*s, 10, galo, false);               // el galó de baix
  con(G, x, z, 0.12*s, 0.105*s, y + 0.70*s, y + 0.74*s, 10, galo, false);       // la cintura
  // el tors i les espatlles
  con(G, x, z, 0.105*s, 0.12*s, y + 0.74*s, y + 0.98*s, 8, reina ? vest : galo, false);
  con(G, x, z, 0.12*s, 0.05*s, y + 0.98*s, y + 1.03*s, 8, reina ? vest : galo, true);
  // els braços, que pengen una mica separats del cos
  const sx = -dz, sz = dx;                                                      // de costat
  for(const c of [1, -1]){
    const ax = x + sx*0.13*c, az = z + sz*0.13*c;
    tronc(G, ax, y + 0.97*s, az, ax + sx*0.05*c + dx*0.05, y + 0.66*s, az + sz*0.05*c + dz*0.05, 0.035, 0.03, reina ? vest : galo, 5);
    bola(G, ax + sx*0.05*c + dx*0.05, y + 0.63*s, az + sz*0.05*c + dz*0.05, 0.03, 0.035, PELL, ci + k, 5);
  }
  // el coll i el cap, grossos com cal als gegants
  con(G, x, z, 0.035, 0.035, y + 1.02*s, y + 1.07*s, 6, PELL, false);
  bola(G, x, y + 1.15*s, z, 0.085, 0.1, PELL, ci + k, 7);
  bola(G, x - dx*0.015, y + 1.19*s, z - dz*0.015, 0.09, 0.075, cab, ci + k + 3, 7);   // els cabells
  if(reina) bola(G, x - dx*0.05, y + 1.08*s, z - dz*0.05, 0.07, 0.09, cab, ci + k + 5, 6);   // la cabellera
  else bola(G, x + dx*0.06, y + 1.07*s, z + dz*0.06, 0.06, 0.05, cab, ci + k + 7, 6);        // la barba
  // la corona d'or
  con(G, x, z, 0.075, 0.08, y + 1.22*s, y + 1.29*s, 8, C('#e0b84a'), false);
  for(let i=0;i<5;i++){
    const a = i*6.283/5, px = x + Math.cos(a)*0.075, pz = z + Math.sin(a)*0.075;
    con(G, px, pz, 0.018, 0, y + 1.29*s, y + 1.33*s, 4, C('#e0b84a'), false);
  }
}

// la parella de gegants d'una cel·la, l'un al costat de l'altre, mirant cap al mig del grup
function gegants(G, cel, ci, y){
  let dx = centreGegants ? centreGegants.x - cel.c.x : 0, dz = centreGegants ? centreGegants.z - cel.c.z : 0;
  let dl = Math.hypot(dx, dz);
  if(dl < 0.05){                                  // sols, o al mig: miren cap a una aresta qualsevol
    const e = Math.floor(hash3(ci, 509, 1)*4), m = entre(cel.p[e], cel.p[(e+1)%4], 0.5);
    dx = m.x - cel.c.x; dz = m.z - cel.c.z; dl = Math.hypot(dx, dz) || 1;
  }
  dx /= dl; dz /= dl;
  const sx = -dz, sz = dx, r = 0.2;               // de costat
  gegant(G, cel.c.x + sx*r, y, cel.c.z + sz*r, dx, dz, false, ci, 0);
  gegant(G, cel.c.x - sx*r, y, cel.c.z - sz*r, dx, dz, true, ci, 1);
}

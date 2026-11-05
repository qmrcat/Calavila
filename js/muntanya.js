/* Cala · muntanya: terreny de roca amb pendents, mates, pins i roques soltes */

/* ============================================================
   MUNTANYA
   ------------------------------------------------------------
   Una cel·la de roca és terreny, com un carrer (carrer[ci] i
   un nivell), però en lloc de llambordes té un relleu de roca.
   Cada cantó fa la mitjana de l'alçada de les cel·les que s'hi
   troben: les roques veïnes fan pendents seguits, i unes
   quantes, amb nivells diferents, fan una muntanya sencera i
   no pas esglaons. Cap a l'aigua, la roca s'hi enfonsa.

   A sobre s'hi pot construir: les cases s'aixequen planes al
   nivell de la roca, i també hi van escales (tallades a la
   roca) i fars. En mode Carrers, una roca es torna un carrer
   al mateix nivell: així s'obren camins a la muntanya.
   ============================================================ */

const MUNT_R = 0.2;            // el bony que fa la roca per sobre del seu nivell
const MAR_V  = -0.3;           // l'aigua estira els cantons cap avall
const ROCA_C = C('#9a8263');   // roca rovellada, com la del cap de Creus
const ROCA_D = C('#a99d88');   // granit clar
const MATOLL = ['#5d6b43', '#6c744a', '#4e5e3c', '#7a7d52'].map(C);   // brolla i garric
const ROQUES = [ROCA_A, ROCA_A, ROCA_C, ROCA_C, ROCA_D, ROCA_B];

let muntV = new Map();   // alçada de cada vèrtex de roca
let muntSup = [];        // relleu de cada cel·la de roca: {out, ins, c}

// cel·la que es dibuixa com a roca: sense casa, ni escala, ni volta (aquestes la tapen)
const esMunt = ci => ci >= 0 && roca[ci] > 0 && esCarrer[ci] && heights[ci] === 0 && !span[ci] && escalaE[ci] < 0;

// on toca el terra cada cel·la, al vèrtex v
function valorCel(c, v){
  if(esMunt(c)) return nivEf[c]*ALT + MUNT_R;
  if(span[c]) return CARRER_Y;
  if(heights[c] > 0) return base[c]*ALT + CARRER_Y;
  if(esCarrer[c] && nvC[c]) return nvC[c][cells[c].vi.indexOf(v)]*ALT + CARRER_Y;
  if(pont[c]) return CARRER_Y;
  if(esIllot(c)) return ILLOT_Y;
  if(esSorra[c]) return 0.03;
  return MAR_V;
}
function alcadaVertex(v){
  let y = muntV.get(v);
  if(y !== undefined) return y;
  let s = 0, n = 0;
  for(const c of fans.get(v) || []){ s += valorCel(c, v); n++; }
  if(vora.has(v)){ s += 2*MAR_V; n += 2; }   // a la vora de la quadrícula, a fora hi ha mar
  y = n ? s/n : MAR_V;
  muntV.set(v, y);
  return y;
}

// el relleu: un anell de fora (cantons i punts mitjans de les arestes), un de dins i el cim.
// Els punts de les arestes depenen només dels vèrtexs: dues roques veïnes encaixen sense escletxes
function calculaMuntanya(){
  muntV = new Map();
  muntSup = new Array(cells.length).fill(null);
  for(let ci=0; ci<cells.length; ci++){
    if(!esMunt(ci)) continue;
    const cel = cells[ci], c = cel.c, out = [];
    for(let k=0;k<4;k++){
      const a = cel.vi[k], b = cel.vi[(k+1)%4], ya = alcadaVertex(a), yb = alcadaVertex(b);
      const m = entre(cel.p[k], cel.p[(k+1)%4], 0.5);
      // entre dues roques, el punt mitjà es mou una mica; si no, segueix la paret recta
      const sac = esMunt(cel.nb[k]) ? (hash3(Math.min(a,b), Math.max(a,b), 211) - 0.5)*0.16 : 0;
      out.push({x: cel.p[k].x, y: ya, z: cel.p[k].z}, {x: m.x, y: (ya+yb)/2 + sac, z: m.z});
    }
    const mitja = out.reduce((s, p) => s + p.y, 0) / 8;
    // el cim: al nivell de la roca, o més amunt si les veïnes són més altes (així no fa clot)
    const yc = Math.max(nivEf[ci]*ALT + MUNT_R, mitja) + 0.04 + hash3(ci, 212, 1)*0.12;
    const ins = out.map((p, i) => {
      const f = 0.5 + (hash3(ci, i, 213) - 0.5)*0.14;
      return {x: c.x + (p.x-c.x)*f, z: c.z + (p.z-c.z)*f,
              y: yc + (p.y-yc)*f + (hash3(ci, i, 214) - 0.4)*0.16};
    });
    muntSup[ci] = {out, ins, c: {x: c.x, y: yc, z: c.z}};
  }
}

const cimMunt  = ci => muntSup[ci].c.y;
const baixMunt = ci => Math.min(...muntSup[ci].out.map(p => p.y));
const altMunt  = ci => Math.max(cimMunt(ci), ...muntSup[ci].out.map(p => p.y), ...muntSup[ci].ins.map(p => p.y));
// l'alçada del cantó k (0-3) de la roca
const cantoMunt = (ci, k) => muntSup[ci].out[2*k].y;

// les cares planeres fan mata; les dretes, roca
function colorRoca(a, b, c, ci, j, verd){
  const ux=b.x-a.x, uy=b.y-a.y, uz=b.z-a.z, vx=c.x-a.x, vy=c.y-a.y, vz=c.z-a.z;
  const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx;
  const pla = Math.abs(ny) / (Math.hypot(nx, ny, nz) || 1);
  const t = Math.max(0, Math.min(1, (pla - 0.7)/0.22)) * verd;
  const h = hash3(ci, j, 215), llum = 0.93 + 0.1*hash3(ci, j, 217);
  if(hash3(ci, j, 216) < t) return clar(MATOLL[Math.floor(h*MATOLL.length)], llum);
  // la roca, rovellada a baix i grisa de granit a dalt, amb alguna llosa més fosca
  if(h < 0.1) return clar(ROCA_B, llum);
  const alt = Math.max(0, Math.min(1, ((a.y + b.y + c.y)/3 + 0.2) / 2.8));
  return clar(barreja(ROCA_C, ROCA_D, alt), llum);
}

function muntanya(G, cel, ci){
  const {out: O, ins: I, c: Cc} = muntSup[ci];
  const P = p => [p.x, p.y, p.z];
  const verd = 0.35 + 0.65*hash3(ci, 218, 1);   // n'hi ha de més pelades i de més verdes
  for(let i=0;i<8;i++){
    const i2 = (i+1)%8;
    tri(G, P(Cc), P(I[i]), P(I[i2]), colorRoca(Cc, I[i], I[i2], ci, i, verd));
    tri(G, P(I[i]), P(O[i]), P(O[i2]), colorRoca(I[i], O[i], O[i2], ci, 8+i, verd));
    tri(G, P(I[i]), P(O[i2]), P(I[i2]), colorRoca(I[i], O[i2], I[i2], ci, 16+i, verd));
  }

  // un punt de la superfície entre l'anell de dins (f = 0) i el de fora (f = 1)
  const lloc = (i, f) => ({x: I[i].x + (O[i].x-I[i].x)*f, y: I[i].y + (O[i].y-I[i].y)*f, z: I[i].z + (O[i].z-I[i].z)*f});

  if(fars[ci]){                                   // el far, al cim, sobre un sòcol de pedra
    con(G, Cc.x, Cc.z, 0.31, 0.28, Cc.y - 0.35, Cc.y, 8, CARREU, true);
    far(G, Cc.x, Cc.y, Cc.z, ci);
  } else if(molins[ci]){                          // un aerogenerador, al cim, sobre una base de formigó
    con(G, Cc.x, Cc.z, 0.16, 0.15, Cc.y - 0.3, Cc.y + 0.03, 8, GRIS_MOLI, true);
    aerogenerador(G, Cc.x, Cc.y + 0.03, Cc.z, ci);
  } else {
    const t = hash3(ci, 219, 1);
    if(t < 0.42){                                 // un pi o, més avall, una olivera
      const tipus = hash3(ci, 219, 2) < 0.75 || nivEf[ci] > 1 ? 0.5 : 0.8;
      arbre(G, Cc.x, Cc.y - 0.03, Cc.z, 0.7 + 0.4*hash3(ci, 219, 3), ci*3 + 1, tipus);
    }
  }
  // mates arran de terra i roques soltes
  for(let j=0;j<3;j++){
    const i = Math.floor(hash3(ci, j, 220)*8), p = lloc(i, 0.15 + 0.5*hash3(ci, j, 221));
    if(hash3(ci, j, 222) < 0.55*verd + 0.15)
      bola(G, p.x, p.y - 0.03, p.z, 0.07 + 0.06*hash3(ci, j, 223), 0.09 + 0.06*hash3(ci, j, 224),
           MATOLL[Math.floor(hash3(ci, j, 225)*MATOLL.length)], ci*17 + j, 6);
  }
  for(let j=0;j<2;j++){
    if(hash3(ci, j, 226) > 0.5) continue;
    const i = Math.floor(hash3(ci, j, 227)*8), p = lloc(i, 0.3 + 0.5*hash3(ci, j, 228));
    bola(G, p.x, p.y - 0.06, p.z, 0.08 + 0.08*hash3(ci, j, 229), 0.12 + 0.08*hash3(ci, j, 230),
         ROQUES[Math.floor(hash3(ci, j, 231)*ROQUES.length)], ci*29 + j, 5);
  }
}

// paret de roca a franges, d'unes mitja alçada de bloc, de tons diferents: el cingle.
// a, b: on arrenca (a l'altura sota); A, B: on acaba (a tA i tB)
function cingle(G, a, b, A, B, sota, tA, tB, ci, e){
  const yA = Math.min(sota, tA), yB = Math.min(sota, tB);
  const n = Math.max(1, Math.round((Math.max(tA, tB) - Math.min(yA, yB)) / (ALT*0.45)));
  const pt = (p, q, y0, y1, f) => [p.x + (q.x-p.x)*f, y0 + (y1-y0)*f, p.z + (q.z-p.z)*f];
  for(let j=0;j<n;j++){
    const f0 = j/n, f1 = (j+1)/n, h = hash3(ci, e*8 + j, 232);
    const col = clar(h < 0.3 ? ROCA_B : h < 0.65 ? ROCA_C : ROCA_A, 0.84 + 0.14*f1);
    quad(G, pt(a, A, yA, tA, f0), pt(b, B, yB, tB, f0), pt(b, B, yB, tB, f1), pt(a, A, yA, tA, f1), col);
  }
}

/* Cala · energia: aerogeneradors i plaques solars */

/* ============================================================
   ENERGIA
   ------------------------------------------------------------
   En mode Energia:
   - clicant una casa, s'hi posen (o se'n treuen) plaques
     solars. A les teulades, van planes sobre l'aiguavés que
     mira més cap al sol; als terrats, en dues fileres
     inclinades sobre uns peus. Si el terrat té golfes, van a
     la teulada de les golfes;
   - clicant la mar o una muntanya de roca, s'hi alça un
     aerogenerador: una torre blanca amb tres pales que giren
     de cara al vent. A la mar, s'aguanta sobre un pilot amb
     una plataforma groga; a la muntanya, al cim. Entre dos
     aerogeneradors hi ha d'haver prou lloc perquè les pales
     no es toquin.
   Les pales són una malla a part, perquè puguin girar sense
   refer el poble: es reaprofiten mentre l'aerogenerador no es
   mou de lloc.
   ============================================================ */

let molins = [];   // 1 = un aerogenerador posat a mà (a la mar o al cim d'una muntanya)
let solar = [];    // 1 = la casa té plaques solars a la teulada o al terrat

const BLANC_MOLI = C('#eef0ec'), GRIS_MOLI = C('#c3c8ca'), GROC_MOLI = C('#e6bd35');
const PILOT = C('#4e5457'), VERM_MOLI = C('#d23a30');
const PLACA = C('#1f3656'), PLACA_B = C('#2c4a72'), MARC_PLACA = C('#c9cdd1');

// el vent és el mateix que fa onejar les banderes de la Diada (VENT, cap on bufa): els rotors
// miren d'on ve, tots més o menys igual
const CARA_VENT = {x: -VENT.x, z: -VENT.z};
// d'on ve el sol (el de la llum de l'escena): les plaques s'hi encaren
const SOL_DIR = (() => { const l = Math.hypot(14, 20, 9); return [14/l, 20/l, 9/l]; })();
const SOL_H = (() => { const l = Math.hypot(14, 9); return {x: 14/l, z: 9/l}; })();

const MOLI_H = 3.0, MOLI_R = 1.05;   // alçada de la torre i radi de les pales (a escala 1)
const MOLI_SEP = 2.6;                // distància mínima entre dos aerogeneradors

/* --- on es poden posar --- */
// a la mar: aigua sense res (ni platja, ni pont, ni far, ni carrer)
const esMoliMar = ci => molins[ci] > 0 && heff[ci] <= 0 && !esCarrer[ci] && !pont[ci] && !fars[ci] && !esSorra[ci] && !span[ci];
// a la muntanya: al cim d'una roca, si no hi ha un far
const esMoliMunt = ci => molins[ci] > 0 && esMunt(ci) && !fars[ci];

function potMoli(ci){
  if(ci < 0 || heights[ci] > 0 || pont[ci] || fars[ci] || span[ci] || forcat[ci] || esSorra[ci]) return false;
  if(!esMunt(ci) && esCarrer[ci]) return false;          // ni als carrers ni a les places
  const c = cells[ci].c;
  return !cells.some((d, k) => k !== ci && molins[k] && Math.hypot(d.c.x - c.x, d.c.z - c.z) < MOLI_SEP);
}
// plaques solars: a qualsevol casa amb teulada o terrat (les torres i les que tenen una escala a sobre, no)
const potSolar = ci => ci >= 0 && heights[ci] > 0 && escalaE[ci] < 0 && !tipusTorre[ci];

/* --- aerogenerador --- */
let ROTORS = [];   // els rotors del poble que es construeix ara: es posen a l'escena a posaRotors()
let LLUMS_MOLI = [];   // on són els llums vermells de dalt de les gòndoles, per a l'halo de nit
let haloMoli = null, matHaloMoli = null, encesaMoli = 0;

// la torre, la gòndola i el llum de dalt; el rotor, a part. (x, y, z): on arrenca la torre
function aerogenerador(G, x, y, z, ci, s = 1){
  const gir = (hash3(ci, 440, 1) - 0.5)*0.3, cg = Math.cos(gir), sg = Math.sin(gir);
  const fx = CARA_VENT.x*cg - CARA_VENT.z*sg, fz = CARA_VENT.x*sg + CARA_VENT.z*cg;
  const top = y + MOLI_H*s;
  con(G, x, z, 0.08*s, 0.045*s, y, top, 10, BLANC_MOLI, false);                     // la torre, que s'aprima
  con(G, x, z, 0.082*s, 0.082*s, y, y + 0.05*s, 10, GRIS_MOLI, false);              // la base
  caixa(G, x + fx*0.02*s, z + fz*0.02*s, fx, fz, 0.17*s, 0.058*s, top - 0.05*s, top + 0.075*s, BLANC_MOLI);   // la gòndola
  caixa(GL, x - fx*0.11*s, z - fz*0.11*s, fx, fz, 0.016*s, 0.016*s, top + 0.075*s, top + 0.1*s, VERM_MOLI);   // el llum dels avions
  LLUMS_MOLI.push(x - fx*0.11*s, top + 0.09*s, z - fz*0.11*s);
  const hx = x + fx*0.2*s, hz = z + fz*0.2*s, hy = top + 0.012*s;
  ROTORS.push({clau: ci + '_' + hx.toFixed(3) + '_' + hy.toFixed(3) + '_' + hz.toFixed(3) + '_' + s,
               x: hx, y: hy, z: hz, rot: Math.atan2(fx, fz), s,
               fase: hash3(ci, 441, 1)*6.283, vel: 0.75 + 0.35*hash3(ci, 442, 1)});
}

// a la mar: pilot fosc clavat a l'aigua, peça de transició groga i plataforma amb barana
function moliMar(G, cel, ci){
  const {x, z} = cel.c, s = 1.12;
  con(G, x, z, 0.13, 0.13, -0.7, 0.06, 10, PILOT, false);
  con(G, x, z, 0.11, 0.11, 0.06, 0.3, 10, GROC_MOLI, false);
  con(G, x, z, 0.22, 0.22, 0.3, 0.34, 10, GRIS_MOLI, true);                          // la plataforma
  for(let i=0;i<10;i++){                                                            // la barana
    const a = i*6.283/10;
    con(G, x + Math.cos(a)*0.205, z + Math.sin(a)*0.205, 0.006, 0.006, 0.34, 0.45, 3, GROC_MOLI, false);
  }
  for(let i=0;i<10;i++){
    const a0 = i*6.283/10, a1 = (i+1)*6.283/10;
    tronc(G, x + Math.cos(a0)*0.205, 0.45, z + Math.sin(a0)*0.205, x + Math.cos(a1)*0.205, 0.45, z + Math.sin(a1)*0.205, 0.006, 0.006, GROC_MOLI, 3);
  }
  aerogenerador(G, x, 0.34, z, ci, s);
}

// el rotor: el botó del mig i tres pales, en el pla XY i mirant cap a +z. Gira al voltant de z
const geomsRotor = new Map();
function geomRotor(s){
  if(geomsRotor.has(s)) return geomsRotor.get(s);
  const G = newG(), R = MOLI_R*s;
  // el botó: un con de vuit costats al llarg de z
  const n = 8, rb = 0.055*s, z0 = -0.03*s, z1 = 0.13*s;
  for(let k=0;k<n;k++){
    const a0 = k*6.283/n, a1 = (k+1)*6.283/n;
    const A = [Math.cos(a0)*rb, Math.sin(a0)*rb, z0], B = [Math.cos(a1)*rb, Math.sin(a1)*rb, z0];
    quad(G, [A[0], A[1], 0.02*s], [B[0], B[1], 0.02*s], B, A, BLANC_MOLI);
    tri(G, [B[0], B[1], 0.02*s], [A[0], A[1], 0.02*s], [0, 0, z1], clar(BLANC_MOLI, 1.02));
  }
  // les pales: més amples a prop del botó, amb una mica de pas (la vora d'atac endavant) i la punta vermella
  const est = [[0.04, 0.05, 0.018], [0.3, 0.085, 0.014], [0.86, 0.035, 0.004], [1, 0.016, 0]];
  for(let p=0;p<3;p++){
    const a = p*6.283/3 + 0.3, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
    const punt = (r, w, pas, f) => [dx*r*R + px*w*s*f, dy*r*R + py*w*s*f, pas*s*f + 0.01*s];
    for(let i=0;i<est.length-1;i++){
      const [r0, w0, p0] = est[i], [r1, w1, p1] = est[i+1];
      const col = i === est.length - 2 ? VERM_MOLI : BLANC_MOLI;
      quad2(G, punt(r0, w0, p0, 0.4), punt(r1, w1, p1, 0.4), punt(r1, w1, p1, -0.6), punt(r0, w0, p0, -0.6), col);
    }
  }
  const g = toGeom(G);
  geomsRotor.set(s, g);
  return g;
}

// posa a l'escena els rotors d'ara; els que ja hi eren al mateix lloc es queden (i no perden el gir)
let rotors = new Map();
function posaRotors(){
  const ara = new Set(ROTORS.map(r => r.clau));
  for(const [k, r] of rotors) if(!ara.has(k)){ scene.remove(r.mesh); rotors.delete(k); }
  for(const r of ROTORS){
    if(rotors.has(r.clau)) continue;
    const mesh = new THREE.Mesh(geomRotor(r.s), matPoble);
    mesh.castShadow = true;
    mesh.rotation.order = 'YXZ';
    mesh.position.set(r.x, r.y, r.z);
    mesh.rotation.y = r.rot;
    mesh.rotation.z = r.fase;
    scene.add(mesh);
    rotors.set(r.clau, {mesh, fase: r.fase, vel: r.vel});
  }
  // de nit, el llum vermell de dalt fa halo, com els fanals (el material es fa el primer cop)
  if(!matHaloMoli) matHaloMoli = new THREE.PointsMaterial({
    map: texturaRadial([[0,'rgba(255,70,50,1)'],[0.25,'rgba(240,40,30,0.55)'],[1,'rgba(255,40,30,0)']]),
    size: 1.1, transparent: true, opacity: encesaMoli, depthWrite: false, blending: THREE.AdditiveBlending
  });
  if(haloMoli){ haloMoli.geometry.dispose(); scene.remove(haloMoli); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(LLUMS_MOLI, 3));
  haloMoli = new THREE.Points(g, matHaloMoli);
  haloMoli.visible = encesaMoli > 0.01;
  scene.add(haloMoli);
}
// com s'encenen de nit (0-1): ho diu el cicle de dia i nit
function posaLlumsMoli(encesa){
  encesaMoli = encesa;
  if(matHaloMoli) matHaloMoli.opacity = encesa;
  if(haloMoli) haloMoli.visible = encesa > 0.01;
}
// s: temps en segons. Les pales giren i, de nit, el llum fa pampallugues
function giraRotors(s){
  for(const r of rotors.values()) r.mesh.rotation.z = r.fase - s*r.vel;
  if(matHaloMoli && encesaMoli > 0.01) matHaloMoli.opacity = encesaMoli*(Math.sin(s*2.4) > -0.3 ? 1 : 0.12);
}

/* --- plaques solars --- */
// cada coberta apunta els aiguavessos de les cases amb plaques; quan totes són fetes, a cada
// casa se li posen sobre el que mira més cap al sol. Una faceta són quatre punts [x,y,z]:
// els dos de baix (p0, p1) i els de dalt (p2 sobre p1, p3 sobre p0). Un triangle repeteix el cim
let FACETES = new Map();
let AMB_PLAQUES = new Set();   // les cases on s'han pogut posar, per a la fitxa de consulta
function facetaSolar(ci, p0, p1, p2, p3){
  if(!solar[ci]) return;
  if(!FACETES.has(ci)) FACETES.set(ci, []);
  FACETES.get(ci).push([p0, p1, p2, p3]);
}

// la normal cap amunt d'una faceta
function normalFaceta([a, b, c, d]){
  const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2];
  const top = [(c[0]+d[0])/2 - (a[0]+b[0])/2, (c[1]+d[1])/2 - (a[1]+b[1])/2, (c[2]+d[2])/2 - (a[2]+b[2])/2];
  let nx = uy*top[2] - uz*top[1], ny = uz*top[0] - ux*top[2], nz = ux*top[1] - uy*top[0];
  const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  return ny < 0 ? [-nx, -ny, -nz] : [nx, ny, nz];
}

function plaquesSolars(G){
  for(const [ci, fs] of FACETES){
    let millor = null, nota = -Infinity;
    for(const f of fs){
      const n = normalFaceta(f), v = n[0]*SOL_DIR[0] + n[1]*SOL_DIR[1] + n[2]*SOL_DIR[2];
      if(v > nota){ nota = v; millor = f; }
    }
    placaSobre(G, ci, millor, millor[2] === millor[3] ? [0.24, 0.76, 0.1, 0.5] : [0.16, 0.84, 0.12, 0.8]);
    AMB_PLAQUES.add(ci);
  }
}

// un camp de plaques sobre la faceta f, dins del tros [u0, u1] × [v0, v1]: el marc d'alumini i 3×2 cel·les blau fosc
function placaSobre(G, ci, f, [u0, u1, v0, v1]){
  const [a, b, c, d] = f, n = normalFaceta(f);
  const pt = (u, v, o) => {
    const e = [a[0] + (b[0]-a[0])*u, a[1] + (b[1]-a[1])*u, a[2] + (b[2]-a[2])*u];
    const t = [d[0] + (c[0]-d[0])*u, d[1] + (c[1]-d[1])*u, d[2] + (c[2]-d[2])*u];
    return [e[0] + (t[0]-e[0])*v + n[0]*o, e[1] + (t[1]-e[1])*v + n[1]*o, e[2] + (t[2]-e[2])*v + n[2]*o];
  };
  cara(G, pt(u0, v0, 0.012), pt(u1, v0, 0.012), pt(u1, v1, 0.012), pt(u0, v1, 0.012), MARC_PLACA, n);
  const NU = 3, NV = 2, g = 0.012;
  for(let i=0;i<NU;i++) for(let j=0;j<NV;j++){
    const ua = u0 + (u1-u0)*i/NU + g, ub = u0 + (u1-u0)*(i+1)/NU - g;
    const va = v0 + (v1-v0)*j/NV + g*1.4, vb = v0 + (v1-v0)*(j+1)/NV - g*1.4;
    const col = hash3(ci, i*NV + j, 450) < 0.5 ? PLACA : PLACA_B;
    cara(G, pt(ua, va, 0.028), pt(ub, va, 0.028), pt(ub, vb, 0.028), pt(ua, vb, 0.028), col, n);
  }
}

// en un terrat: dues fileres de plaques inclinades cap al sol, sobre uns peus
function plaquesTerrat(G, ci, y){
  const cel = cells[ci], c = cel.c;
  // fins on es pot arribar sense tocar l'ampit
  let r = Infinity;
  for(let e=0;e<4;e++){ const m = entre(cel.p[e], cel.p[(e+1)%4], 0.5); r = Math.min(r, Math.hypot(m.x - c.x, m.z - c.z)); }
  const mig = Math.max(0.08, r - 0.1);
  const sx = SOL_H.x, sz = SOL_H.z, tx = -sz, tz = sx;               // cap al sol, i de través
  const w = mig*0.95, fons = mig*0.36, alt = fons*0.75;
  for(const k of [-1, 1]){
    const o = k*mig*0.5;                                              // on és la filera, cap al sol o a l'inrevés
    const cx = c.x + sx*o, cz = c.z + sz*o;
    const baix = {x: cx + sx*fons/2, z: cz + sz*fons/2}, dalt = {x: cx - sx*fons/2, z: cz - sz*fons/2};
    const yb = y + 0.04, yd = yb + alt;
    const P = (q, t, yy) => [q.x + tx*w*t, yy, q.z + tz*w*t];
    const f = [P(baix, -1, yb), P(baix, 1, yb), P(dalt, 1, yd), P(dalt, -1, yd)];
    placaSobre(G, ci*7 + k, f, [0, 1, 0, 1]);
    // els peus: dos de curts al davant i dos de llargs al darrere
    for(const t of [-0.8, 0.8]){
      const a = P(baix, t, 0), b = P(dalt, t, 0);
      con(G, a[0], a[2], 0.008, 0.008, y, yb + 0.01, 4, MARC_PLACA, false);
      con(G, b[0], b[2], 0.008, 0.008, y, yd + 0.01, 4, MARC_PLACA, false);
    }
  }
  AMB_PLAQUES.add(ci);
}

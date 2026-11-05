/* Cala · platja i ponts */

/* ============================================================
   PLATJA
   ------------------------------------------------------------
   La platja és un terreny que es fa a mà, en mode Platja, sobre
   l'aigua arran de costa: platja[ci] és 0 si no n'hi ha, i si
   n'hi ha, què hi ha a sobre (vegeu ELEMENTS_PLATJA). Cada clic
   a la mateixa cel·la canvia l'element.
   L'alçada de cada vèrtex diu on és: tocant a terra, a ran;
   entre arena, una mica més avall; tocant al mar, sota l'aigua.
   Així la platja fa pendent sola cap a l'aigua.
   Abans la platja sortia sola en un tram de costa; ara aquesta
   regla (platjaAuto) només serveix per fer la del poble nou i
   per obrir les partides antigues, que no la tenien desada.
   ============================================================ */

// què hi pot haver a la platja, en l'ordre en què van sortint en clicar
const ELEMENTS_PLATJA = ['', 'arena', 'un para-sol', 'unes gandules', 'un llaüt varat', 'un patí de vela',
                         'la cadira del socorrista', 'un castell de sorra'];
const PLATJA_MAX = ELEMENTS_PLATJA.length - 1;

// es pot fer platja aquí? a l'aigua, tocant terra o una altra platja
function potPlatja(ci){
  if(ci < 0 || heights[ci] > 0 || carrer[ci] || esCarrer[ci] || pont[ci] || fars[ci] || moll[ci] || molins[ci]) return false;
  return cells[ci].nb.some(b => b >= 0 && (heff[b] > 0 || esCarrer[b] || pont[b] > 0 || platja[b] > 0));
}

// la platja de sempre, en un tram de costa que depèn de la cala: els buits a una o dues cel·les
// del que hi ha construït. A la primera fila, de vegades, un para-sol, unes gandules o una barca
function platjaAuto(){
  analitzar();
  const n = cells.length, dist = new Array(n).fill(-1), cua = [];
  for(let ci=0; ci<n; ci++) if(heff[ci] > 0 || esCarrer[ci]){ dist[ci] = 0; cua.push(ci); }
  for(let i=0; i<cua.length; i++){
    const a = cua[i];
    if(dist[a] >= 2) continue;
    for(const b of cells[a].nb) if(b >= 0 && dist[b] < 0){ dist[b] = dist[a] + 1; cua.push(b); }
  }
  for(let ci=0; ci<n; ci++){
    if(dist[ci] < 1 || pont[ci] || fars[ci] || moll[ci] || esCanal(ci)) continue;   // ni els canals ni els illots
    const c = cells[ci].c;
    const da = Math.abs((((Math.atan2(c.z, c.x) - platjaA) % 6.283) + 9.425) % 6.283 - 3.1416);
    if(da >= PLATJA_AMPLE) continue;
    const h = hash3(ci, 61, 2);
    platja[ci] = dist[ci] > 1 ? 1 : h < 0.22 ? 2 : h < 0.28 ? 3 : h > 0.95 ? 4 : h > 0.92 ? 5 : 1;
  }
  analitzar();
}

function alcadaSorra(v){
  if(vora.has(v)) return -0.75;
  let terra = false, mar = false;
  for(const c of fans.get(v)){
    if(heff[c] > 0 || esCarrer[c]) terra = true;
    else if(!esSorra[c]) mar = true;
  }
  return terra ? 0.03 : mar ? -0.75 : -0.16;
}

const barreja = (a, b, t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];

function sorra(G, cel, ci){
  const p = cel.p, Y = cel.vi.map(alcadaSorra);
  const bl = (u,v) => entre(entre(p[0],p[1],u), entre(p[3],p[2],u), v);
  const hy = (u,v) => { const a = Y[0]+(Y[1]-Y[0])*u, b = Y[3]+(Y[2]-Y[3])*u; return a+(b-a)*v; };
  const col = (y, j) => clar(barreja(SORRA_MULLADA, SORRA_SECA, Math.min(1, Math.max(0, (y+0.6)/0.6))), 0.97 + j*0.06);
  const M = 2;
  for(let i=0;i<M;i++) for(let j=0;j<M;j++){
    const u0=i/M, u1=(i+1)/M, v0=j/M, v1=(j+1)/M, jit = hash3(ci,i,j+90);
    const c0=bl(u0,v0), c1=bl(u1,v0), c2=bl(u1,v1), c3=bl(u0,v1);
    const y0=hy(u0,v0), y1=hy(u1,v0), y2=hy(u1,v1), y3=hy(u0,v1);
    quadV(G, [c0.x,y0,c0.z], [c1.x,y1,c1.z], [c2.x,y2,c2.z], [c3.x,y3,c3.z],
          col(y0,jit), col(y1,jit), col(y2,jit), col(y3,jit));
  }
  // cap al mar, un talús d'arena fins sota l'aigua: si no, una platja feta a mà al costat de
  // l'aigua semblaria una làmina que sura
  for(let e=0;e<4;e++){
    const b = cel.nb[e];
    if(b >= 0 && (esSorra[b] || heff[b] > 0 || esCarrer[b] || pont[b] > 0)) continue;
    const f = (e+1)%4, A = p[e], B = p[f], ya = Y[e], yb = Y[f];
    if(Math.max(ya, yb) < -0.6) continue;              // ja és sota l'aigua
    cara(G, [A.x,ya,A.z], [B.x,yb,B.z], [B.x,-0.8,B.z], [A.x,-0.8,A.z], fosc(SORRA_MULLADA, 0.92),
         [ (A.x+B.x)/2 - cel.c.x, 0, (A.z+B.z)/2 - cel.c.z ]);
  }
  elementPlatja(G, bl, hy, ci, platja[ci]);
  SORRES.push({ci, bl, hy});                    // hi pot haver gent prenent el sol
}

// on és més seca la cel·la: el punt més alt d'una petita graella, a mig camí del centre,
// perquè les coses no quedin a la vora de l'aigua
function llocSec(hy){
  let mu = 0.5, mv = 0.5, my = -Infinity;
  for(const u of [0.35, 0.5, 0.65]) for(const v of [0.35, 0.5, 0.65]){
    const y = hy(u, v); if(y > my + 1e-6){ my = y; mu = u; mv = v; }
  }
  return {u: (mu + 0.5)/2, v: (mv + 0.5)/2};
}

// on va l'element d'una cel·la de platja, i cap on mira: cap on baixa la pendent (cap al mar), amb una mica de joc
function llocElement(bl, hy, ci){
  const s = llocSec(hy), c = bl(s.u, s.v), y = hy(s.u, s.v);
  const a = bl(s.u, 0.2), b = bl(s.u, 0.8), cau = hy(s.u, 0.2) >= hy(s.u, 0.8);
  const mar = cau ? Math.atan2(-(b.z - a.z), b.x - a.x) : Math.atan2(-(a.z - b.z), a.x - b.x);
  return {x: c.x, y, z: c.z, gir: mar + (hash3(ci, 64, 1) - 0.5)*0.6};
}

function elementPlatja(G, bl, hy, ci, el){
  if(el <= 1) return;
  const L = llocElement(bl, hy, ci), c = L, y = L.y, gir = L.gir;
  if(el === 2) parasol(G, bl, hy, ci);
  else if(el === 3) afegeix(G, gandulesG(newG(), ci), c.x, y, c.z, gir, 0);
  else if(el === 4) afegeix(G, llautG(newG(), mulberry32(ci*31 + 7)), c.x, y + 0.09, c.z, hash3(ci,63,1)*6.283, 0.14);
  else if(el === 5) afegeix(G, patiG(newG(), ci), c.x, y + 0.05, c.z, gir, 0);
  else if(el === 6) afegeix(G, socorristaG(newG()), c.x, y, c.z, gir, 0);
  else if(el === 7) afegeix(G, castellG(newG(), ci), c.x, y, c.z, gir, 0);
}

const TELES = [[C('#d9473b'), MARC], [C('#2f6f8f'), MARC], [C('#e0a63a'), MARC], [C('#3d7a68'), C('#f2d68a')]];
const TOVALLOLES = [C('#f2d68a'), C('#e3a8a2'), C('#a8c3cf'), MARC, C('#d9473b')];

// un para-sol: el pal arrenca d'y0 i la tela és a franges, per sobre i per sota
function paraSol(G, x, z, y0, cols, r = 0.36){
  con(G, x, z, 0.012, 0.012, y0-0.1, y0+0.7, 4, MARC, false);
  const yb = y0 + 0.58, ya = y0 + 0.74, n = 8;
  for(let k=0;k<n;k++){
    const a0 = -k*6.283/n, a1 = -(k+1)*6.283/n;
    const A = [x+Math.cos(a0)*r, yb, z+Math.sin(a0)*r], B = [x+Math.cos(a1)*r, yb, z+Math.sin(a1)*r];
    tri(G, [x,ya,z], A, B, cols[k%2]);
    tri(G, [x,ya-0.02,z], B, A, fosc(cols[k%2], 0.7));
  }
}

function parasol(G, bl, hy, ci){
  const u = 0.35 + hash3(ci,62,1)*0.3, v = 0.35 + hash3(ci,62,2)*0.3;
  const p = bl(u,v), y = hy(u,v);
  paraSol(G, p.x, p.z, y, TELES[Math.floor(hash3(ci,62,3)*4)]);
  // tovallola estesa al costat, seguint el pendent de l'arena
  const tc = TOVALLOLES[Math.floor(hash3(ci,62,4)*5)];
  const U0 = u > 0.5 ? 0.06 : 0.66, U1 = U0 + 0.26, V0 = 0.2, V1 = 0.72;
  const T = [[U0,V0],[U1,V0],[U1,V1],[U0,V1]].map(([a,b]) => { const q = bl(a,b); return [q.x, hy(a,b)+0.014, q.z]; });
  quad(G, T[0], T[1], T[2], T[3], tc);
}

/* --- els elements, en coordenades pròpies: x cap al mar, y amunt --- */

// dues gandules, l'una al costat de l'altra, mirant al mar, amb un para-sol al mig
function gandulesG(G, ci){
  const tela = TELES[Math.floor(hash3(ci,65,1)*4)];
  const L = 0.36, W = 0.065, ys = 0.075;
  for(const z of [-0.17, 0.17]){
    for(const [x, zz] of [[-L/2+0.03, z-W+0.01], [-L/2+0.03, z+W-0.01], [L/2-0.03, z-W+0.01], [L/2-0.03, z+W-0.01]])
      con(G, x, zz, 0.008, 0.008, 0, ys, 3, MARC, false);                        // potes
    caixa(G, 0, z, 1, 0, L/2, W, ys, ys + 0.018, MARC);                           // el bastiment
    for(let i=0;i<4;i++)                                                          // el matalàs, a ratlles
      caixa(G, -0.11 + i*0.075, z, 1, 0, 0.037, W*0.9, ys + 0.018, ys + 0.03, tela[i % 2]);
    // el respatller, aixecat a la banda de terra
    const x0 = -L/2 + 0.02, x1 = -L/2 - 0.08, yt = ys + 0.17;
    quad2(G, [x0, ys+0.03, z-W], [x0, ys+0.03, z+W], [x1, yt, z+W], [x1, yt, z-W], tela[0]);
  }
  paraSol(G, -0.12, 0, 0, TELES[Math.floor(hash3(ci,65,2)*4)], 0.32);
  return G;
}

// patí de vela: dos flotadors, els travessers, la lona, el pal i la vela
function patiG(G, ci){
  const BLANC = C('#f4f1ea'), VELA = C('#efe8d8');
  const FRANJA = [C('#d9473b'), C('#2f6f8f'), C('#e0a63a')][Math.floor(hash3(ci,66,1)*3)];
  for(const z of [-0.17, 0.17]){                  // flotadors, punxeguts pels dos caps
    const pts = [{x:-0.34, z}, {x:-0.26, z:z+0.045}, {x:0.26, z:z+0.045}, {x:0.38, z}, {x:0.26, z:z-0.045}, {x:-0.26, z:z-0.045}];
    prisma(G, pts, 0, 0.07, BLANC, true);
    prisma(G, pts.map(p => ({x: p.x, z: z + (p.z - z)*0.8})), -0.02, 0, FRANJA, false);
  }
  for(const x of [-0.12, 0.12]) caixa(G, x, 0, 1, 0, 0.02, 0.2, 0.07, 0.09, FUSTA);   // travessers
  caixa(G, 0, 0, 1, 0, 0.12, 0.17, 0.085, 0.095, C('#cfc6b2'));                        // la lona
  con(G, 0.02, 0, 0.012, 0.009, 0.09, 0.95, 4, MARC, false);                            // el pal
  // la vela, per les dues cares, amb una franja de color
  tri(G, [0.02, 0.95, 0], [0.02, 0.14, 0], [-0.32, 0.14, 0], VELA);
  tri(G, [0.02, 0.95, 0], [-0.32, 0.14, 0], [0.02, 0.14, 0], VELA);
  for(const s of [1, -1]){
    tri(G, [0.02, 0.62, s*0.003], [0.02, 0.50, s*0.003], [-0.09, 0.38, s*0.003], FRANJA);
    tri(G, [0.02, 0.62, s*0.003], [-0.09, 0.38, s*0.003], [0.02, 0.50, s*0.003], FRANJA);
  }
  tronc(G, 0.02, 0.14, 0, -0.34, 0.14, 0, 0.008, 0.008, MARC, 3);                      // la botavara
  return G;
}

// la cadira alta del socorrista, mirant al mar, amb un para-sol, la bandera verda i el salvavides
function socorristaG(G){
  const BLANC = C('#f4f1ea'), VERMELL = C('#d23a2f'), VERD = C('#3f9a4a');
  const h = 0.5, w = 0.11;
  for(const [x, z] of [[-w, -w], [-w, w], [w, -w], [w, w]]) tronc(G, x*1.3, 0, z*1.3, x, h, z, 0.012, 0.011, BLANC, 4);
  for(const y of [0.14, 0.30]) for(const x of [-w*1.18, w*1.18]) caixa(G, x, 0, 0, 1, w*1.2, 0.008, y, y + 0.018, BLANC);
  caixa(G, 0, 0, 1, 0, w + 0.02, w + 0.02, h, h + 0.03, VERMELL);                      // la plataforma
  caixa(G, -w + 0.01, 0, 1, 0, 0.012, w, h + 0.03, h + 0.20, BLANC);                    // el respatller
  caixa(G, 0.01, 0, 1, 0, 0.06, w*0.7, h + 0.03, h + 0.07, VERMELL);                    // el seient
  paraSol(G, -w, 0, h + 0.05, [VERMELL, C('#f2d68a')], 0.22);
  const bx = w + 0.06, bz = w + 0.06;                                                   // la bandera verda
  con(G, bx, bz, 0.008, 0.008, 0, h + 0.55, 4, BLANC, false);
  quad2(G, [bx, h + 0.55, bz], [bx, h + 0.44, bz], [bx + 0.15, h + 0.45, bz + 0.04], [bx + 0.15, h + 0.54, bz + 0.04], VERD);
  const sx = w*1.2 + 0.016, R = 0.055;                                                  // el salvavides, penjat d'una pota
  for(let k=0;k<8;k++){
    const a0 = k*Math.PI/4, a1 = (k+1)*Math.PI/4;
    tronc(G, sx, 0.25 + Math.sin(a0)*R, Math.cos(a0)*R, sx, 0.25 + Math.sin(a1)*R, Math.cos(a1)*R, 0.016, 0.016, k % 2 ? BLANC : VERMELL, 4);
  }
  return G;
}

// un castell de sorra amb torres i muralla, i la galleda i la pala al costat
function castellG(G, ci){
  const S = clar(SORRA_SECA, 0.93), SF = fosc(SORRA_SECA, 0.86);
  caixa(G, 0, 0, 1, 0, 0.12, 0.12, 0, 0.07, S);                                         // la muralla
  for(const [x, z] of [[-0.12, -0.12], [-0.12, 0.12], [0.12, -0.12], [0.12, 0.12]]){
    con(G, x, z, 0.045, 0.036, 0, 0.13, 6, S, true);                                     // les torres
    con(G, x, z, 0.03, 0, 0.13, 0.17, 6, SF, false);
  }
  con(G, 0, 0, 0.06, 0.05, 0.07, 0.19, 6, S, true);                                      // la torre de l'homenatge
  con(G, 0, 0, 0.04, 0, 0.19, 0.25, 6, SF, false);
  const GAL = [C('#d9473b'), C('#2f6f8f'), C('#e0a63a'), C('#3d9a5a')][Math.floor(hash3(ci,67,1)*4)];
  con(G, 0.27, -0.06, 0.045, 0.035, 0, 0.08, 7, GAL, true);                              // la galleda, de cap per avall
  tronc(G, 0.22, 0.012, 0.13, 0.36, 0.05, 0.17, 0.008, 0.008, GAL, 3);                  // la pala
  caixa(G, 0.205, 0.13, 0.94, 0.33, 0.03, 0.025, 0.004, 0.016, GAL);
  return G;
}

// copia una geometria feta a part, girada i inclinada, a la malla G (per les dues cares)
function afegeix(G, Gt, x, y, z, rot, inc){
  const cr = Math.cos(rot), sr = Math.sin(rot), ci = Math.cos(inc), si = Math.sin(inc);
  const tf = i => {
    const px = Gt.p[i], py = Gt.p[i+1]*ci - Gt.p[i+2]*si, pz = Gt.p[i+1]*si + Gt.p[i+2]*ci;
    return [x + px*cr + pz*sr, y + py, z - px*sr + pz*cr];
  };
  const cl = i => [Gt.c[i], Gt.c[i+1], Gt.c[i+2]];
  for(let i=0;i<Gt.p.length;i+=9){
    const a = tf(i), b = tf(i+3), c = tf(i+6);
    tri(G, a, b, c, cl(i), cl(i+3), cl(i+6));
    tri(G, a, c, b, cl(i), cl(i+6), cl(i+3));
  }
}

/* ============================================================
   PONTS
   ------------------------------------------------------------
   Pont de pedra d'un sol arc sobre una cel·la d'aigua: va d'una
   riba (s=0) a l'altra (s=1); t és el través, la direcció per on
   corre el canal. Fa esquena d'ase i té l'arc prou alt perquè
   per sota s'hi vegi l'aigua.
   ============================================================ */

const PEDRA_PONT = C('#c8b596'), DOVELLA = C('#a8957a');

// alçada del pas a la riba de l'aresta e: el carrer, el terra de la casa o, si no hi ha res, a ran
function riba(ci, e){
  const b = cells[ci].nb[e];
  if(b >= 0 && esCarrer[b]){
    const j = cells[b].nb.indexOf(ci);
    return Math.max(nvC[b][j], nvC[b][(j+1)%4])*ALT + CARRER_Y;
  }
  if(b >= 0 && heff[b] > 0 && !span[b]) return base[b]*ALT + CARRER_Y;
  return CARRER_Y;
}

function pontG(G, cel, ci){
  const p = cel.p, eix = pont[ci];
  const bl = (u,v) => entre(entre(p[0],p[1],u), entre(p[3],p[2],u), v);
  const B = eix === 1 ? (s,t) => bl(t,s) : (s,t) => bl(s,t);
  const [eA, eB] = eix === 1 ? [0, 2] : [3, 1];          // arestes de les dues ribes
  const ya = riba(ci, eA), yb = riba(ci, eB);
  const GEP = 0.14, YW = -0.8;                            // esquena d'ase; peu de l'arc, sota l'aigua
  const yd = s => ya + (yb-ya)*s + GEP*Math.sin(Math.PI*s);
  const yc = Math.min(ya, yb) + GEP - 0.17;               // clau de l'arc
  const yArc = s => YW + (yc - YW)*Math.sqrt(Math.max(0, 1 - (2*s-1)*(2*s-1)));
  const pt = (s, t, y) => { const q = B(s,t); return [q.x, y, q.z]; };

  const K = 12, T0 = 0.1, T1 = 0.9, GR = 0.07, BAR = 0.17, DOV = 0.08;
  for(let k=0;k<K;k++){
    const s0 = k/K, s1 = (k+1)/K;
    const d0 = yd(s0), d1 = yd(s1), a0 = yArc(s0), a1 = yArc(s1);
    const v0 = Math.min(a0 + DOV, d0), v1 = Math.min(a1 + DOV, d1);
    quad2(G, pt(s0,T0+GR,d0), pt(s1,T0+GR,d1), pt(s1,T1-GR,d1), pt(s0,T1-GR,d0),
          LLOSA[Math.floor(hash3(ci,k,95)*LLOSA.length)]);                       // tauler
    quad2(G, pt(s0,T0,a0), pt(s1,T0,a1), pt(s1,T1,a1), pt(s0,T1,a0), fosc(PEDRA_PONT, 0.62));  // intradós
    for(const [t, ti] of [[T0, T0+GR], [T1, T1-GR]]){
      quad2(G, pt(s0,t,a0), pt(s1,t,a1), pt(s1,t,v1), pt(s0,t,v0), k%2 ? DOVELLA : fosc(DOVELLA, 0.88));
      quad2(G, pt(s0,t,v0), pt(s1,t,v1), pt(s1,t,d1+BAR), pt(s0,t,d0+BAR),
            clar(PEDRA_PONT, 0.95 + hash3(ci,k,96)*0.09));                          // timpà i barana
      quad2(G, pt(s0,ti,d0), pt(s1,ti,d1), pt(s1,ti,d1+BAR), pt(s0,ti,d0+BAR), PEDRA_PONT);
      quad2(G, pt(s0,t,d0+BAR), pt(s1,t,d1+BAR), pt(s1,ti,d1+BAR), pt(s0,ti,d0+BAR), clar(PEDRA_PONT, 1.08));
    }
  }
  for(const s of [0, 1]){                                 // caps de les baranes i, on no hi ha riba, el front
    const d = yd(s);
    for(const [t, ti] of [[T0, T0+GR], [T1-GR, T1]])
      quad2(G, pt(s,t,d), pt(s,ti,d), pt(s,ti,d+BAR), pt(s,t,d+BAR), PEDRA_PONT);
    const nb = cel.nb[s ? eB : eA];
    if(!esTerra(nb) && !(nb >= 0 && pont[nb] > 0))
      quad2(G, pt(s,T0,YW), pt(s,T1,YW), pt(s,T1,d), pt(s,T0,d), PEDRA_PONT);
  }
  if(fanals.has(ci)){                                     // fanal al mig d'una barana (si no n'hi ha cap al costat)
    const t = hash3(ci,97,2) < 0.5 ? T0 + GR/2 : T1 - GR/2, q = B(0.5, t);
    fanal(G, q.x, yd(0.5) + BAR, q.z);
  }
}

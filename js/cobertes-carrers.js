/* Cala · cantonades, voltes, cobertes, carrers i escales */

/* ============================================================
   CANTONADES ARRODONIDES
   ------------------------------------------------------------
   Un cantó s'arrodoneix només quan les dues arestes que hi
   arriben són parets exteriors. Si una de les dues dona a una
   casa veïna, el mur ha d'arribar al vèrtex exacte perquè hi
   enllaci el mur del veí: allà el cantó es deixa viu.
   Com que la condició depèn del pis (un veí baix deixa de
   tapar a partir de certa alçada), el perfil canvia amb
   l'alçada i cal tapar el ressalt horitzontal que es forma.
   ============================================================ */

const RADI = 0.21, ARR_K = 3;

function capA(A, B, r){                       // punt a distància r d'A cap a B
  const dx = B.x-A.x, dz = B.z-A.z, l = Math.hypot(dx,dz) || 1;
  const t = Math.min(r, l*0.42)/l;
  return {x: A.x+dx*t, z: A.z+dz*t};
}
function bezQ(A, P, B, t){                    // Bézier quadràtica
  const s = 1-t;
  return {x: s*s*A.x + 2*s*t*P.x + t*t*B.x, z: s*s*A.z + 2*s*t*P.z + t*t*B.z};
}
function arcCanto(cel, i){                    // corba del cantó i (sempre la mateixa)
  const p = cel.p;
  const A = capA(p[i], p[(i+3)%4], RADI), B = capA(p[i], p[(i+1)%4], RADI);
  const out = [];
  for(let k=0;k<=ARR_K;k++) out.push(bezQ(A, p[i], B, k/ARR_K));
  return out;
}
function cantons(cel, L){
  const ext = [0,1,2,3].map(e => !ocupat(cel.nb[e], L));
  return {ext, rodo: [0,1,2,3].map(i => ext[(i+3)%4] && ext[i])};
}
function tapaCanto(G, P, cv, y, amunt, col){  // omple el sector que deixa la corba
  for(let k=0;k<cv.length-1;k++){
    if(amunt) tri(G, [P.x,y,P.z], [cv[k+1].x,y,cv[k+1].z], [cv[k].x,y,cv[k].z], col);
    else      tri(G, [P.x,y,P.z], [cv[k].x,y,cv[k].z], [cv[k+1].x,y,cv[k+1].z], col);
  }
}

/* ============================================================
   ARCS I VOLTES
   ============================================================ */

const corbaArc = t => ARC_YS + (ARC_YC-ARC_YS)*Math.sqrt(Math.max(0, 1-(2*t-1)*(2*t-1)));

// pilars dels porxos: mig gruix del fust i del capitell. L'arc arrenca de la vora del capitell
const PILAR_W = 0.085, PILAR_CAP = 0.115;

// la planta baixa d'una volta (entre dues cases) o d'una casa amb porxo, al nivell Lb:
// arcs a les cares obertes, volta de canó si n'hi ha dues d'enfrontades i, al porxo, pilars
function arcada(G, cel, ci, col, Lb = 0){
  const p = cel.p, nb = cel.nb, y = Lb*ALT;
  const obert = [0,1,2,3].map(e => !ocupat(nb[e], Lb));   // a un altre porxo també és obert: fan galeria
  const ambPilars = heights[ci] > 0;

  // punts de la corba de l'arc sobre l'aresta A-B: [punt, alçada]. Al porxo, l'arc no arrenca del
  // vèrtex sinó de la vora del capitell; fins allà, el timpà s'assenta pla sobre el capitell.
  // Totes les arestes tenen el mateix nombre de punts i les mateixes alçades: la volta de canó
  // uneix els de dues arestes enfrontades
  const corba = (A, B) => {
    const out = [];
    const a = ambPilars ? Math.min(0.2, PILAR_CAP / (Math.hypot(B.x-A.x, B.z-A.z) || 1)) : 0;
    if(ambPilars) out.push([A, ARC_YS]);
    for(let k=0;k<=ARC_K;k++){ const t = a + (1-2*a)*k/ARC_K; out.push([entre(A,B,t), corbaArc(k/ARC_K)]); }
    if(ambPilars) out.push([B, ARC_YS]);
    return out;
  };

  for(let e=0;e<4;e++){                       // timpans
    if(!obert[e]) continue;
    const c = corba(p[e], p[(e+1)%4]);
    for(let k=0;k<c.length-1;k++){
      const [P0, h0] = c[k], [P1, h1] = c[k+1];
      quad(G, [P0.x,y+h0,P0.z], [P1.x,y+h1,P1.z], [P1.x,y+ALT,P1.z], [P0.x,y+ALT,P0.z], col);
    }
  }

  let eix = -1;
  if(obert[0] && obert[2]) eix = 0;
  else if(obert[1] && obert[3]) eix = 1;

  if(eix >= 0){                               // volta de canó
    const cP = corba(p[eix], p[(eix+1)%4]), cQ = corba(p[(eix+3)%4], p[(eix+2)%4]);
    for(let k=0;k<cP.length-1;k++){
      const [P0, h0] = cP[k], [P1, h1] = cP[k+1], [Q0] = cQ[k], [Q1] = cQ[k+1];
      quad(G, [Q0.x,y+h0,Q0.z], [Q1.x,y+h1,Q1.z], [P1.x,y+h1,P1.z], [P0.x,y+h0,P0.z], col);
    }
  } else {                                    // sostre pla
    const t = y + ALT;
    quad(G, [p[3].x,t,p[3].z], [p[2].x,t,p[2].z], [p[1].x,t,p[1].z], [p[0].x,t,p[0].z], col);
  }

  // casa amb porxo: un pilar de pedra a cada cantó d'on arrenca algun arc. Entre dos porxos
  // veïns el pilar és compartit i es fa un sol cop
  if(!ambPilars) return;
  const terra = (nvC[ci] ? nvC[ci][0] : Lb)*ALT + CARRER_Y, w = PILAR_W, cap = PILAR_CAP;
  for(let i=0;i<4;i++){
    if(!obert[i] && !obert[(i+3)%4]) continue;
    const v = cel.vi[i];
    if(PILARS.has(v)) continue;
    PILARS.add(v);
    const A = p[i], B = p[(i+1)%4], l = Math.hypot(B.x-A.x, B.z-A.z) || 1;
    const ux = (B.x-A.x)/l, uz = (B.z-A.z)/l;
    caixa(G, A.x, A.z, ux, uz, w*1.25, w*1.25, terra, terra + 0.06, PEDRA);            // basa
    caixa(G, A.x, A.z, ux, uz, w, w, terra + 0.06, y + ARC_YS - 0.06, PEDRA);           // fust
    caixa(G, A.x, A.z, ux, uz, w*1.12, w*1.12, y + ARC_YS - 0.06, y + ARC_YS - 0.035, PEDRA);   // collarí
    caixa(G, A.x, A.z, ux, uz, cap, cap, y + ARC_YS - 0.035, y + ARC_YS, PEDRA);        // capitell
  }
}

/* ============================================================
   COBERTES FUSIONADES
   ------------------------------------------------------------
   Les cel·les veïnes que acaben a la mateixa alçada i tenen el
   mateix color de façana (el mateix tint, o totes dues
   automàtiques; una volta sense pintar compta amb el de la casa on
   s'aguanta) formen una regió i comparteixen una sola
   teulada. Si el color és diferent, cada casa fa la seva. L'alçada de cada punt
   de la teulada depèn de la distància del vèrtex a la vora de
   la regió (0, 1, 2, 3 anells): un bloc solt fa una piràmide,
   quatre de junts fan un carener. Els vèrtexs de vora es
   desplacen cap enfora per fer el ràfec.
   ============================================================ */

const RAFEC = 0.11, PAS = 0.26;

// el grup que comparteix coberta amb la casa ci: {membres, clau}. vista, si n'hi ha, es va marcant
function grupCoberta(ci, vista = new Array(cells.length).fill(false)){
  // només s'ajunten les del mateix color: una casa pintada d'un altre color és un edifici a part
  const h = heff[ci], color = tintEf(ci), pila = [ci], membres = [ci];
  vista[ci] = true;
  while(pila.length){
    const a = pila.pop();
    for(const b of cells[a].nb){
      if(b >= 0 && !vista[b] && heff[b] === h && escalaE[b] < 0 && tintEf(b) === color){ vista[b] = true; pila.push(b); membres.push(b); }
    }
  }
  // L'estil de la coberta (teula o terrat, color, xemeneia) surt d'una casa del mateix
  // grup, no d'un número d'ordre: si no, afegir una casa en un racó renumerava tots els
  // grups de després i canviava teulades d'arreu del poble. Ara només canvia l'estil
  // d'un grup quan hi entra o en surt la casa que el decideix.
  let clau = ci, hm = hash3(ci, 41, 17);
  for(const m of membres){ const v = hash3(m, 41, 17); if(v < hm){ hm = v; clau = m; } }
  return {membres, clau};
}

function cobertes(G){
  const n = cells.length;
  const vista = new Array(n).fill(false);
  FACETES = new Map(); AMB_PLAQUES = new Set();
  for(let ci=0; ci<n; ci++){
    if(heff[ci] <= 0 || vista[ci] || escalaE[ci] >= 0) continue;   // una escala a sobre fa de coberta
    const {membres, clau} = grupCoberta(ci, vista);
    ferCoberta(G, membres, heff[ci], clau);
  }
  plaquesSolars(G);                             // les plaques, sobre l'aiguavés que mira més al sol
}

// clau: la cel·la del grup que en decideix l'estil
function ferCoberta(G, llista, h, clau){
  const y = h*ALT;
  const dins = new Set(llista);

  // adjacència de vèrtexs dins la regió
  const adj = new Map();
  for(const ci of llista){
    const vi = cells[ci].vi;
    for(let k=0;k<4;k++){
      const a = vi[k], b = vi[(k+1)%4];
      if(!adj.has(a)) adj.set(a, new Set());
      if(!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b); adj.get(b).add(a);
    }
  }

  // distància a la vora
  const d = new Map(), cua = [];
  for(const v of adj.keys()){
    if(vora.has(v) || fans.get(v).some(c => !dins.has(c))){ d.set(v, 0); cua.push(v); }
  }
  for(let qi=0; qi<cua.length; qi++){
    const v = cua[qi], dv = d.get(v);
    for(const w of adj.get(v)) if(!d.has(w)){ d.set(w, dv+1); cua.push(w); }
  }
  for(const v of adj.keys()) if(!d.has(v)) d.set(v, 3);

  // ràfec: els vèrtexs de vora s'allunyen del centre de la regió
  const pos = new Map(), dirs = new Map();
  for(const v of adj.keys()){
    const P = posV.get(v);
    if(d.get(v) === 0){
      let cx=0, cz=0, m=0;
      for(const c of fans.get(v)) if(dins.has(c)){ cx += cells[c].c.x; cz += cells[c].c.z; m++; }
      let dx = P.x - cx/m, dz = P.z - cz/m;
      const l = Math.hypot(dx,dz) || 1; dx/=l; dz/=l;
      dirs.set(v, {x:dx, z:dz});
      pos.set(v, {x: P.x + dx*RAFEC, z: P.z + dz*RAFEC});
    } else {
      dirs.set(v, {x:0, z:0});
      pos.set(v, {x:P.x, z:P.z});
    }
  }

  const alt = v => y + Math.min(d.get(v), 3)*PAS;
  const vora_ = (ci,e) => { const b = cells[ci].nb[e]; return !(b >= 0 && dins.has(b)); };

  const torre = llista.length === 1 ? tipusTorre[llista[0]] : null;
  if(torre === 'guaita'){
    merlets(G, llista[0], y);
    const c = cells[llista[0]].c;                 // per la Diada, la bandera al cim de la torre
    apuntaDiada(llista[0], 0, () => banderaPal(G, c.x, y, c.z, 0.9, llista[0]));
    return;
  }

  // l'estil (vegeu teulades.js): terrat, sempre on hi arrenca o hi arriba una escala
  const estil = estilCoberta(llista, h, clau, torre);
  const teu = TEULES[Math.floor(hash3(clau,1,3)*TEULES.length)];

  if(estil === 'terrat' || estil === 'barana' || estil === 'golfes'){
    for(const ci of llista){
      const col = colorParet(ci);              // l'ampit de cada casa, del color de la seva façana
      const vi = cells[ci].vi, P = vi.map(v => pos.get(v));
      quad(G, [P[0].x,y,P[0].z], [P[1].x,y,P[1].z], [P[2].x,y,P[2].z], [P[3].x,y,P[3].z], TERRA);
      const top = y + 0.20;
      for(let e=0;e<4;e++){
        if(!vora_(ci,e)) continue;
        if(nivellVora(cells[ci].nb[e], ci) === h) continue;   // on hi toca una escala o un carrer al nivell del terrat, s'hi passa
        const A = P[e], B = P[(e+1)%4];
        const da = dirs.get(vi[e]), db = dirs.get(vi[(e+1)%4]);
        const ai = {x:A.x - da.x*0.20, z:A.z - da.z*0.20};
        const bi = {x:B.x - db.x*0.20, z:B.z - db.z*0.20};
        if(estil === 'barana'){ baranaFerro(G, A, B, ai, bi, y, col); continue; }
        quad(G, [A.x,y-0.09,A.z], [B.x,y-0.09,B.z], [B.x,top,B.z], [A.x,top,A.z], col);
        quad(G, [bi.x,y,bi.z], [ai.x,y,ai.z], [ai.x,top,ai.z], [bi.x,top,bi.z], col);
        quad(G, [A.x,top,A.z], [B.x,top,B.z], [bi.x,top,bi.z], [ai.x,top,ai.z], col);
      }
      const hc = hash3(ci,4,4), cc = cells[ci].c;
      if(estil === 'golfes' && ci === clau){ golfes(G, ci, y, teu); continue; }   // les golfes, a la casa que decideix
      if(solar[ci]) plaquesTerrat(G, ci, y);   // plaques solars: ocupen el terrat
      else if(estil === 'barana' ? hc < 0.75 : estil === 'golfes' && hc < 0.5) estenedor(G, ci, y);   // roba estesa
      else if(hc > 0.82)      arbre(G, cc.x, y, cc.z, 0.55, ci);
      else if(hc > 0.64) test(G, cc.x, y, cc.z, ci, 1.3);
      else if(hc < 0.12 && estil === 'terrat') pergola(G, ci, y);
      apuntaDiada(ci, 0.15, () => {               // per la Diada, un pal amb la bandera en un racó del terrat
        const p = entre(cells[ci].c, cells[ci].p[Math.floor(hash3(ci, 407, 1)*4)], 0.55);
        banderaPal(G, p.x, y, p.z, 0.8, ci);
      });
    }
    return;
  }

  // teulada a dues aigües o a una aigua; si no hi encaixa, a quatre aigües com sempre
  if(estil === 'dues' && teuladaDuesAigues(G, llista, y, clau, pos, vora_, teu)) return;
  if(estil === 'una' && teuladaUnaAigua(G, clau, y, pos, teu)) return;
  const cim = torre === 'campanar' ? 0.78 : 0;    // el campanar acaba en punxa
  for(const ci of llista){
    const vi = cells[ci].vi, P = vi.map(v => pos.get(v)), Y = vi.map(v => alt(v));
    const dmin = Math.min(d.get(vi[0]), d.get(vi[1]), d.get(vi[2]), d.get(vi[3]));
    const cc = cells[ci].c, cy = cim ? y + cim : y + Math.min(dmin+1, 3)*PAS;
    for(let k=0;k<4;k++){
      const a = P[k], b = P[(k+1)%4];
      // cada aiguavés amb un to lleugerament diferent: les teules no són mai iguals
      tri(G, [a.x,Y[k],a.z], [b.x,Y[(k+1)%4],b.z], [cc.x,cy,cc.z], clar(teu, 0.92 + hash3(ci,k,77)*0.14));
      if(!cim) facetaSolar(ci, [a.x,Y[k],a.z], [b.x,Y[(k+1)%4],b.z], [cc.x,cy,cc.z], [cc.x,cy,cc.z]);
    }
    // per la Diada, si la casa no té cap altre lloc on penjar la bandera (una casa de dins
    // de l'illa, sense façanes a fora), un pal al capdamunt de la teulada
    if(!cim) apuntaDiada(ci, 1.5, () => banderaPal(G, cc.x, cy - 0.04, cc.z, 0.6, ci));
    for(let e=0;e<4;e++){                      // fascia del ràfec
      if(!vora_(ci,e)) continue;
      const a = P[e], b = P[(e+1)%4];
      quad(G, [a.x,Y[e]-0.09,a.z], [b.x,Y[(e+1)%4]-0.09,b.z], [b.x,Y[(e+1)%4],b.z], [a.x,Y[e],a.z], teu);
    }
  }

  if(torre === 'campanar'){                     // cornisa blanca i penell al capdamunt
    const cel = cells[llista[0]], c = cel.c;
    prisma(G, expand(cel.p, c, 1.06), y-0.12, y-0.05, MARC, false);
    con(G, c.x, c.z, 0.012, 0.010, y+cim-0.02, y+cim+0.26, 4, FERRO, false);
    bola(G, c.x, y+cim+0.06, c.z, 0.045, 0.08, BRONZE, llista[0], 6);
    biga(G, {x:c.x-0.09, z:c.z}, {x:c.x+0.09, z:c.z}, y+cim+0.21, y+cim+0.23, 0.012, FERRO);
  } else if(hash3(clau,7,7) < PAR.xemeneies && !solar[clau]){   // xemeneia, a la mateixa casa que decideix l'estil (si no hi ha plaques)
    const ci = clau;
    const cel = cells[ci], vi = cel.vi;
    const dmin = Math.min(d.get(vi[0]), d.get(vi[1]), d.get(vi[2]), d.get(vi[3]));
    const p = entre(cel.c, cel.p[Math.floor(hash3(clau,7,9)*4)], 0.3);
    xemeneia(G, p.x, p.z, y, y + Math.min(dmin+1, 3)*PAS + 0.16, colorParet(ci), teu);
  }
}

/* ============================================================
   CARRERS A DIFERENTS NIVELLS I ESCALES
   ------------------------------------------------------------
   Cada cel·la de carrer té un nivell enter i és plana. Les
   escales es posen a mà, en mode Escales: escales[ci] diu cap
   a quina aresta puja (aresta + 1; 0 si no n'hi ha). Una
   escala puja sempre UN sol nivell, de L a L+1, i ha d'arrencar
   d'un lloc pla al nivell L: un carrer, un pont, el terrat
   d'una casa o el capdamunt d'una altra escala (així es fan
   trams seguits fins a un pla tan alt com calgui). A dalt no
   cal que hi hagi res: s'hi pot fer el carrer després.
   Una escala pot anar en un carrer (o en el buit del costat
   d'un lloc pla, que es torna carrer) o a sobre d'una casa:
   llavors arrenca del seu terrat. Les cases d'on arrenca o a
   on arriba una escala tenen terrat, no teulada.
   ============================================================ */

const NIV_MAX = 12;   // el nivell més alt d'un carrer (les escales pugen per sobre de les cases)

// on hi ha escala: analitzar() en deixa el resultat a escalaE (l'aresta que puja, o -1),
// a nvC (el nivell de cada cantó de cada carrer o escala) i a terratForcat
function calculaEscales(){
  const n = cells.length;
  escalaE = new Array(n).fill(-1);
  nvC = new Array(n).fill(null);
  terratForcat = new Array(n).fill(false);
  for(let ci=0; ci<n; ci++){
    const casa = heights[ci] > 0 && !span[ci];
    if(!esCarrer[ci] && !casa) continue;
    const L = casa ? heff[ci] : nivEf[ci];       // sobre una casa, l'escala arrenca del terrat
    if(!casa) nvC[ci] = [L,L,L,L];
    if(!escales[ci] || span[ci]) continue;        // sota una volta, el carrer és pla
    const e = escales[ci] - 1;
    escalaE[ci] = e;
    nvC[ci] = [L,L,L,L];
    nvC[ci][e] = L + 1; nvC[ci][(e+1)%4] = L + 1;
  }
  // les cases d'on arrenca o a on arriba una escala, amb terrat
  for(let ci=0; ci<n; ci++){
    const e = escalaE[ci]; if(e < 0) continue;
    const L = Math.min(...nvC[ci]), baix = cells[ci].nb[(e+2)%4], dalt = cells[ci].nb[e];
    if(esTerrat(baix) && heff[baix] === L) terratForcat[baix] = true;
    if(esTerrat(dalt) && heff[dalt] === L + 1) terratForcat[dalt] = true;
  }
}

// una casa sense escala a sobre: el seu terrat pot ser terreny pla
const esTerrat = b => b >= 0 && heights[b] > 0 && !span[b] && escalaE[b] < 0;

// A quin nivell es pot caminar per la vora que la cel·la v comparteix amb ci, o null si no és plana:
// un carrer, un pont, el terrat d'una casa o el cap d'una escala (dalt o baix, no pels costats)
function nivellVora(v, ci){
  if(v < 0) return null;
  if(esTerrat(v)) return heff[v];
  if(pont[v] > 0) return 0;
  if(!nvC[v] || esMunt(v)) return null;           // per la roca no s'hi camina
  const j = cells[v].nb.indexOf(ci);
  if(j < 0) return null;
  return nvC[v][j] === nvC[v][(j+1)%4] ? nvC[v][j] : null;
}

// terreny pla de nivell L a la cel·la b: un carrer que no és escala, o un pont (a nivell zero)
const esPla = (b, L) => b >= 0 && ((esCarrer[b] && escalaE[b] < 0 && !esMunt(b) && nivEf[b] === L) || (L === 0 && pont[b] > 0));

// Cap a on pot pujar una escala posada a ci: [{e, L, porta}], l'aresta que puja, el nivell de
// baix i si a dalt ja hi troba on arribar. Ha d'arrencar d'una vora plana; si ci ja és carrer
// o casa, al seu mateix nivell. Primer van les que ja porten a algun lloc, i després les més baixes
function sentitsEscala(ci){
  if(ci < 0 || pont[ci] || span[ci] || forcat[ci]) return [];
  const casa = heights[ci] > 0;
  const propi = casa ? heff[ci] : esCarrer[ci] ? nivEf[ci] : null;
  const nb = cells[ci].nb, out = [];
  for(let b=0;b<4;b++){
    const L = nivellVora(nb[b], ci);
    if(L === null || (propi !== null && L !== propi) || L > NIV_MAX) continue;
    const e = (b + 2) % 4;
    out.push({e, L, porta: nivellVora(nb[e], ci) === L + 1});
  }
  return out.sort((a, b) => (b.porta - a.porta) || (a.L - b.L) || (a.e - b.e));
}

// nivell del carrer b a l'aresta que comparteix amb la cel·la ci (el més baix dels dos cantons)
function nivellAresta(b, ci){
  if(b < 0 || !nvC[b]) return 0;
  const j = cells[b].nb.indexOf(ci);
  return j < 0 ? nivEf[b] : Math.min(nvC[b][j], nvC[b][(j+1)%4]);
}

function llambordes(G, bl, ci, y){
  const M = 3;
  for(let i=0;i<M;i++) for(let j=0;j<M;j++){
    const c0 = bl(i/M,j/M), c1 = bl((i+1)/M,j/M), c2 = bl((i+1)/M,(j+1)/M), c3 = bl(i/M,(j+1)/M);
    const col = LLOSA[Math.floor(hash3(ci, i, j+30)*LLOSA.length)];
    quad(G, [c0.x,y,c0.z], [c1.x,y,c1.z], [c2.x,y,c2.z], [c3.x,y,c3.z], col);
  }
}

// quad orientat: gira l'ordre dels vèrtexs si cal perquè la cara miri cap a nd
function cara(G, a, b, c, d, col, nd){
  const ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2], vx=c[0]-a[0], vy=c[1]-a[1], vz=c[2]-a[2];
  const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx;
  if(nx*nd[0] + ny*nd[1] + nz*nd[2] < 0) quad(G, d, c, b, a, col);
  else quad(G, a, b, c, d, col);
}

const CALC_ESC = C('#f2ece0');   // muret emblanquinat de les escales
const CAP_ESC  = C('#d6cab3');   // l'albardilla de pedra que el corona

// Escala d'un tram, de la vora baixa (aresta e+2, alçada y0) a l'alta (aresta e, y1).
// Graons de pedra amb el nas que sobresurt i la contrapetja a l'ombra; on el costat
// dona a un lloc més baix, un muret emblanquinat amb albardilla; arran de casa,
// algun test als graons
function escala(G, cel, ci, e, y0, y1){
  const q = k => cel.p[(e+k)%4], nb = k => cel.nb[(e+k)%4];
  // s: de baix (0) a dalt (1); t: de l'aresta e+3 (0) a la e+1 (1)
  const P = (s, t) => entre(entre(q(3), q(0), s), entre(q(2), q(1), s), t);
  const V = (s, t, y) => { const a = P(s, t); return [a.x, y, a.z]; };
  const dir = (a, b) => [b.x-a.x, 0, b.z-a.z];
  const dS = dir(P(0,.5), P(1,.5)), dT = dir(P(.5,0), P(.5,1));
  const neg = v => [-v[0], -v[1], -v[2]], AMUNT = [0,1,0], AVALL = [0,-1,0];

  // muret als costats que donen a un lloc més baix (no a una casa ni a un carrer més alt)
  const costat = k => {
    const b = nb(k), t = solTop(b);
    if(t >= y1 - 0.15) return b >= 0 && heff[b] > 0 && !span[b] ? 'casa' : 'res';   // el veí fa de paret
    return 'mur';
  };
  const c0 = costat(3), c1 = costat(1);
  const MW = 0.1, HP = 0.24;
  const ta = c0 === 'mur' ? MW : 0, tb = c1 === 'mur' ? 1 - MW : 1;

  const n = Math.max(3, Math.round((y1 - y0)/0.15)), dy = (y1 - y0)/n;
  const NAS = 0.022, GR = 0.03;                  // el nas: quant sobresurt i quin gruix fa
  for(let k=0;k<n;k++){
    const s0 = k/n, s1 = (k+1)/n, sn = s0 - NAS, ya = y0 + k*dy, yb = ya + dy;
    const pedra = LLOSA[Math.floor(hash3(ci, k, 77)*LLOSA.length)];
    cara(G, V(s0,ta,ya), V(s0,tb,ya), V(s0,tb,yb-GR), V(s0,ta,yb-GR), fosc(pedra, 0.7), neg(dS));     // contrapetja
    cara(G, V(sn,ta,yb-GR), V(s0,ta,yb-GR), V(s0,tb,yb-GR), V(sn,tb,yb-GR), fosc(pedra, 0.6), AVALL); // sota el nas
    cara(G, V(sn,ta,yb-GR), V(sn,tb,yb-GR), V(sn,tb,yb), V(sn,ta,yb), clar(pedra, 1.12), neg(dS));    // cantell
    const sm = s0 + (s1 - s0)*0.22;              // franja clara del nas i la resta de la petja
    cara(G, V(sn,ta,yb), V(sn,tb,yb), V(sm,tb,yb), V(sm,ta,yb), clar(pedra, 1.1), AMUNT);
    cara(G, V(sm,ta,yb), V(sm,tb,yb), V(s1,tb,yb), V(s1,ta,yb), pedra, AMUNT);
    // a tocar de casa, de tant en tant un test al graó
    for(const [cst, t, i] of [[c0, 0.13, 0], [c1, 0.87, 1]])
      if(cst === 'casa' && k < n-1 && hash3(ci, k*2 + i, 78) < 0.28){
        const a = P((k + 0.6)/n, t);
        test(G, a.x, yb, a.z, ci*13 + k, 0.62);
      }
  }

  // murets
  const top = s => y0 + (y1 - y0)*s + HP;
  for(const [cst, tOut, tIn] of [[c0, 0, MW], [c1, 1, 1 - MW]]){
    if(cst !== 'mur') continue;
    const fora = tOut === 0 ? neg(dT) : dT, dins = neg(fora);
    cara(G, V(0,tOut,y0), V(1,tOut,y1), V(1,tOut,top(1)), V(0,tOut,top(0)), CALC_ESC, fora);
    for(let k=0;k<n;k++){                        // la cara de dins arrenca de cada graó
      const s0 = k/n, s1 = (k+1)/n, yb = y0 + (k+1)*dy;
      cara(G, V(s0,tIn,yb), V(s1,tIn,yb), V(s1,tIn,top(s1)), V(s0,tIn,top(s0)), fosc(CALC_ESC, 0.94), dins);
    }
    cara(G, V(0,tOut,y0), V(0,tIn,y0), V(0,tIn,top(0)), V(0,tOut,top(0)), CALC_ESC, neg(dS));
    cara(G, V(1,tOut,y1), V(1,tIn,y1), V(1,tIn,top(1)), V(1,tOut,top(1)), CALC_ESC, dS);
    // albardilla: una llosa una mica més ampla que el mur
    const o = 0.025, A = tOut === 0 ? -o : 1 + o, B = tOut === 0 ? MW + o : 1 - MW - o, g = 0.035;
    const fosca = fosc(CAP_ESC, 0.88);
    cara(G, V(-o,A,top(-o)+g), V(1+o,A,top(1+o)+g), V(1+o,B,top(1+o)+g), V(-o,B,top(-o)+g), CAP_ESC, AMUNT);
    for(const [t, nd] of [[A, fora], [B, dins]])
      cara(G, V(-o,t,top(-o)), V(1+o,t,top(1+o)), V(1+o,t,top(1+o)+g), V(-o,t,top(-o)+g), fosca, nd);
    cara(G, V(-o,A,top(-o)), V(-o,B,top(-o)), V(-o,B,top(-o)+g), V(-o,A,top(-o)+g), fosca, neg(dS));
    cara(G, V(1+o,A,top(1+o)), V(1+o,B,top(1+o)), V(1+o,B,top(1+o)+g), V(1+o,A,top(1+o)+g), fosca, dS);
    // un test a l'arrencada del muret, a vegades
    if(hash3(ci, tOut, 79) < 0.5){
      const a = P(0.05, (A + B)/2);
      test(G, a.x, top(0.05) + g, a.z, ci*7 + tOut, 0.7);
    }
  }
}

/* --- gespa: un carrer o una plaça amb herba en lloc de llambordes --- */
const HERBA = ['#7f9c50','#88a557','#77934b','#8fab5e'].map(C);
const FLORS_GESPA = ['#f6f2e6','#ecc94b','#b993d0','#f6f2e6'].map(C);   // margarides, botons d'or i violetes
// es veu gespa: un carrer o una plaça plans que no són moll ni roca (una escala, encara que s'hi posi, és de pedra)
const esGespa = ci => ci >= 0 && gespa[ci] > 0 && esCarrer[ci] && heights[ci] === 0 && escalaE[ci] < 0 && !moll[ci] && !roca[ci];
// es pot fer gespa aquí (o alçar la que hi ha)? a l'aigua, en un carrer, una plaça, un moll o la roca; no sota una casa ni un pont
const potGespa = ci => ci >= 0 && heights[ci] === 0 && !pont[ci] && !molins[ci] && !(gespa[ci] && carrer[ci] && nivell[ci] >= NIV_MAX);

// l'herba, en trossos de verds diferents, amb alguna mata i alguna flor
function herba(G, bl, ci, y){
  const M = 3;
  for(let i=0;i<M;i++) for(let j=0;j<M;j++){
    const c0 = bl(i/M,j/M), c1 = bl((i+1)/M,j/M), c2 = bl((i+1)/M,(j+1)/M), c3 = bl(i/M,(j+1)/M);
    quad(G, [c0.x,y,c0.z], [c1.x,y,c1.z], [c2.x,y,c2.z], [c3.x,y,c3.z], HERBA[Math.floor(hash3(ci, i, j+60)*HERBA.length)]);
  }
  const ll = (ci*2654435761) | 0;
  const nMates = Math.floor(hash3(ci,61,1)*3);    // de cap a dues mates d'herba més alta
  for(let i=0;i<nMates;i++){
    const a = bl(0.15 + hash3(ci,i,62)*0.7, 0.15 + hash3(ci,i,63)*0.7);
    bola(G, a.x, y, a.z, 0.05, 0.045, fosc(HERBA[i % HERBA.length], 0.82), ll + i, 5);
  }
  if(hash3(ci,64,1) < 0.55){                       // una clapa de flors d'un sol color
    const col = FLORS_GESPA[Math.floor(hash3(ci,64,2)*FLORS_GESPA.length)];
    const u = 0.2 + hash3(ci,64,3)*0.6, v = 0.2 + hash3(ci,64,4)*0.6;
    for(let i=0;i<4;i++){
      const a = bl(u + (hash3(ci,i,65) - 0.5)*0.22, v + (hash3(ci,i,66) - 0.5)*0.22);
      bola(G, a.x, y, a.z, 0.018, 0.022, col, ll + 7 + i, 4);
    }
  }
}

// una mata de jardí, amb flors o sense
function mata(G, x, y, z, k, esc=1){
  const ll = (k*2246822519) | 0;
  bola(G, x, y, z, 0.13*esc, 0.17*esc, VERD, ll);
  if(hash3(k,3,67) < 0.6){
    const flor = hash3(k,4,67) < 0.5 ? BUGA : GERANI;
    for(let i=0;i<4;i++){
      const a = hash3(k,i,68)*6.283, d = 0.08*esc*(0.4 + hash3(k,i,69)*0.6);
      bola(G, x + Math.cos(a)*d, y + 0.1*esc + hash3(k,i,70)*0.05*esc, z + Math.sin(a)*d, 0.03*esc, 0.04*esc, flor, ll + i, 5);
    }
  }
}

function paviment(G, cel, ci){
  const p = cel.p;
  const Y = nvC[ci].map(l => l*ALT + CARRER_Y);
  const e = escalaE[ci];
  if(e < 0){
    const bl = (u,v) => entre(entre(p[0],p[1],u), entre(p[3],p[2],u), v);
    if(esGespa(ci)) herba(G, bl, ci, Y[0]);
    else llambordes(G, bl, ci, Y[0]);
    return {y: Y[0], pla: true};
  }
  escala(G, cel, ci, e, Y[(e+2)%4], Y[e]);
  return {y: (Y[0]+Y[1]+Y[2]+Y[3])/4, pla: false};
}

// què hi ha en una cel·la de carrer: 'testos', 'banc', 'fanal', 'arbre' o res, segons els paràmetres
// (els quatre percentatges, l'un darrere l'altre; volFanal() també ho mira)
function mobleCarrer(ci){
  const h = hash3(ci, 21, 3), a = PAR.testos, b = a + PAR.bancs, c = b + PAR.fanals, d = c + PAR.arbres;
  return h < a ? 'testos' : h < b ? 'banc' : h < c ? 'fanal' : h < d ? 'arbre' : null;
}

function mobiliari(G, cel, ci, y, sotaVolta){
  const moble = mobleCarrer(ci), c = cel.c;
  const capA = (k, f) => entre(c, cel.p[k], f);   // punt entre el centre i un cantó
  if(moble === 'testos' && esGespa(ci)){          // a la gespa, en lloc de testos, una o dues mates
    const k = Math.floor(hash3(ci,22,4)*4), a = capA(k, 0.58);
    mata(G, a.x, y, a.z, ci);
    if(hash3(ci,22,5) < 0.5){ const b = capA((k+1)%4, 0.6); mata(G, b.x, y, b.z, ci + 7919, 0.8); }
  } else if(moble === 'testos'){                  // un o dos testos amb flors
    const k = Math.floor(hash3(ci,22,4)*4), a = capA(k, 0.6);
    test(G, a.x, y, a.z, ci);
    if(hash3(ci,22,5) < 0.5){ const b = capA((k+1)%4, 0.62); test(G, b.x, y, b.z, ci + 7919, 0.8); }
  } else if(moble === 'banc'){                    // banc de pedra, paral·lel a una aresta
    const k = Math.floor(hash3(ci,24,4)*4), A = cel.p[k], B = cel.p[(k+1)%4];
    const m = entre(entre(A,B,0.5), c, 0.32), l = Math.hypot(B.x-A.x, B.z-A.z) || 1;
    banc(G, m.x, m.z, (B.x-A.x)/l, (B.z-A.z)/l, y);
    BANCS.push({ci, k, x: m.x, z: m.z, ux: (B.x-A.x)/l, uz: (B.z-A.z)/l, y, mar: false}); OBST.set(ci, k);   // hi pot seure gent
  } else if(moble === 'fanal'){                   // fanal, si no n'hi ha cap al costat (vegeu triaFanals)
    if(fanals.has(ci)){ const a = capA(Math.floor(hash3(ci,23,4)*4), 0.72); fanal(G, a.x, y, a.z); }
  } else if(moble === 'arbre' && !sotaVolta){     // arbre de plaça
    arbre(G, c.x, y, c.z, 0.95, ci);
    OBST.set(ci, -1);                             // la gent hi passa pel costat
  }
}

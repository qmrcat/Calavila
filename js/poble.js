/* Cala · estat del poble, anàlisi i construcció de la malla */

/* ---------- 5. Estat i construcció del poble ---------- */

let cells = [], heights = [], carrer = [], nivell = [], forcat = [], tint = [], seed = 1234;
let pont = [];   // 0 = cap; 1 = pont entre les arestes 0 i 2; 2 = entre l'1 i la 3
let moll = [];   // 1 = aquest carrer és un moll de port
let mode = 'casa', colSel = -1, modeTreure = false;
let townMesh = null, pickMesh = null, faceCell = null, hoverMesh = null;
let fans = new Map(), posV = new Map(), vora = new Set();
let heff = [], base = [], span = [], esCarrer = [], nivEf = [], nvV = new Map(), tipusTorre = [];
let llumMesh = null, finestraMesh = null, haloMesh = null;
let esSorra = [], sorraDist = [], platjaA = 0;
const PLATJA_AMPLE = 0.75;   // mitja obertura del tram de platja, en radians
let gridMesh = null, mostraGrid = true, spanTop = [];
let autoPlaces = true;   // els buits envoltats de cases es pavimenten sols

function indexarGraella(){
  fans = new Map(); posV = new Map(); vora = new Set();
  const comptes = new Map();
  const clau = (a,b) => a<b ? a+'_'+b : b+'_'+a;
  cells.forEach((c,ci)=>{
    for(let k=0;k<4;k++){
      const v = c.vi[k];
      let l = fans.get(v); if(!l){ l = []; fans.set(v, l); }
      l.push(ci);
      posV.set(v, c.p[k]);
      const e = clau(v, c.vi[(k+1)%4]);
      comptes.set(e, (comptes.get(e)||0) + 1);
    }
  });
  cells.forEach(c=>{
    for(let k=0;k<4;k++){
      const a = c.vi[k], b = c.vi[(k+1)%4];
      if(comptes.get(clau(a,b)) === 1){ vora.add(a); vora.add(b); }   // aresta de costa
    }
  });
}

function analitzar(){
  const n = cells.length;
  heff = new Array(n).fill(0);
  base = new Array(n).fill(0);
  span = new Array(n).fill(false);
  spanTop = new Array(n).fill(0);
  esCarrer = new Array(n).fill(false);

  for(let ci=0; ci<n; ci++){
    if(heights[ci] > 0 || pont[ci]) continue;
    let veins = 0;
    for(const v of cells[ci].nb) if(v >= 0 && heights[v] > 0) veins++;
    if(carrer[ci] || (autoPlaces && veins >= 3)) esCarrer[ci] = true;
  }

  for(let ci=0; ci<n; ci++){
    if(heights[ci] > 0 || pont[ci]) continue;
    // soles, les voltes només es fan sobre carrers: així els canals queden oberts
    if(!forcat[ci] && !esCarrer[ci]) continue;
    const nb = cells[ci].nb.map(v => v >= 0 ? heights[v] : 0);
    let L = Infinity;
    for(let e=0;e<2;e++){
      const a = nb[e], b = nb[e+2];
      if(a < 2 || b < 2) continue;                 // cal casa a banda i banda
      const m = Math.min(a,b);
      // a mà n'hi ha prou amb dos pisos; sol, com més altes més probable
      const prob = forcat[ci] ? 1 : m >= 5 ? 1 : m >= 4 ? 0.40 : 0.22;
      if(hash3(ci,7,13) < prob) L = Math.min(L, a, b);
    }
    if(L !== Infinity){ span[ci] = true; spanTop[ci] = L; }
  }

  // sota una volta i al seu voltant el carrer es queda a nivell zero:
  // una escala d'un pis sencer travessaria la volta
  nivEf = nivell.slice();
  for(let ci=0; ci<n; ci++){
    if(!span[ci]) continue;
    nivEf[ci] = 0;
    for(const v of cells[ci].nb) if(v >= 0) nivEf[v] = 0;
  }

  // una casa arrenca del nivell del terreny que hi ha sota, no de zero
  for(let ci=0; ci<n; ci++){
    if(heights[ci] <= 0) continue;
    base[ci] = nivEf[ci];
    heff[ci] = base[ci] + heights[ci];
  }
  for(let ci=0; ci<n; ci++) if(span[ci]) heff[ci] = spanTop[ci];

  // torres: cel·les altes i soles, amb tots els veïns com a mínim dos pisos més baixos
  tipusTorre = new Array(n).fill(null);
  for(let ci=0; ci<n; ci++){
    if(heights[ci] <= 0 || heff[ci] < 4) continue;
    if(cells[ci].nb.every(b => b < 0 || heff[b] <= heff[ci] - 2))
      tipusTorre[ci] = hash3(ci,31,7) < 0.5 ? 'campanar' : 'guaita';
  }

  // platja: distància (en cel·les) a allò construït, fins a 2
  esSorra = new Array(n).fill(false);
  sorraDist = new Array(n).fill(-1);
  const cua = [];
  for(let ci=0; ci<n; ci++) if(heff[ci] > 0 || esCarrer[ci]){ sorraDist[ci] = 0; cua.push(ci); }
  for(let i=0; i<cua.length; i++){
    const a = cua[i];
    if(sorraDist[a] >= 2) continue;
    for(const b of cells[a].nb) if(b >= 0 && sorraDist[b] < 0){ sorraDist[b] = sorraDist[a] + 1; cua.push(b); }
  }
  for(let ci=0; ci<n; ci++){
    if(sorraDist[ci] < 1 || pont[ci] || esCanal(ci)) continue;   // els canals no s'omplen d'arena
    const c = cells[ci].c;
    const da = Math.abs((((Math.atan2(c.z, c.x) - platjaA) % 6.283) + 9.425) % 6.283 - 3.1416);
    if(da < PLATJA_AMPLE) esSorra[ci] = true;
  }

  nvV = new Map();
  for(let ci=0; ci<n; ci++){
    if(!esCarrer[ci]) continue;
    for(const v of cells[ci].vi) if(!nvV.has(v)) nvV.set(v, alcadaVertex(v));
  }
}

const ocupat = (ci,L) => ci >= 0 && !(span[ci] && L === 0) && L >= base[ci] && L < heff[ci];

/* --- ponts i canals --- */
const esTerra = b => b >= 0 && (heff[b] > 0 || esCarrer[b]);
// aigua amb terra a banda i banda, enfrontades
function esCanal(ci){
  const nb = cells[ci].nb, t = b => esTerra(b) || (b >= 0 && pont[b] > 0);
  return (t(nb[0]) && t(nb[2])) || (t(nb[1]) && t(nb[3]));
}
// en quin sentit hi aniria un pont (1 o 2), o 0 si no n'hi pot anar cap.
// Cal que toqui terra o un altre pont almenys per una banda: si només en toca una, fa de moll
function eixPont(ci){
  if(heights[ci] > 0 || carrer[ci] || esCarrer[ci]) return 0;
  const nb = cells[ci].nb;
  const nota = b => esTerra(b) ? 2 : (b >= 0 && pont[b] > 0) ? 1.5 : 0;
  const a = nota(nb[0]) + nota(nb[2]), b = nota(nb[1]) + nota(nb[3]);
  if(Math.max(a, b) < 1.5) return 0;
  if(a !== b) return a > b ? 1 : 2;
  return 1;
}
// per fer volta cal la cel·la buida i dues cases de 2+ pisos EN ARESTES OPOSADES
function potVolta(ci){
  if(heights[ci] > 0) return false;
  const nb = cells[ci].nb.map(v => v >= 0 ? heights[v] : 0);
  return (nb[0] >= 2 && nb[2] >= 2) || (nb[1] >= 2 && nb[3] >= 2);
}

// fins on és massís el veí: serveix per saber quanta roca cal veure
function solTop(ci){
  if(ci < 0 || span[ci]) return -ROCA;
  if(heff[ci] > 0) return heff[ci]*ALT;
  if(esCarrer[ci]){
    let m = Infinity;
    for(const v of cells[ci].vi) m = Math.min(m, nvV.get(v) || 0);
    return m*ALT + CARRER_Y;
  }
  return -ROCA;
}

// color de façana: el triat a mà, o un de la barreja segons la cel·la
function colorParet(ci){
  const k = tint[ci];
  if(k < 0 && tipusTorre[ci] === 'guaita') return TORRE;   // les torres de defensa, de pedra vista
  return k >= 0 ? PALETA[k] : PARETS[Math.floor(hash3(ci,0,7)*PARETS.length)];
}

function alturaTop(ci){
  if(heff[ci] > 0) return heff[ci]*ALT;
  if(esCarrer[ci]){
    let m = 0;
    for(const v of cells[ci].vi) m = Math.max(m, nvV.get(v) || 0);
    return m*ALT + CARRER_Y;
  }
  if(pont[ci]) return 0.3;
  return esSorra[ci] ? 0.06 : 0.04;
}

function construirMalla(){
  analitzar();
  const G = newG();
  GL = newG(); GF = newG(); LLUMS = [];
  let nArcs = 0, nEsc = 0;

  for(let ci=0; ci<cells.length; ci++){
    const cel = cells[ci];
    const h = heff[ci];
    const via = esCarrer[ci];
    if(pont[ci]){ pontG(G, cel, ci); continue; }
    if(esSorra[ci]){ sorra(G, cel, ci); continue; }
    if(h <= 0 && !via) continue;

    const col = colorParet(ci);

    // carrer (també sota les voltes)
    let sup = null;
    if(via){
      sup = paviment(G, cel, ci);
      if(!sup.pla) nEsc++;
      else if(!moll[ci]) mobiliari(G, cel, ci, sup.y, span[ci]);   // a les escales no hi va res
      else if(esPuntaMoll(ci) && !span[ci] && hash3(ci,160,1) < 0.7) far(G, cel.c.x, sup.y, cel.c.z, ci);
      else mobiliariMoll(G, cel, ci, sup.y);
    }

    // sòcol de roca cap a l'aigua, fins al nivell del terra d'aquesta cel·la
    if(!span[ci]){
      const baix = expand(cel.p, cel.c, 1.10);
      // el terra d'aquesta cel·la: pla si és casa, per vèrtexs si és carrer
      const topV = k => (h <= 0 && via) ? nvV.get(cel.vi[k])*ALT + CARRER_Y : base[ci]*ALT;
      for(let e=0;e<4;e++){
        const f = (e+1)%4;
        const sota = solTop(cel.nb[e]);
        const tA = topV(e), tB = topV(f);
        if(sota >= Math.max(tA, tB) - 1e-6) continue;   // el veí ja tapa aquesta cara
        const mar = sota <= -ROCA + 1e-6;               // cap al mar, la roca s'eixampla
        const A = cel.p[e], B = cel.p[f];
        if(mar && moll[ci]){ paretMoll(G, A, B, tA, tB, ci, e, cel.c); continue; }   // al port, carreus
        const a = mar ? baix[e] : A, b = mar ? baix[f] : B;
        const roca = hash3(ci,e,11) < 0.5 ? ROCA_A : ROCA_B;
        quad(G, [a.x,sota,a.z], [b.x,sota,b.z], [B.x,tB,B.z], [A.x,tA,A.z], roca);
      }
    }
    if(h <= 0) continue;

    // parets, pis per pis
    const torre = tipusTorre[ci];
    for(let L=base[ci]; L<h; L++){
      if(span[ci] && L === 0){ arcada(G, cel, ci, col); nArcs++; continue; }
      const y0 = L*ALT, y1 = y0 + ALT;
      const {ext, rodo} = cantons(cel, L);
      const curva = [0,1,2,3].map(i => rodo[i] ? arcCanto(cel, i) : null);

      for(let e=0;e<4;e++){                    // trams rectes, escurçats pels cantons
        if(!ext[e]) continue;
        const S = rodo[e] ? curva[e][ARR_K] : cel.p[e];
        const T = rodo[(e+1)%4] ? curva[(e+1)%4][0] : cel.p[(e+1)%4];
        const nb = cel.nb[e];
        const viaVei = nb >= 0 && (esCarrer[nb] || pont[nb] > 0);   // un pont també és carrer
        const lv = viaVei ? (nvV.get(cel.vi[e]) || 0) : 0;
        const especial = torre === 'campanar' ? (L === h-1 ? 'campanar' : null) : torre;
        paret(G, S, T, y0, y1, col, ci, L, e, L === (viaVei ? lv : base[ci]), viaVei, especial);
      }
      const baixa = L === base[ci];
      for(let i=0;i<4;i++){                     // corbes dels cantons
        if(!rodo[i]) continue;
        const cv = curva[i], dk = baixa ? fosc(col, OMBRA) : col;
        for(let k=0;k<ARR_K;k++)
          quadV(G, [cv[k].x,y0,cv[k].z], [cv[k+1].x,y0,cv[k+1].z],
                   [cv[k+1].x,y1,cv[k+1].z], [cv[k].x,y1,cv[k].z], dk, dk, col, col);
        if(baixa && teSocol(ci) && torre !== 'guaita'){   // el sòcol també gira el cantó
          const cs = colSocol(ci, col);
          const of = cv.map(p => {
            const dx = p.x-cel.c.x, dz = p.z-cel.c.z, l = Math.hypot(dx,dz) || 1;
            return {x: p.x + dx/l*0.008, z: p.z + dz/l*0.008};
          });
          for(let k=0;k<ARR_K;k++)
            quad(G, [of[k].x,y0,of[k].z], [of[k+1].x,y0,of[k+1].z],
                    [of[k+1].x,y0+SOCOL_H,of[k+1].z], [of[k].x,y0+SOCOL_H,of[k].z], cs);
        }
      }

      const rodoDalt = (L+1 < h) ? cantons(cel, L+1).rodo : null;
      for(let i=0;i<4;i++){                     // ressalts horitzontals
        if(L === base[ci] && rodo[i]) tapaCanto(G, cel.p[i], curva[i], base[ci]*ALT, true, ROCA_A);
        if(rodoDalt){
          if(rodo[i] && !rodoDalt[i])      tapaCanto(G, cel.p[i], arcCanto(cel,i), y1, false, col);
          else if(!rodo[i] && rodoDalt[i]) tapaCanto(G, cel.p[i], arcCanto(cel,i), y1, true,  col);
        } else if(rodo[i]){
          tapaCanto(G, cel.p[i], curva[i], y1, false, col);   // sota la teulada
        }
      }
    }
  }

  cobertes(G);
  construirGrid();

  if(townMesh){ townMesh.geometry.dispose(); scene.remove(townMesh); }
  townMesh = new THREE.Mesh(toGeom(G), matPoble);
  townMesh.castShadow = true; townMesh.receiveShadow = true;
  scene.add(townMesh);

  if(llumMesh){ llumMesh.geometry.dispose(); scene.remove(llumMesh); }
  llumMesh = new THREE.Mesh(toGeom(GL), matLlum);
  scene.add(llumMesh);

  if(finestraMesh){ finestraMesh.geometry.dispose(); scene.remove(finestraMesh); }
  finestraMesh = new THREE.Mesh(toGeom(GF), matFinestra);
  scene.add(finestraMesh);

  if(haloMesh){ haloMesh.geometry.dispose(); scene.remove(haloMesh); }
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.Float32BufferAttribute(LLUMS, 3));
  haloMesh = new THREE.Points(hg, matHalo);
  haloMesh.visible = matHalo.opacity > 0.01;
  scene.add(haloMesh);

  posaAmarrats(amarres());

  // malla invisible per al picking: una columna per cel·la
  const P = newG(); faceCell = [];
  const gris = [0,0,0];
  for(let ci=0; ci<cells.length; ci++){
    const pts = cells[ci].p, top = Math.max(alturaTop(ci), 0.04);
    for(let e=0;e<4;e++){
      const A = pts[e], B = pts[(e+1)%4];
      quad(P, [A.x,-0.4,A.z], [B.x,-0.4,B.z], [B.x,top,B.z], [A.x,top,A.z], gris);
      faceCell.push(ci,ci);
    }
    quad(P, [pts[0].x,top,pts[0].z], [pts[1].x,top,pts[1].z], [pts[2].x,top,pts[2].z], [pts[3].x,top,pts[3].z], gris);
    faceCell.push(ci,ci);
  }
  if(pickMesh){ pickMesh.geometry.dispose(); scene.remove(pickMesh); }
  pickMesh = new THREE.Mesh(toGeom(P), matPick);
  pickMesh.renderOrder = -1;
  scene.add(pickMesh);
  redibuixa();

  document.getElementById('n-cases').textContent = heights.filter(h => h > 0).length;
  document.getElementById('n-arcs').textContent  = nArcs;
  document.getElementById('n-esc').textContent   = nEsc;
}

/* --- contorn de les cel·les buides, dibuixat sobre l'aigua --- */
function construirGrid(){
  const pos = [], vistes = new Set(), y = 0.012;
  for(let ci=0; ci<cells.length; ci++){
    if(heff[ci] > 0 || esCarrer[ci] || esSorra[ci] || pont[ci]) continue;   // només on encara hi ha mar
    const c = cells[ci];
    for(let e=0;e<4;e++){
      const a = c.vi[e], b = c.vi[(e+1)%4];
      const k = a < b ? a+'_'+b : b+'_'+a;
      if(vistes.has(k)) continue;                   // cada aresta, un sol cop
      vistes.add(k);
      const A = c.p[e], B = c.p[(e+1)%4];
      pos.push(A.x, y, A.z, B.x, y, B.z);
    }
  }
  if(gridMesh){ gridMesh.geometry.dispose(); scene.remove(gridMesh); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  gridMesh = new THREE.LineSegments(g, matGrid);
  gridMesh.visible = mostraGrid;
  scene.add(gridMesh);
}

function novaCala(s){
  seed = s;
  cells = construirCala(seed, MIDA_CALA);
  indexarGraella();
  decorarCala();
  heights = new Array(cells.length).fill(0);
  carrer  = new Array(cells.length).fill(false);
  nivell  = new Array(cells.length).fill(0);
  forcat  = new Array(cells.length).fill(false);
  pont    = new Array(cells.length).fill(0);
  moll    = new Array(cells.length).fill(0);
  tint    = new Array(cells.length).fill(-1);   // -1 = automàtic
}

// la llavor del poble va a part de la de la cala: `seed` ha de ser sempre
// la que ha fet la quadrícula, perquè és la que es desa a la partida
function generarPoble(llavor = seed + 991){
  heights.fill(0); carrer.fill(false); nivell.fill(0); forcat.fill(false); tint.fill(-1); pont.fill(0); moll.fill(0);
  const rnd = mulberry32(llavor);
  let inici = 0, millor = Infinity;
  cells.forEach((c,i)=>{ const d = Math.hypot(c.c.x, c.c.z); if(d < millor){ millor = d; inici = i; } });

  // 1) creix la taca de cases
  const cua = [inici], vist = new Set([inici]);
  const objectiu = 90 + Math.floor(rnd()*55);
  let n = 0;
  while(cua.length && n < objectiu){
    const ci = cua.shift();
    const d = Math.hypot(cells[ci].c.x, cells[ci].c.z);
    heights[ci] = Math.min(6, Math.max(1, Math.round(4.6 - d*0.24 + (rnd()-0.5)*2.4)));
    n++;
    const nb = shuffle(cells[ci].nb.slice(), rnd);
    for(const v of nb) if(v >= 0 && !vist.has(v) && rnd() < 0.8){ vist.add(v); cua.push(v); }
  }

  // 2) s'hi obren carrerons rectes
  const ocupades = [];
  heights.forEach((h,i)=>{ if(h > 0) ocupades.push(i); });
  if(!ocupades.length) return;
  const nCamins = 2 + Math.floor(rnd()*3);
  for(let w=0; w<nCamins; w++){
    let ci = ocupades[Math.floor(rnd()*ocupades.length)];
    let dir = Math.floor(rnd()*4);
    let passos = 12 + Math.floor(rnd()*14);
    while(passos-- > 0){
      heights[ci] = 0; carrer[ci] = true;
      const dins = v => v >= 0 && (heights[v] > 0 || carrer[v]);
      const opcions = [dir, (dir+1)%4, (dir+3)%4].filter(e => dins(cells[ci].nb[e]));
      if(!opcions.length) break;
      const e = (opcions[0] === dir && rnd() < 0.82) ? dir : opcions[Math.floor(rnd()*opcions.length)];
      const seg = cells[ci].nb[e];
      dir = (cells[seg].nb.indexOf(ci) + 2) % 4;
      ci = seg;
    }
  }
  for(let i=0;i<cells.length;i++)
    if(carrer[i] && !cells[i].nb.some(v => v >= 0 && heights[v] > 0)) carrer[i] = false;

  // 3) una placeta enlairada: les cel·les del voltant es tornen escales soles
  const vies = [];
  carrer.forEach((v,i)=>{ if(v) vies.push(i); });
  if(vies.length > 8){
    const q = [vies[Math.floor(rnd()*vies.length)]], vist2 = new Set(q);
    let m = 3 + Math.floor(rnd()*4);
    while(q.length && m > 0){
      const a = q.shift(); nivell[a] = 1; m--;
      for(const b of cells[a].nb)
        if(b >= 0 && carrer[b] && !vist2.has(b)){ vist2.add(b); q.push(b); }
    }
  }
}

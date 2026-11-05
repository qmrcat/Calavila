/* Cala · estat del poble, anàlisi i construcció de la malla */

/* ---------- 5. Estat i construcció del poble ---------- */

let cells = [], heights = [], carrer = [], nivell = [], forcat = [], tint = [], seed = 1234;
let pont = [];   // 0 = cap; 1 = pont entre les arestes 0 i 2; 2 = entre l'1 i la 3
let moll = [];   // 1 = aquest carrer és un moll de port
let escales = []; // escala posada a mà: l'aresta cap on puja + 1 (0 = cap)
let fars = [];   // 1 = un far posat a mà (sobre l'aigua fa un illot; sobre un carrer, hi va dret)
let roca = [];   // 1 = el terreny d'aquesta cel·la és roca de muntanya, no paviment
let mercat = []; // 1 = una parada del mercat de Nadal (només es veu amb els guarniments)
let bar = [];    // 1 = la planta baixa de la casa és un bar; 2, un restaurant
let porxo = [];  // 1 = la planta baixa de la casa és un porxo obert, amb arcs
let platja = []; // 0 = cap; 1 = arena; 2 i més, què hi ha a sobre (vegeu ELEMENTS_PLATJA)
let teulada = []; // 0 = la tria el poble; 1 i més, la triada a mà en mode Teulades (vegeu ESTILS)
let mode = 'casa', colSel = -1, modeTreure = false;
let townMesh = null, pickMesh = null, faceCell = null, hoverMesh = null;
let fans = new Map(), posV = new Map(), vora = new Set();
let heff = [], base = [], span = [], esCarrer = [], nivEf = [], tipusTorre = [];
let nvC = [], escalaE = [], terratForcat = [];   // nivell de cada cantó dels carrers; aresta per on puja l'escala (-1 si és pla)
let llumMesh = null, finestraMesh = null, haloMesh = null;
let esSorra = [], platjaA = 0;
const PLATJA_AMPLE = 0.75;   // mitja obertura del tram de platja del poble nou, en radians
let gridMesh = null, mostraGrid = true, spanTop = [];
let voltaDe = [];   // la casa on s'aguanta cada volta (n'agafa el color), o -1
let PILARS = new Set();   // vèrtexs on ja hi ha un pilar de porxo
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
  voltaDe = new Array(n).fill(-1);
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
    if(!forcat[ci] && (!esCarrer[ci] || roca[ci])) continue;   // ni sobre la roca
    const nb = cells[ci].nb.map(v => v >= 0 ? heights[v] : 0);
    let L = Infinity, vei = -1;
    for(let e=0;e<2;e++){
      const a = nb[e], b = nb[e+2];
      if(a < 2 || b < 2) continue;                 // cal casa a banda i banda
      const m = Math.min(a,b);
      // a mà n'hi ha prou amb dos pisos; sol, com més altes més probable
      const prob = forcat[ci] ? 1 : m >= 5 ? 1 : m >= 4 ? 0.40 : 0.22;
      // la volta s'aguanta sobre la casa més baixa de les dues, i en pren el color
      if(hash3(ci,7,13) < prob && m < L){ L = m; vei = cells[ci].nb[a <= b ? e : e+2]; }
    }
    if(L !== Infinity){ span[ci] = true; spanTop[ci] = L; voltaDe[ci] = vei; }
  }

  // cases amb porxo: la planta baixa és oberta i s'hi passa per sota com per un carrer.
  // Es tracten com una volta que ja té la casa a sobre, al nivell del terreny on és
  for(let ci=0; ci<n; ci++) if(porxo[ci] && heights[ci] >= 2 && !pont[ci]){ span[ci] = true; esCarrer[ci] = true; }

  // sota una volta i al seu voltant el carrer es queda a nivell zero:
  // una escala d'un pis sencer travessaria la volta
  nivEf = nivell.slice();
  for(let ci=0; ci<n; ci++){
    if(!span[ci] || heights[ci] > 0) continue;   // el porxo es queda al seu nivell
    nivEf[ci] = 0;
    for(const v of cells[ci].nb) if(v >= 0) nivEf[v] = 0;
  }

  // una casa arrenca del nivell del terreny que hi ha sota, no de zero
  for(let ci=0; ci<n; ci++){
    if(heights[ci] <= 0) continue;
    base[ci] = nivEf[ci];
    heff[ci] = base[ci] + heights[ci];
  }
  for(let ci=0; ci<n; ci++) if(span[ci] && !heights[ci]) heff[ci] = spanTop[ci];

  // torres: cel·les altes i soles, amb tots els veïns com a mínim dos pisos més baixos
  tipusTorre = new Array(n).fill(null);
  for(let ci=0; ci<n; ci++){
    if(heights[ci] <= 0 || heff[ci] < 4 || escales[ci] || span[ci]) continue;   // amb una escala a sobre, o un porxo, no és torre
    if(cells[ci].nb.every(b => b < 0 || heff[b] <= heff[ci] - 2))
      tipusTorre[ci] = hash3(ci,31,7) < 0.5 ? 'campanar' : 'guaita';
  }

  // platja: la feta a mà, mentre no hi hagi res a sobre (un carrer, una casa, un pont o un far la tapen)
  esSorra = new Array(n).fill(false);
  for(let ci=0; ci<n; ci++)
    esSorra[ci] = platja[ci] > 0 && heff[ci] <= 0 && !esCarrer[ci] && !pont[ci] && !fars[ci];

  calculaEscales();
  calculaMuntanya();
}

// a la planta baixa d'una volta o d'un porxo no hi ha res: s'hi passa
const ocupat = (ci,L) => ci >= 0 && !(span[ci] && L === base[ci]) && L >= base[ci] && L < heff[ci];

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
/* --- fars posats a mà --- */
// un far sobre l'aigua, sense carrer ni casa: s'aguanta damunt d'un illot de roca
const esIllot = ci => fars[ci] > 0 && heights[ci] === 0 && !esCarrer[ci] && !pont[ci];
// un carrer és pla si no és una escala
const carrerPla = ci => escalaE[ci] < 0;
// es pot posar un far aquí? a l'aigua, o en un carrer, una plaça o un moll plans i sense volta
function potFar(ci){
  if(heights[ci] > 0 || pont[ci] || span[ci] || molins[ci]) return false;
  return !esCarrer[ci] || carrerPla(ci);
}
// Fanals: n'hi pot haver en un carrer, un moll o un pont. Perquè no en surtin mai dos de tocar
// (tampoc per un cantó), d'entre els veïns que en voldrien un, només el té la cel·la d'índex més baix.
// volFanal() ha de seguir les mateixes condicions que mobiliari(), mobiliariMoll() i pontG()
let fanals = new Set();
function volFanal(ci){
  if(pont[ci]) return hash3(ci,97,1) < 0.5;
  if(!esCarrer[ci] || escalaE[ci] >= 0 || muntSup[ci] || (fars[ci] && !span[ci]) || esMercat(ci) || terrassaDe.has(ci) || (nadal && arbreNadalAqui(ci)) || gegantsAqui(ci)) return false;
  if(!moll[ci]){ const h = hash3(ci,21,3); return !span[ci] && h >= 0.31 && h < 0.43; }
  if(esPuntaMoll(ci) && !span[ci] && hash3(ci,160,1) < 0.7) return false;
  const h = hash3(ci,150,1); return h >= 0.44 && h < 0.58;
}
function triaFanals(){
  const vol = cells.map((c, ci) => volFanal(ci));
  fanals = new Set();
  for(let ci=0; ci<cells.length; ci++){
    if(!vol[ci]) continue;
    if(!cells[ci].vi.some(v => fans.get(v).some(b => b < ci && vol[b]))) fanals.add(ci);
  }
}
// es pot fer roca aquí (o alçar la que hi ha)? no sota una casa, un pont ni una volta
const potRoca = ci => heights[ci] === 0 && !pont[ci] && !span[ci] && !forcat[ci] && !(roca[ci] && carrer[ci] && nivell[ci] >= NIV_MAX);
// per fer volta cal la cel·la buida i dues cases de 2+ pisos EN ARESTES OPOSADES
function potVolta(ci){
  if(heights[ci] > 0) return false;
  const nb = cells[ci].nb.map(v => v >= 0 ? heights[v] : 0);
  return (nb[0] >= 2 && nb[2] >= 2) || (nb[1] >= 2 && nb[3] >= 2);
}
// sobre els arcs (d'una volta o d'un porxo) els cantons són vius: si no, els arcs, que arriben fins
// al vèrtex, sobresortirien per sota dels cantons arrodonits
function cantonsCasa(ci, L){
  const c = cantons(cells[ci], L);
  if(span[ci]) c.rodo = [false, false, false, false];
  return c;
}
// una casa de dos pisos o més pot tenir la planta baixa porxada, sola o al costat d'altres
const potPorxo = ci => ci >= 0 && heights[ci] >= 2 && !pont[ci];
// el color de façana que compta per ajuntar teulades: una volta sense pintar fa el de la seva casa
const tintEf = ci => tint[ci] < 0 && voltaDe[ci] >= 0 ? tint[voltaDe[ci]] : tint[ci];

// fins on és massís el veí: serveix per saber quanta roca cal veure
function solTop(ci){
  if(ci < 0 || span[ci]) return -ROCA;
  if(heff[ci] > 0) return heff[ci]*ALT;
  if(muntSup[ci]) return baixMunt(ci);
  if(esCarrer[ci]){
    return Math.min(...nvC[ci])*ALT + CARRER_Y;
  }
  return -ROCA;
}

// color de façana: el triat a mà, o un de la barreja segons la cel·la
function colorParet(ci){
  const k = tint[ci];
  if(k < 0 && voltaDe[ci] >= 0) return colorParet(voltaDe[ci]);   // la volta, del color de la casa on s'aguanta
  if(k < 0 && tipusTorre[ci] === 'guaita') return TORRE;   // les torres de defensa, de pedra vista
  return k >= 0 ? PALETA[k] : PARETS[Math.floor(hash3(ci,0,7)*PARETS.length)];
}

function alturaTop(ci){
  if(heff[ci] > 0) return (heff[ci] + (escalaE[ci] >= 0 ? 1 : 0))*ALT;
  if(muntSup[ci]) return altMunt(ci);
  if(esCarrer[ci]){
    return Math.max(...nvC[ci])*ALT + CARRER_Y;
  }
  if(pont[ci]) return 0.3;
  if(esIllot(ci)) return ILLOT_Y;
  if(esMoliMar(ci)) return 0.34;                // la plataforma de l'aerogenerador
  return esSorra[ci] ? 0.06 : 0.04;
}

function construirMalla(){
  analitzar();
  triaBars();
  if(nadal) triaArbresNadal();
  if(ambGegants) triaGegants();
  triaFanals();
  const G = newG();
  GL = newG(); GF = newG(); LLUMS = []; PILARS = new Set(); LLOCS_DIADA = new Map(); ROTORS = []; LLUMS_MOLI = [];
  let nArcs = 0, nEsc = 0;

  for(let ci=0; ci<cells.length; ci++){
    const cel = cells[ci];
    const h = heff[ci];
    const via = esCarrer[ci];
    if(pont[ci]){ pontG(G, cel, ci); continue; }
    if(esIllot(ci)){ illot(G, cel, ci); continue; }
    if(esMoliMar(ci)){ moliMar(G, cel, ci); continue; }   // un aerogenerador a la mar
    if(esSorra[ci]){ sorra(G, cel, ci); continue; }
    if(h <= 0 && !via) continue;

    const col = colorParet(ci);

    // carrer (també sota les voltes)
    let sup = null;
    const munt = !!muntSup[ci];
    if(munt) muntanya(G, cel, ci);                // roca: relleu, vegetació i, si n'hi ha, el far
    else if(via){
      sup = paviment(G, cel, ci);
      if(!sup.pla) nEsc++;
      else if(fars[ci] && !span[ci]) far(G, cel.c.x, sup.y, cel.c.z, ci);   // el far posat a mà, al lloc dels estris
      else if(esMercat(ci)){ parada(G, cel, ci, sup.y); llumsMercat(G, cel, ci, sup.y); }   // mercat de Nadal
      else if(terrassaDe.has(ci)) terrassa(G, cel, ci, sup.y);   // la terrassa d'un bar o restaurant
      else if(nadal && arbreNadalAqui(ci)) arbreNadal(G, cel.c.x, sup.y, cel.c.z, ci);   // per Nadal, al lloc dels estris
      else if(gegantsAqui(ci)) gegants(G, cel, ci, sup.y);   // per la Festa Major, els gegants a la plaça
      else if(!moll[ci]) mobiliari(G, cel, ci, sup.y, span[ci]);   // a les escales no hi va res
      else if(esPuntaMoll(ci) && !span[ci] && hash3(ci,160,1) < 0.7) far(G, cel.c.x, sup.y, cel.c.z, ci);
      else mobiliariMoll(G, cel, ci, sup.y);
    }

    // sòcol de roca cap a l'aigua, fins al nivell del terra d'aquesta cel·la
    if(!span[ci] || heights[ci] > 0){              // sota un porxo, també
      const baix = expand(cel.p, cel.c, 1.10);
      // el terra d'aquesta cel·la: pla si és casa, per vèrtexs si és carrer (o porxo)
      const topV = k => munt ? cantoMunt(ci, k) : ((h <= 0 || span[ci]) && via) ? nvC[ci][k]*ALT + CARRER_Y : base[ci]*ALT;
      for(let e=0;e<4;e++){
        const f = (e+1)%4;
        if(munt && esMunt(cel.nb[e])) continue;        // dues roques fan un sol pendent
        const sota = solTop(cel.nb[e]);
        const tA = topV(e), tB = topV(f);
        if(sota >= Math.max(tA, tB) - 1e-6) continue;   // el veí ja tapa aquesta cara
        const mar = sota <= -ROCA + 1e-6;               // cap al mar, la roca s'eixampla
        const A = cel.p[e], B = cel.p[f];
        if(mar && moll[ci]){ paretMoll(G, A, B, tA, tB, ci, e, cel.c); continue; }   // al port, carreus
        const a = mar ? baix[e] : A, b = mar ? baix[f] : B;
        if(munt){ cingle(G, a, b, A, B, sota, tA, tB, ci, e); continue; }
        const pedra = hash3(ci,e,11) < 0.5 ? ROCA_A : ROCA_B;
        quad(G, [a.x,Math.min(sota,tA),a.z], [b.x,Math.min(sota,tB),b.z], [B.x,tB,B.z], [A.x,tA,A.z], pedra);
      }
    }
    if(nadal && via && !munt && h <= 0) llumsCarrer(G, cel, ci);   // llums de Nadal d'una façana a l'altra
    if(festa && via && !munt && h <= 0) banderetesCarrer(G, cel, ci);   // i banderetes de Festa Major
    if(h <= 0) continue;

    // parets, pis per pis
    const torre = tipusTorre[ci];
    for(let L=base[ci]; L<h; L++){
      if(span[ci] && L === base[ci]){ arcada(G, cel, ci, col, L); nArcs++; continue; }
      const y0 = L*ALT, y1 = y0 + ALT;
      const {ext, rodo} = cantonsCasa(ci, L);
      const curva = [0,1,2,3].map(i => rodo[i] ? arcCanto(cel, i) : null);

      for(let e=0;e<4;e++){                    // trams rectes, escurçats pels cantons
        if(!ext[e]) continue;
        const S = rodo[e] ? curva[e][ARR_K] : cel.p[e];
        const T = rodo[(e+1)%4] ? curva[(e+1)%4][0] : cel.p[(e+1)%4];
        const nb = cel.nb[e];
        const viaVei = nb >= 0 && ((esCarrer[nb] && !esMunt(nb)) || pont[nb] > 0);   // un pont també és carrer; la roca, no
        const lv = viaVei ? nivellAresta(nb, ci) : 0;
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

      const rodoDalt = (L+1 < h) ? cantonsCasa(ci, L+1).rodo : null;
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

    if(nadal && !span[ci] && casaGuarnida(ci)) garlandaCasa(G, cel, ci, h);   // garlanda de Nadal
    if(barFront.has(ci)) facanaBarG(G, cel, ci);                // bar o restaurant a la planta baixa

    // escala a sobre de la casa: arrenca del terrat i puja un nivell
    if(escalaE[ci] >= 0){
      const y0 = h*ALT;
      for(let k=0;k<4;k++){                     // on el veí és més baix, la façana puja fins als graons
        const tA = nvC[ci][k]*ALT, tB = nvC[ci][(k+1)%4]*ALT;
        const sota = Math.max(y0, solTop(cel.nb[k]));
        if(sota >= Math.max(tA, tB) - 1e-6) continue;
        const A = cel.p[k], B = cel.p[(k+1)%4];
        quad(G, [A.x,sota,A.z], [B.x,sota,B.z], [B.x,Math.max(sota,tB),B.z], [A.x,Math.max(sota,tA),A.z], col);
      }
      escala(G, cel, ci, escalaE[ci], y0, y0 + ALT);
      nEsc++;
    }
  }

  cobertes(G);
  if(diada) banderesDiada();                    // senyeres i estelades, quan tots els llocs són apuntats
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
  posaRotors();                                 // les pales dels aerogeneradors, que giren

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
    if(heff[ci] > 0 || esCarrer[ci] || esSorra[ci] || pont[ci] || fars[ci] || esMoliMar(ci)) continue;   // només on encara hi ha mar
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

function novaCala(s, mida = midaCala){
  seed = s;
  midaCala = mida;
  cells = construirCala(seed, MIDES[midaCala]);
  indexarGraella();
  decorarCala();
  ajustaMida();
  heights = new Array(cells.length).fill(0);
  carrer  = new Array(cells.length).fill(false);
  nivell  = new Array(cells.length).fill(0);
  forcat  = new Array(cells.length).fill(false);
  pont    = new Array(cells.length).fill(0);
  moll    = new Array(cells.length).fill(0);
  fars    = new Array(cells.length).fill(0);
  escales  = new Array(cells.length).fill(0);
  roca    = new Array(cells.length).fill(0);
  mercat  = new Array(cells.length).fill(0);
  bar     = new Array(cells.length).fill(0);
  porxo   = new Array(cells.length).fill(0);
  platja  = new Array(cells.length).fill(0);
  teulada = new Array(cells.length).fill(0);
  molins  = new Array(cells.length).fill(0);
  solar   = new Array(cells.length).fill(0);
  tint    = new Array(cells.length).fill(-1);   // -1 = automàtic
}

// la llavor del poble va a part de la de la cala: `seed` ha de ser sempre
// la que ha fet la quadrícula, perquè és la que es desa a la partida
function generarPoble(llavor = seed + 991){
  heights.fill(0); carrer.fill(false); nivell.fill(0); forcat.fill(false); tint.fill(-1); pont.fill(0); moll.fill(0); fars.fill(0); escales.fill(0); roca.fill(0); mercat.fill(0); bar.fill(0); porxo.fill(0); platja.fill(0); teulada.fill(0); molins.fill(0); solar.fill(0);
  const rnd = mulberry32(llavor);
  let inici = 0, millor = Infinity;
  cells.forEach((c,i)=>{ const d = Math.hypot(c.c.x, c.c.z); if(d < millor){ millor = d; inici = i; } });

  // En una cala més gran, el poble també ho és, en proporció: el radi creix com k i,
  // per tant, el nombre de cases com k² (k = 1 a la mida normal: el poble de sempre).
  // Els carrerons creixen en nombre i en llargada (k·k), i així també van amb l'àrea
  const k = MIDES[midaCala] / MIDES.normal;

  // 1) creix la taca de cases
  const cua = [inici], vist = new Set([inici]);
  const objectiu = Math.round((90 + Math.floor(rnd()*55)) * k * k);
  let n = 0;
  while(cua.length && n < objectiu){
    const ci = cua.shift();
    const d = Math.hypot(cells[ci].c.x, cells[ci].c.z) / k;
    heights[ci] = Math.min(6, Math.max(1, Math.round(4.6 - d*0.24 + (rnd()-0.5)*2.4)));
    n++;
    const nb = shuffle(cells[ci].nb.slice(), rnd);
    for(const v of nb) if(v >= 0 && !vist.has(v) && rnd() < 0.8){ vist.add(v); cua.push(v); }
  }

  // 2) s'hi obren carrerons rectes
  const ocupades = [];
  heights.forEach((h,i)=>{ if(h > 0) ocupades.push(i); });
  if(!ocupades.length) return;
  const nCamins = Math.round((2 + Math.floor(rnd()*3)) * k);
  for(let w=0; w<nCamins; w++){
    let ci = ocupades[Math.floor(rnd()*ocupades.length)];
    let dir = Math.floor(rnd()*4);
    let passos = Math.round((12 + Math.floor(rnd()*14)) * k);
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

  // 3) una placeta enlairada, amb una escala per on s'hi puja. Es busca un tram recte
  // de carrer O-S-P: P s'enlaira (i la placeta creix a partir d'aquí), S es torna l'escala
  // i O, que es queda pla a baix, és per on s'hi arriba
  const vies = [];
  carrer.forEach((v,i)=>{ if(v) vies.push(i); });
  if(vies.length > 8){
    const trams = [];
    for(const s of vies) for(let e=0;e<2;e++){
      const a = cells[s].nb[e], b = cells[s].nb[e+2];
      if(a >= 0 && b >= 0 && carrer[a] && carrer[b]) trams.push([a, s, b], [b, s, a]);
    }
    // una volta al costat deixaria el carrer a nivell zero: es proven uns quants trams
    // i es queda el primer on l'escala surt de debò
    const m0 = 3 + Math.floor(rnd()*4);
    for(let intent=0; intent<10 && trams.length; intent++){
      const [O, S, P] = trams.splice(Math.floor(rnd()*trams.length), 1)[0];
      const fora = new Set([O, S, ...cells[O].nb]);     // ni l'escala ni el replà de baix no s'enlairen
      const q = [P], vist2 = new Set(q), alcats = [];
      let m = m0;
      while(q.length && m > 0){
        const a = q.shift(); nivell[a] = 1; alcats.push(a); m--;
        for(const b of cells[a].nb)
          if(b >= 0 && carrer[b] && !vist2.has(b) && !fora.has(b)){ vist2.add(b); q.push(b); }
      }
      escales[S] = cells[S].nb.indexOf(P) + 1;          // l'escala, de S cap a P
      analitzar();
      if(escalaE[S] >= 0 && nivEf[P] === 1 && nivEf[O] === 0) break;
      for(const a of alcats) nivell[a] = 0;
      escales[S] = 0;
    }
  }

  // 4) com les fetes a mà, les cases s'aixequen sobre terreny: si es treuen pis a pis, hi queda
  for(let i=0;i<cells.length;i++) if(heights[i] > 0) carrer[i] = true;

  // 5) un turó de roca a tocar del poble, a l'altra banda de la platja, amb un mas al cim
  // de vegades. Creix sobre l'aigua, sense tocar cap casa ni cap carrer, i com més endins, més alt
  const aigua = i => i >= 0 && !heights[i] && !carrer[i] && !vora.has(cells[i].vi[0])
                  && cells[i].nb.filter(b => b >= 0 && heights[b] > 0).length < 2;   // no es menja cap plaça
  const llavors = [];
  for(let i=0;i<cells.length;i++)
    if(aigua(i) && cells[i].nb.some(b => b >= 0 && carrer[b])) llavors.push(i);
  if(llavors.length){
    const lluny = i => { const c = cells[i].c; return Math.abs((((Math.atan2(c.z, c.x) - platjaA) % 6.283) + 9.425) % 6.283 - 3.1416); };
    llavors.sort((a, b) => lluny(b) - lluny(a));
    const t0 = llavors[Math.floor(rnd()*Math.min(4, llavors.length))];
    const turo = [t0], dins = new Set(turo);
    const mida = Math.round((14 + Math.floor(rnd()*10)) * k * k);
    for(let i=0; i<turo.length && turo.length < mida; i++)
      for(const b of shuffle(cells[turo[i]].nb.slice(), rnd))
        if(aigua(b) && !dins.has(b) && rnd() < 0.75 && turo.length < mida){ dins.add(b); turo.push(b); }
    // nivell: la distància a la vora del turó, fins a 3
    const dist = new Map(), cua2 = [];
    for(const a of turo) if(cells[a].nb.some(b => !dins.has(b))){ dist.set(a, 0); cua2.push(a); }
    for(let i=0;i<cua2.length;i++)
      for(const b of cells[cua2[i]].nb)
        if(dins.has(b) && !dist.has(b)){ dist.set(b, dist.get(cua2[i]) + 1); cua2.push(b); }
    let cim = t0;
    for(const a of turo){
      carrer[a] = true; roca[a] = 1;
      nivell[a] = Math.min(3, dist.get(a) || 0);
      if(nivell[a] > nivell[cim]) cim = a;
    }
    if(nivell[cim] > 0 && rnd() < 0.6) heights[cim] = 1 + Math.floor(rnd()*2);   // el mas
  }

  // 6) la platja, en un tram de costa, amb para-sols i alguna barca: després ja es fa a mà
  platjaAuto();
}

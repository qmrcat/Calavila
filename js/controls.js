/* Cala · ressaltat, càmera, ratolí i tàctil, botons i teclat */

// ressaltat de la cel·la sota el cursor
hoverMesh = new THREE.Mesh(
  new THREE.BufferGeometry(),
  new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.32, depthTest:false})
);
hoverMesh.renderOrder = 5;
hoverMesh.visible = false;
scene.add(hoverMesh);

let hoverCi = -1, majPremuda = false;
function marcarHover(ci){
  hoverCi = ci;
  redibuixa();
  if(ci < 0){ hoverMesh.visible = false; return; }
  const treu = modeTreure || majPremuda;
  // en els modes que tenen condicions, verd si es pot i vermell si no
  const valid = mode === 'volta' ? potVolta(ci) : mode === 'pont' ? (pont[ci] > 0 || eixPont(ci) > 0)
              : mode === 'moll' ? (moll[ci] > 0 || potMoll(ci)) : null;
  hoverMesh.material.color.setHex(treu ? 0xd4704f : valid === null ? 0xffffff : valid ? 0x6fd39a : 0xd4704f);
  hoverMesh.material.opacity = (valid !== null || treu) ? 0.5 : 0.32;
  const cel = cells[ci];
  const y = Math.max(alturaTop(ci), 0.02) + 0.012;
  const G = newG();
  const p = expand(cel.p, cel.c, 0.94);
  quad(G, [p[0].x,y,p[0].z], [p[1].x,y,p[1].z], [p[2].x,y,p[2].z], [p[3].x,y,p[3].z], [1,1,1]);
  hoverMesh.geometry.dispose();
  hoverMesh.geometry = toGeom(G);
  hoverMesh.visible = true;
}

/* ---------- 7. Càmera orbital ---------- */

// distància per veure el poble sencer: més lluny com més gran és la cala,
// i en pantalla vertical (mòbil) també, perquè hi càpiga
const distInicial = () => 25 * escalaVista() * Math.max(1, Math.min(1.7, 1.1*innerHeight/innerWidth));
let az = 0.7, el = 0.62, dist = distInicial();
const centre = new THREE.Vector3(0, 1.4, 0);
function actualitzarCamera(){
  el = Math.max(0.12, Math.min(1.45, el));
  dist = Math.max(8, Math.min(70*escalaVista(), dist));
  camera.position.set(
    centre.x + dist*Math.cos(el)*Math.sin(az),
    centre.y + dist*Math.sin(el),
    centre.z + dist*Math.cos(el)*Math.cos(az)
  );
  camera.lookAt(centre);
  posaCel();
  ajustaBoira();
  redibuixa();
}

// desplaçament horitzontal del punt d'interès, en el pla del terra
function desplaca(dx, dy){
  const k = dist*0.0018;
  const rx = Math.cos(az),  rz = -Math.sin(az);   // dreta de la càmera
  const fx = -Math.sin(az), fz = -Math.cos(az);   // endavant, projectat a terra
  centre.x += -rx*dx*k + fx*dy*k;
  centre.z += -rz*dx*k + fz*dy*k;
  const r = Math.hypot(centre.x, centre.z), lim = 40*escalaVista();
  if(r > lim){ centre.x *= lim/r; centre.z *= lim/r; }
}

const raycaster = new THREE.Raycaster();
const ptr = new THREE.Vector2();
const punters = new Map();
let arrossegant = false, mogut = 0, lx = 0, ly = 0, shift = false;
let movent = false, pinch0 = 0, dist0 = 0, mid0 = null;

function cellSota(ev){
  ptr.x = (ev.clientX / innerWidth)*2 - 1;
  ptr.y = -(ev.clientY / innerHeight)*2 + 1;
  raycaster.setFromCamera(ptr, camera);
  const hit = raycaster.intersectObject(pickMesh, false);
  if(!hit.length) return -1;
  return faceCell[hit[0].faceIndex];
}

const cv = renderer.domElement;
cv.addEventListener('pointerdown', e=>{
  punters.set(e.pointerId, {x:e.clientX, y:e.clientY});
  cv.setPointerCapture(e.pointerId);
  if(punters.size === 1){
    arrossegant = true; mogut = 0; lx = e.clientX; ly = e.clientY;
    shift = e.shiftKey;
    movent = (e.button === 1 || e.button === 2 || e.altKey || e.ctrlKey);
  } else if(punters.size === 2){                 // dos dits: moure i acostar
    arrossegant = false;
    const p = [...punters.values()];
    pinch0 = Math.hypot(p[0].x-p[1].x, p[0].y-p[1].y);
    mid0 = {x:(p[0].x+p[1].x)/2, y:(p[0].y+p[1].y)/2};
    dist0 = dist;
  }
});
cv.addEventListener('pointermove', e=>{
  if(punters.has(e.pointerId)) punters.set(e.pointerId, {x:e.clientX, y:e.clientY});

  if(punters.size >= 2){
    const p = [...punters.values()];
    const d = Math.hypot(p[0].x-p[1].x, p[0].y-p[1].y);
    const mid = {x:(p[0].x+p[1].x)/2, y:(p[0].y+p[1].y)/2};
    if(pinch0 > 0) dist = dist0 * pinch0 / Math.max(d, 1);
    desplaca(mid.x - mid0.x, mid.y - mid0.y);
    mid0 = mid; mogut = 999;
    actualitzarCamera(); hoverMesh.visible = false;
    return;
  }
  if(arrossegant){
    const dx = e.clientX - lx, dy = e.clientY - ly;
    mogut += Math.abs(dx) + Math.abs(dy);
    if(movent) desplaca(dx, dy);
    else { az -= dx*0.006; el += dy*0.005; }
    lx = e.clientX; ly = e.clientY;
    actualitzarCamera();
    hoverMesh.visible = false;
  } else {
    marcarHover(cellSota(e));
  }
});
cv.addEventListener('pointercancel', e=>{ punters.delete(e.pointerId); arrossegant = false; movent = false; });
cv.addEventListener('pointerleave', e=>{ if(!arrossegant) marcarHover(-1); });
cv.addEventListener('pointerup', e=>{
  punters.delete(e.pointerId);
  if(punters.size > 0){                          // encara queda un dit a la pantalla
    const p = [...punters.values()][0];
    lx = p.x; ly = p.y; arrossegant = true; mogut = 999;
    return;
  }
  arrossegant = false; movent = false;
  if(mogut < 6){
    const ci = cellSota(e);
    if(ci >= 0){
      const treure = modeTreure || shift || e.shiftKey || e.button === 2;
      if(mode === 'pintar'){
        if(heff[ci] <= 0) avis('Aquí no hi ha cap casa per pintar.');
        else { tint[ci] = colSel; avis(''); }
        if(treure) tint[ci] = -1;
      } else if(mode === 'volta'){
        if(treure){ forcat[ci] = false; avis(''); }
        else if(heights[ci] > 0){
          avis('Aquí hi ha una casa. Buida-la primer amb Maj+clic en mode Cases.');
        } else if(!potVolta(ci)){
          avis('Cal una casa de dos pisos o més a cada banda, i que estiguin enfrontades (no en cantonada).');
        } else { forcat[ci] = true; pont[ci] = 0; avis(''); }
      } else if(mode === 'pont'){
        if(treure){ pont[ci] = 0; avis(''); }
        else if(pont[ci]){ avis('Aquí ja hi ha un pont. Maj+clic (o Treure) el treu.'); }
        else if(heights[ci] > 0 || carrer[ci] || esCarrer[ci]){
          avis('Els ponts van sobre l\'aigua: aquí ja hi ha una casa o un carrer.');
        } else {
          const ax = eixPont(ci);
          if(!ax) avis('Un pont ha de tocar una casa, un carrer o un altre pont. Amb terra a banda i banda, fa de pont; amb terra a una sola banda, d\'embarcador.');
          else { pont[ci] = ax; forcat[ci] = false; avis(''); }
        }
      } else if(mode === 'moll'){
        if(treure){
          if(moll[ci]){ moll[ci] = 0; carrer[ci] = false; nivell[ci] = 0; }
          avis('');
        }
        else if(moll[ci]) avis('Aquí ja hi ha un moll. En mode Carrers, clica\'l per enlairar-lo.');
        else if(heights[ci] > 0) avis('Aquí hi ha una casa. Els molls es fan sobre l\'aigua.');
        else if(pont[ci]) avis('Aquí hi ha un pont. Treu-lo primer.');
        else if(!potMoll(ci)) avis('Un moll ha de tocar terra, un carrer, un pont o un altre moll.');
        else { moll[ci] = 1; carrer[ci] = true; forcat[ci] = false; avis(''); }
      } else if(mode === 'carrer'){
        if(treure){
          if(carrer[ci] && nivell[ci] > 0) nivell[ci]--;
          else { carrer[ci] = false; nivell[ci] = 0; moll[ci] = 0; }
        } else if(carrer[ci] && heights[ci] === 0){
          nivell[ci] = Math.min(NIV_MAX, nivell[ci]+1);
        } else {
          heights[ci] = 0; carrer[ci] = true; nivell[ci] = 0; pont[ci] = 0;
        }
      } else {
        // el carrer i el seu nivell es conserven sota la casa: si la treus, tornen
        if(treure){
          if(heights[ci] === 0 && pont[ci]) pont[ci] = 0;        // sense casa, treu el pont
          heights[ci] = Math.max(0, heights[ci]-1);
          if(heights[ci] === 0 && !carrer[ci]) nivell[ci] = 0;
        } else {
          heights[ci] = Math.min(MAX_H, heights[ci]+1);
          forcat[ci] = false;
          pont[ci] = 0;                   // una casa no es pot fer sobre un pont
          tint[ci] = colSel;              // el bloc nou surt del color triat
        }
      }
      construirMalla();
      instantania();
      marcarHover(e.pointerType === 'touch' ? -1 : ci);   // al tàctil no hi ha cursor
    }
  }
});
cv.addEventListener('contextmenu', e=>e.preventDefault());
// zoom proporcional al gir: el ratolí tàctil envia molts esdeveniments petits
cv.addEventListener('wheel', e=>{
  e.preventDefault();
  const d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
  dist *= Math.exp(Math.max(-120, Math.min(120, d)) * 0.0015);
  actualitzarCamera();
}, {passive:false});

addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  redibuixa();
});

/* ---------- 8. Botons ---------- */

const botons = {casa:'m-casa', carrer:'m-carrer', volta:'m-volta', pont:'m-pont', moll:'m-moll', pintar:'m-pintar'};
function posaMode(m){
  mode = m;
  for(const k in botons){
    const b = document.getElementById(botons[k]);
    b.classList.toggle('on', k === m);
    b.setAttribute('aria-pressed', k === m);
  }
  avis(m === 'volta' ? 'Clica el buit que hi ha entre dues cases enfrontades de dos pisos o més.'
     : m === 'pintar' ? 'Tria un color i clica les cases. Amb Treure (o Maj+clic) tornen a automàtic.'
     : m === 'pont' ? 'Deixa aigua entre cases per fer un canal i clica-hi per posar-hi un pont. En verd, on es pot.'
     : m === 'moll' ? 'Clica l\'aigua que toca la costa per fer-hi un moll. A la punta d\'un moll hi surt un far, i a l\'aigua del costat, barques amarrades.'
     : '');
  if(hoverCi >= 0) marcarHover(hoverCi);
}
for(const k in botons) document.getElementById(botons[k]).onclick = ()=>posaMode(k);

// Treure: el mateix que Maj+clic, però fix (al mòbil no hi ha Maj ni botó dret)
function posaTreure(v){
  modeTreure = v;
  const b = document.getElementById('btn-treure');
  b.classList.toggle('on', v);
  b.setAttribute('aria-pressed', v);
  if(hoverCi >= 0) marcarHover(hoverCi);
}
document.getElementById('btn-treure').onclick = ()=>posaTreure(!modeTreure);

const tecles = {ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1],
                a:[-1,0], d:[1,0], w:[0,-1], s:[0,1]};
addEventListener('keydown', e=>{
  if(e.key === 'Shift' && !majPremuda){ majPremuda = true; if(hoverCi >= 0) marcarHover(hoverCi); }
  const dest = e.target && e.target.tagName;
  if(dest === 'TEXTAREA' || dest === 'INPUT') return;   // escrivint al panell de partida
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if(e.ctrlKey || e.metaKey){
    if(k === 'z'){ e.preventDefault(); e.shiftKey ? refes() : desfes(); return; }
    if(k === 'y'){ e.preventDefault(); refes(); return; }
    return;
  }
  if(k === '1') posaMode('casa');
  if(k === '2') posaMode('carrer');
  if(k === '3') posaMode('volta');
  if(k === '4') posaMode('pont');
  if(k === '5') posaMode('moll');
  if(k === '6') posaMode('pintar');
  if(k === 'x') posaTreure(!modeTreure);
  if(k === 'g') posaGrid(!mostraGrid);
  if(k === 'p') posaPlaces(!autoPlaces);
  if(k === 'n') posaHora({dia:'nit', nit:'auto', auto:'dia'}[modeHora]);
  if(k === 'Escape') obrePanell(false);
  const t = tecles[k];
  if(t){ e.preventDefault(); desplaca(-t[0]*40, -t[1]*40); actualitzarCamera(); }
});
function deixaMaj(){ if(majPremuda){ majPremuda = false; if(hoverCi >= 0) marcarHover(hoverCi); } }
addEventListener('keyup', e=>{ if(e.key === 'Shift') deixaMaj(); });
addEventListener('blur', deixaMaj);

function posaPlaces(v){
  autoPlaces = v;
  sincronitzaBotons();
  construirMalla();
  instantania();
  avis(v ? '' : 'Els buits entre cases es queden oberts. Pinta els carrers a mà en mode Carrers.');
}
document.getElementById('btn-places').onclick = ()=>posaPlaces(!autoPlaces);

function posaGrid(v){
  mostraGrid = v;
  if(gridMesh) gridMesh.visible = v;
  const b = document.getElementById('btn-grid');
  b.classList.toggle('on', v);
  b.setAttribute('aria-pressed', v);
  redibuixa();
}
document.getElementById('btn-grid').onclick = ()=>posaGrid(!mostraGrid);

const paletaEl = document.getElementById('paleta');
function triaColor(k){
  colSel = k;
  for(const b of paletaEl.children){
    b.classList.toggle('on', +b.dataset.k === k);
    b.setAttribute('aria-pressed', +b.dataset.k === k);
  }
}
{
  const auto = document.createElement('button');
  auto.dataset.k = '-1';
  auto.title = 'Automàtic (barreja de colors de calç)';
  auto.setAttribute('aria-label', 'Color automàtic');
  auto.style.background = 'linear-gradient(135deg,#f7f2e8 0 34%,#e5c9a0 34% 67%,#cfe0d5 67%)';
  auto.onclick = ()=>triaColor(-1);
  paletaEl.appendChild(auto);
  PALETA_HEX.forEach((h,k)=>{
    const b = document.createElement('button');
    b.dataset.k = k; b.title = PALETA_NOMS[k]; b.style.background = h;
    b.setAttribute('aria-label', PALETA_NOMS[k]);
    b.onclick = ()=>triaColor(k);
    paletaEl.appendChild(b);
  });
  triaColor(-1);
}

let avisT = null;
function avis(t){
  const el = document.getElementById('avis');
  el.textContent = t || '';
  el.style.display = t ? 'block' : 'none';
  clearTimeout(avisT);
  if(t) avisT = setTimeout(()=>{ el.style.display = 'none'; }, 6000);
}

document.getElementById('btn-poble').onclick = ()=>{ generarPoble(Math.floor(Math.random()*1e6)); construirMalla(); instantania(); };
document.getElementById('btn-cala').onclick  = ()=>{
  novaCala(Math.floor(Math.random()*1e6)); generarPoble(); construirMalla();
  centre.set(0, 1.4, 0); actualitzarCamera(); instantania();
};

/* --- mida de la cala --- */
const botonsMida = {normal:'mida-normal', mitjana:'mida-mitjana', gran:'mida-gran'};
function marcaMida(){
  for(const k in botonsMida){
    const b = document.getElementById(botonsMida[k]);
    b.classList.toggle('on', k === midaCala);
    b.setAttribute('aria-pressed', k === midaCala);
  }
}
// La mateixa cala (la mateixa llavor), però de la mida triada. La quadrícula és tota
// nova, de manera que el poble es torna a generar; amb Ctrl+Z es recupera el d'abans
function posaMida(m){
  if(m === midaCala) return;
  novaCala(seed, m); generarPoble(); construirMalla();
  centre.set(0, 1.4, 0); dist = distInicial(); actualitzarCamera(); instantania();
  marcaMida();
  avis('Cala ' + m + ': ' + cells.length.toLocaleString('ca') + ' cel·les. Amb Ctrl+Z tornes a la d\'abans.');
}
for(const k in botonsMida) document.getElementById(botonsMida[k]).onclick = ()=>posaMida(k);
document.getElementById('btn-buida').onclick = ()=>{
  heights.fill(0); carrer.fill(false); nivell.fill(0); forcat.fill(false); tint.fill(-1); pont.fill(0); moll.fill(0);
  construirMalla(); instantania();
  avis('Cala buidada. Es pot desfer amb ↶.');
};

/* --- panell plegable (al mòbil surt plegat) --- */
const hud = document.getElementById('hud');
const btnPlega = document.getElementById('btn-plega');
function posaPlegat(v){
  hud.classList.toggle('plegat', v);
  btnPlega.setAttribute('aria-expanded', !v);
  btnPlega.textContent = v ? '+' : '−';
  btnPlega.title = v ? 'Desplega el panell' : 'Plega el panell';
  try{ localStorage.setItem('cala:plegat', v ? '1' : '0'); } catch(e){}
}
btnPlega.onclick = ()=>posaPlegat(!hud.classList.contains('plegat'));
{
  let v = null;
  try{ v = localStorage.getItem('cala:plegat'); } catch(e){}
  posaPlegat(v === null ? matchMedia('(max-width: 600px)').matches : v === '1');
}

/* --- dia, nit o automàtic --- */
const botonsHora = {dia:'h-dia', nit:'h-nit', auto:'h-auto'};
// directe: salta a l'hora sense passar per la posta (en arrencar)
function posaHora(m, directe){
  modeHora = m;
  for(const k in botonsHora){
    const b = document.getElementById(botonsHora[k]);
    b.classList.toggle('on', k === m);
    b.setAttribute('aria-pressed', k === m);
  }
  try{ localStorage.setItem('cala:hora', m); } catch(e){}
  if(directe){ hora = m === 'nit' ? HORA_NIT : m === 'dia' ? HORA_DIA : 10; aplicaHora(hora); }
}
for(const k in botonsHora) document.getElementById(botonsHora[k]).onclick = ()=>posaHora(k);
{
  let m = null;
  try{ m = localStorage.getItem('cala:hora'); } catch(e){}
  posaHora(botonsHora[m] ? m : 'dia', true);
}

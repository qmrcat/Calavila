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
  const valid = mode === 'volta' ? (heights[ci] > 0 ? potPorxo(ci) : potVolta(ci)) : mode === 'pont' ? (pont[ci] > 0 || eixPont(ci) > 0)
              : mode === 'moll' ? (moll[ci] > 0 || potMoll(ci))
              : mode === 'far' ? (fars[ci] > 0 || potFar(ci))
              : mode === 'escala' ? (escalaE[ci] >= 0 || sentitsEscala(ci).length > 0)
              : mode === 'roca' ? potRoca(ci)
              : mode === 'platja' ? (esSorra[ci] || potPlatja(ci))
              : mode === 'mercat' ? (mercat[ci] > 0 || potMercat(ci))
              : mode === 'bar' ? potBar(ci) : null;
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
      // treure no depèn del mode: el botó dret, Maj+clic o Treure treuen el que hi ha més amunt
      // de la cel·la. Només en mode Pintar, Maj+clic i Treure tornen la façana al color automàtic
      const dret = e.button === 2;
      const treure = dret || modeTreure || shift || e.shiftKey;
      let enlairat = -1;
      if(treure && !(mode === 'pintar' && !dret)){
        treuElement(ci);
      } else if(mode === 'pintar'){
        if(heff[ci] <= 0) avis('Aquí no hi ha cap casa per pintar.');
        else { tint[ci] = treure ? -1 : colSel; avis(''); }
      } else if(mode === 'volta'){
        if(heights[ci] > 0){
          // a una casa: la planta baixa es fa porxo, o es torna a tancar
          if(!potPorxo(ci)) avis('Per fer-hi un porxo, la casa ha de tenir dos pisos o més: a baix el porxo i a dalt l\'habitatge.');
          else if(porxo[ci]){ porxo[ci] = 0; avis('Porxo tancat.'); }
          else {
            porxo[ci] = 1; bar[ci] = 0; escales[ci] = 0;   // al porxo no hi cap un bar, ni a sobre una escala
            avis('Porxo fet. Fes-ne al costat, del color que vulguis, per tenir un carrer o una plaça porxats.');
          }
        } else if(!potVolta(ci)){
          avis('Cal una casa de dos pisos o més a cada banda, i que estiguin enfrontades (no en cantonada).');
        } else { forcat[ci] = true; pont[ci] = 0; fars[ci] = 0; escales[ci] = 0; avis(''); }
      } else if(mode === 'pont'){
        if(pont[ci]){ avis('Aquí ja hi ha un pont. El botó dret el treu.'); }
        else if(heights[ci] > 0 || carrer[ci] || esCarrer[ci]){
          avis('Els ponts van sobre l\'aigua: aquí ja hi ha una casa o un carrer.');
        } else {
          const ax = eixPont(ci);
          if(!ax) avis('Un pont ha de tocar una casa, un carrer o un altre pont. Amb terra a banda i banda, fa de pont; amb terra a una sola banda, d\'embarcador.');
          else { pont[ci] = ax; forcat[ci] = false; fars[ci] = 0; avis(''); }
        }
      } else if(mode === 'moll'){
        if(moll[ci]) avis('Aquí ja hi ha un moll. En mode Carrers, clica\'l per enlairar-lo.');
        else if(heights[ci] > 0) avis('Aquí hi ha una casa. Els molls es fan sobre l\'aigua.');
        else if(pont[ci]) avis('Aquí hi ha un pont. Treu-lo primer amb el botó dret.');
        else if(!potMoll(ci)) avis('Un moll ha de tocar terra, un carrer, un pont o un altre moll.');
        else { moll[ci] = 1; carrer[ci] = true; forcat[ci] = false; avis(''); }
      } else if(mode === 'far'){
        if(fars[ci]) avis('Aquí ja hi ha un far. El botó dret el treu.');
        else if(heights[ci] > 0) avis('Aquí hi ha una casa. Els fars van a l\'aigua o en un carrer pla.');
        else if(pont[ci]) avis('Aquí hi ha un pont. Treu-lo primer amb el botó dret.');
        else if(span[ci]) avis('Sota una volta no hi cap un far.');
        else if(!potFar(ci)) avis('Aquí hi ha una escala. Els fars van en un lloc pla.');
        else { fars[ci] = 1; mercat[ci] = 0; avis(''); }
      } else if(mode === 'escala'){
        const op = sentitsEscala(ci);
        if(pont[ci]) avis('Aquí hi ha un pont. Treu-lo primer amb el botó dret.');
        else if(span[ci] || forcat[ci]) avis(heights[ci] > 0 ? 'Sobre una casa amb porxo no hi cap una escala.' : 'Sota una volta no hi cap una escala.');
        else if(escales[ci]){
          // una altra vegada a la mateixa escala: la gira cap al sentit següent que es pugui
          const i = op.findIndex(o => o.e === escales[ci] - 1);
          if(op.length > 1 || (op.length && i < 0)){ escales[ci] = op[(i + 1) % op.length].e + 1; avis(''); }
          else avis('Aquesta escala només pot pujar en aquest sentit: ha d\'arrencar d\'un lloc pla.');
        }
        else if(!op.length) avis('Una escala ha d\'arrencar d\'un lloc pla: un carrer, un terrat o el cap d\'una altra escala'
                               + (heights[ci] > 0 || esCarrer[ci] ? ', al mateix nivell que aquí.' : '.'));
        else {
          const o = op[0];
          if(!esCarrer[ci] && !heights[ci]){ carrer[ci] = true; nivell[ci] = o.L; }   // al buit, fa el carrer i tot
          escales[ci] = o.e + 1; fars[ci] = 0; mercat[ci] = 0;
          avis(op.length > 1 ? 'Torna-hi a clicar per girar-la.' : '');
        }
      } else if(mode === 'bar'){
        // la planta baixa d'una casa es torna un bar o un restaurant; un altre clic els canvia
        if(!(heights[ci] > 0)) avis('Clica una casa: el bar o el restaurant es fa a la planta baixa.');
        else if(span[ci]) avis('Aquesta casa té porxo: la planta baixa és oberta. Tanca\'l en mode Voltes.');
        else if(!potBar(ci)) avis('Aquesta casa no té cap façana a la planta baixa: totes donen a altres cases.');
        else {
          bar[ci] = bar[ci] ? 3 - bar[ci] : (hash3(ci, 325, 1) < 0.5 ? 1 : 2);
          const nom = bar[ci] === 2 ? 'un restaurant' : 'un bar';
          triaBars();
          avis(terrassaDe.size && [...terrassaDe.values()].includes(ci)
               ? 'Ara és ' + nom + ', amb terrassa. Torna-hi a clicar per canviar-lo.'
               : 'Ara és ' + nom + '. Per tenir terrassa, cal que davant de la casa hi hagi dues cel·les buides seguides, la primera un carrer o una plaça plans.');
        }
      } else if(mode === 'mercat'){
        if(mercat[ci]) avis('Aquí ja hi ha una parada. Clica les cel·les del costat per fer créixer el mercat.');
        else if(heights[ci] > 0) avis('Aquí hi ha una casa. Les parades van en un carrer o una plaça.');
        else if(pont[ci]) avis('Aquí hi ha un pont. Treu-lo primer amb el botó dret.');
        else if(span[ci] || forcat[ci]) avis('Sota una volta no hi cap una parada.');
        else if(roca[ci]) avis('A la roca no hi cap una parada. Obre-hi un carrer en mode Carrers.');
        else if(!potMercat(ci)) avis('Aquí hi ha una escala. Les parades van en un lloc pla.');
        else {
          if(!carrer[ci] && !esCarrer[ci]){ carrer[ci] = true; nivell[ci] = 0; }   // a l'aigua, el terra i tot
          mercat[ci] = 1; fars[ci] = 0; forcat[ci] = false;
          avis('');
        }
      } else if(mode === 'platja'){
        // a l'aigua arran de costa fa l'arena; a la platja, cada clic hi canvia el que hi ha a sobre
        if(esSorra[ci]){
          platja[ci] = platja[ci] % PLATJA_MAX + 1;
          avis(platja[ci] === 1 ? 'Arena llisa. Torna-hi a clicar per posar-hi alguna cosa.'
               : 'Ara hi ha ' + ELEMENTS_PLATJA[platja[ci]] + '. Torna-hi a clicar per canviar-ho.');
        } else if(heights[ci] > 0 || carrer[ci] || esCarrer[ci]) avis('Aquí ja hi ha terra. La platja es fa a l\'aigua, arran de costa.');
        else if(pont[ci]) avis('Aquí hi ha un pont. Treu-lo primer amb el botó dret.');
        else if(fars[ci]) avis('Aquí hi ha un far. Treu-lo primer amb el botó dret.');
        else if(!potPlatja(ci)) avis('La platja ha de tocar terra, un carrer o una altra platja.');
        else { platja[ci] = 1; avis('Platja feta. Torna-hi a clicar per posar-hi un para-sol, unes gandules, una barca...'); }
      } else if(mode === 'roca'){
        if(heights[ci] > 0) avis('Aquí hi ha una casa. La roca es fa al costat; o treu-la primer amb el botó dret.');
        else if(pont[ci]) avis('Aquí hi ha un pont. Treu-lo primer amb el botó dret.');
        else if(span[ci] || forcat[ci]) avis('Sota una volta no hi pot haver roca.');
        else if(roca[ci] && carrer[ci]){
          if(nivell[ci] >= NIV_MAX) avis('La roca ja és tan alta com pot ser.');
          else { nivell[ci]++; avis(''); }
        } else {
          // l'aigua, un carrer, una plaça o un moll es tornen roca, al nivell que tenien
          if(!carrer[ci] && !esCarrer[ci]) nivell[ci] = 0;
          carrer[ci] = true; roca[ci] = 1; moll[ci] = 0;
          avis('Roca feta. Torna-hi a clicar per alçar-la, o fes-hi una casa en mode Cases.');
        }
      } else if(mode === 'carrer'){
        if(roca[ci] && carrer[ci] && heights[ci] === 0){
          roca[ci] = 0;                   // s'obre un carrer a la roca, al mateix nivell
          avis('');
        } else if(carrer[ci] && heights[ci] === 0){
          nivell[ci] = Math.min(NIV_MAX, nivell[ci]+1);
          enlairat = ci;
        } else {
          heights[ci] = 0; carrer[ci] = true; nivell[ci] = 0; pont[ci] = 0;
        }
      } else {
        // cases: a l'aigua, el primer clic fa el terreny i el segon, la casa. El terreny (i el
        // seu nivell) es conserva sota la casa: si la treus pis a pis, torna a quedar
        const terreny = heights[ci] > 0 || carrer[ci] || esCarrer[ci];
        if(pont[ci]) avis('Aquí hi ha un pont. Treu-lo primer amb el botó dret.');
        else if(!terreny){
          carrer[ci] = true; nivell[ci] = 0; forcat[ci] = false;
          avis('Terreny fet. Torna-hi a clicar per fer-hi la casa.');
        } else {
          heights[ci] = Math.min(MAX_H, heights[ci]+1);
          forcat[ci] = false;
          fars[ci] = 0;                   // una casa no es pot fer sobre un far
          mercat[ci] = 0;                 // ni sobre una parada
          escales[ci] = 0;                // ni sobre una escala
          tint[ci] = colSel;              // el bloc nou surt del color triat
          avis('');
        }
      }
      // si s'hi ha fet terra, un pont o un far, la platja de sota se'n va
      if(platja[ci] && (heights[ci] > 0 || carrer[ci] || pont[ci] || fars[ci])) platja[ci] = 0;
      construirMalla();
      if(enlairat >= 0) avisaAcces(enlairat);
      instantania();
      marcarHover(e.pointerType === 'touch' ? -1 : ci);   // al tàctil no hi ha cursor
    }
  }
});
// Treu l'element de més amunt de la cel·la, sigui quin sigui el mode: l'escala de sobre una casa,
// un pis de la casa (o, en mode Voltes, el porxo), la volta, el far, l'escala, el pont, i a la fi el terreny, nivell a nivell
function treuElement(ci){
  avis('');
  if(escales[ci] && heights[ci] > 0){ escales[ci] = 0; return; }
  if(mode === 'bar' && bar[ci] && heights[ci] > 0){ bar[ci] = 0; return; }   // en mode Bars, primer el bar
  if(mode === 'volta' && porxo[ci] && heights[ci] > 0){ porxo[ci] = 0; return; }   // en mode Voltes, primer el porxo
  if(heights[ci] > 0){
    heights[ci]--;
    if(heights[ci] < 2) porxo[ci] = 0;   // amb un sol pis ja no hi cap el porxo
    if(heights[ci] === 0){ bar[ci] = 0; if(!carrer[ci]) nivell[ci] = 0; }
    return;
  }
  if(forcat[ci]){ forcat[ci] = false; return; }
  if(fars[ci]){ fars[ci] = 0; return; }
  if(mercat[ci] && nadal){ mercat[ci] = 0; return; }   // sense guarniments no es veu: no es treu d'amagat
  if(escales[ci]){ escales[ci] = 0; return; }
  if(pont[ci]){ pont[ci] = 0; return; }
  if(platja[ci]){ platja[ci] = platja[ci] > 1 ? 1 : 0; return; }   // primer el que hi ha a sobre, i després l'arena
  if(carrer[ci]){
    if(nivell[ci] > 0) nivell[ci]--;
    else { carrer[ci] = false; moll[ci] = 0; roca[ci] = 0; mercat[ci] = 0; }
    return;
  }
  avis(esCarrer[ci] ? 'Aquesta plaça es fa sola: treu alguna de les cases del voltant.' : 'Aquí no hi ha res per treure.');
}
// en enlairar un carrer: si no hi puja cap escala ni toca cap altre carrer del mateix nivell, es diu per què
function avisaAcces(ci){
  const L = nivEf[ci], nb = cells[ci].nb;
  const hiPuja = nb.some(b => b >= 0 && escalaE[b] >= 0 && cells[b].nb[escalaE[b]] === ci);
  const veiPla = nb.some(b => b >= 0 && esCarrer[b] && nivEf[b] === L);
  if(L > 0 && !hiPuja && !veiPla)
    avis('Per pujar-hi, posa una escala en mode Escales en un carrer del costat, un nivell més avall.');
  else avis('');
}
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

const botons = {casa:'m-casa', carrer:'m-carrer', volta:'m-volta', pintar:'m-pintar', bar:'m-bar',
                pont:'m-pont', moll:'m-moll', far:'m-far', escala:'m-escala', roca:'m-roca', platja:'m-platja', mercat:'m-mercat'};
function posaMode(m){
  mode = m;
  for(const k in botons){
    const b = document.getElementById(botons[k]);
    b.classList.toggle('on', k === m);
    b.setAttribute('aria-pressed', k === m);
  }
  avis(m === 'volta' ? 'Clica el buit entre dues cases enfrontades de dos pisos o més per fer-hi una volta, o clica una casa de dos pisos o més per porxar-ne la planta baixa.'
     : m === 'pintar' ? 'Tria un color i clica les cases. Amb Treure (o Maj+clic) tornen a automàtic.'
     : m === 'pont' ? 'Deixa aigua entre cases per fer un canal i clica-hi per posar-hi un pont. En verd, on es pot.'
     : m === 'moll' ? 'Clica l\'aigua que toca la costa per fer-hi un moll. A la punta d\'un moll hi surt un far, i a l\'aigua del costat, barques amarrades.'
     : m === 'far' ? 'Clica l\'aigua per alçar-hi un far sobre un illot, o un carrer, una plaça o un moll plans per posar-l\'hi a sobre.'
     : m === 'escala' ? 'Clica un carrer pla, o el costat d\'un, per fer-hi una escala que puja un nivell. Torna-hi a clicar per girar-la.'
     : m === 'bar' ? 'Clica una casa per fer-ne un bar o un restaurant a la planta baixa. Si al davant hi ha dues cel·les buides, surt amb terrassa.'
     : m === 'mercat' ? 'Clica un carrer o una plaça plans per posar-hi una parada. Clica les cel·les del costat per fer créixer el mercat.'
     : m === 'roca' ? 'Clica l\'aigua o un carrer per fer-hi roca, i torna-hi a clicar per alçar-la. Les roques veïnes fan muntanya, i a sobre s\'hi poden fer cases.'
     : m === 'platja' ? 'Clica l\'aigua arran de costa per fer-hi platja. Clicant la platja, hi poses un para-sol, unes gandules, un llaüt, un patí de vela, la cadira del socorrista o un castell de sorra.'
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
  // les tecles segueixen l'ordre dels botons: 1-4 el poble, 5-9 les obres i la muntanya
  const modes = ['casa', 'carrer', 'volta', 'pintar', 'pont', 'moll', 'far', 'escala', 'roca'];
  if(k >= '1' && k <= '9' && k.length === 1) posaMode(modes[+k - 1]);
  if(k === '0' && nadal) posaMode('mercat');
  if(k === 'b') posaMode('bar');
  if(k === 'l') posaMode('platja');
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
  heights.fill(0); carrer.fill(false); nivell.fill(0); forcat.fill(false); tint.fill(-1); pont.fill(0); moll.fill(0); fars.fill(0); escales.fill(0); roca.fill(0); mercat.fill(0); bar.fill(0); porxo.fill(0); platja.fill(0);
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

/* --- gavines: es poden aturar. Es recorda en aquest navegador, no a la partida --- */
function posaGavines(v){
  gavinesActives = v;
  mostraGavines();
  const b = document.getElementById('btn-gavines');
  b.classList.toggle('on', v);
  b.setAttribute('aria-pressed', v);
  try{ localStorage.setItem('cala:gavines', v ? '1' : '0'); } catch(e){}
  redibuixa();
}
document.getElementById('btn-gavines').onclick = ()=>posaGavines(!gavinesActives);
{
  let v = null;
  try{ v = localStorage.getItem('cala:gavines'); } catch(e){}
  posaGavines(v !== '0');   // per defecte, volen
}

/* --- guarniments de Nadal: com les gavines, es recorden en aquest navegador --- */
function posaNadal(v, sensemalla){
  nadal = v;
  const b = document.getElementById('btn-nadal');
  b.classList.toggle('on', v);
  b.setAttribute('aria-pressed', v);
  try{ localStorage.setItem('cala:nadal', v ? '1' : '0'); } catch(e){}
  document.getElementById('grup-nadal').hidden = !v;   // el mercat només es pot fer amb els guarniments
  if(!v && mode === 'mercat') posaMode('casa');
  if(!sensemalla) construirMalla();
}
document.getElementById('btn-nadal').onclick = ()=>posaNadal(!nadal);
{
  let v = null;
  try{ v = localStorage.getItem('cala:nadal'); } catch(e){}
  posaNadal(v === '1', true);   // per defecte, sense; la malla es fa en arrencar
}

/* --- la Diada: com els guarniments de Nadal, es recorda en aquest navegador --- */
function posaDiada(v, sensemalla){
  diada = v;
  const b = document.getElementById('btn-diada');
  b.classList.toggle('on', v);
  b.setAttribute('aria-pressed', v);
  try{ localStorage.setItem('cala:diada', v ? '1' : '0'); } catch(e){}
  if(!sensemalla) construirMalla();
}
document.getElementById('btn-diada').onclick = ()=>posaDiada(!diada);
{
  let v = null;
  try{ v = localStorage.getItem('cala:diada'); } catch(e){}
  posaDiada(v === '1', true);   // per defecte, sense; la malla es fa en arrencar
}

/* --- la Festa Major: com Nadal i la Diada, es recorda en aquest navegador --- */
function posaFesta(v, sensemalla){
  festa = v;
  const b = document.getElementById('btn-festa');
  b.classList.toggle('on', v);
  b.setAttribute('aria-pressed', v);
  try{ localStorage.setItem('cala:festa', v ? '1' : '0'); } catch(e){}
  if(!sensemalla) construirMalla();
}
document.getElementById('btn-festa').onclick = ()=>posaFesta(!festa);
{
  let v = null;
  try{ v = localStorage.getItem('cala:festa'); } catch(e){}
  posaFesta(v === '1', true);   // per defecte, sense; la malla es fa en arrencar
}

/* --- els gegants: també es recorden en aquest navegador --- */
function posaGegants(v, sensemalla){
  ambGegants = v;
  const b = document.getElementById('btn-gegants');
  b.classList.toggle('on', v);
  b.setAttribute('aria-pressed', v);
  try{ localStorage.setItem('cala:gegants', v ? '1' : '0'); } catch(e){}
  if(!sensemalla) construirMalla();
}
document.getElementById('btn-gegants').onclick = ()=>posaGegants(!ambGegants);
{
  let v = null;
  try{ v = localStorage.getItem('cala:gegants'); } catch(e){}
  posaGegants(v === '1', true);   // per defecte, sense; la malla es fa en arrencar
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

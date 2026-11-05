/* Cala · bucle d'animació i arrencada */

/* ---------- 9. Bucle ---------- */

const calma = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pos = marGeo.attributes.position;
let tAnterior = 0;
function anima(t){
  requestAnimationFrame(anima);
  const dt = Math.min(0.1, Math.max(0, (t - tAnterior)/1000));   // si la pestanya dorm, no fa salts
  tAnterior = t;
  passaTemps(dt);
  if(!calma){
    if(gavinesActives) mouGavines(t/1000);
    giraRotors(t/1000);                                 // les pales dels aerogeneradors
    if(ambGent) mouGent(dt);                            // la gent que camina
    const s = t*0.0009;
    for(let i=0;i<pos.count;i++){
      const x = marBase[i*3], z = marBase[i*3+2];
      pos.array[i*3+1] = onada(x, z, s);
    }
    pos.needsUpdate = true;     // amb flatShading les normals les calcula el shader
    for(const b of barques) bressola(b, s);             // les barques es bressolen amb l'onada
    for(const b of amarrats.values()) bressola(b, s);
    brut = true;
  }
  if(!brut) return;
  brut = false;
  renderer.render(scene, camera);
}

/* ---------- 11. Arrencada ---------- */

novaCala(20260820);
generarPoble();
construirMalla();
actualitzarCamera();
anima(0);

// si hi ha partida desada, es recupera un cop el poble ja es veu.
// Fins llavors desaAuto() no fa res, perquè el poble per defecte no la trepitgi.
(async ()=>{
  const g = await magatzem.get('cala:auto');
  if(g){
    try{
      deserialitza(g);
      sincronitzaBotons();
      construirMalla();
      dist = distInicial(); actualitzarCamera();   // la partida pot ser d'una altra mida
    } catch(e){ console.warn('No s\'ha pogut restaurar la partida:', e.message); }
  }
  restaurat = true;
  pila = []; cursor = -1; instantania();
})();

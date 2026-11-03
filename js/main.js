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
    mouGavines(t/1000);
    const s = t*0.0009;
    for(let i=0;i<pos.count;i++){
      const x = marBase[i*3], z = marBase[i*3+2];
      pos.array[i*3+1] = onada(x, z, s);
    }
    pos.needsUpdate = true;     // amb flatShading les normals les calcula el shader
    for(const b of barques){    // les barques es bressolen amb l'onada
      b.mesh.position.y = mar.position.y + onada(b.x, b.z, s);
      b.mesh.rotation.z = Math.sin(s*1.7 + b.fase)*0.05;
      b.mesh.rotation.x = Math.sin(s*2.3 + b.fase*1.3)*0.06;
    }
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
    } catch(e){ console.warn('No s\'ha pogut restaurar la partida:', e.message); }
  }
  restaurat = true;
  pila = []; cursor = -1; instantania();
})();

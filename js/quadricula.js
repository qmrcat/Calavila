/* Cala · la quadrícula irregular */

/* ---------- 2. La quadrícula irregular ---------- */
/*
   Aquest és el cor de Townscaper:
   a) Es parteix d'una malla de triangles equilàters retallada amb una silueta ondulada.
   b) S'aparellen triangles veïns a l'atzar -> quadrilàters (en queden de solts).
   c) Se subdivideix cada cara de n costats en n quads (Catmull-Clark topològic):
      un quad dona 4 quads, un triangle en dona 3. Resultat: TOT són quads.
   d) Es relaxa la malla empenyent cada quad cap al quadrat perfecte més proper.
   El resultat és una graella irregular però "quadrada" arreu: mai es veuen els triangles.
*/

const SQ3 = Math.sqrt(3)/2;

function construirCala(seed, R){
  const rnd = mulberry32(seed);
  const s1 = rnd()*6.283, s2 = rnd()*6.283, s3 = rnd()*6.283;

  // --- silueta de la cala (radi que varia amb l'angle)
  function dins(x,z){
    const r = Math.hypot(x,z), a = Math.atan2(z,x);
    const rr = R*(1 + 0.17*Math.sin(a*2+s1) + 0.12*Math.sin(a*3+s2) + 0.07*Math.sin(a*5+s3));
    return r < rr;
  }

  // --- (a) triangles de la malla triangular
  const verts = [];
  const vmap = new Map();
  function vid(i,j){
    const k = i+'_'+j;
    let id = vmap.get(k);
    if(id === undefined){ id = verts.length; verts.push({x: i + j*0.5, z: j*SQ3}); vmap.set(k,id); }
    return id;
  }
  const px = (i,j) => i + j*0.5;
  const pz = (i,j) => j*SQ3;

  const N = Math.ceil(R) + 3;
  const tris = [];
  for(let j=-N;j<=N;j++){
    for(let i=-N;i<=N;i++){
      // triangle amunt
      let cx = (px(i,j)+px(i+1,j)+px(i,j+1))/3, cz = (pz(i,j)+pz(i+1,j)+pz(i,j+1))/3;
      if(dins(cx,cz)) tris.push([vid(i,j), vid(i+1,j), vid(i,j+1)]);
      // triangle avall
      cx = (px(i+1,j)+px(i+1,j+1)+px(i,j+1))/3; cz = (pz(i+1,j)+pz(i+1,j+1)+pz(i,j+1))/3;
      if(dins(cx,cz)) tris.push([vid(i+1,j), vid(i+1,j+1), vid(i,j+1)]);
    }
  }

  // --- (b) aparellament aleatori de triangles veïns
  const edgeTris = new Map();
  const ekey = (a,b) => (a<b ? a+'_'+b : b+'_'+a);
  tris.forEach((t,ti)=>{
    for(let e=0;e<3;e++){
      const k = ekey(t[e], t[(e+1)%3]);
      let l = edgeTris.get(k); if(!l){ l=[]; edgeTris.set(k,l); }
      l.push(ti);
    }
  });

  const parella = new Array(tris.length).fill(-1);
  const arestaParella = new Array(tris.length).fill(-1);
  const ordre = shuffle(tris.map((_,i)=>i), rnd);
  for(const ti of ordre){
    if(parella[ti] >= 0) continue;
    const cand = [];
    for(let e=0;e<3;e++){
      const l = edgeTris.get(ekey(tris[ti][e], tris[ti][(e+1)%3])) || [];
      for(const tj of l) if(tj !== ti && parella[tj] < 0) cand.push([tj,e]);
    }
    if(cand.length){
      const [tj,e] = cand[Math.floor(rnd()*cand.length)];
      parella[ti] = tj; parella[tj] = ti;
      arestaParella[ti] = e;
    }
  }

  // cares: quads aparellats + triangles solters
  const cares = [];
  const fet = new Array(tris.length).fill(false);
  for(let ti=0; ti<tris.length; ti++){
    if(fet[ti]) continue;
    const tj = parella[ti];
    if(tj < 0){ cares.push(tris[ti].slice()); fet[ti] = true; continue; }
    fet[ti] = true; fet[tj] = true;
    const e = arestaParella[ti] >= 0 ? arestaParella[ti] : arestaParella[tj];
    const T = arestaParella[ti] >= 0 ? tris[ti] : tris[tj];
    const O = arestaParella[ti] >= 0 ? tris[tj] : tris[ti];
    const p = T[e], q = T[(e+1)%3], r = T[(e+2)%3];
    const s = O.find(v => v !== p && v !== q);
    cares.push([r, p, s, q]);
  }

  // --- (c) subdivisió: tota cara de n costats -> n quads
  const nv = verts.map(v => ({x:v.x, z:v.z}));
  const midCache = new Map();
  function mid(a,b){
    const k = ekey(a,b);
    let id = midCache.get(k);
    if(id === undefined){
      id = nv.length;
      nv.push({x:(nv[a].x+nv[b].x)/2, z:(nv[a].z+nv[b].z)/2});
      midCache.set(k,id);
    }
    return id;
  }
  const quads = [];
  for(const f of cares){
    const n = f.length;
    let cx=0, cz=0;
    for(const v of f){ cx += nv[v].x; cz += nv[v].z; }
    const cid = nv.length; nv.push({x:cx/n, z:cz/n});
    for(let k=0;k<n;k++){
      const a = f[k], b = f[(k+1)%n], pr = f[(k-1+n)%n];
      quads.push([a, mid(a,b), cid, mid(pr,a)]);
    }
  }

  // --- (d) relaxació: cada quad estira cap al quadrat perfecte més proper
  const rot = (x,z,k) => { // gir de 90° repetit k cops al pla XZ
    for(let n=0;n<((k%4)+4)%4;n++){ const t = x; x = -z; z = t; }
    return [x,z];
  };
  for(let it=0; it<40; it++){
    const acc = nv.map(()=>({x:0,z:0,w:0}));
    for(const q of quads){
      let cx=0, cz=0;
      for(const v of q){ cx += nv[v].x; cz += nv[v].z; }
      cx/=4; cz/=4;
      const p = q.map(v => [nv[v].x-cx, nv[v].z-cz]);
      for(let k=0;k<4;k++){
        let tx=0, tz=0;
        for(let j=0;j<4;j++){
          const [rx,rz] = rot(p[j][0], p[j][1], k-j);
          tx += rx; tz += rz;
        }
        const v = q[k];
        acc[v].x += cx + tx/4; acc[v].z += cz + tz/4; acc[v].w++;
      }
    }
    for(let i=0;i<nv.length;i++){
      if(!acc[i].w) continue;
      nv[i].x += ((acc[i].x/acc[i].w) - nv[i].x) * 0.55;
      nv[i].z += ((acc[i].z/acc[i].w) - nv[i].z) * 0.55;
    }
  }

  // escala: després de subdividir l'aresta fa ~0.5, la volem ~1
  for(const v of nv){ v.x *= 2; v.z *= 2; }

  // --- orientació consistent (normal cap amunt) + centre + veïns
  for(const q of quads){
    let a = 0;
    for(let k=0;k<4;k++){
      const p1 = nv[q[k]], p2 = nv[q[(k+1)%4]];
      a += p1.x*p2.z - p2.x*p1.z;
    }
    if(a > 0) q.reverse();
  }

  const arestaQuads = new Map();
  quads.forEach((q,qi)=>{
    for(let e=0;e<4;e++){
      const k = ekey(q[e], q[(e+1)%4]);
      let l = arestaQuads.get(k); if(!l){ l=[]; arestaQuads.set(k,l); }
      l.push(qi);
    }
  });

  const cells = quads.map((q,qi)=>{
    const p = q.map(v => nv[v]);   // referències compartides: dues cel·les veïnes
                                   // apunten al MATEIX objecte de vèrtex
    const c = {x:(p[0].x+p[1].x+p[2].x+p[3].x)/4, z:(p[0].z+p[1].z+p[2].z+p[3].z)/4};
    const nb = [];
    for(let e=0;e<4;e++){
      const l = arestaQuads.get(ekey(q[e], q[(e+1)%4]));
      const other = l.find(x => x !== qi);
      nb.push(other === undefined ? -1 : other);
    }
    return {p, vi:q.slice(), c, nb};
  });

  return cells;
}

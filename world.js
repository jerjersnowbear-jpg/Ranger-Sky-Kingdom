'use strict';
/* RANGER: The Lost Sky Kingdom · Skyhaven world (v0.2.0)
   Floating islands, ruins, vegetation, landmarks and mission objects, built to match the Skyhaven concept art.
   Collision still comes from the mission rectangles in game.js; everything here is what the player sees. */
const World=(()=>{
const TAU=Math.PI*2,col=c=>new THREE.Color(c),tmpC=new THREE.Color(),tmpM=new THREE.Matrix4(),tmpQ=new THREE.Quaternion(),tmpE=new THREE.Euler(),tmpV=new THREE.Vector3(),tmpS=new THREE.Vector3();
let levelKey='',backdrop=null,level=null,dyn=null,bgGlow=null,lvGlow=null,fxGlow=null,fxSpark=null,seaClouds=null,skyClouds=null;
const geoCache={};
const mkGlow=bb=>(x,y,z,s,r,g,b,a=1)=>bb.push(x,y,z,s,s,r,g,b,a);

// ---------- geometry builders ----------
function boxGeo(w,h,d,uvScale=2,ox=0,oy=0){const g=new THREE.BoxGeometry(w,h,d),uv=g.getAttribute('uv'),dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
 for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*dims[f][0]/uvScale+ox,uv.getY(i)*dims[f][1]/uvScale+oy)}return g}
const rot3=(x,z,rot)=>[x*Math.cos(rot)+z*Math.sin(rot),-x*Math.sin(rot)+z*Math.cos(rot)];

// Floating-island rock mass: a superellipse cross-section that tapers to a stalactite point, with banded strata colours.
function islandRock({hw,hd,depth,n=5,seed=1,y0=0,x0=0,z0=0,segs=48,rings=10,moss=.07,cliff=.15}){
 const R=rng(seed),P=[],C=[],U=[],idx=[],pal=['#a3866a','#b39472','#8d7561','#a28c75','#7d6a5a','#b69f82','#94806b'].map(col),mossC=col('#5d7a30');
 const tipX=(R()-.5)*hw*.35,tipZ=(R()-.5)*hd*.35,per=2*Math.PI*Math.sqrt((hw*hw+hd*hd)/2),rep=Math.max(1,Math.round(per/5));
 for(let k=0;k<=rings;k++){const t=k/rings,yy=y0-(t<cliff?t/cliff*depth*.17:depth*(.17+.83*Math.pow((t-cliff)/(1-cliff),1.12))),s=t<cliff?1-.05*t/cliff:.95*Math.pow(1-(t-cliff)/(1-cliff),.75);
  for(let j=0;j<=segs;j++){const a=j/segs*TAU,ca=Math.cos(a),sa=Math.sin(a),jj=j%segs;
   const ex=Math.sign(ca)*Math.pow(Math.abs(ca),2/n)*hw,ez=Math.sign(sa)*Math.pow(Math.abs(sa),2/n)*hd;
   const nz=1+(k?(fbm(jj/segs*8,t*4,seed,3,8,0)-.5)*.5*(t<.05?.25:1):0),bulge=t>cliff?1+.1*Math.sin(t*9+seed):1;
   P.push(x0+ex*s*nz*bulge+tipX*t*t*t,yy,z0+ez*s*nz*bulge+tipZ*t*t*t);
   const band=Math.floor(yy*.8+fbm(jj/segs*5,yy*.15,seed+3,2,5,0)*3+100)%pal.length;
   tmpC.copy(pal[band]).multiplyScalar((1-.55*Math.pow(t,1.1))*(.9+.18*R()));if(t<moss)tmpC.lerp(mossC,1-t/moss);
   C.push(tmpC.r,tmpC.g,tmpC.b);U.push(j/segs*rep,yy/5)}}
 for(let k=0;k<rings;k++)for(let j=0;j<segs;j++){const a=k*(segs+1)+j,b=a+segs+1;idx.push(a,a+1,b,a+1,b+1,b)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(idx);g.computeVertexNormals();return g}

// Grass tuft: seven curved blades, dark at the root and sun-bleached at the tips.
function tuftGeo(seed){const R=rng(seed),P=[],C=[],N=[],idx=[],cb=col('#355d1f'),cm=col('#6a9634'),ct=col('#c6d66e');
 for(let b=0;b<7;b++){const ang=R()*TAU,lean=.15+R()*.4,h=.2+R()*.24,w=.03+R()*.02,ox=(R()-.5)*.14,oz=(R()-.5)*.14,base=P.length/3,dx=Math.cos(ang),dz=Math.sin(ang),px=-dz,pz=dx;
  for(let s=0;s<=3;s++){const t=s/3,ww=w*(1-t*.9),off=lean*t*t*h,cx=ox+dx*off,cz=oz+dz*off,yy=h*t;P.push(cx+px*ww,yy,cz+pz*ww,cx-px*ww,yy,cz-pz*ww);
   if(t<.5)tmpC.copy(cb).lerp(cm,t*2);else tmpC.copy(cm).lerp(ct,(t-.5)*2);for(let q=0;q<2;q++){C.push(tmpC.r,tmpC.g,tmpC.b);N.push(0,1,0)}}
  for(let s=0;s<3;s++){const a=base+s*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setIndex(idx);return g}

// Purple lupine spike and white daisy, like the flowers in the concept art's foreground.
function lupineGeo(seed){const R=rng(seed),parts=[];const stem=paint(new THREE.CylinderGeometry(.012,.018,.56,4),'#4e7a2c');place(stem,{p:[0,.28,0]});parts.push(stem);
 for(let i=0;i<11;i++){const t=i/10,a=i*2.4,r=.04*(1-t*.6),fl=new THREE.OctahedronGeometry(.04*(1-t*.45),0);const c=col('#5b3fb8').lerp(col('#c9aef7'),t);paint(fl,'#'+c.getHexString(),.12,seed+i);place(fl,{p:[Math.cos(a)*r,.25+t*.36,Math.sin(a)*r],s:[1,1.3,1]});parts.push(fl)}
 for(let i=0;i<2;i++){const lf=paint(new THREE.SphereGeometry(.05,5,3),'#4f7f2e');place(lf,{p:[Math.cos(i*3.1)*.07,.05,Math.sin(i*3.1)*.07],s:[1.5,.25,.6],r:[0,i*3.1,0]});parts.push(lf)}
 return THREE.BufferGeometryUtils.mergeGeometries(parts.map(prep))}
function daisyGeo(seed){const parts=[];const stem=paint(new THREE.CylinderGeometry(.008,.012,.26,3),'#4e7a2c');place(stem,{p:[0,.13,0]});parts.push(stem);
 const pt=new THREE.CircleGeometry(.06,10);const pp=pt.getAttribute('position');for(let i=1;i<pp.count;i++){const a=Math.atan2(pp.getY(i),pp.getX(i));const k=.75+.25*Math.cos(a*9);pp.setXY(i,pp.getX(i)*k,pp.getY(i)*k)}paint(pt,'#f8f6ee',.05,seed);place(pt,{p:[0,.262,0],r:[-Math.PI/2,0,0]});parts.push(pt);
 const c=paint(new THREE.SphereGeometry(.022,5,3),'#f1c232');place(c,{p:[0,.27,0],s:[1,.6,1]});parts.push(c);return THREE.BufferGeometryUtils.mergeGeometries(parts.map(prep))}

// Stylised broadleaf tree: curved trunk plus clustered, sun-lit canopy blobs.
function treeGeo(seed,h=4.2,spread=1.5,detail=2){const R=rng(seed),parts=[],greens=['#5c9634','#6fa83b','#4e8a2d','#80b442','#669c35'];
 const trunk=new THREE.CylinderGeometry(.1*h/4,.2*h/4,h*.7,7,4,true),tp=trunk.getAttribute('position'),lean=(R()-.5)*.5;
 for(let i=0;i<tp.count;i++){const y=tp.getY(i)+h*.35;tp.setX(i,tp.getX(i)+lean*(y/h)*(y/h)*h*.35);tp.setY(i,y)}trunk.computeVertexNormals();paint(trunk,'#6a4a30',.18,seed);parts.push(trunk);
 for(let i=0;i<3;i++){const br=paint(new THREE.CylinderGeometry(.03,.07,h*.28,5),'#6a4a30');place(br,{p:[Math.cos(i*2.1)*.2+lean*.25,h*.74,Math.sin(i*2.1)*.2],r:[Math.cos(i*2.1)*.6,0,-Math.sin(i*2.1)*.6]});parts.push(br)}
 const blobs=(detail>1?6:5)+R()*(detail>1?4:2)|0;for(let i=0;i<blobs;i++){const a=i/blobs*TAU+R(),rr=(i===0?0:.55+R()*.6)*spread,s=(i===0?1.1:.6+R()*.45)*spread,cy=h*(.78+R()*.22)+(i===0?.25*spread:0);
  const g=new THREE.IcosahedronGeometry(1,detail),p=g.getAttribute('position'),base=col(greens[R()*greens.length|0]),cArr=new Float32Array(p.count*3);
  for(let k=0;k<p.count;k++){tmpV.fromBufferAttribute(p,k);const nz=1+.22*(fbm(tmpV.x*1.7+seed,tmpV.y*1.7+tmpV.z*1.3,i+seed,3)-.5)*2;tmpV.multiplyScalar(nz);p.setXYZ(k,tmpV.x,tmpV.y*.82,tmpV.z);
   const up=tmpV.y*.5+.5;tmpC.copy(base).multiplyScalar(.6+.55*up);tmpC.lerp(col('#d6df74'),Math.max(0,up-.68)*1.1);cArr[k*3]=tmpC.r;cArr[k*3+1]=tmpC.g;cArr[k*3+2]=tmpC.b}
  g.setAttribute('color',new THREE.BufferAttribute(cArr,3));g.deleteAttribute('normal');g.deleteAttribute('uv');let gm=THREE.BufferGeometryUtils.mergeVertices(g,1e-4);gm.computeVertexNormals();
  const pp=gm.getAttribute('position'),uv=new Float32Array(pp.count*2);for(let k=0;k<pp.count;k++){uv[k*2]=(Math.atan2(pp.getZ(k),pp.getX(k))/Math.PI+1)*1.5;uv[k*2+1]=pp.getY(k)*1.2}gm.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  place(gm,{p:[Math.cos(a)*rr+lean*.35*h*.3,cy,Math.sin(a)*rr],s:[s,s,s]});parts.push(gm)}
 return THREE.BufferGeometryUtils.mergeGeometries(parts.map(prep))}

function instanced(geo,mat,list,{cast=false,receive=true}={}){if(!list.length)return null;const m=new THREE.InstancedMesh(geo,typeof mat==='string'?G.mat.get(mat):mat,list.length);
 list.forEach((it,i)=>{tmpE.set(it.rx||0,it.ry||0,it.rz||0,'YXZ');tmpQ.setFromEuler(tmpE);const s=it.s||1;tmpS.set(it.sx||s,it.sy||s,it.sz||s);tmpM.compose(tmpV.set(it.x,it.y,it.z),tmpQ,tmpS);m.setMatrixAt(i,tmpM);if(it.c)m.setColorAt(i,tmpC.set(it.c))});
 m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.castShadow=cast;m.receiveShadow=receive;m.computeBoundingSphere();return m}

// ---------- reusable props ----------
function stone(b,w,h,d,p,r,tint,R){const g=boxGeo(w,h,d,2,R?R()*3:0,R?R()*3:0);paint(g,tint||'#d6cab2',.08,(p[0]*13+p[2]*7)|0);place(g,{p,r});b.add('blocks',g)}
// Ruined stone arch with glowing cyan runes, red compass banners and hanging vines.
function arch(b,F,{x,y,z,rot=0,span=6,h=4.6,broken=false,seed=1,banners=true,runes=true}){
 const R=rng(seed),P=(lx,ly,lz)=>{const [rx,rz]=rot3(lx,lz,rot);return [x+rx,y+ly,z+rz]},tint=()=>shade('#ddd0b6',(R()-.5)*.1);
 for(const side of [-1,1]){const px=side*span/2,pillarH=broken&&side>0?h*.6:h;stone(b,1.3,.42,1.3,P(px,.21,0),[0,rot,0],tint(),R);let hh=.42;
  for(let i=0;i<4;i++){const bh=(pillarH-.78)/4;stone(b,.94+(R()-.5)*.06,bh-.03,.94+(R()-.5)*.06,P(px+(R()-.5)*.05,hh+bh/2,(R()-.5)*.05),[0,rot+(R()-.5)*.06,0],tint(),R);hh+=bh}
  if(!(broken&&side>0))stone(b,1.22,.34,1.22,P(px,pillarH-.19,0),[0,rot,0],tint(),R);else for(let i=0;i<3;i++)stone(b,.4+R()*.3,.3,.4+R()*.3,P(px+(R()-.5)*1.6,.15,(R()-.5)*1.6+.9),[0,R()*3,0],tint(),R);
  if(runes){const g=new THREE.BoxGeometry(.05,1.05,.5);place(g,{p:P(px-side*.49,1.65,0),r:[0,rot,0]});b.add('runes',g);const q=P(px-side*.62,1.65,0);F.glow(q[0],q[1],q[2],1.2,.45,1.2,1.4,.45)}
  if(banners&&!(broken&&side>0)){const g=new THREE.PlaneGeometry(.92,2.5,2,10);place(g,{p:P(px,pillarH-1.58,.52),r:[0,rot,0]});b.add('banner',g)}}
 const r=span/2,N=11;for(let i=0;i<N;i++){if(broken&&i>=N-4)continue;const a0=Math.PI*(1-(i+.5)/N),key=i===5;
  stone(b,Math.PI*r/N*.95,key?.82:.64,key?1.04:.92,P(Math.cos(a0)*r,h+Math.sin(a0)*r*.92,0),[0,rot,a0-Math.PI/2],tint(),R)}
 if(!broken){const g=new THREE.BoxGeometry(.42,.42,.05);place(g,{p:P(0,h+r*.92,.54),r:[0,rot,0]});b.add('runes',g);const q=P(0,h+r*.92,.62);F.glow(q[0],q[1],q[2],1.3,.5,1.4,1.6,.6)}
 for(let i=0;i<5;i++){const a0=Math.PI*(.15+.7*R());if(broken&&a0<Math.PI*.45)continue;const q=P(Math.cos(a0)*r,h+Math.sin(a0)*r*.92-.3,.47*(R()<.5?1:-1));F.vines.push({x:q[0],y:q[1],z:q[2],ry:rot,sy:1.2+R()*1.6,sx:1+R()*.5})}}
function lanternPost(b,F,x,y,z,rot=0,seed=1){const P=(lx,ly,lz)=>{const [rx,rz]=rot3(lx,lz,rot);return [x+rx,y+ly,z+rz]};
 let g=boxGeo(.16,1.9,.16,1);paint(g,'#8a6440');place(g,{p:P(0,.95,0),r:[0,rot,0]});b.add('wood',g);g=boxGeo(.55,.09,.09,1);paint(g,'#8a6440');place(g,{p:P(.2,1.82,0),r:[0,rot,0]});b.add('wood',g);
 g=boxGeo(.4,.24,.4,1);paint(g,'#8f6a40');place(g,{p:P(0,.12,0),r:[0,rot,0]});b.add('wood',g);
 const cx=.42,cy=1.48;for(const [dx,dz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){g=new THREE.BoxGeometry(.035,.36,.035);place(g,{p:P(cx+dx*.12,cy,dz*.12),r:[0,rot,0]});b.add('brass',g)}
 g=new THREE.ConeGeometry(.2,.16,4);place(g,{p:P(cx,cy+.25,0),r:[0,rot+Math.PI/4,0]});b.add('brass',g);g=new THREE.BoxGeometry(.28,.06,.28);place(g,{p:P(cx,cy-.2,0),r:[0,rot,0]});b.add('brass',g);
 g=new THREE.BoxGeometry(.2,.3,.2);place(g,{p:P(cx,cy,0),r:[0,rot,0]});b.add('glowWarm',g);const q=P(cx,cy,0);F.glow(q[0],q[1],q[2],.85,1,.62,.28,.55)}
function chest(b,x,y,z,rot){const P=(lx,ly,lz)=>{const [rx,rz]=rot3(lx,lz,rot);return [x+rx,y+ly,z+rz]};let g=boxGeo(1,.55,.62,1);paint(g,'#8c6239');place(g,{p:P(0,.28,0),r:[0,rot,0]});b.add('wood',g);
 g=new THREE.CylinderGeometry(.31,.31,1,10,1,false,0,Math.PI);paint(g,'#8c6239');place(g,{p:P(0,.55,0),r:[0,rot,Math.PI/2]});b.add('wood',g);
 for(const dx of [-.36,.36]){g=new THREE.BoxGeometry(.08,.58,.66);place(g,{p:P(dx,.29,0),r:[0,rot,0]});b.add('brass',g);g=new THREE.TorusGeometry(.32,.035,5,12,Math.PI);place(g,{p:P(dx,.55,0),r:[0,rot+Math.PI/2,0]});b.add('brass',g)}
 g=new THREE.BoxGeometry(.16,.2,.05);place(g,{p:P(0,.5,.33),r:[0,rot,0]});b.add('brass',g)}
function barrel(b,x,y,z,s=1){const pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push(new THREE.Vector2((.3+.06*Math.sin(t*Math.PI))*s,t*.82*s))}let g=new THREE.LatheGeometry(pts,12);paint(g,'#7c5634',.1);place(g,{p:[x,y,z]});b.add('wood',g);
 for(const t of [.15,.5,.85]){g=new THREE.TorusGeometry((.31+.05*Math.sin(t*Math.PI))*s,.022*s,4,16);place(g,{p:[x,y+t*.82*s,z],r:[Math.PI/2,0,0]});b.add('iron',g)}}
function scrolls(b,x,y,z,rot){for(let i=0;i<3;i++){const g=new THREE.CylinderGeometry(.12,.12,.9,10);paint(g,i%2?'#e6d3a8':'#d9c494');place(g,{p:[x+Math.cos(rot)*0,y+.12+(i===2?.21:0),z+(i-1)*.24*(i===2?0:1)+(i===2?0:0)],r:[0,rot,Math.PI/2]});b.add('vc',g)}}
// Rope fence between wooden posts along a cliff edge.
function fence(b,F,pts,y,seed){const R=rng(seed);for(let i=0;i<pts.length;i++){const [x,z]=pts[i];let g=boxGeo(.14,1,.14,1);paint(g,'#7d5a3a');place(g,{p:[x,y+.5,z],r:[0,R()*.3,0]});b.add('wood',g);
  if(i<pts.length-1){const [x2,z2]=pts[i+1];for(const hgt of [.88,.5]){const c=new THREE.CatmullRomCurve3([V3(x,y+hgt,z),V3((x+x2)/2,y+hgt-.16,(z+z2)/2),V3(x2,y+hgt,z2)]);const t=new THREE.TubeGeometry(c,8,.025,4);paint(t,'#b89464');b.add('vc',t)}}}}

// ---------- the far backdrop (built once) ----------
function buildBackdrop(){
 backdrop=new THREE.Group();backdrop.name='backdrop';G.scene.add(backdrop);const b=new Batch(),trees=[],waters=new Batch(),F={glow:(...a)=>mkGlow(bgGlow)(...a),vines:[],mist:(...a)=>seaPuff(...a)};
 bgGlow=new Billboards(140,G.tex.glow(),{additive:true,renderOrder:5});backdrop.add(bgGlow.mesh);
 // Sea of clouds below the islands.
 const sea=new THREE.Mesh(new THREE.PlaneGeometry(5000,5000),G.mat.get('sea'));sea.rotation.x=-Math.PI/2;sea.position.y=-27;backdrop.add(sea);
 seaClouds=new Billboards(170,G.tex.clouds(),{cols:2,rows:2,renderOrder:2});const R=rng(901),seaList=[];
 for(let i=0;i<110;i++){const z=40-R()*700,x=(R()-.5)*(260+(-z)*1.6),s=40+R()*90,y=-17-s*.2-R()*7;seaList.push([x,y,z,s,R()*4|0])}
 seaList.sort((a,b)=>a[2]-b[2]);for(const [x,y,z,s,f] of seaList)seaClouds.push(x,y,z,s,s*.5,1,1,1,.95,f);seaClouds.commit();backdrop.add(seaClouds.mesh);
 skyClouds=new Billboards(46,G.tex.clouds(),{cols:2,rows:2,fog:false,renderOrder:1});const skyList=[];
 for(let i=0;i<46;i++){const a=-Math.PI*.5+(R()-.5)*Math.PI*1.7,d=380+R()*520,y=20+R()*210+(R()<.3?-30:0),x=Math.cos(a)*d,z=Math.sin(a)*d;skyList.push([x,y,z,140+R()*260,R()*4|0])}
 skyList.sort((a,b)=>Math.hypot(b[0],b[2])-Math.hypot(a[0],a[2]));for(const [x,y,z,s,f] of skyList)skyClouds.push(x,y,z,s,s*.5,.97,.98,1,.92,f);skyClouds.commit();backdrop.add(skyClouds.mesh);
 // Snow-capped mountains far behind the islands.
 const mtns=[];const MR=rng(77);for(let i=0;i<13;i++){const x=-1100+i*185+(MR()-.5)*90,z=-1000-MR()*300,h=170+MR()*170,r=150+MR()*110;mtns.push(mountain(x,z,h,r,i+3))}
 const mg=THREE.BufferGeometryUtils.mergeGeometries(mtns);const mm=new THREE.Mesh(mg,new THREE.MeshLambertMaterial({vertexColors:true,fog:false}));backdrop.add(mm);
 // Floating islands all around the path, with trees, ruins and waterfalls.
 const spots=[[-46,-6,-18,15],[-78,4,-60,22],[-38,-14,-92,12],[-112,-2,-130,26],[-60,10,-175,18],[-30,-8,-150,10],[54,-8,-20,13],[86,2,-55,20],[48,-16,-80,11],[118,-4,-105,24],[70,8,-200,16],[-150,0,-20,20],[160,-6,-10,22],[-20,-20,-48,8],[24,-22,-36,7],[-95,14,-250,26],[130,12,-250,22],[0,-6,-230,18]];
 spots.forEach(([x,y,z,r],i)=>farIsland(b,waters,F,trees,{x,y,z,r,seed:200+i*7,ruins:i%3===0,water:i%2===0}));
 // A rope bridge between two of the nearer islands (like the concept art's middle ground).
 ropeBridge(b,[-31,-6.5,-18],[-22,-13.6,-48]);
 temple(b,waters,F,trees);
 b.build(backdrop,{cast:false,receive:true});waters.build(backdrop,{receive:false});
 const tv=[treeGeo(41,4.6,1.5,1),treeGeo(42,5.4,1.8,1)];geoCache.bgTrees=tv;for(let v=0;v<2;v++){const m=instanced(tv[v],'foliage',trees.filter(t=>t.v===v));if(m)backdrop.add(m)}
 bgGlow.commit();
 backdrop.traverse(o=>{if(o.material&&o.material.map===G.tex.water())o.renderOrder=3});
}
function mountain(x,z,h,r,seed){const g=new THREE.ConeGeometry(r,h,30,14),p=g.getAttribute('position'),R=rng(seed),C=new Float32Array(p.count*3),snow=col('#f3f6fb'),rock=col('#7f8ba3'),dark=col('#5a6680'),haze=col('#c4d6ea');
 for(let i=0;i<p.count;i++){tmpV.fromBufferAttribute(p,i);const t=(tmpV.y+h/2)/h,a=Math.atan2(tmpV.z,tmpV.x),ridge=fbm(a*2.2+seed,t*3,seed,4);
  const k=t>.98?0:1+(ridge-.5)*.9*(1-t*.5);tmpV.x*=k;tmpV.z*=k;tmpV.y+=(ridge-.5)*h*.12*(1-t);p.setXYZ(i,tmpV.x+x,tmpV.y+h/2-60,tmpV.z+z);
  const sn=t>.58+(ridge-.5)*.25;tmpC.copy(sn?snow:(ridge>.5?rock:dark));if(!sn)tmpC.lerp(snow,Math.max(0,t-.45)*.6);tmpC.lerp(haze,.5+(1-t)*.3);C[i*3]=tmpC.r;C[i*3+1]=tmpC.g;C[i*3+2]=tmpC.b}
 g.setAttribute('color',new THREE.BufferAttribute(C,3));g.deleteAttribute('uv');g.computeVertexNormals();return g.index?g.toNonIndexed():g}
function grassCap(hw,hd,x,y,z,seed,color='#5f8a35',e=2.4){const g=new THREE.CylinderGeometry(1,1.02,.9,36,1),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){tmpV.fromBufferAttribute(p,i);const a=Math.atan2(tmpV.z,tmpV.x),n=.985+(fbm(a*2+seed,1,seed,2)-.5)*.04,ca=Math.cos(a),sa=Math.sin(a);const rr=Math.hypot(tmpV.x,tmpV.z)>.01;
  if(rr){p.setX(i,Math.sign(ca)*Math.pow(Math.abs(ca),2/e)*hw*n);p.setZ(i,Math.sign(sa)*Math.pow(Math.abs(sa),2/e)*hd*n)}if(tmpV.y>0&&!rr)p.setY(i,.45+.25)}
 g.computeVertexNormals();paint(g,color,.14,seed);place(g,{p:[x,y-.45,z]});return g}
function farIsland(b,waters,F,trees,{x,y,z,r,seed,ruins,water}){const R=rng(seed),hw=r,hd=r*(.7+R()*.3);
 b.add('rockFar',islandRock({hw:hw*.98,hd:hd*.98,depth:r*(1+R()*.5),n:2.4,seed,y0:y-.4,x0:x,z0:z,segs:36,rings:9,moss:.1}));
 b.add('rockFar',grassCap(hw*.98,hd*.98,x,y+.2,z,seed,'#5f8a35',2.4));
 const nt=Math.max(2,r*.4|0);for(let i=0;i<nt;i++){const a=R()*TAU,d=Math.sqrt(R())*.8;trees.push({x:x+Math.cos(a)*hw*d,y:y+.1,z:z+Math.sin(a)*hd*d,ry:R()*TAU,s:(.7+R()*.7)*Math.min(1.6,r/12),v:R()<.5?0:1})}
 if(ruins){arch(b,F,{x:x+(R()-.5)*hw*.6,y:y+.1,z:z+(R()-.5)*hd*.4,rot:(R()-.5)*1.2,span:4+R()*3,h:3+R()*2,broken:R()<.5,seed,banners:false,runes:R()<.6})}
 if(water){const a=Math.PI*.5+(R()-.5)*1.3,wx=x+Math.cos(a)*hw*.92,wz=z+Math.sin(a)*hd*.92,w=1.4+R()*2.2,len=14+r*1.3;waterfall(waters,wx,y,wz,a,w,len,F)}}
function waterfall(waters,x,y,z,a,w,len,F){const g=new THREE.PlaneGeometry(w,len,1,8),p=g.getAttribute('position');for(let i=0;i<p.count;i++){const t=(len/2-p.getY(i))/len;p.setZ(i,p.getZ(i)+Math.sin(t*Math.PI*.5)*1.2+t*t*1.5)}
 const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/3,uv.getY(i)*len/10);g.computeVertexNormals();
 place(g,{p:[x+Math.cos(a)*.3,y-len/2+.2,z+Math.sin(a)*.3],r:[0,Math.PI/2-a,0]});waters.add('water',g);
 const bx=x+Math.cos(a)*2.8,bz=z+Math.sin(a)*2.8;F.mist?.(bx,y-len+1,bz,w)}
function seaPuff(x,y,z,w){if(!seaClouds)return;seaClouds.push(x,y,z,w*5,w*2.6,1,1,1,.85,(x*7+z*3|0)&3);seaClouds.commit()}
function ropeBridge(b,a,c){const n=22;for(let i=0;i<n;i++){const t=(i+.5)/n,sag=Math.sin(t*Math.PI)*2.2,x=a[0]+(c[0]-a[0])*t,y=a[1]+(c[1]-a[1])*t-sag,z=a[2]+(c[2]-a[2])*t,yaw=Math.atan2(c[0]-a[0],c[2]-a[2]);
  const g=boxGeo(2.1,.1,.55,1);paint(g,'#8a6440',.15,i);place(g,{p:[x,y,z],r:[0,yaw,0]});b.add('wood',g)}
 for(const side of [-1,1]){const yaw=Math.atan2(c[0]-a[0],c[2]-a[2]),ox=Math.cos(yaw)*side*1.05,oz=-Math.sin(yaw)*side*1.05,pts=[];for(let i=0;i<=12;i++){const t=i/12;pts.push(V3(a[0]+(c[0]-a[0])*t+ox,a[1]+(c[1]-a[1])*t-Math.sin(t*Math.PI)*2.2+1,a[2]+(c[2]-a[2])*t+oz))}
  const tg=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.05,4);paint(tg,'#b08a5c');b.add('vc',tg)}}
// The Skyheart temple: ruined towers around a giant golden ring, the goal you see from every island.
function temple(b,waters,F,trees){const x=34,y=3,z=-150,R=rng(555);
 b.add('rockFar',islandRock({hw:30,hd:22,depth:46,n:2.6,seed:555,y0:y-.4,x0:x,z0:z,segs:44,rings:11,moss:.08}));b.add('rockFar',grassCap(30,22,x,y+.2,z,556,'#628f37',2.6));
 const tint=()=>shade('#e6dcc6',(R()-.5)*.08);const towers=[[-9,30,4.2],[9,30,4.2],[-17,20,3.4],[17,22,3.4],[-24,13,3],[24,15,3],[0,9,6]];
 for(const [dx,hh,w] of towers){if(dx===0)continue;let yy=0;const segs=5;for(let i=0;i<segs;i++){const sh=hh/segs;stone(b,w-i*.12,sh-.1,w-i*.12,[x+dx,y+yy+sh/2,z],[0,(R()-.5)*.04,0],tint(),R);yy+=sh}
  for(let i=0;i<3;i++)stone(b,w*.35,1.5+R()*3,w*.35,[x+dx+(R()-.5)*w*.6,y+hh+.8,z+(R()-.5)*w*.6],[0,R(),0],tint(),R);
  for(let i=1;i<4;i++){const g=boxGeo(w*.32,2.2,.2,2);paint(g,'#3d3a3a');place(g,{p:[x+dx,y+hh*i/4,z+w/2+.02]});b.add('blocks',g)}}
 for(const [x1,x2,hh] of [[-9,9,21],[-17,-9,14],[9,17,15]]){const span=x2-x1-3.4,r=span/2,cx=x+(x1+x2)/2,N=9;for(let i=0;i<N;i++){const a0=Math.PI*(1-(i+.5)/N);stone(b,Math.PI*r/N*.95,1.1,2.6,[cx+Math.cos(a0)*r,y+hh+Math.sin(a0)*r*.8,z],[0,0,a0-Math.PI/2],tint(),R)}}
 for(let i=0;i<9;i++){const cx=x-20+i*5;stone(b,1.2,4.5+R()*3,1.2,[cx,y+2.5,z+15],[0,0,0],tint(),R)}
 // Golden Skyheart ring with radiating spikes, facing the islands.
 const ringY=y+34,rz=z+.5,g1=new THREE.TorusGeometry(8.5,.62,14,90);place(g1,{p:[x,ringY,rz]});b.add('gold',g1);const g2=new THREE.TorusGeometry(7.2,.22,8,90);place(g2,{p:[x,ringY,rz]});b.add('gold',g2);
 for(let i=0;i<16;i++){const a=i/16*TAU,L=i%2?2.2:3.6,g=new THREE.ConeGeometry(.42,L,6);place(g,{p:[x+Math.cos(a)*(9.1+L/2),ringY+Math.sin(a)*(9.1+L/2),rz],r:[0,0,a-Math.PI/2]});b.add('gold',g)}
 for(let i=0;i<4;i++){const a=i/4*TAU+Math.PI/4,g=new THREE.BoxGeometry(.25,7,.25);place(g,{p:[x+Math.cos(a)*3.6,ringY+Math.sin(a)*3.6,rz],r:[0,0,a+Math.PI/2]});b.add('gold',g)}
 F.glow(x,ringY,rz+.5,24,.45,.34,.17,.6);F.glow(x,ringY,rz+.6,8,.75,.62,.38,.7);F.glow(x,ringY,rz+.7,3,1.1,1,.8,.9);
 for(let i=0;i<24;i++){const a=i/24*TAU;F.glow(x+Math.cos(a)*8.5,ringY+Math.sin(a)*8.5,rz+1,2.6,.9,.65,.3,.3)}
 waterfall(waters,x-12,y,z+20,Math.PI/2,6,48,F);waterfall(waters,x+6,y,z+21,Math.PI/2,4.5,52,F);waterfall(waters,x-26,y,z+12,Math.PI*.62,3,40,F);
 for(let i=0;i<26;i++){const a=R()*TAU,d=.5+R()*.45;const tx=x+Math.cos(a)*27*d,tz=z+Math.sin(a)*19*d;if(Math.abs(tx-x)<12&&Math.abs(tz-z)<6)continue;trees.push({x:tx,y:y+.1,z:tz,ry:R()*TAU,s:1.1+R()*.8,v:R()<.5?0:1})}}

// ---------- one mission's islands (rebuilt when a mission starts) ----------
// Sun shafts: long soft additive planes along the light direction that turn to face the camera around their own axis.
let shafts=[];
function shaftTex(){if(G.tex._shaft)return G.tex._shaft;const c=makeCanvas(64,256),g=c.getContext('2d'),img=g.createImageData(64,256);
 for(let y=0;y<256;y++)for(let x=0;x<64;x++){const u=x/63,v=y/255,a=Math.pow(Math.sin(u*Math.PI),2)*Math.pow(Math.sin(v*Math.PI),1.4)*(.75+.25*Math.sin(u*19+v*3)),i=(y*64+x)*4;img.data[i]=255;img.data[i+1]=236;img.data[i+2]=196;img.data[i+3]=a*255}
 g.putImageData(img,0,0);return G.tex._shaft=canvasTexture(c,{repeat:false})}
function addShafts(group,list){const L=G.sunDir.clone().negate();const mat=new THREE.MeshBasicMaterial({map:shaftTex(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:true,toneMapped:false});
 for(const [x,y,z,w,len,a] of list){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,len),mat.clone());m.material.opacity=a;m.position.set(x,y,z);m.userData.axis=L;m.renderOrder=7;m.frustumCulled=false;group.add(m);shafts.push(m)}}
const keepClear=[];
function clearAt(x,z,r){return keepClear.every(([cx,cz,cr])=>Math.hypot(x-cx,z-cz)>r+cr)}
function buildLevel(M){
 if(level){level.traverse(o=>{if(o.isInstancedMesh)o.dispose();else if(o.geometry&&!o.userData.shared)o.geometry.dispose()});G.scene.remove(level)}
 level=new THREE.Group();level.name='level';G.scene.add(level);shafts=[];lvGlow=new Billboards(220,G.tex.glow(),{additive:true,renderOrder:6});level.add(lvGlow.mesh);
 const b=new Batch(),ground=new Batch(),waters=new Batch(),F={glow:(...a)=>mkGlow(lvGlow)(...a),vines:[]},R=rng(1000+M.name.length*31+M.p.length),plats=M.p;
 keepClear.length=0;keepClear.push([0,3,1.6],[M.exit[0],M.exit[2],2.4]);for(const k of ['relics','nodes','anchors','rescues','enemies'])for(const p of (M[k]||[]))keepClear.push([p[0],p[2],k==='enemies'?2.4:1.4]);if(M.boss)keepClear.push([M.boss[0],M.boss[2],3.5]);
 const tufts=[],lupines=[],daisies=[],curbs=[],trees=[],vines=F.vines;
 plats.forEach((pl,i)=>{const [x,z,w,d,y]=pl,seed=i*97+M.p.length*13+(M.name.charCodeAt(0)|0);
  // Paved plaza top with world-aligned UVs so the flagstones continue naturally.
  const top=new THREE.PlaneGeometry(w,d);top.rotateX(-Math.PI/2);top.translate(x,y,z);const pp=top.getAttribute('position'),uv=top.getAttribute('uv');for(let k=0;k<pp.count;k++)uv.setXY(k,pp.getX(k)/4,-pp.getZ(k)/4);ground.add('paving',top);
  for(const [sw,sx,sz,ry] of [[d,x+w/2,z,Math.PI/2],[d,x-w/2,z,-Math.PI/2],[w,x,z+d/2,0],[w,x,z-d/2,Math.PI]]){const g=new THREE.PlaneGeometry(sw,.82,4,1);const u=g.getAttribute('uv');for(let k=0;k<u.count;k++)u.setXY(k,u.getX(k)*sw/4,u.getY(k)*.2);paint(g,'#a48a6c',.12,seed+sw|0);place(g,{p:[sx,y-.41,sz],r:[0,ry,0]});ground.add('rock',g)}
  ground.add('rock',islandRock({hw:w/2*.995,hd:d/2*.995,depth:6+Math.min(w,d)*.65,n:7,seed:seed+5,y0:y-.8,x0:x,z0:z,segs:56,rings:11,moss:.05}));
  // Openings in the curb where the path continues to the neighbouring island.
  const openings=[];if(i>0)openings.push(['near',(x+plats[i-1][0])/2]);if(i<plats.length-1)openings.push(['far',(x+plats[i+1][0])/2]);
  const isOpen=(edge,px)=>openings.some(([e,ox])=>e===edge&&Math.abs(px-ox)<2.3);
  const edges=[['near',x-w/2,z+d/2,x+w/2,z+d/2],['far',x-w/2,z-d/2,x+w/2,z-d/2],['left',x-w/2,z-d/2,x-w/2,z+d/2],['right',x+w/2,z-d/2,x+w/2,z+d/2]];
  for(const [edge,x1,z1,x2,z2] of edges){const L=Math.hypot(x2-x1,z2-z1),dx=(x2-x1)/L,dz=(z2-z1)/L,nx=edge==='near'?0:edge==='far'?0:edge==='left'?1:-1,nz=edge==='near'?-1:edge==='far'?1:0;let s=.15;
   while(s<L-.3){const len=.7+R()*.6,cxp=x1+dx*(s+len/2),czp=z1+dz*(s+len/2);if(!isOpen(edge,cxp)){const dep=.3+R()*.1,hh=.16+R()*.14;curbs.push({x:cxp+nx*dep/2,y:y+hh/2-.02,z:czp+nz*dep/2,ry:Math.atan2(dx,dz)+Math.PI/2+(R()-.5)*.07,sx:len,sy:hh,sz:dep,c:shade('#cfc2a8',(R()-.5)*.12)});
     if(R()<.75)for(let k=0;k<1+R()*2;k++){const inset=.45+R()*1.1;tufts.push({x:cxp+nx*inset+(R()-.5)*.6,y,z:czp+nz*inset+(R()-.5)*.6,ry:R()*TAU,s:.8+R()*.7})}
     if(R()<.42)vines.push({x:cxp-nx*.03,y:y-.02,z:czp-nz*.03,ry:Math.atan2(-nx,-nz),sy:1.3+R()*2.8,sx:1+R()*.6})}
    s+=len+.05}}
  // Flower beds and extra grass at the corners, kept away from the walking line.
  for(const [cx,cz] of [[x-w/2+1.1,z+d/2-1.1],[x+w/2-1.1,z+d/2-1.1],[x-w/2+1.1,z-d/2+1.1],[x+w/2-1.1,z-d/2+1.1]]){if(!clearAt(cx,cz,.8))continue;
   for(let k=0;k<6;k++){const a=R()*TAU,r=R()*1.1;tufts.push({x:cx+Math.cos(a)*r,y,z:cz+Math.sin(a)*r,ry:R()*TAU,s:.9+R()*.8})}
   for(let k=0;k<5;k++){const a=R()*TAU,r=R()*.9;lupines.push({x:cx+Math.cos(a)*r,y,z:cz+Math.sin(a)*r,ry:R()*TAU,s:.75+R()*.7})}
   for(let k=0;k<7;k++){const a=R()*TAU,r=R()*1.2;daisies.push({x:cx+Math.cos(a)*r,y,z:cz+Math.sin(a)*r,ry:R()*TAU,s:.8+R()*.6})}}
  for(let k=0;k<Math.floor(w*d/14);k++){const tx=x+(R()-.5)*(w-1),tz=z+(R()-.5)*(d-1);if(clearAt(tx,tz,.6))tufts.push({x:tx,y,z:tz,ry:R()*TAU,s:.45+R()*.35})}
  // Trees, lanterns and ruins along the sides.
  for(const side of [-1,1]){const tz=z-d*(.05+R()*.3),tx=x+side*(w/2-.65);if(w>=12&&clearAt(tx,tz,1.4)&&R()<.8)trees.push({x:tx,y,z:tz,ry:R()*TAU,s:.55+R()*.18,v:R()<.5?0:1})}
  for(const side of [-1,1]){const lx=x+side*(w/2-.55),lz=z-d/2+.7;if(clearAt(lx,lz,.6))lanternPost(b,F,lx,y,lz,side>0?Math.PI:0,seed+side)}
  if(i===0){compassFloor(ground,x,y,z-d*.07);{const ax=(x+(plats[1]?plats[1][0]:x))/2,az=z-d/2+1.15,L=G.sunDir;addShafts(level,[[ax-.6,y+3.2,az,1.6,14,.26],[ax+.8,y+2.8,az+.2,1,12,.2],[ax-1.9,y+3.6,az-.3,.8,13,.16],[ax+2.4,y+2.4,az+.6,1.3,10,.13]].map(([sx,sy,sz,w,len,a])=>[sx+L.x*len*.25,sy+L.y*len*.25,sz+L.z*len*.25,w,len,a]))}arch(b,F,{x:(x+(plats[1]?plats[1][0]:x))/2,y,z:z-d/2+1.15,span:6.4,h:4.9,seed:seed+1});chest(b,x-w/2+1.4,y,z+d/2-2.2,Math.PI/2);barrel(b,x-w/2+1.2,y,z+d/2-3.4);barrel(b,x-w/2+1.9,y,z+d/2-3.7,.85);scrolls(b,x-w/2+1.3,y,z+d/2-4.6,0);
   fence(b,F,[[x+w/2-.35,z+d/2-.4],[x+w/2-.35,z+d/2-2.4],[x+w/2-.35,z+d/2-4.4]],y,seed)}
  else if(i<plats.length-1){if(R()<.7)arch(b,F,{x:x+(R()<.5?-1:1)*(w/2-.9),y,z:z+(R()-.5)*d*.3,rot:Math.PI/2,span:3.4,h:3.2,broken:R()<.5,seed:seed+2,banners:R()<.6});
   for(let k=0;k<2;k++){const ox=x+(R()<.5?-1:1)*(w/2-.9),oz=z+(R()-.5)*d*.6;if(clearAt(ox,oz,.9))stone(b,.8,.5+R()*1.6,.8,[ox,y+.5,oz],[0,R()*3,0],'#d2c5ab',R)}}
  if(i%2===1||plats.length===1){const side=R()<.5?-1:1,a=side>0?0:Math.PI,wz=z+(R()-.5)*d*.4;waterfall(waters,x+side*(w/2-.1),y-.55,wz,a,1.5+R(),15,F)}
  if(i===plats.length-1){const [ex,ey,ez]=M.exit;arch(b,F,{x:ex-4.2,y,z:ez+1.2,rot:Math.PI/2,span:2.6,h:2.8,broken:true,seed:seed+9,banners:false})}});
 for(const pl of (M.hidden||[]))keepClear.push([pl[0],pl[1],1]);
 b.build(level,{cast:true,receive:true});ground.build(level,{cast:false,receive:true});waters.build(level,{receive:false});
 level.traverse(o=>{if(o.material===G.mat.get('water'))o.renderOrder=3});
 if(!geoCache.tuft){geoCache.tuft=tuftGeo(5);geoCache.lupine=lupineGeo(8);geoCache.daisy=daisyGeo(9);geoCache.trees=[treeGeo(11,4.4,1.45),treeGeo(12,5,1.65)];geoCache.curb=new THREE.RoundedBoxGeometry(1,1,1,1,.1);geoCache.vine=new THREE.PlaneGeometry(.5,1,1,4).translate(0,-.5,0)}
 const dens=G.grassDensity,thin=list=>list.filter((_,k)=>(k*0.6180339887)%1<dens);
 const add=(m)=>{if(m){m.userData.sharedGeometry=true;level.add(m)}};
 const curbMat=G.mat._curb||(G.mat._curb=new THREE.MeshStandardMaterial({map:G.tex.rock(),roughness:.92}));
 add(instanced(geoCache.curb,curbMat,curbs,{cast:true}));add(instanced(geoCache.tuft,'grass',thin(tufts)));add(instanced(geoCache.lupine,'vc',lupines));add(instanced(geoCache.daisy,'vc',daisies));
 for(let v=0;v<2;v++)add(instanced(geoCache.trees[v],'foliage',trees.filter(t=>t.v===v),{cast:true}));add(instanced(geoCache.vine,'vine',vines));
 level.traverse(o=>{if(o.isInstancedMesh)o.userData.shared=true});
 lvGlow.commit();
}
function compassFloor(ground,x,y,z){const g=new THREE.CircleGeometry(2.6,64);g.rotateX(-Math.PI/2);g.rotateY(Math.PI/8);g.translate(x,y+.012,z);ground.add('compass',g);mkGlow(lvGlow)(x,y+.3,z,2.2,.35,1.3,1.6,.45)}

// ---------- mission objects (relics, beacons, creatures, guardian, gate) ----------
function M3(geo,mat,parent,{p=[0,0,0],r=[0,0,0],s=[1,1,1],cast=true}={}){const m=new THREE.Mesh(geo,typeof mat==='string'?G.mat.get(mat):mat);m.position.set(...p);m.rotation.set(...r);m.scale.set(...s);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m}
function stdMat(c,o={}){return new THREE.MeshStandardMaterial({color:c,roughness:.6,...o})}
function buildDynamic(M,s){
 if(dyn){const shared=new Set(Object.values(G.mat)),ms=new Set();dyn.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)ms.add(o.material)});ms.forEach(m=>{if(!shared.has(m))m.dispose()});G.scene.remove(dyn.group)}
 const group=new THREE.Group();group.name='dynamic';G.scene.add(group);dyn={group,relics:[],nodes:[],anchors:[],rescue:[],enemies:[],boss:null,gate:null,rings:[],parts:[],seen:new WeakSet(),paws:null,bridge:null,beam:null};
 fxGlow=fxGlow||new Billboards(260,G.tex.glow(),{additive:true,renderOrder:8});fxSpark=fxSpark||new Billboards(260,G.tex.spark(),{additive:true,renderOrder:9});G.scene.add(fxGlow.mesh,fxSpark.mesh);
 const cyanCore=()=>{const m=stdMat('#62e9ff',{emissive:new THREE.Color('#38d8ff'),emissiveIntensity:2.2,roughness:.2,metalness:.1});m.userData.own=true;return m};
 // Compass fragment relics: a gold arc piece holding a blue crystal.
 for(const r of s.relics){const g=new THREE.Group();g.visible=!r.got;g.scale.setScalar(1.45);M3(new THREE.TorusGeometry(.3,.07,8,28,Math.PI*.75),'gold',g,{r:[0,0,Math.PI*.12]});M3(new THREE.OctahedronGeometry(.16),cyanCore(),g,{s:[1,1.5,1]});M3(new THREE.ConeGeometry(.07,.2,4),'gold',g,{p:[0,.38,0]});group.add(g);dyn.relics.push(g)}
 // Resonance beacons: carved pedestal, rune panel and a brass orrery around a glowing orb.
 for(const n of s.nodes){const g=new THREE.Group();g.position.set(n.p[0],n.p[1],n.p[2]);const b=new Batch();
  let q=boxGeo(1.15,.36,1.15,2);paint(q,'#d6c9ae');place(q,{p:[0,.18,0]});b.add('blocks',q);q=new THREE.CylinderGeometry(.36,.42,1.15,10);paint(q,'#d9ccb2');place(q,{p:[0,.93,0]});b.add('blocks',q);q=boxGeo(.95,.18,.95,2);paint(q,'#d6c9ae');place(q,{p:[0,1.58,0]});b.add('blocks',q);
  q=new THREE.BoxGeometry(.36,.6,.04);place(q,{p:[0,.95,.4]});b.add('runes',q);b.build(g,{cast:true});
  const orb=M3(new THREE.SphereGeometry(.19,20,14),cyanCore(),g,{p:[0,2.05,0]});const rings=[];for(let k=0;k<3;k++){const ring=M3(new THREE.TorusGeometry(.42-k*.07,.028,6,36),'brass',g,{p:[0,2.05,0]});rings.push(ring)}
  const pips=[];for(let k=0;k<n.i+1;k++)pips.push(M3(new THREE.OctahedronGeometry(.07),cyanCore(),g,{p:[(k-n.i/2)*.17,1.36,.39]}));
  group.add(g);dyn.nodes.push({g,orb,rings,pips})}
 // Grapple anchors: brass post with a hook ring and a crystal.
 for(const a of s.anchors){const g=new THREE.Group();g.position.set(...a.p);M3(new THREE.CylinderGeometry(.75,.85,.14,16),'gold',g,{p:[0,.07,0]});M3(new THREE.CylinderGeometry(.11,.14,2.4,8),'brass',g,{p:[0,1.25,0]});
  M3(new THREE.TorusGeometry(.34,.06,8,24),'gold',g,{p:[0,2.62,0]});const c=M3(new THREE.OctahedronGeometry(.17),cyanCore(),g,{p:[0,2.62,0],s:[1,1.4,1]});group.add(g);dyn.anchors.push({g,c})}
 // Stranded sky-fox kits (cute, big ears) waiting to be rescued.
 for(const r of s.rescue){const g=new THREE.Group();g.position.set(...r.p);const fur=stdMat('#e0a364',{roughness:.85}),cream=stdMat('#f6e6cc',{roughness:.85}),dark=stdMat('#2a2321',{roughness:.3});
  M3(new THREE.SphereGeometry(.3,16,12),fur,g,{p:[0,.32,0],s:[1,.9,1.15]});M3(new THREE.SphereGeometry(.2,12,10),cream,g,{p:[0,.3,.17],s:[1,1,.6]});const head=new THREE.Group();head.position.set(0,.72,.12);g.add(head);
  M3(new THREE.SphereGeometry(.24,16,12),fur,head);M3(new THREE.SphereGeometry(.13,12,10),cream,head,{p:[0,-.07,.17],s:[1,.75,1]});M3(new THREE.SphereGeometry(.035,8,6),dark,head,{p:[0,-.04,.3]});
  for(const sd of [-1,1]){M3(new THREE.ConeGeometry(.1,.34,8),fur,head,{p:[sd*.15,.25,-.02],r:[0,0,-sd*.28]});M3(new THREE.ConeGeometry(.055,.22,6),cream,head,{p:[sd*.15,.23,.03],r:[0,0,-sd*.28]});M3(new THREE.SphereGeometry(.045,8,6),dark,head,{p:[sd*.09,.03,.2]})}
  const tail=M3(new THREE.ConeGeometry(.12,.55,10),fur,g,{p:[0,.38,-.38],r:[-1.1,0,0]});M3(new THREE.SphereGeometry(.07,8,6),cream,tail,{p:[0,.28,0]});g.visible=!r.done;group.add(g);dyn.rescue.push({g,head,tail})}
 // Corrupted scouts: hovering stone-and-bronze beetles with one hot eye.
 for(const e of s.enemies){const g=new THREE.Group(),shell=stdMat('#6b6157',{roughness:.8}),bronze=stdMat('#9a6a3a',{metalness:.7,roughness:.4}),eye=stdMat('#ff7d4a',{emissive:new THREE.Color('#ff5a2a'),emissiveIntensity:2.4});eye.userData.own=true;
  M3(new THREE.SphereGeometry(.5,18,12),shell,g,{p:[0,0,0],s:[1,.58,1.18]});M3(new THREE.TorusGeometry(.48,.07,6,24),bronze,g,{r:[Math.PI/2,0,0],s:[1,1.2,1]});M3(new THREE.BoxGeometry(.06,.3,.9),bronze,g,{p:[0,.26,0]});
  const ey=M3(new THREE.SphereGeometry(.15,14,10),eye,g,{p:[0,.02,.55]});for(const sd of [-1,1])for(const k of [-1,1])M3(new THREE.CylinderGeometry(.035,.02,.45,5),bronze,g,{p:[sd*.38,-.32,k*.25],r:[k*.4,0,sd*.6]});
  for(const sd of [-1,1])M3(new THREE.BoxGeometry(.5,.04,.22),bronze,g,{p:[sd*.55,.18,-.1],r:[0,0,sd*.35]});group.add(g);dyn.enemies.push({g,eye:ey})}
 // The Skyheart Guardian: an ancient stone-and-bronze golem with a glowing resonance core and visor.
 if(s.boss){const g=new THREE.Group();g.position.set(...s.boss.p);const stoneM=new THREE.MeshStandardMaterial({color:'#c9bca2',roughness:.88,map:G.tex.blocks().map,bumpMap:G.tex.blocks().bump,bumpScale:1.2}),bronze=stdMat('#b07a3e',{metalness:.8,roughness:.32}),dark=stdMat('#3b3631',{roughness:.6,metalness:.3}),core=cyanCore(),visor=cyanCore();
  const RB=(w,h,d,r)=>new THREE.RoundedBoxGeometry(w,h,d,3,r);const body=new THREE.Group();body.position.y=2.35;g.add(body);
  M3(RB(2.5,2.1,1.6,.35),stoneM,body);M3(RB(2.9,.7,1.85,.25),stoneM,body,{p:[0,.85,0]});M3(new THREE.BoxGeometry(2.62,.2,1.7),bronze,body,{p:[0,.38,0]});M3(new THREE.BoxGeometry(2.55,.2,1.66),bronze,body,{p:[0,-.75,0]});
  for(const sd of [-1,1])M3(new THREE.ConeGeometry(.22,.6,6),bronze,body,{p:[sd*1.25,1.35,0],r:[0,0,-sd*.5]});
  const coreM=M3(new THREE.SphereGeometry(.42,24,16),core,body,{p:[0,-.05,.72]});M3(new THREE.TorusGeometry(.52,.1,10,32),bronze,body,{p:[0,-.05,.78]});
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;M3(new THREE.BoxGeometry(.08,.2,.08),bronze,body,{p:[Math.cos(a)*.66,-.05+Math.sin(a)*.66,.78],r:[0,0,a+Math.PI/2]})}
  const head=new THREE.Group();head.position.set(0,1.55,.15);body.add(head);M3(RB(1.25,.95,1.05,.22),stoneM,head);M3(new THREE.BoxGeometry(1.32,.16,1.1),bronze,head,{p:[0,.36,0]});
  M3(new THREE.BoxGeometry(.95,.2,.12),dark,head,{p:[0,0,.52]});M3(new THREE.BoxGeometry(.85,.11,.06),visor,head,{p:[0,0,.58]});for(const sd of [-1,1])M3(new THREE.ConeGeometry(.12,.5,5),bronze,head,{p:[sd*.5,.62,0],r:[0,0,-sd*.35]});
  const arms=[];for(const sd of [-1,1]){const sh=new THREE.Group();sh.position.set(sd*1.62,.6,0);body.add(sh);M3(new THREE.SphereGeometry(.58,18,12),stoneM,sh);M3(new THREE.TorusGeometry(.5,.08,8,20),bronze,sh,{r:[0,Math.PI/2,0]});
   M3(new THREE.CylinderGeometry(.34,.3,1.3,12),stoneM,sh,{p:[0,-.85,0]});M3(new THREE.TorusGeometry(.36,.07,8,18),bronze,sh,{p:[0,-.6,0],r:[Math.PI/2,0,0]});
   M3(RB(.95,.9,.95,.22),stoneM,sh,{p:[0,-1.85,.08]});M3(new THREE.BoxGeometry(1,.16,1),bronze,sh,{p:[0,-1.5,.08]});arms.push(sh)}
  for(const sd of [-1,1]){M3(RB(.9,1.3,1.05,.2),stoneM,g,{p:[sd*.72,.65,0]});M3(new THREE.BoxGeometry(.95,.14,1.1),bronze,g,{p:[sd*.72,1.05,0]});M3(RB(1.05,.3,1.3,.1),dark,g,{p:[sd*.72,.12,.1]})}
  const shields=[];for(let k=0;k<3;k++)shields.push(M3(new THREE.OctahedronGeometry(.22),'gold',g,{p:[(k-1)*.65,5.1,0]}));
  const wave=new THREE.Mesh(new THREE.RingGeometry(.9,1,64),new THREE.MeshBasicMaterial({color:new THREE.Color('#ffae6a').multiplyScalar(1.5),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));wave.rotation.x=-Math.PI/2;wave.position.y=.08;g.add(wave);
  const base=new THREE.Mesh(new THREE.RingGeometry(3.2,3.5,64),new THREE.MeshBasicMaterial({color:'#e0b45c',transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide}));base.rotation.x=-Math.PI/2;base.position.y=.03;g.add(base);
  group.add(g);dyn.boss={g,body,arms,coreM,core,visor,shields,wave,head}}
 // The golden Skyheart gate at the exit.
 {const [x,y,z]=M.exit,g=new THREE.Group();g.position.set(x,y,z);const b=new Batch();
  for(const sd of [-1,1]){let q=boxGeo(.95,3.6,.95,2);paint(q,'#dacdb3');place(q,{p:[sd*1.75,1.8,0]});b.add('blocks',q);q=boxGeo(1.25,.4,1.25,2);paint(q,'#dacdb3');place(q,{p:[sd*1.75,.2,0]});b.add('blocks',q);q=boxGeo(1.2,.3,1.2,2);paint(q,'#dacdb3');place(q,{p:[sd*1.75,3.7,0]});b.add('blocks',q)}
  let q=boxGeo(4.6,.5,1.05,2);paint(q,'#dacdb3');place(q,{p:[0,4.05,0]});b.add('blocks',q);q=new THREE.TorusGeometry(1.32,.13,10,64);place(q,{p:[0,1.75,0]});b.add('gold',q);q=new THREE.TorusGeometry(1.12,.05,6,64);place(q,{p:[0,1.75,.04]});b.add('gold',q);
  for(let i=0;i<8;i++){const a=i/8*TAU,L=i%2?.35:.55;q=new THREE.ConeGeometry(.09,L,5);place(q,{p:[Math.cos(a)*(1.45+L/2),1.75+Math.sin(a)*(1.45+L/2),0],r:[0,0,a-Math.PI/2]});b.add('gold',q)}
  q=new THREE.OctahedronGeometry(.3);place(q,{p:[0,4.55,0],s:[1,1.4,.5]});b.add('gold',q);b.build(g,{cast:true});
  const portal=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:{value:0},uOn:{value:0}},
   vertexShader:'varying vec2 vP;void main(){vP=position.xy/1.25;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`uniform float uTime,uOn;varying vec2 vP;void main(){float r=length(vP),a=atan(vP.y,vP.x);float sw=sin(a*5.+r*10.-uTime*3.)*.5+.5;
    vec3 on=mix(vec3(.25,.75,1.),vec3(1.,.86,.5),sw*smoothstep(.15,1.,r))+vec3(.9,1.,1.)*pow(1.-r,3.)*2.;vec3 off=mix(vec3(.30,.36,.38),vec3(.4,.46,.47),sw*.3)*(1.-r*.3)+vec3(.2,.8,.9)*.25*step(.55,fract(r*4.+a*.3))*step(r,.95);
    vec3 c=mix(off,on,uOn);float al=mix(.97,.85,uOn)*smoothstep(1.,.96,r);gl_FragColor=vec4(c,al);
    #include <colorspace_fragment>
    }`});portal.userData.own=true;const disc=new THREE.Mesh(new THREE.CircleGeometry(1.25,48),portal);disc.position.set(0,1.75,0);g.add(disc);group.add(g);dyn.gate={g,portal}}
 // Spectral bridge revealed by Ranger's scent.
 if(M.hidden&&M.hidden.length){const g=new THREE.Group(),pm=new THREE.MeshStandardMaterial({color:'#4cc9f0',emissive:new THREE.Color('#18b4ff'),emissiveIntensity:1.5,transparent:true,opacity:.72,roughness:.3,depthWrite:false});
  for(const [x,z,w,d,y] of M.hidden){const n=Math.max(4,Math.round(d/.55));for(let i=0;i<n;i++){const pz=z-d/2+(i+.5)*d/n;M3(new THREE.BoxGeometry(w*.92,.09,d/n*.82),pm,g,{p:[x,y-.05,pz],r:[0,(i%2-.5)*.03,0],cast:false})}
   for(const sd of [-1,1])M3(new THREE.BoxGeometry(.07,.07,d),pm,g,{p:[x+sd*w*.47,y+.7,z],cast:false});for(let i=0;i<=4;i++)for(const sd of [-1,1])M3(new THREE.CylinderGeometry(.04,.04,.75,5),pm,g,{p:[x+sd*w*.47,y+.33,z-d/2+i*d/4],cast:false})}
  g.visible=false;group.add(g);dyn.bridge={g,mat:pm,fade:0}}
 // Effect rings, grapple beam and scent paw trail.
 for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.RingGeometry(.86,1,64),new THREE.MeshBasicMaterial({color:'#8ff4ff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.visible=false;m.userData.ownMat=true;group.add(m);dyn.rings.push({m,e:null})}
 dyn.beam=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1,6,1,true),new THREE.MeshBasicMaterial({color:new THREE.Color('#8ff8ff').multiplyScalar(2),transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));dyn.beam.visible=false;group.add(dyn.beam);
 const pawMat=new THREE.MeshBasicMaterial({map:G.tex.paw(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:'#8ff4ff'});dyn.paws=new THREE.InstancedMesh(new THREE.PlaneGeometry(.34,.34).rotateX(-Math.PI/2),pawMat,24);dyn.paws.count=0;dyn.paws.frustumCulled=false;group.add(dyn.paws);
 dyn.pillar=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,6,12,1,true),new THREE.MeshBasicMaterial({color:'#5fe8ff',transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));dyn.pillarMeshes=[];
 for(let i=0;i<s.relics.length;i++){const p=dyn.pillar.clone();p.visible=false;group.add(p);dyn.pillarMeshes.push(p)}
}

// Short-lived sparkle particles.
function burst(p,color,n,speed,size,life){const c=new THREE.Color(color);for(let i=0;i<n;i++){const a=Math.random()*TAU,u=Math.random()*2-1,s=Math.sqrt(1-u*u),v=speed*(.4+Math.random()*.6);dyn.parts.push({p:[p[0],p[1],p[2]],v:[Math.cos(a)*s*v,Math.abs(u)*v+speed*.3,Math.sin(a)*s*v],life,max:life,size:size*(.6+Math.random()*.6),c})}}

// ---------- per-frame update ----------
function update(dt,s){if(!dyn)return;const t=s.t;
 for(const m of shafts){const ax=m.userData.axis,toCam=tmpV.copy(G.camera.position).sub(m.position),right=new THREE.Vector3().crossVectors(ax,toCam).normalize(),nrm=new THREE.Vector3().crossVectors(right,ax);tmpM.makeBasis(right,ax,nrm);m.quaternion.setFromRotationMatrix(tmpM);m.material.opacity=m.userData.a??(m.userData.a=m.material.opacity);m.material.opacity=m.userData.a*(.85+.15*Math.sin(t*.7+m.position.x))}G.windTime.value=t;G.tex.water().offset.y=(t*.85)%1;fxGlow.clear();fxSpark.clear();const glow=mkGlow(fxGlow);
 // relics
 dyn.relics.forEach((g,i)=>{const r=s.relics[i],vis=!r.got&&!(r.secret&&!s.hidden&&s.scent<=0);if(r.got&&g.visible&&!g.userData.burst){g.userData.burst=1;burst(r.p,'#ffe08a',22,3.2,.35,.9)}g.visible=vis;dyn.pillarMeshes[i].visible=vis&&s.scent>0;
  if(!vis)return;const y=r.p[1]+Math.sin(t*2.7+r.p[0])*.17;g.position.set(r.p[0],y,r.p[2]);g.rotation.y=t*1.6;glow(r.p[0],y,r.p[2],1.25,.95,.72,.28,.6);glow(r.p[0],y,r.p[2],.5,.4,1.2,1.5,.8);
  if(Math.random()<dt*3)fxSpark.push(r.p[0]+(Math.random()-.5)*.6,y+(Math.random()-.5)*.6,r.p[2]+(Math.random()-.5)*.6,.18,.18,2,1.8,1.1,1);
  const pm=dyn.pillarMeshes[i];pm.position.set(r.p[0],r.p[1]+2.2,r.p[2]);pm.material.opacity=.14+.06*Math.sin(t*6)});
 // beacons
 dyn.nodes.forEach((n,i)=>{const st=s.nodes[i],target=s.boss&&s.boss.hp>0&&i===s.boss.phase,on=st.on,dim=s.boss&&!on&&!target,c=on?'#4fe6ff':dim?'#7d8a8c':'#ffcf6a';
  n.orb.material.color.set(c);n.orb.material.emissive.set(c);n.orb.material.emissiveIntensity=on?2.6:dim?.35:1.6+.6*Math.sin(t*4);n.pips.forEach(p=>{p.material.emissive.set(c);p.material.color.set(c)});
  const sp=on?2.2:.55;n.rings.forEach((r,k)=>{r.rotation.set(t*sp*(k+1)*.7,t*sp*(k%2?-1:1),k*.8)});const p=st.p;const cc=new THREE.Color(c);if(!dim){glow(p[0],p[1]+2.05,p[2],on?2.6:1.9,cc.r*1.4,cc.g*1.4,cc.b*1.4,.9);glow(p[0],p[1]+2.05,p[2],.8,2,2,2,1)}});
 dyn.anchors.forEach((a,i)=>{const p=s.anchors[i].p;a.c.rotation.y=t*2;glow(p[0],p[1]+2.62,p[2],1.8,.5,1.6,2,.9)});
 dyn.rescue.forEach((r,i)=>{const st=s.rescue[i];if(st.done&&r.g.visible){burst([st.p[0],st.p[1]+.8,st.p[2]],'#ffd58a',26,3,.32,1.1);r.g.visible=false}if(st.done)return;r.g.position.y=st.p[1]+Math.abs(Math.sin(t*3+i))*.06;r.head.rotation.set(Math.sin(t*1.3+i)*.15,Math.sin(t*.8+i)*.5,0);r.tail.rotation.z=Math.sin(t*5+i)*.3;
  const dx=s.player.p[0]-st.p[0],dz=s.player.p[2]-st.p[2];r.g.rotation.y=Math.atan2(dx,dz);glow(st.p[0],st.p[1]+1.55,st.p[2],.9,1.6,1.3,.6,.7+.3*Math.sin(t*5))});
 dyn.enemies.forEach((e,i)=>{const st=s.enemies[i],stun=st.stun>0;e.g.position.set(st.p[0],st.p[1]+.95+Math.sin(t*3+i)*.12,st.p[2]);e.g.rotation.set(stun?.35*Math.sin(t*9):0,stun?e.g.rotation.y+dt*.6:Math.atan2(s.player.p[0]-st.p[0],s.player.p[2]-st.p[2]),stun?.25:0);
  const c=stun?'#57e6ff':'#ff6a3a';e.eye.material.emissive.set(c);e.eye.material.color.set(c);tmpV.set(0,.02,.6).applyQuaternion(e.g.quaternion).add(e.g.position);glow(tmpV.x,tmpV.y,tmpV.z,1.1,stun?.4:2,stun?1.5:.7,stun?2:.3,.9);if(stun&&Math.random()<dt*8)fxSpark.push(tmpV.x,tmpV.y+.4,tmpV.z,.25,.25,.6,1.8,2.2,1)});
 if(dyn.boss){const b=dyn.boss,st=s.boss,alive=st.hp>0;b.g.visible=true;const c=st.ready?'#ffd36a':alive?'#ff7a4a':'#4fe6ff';b.core.color.set(c);b.core.emissive.set(c);b.core.emissiveIntensity=st.ready?3:2;b.visor.emissive.set(alive?'#ff6a3a':'#4fe6ff');b.visor.color.set(alive?'#ff6a3a':'#4fe6ff');
  const sway=Math.sin(t*1.4)*.05,wind=alive&&st.attack>2.8?(st.attack-2.8)/1.2:0;b.body.rotation.set(alive?0:.25,Math.atan2(s.player.p[0]-st.p[0],s.player.p[2]-st.p[2])*(alive?1:0),sway);b.body.position.y=2.35+(alive?Math.sin(t*2)*.06:-.45);b.head.rotation.x=alive?-.1+Math.sin(t*1.1)*.05:.35;
  b.arms.forEach((a,k)=>{a.rotation.x=-wind*2.2+Math.sin(t*1.6+k)*.08;a.rotation.z=(k?-1:1)*(.08+wind*.3)});b.shields.forEach((sh,k)=>{sh.visible=k<st.hp;sh.rotation.y=t*2;sh.position.y=5.1+Math.sin(t*3+k)*.08});
  b.wave.visible=wind>0;b.wave.scale.setScalar(2+st.attack);b.wave.material.opacity=.4+wind*.5;tmpV.set(0,-.05,.75).applyEuler(b.body.rotation).add(b.body.position).add(b.g.position);glow(tmpV.x,tmpV.y,tmpV.z,st.ready?3:2.2,...(st.ready?[2,1.6,.7]:alive?[2,.8,.4]:[.5,1.8,2.2]),.9)}
 if(dyn.gate){const g=dyn.gate,[x,y,z]=s.exit;g.portal.uniforms.uTime.value=t;const target=s.ready?1:0;g.portal.uniforms.uOn.value+=(target-g.portal.uniforms.uOn.value)*Math.min(1,dt*2);
  if(s.ready){for(let i=0;i<12;i++){const a=i*Math.PI/6+t*.45;fxSpark.push(x+Math.cos(a)*1.32,y+1.75+Math.sin(a)*1.32,z+.1,.32,.32,2,1.7,1,1)}glow(x,y+1.75,z+.3,4.2,1.4,1.3,.8,.9);glow(x,y+5,z,1.2,1,1,.6,.6)}else glow(x,y+1.75,z+.2,2,.3,.9,1.1,.5)}
 if(dyn.bridge){const br=dyn.bridge;br.fade=s.hidden?Math.min(1,br.fade+dt*1.5):0;br.g.visible=br.fade>0;br.mat.opacity=.72*br.fade;br.mat.emissiveIntensity=1.3+.4*Math.sin(t*3)}
 // effects from game.js (bark, scent, pulse, hit, shock)
 for(const e of s.effects){if(!dyn.seen.has(e)){dyn.seen.add(e);const free=dyn.rings.find(r=>!r.e)||dyn.rings[0];free.e=e;
   if(e.type==='hit')burst([e.p[0],e.p[1]+1.2,e.p[2]],'#ffd08a',24,4,.34,.7);if(e.type==='pulse')burst([e.p[0],e.p[1]+1.1,e.p[2]],'#8ff4ff',18,5,.28,.5);if(e.type==='scent')burst([e.p[0],e.p[1]+.4,e.p[2]],'#7ff0ff',20,1.6,.3,1.1)}}
 for(const r of dyn.rings){if(!r.e)continue;const e=r.e,k=e.t/1.1;if(!s.effects.includes(e)||k>=1){r.e=null;r.m.visible=false;continue}const maxR=e.type==='pulse'?6:e.type==='scent'?5:e.type==='shock'?4.5:e.type==='hit'?2.2:2.8;
  r.m.visible=true;r.m.position.set(e.p[0],e.p[1]+(e.type==='hit'?1.2:.12),e.p[2]);r.m.scale.setScalar(.3+maxR*Math.sqrt(k));r.m.material.color.set(e.type==='shock'?'#ffad6a':e.type==='hit'?'#ffe2a0':'#8ff4ff');r.m.material.opacity=(1-k)*(e.type==='scent'?.6:.9)}
 // grapple beam
 if(s.grapple){const a=tmpV.set(s.hand[0],s.hand[1],s.hand[2]),b=new THREE.Vector3(s.grapple.to[0],s.grapple.to[1]+2.62,s.grapple.to[2]),L=a.distanceTo(b);dyn.beam.visible=true;dyn.beam.position.copy(a).add(b).multiplyScalar(.5);dyn.beam.scale.set(1,L,1);dyn.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());glow(b.x,b.y,b.z,2.4,.6,1.8,2.2,1)}else dyn.beam.visible=false;
 // scent paw trail towards the nearest hidden thing
 let pc=0;if(s.scent>0){const p=s.player.p;let tgt=null,best=1e9;for(const r of s.relics)if(!r.got){const d=Math.hypot(r.p[0]-p[0],r.p[2]-p[2]);if(d<best){best=d;tgt=[r.p[0],r.p[1]-.8,r.p[2]]}}
  if(tgt){const L=Math.min(best,12),n=Math.min(24,Math.floor(L/.7)),dx=(tgt[0]-p[0])/best,dz=(tgt[2]-p[2])/best,yaw=Math.atan2(dx,dz);for(let i=1;i<=n;i++){const d=i*.7,side=(i%2?1:-1)*.14,px=p[0]+dx*d+dz*side,pz=p[2]+dz*d-dx*side,py=p[1]+(tgt[1]-p[1])*(d/best)+.03;
    tmpE.set(0,yaw,0);tmpQ.setFromEuler(tmpE);const fade=Math.max(0,Math.min(1,s.scent/2))*(1-i/(n+2));tmpM.compose(tmpV.set(px,py,pz),tmpQ,tmpS.set(1,1,1));dyn.paws.setMatrixAt(pc,tmpM);dyn.paws.setColorAt(pc,tmpC.setRGB(.55*fade+.1,1.6*fade,2*fade));pc++}}}
 dyn.paws.count=pc;dyn.paws.instanceMatrix.needsUpdate=true;if(dyn.paws.instanceColor)dyn.paws.instanceColor.needsUpdate=true;
 // particles
 for(let i=dyn.parts.length-1;i>=0;i--){const q=dyn.parts[i];q.life-=dt;if(q.life<=0){dyn.parts.splice(i,1);continue}q.v[1]-=4*dt;for(let k=0;k<3;k++)q.p[k]+=q.v[k]*dt;const f=q.life/q.max;fxSpark.push(q.p[0],q.p[1],q.p[2],q.size*f+.05,q.size*f+.05,q.c.r*2,q.c.g*2,q.c.b*2,f)}
 // Ranger's own compass glows
 for(const gp of s.glows||[])glow(...gp);
 fxGlow.commit();fxSpark.commit()}

return{
 ready:()=>!!backdrop,
 init(){if(!G.ok||backdrop)return;buildBackdrop()},
 build(M,s){if(!G.ok)return;if(!backdrop)buildBackdrop();const key=M.name+'|'+G.grassDensity;if(levelKey!==key){buildLevel(M);levelKey=key}buildDynamic(M,s)},
 update,
 islandRock,treeGeo,
};
})();

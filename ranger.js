'use strict';
/* RANGER: The Lost Sky Kingdom · Ranger hero model (v0.2.0)
   A hand-built, jointed 3D Ranger that follows the character sheet: orange-brown fur with a white blaze and muzzle,
   a spiky crest, aviator goggles, red bandana, cropped mustard jacket over a cream shirt, cross-body satchel with the
   glowing compass, dark cargo pants with mustard stripes, fingerless gloves, a bushy tail and big trail boots.
   To use a sculpted, rigged model instead, export it as glTF binary and add
   <meta name="ranger-model" content="assets/ranger.glb"> to index.html (clips named idle, run, jump, fall, glide). */
const Hero=(()=>{
const TAU=Math.PI*2,col=c=>new THREE.Color(c),tmp=new THREE.Vector3(),tmpC=new THREE.Color();
const pal={fur:'#b8622c',furDark:'#8a4220',furLight:'#dd9f62',cream:'#f3e9d8',jacket:'#dc9a2e',jacketDark:'#a96f1c',collar:'#3e3a2f',shirt:'#e9e0cf',pants:'#58412f',pantsLight:'#76593f',leather:'#6c4a2f',leatherDark:'#3a2b21',boot:'#4a392b',bootCap:'#bdb19f',sole:'#2a2624',mustard:'#e6a83a',red:'#b9302a',glove:'#2e2623',metal:'#b8bcc0',brass:'#c99f52',lens:'#ff9d33',eye:'#b8681d',nose:'#1a1514',cyan:'#4fe3ff',orange:'#f08a2a'};
let root=null,body=null,J={},parts=new Map(),glider=null,blob=null,marks={},phase=0,t=0,cues={},seen=new WeakSet(),idleT=0,custom=null,built=false,gliderK=0,blink=0;

// ---------- building blocks ----------
function rimMat(m,s){m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>',`outgoingLight+=vec3(1.,.87,.68)*pow(1.-saturate(dot(normal,normalize(vViewPosition))),3.)*${s.toFixed(2)};\n#include <opaque_fragment>`)};m.customProgramCacheKey=()=>'rim'+s;return m}
const mats={};
function mat(kind){if(mats[kind])return mats[kind];const S=THREE.MeshStandardMaterial;
 mats[kind]=kind==='cloth'?rimMat(new S({vertexColors:true,roughness:.8,map:G.tex.fibre()}),.3):kind==='shiny'?rimMat(new S({vertexColors:true,roughness:.28,metalness:.5}),.2)
  :new THREE.MeshBasicMaterial({vertexColors:true,color:new THREE.Color(1.9,1.9,1.9)});return mats[kind]}
function joint(name,parent,p=[0,0,0],r=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...p);g.rotation.set(...r);parent.add(g);J[name]=g;g.userData.rest=[...r];return g}
// Adds a coloured primitive to a joint; all primitives on a joint are merged into a few meshes.
function part(j,geo,color,{p=[0,0,0],r=[0,0,0],s=[1,1,1],kind='cloth',fn=null}={}){if(kind==='cloth2'){kind='cloth';geo=geo.clone();const g2=geo.clone();g2.scale(1,1,1);const ix=g2.index;if(ix){const a=ix.array;for(let i=0;i<a.length;i+=3){const t=a[i];a[i]=a[i+2];a[i+2]=t}}const n=g2.getAttribute('normal');if(n)for(let i=0;i<n.count;i++)n.setXYZ(i,-n.getX(i),-n.getY(i),-n.getZ(i));part(j,g2,color,{p,r,s,kind,fn})}let g=prep(geo);const pos=g.getAttribute('position'),arr=new Float32Array(pos.count*3);
 for(let i=0;i<pos.count;i++){if(fn)fn(pos.getX(i),pos.getY(i),pos.getZ(i),tmpC);else tmpC.set(color);arr[i*3]=tmpC.r;arr[i*3+1]=tmpC.g;arr[i*3+2]=tmpC.b}
 g.setAttribute('color',new THREE.BufferAttribute(arr,3));place(g,{p,r,s});const k=(typeof j==='string'?j:j.name);if(!parts.has(k))parts.set(k,{cloth:[],shiny:[],glow:[]});parts.get(k)[kind].push(g);return g}
function finalize(){for(const [name,list] of parts){for(const kind of ['cloth','shiny','glow']){if(!list[kind].length)continue;const g=THREE.BufferGeometryUtils.mergeGeometries(list[kind]);list[kind].forEach(x=>x.dispose());
  const m=new THREE.Mesh(g,mat(kind));m.castShadow=kind!=='glow';m.receiveShadow=kind==='cloth';J[name].add(m)}}parts.clear()}
const sph=(r,w=18,h=14)=>new THREE.SphereGeometry(r,w,h),cap=(r,l,s=10)=>new THREE.CapsuleGeometry(r,l,4,s),cyl=(a,b,h,s=14,open=false)=>new THREE.CylinderGeometry(a,b,h,s,1,open);
const rbox=(w,h,d,r=.03)=>new THREE.RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2-.001,h/2-.001,d/2-.001));
const ring=(r,tube,seg=24,rad=6,arc=TAU)=>new THREE.TorusGeometry(r,tube,rad,seg,arc);
const mix=(a,b,k)=>tmpC.set(a).lerp(col(b),Math.min(1,Math.max(0,k)));
const sstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
function marker(name,j,p){const o=new THREE.Object3D();o.position.set(...p);j.add(o);marks[name]=o}

// ---------- the procedural Ranger ----------
function buildProcedural(){
 root=new THREE.Group();root.name='ranger';body=joint('body',root);
 const hips=joint('hips',body,[0,.92,0]);
 part(hips,sph(.195),pal.pants,{p:[0,-.03,0],s:[1,.74,.86]});
 part(hips,ring(.186,.028,30),pal.leatherDark,{p:[0,.055,0],r:[Math.PI/2,0,0],s:[1,.86,1]});
 part(hips,rbox(.08,.06,.022,.008),pal.metal,{p:[0,.055,.165],kind:'shiny'});part(hips,new THREE.BoxGeometry(.046,.032,.026),pal.leatherDark,{p:[0,.055,.168]});
 part(hips,rbox(.085,.095,.065,.016),pal.leather,{p:[.165,.0,.085],r:[0,.5,0]});part(hips,rbox(.07,.08,.06,.016),pal.leather,{p:[.06,-.01,-.165],r:[0,0,0]});
 // Satchel on the right hip with the glowing compass medallion and the orange paw tag.
 const bag=joint('bag',hips,[-.245,-.045,.035],[0,.15,-.05]);
 part(bag,rbox(.11,.19,.27,.04),pal.leather);part(bag,rbox(.12,.1,.28,.035),'#7d5838',{p:[-.006,.06,0]});
 part(bag,new THREE.BoxGeometry(.014,.07,.032),pal.leatherDark,{p:[-.065,.02,-.075]});part(bag,new THREE.BoxGeometry(.018,.024,.036),pal.metal,{p:[-.069,-.012,-.075],kind:'shiny'});
 part(bag,ring(.052,.013,24),pal.brass,{p:[-.063,-.008,.05],r:[0,Math.PI/2,0],kind:'shiny'});part(bag,cyl(.043,.043,.02,20),pal.cyan,{p:[-.061,-.008,.05],r:[0,0,Math.PI/2],kind:'glow'});
 for(let i=0;i<6;i++){const a=i/6*TAU;part(bag,new THREE.BoxGeometry(.012,.018,.018),pal.brass,{p:[-.066,-.008+Math.sin(a)*.067,.05+Math.cos(a)*.067],kind:'shiny'})}
 part(bag,rbox(.01,.06,.042,.004),pal.orange,{p:[-.066,-.115,.085],r:[.15,0,0]});marker('bag',bag,[-.1,-.008,.05]);
 // Legs: baggy cargo pants with mustard stripes, rolled cuffs, fur ankles and big trail boots.
 for(const sd of [1,-1]){const L=sd>0?'L':'R',leg=joint('leg'+L,hips,[sd*.105,-.04,0]);
  part(leg,cap(.104,.17,14),pal.pants,{p:[0,-.17,0],s:[1.08,1,1.04]});part(leg,new THREE.BoxGeometry(.018,.25,.056),pal.mustard,{p:[sd*.108,-.17,0]});
  part(leg,rbox(.055,.09,.11,.018),'#5f4734',{p:[sd*.105,-.2,.0]});part(leg,new THREE.BoxGeometry(.012,.014,.1),pal.leatherDark,{p:[sd*.135,-.165,0]});
  if(sd<0){part(leg,ring(.108,.017,22),pal.leatherDark,{p:[0,-.11,0],r:[Math.PI/2,0,0]});part(leg,rbox(.045,.04,.014,.005),pal.metal,{p:[0,-.11,.11],kind:'shiny'})}
  const knee=joint('knee'+L,leg,[0,-.36,0]);
  part(knee,sph(.105,14,10),pal.pants,{p:[0,.0,0],s:[1.03,.8,1.02]});
  part(knee,cyl(.104,.11,.15,14),pal.pants,{p:[0,-.075,0]});part(knee,new THREE.BoxGeometry(.018,.13,.054),pal.mustard,{p:[sd*.106,-.07,0],r:[0,0,-sd*.05]});
  part(knee,ring(.106,.033,20),pal.pantsLight,{p:[0,-.155,0],r:[Math.PI/2,0,0]});
  part(knee,cyl(.06,.068,.12,12),'#000',{p:[0,-.225,0],fn:(x,y,z,c)=>mix(pal.fur,pal.cream,z>0?.85:.35)});
  const ankle=joint('ankle'+L,knee,[0,-.33,0]);
  part(ankle,rbox(.2,.2,.3,.07),pal.boot,{p:[0,-.02,.035]});part(ankle,ring(.088,.034,20),pal.mustard,{p:[0,.08,-.01],r:[Math.PI/2,0,0]});
  part(ankle,rbox(.085,.12,.05,.02),pal.mustard,{p:[0,.06,.095],r:[-.3,0,0]});
  part(ankle,sph(.112,18,12),pal.bootCap,{p:[0,-.07,.14],s:[1,.62,1.12]});part(ankle,sph(.1,14,10),pal.bootCap,{p:[0,-.07,-.075],s:[1,.6,.6]});
  part(ankle,rbox(.235,.085,.42,.035),pal.sole,{p:[0,-.142,.045]});part(ankle,rbox(.24,.03,.42,.012),'#8b8072',{p:[0,-.106,.045]});
  for(let i=0;i<5;i++)part(ankle,new THREE.BoxGeometry(.24,.02,.03),'#1f1c1b',{p:[0,-.185,-.11+i*.075]});
  for(const yy of [-.035,.03]){part(ankle,new THREE.BoxGeometry(.21,.034,.075),pal.leatherDark,{p:[0,yy,.09]});part(ankle,rbox(.045,.045,.02,.006),pal.metal,{p:[sd*.065,yy,.13],kind:'shiny'})}
  part(ankle,new THREE.BoxGeometry(.012,.08,.08),pal.mustard,{p:[sd*.104,-.02,-.03]})}
 // Bushy tail: four overlapping fluffy segments, orange-brown with a cream underside and tip.
 let tp=hips;const tl=[[.065,.12],[.1,.15],[.125,.17],[.11,.16]],TR=rng(41);
 tl.forEach(([r,len],i)=>{const tj=joint('tail'+i,tp,i?[0,0,-tl[i-1][1]]:[0,-.04,-.15],[i?.25:.55,i?0:-.26,0]);
  const shade=(x,y,z,c)=>{const along=(i+(.5-z*.5))/tl.length;mix(pal.fur,pal.cream,sstep(.9,1,along)*.9+sstep(-.45,-.95,y)*.4*sstep(.3,.75,along));c.lerp(col(pal.furLight),sstep(.2,.9,y)*.25)};
  part(tj,sph(1,16,12),'#000',{p:[0,0,-len/2],s:[r*1.05,r,len*.88],fn:shade});
  for(let k=0;k<(i?5:2);k++){const a=TR()*TAU,h=r*(.45+TR()*.35),cone=new THREE.ConeGeometry(r*.45,h,5);cone.translate(0,h/2,0);const zz=-len*(.15+TR()*.7);
   part(tj,cone,'#000',{p:[Math.cos(a)*r*.7,Math.sin(a)*r*.7,zz],r:[-1.15+Math.sin(a)*.4,0,-Math.cos(a)*1.1],fn:(x,y,z,c)=>{shade(0,Math.sin(a),zz/len*2+1,c);c.multiplyScalar(.92+y/h*.18)}})}
  tp=tj});
 // Torso: cropped mustard jacket hanging open over the cream shirt.
 const spine=joint('spine',hips,[0,.09,0]);
 const prof=[[.17,0],[.195,.035],[.205,.1],[.214,.2],[.21,.27],[.19,.33],[.145,.375],[.09,.405]].map(([r,y])=>new THREE.Vector2(r,y));
 part(spine,new THREE.LatheGeometry(prof,28),'#000',{s:[1,1,.8],fn:(x,y,z,c)=>{const r=Math.hypot(x,z)||1,w=Math.abs(x)/r,open=.2+y*.55;if(z>0&&w<open&&y>.02)return mix(pal.shirt,'#d6c9b2',sstep(.25,.05,y)*.5);if(z>0&&w<open+.07&&y>.02)return tmpC.set(pal.collar);mix(pal.jacketDark,pal.jacket,sstep(0,.12,y)-(z<0&&Math.abs(x)<.02?.15:0))}});
 part(spine,ring(.175,.03,26),pal.jacketDark,{p:[0,.012,0],r:[Math.PI/2,0,0],s:[1,.8,1]});
 part(spine,ring(.122,.046,22,6,Math.PI*1.45),pal.collar,{p:[0,.385,-.01],r:[Math.PI/2,0,Math.PI*.275+Math.PI/2],s:[1,.92,1.25]});
 part(spine,ring(.14,.013,22,4,Math.PI*1.45),pal.mustard,{p:[0,.41,-.01],r:[Math.PI/2,0,Math.PI*.275+Math.PI/2],s:[1,.92,1]});
 part(spine,rbox(.07,.06,.012,.01),'#6b4d34',{p:[-.2,.3,.02],r:[0,-1.2,0]});
 // Cross-body strap from the left shoulder to the satchel, with the scan device on the chest.
 {const pts=[];for(let i=0;i<40;i++){const a=i/40*TAU;tmp.set(Math.cos(a)*.315,0,Math.sin(a)*.22);tmp.applyAxisAngle(new THREE.Vector3(0,0,1),.68);pts.push(new THREE.Vector3(tmp.x,tmp.y+.17,tmp.z))}
  part(spine,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),64,.021,5,true),pal.leatherDark);
  const a=Math.PI*.36;tmp.set(Math.cos(a)*.315,0,Math.sin(a)*.22).applyAxisAngle(new THREE.Vector3(0,0,1),.68);const dp=[tmp.x,tmp.y+.17,tmp.z+.022];
  part(spine,rbox(.09,.105,.036,.012),'#2a2827',{p:dp,r:[0,.25,-.68]});part(spine,new THREE.PlaneGeometry(.06,.07),pal.cyan,{p:[dp[0]+.005,dp[1],dp[2]+.02],r:[0,.25,-.68],kind:'glow'});marker('scan',spine,[dp[0],dp[1],dp[2]+.04])}
 // Small explorer pack on the back with the blue compass core (the view players see most).
 part(spine,rbox(.28,.3,.13,.05),'#5e4331',{p:[0,.19,-.205]});part(spine,rbox(.29,.11,.14,.045),'#76533a',{p:[0,.305,-.21]});
 part(spine,ring(.062,.015,24),pal.brass,{p:[0,.175,-.272],kind:'shiny'});part(spine,cyl(.05,.05,.02,20),pal.cyan,{p:[0,.175,-.272],r:[Math.PI/2,0,0],kind:'glow'});
 for(let i=0;i<8;i++){const a=i/8*TAU;part(spine,new THREE.BoxGeometry(.016,.016,.012),pal.brass,{p:[Math.cos(a)*.08,.175+Math.sin(a)*.08,-.27],kind:'shiny'})}
 for(const sd of [-1,1]){part(spine,new THREE.BoxGeometry(.036,.27,.02),pal.leatherDark,{p:[sd*.105,.2,-.272]});part(spine,rbox(.04,.03,.012,.005),pal.metal,{p:[sd*.105,.1,-.283],kind:'shiny'})}
 part(spine,rbox(.08,.06,.03,.01),pal.orange,{p:[.12,.06,-.27],r:[0,0,.2]});marker('pack',spine,[0,.175,-.31]);
 // Arms: rolled mustard sleeves, furry forearms, fingerless gloves; mission bracelet on the left wrist.
 for(const sd of [1,-1]){const L=sd>0?'L':'R',sh=joint('sh'+L,spine,[sd*.222,.325,0],[0,0,sd*.1]);
  part(sh,sph(.09,16,12),pal.jacket,{p:[0,-.015,0]});part(sh,cap(.083,.11,12),pal.jacket,{p:[0,-.1,0],s:[1.08,1,1.08]});part(sh,ring(.074,.034,18),pal.cream,{p:[0,-.205,0],r:[Math.PI/2,0,0]});
  if(sd<0){part(sh,cyl(.046,.046,.012,18),'#5c4330',{p:[-.087,-.075,0],r:[0,0,Math.PI/2]});part(sh,new THREE.CircleGeometry(.032,4),pal.cream,{p:[-.0945,-.075,0],r:[0,-Math.PI/2,0]});part(sh,new THREE.CircleGeometry(.032,4),pal.cream,{p:[-.0947,-.075,0],r:[Math.PI/4,-Math.PI/2,0],s:[.45,.45,1]})}
  const el=joint('el'+L,sh,[0,-.235,0]);
  part(el,cap(.06,.1,10),'#000',{p:[0,-.085,0],fn:(x,y,z,c)=>mix(pal.fur,pal.furLight,(y+.11)/.22)});
  const wr=joint('wr'+L,el,[0,-.185,0]);
  part(wr,cyl(.068,.064,.055,14),pal.glove,{p:[0,.008,0]});part(wr,new THREE.BoxGeometry(.055,.03,.012),pal.orange,{p:[0,.008,.064]});
  part(wr,rbox(.112,.115,.098,.035),pal.glove,{p:[0,-.065,.006]});part(wr,new THREE.BoxGeometry(.1,.024,.02),pal.orange,{p:[0,-.045,.055]});
  for(let i=0;i<4;i++)part(wr,cap(.021,.028,6),pal.cream,{p:[(i-1.5)*.026,-.125,.032],r:[1.2,0,0]});part(wr,cap(.023,.032,6),pal.cream,{p:[-sd*.056,-.065,.042],r:[.6,0,sd*.5]});
  if(sd>0){part(wr,ring(.069,.013,22),pal.cyan,{p:[0,.034,0],r:[Math.PI/2,0,0],kind:'glow'});part(wr,rbox(.055,.032,.05,.01),'#2a2827',{p:[sd*.065,.03,0]});marker('band',wr,[sd*.075,.03,0])}
  else{const tool=joint('tool',wr,[0,-.075,.035]);part(tool,cyl(.024,.028,.22,10),pal.brass,{p:[0,0,.09],r:[Math.PI/2,0,0],kind:'shiny'});part(tool,cyl(.036,.036,.055,12),'#3a3532',{p:[0,0,.02],r:[Math.PI/2,0,0],kind:'shiny'});
   part(tool,ring(.052,.013,12,5,Math.PI),pal.metal,{p:[0,.03,.2],r:[0,Math.PI/2,0],kind:'shiny'});tool.visible=false;marker('hand',wr,[0,-.075,.13])}}
 // Neck, bandana and head.
 const neck=joint('neck',spine,[0,.4,.0]);
 part(neck,cyl(.085,.092,.1,14),pal.cream,{p:[0,.02,.01]});
 part(neck,ring(.106,.05,24,8),pal.red,{p:[0,.03,0],r:[Math.PI/2,0,0],s:[1,.9,1]});
 part(neck,new THREE.ConeGeometry(.13,.2,3),pal.red,{p:[0,-.07,.155],r:[Math.PI+.42,0,0],s:[1,1,.3]});
 const sc1=joint('scarf1',neck,[-.06,.045,-.105],[-.5,.35,0]),sc2=joint('scarf2',sc1,[0,0,-.17]);
 part(sc1,rbox(.13,.022,.18,.008),pal.red,{p:[0,0,-.085]});part(sc2,new THREE.ConeGeometry(.075,.22,4),pal.red,{p:[0,0,-.1],r:[-Math.PI/2,Math.PI/4,0],s:[1,1,.22]});
 const head=joint('head',neck,[0,.175,.025]);
 const HR=.25;part(head,sph(HR,32,24),'#000',{s:[1,.93,.95],fn:(x,y,z,c)=>{const nx=x/HR,ny=y/HR,nz=z/HR;
  const blaze=sstep(.14,.06,Math.abs(nx)-Math.max(0,-ny)*.35)*sstep(.2,.55,nz)*sstep(.9,.5,ny);const low=sstep(-.1,-.38,ny)*sstep(-.05,.5,nz);
  const cheek=sstep(-.05,-.32,ny)*sstep(.35,.75,Math.abs(nx))*sstep(-.25,.25,nz)*.85;mix(pal.fur,pal.furDark,sstep(.35,1,ny)*.4+sstep(.2,-.8,nz)*.25);c.lerp(col(pal.cream),Math.min(1,Math.max(blaze,low,cheek)))}});
 part(head,sph(.125,20,14),pal.cream,{p:[0,-.07,.19],s:[.95,.72,1.08]});
 part(head,sph(.047,14,10),pal.nose,{p:[0,-.022,.318],s:[1.25,.82,.9],kind:'shiny'});
 part(head,ring(.048,.008,12,4,Math.PI*.8),'#2a1d18',{p:[0,-.072,.3],r:[0,0,-Math.PI*.9]});
 for(const sd of [1,-1]){part(head,sph(.05,16,12),'#fbf6ee',{p:[sd*.092,.05,.208],s:[1,1.15,.6],kind:'shiny'});part(head,sph(.038,14,10),pal.eye,{p:[sd*.092,.048,.232],s:[1,1.12,.45],kind:'shiny'});
  part(head,sph(.021,10,8),'#120b07',{p:[sd*.092,.048,.247],s:[1,1.1,.5],kind:'shiny'});part(head,sph(.009,8,6),'#ffffff',{p:[sd*.082,.064,.254],kind:'glow'});
  part(head,ring(.052,.009,14,4,Math.PI*.9),'#2b1a12',{p:[sd*.092,.052,.214],r:[-.25,0,Math.PI*.05],s:[1,1.1,1]});
  part(head,rbox(.08,.024,.026,.008),'#5a321e',{p:[sd*.098,.122,.214],r:[-.2,0,sd*-.2]})}
 const jaw=joint('jaw',head,[0,-.105,.13]);part(jaw,sph(.098,16,10),pal.cream,{p:[0,-.02,.085],s:[1,.48,1.1]});part(jaw,sph(.07,12,8),'#7a2a26',{p:[0,.012,.08],s:[1,.4,1.05]});part(jaw,sph(.04,10,8),'#e07a78',{p:[0,.014,.1],s:[1,.35,1.3]});
 for(const sd of [1,-1])part(jaw,new THREE.ConeGeometry(.012,.03,4),'#fffaf0',{p:[sd*.045,.03,.155],r:[0,0,0]});
 // Floppy ears, teardrop shaped; the left one flares out like the concept art.
 for(const sd of [1,-1]){const L=sd>0?'L':'R',ear=joint('ear'+L,head,[sd*.18,.11,-.05],[0,0,sd*(sd>0?.55:.2)]);const eg=sph(1,18,14),ep=eg.getAttribute('position');
  for(let i=0;i<ep.count;i++){const y=ep.getY(i),w=.5+.5*(1-y)/2;ep.setZ(i,ep.getZ(i)*w);ep.setX(i,ep.getX(i)*(.7+.3*(1-y)/2))}eg.computeVertexNormals();
  part(ear,eg,'#000',{p:[sd*.03,-.17,-.01],s:[.05,.23,.13],r:[.12,0,sd*.08],fn:(x,y,z,c)=>mix('#a5512a','#7c3a1c',sstep(.3,-.9,y)*.8+(x*sd<0?.12:0))})}
 // Messy crest of hair.
 part(head,sph(.2,18,10,),pal.fur,{p:[0,.13,-.04],s:[1,.55,1.05],fn:(x,y,z,c)=>mix(pal.fur,pal.furDark,.25)});
 const R=rng(23);const tufts=[[0,.2,.02,-.2],[.08,.19,0,-.35],[-.08,.19,-.01,-.3],[.03,.18,-.1,-.75],[-.05,.17,-.12,-.8],[.12,.14,-.06,-.6],[-.12,.14,-.06,-.55],[.0,.12,-.17,-1.1],[.07,.2,.08,.15],[-.06,.21,.07,.25],[.13,.16,.05,-.1],[-.13,.15,.04,-.15]];
 for(const [x,y,z,tilt] of tufts){const h=.13+R()*.08,r=.05+R()*.025,cone=new THREE.ConeGeometry(r,h,6,3);const cp=cone.getAttribute('position');for(let i=0;i<cp.count;i++){const yy=cp.getY(i)/h+.5;cp.setZ(i,cp.getZ(i)-yy*yy*h*.45)}cone.computeVertexNormals();cone.translate(0,h/2,0);
  part(head,cone,'#000',{p:[x,y,z],r:[tilt,(R()-.5)*.6,-x*1.6+(R()-.5)*.3],fn:(x2,y2,z2,c)=>mix(pal.furDark,pal.furLight,y2/h*.85+.1)})}
 // Aviator goggles pushed up on the forehead.
 part(head,ring(.236,.023,44,6),pal.leatherDark,{p:[0,.1,-.01],r:[Math.PI/2-.3,0,0],s:[1,.96,1]});
 for(const sd of [1,-1]){const gp=[sd*.09,.17,.17],gr=[-.62,sd*.18,0],gb=cyl(.068,.072,.058,20);gb.rotateX(Math.PI/2);part(head,gb,'#3b3532',{p:gp,r:gr,kind:'shiny'});
  const q=new THREE.Euler(gr[0],gr[1],0,'YXZ'),f=new THREE.Vector3(0,0,.031).applyEuler(q);part(head,new THREE.CircleGeometry(.056,20),pal.lens,{p:[gp[0]+f.x,gp[1]+f.y,gp[2]+f.z],r:gr,kind:'shiny'});
  part(head,ring(.063,.014,20,6),pal.brass,{p:[gp[0]+f.x,gp[1]+f.y,gp[2]+f.z],r:gr,kind:'shiny'})}
 part(head,new THREE.BoxGeometry(.05,.02,.03),'#3b3532',{p:[0,.18,.195],r:[-.6,0,0],kind:'shiny'});
 // Fold-out glider used while holding jump in the air.
 glider=joint('glider',body,[0,1.98,.02]);{const cr=1.25,arc=1.7,g=new THREE.CylinderGeometry(cr,cr,.62,22,1,true,-arc/2,arc);g.rotateX(-Math.PI/2);g.translate(0,-cr,0);
  part(glider,g,'#000',{p:[0,.62,-.05],kind:'cloth2',fn:(x,y,z,c)=>{const b=Math.floor((x+1.2)/.24);tmpC.set(Math.abs(x)<.12?pal.cream:b%2?pal.red:pal.mustard)}});
  part(glider,cyl(.018,.018,.62,6),'#7a5535',{p:[0,.0,.05],r:[0,0,Math.PI/2]});
  for(const sd of [-1,1]){const a=new THREE.Vector3(sd*Math.sin(arc/2)*cr,.62+cr*(Math.cos(arc/2)-1),-.05),b=new THREE.Vector3(sd*.3,0,.05),m=a.clone().add(b).multiplyScalar(.5),L=a.distanceTo(b);
   const s=cyl(.008,.008,L,4),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),a.clone().sub(b).normalize()),e=new THREE.Euler().setFromQuaternion(q,'YXZ');part(glider,s,'#d8cdb5',{p:[m.x,m.y,m.z],r:[e.x,e.y,e.z]})}}
 glider.visible=false;glider.scale.setScalar(.01);
 finalize();root.traverse(o=>{if(o.isMesh)o.frustumCulled=false});
}

// Soft contact shadow so Ranger stays grounded even with shadows off.
function makeBlob(){const c=makeCanvas(64,64),g=c.getContext('2d'),r=g.createRadialGradient(32,32,2,32,32,31);r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(.6,'rgba(0,0,0,.25)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);
 const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:canvasTexture(c,{repeat:false}),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4}));m.renderOrder=1;return m}

// Optional sculpted model (glTF) with animation clips.
function loadCustom(url){if(!THREE.GLTFLoader)return;new THREE.GLTFLoader().load(url,g=>{const scn=g.scene,box=new THREE.Box3().setFromObject(scn),h=box.max.y-box.min.y||1,k=1.98/h;scn.scale.setScalar(k);scn.position.y=-box.min.y*k;
  scn.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});const holder=new THREE.Group();holder.add(scn);const mixer=new THREE.AnimationMixer(scn),acts={};
  for(const clip of g.animations){const n=clip.name.toLowerCase();for(const key of ['idle','run','jump','fall','glide'])if(n.includes(key)&&!acts[key])acts[key]=mixer.clipAction(clip)}if(!acts.run){const w=g.animations.find(c=>/walk/i.test(c.name));if(w)acts.run=mixer.clipAction(w)}
  custom={holder,mixer,acts,cur:null};body.visible=false;root.add(holder)},undefined,e=>console.warn('Ranger model not loaded, using the built-in model',e))}
function play(name){if(!custom)return;const a=custom.acts[name]||custom.acts.idle;if(!a||custom.cur===a)return;a.reset().fadeIn(.18).play();if(custom.cur)custom.cur.fadeOut(.18);custom.cur=a}

// ---------- animation ----------
const lerpA=(a,b,k)=>a+(b-a)*k;
function setRot(name,x,y,z,k){const j=J[name];if(!j)return;j.rotation.x=lerpA(j.rotation.x,x,k);j.rotation.y=lerpA(j.rotation.y,y,k);j.rotation.z=lerpA(j.rotation.z,z,k)}
function env(name,len){const c=cues[name];if(c==null)return 0;const u=(t-c)/len;if(u<0||u>1)return 0;return Math.sin(u*Math.PI)}
function update(dt,s){if(!built)return;t+=dt;const P=s.player,run=s.run,sprint=s.sprint,air=!P.grounded,glide=s.glide,gr=s.grapple;
 for(const e of s.effects)if(!seen.has(e)){seen.add(e);if(['bark','pulse','scent'].includes(e.type))cues[e.type]=t}
 root.position.set(P.p[0],P.p[1],P.p[2]);root.rotation.y=P.face;
 blink=s.damage>0?(Math.floor(t*14)%2):0;root.visible=!blink;
 // contact shadow
 const fl=s.floor;if(fl!=null){const h=Math.max(0,P.p[1]-fl);blob.visible=h<6;blob.position.set(P.p[0],fl+.02,P.p[2]);const sc=Math.max(.35,1.15-h*.12);blob.scale.set(sc*.95,1,sc*1.15);blob.rotation.y=P.face;blob.material.opacity=(G.shadows?.55:1)*Math.max(0,1-h/6)}else blob.visible=false;
 if(custom){custom.mixer.update(dt);play(gr?'glide':glide?'glide':air?(P.vy>0?'jump':'fall'):run>.1?'run':'idle');s.hand=[P.p[0]+Math.sin(P.face)*.35,P.p[1]+1.3,P.p[2]+Math.cos(P.face)*.35];s.glows=[];return}
 const k=1-Math.exp(-dt*14),kSlow=1-Math.exp(-dt*7),move=air||gr?0:run;
 const freq=(sprint?8.7:6.3)/3.3*TAU;phase+=dt*freq*Math.max(.25,move);if(move<.05)phase+=0;
 const sn=Math.sin(phase),cs=Math.cos(phase),A=.85*move,bob=move*(Math.abs(cs)*.075-.035);
 idleT=move>.05||air?0:idleT+dt;const breathe=Math.sin(t*2.2)*.012,bark=env('bark',.45),pulse=env('pulse',.42),sniff=env('scent',.9);
 body.position.y=lerpA(body.position.y,air?0:bob,k);
 let lean=.14*move+(sprint?.08*move:0),twist=sn*.16*move;
 // legs and arms
 let lL=-sn*A,lR=sn*A,kL=move*(.25+1.15*Math.max(0,cs)),kR=move*(.25+1.15*Math.max(0,-cs)),aL=sn*.75*move,aR=-sn*.75*move,eL=-(.35+.85*move),eR=-(.35+.85*move),abL=.1+move*.05,abR=-.1-move*.05;
 if(air&&!gr){if(glide){lL=.15;lR=-.05;kL=.45;kR=.3;aL=-2.75;aR=-2.75;eL=-.35;eR=-.35;abL=.32;abR=-.32;lean=-.05}else if(P.vy>0){lL=-1.0;kL=1.5;lR=.45;kR=.55;aL=-.6;aR=-.9;abL=1.1;abR=-1.1;eL=eR=-.5;lean=.1}else{lL=-.45;kL=.7;lR=.15;kR=.35;aL=-.3;aR=-.3;abL=1.35;abR=-1.35;eL=eR=-.3;lean=-.02}}
 if(gr){lL=.5;kL=.6;lR=.2;kR=.9;aR=-2.35;eR=-.1;abR=-.15;aL=.4;abL=.5;eL=-.6;lean=-.1}
 if(pulse>0){aL=lerpA(aL,-1.55,pulse);eL=lerpA(eL,-.05,pulse);abL=lerpA(abL,.05,pulse)}
 setRot('legL',lL,0,0,k);setRot('legR',lR,0,0,k);setRot('kneeL',kL,0,0,k);setRot('kneeR',kR,0,0,k);
 setRot('ankleL',-(lL+kL)*.55-(air?.2:0),0,0,k);setRot('ankleR',-(lR+kR)*.55-(air?.2:0),0,0,k);
 setRot('shL',aL,0,abL,k);setRot('shR',aR,0,abR,k);setRot('elL',eL,0,0,k);setRot('elR',eR,0,0,k);setRot('wrL',0,0,0,k);setRot('wrR',0,0,0,k);
 setRot('hips',0,-twist*.6,0,k);setRot('spine',lean+breathe,twist,0,k);
 J.spine.scale.set(1+breathe*.8,1+breathe*.5,1+breathe*.8);
 // head: look around when idle, sniff with scent, thrust and open the jaw to bark
 const lookY=idleT>2.5?Math.sin(t*.55)*.45:0;setRot('neck',-lean*.6+sniff*.55+Math.sin(t*16)*.05*sniff-bark*.15,lookY*.4,0,kSlow);
 setRot('head',bark*.25-sniff*.1+(air&&P.vy>0?-.12:0)+Math.sin(phase*2)*.04*move,lookY*.6,Math.sin(t*.9)*.03*(1-move),k);setRot('jaw',bark*.55+(move>.6?.08:0),0,0,k);
 // ears and tail react to motion
 const flop=Math.min(1,move+(air?.7:0)+(gr?1:0));setRot('earL',flop*.75+Math.sin(phase*2+.5)*.18*move+(air&&P.vy<0?.5:0),0,.55+flop*.06+Math.sin(t*1.7)*.04,kSlow);
 setRot('earR',flop*.7+Math.sin(phase*2)*.18*move+(air&&P.vy<0?.5:0),0,-.2-flop*.08-Math.sin(t*1.5)*.04,kSlow);
 const wagF=move>.1?7:idleT>0?5.5:8,wagA=move>.1?.18:.42;for(let i=0;i<4;i++)setRot('tail'+i,(i?.25:.55)-flop*(i?.04:.35)+(air&&P.vy<0?.3:0),(i?0:-.26)+Math.sin(t*wagF-i*.7)*wagA*(1+i*.25),0,k);
 // scarf streams with speed
 const stream=Math.min(1,move*1.2+(air?.8:0)+(gr?1:0));setRot('scarf1',lerpA(-1.15,-.15,stream)+Math.sin(t*9)*.12*stream,.2+Math.sin(t*3.1)*.15,0,kSlow);setRot('scarf2',lerpA(-.35,.05,stream)+Math.sin(t*11+1)*.3*stream,Math.sin(t*5)*.2,0,kSlow);
 // glider and grapple tool
 gliderK=lerpA(gliderK,glide&&!gr?1:0,1-Math.exp(-dt*10));glider.visible=gliderK>.02;glider.scale.setScalar(Math.max(.01,gliderK));glider.rotation.z=Math.sin(t*2.1)*.06;glider.rotation.x=-.08+Math.sin(t*1.6)*.04;
 J.tool.visible=!!gr;
 root.updateMatrixWorld(true);
 // world-space points for the grapple beam and glowing gadgets
 marks.hand.getWorldPosition(tmp);s.hand=[tmp.x,tmp.y,tmp.z];s.glows=[];const gl=(name,size,r,g,b,a)=>{marks[name].getWorldPosition(tmp);s.glows.push([tmp.x,tmp.y,tmp.z,size,r,g,b,a])};
 if(!blink){gl('pack',.3,.25,.9,1.2,.55);gl('bag',.24,.25,.9,1.2,.5);gl('scan',.16,.25,.9,1.2,.45);gl('band',.18+pulse*.9,.3,1,1.3,.45+pulse*.5);if(sniff>0){J.head.localToWorld(tmp.set(0,-.02,.36));s.glows.push([tmp.x,tmp.y,tmp.z,.5*sniff,.4,1.4,1.8,.9])}}
}

return{
 build(){if(built||!G.ok)return;buildProcedural();blob=makeBlob();G.scene.add(root,blob);built=true;const url=document.querySelector('meta[name="ranger-model"]')?.content;if(url)loadCustom(url)},
 update,
 get root(){return root},
 reset(){cues={};seen=new WeakSet();phase=0;idleT=0;gliderK=0;if(glider){glider.visible=false;glider.scale.setScalar(.01)}},
};
})();

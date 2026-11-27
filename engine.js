'use strict';
/* RANGER: The Lost Sky Kingdom · graphics core (v0.2.0)
   Rendering uses Three.js r187 (vendor/three.min.js, MIT licence). Every texture and model is generated
   in code at start-up, so the game needs no downloads and stays fully offline. */

// ---------- small math helpers shared with game.js ----------
const $=id=>document.getElementById(id),canvas=$('world'),prefs={fov:60},rad=n=>n*Math.PI/180,clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>mul(a,1/(Math.hypot(...a)||1));
const qm=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const qi=q=>[-q[0],-q[1],-q[2],q[3]],qa=(axis,a)=>[...mul(axis,Math.sin(a/2)),Math.cos(a/2)],qv=(q,v)=>qm(qm(q,[...v,0]),qi(q)).slice(0,3),I=[0,0,0,1];
function seeded(n){let a=Math.sin(n*127.1+311.7)*43758.5453;return a-Math.floor(a)}
function rng(seed){let a=(Math.imul(seed|0,2654435761)>>>0)||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash3(x,y,s){let h=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return h-Math.floor(h)}
// Value noise; px/py make it tile (period measured in noise cells).
function noise2(x,y,s=0,px=0,py=0){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
 const H=(a,b)=>hash3(px?((a%px)+px)%px:a,py?((b%py)+py)%py:b,s);const a=H(xi,yi),b=H(xi+1,yi),c=H(xi,yi+1),d=H(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,y,s=0,oct=4,px=0,py=0){let t=0,amp=.5,f=1,n=0;for(let i=0;i<oct;i++){t+=amp*noise2(x*f,y*f,s+i*19,px*f,py*f);n+=amp;f*=2;amp*=.5}return t/n}

// ---------- renderer, scene, camera, light ----------
let software=false;
const G={ok:false,time:0,quality:1,grassDensity:.65,shadows:true,tex:{},mat:{}};
(function setup(){
 if(!window.THREE){software=true;return}
 try{G.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',stencil:false})}catch(e){software=true;console.warn('WebGL unavailable',e);return}
 const r=G.renderer;r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.0;
 r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFShadowMap;G.maxAniso=Math.min(8,r.capabilities.getMaxAnisotropy());
 G.scene=new THREE.Scene();G.camera=new THREE.PerspectiveCamera(prefs.fov,innerWidth/Math.max(1,innerHeight),.08,2600);
 G.haze=new THREE.Color('#bcd6ee');G.scene.fog=new THREE.FogExp2(G.haze,.0042);G.scene.background=G.haze.clone();
 // Warm sun from the upper left, like the Skyhaven concept art.
 G.sunDir=new THREE.Vector3(-.66,.52,-.42).normalize();
 G.sun=new THREE.DirectionalLight('#ffe4b8',3.5);G.sun.castShadow=true;const sc=G.sun.shadow.camera;sc.left=-17;sc.right=17;sc.top=17;sc.bottom=-17;sc.near=1;sc.far=90;
 G.sun.shadow.mapSize.set(1024,1024);G.sun.shadow.bias=-.0004;G.sun.shadow.normalBias=.035;G.sun.shadow.radius=2.5;G.scene.add(G.sun,G.sun.target);
 G.hemi=new THREE.HemisphereLight('#bfd9f6','#8c7550',.75);G.scene.add(G.hemi);
 G.sky=makeSky(1200);G.scene.add(G.sky);
 try{const pm=new THREE.PMREMGenerator(r),env=new THREE.Scene();env.add(makeSky(400));G.scene.environment=pm.fromScene(env,.03).texture;G.scene.environmentIntensity=.42;pm.dispose()}catch(e){console.warn('environment light skipped',e)}
 G.ok=true;
})();

function makeSky(radius){
 const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{uSun:{value:G.sunDir},uZen:{value:new THREE.Color('#1a52bd')},uMid:{value:new THREE.Color('#4a8fe3')},uHor:{value:new THREE.Color('#c2dcf2')},uLow:{value:new THREE.Color('#e4eef6')},uSunCol:{value:new THREE.Color('#fff0c8')}},
  vertexShader:'varying vec3 vDir;void main(){vDir=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
  fragmentShader:`uniform vec3 uSun,uZen,uMid,uHor,uLow,uSunCol;varying vec3 vDir;
  void main(){vec3 d=normalize(vDir);float h=d.y;vec3 c=mix(uHor,uMid,smoothstep(0.,.2,h));c=mix(c,uZen,smoothstep(.2,.8,h));c=mix(c,uLow,smoothstep(0.,-.25,h));
  float s=max(dot(d,uSun),0.);c+=uSunCol*(pow(s,5.)*.2+pow(s,40.)*.45+pow(s,700.)*5.);c+=vec3(.22,.12,.02)*pow(s,3.)*(1.-smoothstep(0.,.35,abs(h)))*.6;
  gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`});
 const s=new THREE.Mesh(new THREE.SphereGeometry(radius,32,16),m);s.renderOrder=-10;s.frustumCulled=false;return s;
}

G.setQuality=function(q){
 G.quality=q=Number(q)||1;G.shadows=q>=1;G.grassDensity=q>=1.5?1:q>=1?.65:.32;
 if(!G.ok)return;const size=q>=1.5?2048:1024;G.renderer.shadowMap.enabled=G.shadows;G.sun.castShadow=G.shadows;
 if(G.sun.shadow.mapSize.x!==size){G.sun.shadow.mapSize.set(size,size);if(G.sun.shadow.map){G.sun.shadow.map.dispose();G.sun.shadow.map=null}}
 G.scene.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true)});
};
G.resize=function(){
 const w=Math.max(2,innerWidth),h=Math.max(2,innerHeight),q=G.quality,dpr=devicePixelRatio||1,longSide=Math.max(w,h);
 const cap=q>=1.5?Math.min(2,2600/longSide):q>=1?Math.min(1.5,1900/longSide):Math.min(1,1280/longSide)*.9;
 const pr=Math.max(.5,Math.min(dpr,cap));if(G._w!==w||G._h!==h||G._pr!==pr){G._w=w;G._h=h;G._pr=pr;G.renderer.setPixelRatio(pr);G.renderer.setSize(w,h,false);G.camera.aspect=w/h;G.camera.updateProjectionMatrix()}
};
// Keep the shadow map centred on Ranger, snapped to texels so shadows do not shimmer.
G.follow=function(x,y,z){const step=34/G.sun.shadow.mapSize.x;x=Math.round(x/step)*step;z=Math.round(z/step)*step;G.sun.target.position.set(x,y,z);G.sun.position.set(x,y,z).addScaledVector(G.sunDir,45);G.sun.target.updateMatrixWorld()};
G.render=function(){G.sky.position.copy(G.camera.position);G.renderer.render(G.scene,G.camera)};

// ---------- canvas texture helpers ----------
function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function canvasTexture(c,{color=true,repeat=true}={}){const t=new THREE.CanvasTexture(c);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=G.maxAniso||4;t.needsUpdate=true;return t}
function roundPoly(g,pts,r){g.beginPath();const n=pts.length;for(let i=0;i<n;i++){const a=pts[(i+n-1)%n],b=pts[i],c=pts[(i+1)%n];const p1=[b[0]+(a[0]-b[0])*r,b[1]+(a[1]-b[1])*r],p2=[b[0]+(c[0]-b[0])*r,b[1]+(c[1]-b[1])*r];i?g.lineTo(...p1):g.moveTo(...p1);g.quadraticCurveTo(b[0],b[1],p2[0],p2[1])}g.closePath()}
const shade=(hex,f)=>{const c=new THREE.Color(hex);c.offsetHSL(0,0,f);return '#'+c.getHexString()};

// Flagstone paving, warm sandstone like the plaza in the concept art. One tile = 4 world units.
G.tex.paving=function(){if(G.tex._paving)return G.tex._paving;const S=1024,cc=makeCanvas(S,S),bc=makeCanvas(S,S),g=cc.getContext('2d'),b=bc.getContext('2d'),R=rng(7);
 g.fillStyle='#6b5a45';g.fillRect(0,0,S,S);b.fillStyle='#202020';b.fillRect(0,0,S,S);
 for(let i=0;i<2600;i++){const gr=R()<.55;g.fillStyle=gr?`rgba(${70+R()*40|0},${95+R()*45|0},${42+R()*20|0},${.35+R()*.4})`:`rgba(40,34,28,${.2+R()*.3})`;g.fillRect(R()*S,R()*S,2+R()*6,2+R()*6)}
 const pal=['#d6b98f','#cdae86','#ddc198','#c4a37f','#d2b088','#c9ac8a','#d9bc8f','#b89c7b','#d0b691','#c7a27a'],rows=[];let y=0;
 while(y<S){let h=Math.round(120+R()*140);if(S-y-h<100)h=S-y;rows.push([y,h]);y+=h}
 for(const [ry,rh] of rows){const ws=[];let tot=0;while(tot<S){const w=Math.round(150+R()*250);ws.push(w);tot+=w}const k=S/tot;let x=R()*S;
  for(let w of ws){w*=k;const split=rh>200&&R()<.35,parts=split?[[ry,rh*.48],[ry+rh*.48,rh*.52]]:[[ry,rh]];
   for(const [py,ph] of parts){const spec={x,y:py,w,h:ph,col:pal[R()*pal.length|0],lift:(R()-.5)*.08,jit:[...Array(8)].map(()=>(R()-.5)*14),crack:R()<.28?[R(),R(),R(),R()]:null,moss:R()<.35,spots:[...Array(26)].map(()=>[R(),R(),R(),R()]),bump:205+R()*40|0};
    for(const ox of [-S,0,S])stone(spec,ox)}x+=w}}
 function path(ctx,s,ox){const gp=6,x0=s.x+ox+gp,y0=s.y+gp,x1=s.x+ox+s.w-gp,y1=s.y+s.h-gp,j=s.jit;roundPoly(ctx,[[x0+j[0],y0+j[1]],[x1+j[2],y0+j[3]],[x1+j[4],y1+j[5]],[x0+j[6],y1+j[7]]],.12)}
 function stone(s,ox){path(g,s,ox);g.save();g.clip();g.fillStyle=shade(s.col,s.lift);g.fillRect(s.x+ox,s.y,s.w,s.h);
  const lg=g.createLinearGradient(s.x+ox,s.y,s.x+ox+s.w,s.y+s.h);lg.addColorStop(0,'rgba(255,248,230,.16)');lg.addColorStop(1,'rgba(60,45,30,.16)');g.fillStyle=lg;g.fillRect(s.x+ox,s.y,s.w,s.h);
  for(const [a,b2,c,d] of s.spots){g.fillStyle=c<.5?`rgba(90,75,55,${.06+d*.09})`:`rgba(255,250,235,${.05+d*.08})`;g.beginPath();g.ellipse(s.x+ox+a*s.w,s.y+b2*s.h,4+c*16,3+d*10,c*3,0,7);g.fill()}
  if(s.moss){g.fillStyle='rgba(98,122,52,.28)';g.beginPath();g.ellipse(s.x+ox+s.w*.15,s.y+s.h*.88,s.w*.25,s.h*.12,0,0,7);g.fill()}
  if(s.crack){g.strokeStyle='rgba(60,48,36,.55)';g.lineWidth=2.2;g.beginPath();let cx=s.x+ox+s.crack[0]*s.w,cy=s.y;g.moveTo(cx,cy);for(let i=1;i<=6;i++){cx+=(s.crack[(i+1)%4]-.5)*s.w*.22;cy+=s.h/6;g.lineTo(cx,cy)}g.stroke()}
  g.strokeStyle='rgba(55,44,32,.5)';g.lineWidth=12;path(g,s,ox);g.stroke();g.strokeStyle='rgba(255,246,226,.18)';g.lineWidth=3;g.save();g.translate(3,3);path(g,s,ox);g.stroke();g.restore();g.restore();
  path(b,s,ox);b.fillStyle=`rgb(${s.bump},${s.bump},${s.bump})`;b.fill();b.save();b.clip();b.strokeStyle='rgba(40,40,40,.85)';b.lineWidth=16;path(b,s,ox);b.stroke();b.restore()}
 const map=canvasTexture(cc),bump=canvasTexture(bc,{color:false});return G.tex._paving={map,bump}};

// Greyscale rock detail for cliffs (tinted by vertex colours).
G.tex.rock=function(){if(G.tex._rock)return G.tex._rock;const S=256,c=makeCanvas(S,S),g=c.getContext('2d'),img=g.createImageData(S,S);
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){const u=x/S,v=y/S,strata=fbm(u*4,v*18,3,4,4,18),grain=fbm(u*16,v*16,9,3,16,16),crack=Math.abs(fbm(u*10,v*3,5,3,10,3)-.5);
  let val=.66+.24*strata+.12*grain-(crack<.03?.22*(1-crack/.03):0);val=clamp(val,0,1)*255;const i=(y*S+x)*4;img.data[i]=val;img.data[i+1]=val*.985;img.data[i+2]=val*.96;img.data[i+3]=255}
 g.putImageData(img,0,0);return G.tex._rock=canvasTexture(c)};

// Dressed stone blocks for arches, pillars and the temple. One tile = 2 world units.
G.tex.blocks=function(){if(G.tex._blocks)return G.tex._blocks;const S=512,c=makeCanvas(S,S),g=c.getContext('2d'),bc=makeCanvas(S,S),b=bc.getContext('2d'),R=rng(31);
 g.fillStyle='#5d564c';g.fillRect(0,0,S,S);b.fillStyle='#222';b.fillRect(0,0,S,S);const rowH=S/4;
 for(let r=0;r<4;r++){let x=(r%2)*S*.25+R()*30;const parts=[];let tot=0;while(tot<S){const w=S*(.3+R()*.25);parts.push(w);tot+=w}const k=S/tot;
  for(const w0 of parts){const w=w0*k,col=shade(['#c9bca4','#bfb197','#d2c6ae','#b6a993','#c4b59b'][R()*5|0],(R()-.5)*.07),bump=200+R()*45|0,spots=[...Array(18)].map(()=>[R(),R(),R()]),moss=R()<.3;
   for(const ox of [-S,0,S]){const X=x+ox+4,Y=r*rowH+4,W=w-8,H=rowH-8;g.fillStyle=col;g.beginPath();g.roundRect(X,Y,W,H,7);g.fill();
    g.save();g.clip();for(const [a,bb,cc2] of spots){g.fillStyle=cc2<.5?'rgba(80,68,52,.12)':'rgba(255,250,236,.1)';g.beginPath();g.ellipse(X+a*W,Y+bb*H,5+cc2*14,3+cc2*8,0,0,7);g.fill()}
    if(moss){const mg=g.createLinearGradient(0,Y+H,0,Y+H*.4);mg.addColorStop(0,'rgba(92,120,48,.55)');mg.addColorStop(1,'rgba(92,120,48,0)');g.fillStyle=mg;g.fillRect(X,Y,W,H)}
    g.strokeStyle='rgba(50,42,32,.45)';g.lineWidth=8;g.beginPath();g.roundRect(X,Y,W,H,7);g.stroke();g.strokeStyle='rgba(255,248,230,.2)';g.lineWidth=2;g.beginPath();g.moveTo(X+4,Y+H-3);g.lineTo(X+4,Y+4);g.lineTo(X+W-4,Y+4);g.stroke();g.restore();
    b.fillStyle=`rgb(${bump},${bump},${bump})`;b.beginPath();b.roundRect(X,Y,W,H,7);b.fill()}
   x+=w}}
 return G.tex._blocks={map:canvasTexture(c),bump:canvasTexture(bc,{color:false})}};

G.tex.wood=function(){if(G.tex._wood)return G.tex._wood;const S=256,c=makeCanvas(S,S),g=c.getContext('2d'),R=rng(5);g.fillStyle='#7b5636';g.fillRect(0,0,S,S);
 for(let i=0;i<4;i++){const x=i*S/4;g.fillStyle=shade('#7b5636',(R()-.5)*.08);g.fillRect(x+2,0,S/4-4,S);for(let k=0;k<22;k++){g.strokeStyle=`rgba(${R()<.5?'60,38,22':'150,112,74'},${.15+R()*.25})`;g.lineWidth=1+R()*2;g.beginPath();const xx=x+4+R()*(S/4-8);g.moveTo(xx,0);g.bezierCurveTo(xx+(R()-.5)*10,S*.3,xx+(R()-.5)*10,S*.7,xx+(R()-.5)*6,S);g.stroke()}
  g.fillStyle='rgba(30,20,12,.6)';g.fillRect(x,0,2,S)}return G.tex._wood=canvasTexture(c)};

// Red Skyhaven banner with the white compass rose, gold trim and a tattered hem.
G.tex.banner=function(){if(G.tex._banner)return G.tex._banner;const W=256,H=512,c=makeCanvas(W,H),g=c.getContext('2d');
 const lg=g.createLinearGradient(0,0,W,0);for(const [s,col] of [[0,'#7d1d1b'],[.18,'#b8352f'],[.5,'#c63d35'],[.82,'#b2302b'],[1,'#7a1c1a']])lg.addColorStop(s,col);g.fillStyle=lg;g.fillRect(0,0,W,H);
 for(let i=0;i<9;i++){g.fillStyle=`rgba(0,0,0,${.05+.05*(i%2)})`;g.fillRect(i*W/9,0,W/18,H)}
 g.strokeStyle='#e0b45c';g.lineWidth=7;g.strokeRect(14,10,W-28,H-80);g.lineWidth=2.5;g.strokeRect(26,22,W-52,H-104);
 const cx=W/2,cy=H*.4;g.strokeStyle='#f6efe0';g.fillStyle='#f6efe0';g.lineWidth=5;g.beginPath();g.arc(cx,cy,64,0,7);g.stroke();g.lineWidth=2;g.beginPath();g.arc(cx,cy,50,0,7);g.stroke();
 for(let i=0;i<8;i++){const a=i*Math.PI/4,L=i%2?58:94,w=i%2?10:15;g.beginPath();g.moveTo(cx+Math.cos(a)*L,cy+Math.sin(a)*L);g.lineTo(cx+Math.cos(a+Math.PI/2)*w,cy+Math.sin(a+Math.PI/2)*w);g.lineTo(cx,cy);g.closePath();g.fill();
  g.beginPath();g.moveTo(cx+Math.cos(a)*L,cy+Math.sin(a)*L);g.lineTo(cx+Math.cos(a-Math.PI/2)*w,cy+Math.sin(a-Math.PI/2)*w);g.lineTo(cx,cy);g.closePath();g.globalAlpha=.75;g.fill();g.globalAlpha=1}
 g.globalCompositeOperation='destination-out';g.beginPath();g.moveTo(0,H);for(let i=0;i<=8;i++){g.lineTo(i*W/8,H-(i%2?70:18));}g.lineTo(W,H);g.closePath();g.fill();g.globalCompositeOperation='source-over';
 return G.tex._banner=canvasTexture(c,{repeat:false})};

// Glowing cyan glyphs (emissive) on dark slate, for rune panels.
G.tex.runes=function(){if(G.tex._runes)return G.tex._runes;const W=128,H=256,c=makeCanvas(W,H),g=c.getContext('2d'),e=makeCanvas(W,H),k=e.getContext('2d'),R=rng(13);
 g.fillStyle='#3e4c50';g.fillRect(0,0,W,H);for(let i=0;i<300;i++){g.fillStyle=`rgba(${R()<.5?'20,30,34':'140,160,160'},${R()*.15})`;g.fillRect(R()*W,R()*H,3,3)}k.fillStyle='#000';k.fillRect(0,0,W,H);
 for(const ctx of [g,k]){ctx.strokeStyle=ctx===g?'#8ff6ff':'#5ff2ff';ctx.lineWidth=5;ctx.lineCap='round';ctx.strokeRect(14,14,W-28,H-28);ctx.beginPath();ctx.moveTo(W/2,40);ctx.lineTo(W-34,H/2-20);ctx.lineTo(W/2,H/2+10);ctx.lineTo(34,H/2-20);ctx.closePath();ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,H*.7,20,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(W/2,H*.7-30);ctx.lineTo(W/2,H*.7+30);ctx.moveTo(W/2-30,H*.7);ctx.lineTo(W/2+30,H*.7);ctx.stroke()}
 return G.tex._runes={map:canvasTexture(c,{repeat:false}),emissive:canvasTexture(e,{repeat:false})}};

// Gold compass-rose floor inlay with a glowing blue heart (the plaza centrepiece in the concept art).
G.tex.compass=function(){if(G.tex._compass)return G.tex._compass;const S=1024,c=makeCanvas(S,S),g=c.getContext('2d'),e=makeCanvas(S,S),k=e.getContext('2d'),C=S/2;
 k.fillStyle='#000';k.fillRect(0,0,S,S);
 const ring=(r,w,col)=>{g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.arc(C,C,r,0,7);g.stroke()};
 g.fillStyle='rgba(166,140,104,.95)';g.beginPath();g.arc(C,C,500,0,7);g.fill();
 const gold=g.createRadialGradient(C-120,C-160,40,C,C,520);gold.addColorStop(0,'#f6d68a');gold.addColorStop(.6,'#cf9d47');gold.addColorStop(1,'#8f6526');
 ring(488,22,gold);ring(452,8,'#6d5130');ring(420,14,gold);ring(300,10,gold);ring(282,4,'#6d5130');
 for(let i=0;i<72;i++){const a=i*Math.PI/36,r0=i%9?432:404,r1=448;g.strokeStyle=i%9?'#8d6a36':'#f2cf80';g.lineWidth=i%9?3:7;g.beginPath();g.moveTo(C+Math.cos(a)*r0,C+Math.sin(a)*r0);g.lineTo(C+Math.cos(a)*r1,C+Math.sin(a)*r1);g.stroke()}
 for(let i=0;i<16;i++){const a=i*Math.PI/8,L=i%4===0?470:i%2?250:330,w=i%4===0?62:i%2?24:40;for(const side of [1,-1]){g.beginPath();g.moveTo(C,C);g.lineTo(C+Math.cos(a)*L,C+Math.sin(a)*L);g.lineTo(C+Math.cos(a+side*Math.PI/2)*w,C+Math.sin(a+side*Math.PI/2)*w);g.closePath();g.fillStyle=side>0?'#f1cd7d':'#b98535';g.fill();g.strokeStyle='#6d4f26';g.lineWidth=3;g.stroke()}}
 for(const ctx of [g,k]){ctx.strokeStyle='#6ef3ff';ctx.lineWidth=7;ctx.beginPath();ctx.arc(C,C,365,0,7);ctx.stroke();ctx.lineWidth=4;ctx.beginPath();ctx.arc(C,C,140,0,7);ctx.stroke();
  for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8;ctx.beginPath();ctx.moveTo(C+Math.cos(a)*150,C+Math.sin(a)*150);ctx.lineTo(C+Math.cos(a)*355,C+Math.sin(a)*355);ctx.lineWidth=3;ctx.stroke()}
  const cg=ctx.createRadialGradient(C,C,4,C,C,100);cg.addColorStop(0,'#c8fbff');cg.addColorStop(.3,'#5fe0f5');cg.addColorStop(1,'rgba(40,200,240,0)');ctx.fillStyle=cg;ctx.beginPath();ctx.arc(C,C,110,0,7);ctx.fill()}
 return G.tex._compass={map:canvasTexture(c,{repeat:false}),emissive:canvasTexture(e,{repeat:false})}};

// Soft radial glow, 4-point sparkle, scent paw print.
G.tex.glow=function(){if(G.tex._glow)return G.tex._glow;const S=128,c=makeCanvas(S,S),g=c.getContext('2d'),r=g.createRadialGradient(S/2,S/2,0,S/2,S/2,S/2);
 r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.18,'rgba(255,255,255,.65)');r.addColorStop(.45,'rgba(255,255,255,.18)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,S,S);return G.tex._glow=canvasTexture(c,{repeat:false})};
G.tex.spark=function(){if(G.tex._spark)return G.tex._spark;const S=128,c=makeCanvas(S,S),g=c.getContext('2d'),C=S/2;const r=g.createRadialGradient(C,C,0,C,C,C*.45);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,S,S);
 for(const [w,h] of [[C,5],[5,C]]){const lg=g.createRadialGradient(C,C,0,C,C,C);lg.addColorStop(0,'rgba(255,255,255,1)');lg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=lg;g.beginPath();g.ellipse(C,C,w,h,0,0,7);g.fill()}return G.tex._spark=canvasTexture(c,{repeat:false})};
G.tex.paw=function(){if(G.tex._paw)return G.tex._paw;const S=64,c=makeCanvas(S,S),g=c.getContext('2d');g.fillStyle='#fff';g.shadowColor='#fff';g.shadowBlur=6;g.beginPath();g.ellipse(32,40,13,11,0,0,7);g.fill();
 for(const [x,y] of [[16,22],[27,15],[38,15],[49,22]]){g.beginPath();g.ellipse(x,y,5.5,7,0,0,7);g.fill()}return G.tex._paw=canvasTexture(c,{repeat:false})};

// Cumulus cloud atlas (2x2 frames), shaded white on top and blue-grey underneath.
G.tex.clouds=function(){if(G.tex._clouds)return G.tex._clouds;const FW=512,FH=256,c=makeCanvas(FW*2,FH*2),g=c.getContext('2d');
 for(let f=0;f<4;f++){const R=rng(101+f),ox=(f%2)*FW,oy=(f>>1)*FH,m=makeCanvas(FW,FH),mg=m.getContext('2d'),puffs=[];
  const n=26+R()*14|0;for(let i=0;i<n;i++){const t=R(),x=FW*(.14+.72*t),hump=Math.sin(t*Math.PI)*(.55+.45*R()),r=FH*(.1+.17*R()+.12*hump),y=FH*.78-r*.55-hump*FH*.3*R();puffs.push([x,y,r])}
  for(let i=0;i<10;i++)puffs.push([FW*(.12+.76*R()),FH*.72,FH*(.08+.08*R())]);
  for(const [x,y,r] of puffs){const rg=mg.createRadialGradient(x,y,r*.15,x,y,r);rg.addColorStop(0,'rgba(255,255,255,1)');rg.addColorStop(.62,'rgba(255,255,255,.92)');rg.addColorStop(1,'rgba(255,255,255,0)');mg.fillStyle=rg;mg.beginPath();mg.arc(x,y,r,0,7);mg.fill()}
  mg.globalCompositeOperation='destination-out';const fade=mg.createLinearGradient(0,FH*.7,0,FH);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,1)');mg.fillStyle=fade;mg.fillRect(0,0,FW,FH);mg.globalCompositeOperation='source-over';
  const s=makeCanvas(FW,FH),sg=s.getContext('2d');const vg=sg.createLinearGradient(0,FH*.15,0,FH*.85);vg.addColorStop(0,'#ffffff');vg.addColorStop(.55,'#f1f5fa');vg.addColorStop(1,'#9fb3cb');sg.fillStyle=vg;sg.fillRect(0,0,FW,FH);
  for(const [x,y,r] of puffs){const hg=sg.createRadialGradient(x-r*.35,y-r*.45,0,x,y,r);hg.addColorStop(0,'rgba(255,255,255,.95)');hg.addColorStop(.5,'rgba(255,255,255,.25)');hg.addColorStop(1,'rgba(255,255,255,0)');sg.fillStyle=hg;sg.beginPath();sg.arc(x,y,r,0,7);sg.fill();
   const dg=sg.createRadialGradient(x+r*.3,y+r*.45,0,x+r*.3,y+r*.45,r*.9);dg.addColorStop(0,'rgba(120,140,170,.22)');dg.addColorStop(1,'rgba(120,140,170,0)');sg.fillStyle=dg;sg.beginPath();sg.arc(x+r*.3,y+r*.45,r*.9,0,7);sg.fill()}
  sg.globalCompositeOperation='destination-in';sg.drawImage(m,0,0);g.drawImage(s,ox,oy)}
 return G.tex._clouds=canvasTexture(c,{repeat:false})};

// Tileable soft cloud floor below the islands.
G.tex.cloudSea=function(){if(G.tex._sea)return G.tex._sea;const S=256,c=makeCanvas(S,S),g=c.getContext('2d'),img=g.createImageData(S,S);
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){const n=fbm(x/S*5,y/S*5,41,5,5,5),v=clamp((n-.32)*1.9,0,1),i=(y*S+x)*4;img.data[i]=200+55*v;img.data[i+1]=212+43*v;img.data[i+2]=228+27*v;img.data[i+3]=255}
 g.putImageData(img,0,0);return G.tex._sea=canvasTexture(c)};

// Scrolling waterfall streaks.
G.tex.water=function(){if(G.tex._water)return G.tex._water;const W=128,H=512,c=makeCanvas(W,H),g=c.getContext('2d'),R=rng(77);g.clearRect(0,0,W,H);
 for(let i=0;i<150;i++){const x=R()*W,w=1+R()*5,y=R()*H,h=40+R()*200,a=.25+R()*.6;const lg=g.createLinearGradient(0,y,0,y+h);lg.addColorStop(0,'rgba(255,255,255,0)');lg.addColorStop(.5,`rgba(${225+R()*30|0},${240+R()*15|0},255,${a})`);lg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=lg;
  for(const oy of [0,-H,H])g.fillRect(x,y+oy,w,h)}
 const t=canvasTexture(c);return G.tex._water=t};

// Leafy clusters for canopies and vines (greyscale detail tinted by vertex colour).
G.tex.leaves=function(){if(G.tex._leaves)return G.tex._leaves;const S=256,c=makeCanvas(S,S),g=c.getContext('2d'),R=rng(23);g.fillStyle='#b8b8b8';g.fillRect(0,0,S,S);
 for(let i=0;i<900;i++){const x=R()*S,y=R()*S,v=165+R()*90|0;g.fillStyle=`rgb(${v},${v},${v})`;g.save();g.translate(x,y);g.rotate(R()*7);g.beginPath();g.ellipse(0,0,4+R()*6,2+R()*3,0,0,7);g.fill();g.restore()}
 return G.tex._leaves=canvasTexture(c)};

// Hanging vine card with leaves (alpha cut-out).
G.tex.vine=function(){if(G.tex._vine)return G.tex._vine;const W=64,H=256,c=makeCanvas(W,H),g=c.getContext('2d'),R=rng(61);
 g.strokeStyle='#4d5e2b';g.lineWidth=3;g.beginPath();g.moveTo(W/2,0);for(let y=0;y<=H;y+=16)g.lineTo(W/2+Math.sin(y*.05)*6,y);g.stroke();
 for(let y=6;y<H-10;y+=9){const side=R()<.5?-1:1,s=1-y/H*.45;g.fillStyle=`hsl(${85+R()*25},${40+R()*20}%,${26+R()*18}%)`;g.save();g.translate(W/2+Math.sin(y*.05)*6,y);g.rotate(side*(.5+R()*.6));g.beginPath();g.ellipse(side*8*s,0,9*s,4.5*s,0,0,7);g.fill();g.restore()}
 return G.tex._vine=canvasTexture(c,{repeat:false})};

// Fine fur / fabric fibre detail for Ranger (near-white so vertex colours stay true).
G.tex.fibre=function(){if(G.tex._fibre)return G.tex._fibre;const S=256,c=makeCanvas(S,S),g=c.getContext('2d'),R=rng(3);g.fillStyle='#eeeeee';g.fillRect(0,0,S,S);
 for(let i=0;i<2600;i++){const x=R()*S,y=R()*S,l=4+R()*9,v=200+R()*55|0;g.strokeStyle=`rgba(${v},${v},${v},.55)`;g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x+(R()-.5)*3,y+l);g.stroke()}
 return G.tex._fibre=canvasTexture(c)};

// ---------- shared materials ----------
G.mat.get=function(name){if(G.mat['_'+name])return G.mat['_'+name];const S=THREE.MeshStandardMaterial;let m;
 switch(name){
  case 'paving':{const t=G.tex.paving();m=new S({map:t.map,bumpMap:t.bump,bumpScale:2.2,roughness:.92,metalness:0});break}
  case 'rock':m=new S({vertexColors:true,map:G.tex.rock(),roughness:.96,flatShading:true});break;
  case 'rockFar':m=new THREE.MeshLambertMaterial({vertexColors:true,map:G.tex.rock(),flatShading:true});break;
  case 'blocks':{const t=G.tex.blocks();m=new S({map:t.map,bumpMap:t.bump,bumpScale:1.6,roughness:.9,vertexColors:true});break}
  case 'wood':m=new S({map:G.tex.wood(),roughness:.85,vertexColors:true});break;
  case 'gold':m=new S({color:'#d9a74c',metalness:.9,roughness:.3});break;
  case 'brass':m=new S({color:'#b4843c',metalness:.85,roughness:.38});break;
  case 'iron':m=new S({color:'#3d3a37',metalness:.6,roughness:.55});break;
  case 'banner':m=new S({map:G.tex.banner(),side:THREE.DoubleSide,alphaTest:.5,roughness:.88});wind(m,'banner');break;
  case 'runes':{const t=G.tex.runes();m=new S({map:t.map,emissiveMap:t.emissive,emissive:new THREE.Color('#5ff0ff'),emissiveIntensity:1.6,roughness:.7});break}
  case 'compass':{const t=G.tex.compass();m=new S({map:t.map,emissiveMap:t.emissive,emissive:new THREE.Color('#62f2ff'),emissiveIntensity:1.0,metalness:.55,roughness:.42,transparent:true,polygonOffset:true,polygonOffsetFactor:-2});break}
  case 'foliage':m=new S({vertexColors:true,map:G.tex.leaves(),roughness:.85});break;
  case 'grass':m=new S({vertexColors:true,side:THREE.DoubleSide,roughness:.86});wind(m,'grass');break;
  case 'vine':m=new S({map:G.tex.vine(),side:THREE.DoubleSide,alphaTest:.45,roughness:.9});wind(m,'vine');break;
  case 'glowCyan':m=new THREE.MeshBasicMaterial({color:new THREE.Color('#7af4ff').multiplyScalar(1.6)});break;
  case 'glowWarm':m=new THREE.MeshBasicMaterial({color:new THREE.Color('#ffd889').multiplyScalar(1.5)});break;
  case 'water':m=new THREE.MeshBasicMaterial({map:G.tex.water(),transparent:true,depthWrite:false,side:THREE.DoubleSide,color:new THREE.Color('#e4f4ff')});break;
  case 'sea':{const t=G.tex.cloudSea();t.repeat.set(10,10);m=new THREE.MeshBasicMaterial({map:t});break}
  case 'vc':m=new S({vertexColors:true,roughness:.8,map:G.tex.fibre()});break;
  case 'vcShiny':m=new S({vertexColors:true,roughness:.38,metalness:.45});break;
  default:m=new S({color:'#ff00ff'})}
 return G.mat['_'+name]=m};

// Gentle wind for grass, banners and vines (vertex shader tweak shared by all instances).
G.windTime={value:0};
function wind(m,kind){m.onBeforeCompile=sh=>{sh.uniforms.uTime=G.windTime;sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  #ifdef USE_INSTANCING
  vec3 ip=(modelMatrix*vec4(instanceMatrix[3].xyz,1.)).xyz;
  #else
  vec3 ip=(modelMatrix*vec4(position,1.)).xyz;
  #endif
  ${kind==='grass'?'float h=max(position.y,0.);float w=sin(uTime*1.8+ip.x*.7+ip.z*.5)*.6+sin(uTime*3.1+ip.x*1.9)*.25;transformed.x+=w*h*h*.55;transformed.z+=w*h*h*.3;'
   :kind==='banner'?'float k=1.-uv.y;float w=sin(uTime*2.3+position.y*2.2+ip.x)*.5+sin(uTime*3.7+position.y*3.1)*.2;transformed.z+=w*k*.22;transformed.x+=w*k*.05;'
   :'float k=1.-uv.y;transformed.x+=sin(uTime*1.3+ip.x+ip.z+position.y)*k*.12;'}`)};m.customProgramCacheKey=()=>'wind-'+kind}

// ---------- instanced camera-facing quads (clouds, glows, sparks) ----------
class Billboards{
 constructor(max,map,{additive=false,fog=true,cols=1,rows=1,renderOrder=0,depthTest=true}={}){
  const base=new THREE.PlaneGeometry(1,1),geo=new THREE.InstancedBufferGeometry();geo.index=base.index;geo.setAttribute('position',base.getAttribute('position'));geo.setAttribute('uv',base.getAttribute('uv'));
  this.a={iPos:new Float32Array(max*3),iSize:new Float32Array(max*3),iCol:new Float32Array(max*4),iFrame:new Float32Array(max)};
  for(const [k,n] of [['iPos',3],['iSize',3],['iCol',4],['iFrame',1]]){const at=new THREE.InstancedBufferAttribute(this.a[k],n);at.setUsage(THREE.DynamicDrawUsage);geo.setAttribute(k,at)}
  geo.instanceCount=0;const uniforms=THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{map:{value:null},grid:{value:new THREE.Vector2(cols,rows)}}]);uniforms.map.value=map;
  this.mat=new THREE.ShaderMaterial({uniforms,fog,transparent:true,depthWrite:false,depthTest,defines:additive?{ADDITIVE:1}:{},
   blending:additive?THREE.CustomBlending:THREE.NormalBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,toneMapped:!additive,
   vertexShader:`attribute vec3 iPos;attribute vec3 iSize;attribute vec4 iCol;attribute float iFrame;uniform vec2 grid;varying vec2 vUv;varying vec4 vCol;varying float vDepth;
   #include <fog_pars_vertex>
   void main(){vec4 mvPosition=modelViewMatrix*vec4(iPos,1.);float c=cos(iSize.z),s=sin(iSize.z);vec2 p=position.xy*iSize.xy;mvPosition.xy+=vec2(c*p.x-s*p.y,s*p.x+c*p.y);
   gl_Position=projectionMatrix*mvPosition;float fx=mod(iFrame,grid.x),fy=floor(iFrame/grid.x);vUv=(uv+vec2(fx,grid.y-1.-fy))/grid;vCol=iCol;vDepth=-mvPosition.z;
   #include <fog_vertex>
   }`,
   fragmentShader:`uniform sampler2D map;varying vec2 vUv;varying vec4 vCol;varying float vDepth;
   #include <fog_pars_fragment>
   void main(){vec4 t=texture2D(map,vUv);
   #ifdef ADDITIVE
    float ff=0.;
    #ifdef USE_FOG
     #ifdef FOG_EXP2
      ff=1.-exp(-fogDensity*fogDensity*vDepth*vDepth);
     #endif
    #endif
    gl_FragColor=vec4(t.rgb*vCol.rgb*t.a*vCol.a*(1.-ff),1.);
   #else
    gl_FragColor=vec4(t.rgb*vCol.rgb,t.a*vCol.a);if(gl_FragColor.a<.004)discard;
    #include <fog_fragment>
    #include <tonemapping_fragment>
   #endif
   #include <colorspace_fragment>
   }`});
  this.mesh=new THREE.Mesh(geo,this.mat);this.mesh.frustumCulled=false;this.mesh.renderOrder=renderOrder;this.geo=geo;this.max=max;this.n=0;
 }
 clear(){this.n=0}
 push(x,y,z,sx,sy,r,g,b,a,frame=0,rot=0){if(this.n>=this.max)return -1;const i=this.n++,A=this.a;A.iPos[i*3]=x;A.iPos[i*3+1]=y;A.iPos[i*3+2]=z;A.iSize[i*3]=sx;A.iSize[i*3+1]=sy;A.iSize[i*3+2]=rot;A.iCol[i*4]=r;A.iCol[i*4+1]=g;A.iCol[i*4+2]=b;A.iCol[i*4+3]=a;A.iFrame[i]=frame;return i}
 commit(){this.geo.instanceCount=this.n;for(const k in this.a){const at=this.geo.getAttribute(k);at.clearUpdateRanges();at.addUpdateRange(0,this.n*at.itemSize);at.needsUpdate=true}}
}

// ---------- geometry helpers ----------
const V3=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function paint(geo,color,vary=0,seed=1){const c=new THREE.Color(color),n=geo.getAttribute('position').count,arr=new Float32Array(n*3),R=rng(seed);
 for(let i=0;i<n;i++){const f=1+(vary?(R()-.5)*vary:0);arr[i*3]=c.r*f;arr[i*3+1]=c.g*f;arr[i*3+2]=c.b*f}geo.setAttribute('color',new THREE.BufferAttribute(arr,3));return geo}
function prep(geo){let g=geo.index?geo.toNonIndexed():geo;if(!g.getAttribute('uv'))g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));if(!g.getAttribute('normal'))g.computeVertexNormals();for(const k of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(k))g.deleteAttribute(k);return g}
function place(geo,{p=[0,0,0],r=[0,0,0],s=[1,1,1]}={}){const m=new THREE.Matrix4().compose(V3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r,'YXZ')),V3(...s));geo.applyMatrix4(m);return geo}
// Collects pieces per material and merges them into a handful of draw calls.
class Batch{constructor(){this.parts=new Map()}
 add(mat,geo){geo=prep(geo);if(!geo.getAttribute('color'))paint(geo,'#ffffff');if(!this.parts.has(mat))this.parts.set(mat,[]);this.parts.get(mat).push(geo);return this}
 build(group,{cast=false,receive=true}={}){for(const [mat,list] of this.parts){const g=THREE.BufferGeometryUtils.mergeGeometries(list,false);list.forEach(x=>x.dispose());if(!g)continue;const m=new THREE.Mesh(g,G.mat.get(mat));m.castShadow=cast;m.receiveShadow=receive;group.add(m)}this.parts.clear();return group}}

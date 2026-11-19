import * as THREE from 'three';
import './styles.css';

const $ = (id) => document.getElementById(id);
const worldEl = $('world');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#a9c5b7');
scene.fog = new THREE.Fog('#a9c5b7', 42, 155);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 260);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
worldEl.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight('#e5f0d4', '#53644b', 1.45);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0ce', 2.35);
sun.position.set(-34, 55, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -48; sun.shadow.camera.right = 48; sun.shadow.camera.top = 48; sun.shadow.camera.bottom = -48;
sun.shadow.bias = -.00025;
scene.add(sun);
const fill = new THREE.DirectionalLight('#b8d5e0', .42); fill.position.set(30, 18, -30); scene.add(fill);
const material = (color, roughness = 1) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cubeMesh = (parent, color, x, y, z, sx, sy, sz, cast = true) => {
  const mesh = new THREE.Mesh(boxGeo, material(color));
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (a, b, x, z) => (a - x) ** 2 + (b - z) ** 2;
const rand = (() => { let seed = 431729; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; })();

const WORLD = 72, TILE = 2, HALF = WORLD * TILE / 2;
function groundHeight(x, z) {
  const mountain = Math.max(0, 1 - Math.hypot(x + 32, z + 38) / 39);
  return Math.max(.85, 1.2 + Math.sin(x * .074) * 1.5 + Math.cos(z * .081) * 1.28 + Math.sin((x + z) * .047) * 1.05 + mountain * 8);
}
function biomeAt(x, z) {
  const coast = x > 43 + Math.sin(z * .09) * 7;
  if (coast) return 'sea';
  if (Math.hypot(x + 32, z + 38) < 22) return 'highland';
  if (Math.hypot(x - 28, z + 28) < 15) return 'village';
  if (Math.hypot(x + 26, z - 22) < 19) return 'mosswood';
  return 'meadow';
}
function heightAt(x, z) { return groundHeight(x, z); }
const groundGeo = boxGeo;
const terrainGroups = {};
const colors = {
  meadow: ['#688651', '#71925a', '#7b9660', '#66804c', '#839866'],
  mosswood: ['#526f4f', '#5b7952', '#637c54', '#58724b'],
  highland: ['#788773', '#899485', '#777f70', '#9c9b89'],
  village: ['#81905c', '#879361', '#718552'],
  beach: ['#c6af78', '#d2bc86'],
};
const groundInst = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), WORLD * WORLD);
groundInst.receiveShadow = true;
const dummy = new THREE.Object3D();
let groundCount = 0;
for (let iz = 0; iz < WORLD; iz++) for (let ix = 0; ix < WORLD; ix++) {
  const x = (ix - WORLD / 2 + .5) * TILE, z = (iz - WORLD / 2 + .5) * TILE;
  const biome = biomeAt(x, z);
  if (biome === 'sea') continue;
  const h = groundHeight(x, z), thickness = Math.max(h, .85);
  dummy.position.set(x, thickness / 2, z); dummy.scale.set(TILE, thickness, TILE); dummy.updateMatrix();
  groundInst.setMatrixAt(groundCount, dummy.matrix);
  let palette = colors[biome] || colors.meadow;
  if (h < 1.45) palette = colors.beach;
  const c = new THREE.Color(palette[Math.floor(rand() * palette.length)]);
  groundInst.setColorAt(groundCount, c); groundCount++;
}
groundInst.count = groundCount; scene.add(groundInst);
const water = new THREE.Mesh(new THREE.PlaneGeometry(340, 310), new THREE.MeshStandardMaterial({ color: '#478d99', roughness: .34, metalness: .04, transparent: true, opacity: .94 }));
water.rotation.x = -Math.PI / 2; water.position.set(69, .54, 0); water.receiveShadow = true; scene.add(water);
const farWater = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), material('#759b9b'));
farWater.rotation.x = -Math.PI / 2; farWater.position.set(100, .25, 0); scene.add(farWater);

const resources = [], enemies = [], builds = [], landmarks = [];
function addResource(kind, x, z, group, amount = 1) {
  group.position.set(x, heightAt(x, z), z); scene.add(group);
  resources.push({ kind, x, z, group, amount, gone: false });
}
function treeGroup(scale = 1, autumn = false) {
  const g = new THREE.Group();
  cubeMesh(g, '#68503a', 0, .87 * scale, 0, .44 * scale, 1.75 * scale, .44 * scale);
  const leaf = autumn ? ['#b7784b', '#cc8850', '#d19a5e'] : ['#416847', '#4f7550', '#5b8154', '#688a58'];
  cubeMesh(g, leaf[Math.floor(rand() * leaf.length)], 0, 2.05 * scale, 0, 1.62 * scale, 1.25 * scale, 1.48 * scale);
  cubeMesh(g, leaf[Math.floor(rand() * leaf.length)], -.36 * scale, 2.65 * scale, .13 * scale, .95 * scale, .9 * scale, .94 * scale);
  cubeMesh(g, leaf[Math.floor(rand() * leaf.length)], .39 * scale, 1.76 * scale, -.16 * scale, .91 * scale, .83 * scale, 1.02 * scale);
  return g;
}
function rockGroup(scale = 1) {
  const g = new THREE.Group();
  const rock = cubeMesh(g, '#89908a', 0, .43 * scale, 0, 1.05 * scale, .82 * scale, .91 * scale);
  rock.rotation.y = .3; rock.rotation.x = .08;
  cubeMesh(g, '#a4a69a', -.12 * scale, .89 * scale, -.04 * scale, .52 * scale, .32 * scale, .52 * scale).rotation.y = .4;
  cubeMesh(g, '#a4c4bd', .33 * scale, .77 * scale, .21 * scale, .16 * scale, .13 * scale, .15 * scale);
  return g;
}
function berryGroup() {
  const g = new THREE.Group();
  cubeMesh(g, '#527745', 0, .35, 0, .72, .62, .7);
  for (const [x, z] of [[-.19, -.19], [.17, .11], [-.03, .24]]) { const b = cubeMesh(g, '#d76c55', x, .5, z, .13, .13, .13); b.rotation.y = .4; }
  return g;
}
function createTree(x, z, scale = .8 + rand() * .35) { addResource('wood', x, z, treeGroup(scale, biomeAt(x,z) === 'highland'), 1 + Math.floor(rand() * 2)); }
function createRock(x, z) { addResource('stone', x, z, rockGroup(.65 + rand() * .42), 1 + Math.floor(rand() * 2)); }
function createBerry(x, z) { addResource('berry', x, z, berryGroup(), 2 + Math.floor(rand() * 2)); }

// A wide, light forest with deliberate clearings for the village and the player's first camp.
for (let i = 0; i < 145; i++) {
  const x = (rand() - .5) * 132, z = (rand() - .5) * 132;
  if (biomeAt(x,z) === 'sea' || Math.hypot(x, z) < 11 || (Math.hypot(x - 28, z + 28) < 16)) continue;
  if (rand() < .77) createTree(x, z);
}
for (let i = 0; i < 58; i++) {
  const x = (rand() - .5) * 127, z = (rand() - .5) * 127;
  if (biomeAt(x,z) === 'sea' || Math.hypot(x, z) < 8) continue;
  createRock(x, z);
}
for (let i = 0; i < 29; i++) {
  const x = (rand() - .5) * 94, z = (rand() - .5) * 98;
  if (biomeAt(x,z) !== 'sea') createBerry(x, z);
}

// Little Farthing: a few handmade voxel cottages on a rise above the coast.
function house(x, z, tint = '#d7bd85') {
  const g = new THREE.Group(); const y = heightAt(x, z);
  cubeMesh(g, '#c09b6d', 0, 1.25, 0, 4.7, 2.5, 3.8);
  cubeMesh(g, tint, 0, 2.95, 0, 5.2, 1.15, 4.4);
  cubeMesh(g, '#754c39', 0, 1.8, 1.94, .8, 1.45, .08);
  cubeMesh(g, '#94b8aa', -1.35, 1.75, 1.97, .68, .68, .08);
  cubeMesh(g, '#94b8aa', 1.35, 1.75, 1.97, .68, .68, .08);
  cubeMesh(g, '#6d4935', 0, 3.72, 0, .5, .78, .5);
  g.position.set(x, y, z); scene.add(g); landmarks.push({name:'LITTLE FARTHING',x,z});
}
house(28, -25, '#d9c386'); house(37, -31, '#c5986f'); house(22, -37, '#c5c58b');
const cave = new THREE.Group();
cubeMesh(cave, '#777a70', 0, 1.5, 0, 6, 3, 2.3);
const caveMouth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, .14), material('#182629'));
caveMouth.position.set(0, 1.1, 1.18); cave.add(caveMouth); cave.position.set(-33, heightAt(-33,-39), -39); scene.add(cave);
landmarks.push({name:'MOONSTONE CAVE', x:-33, z:-39});

function makePlayer() {
  const g = new THREE.Group();
  const clothes = material('#627755'), skin = material('#d1a782'), dark = material('#39423a');
  const torso = new THREE.Mesh(boxGeo, clothes); torso.scale.set(.78, 1.05, .52); torso.position.y = 1.08; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(boxGeo, skin); head.scale.set(.58, .62, .57); head.position.y = 1.95; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(boxGeo, dark); hair.scale.set(.66, .22, .65); hair.position.y = 2.27; hair.castShadow = true; g.add(hair);
  const pack = new THREE.Mesh(boxGeo, material('#9c7546')); pack.scale.set(.55, .66, .25); pack.position.set(0, 1.1, -.37); pack.castShadow = true; g.add(pack);
  const scarf = new THREE.Mesh(boxGeo, material('#cb7655')); scarf.scale.set(.8, .18, .56); scarf.position.set(0, 1.58, .03); g.add(scarf);
  for (const x of [-.22,.22]) { const leg = new THREE.Mesh(boxGeo, material('#4c5141')); leg.scale.set(.25,.68,.32); leg.position.set(x,.34,0); leg.castShadow = true; g.add(leg); }
  g.userData.torso = torso; return g;
}
const player = { x: 0, z: 0, hp: 100, hunger: 87, wood: 0, stone: 0, berries: 0, blade: false, cart: false, riding: false, alive: true, facing: 0, attackCooldown: 0, walk: 0, character: 0 };
const playerMesh = makePlayer(); scene.add(playerMesh);
const fox = new THREE.Group();
cubeMesh(fox, '#c57742', 0, .35, 0, .83, .55, .48);
cubeMesh(fox, '#dc9a56', -.15, .55, .13, .35, .37, .38);
cubeMesh(fox, '#bd6d3c', .48, .6, -.02, .38, .2, .22).rotation.z = -.55;
cubeMesh(fox, '#f0d2a0', -.32, .35, .26, .24, .16, .08); scene.add(fox);

function makeWolf(x, z) {
  const g = new THREE.Group();
  cubeMesh(g, '#7b7f75', 0, .62, 0, 1.3, .7, .66);
  cubeMesh(g, '#8e9186', .58, .79, .04, .53, .42, .48);
  cubeMesh(g, '#5d635d', .56, 1.08, .03, .16, .35, .16).rotation.z = -.18;
  cubeMesh(g, '#5d635d', .84, .66, .03, .38, .17, .2);
  for (const [lx,lz] of [[-.4,-.23],[-.4,.23],[.42,-.22],[.42,.22]]) cubeMesh(g, '#525a54', lx, .2, lz, .19, .45, .19);
  const eye = new THREE.Mesh(boxGeo, material('#e0b15f')); eye.scale.set(.09,.09,.08); eye.position.set(.82,.88,.25); g.add(eye);
  g.position.set(x, heightAt(x,z), z); scene.add(g);
  enemies.push({x,z,group:g,hp:3,attack:0,phase:rand()*8,alive:true});
}
for (let i=0;i<8;i++) { let x,z; do { x=(rand()-.5)*95; z=(rand()-.5)*95; } while (Math.hypot(x,z)<22 || biomeAt(x,z)==='sea'); makeWolf(x,z); }

// A few distant ridges give the horizon its own silhouette.
for (let i=0;i<21;i++) {
  const x=-52+rand()*35, z=-65+rand()*18, h=6+rand()*12;
  const peak=new THREE.Mesh(new THREE.ConeGeometry(4+rand()*4,h,5), material(['#758775','#879483','#a29e8b'][Math.floor(rand()*3)]));
  peak.position.set(x,heightAt(x,z)+h/2-2,z); peak.rotation.y=rand()*Math.PI; scene.add(peak);
}

const inventory = $('inventory-items');
function drawInventory() {
  const slots = [
    ['⌁','WILDWOOD',player.wood], ['◇','MOONSTONE',player.stone], ['●','BERRIES',player.berries],
    [player.blade?'⚔':'⌁',player.blade?'FLINT BLADE':'TOOLS',player.blade?1:0],
  ];
  inventory.innerHTML = slots.map((s,i)=>`<div class="item-slot ${i===0?'active':''}"><label>${i+1}</label><span>${s[0]}</span><small>${s[2]}</small></div>`).join('');
}
function showToast(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(showToast.timer);
  showToast.timer = setTimeout(()=>el.classList.remove('show'), 1900);
}
function questUpdate() {
  const woodDone=player.wood>=3, stoneDone=player.stone>=2, fireDone=builds.some(b=>b.kind==='fire');
  $('quest-wood').textContent=`${Math.min(player.wood,3)} / 3`;
  $('quest-stone').textContent=`${Math.min(player.stone,2)} / 2`;
  $('quest-fire').textContent=`${fireDone?1:0} / 1`;
  document.querySelectorAll('.quest-line').forEach((el,i)=>el.classList.toggle('done',[woodDone,stoneDone,fireDone][i]));
  $('quest-progress').style.width=`${([woodDone,stoneDone,fireDone].filter(Boolean).length/3)*100}%`;
  $('quest-count').textContent=`${[woodDone,stoneDone,fireDone].filter(Boolean).length} / 03`;
  if(woodDone&&stoneDone&&fireDone&&!questUpdate.done){questUpdate.done=true;showToast('FIRST LIGHT COMPLETE · THE WILDS ARE YOURS');}
}
function updateStatus() {
  $('health-meter').style.width=`${player.hp}%`; $('health-number').textContent=Math.ceil(player.hp);
  $('hunger-meter').style.width=`${player.hunger}%`; $('hunger-number').textContent=Math.ceil(player.hunger);
  drawInventory(); questUpdate();
}
function closestResource() {
  let best=null, bd=Infinity;
  for(const r of resources){if(r.gone)continue;const d=dist2(player.x,player.z,r.x,r.z);if(d<bd){bd=d;best=r;}}
  return best&&bd<23?best:null;
}
function interact() {
  if(!started||!player.alive) return;
  const r=closestResource();
  if(r&&dist2(player.x,player.z,r.x,r.z)<20){
    r.gone=true;scene.remove(r.group);
    if(r.kind==='wood'){player.wood+=r.amount;showToast(`+${r.amount} WILDWOOD · THE FOREST GIVES`);}
    if(r.kind==='stone'){player.stone+=r.amount;showToast(`+${r.amount} MOONSTONE · COLD TO THE TOUCH`);}
    if(r.kind==='berry'){player.berries+=r.amount;player.hunger=Math.min(100,player.hunger+9);showToast(`+${r.amount} WILD BERRIES · A LITTLE SWEETER`);}
    updateStatus();return;
  }
  const nearEnemy=enemies.find(e=>e.alive&&dist2(player.x,player.z,e.x,e.z)<14);
  if(nearEnemy){attack();return;}
  showToast('NOTHING TO GATHER HERE · FOLLOW THE PINES');
}
function attack() {
  if(!started||!player.alive||player.attackCooldown>0)return;
  player.attackCooldown=.65;
  playerMesh.rotation.y=player.facing;
  let hit=0;
  for(const e of enemies){if(!e.alive)continue;const d=Math.sqrt(dist2(player.x,player.z,e.x,e.z));if(d<4.2){e.hp-=player.blade?2:1;hit++;e.group.position.y+=.18;if(e.hp<=0){e.alive=false;scene.remove(e.group);player.stone+=1;showToast('WOLF TURNED BACK · +1 MOONSTONE');}}}
  if(!hit)showToast('A QUICK STRIKE · WATCH THE WILDS');
  updateStatus();
}
function build(kind) {
  if(!started||!player.alive)return;
  const costs={fire:[3,2],blade:[2,2],cart:[5,3]}, [w,s]=costs[kind];
  if(player.wood<w||player.stone<s){showToast(`NEED ${w} WILDWOOD · ${s} MOONSTONE`);return;}
  player.wood-=w;player.stone-=s;
  if(kind==='blade'){player.blade=true;showToast('FLINTWOOD BLADE CRAFTED · STRIKE WITH F');}
  else {
    const g=new THREE.Group(), x=player.x+Math.sin(player.facing)*2.7,z=player.z+Math.cos(player.facing)*2.7,y=heightAt(x,z);
    if(kind==='fire'){
      cubeMesh(g,'#71503a',0,.18,0,1.3,.28,.8);cubeMesh(g,'#8e6241',0,.4,0,.17,.48,.17).rotation.z=.72;
      const flame=new THREE.Mesh(new THREE.ConeGeometry(.27,.8,5),new THREE.MeshStandardMaterial({color:'#ed9951',emissive:'#c94e23',emissiveIntensity:1.2,flatShading:true}));flame.position.y=.82;g.add(flame);
      const glow=new THREE.PointLight('#ff9b55',1.5,8);glow.position.y=1.1;g.add(glow);
    }else{
      cubeMesh(g,'#755538',0,.55,0,1.7,.35,1);cubeMesh(g,'#796044',0,.22,.52,.11,.44,.11);cubeMesh(g,'#796044',0,.22,-.52,.11,.44,.11);
      const wheel1=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.16,8),material('#373b35'));wheel1.rotation.z=Math.PI/2;wheel1.position.set(-.83,.31,0);g.add(wheel1);
      const wheel2=wheel1.clone();wheel2.position.x=.83;g.add(wheel2);
    }
    g.position.set(x,y,z);g.rotation.y=player.facing;scene.add(g);builds.push({kind,x,z,group:g});
    if(kind==='fire')showToast('WAYFARER’S FIRE · A SMALL WARMTH AGAINST THE DARK');
    else{player.cart=true;showToast('TRAIL CART BUILT · PRESS V TO RIDE');}
  }
  $('craft-menu').classList.remove('open');updateStatus();
}
let started=false;
const keys=new Set();
let moveX=0,moveZ=0, mobilePointer=null, soundOn=false;
function toggleCraft(){if(!started||!player.alive)return;$('craft-menu').classList.toggle('open');}
function beginGame(){started=true;$('start-screen').classList.add('hidden');showToast('THE OLD ROAD IS EAST · LITTLE FARTHING AWAITS');}
$('start-button').addEventListener('click',beginGame);
$('close-craft').addEventListener('click',()=>$('craft-menu').classList.remove('open'));
document.querySelectorAll('.recipe').forEach(el=>el.addEventListener('click',()=>build(el.dataset.recipe)));
$('touch-build').addEventListener('pointerdown',e=>{e.preventDefault();toggleCraft();});
$('touch-use').addEventListener('pointerdown',e=>{e.preventDefault();interact();});
$('touch-attack').addEventListener('pointerdown',e=>{e.preventDefault();attack();});
$('character-button').addEventListener('click',()=>{
  player.character=(player.character+1)%2;
  if(player.character===0){$('player-name').textContent='ROWAN';$('portrait-icon').textContent='✦';playerMesh.userData.torso.material.color.set('#627755');}
  else{$('player-name').textContent='JUNIPER';$('portrait-icon').textContent='❋';playerMesh.userData.torso.material.color.set('#657a89');}
  showToast(`${$('player-name').textContent} · THE WAYFINDER`);
});
$('sound-toggle').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'♫':'♪';showToast(soundOn?'FIELD AMBIENCE ON':'FIELD AMBIENCE OFF');});
$('restart-button').addEventListener('click',()=>location.reload());
window.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  keys.add(e.code);
  if(e.repeat)return;
  if(e.code==='Space'||e.code==='KeyE')interact();
  if(e.code==='KeyF')attack();
  if(e.code==='KeyB')toggleCraft();
  if(e.code==='Escape')$('craft-menu').classList.remove('open');
  if(e.code==='KeyV'&&player.cart){player.riding=!player.riding;showToast(player.riding?'TRAIL CART · ROLL ON':'BACK ON YOUR FEET');}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
const joy=$('joystick'),stick=$('stick');
joy.addEventListener('pointerdown',e=>{mobilePointer=e.pointerId;joy.setPointerCapture(mobilePointer);setStick(e);});
joy.addEventListener('pointermove',e=>{if(e.pointerId===mobilePointer)setStick(e);});
function setStick(e){const r=joy.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),len=Math.hypot(dx,dy),max=35,k=len>max?max/len:1;moveX=dx*k/max;moveZ=dy*k/max;stick.style.transform=`translate(${dx*k}px,${dy*k}px)`;}
function resetStick(e){if(e.pointerId!==mobilePointer)return;mobilePointer=null;moveX=moveZ=0;stick.style.transform='';}
joy.addEventListener('pointerup',resetStick);joy.addEventListener('pointercancel',resetStick);
window.addEventListener('keydown',e=>{if(e.code==='KeyQ'&&player.berries>0){player.berries--;player.hunger=Math.min(100,player.hunger+22);showToast('WILD BERRIES · YOU FEEL A LITTLE BETTER');updateStatus();}});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());

// Soft voxel rain is a tiny line batch, not a particle system per drop.
const rainPositions=new Float32Array(260*6);
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
const rainMat=new THREE.LineBasicMaterial({color:'#c6d9dc',transparent:true,opacity:.46});
const rain=new THREE.LineSegments(rainGeo,rainMat);rain.visible=false;scene.add(rain);
const weather={rain:false,elapsed:0,next:45};
let dayTime=.31, day=1, hungerTick=0, mapTick=0, toastTick=0;
const clock=new THREE.Clock();
const colorStops=[
  [0,new THREE.Color('#172630'),new THREE.Color('#19252d')],
  [.20,new THREE.Color('#e6a976'),new THREE.Color('#8f9990')],
  [.31,new THREE.Color('#b6d2c2'),new THREE.Color('#a9c5b7')],
  [.54,new THREE.Color('#c6d7c6'),new THREE.Color('#a6c1b2')],
  [.72,new THREE.Color('#e8ad77'),new THREE.Color('#b8937e')],
  [.83,new THREE.Color('#526579'),new THREE.Color('#374852')],
  [1,new THREE.Color('#172630'),new THREE.Color('#19252d')],
];
function skyAt(t,which){for(let i=0;i<colorStops.length-1;i++){if(t>=colorStops[i][0]&&t<=colorStops[i+1][0]){const a=colorStops[i],b=colorStops[i+1],f=(t-a[0])/(b[0]-a[0]);return a[which].clone().lerp(b[which],f);}}return colorStops[0][which].clone();}
function updateDay(dt){
  dayTime+=dt/230;if(dayTime>=1){dayTime-=1;day++;}
  const t=dayTime;const dayFactor=clamp((Math.sin((t-.22)*Math.PI*2)+.18)*1.3, .11,1);
  const sky=skyAt(t,1),bg=skyAt(t,1);scene.background.copy(bg);scene.fog.color.copy(sky);water.material.color.copy(new THREE.Color('#478d99').lerp(sky,.15));
  sun.intensity=lerp(.24,2.1,dayFactor);sun.color.copy(new THREE.Color('#ffba83').lerp(new THREE.Color('#fff1d2'),clamp(dayFactor*1.6,0,1)));
  sun.position.set(Math.cos(t*Math.PI*2)*48,Math.max(7,Math.sin(t*Math.PI*2)*55),24);
  hemi.intensity=lerp(.52,1.52,dayFactor);fill.intensity=lerp(.38,.6,dayFactor);
  const hour=Math.floor((t*24+6)%24), label=hour>=6&&hour<18?'SUNLIT':'MOONRISE';
  $('season-label').textContent=`DAY ${String(day).padStart(2,'0')}  ·  ${label}`;
  weather.elapsed+=dt;
  if(weather.elapsed>weather.next){weather.elapsed=0;weather.next=35+rand()*55;weather.rain=rand()<.42;rain.visible=weather.rain;
    $('weather-icon').textContent=weather.rain?'☂':'☀';$('weather-name').textContent=weather.rain?'SOFT RAIN':'CLEAR SKIES';$('temperature').textContent=weather.rain?'15° · RAIN ON LEAVES':'18° · LIGHT BREEZE';
    if(weather.rain)showToast('A SOFT COASTAL RAIN IS PASSING');
  }
  if(weather.rain){const p=rainGeo.attributes.position.array;for(let i=0;i<260;i++){const x=player.x+(rand()-.5)*48,z=player.z+(rand()-.5)*48,y=3+rand()*18;const j=i*6;p[j]=x;p[j+1]=y;p[j+2]=z;p[j+3]=x-.42;p[j+4]=y-.95;p[j+5]=z+.12;}rainGeo.attributes.position.needsUpdate=true;}
}
function updateEnemies(dt){
  for(const e of enemies){if(!e.alive)continue;e.attack-=dt;e.phase+=dt*3;
    const dx=player.x-e.x,dz=player.z-e.z,d=Math.hypot(dx,dz);
    if(d<20&&d>2.05){e.x+=dx/d*dt*2.15;e.z+=dz/d*dt*2.15;e.group.rotation.y=Math.atan2(dx,dz);}
    else if(d>22){e.x+=Math.sin(e.phase*.37)*dt*.12;e.z+=Math.cos(e.phase*.31)*dt*.12;}
    e.group.position.set(e.x,heightAt(e.x,e.z)+Math.sin(e.phase)*.025,e.z);
    if(d<2.1&&e.attack<=0){e.attack=1.35;player.hp=Math.max(0,player.hp-8);showToast('A WOLF LUNGES · KEEP MOVING');updateStatus();if(player.hp<=0)endGame();}
  }
}
function updateMap(){
  const c=$('minimap'),ctx=c.getContext('2d'),w=c.width,h=c.height,s=w/WORLD;
  ctx.clearRect(0,0,w,h);
  for(let iz=0;iz<WORLD;iz+=2)for(let ix=0;ix<WORLD;ix+=2){const x=(ix-WORLD/2+.5)*TILE,z=(iz-WORLD/2+.5)*TILE,b=biomeAt(x,z);ctx.fillStyle=b==='sea'?'#477e84':b==='highland'?'#aaa68d':b==='mosswood'?'#436e50':b==='village'?'#a2a070':'#7c9864';ctx.fillRect(ix*s,iz*s,s*2+.2,s*2+.2);}
  ctx.fillStyle='#dbc990';for(const l of landmarks){ctx.fillRect((l.x/TILE+WORLD/2)*s-1,(l.z/TILE+WORLD/2)*s-1,3,3);}
  ctx.fillStyle='#d8755d';ctx.beginPath();ctx.arc((player.x/TILE+WORLD/2)*s,(player.z/TILE+WORLD/2)*s,3,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(251,241,207,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w-12,9);ctx.lineTo(w-12,21);ctx.stroke();
}
function updateLocation(){
  let name='THE MOSSWOOD',sub='Lost Coast · 38° north';
  if(player.x>17&&player.z< -15){name='LITTLE FARTHING';sub='Old Coast Road · 2 miles east';}
  else if(player.x < -18 && player.z < -20){name='MOONSTONE RIDGE';sub='High country · 1,240 ft';}
  else if(player.x>38){name='THE LOST COAST';sub='Tide country · mind the edge';}
  else if(player.z>22){name='FERNLOW MEADOW';sub='South trail · birdsong';}
  $('location-name').textContent=name;$('location-sub').textContent=sub;
}
function endGame(){player.alive=false;$('game-over').classList.add('open');}
function animateFox(dt){const tx=player.x-Math.sin(player.facing)*2.1+Math.cos(player.facing)*1.05,tz=player.z-Math.cos(player.facing)*2.1-Math.sin(player.facing)*1.05;fox.position.x=lerp(fox.position.x,tx,Math.min(1,dt*2.8));fox.position.z=lerp(fox.position.z,tz,Math.min(1,dt*2.8));fox.position.y=heightAt(fox.position.x,fox.position.z)+Math.abs(Math.sin(clock.elapsedTime*5))*.09;fox.rotation.y=player.facing;}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);clock.elapsedTime+=dt;updateDay(dt);
  player.attackCooldown=Math.max(0,player.attackCooldown-dt);
  let ix=0,iz=0;if(keys.has('KeyA')||keys.has('ArrowLeft'))ix--;if(keys.has('KeyD')||keys.has('ArrowRight'))ix++;if(keys.has('KeyW')||keys.has('ArrowUp'))iz--;if(keys.has('KeyS')||keys.has('ArrowDown'))iz++;
  ix+=moveX;iz+=moveZ;const len=Math.hypot(ix,iz);if(len>1){ix/=len;iz/=len;}
  if(started&&player.alive&&len>.03){const speed=player.riding?7.3:4.7;player.x+=ix*dt*speed;player.z+=iz*dt*speed;
    player.x=clamp(player.x,-HALF+3,42);player.z=clamp(player.z,-HALF+3,HALF-3);
    if(biomeAt(player.x,player.z)==='sea')player.x-=ix*dt*speed;
    player.facing=Math.atan2(ix,-iz);player.walk+=dt*10;playerMesh.rotation.y=player.facing;playerMesh.position.y=heightAt(player.x,player.z)+Math.abs(Math.sin(player.walk))*.06;
    playerMesh.children[0].rotation.x=Math.sin(player.walk)*.05;
  }else if(started){playerMesh.position.y=heightAt(player.x,player.z)+Math.sin(clock.elapsedTime*2)*.012;}
  playerMesh.position.x=lerp(playerMesh.position.x,player.x,Math.min(1,dt*12));playerMesh.position.z=lerp(playerMesh.position.z,player.z,Math.min(1,dt*12));
  const desired=new THREE.Vector3(player.x,playerMesh.position.y+9.5,player.z+16.5);camera.position.lerp(desired,Math.min(1,dt*2.7));camera.lookAt(player.x,playerMesh.position.y+1.15,player.z-.4);
  if(started&&len>.02){hungerTick+=dt;if(hungerTick>24){hungerTick=0;player.hunger=Math.max(0,player.hunger-1);updateStatus();if(player.hunger===0){player.hp=Math.max(0,player.hp-.5);if(player.hp<=0)endGame();}}}
  if(started)updateEnemies(dt);animateFox(dt);
  const r=closestResource(),label=$('interact-label');if(started&&r&&dist2(player.x,player.z,r.x,r.z)<24){label.classList.add('visible');label.textContent=`SPACE  ·  GATHER ${r.kind.toUpperCase()}`;}else label.classList.remove('visible');
  mapTick+=dt;if(mapTick>.55){mapTick=0;updateMap();updateLocation();}
  renderer.render(scene,camera);
}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(innerWidth,innerHeight);}
window.addEventListener('resize',resize);
playerMesh.position.set(player.x,heightAt(player.x,player.z),player.z);fox.position.set(1,heightAt(1,0),2);updateStatus();updateMap();animate();

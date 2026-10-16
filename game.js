(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const ui={menu:$('menu'),pause:$('pause'),result:$('result'),wrap:$('gameWrap'),start:$('start'),resume:$('resume'),backMenu:$('backMenu'),again:$('again'),resultMenu:$('resultMenu'),healthBar:$('healthBar'),healthNum:$('healthNum'),armorBar:$('armorBar'),armorNum:$('armorNum'),weaponName:$('weaponName'),ammo:$('ammo'),reserve:$('reserve'),smokeCount:$('smokeCount'),toast:$('toast'),hit:$('hitmarker'),objective:$('objective'),enemyStatus:$('enemyStatus'),killfeed:$('killfeed')};
const MAP=[
'111111111111111111111111',
'100000000000000000000001',
'100000111100000111100001',
'100000100000000100000001',
'100000100000000100000001',
'100000100000000100000001',
'100000100000000100000001',
'100000100000000100000001',
'100000000000000000000001',
'100000111111000011110001',
'100000100000000000010001',
'100000100000000000010001',
'100000100000000000010001',
'100000100000000000010001',
'100000100000000000010001',
'100000111100000111100001',
'100000000000000000000001',
'111111111111111111111111'
];
const guns={awp:{name:'AWP / LW',mag:10,reserve:30,damage:100,delay:850,reload:1700,spread:.006,range:19,scope:true,auto:false},ak:{name:'AK-47',mag:30,reserve:120,damage:34,delay:115,reload:1550,spread:.042,range:14,auto:true},m4:{name:'M4A1',mag:30,reserve:120,damage:29,delay:95,reload:1450,spread:.028,range:15,auto:true},scout:{name:'SCOUT',mag:10,reserve:40,damage:72,delay:560,reload:1450,spread:.012,range:17,scope:true,auto:false},smg:{name:'MP5',mag:32,reserve:128,damage:20,delay:68,reload:1300,spread:.06,range:10,auto:true},knife:{name:'TACTICAL KNIFE',mag:0,reserve:0,damage:75,delay:400,reload:0,spread:0,range:1.8,melee:true}};
let selected='awp',weapon='awp',ammo={},reserve={},map=MAP.map(r=>r.split('')),player={x:2.5,y:2.5,a:0,health:100,armor:100},bots=[],smokes=[],keys={},running=false,paused=true,scoped=false,reloading=false,lastShot=0,recoil=0,flash=0,moveBob=0,last=0,toastTimer=0,smokeCharges=2,depthBuffer=[],killCount=0,damageFlash=0,mouseDown=false,botNum=8,difficulty='normal',clearTimer=0,roundCount=0;
const palette={wall:'#b99a6c',wall2:'#8c704d',wall3:'#d0b58a'};const FOV=Math.PI/2.85,MAX=22;
function resize(){const dpr=Math.min(window.devicePixelRatio||1,1.5);const w=Math.max(320,Math.min(1920,window.innerWidth)),h=Math.max(240,Math.min(1200,window.innerHeight));canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);}addEventListener('resize',resize);resize();
function wall(x,y){const ix=Math.floor(x),iy=Math.floor(y);return !map[iy]||map[iy][ix]!=='0'}
function los(x,y,tx,ty){const d=Math.hypot(tx-x,ty-y),n=Math.ceil(d*12);for(let i=1;i<n;i++){let t=i/n;if(wall(x+(tx-x)*t,y+(ty-y)*t))return false}return true}
function angleDiff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function notify(t){ui.toast.textContent=t;ui.toast.classList.add('show');toastTimer=2.2}
function updateHUD(){const g=guns[weapon];ui.healthBar.style.width=Math.max(0,player.health)+'%';ui.healthNum.textContent=Math.ceil(Math.max(0,player.health));ui.armorBar.style.width=Math.max(0,player.armor)+'%';ui.armorNum.textContent=Math.ceil(Math.max(0,player.armor));ui.weaponName.textContent=g.name;ui.ammo.textContent=ammo[weapon]??0;ui.reserve.textContent=reserve[weapon]??0;ui.smokeCount.textContent=smokeCharges;ui.enemyStatus.textContent='ENEMIES: '+bots.filter(b=>b.alive).length+'  |  KILLS: '+killCount}
function randomSpawns(){bots=[];const used=[];const n=botNum;let tries=0;while(bots.length<n&&tries++<2500){const x=1.5+Math.random()*21,y=1.5+Math.random()*15;if(wall(x,y)||Math.hypot(x-player.x,y-player.y)<6||used.some(p=>Math.hypot(p.x-x,p.y-y)<2.2))continue;used.push({x,y});bots.push({x,y,a:Math.random()*Math.PI*2,hp:100,alive:true,alert:false,think:Math.random(),fire:1+Math.random()*2,walk:Math.random()*6,strafe:Math.random()<.5?-1:1,cover:0,hit:0});}}
function initGame(){clearTimer=0;roundCount=1;map=MAP.map(r=>r.split(''));player={x:2.5,y:2.5,a:Math.random()*.12-.06,health:100,armor:100};weapon=selected;ammo={};reserve={};for(const [k,g] of Object.entries(guns)){ammo[k]=g.mag;reserve[k]=g.reserve}smokes=[];smokeCharges=2;scoped=false;reloading=false;killCount=0;damageFlash=0;ui.wrap.classList.remove('scoped');botNum=Number($('botCount').value)||8;difficulty=$('difficulty').value;randomSpawns();updateHUD();ui.objective.textContent='پاکسازی بی‌پایان · گروه ۱';ui.result.classList.add('hidden');ui.pause.classList.add('hidden');ui.menu.classList.add('hidden');ui.wrap.style.display='block';running=true;paused=false;last=performance.now();canvas.requestPointerLock?.();requestAnimationFrame(loop);notify('عملیات شروع شد؛ مراقب آتش دشمن باش')}
function endGame(won){paused=true;if(document.pointerLockElement)document.exitPointerLock();ui.resultTitle.textContent=won?'منطقه پاکسازی شد':'شکست خوردی';ui.resultText.textContent=won?`تمام دشمن‌ها حذف شدند. تعداد حذف‌ها: ${killCount}.`:`حذف‌ها: ${killCount}. از اسموک برای قطع دید دشمن استفاده کن و دوباره تلاش کن.`;ui.result.classList.remove('hidden')}
function goMenu(){running=false;paused=true;if(document.pointerLockElement)document.exitPointerLock();ui.wrap.style.display='none';ui.pause.classList.add('hidden');ui.result.classList.add('hidden');ui.menu.classList.remove('hidden')}
ui.start.onclick=initGame;ui.again.onclick=initGame;ui.resume.onclick=()=>{if(!running)return;paused=false;ui.pause.classList.add('hidden');canvas.requestPointerLock?.();last=performance.now();requestAnimationFrame(loop)};ui.backMenu.onclick=goMenu;ui.resultMenu.onclick=goMenu;
document.querySelectorAll('[data-weapon]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.weapon;document.querySelectorAll('[data-weapon]').forEach(x=>x.classList.toggle('selected',x===b))}));
document.addEventListener('pointerlockchange',()=>{if(running&&!paused&&document.pointerLockElement!==canvas){paused=true;ui.pause.classList.remove('hidden')}});
canvas.addEventListener('click',e=>{if(e.pointerType==='touch')return;if(running&&!paused&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.();else if(running&&!paused)shoot()});canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('mousedown',e=>{if(e.button===2&&running&&!paused&&guns[weapon].scope){scoped=!scoped;ui.wrap.classList.toggle('scoped',scoped);notify(scoped?'اسکوپ فعال':'اسکوپ غیرفعال')}else if(e.button===0)mouseDown=true});canvas.addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false});
document.addEventListener('mousemove',e=>{if(running&&!paused&&document.pointerLockElement===canvas)player.a+=e.movementX*(scoped?.00055:.00215)});
document.addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Escape'&&running&&!paused){paused=true;ui.pause.classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock();return}if(!running||paused)return;const mapKeys={'Digit1':'awp','Digit2':'ak','Digit3':'m4','Digit4':'scout','Digit5':'smg','Digit6':'knife'};if(mapKeys[e.code])switchWeapon(mapKeys[e.code]);if(e.code==='KeyR')reload();if(e.code==='KeyG')throwSmoke()});document.addEventListener('keyup',e=>keys[e.code]=false);
// Touch controls: left virtual stick for movement, right-side drag for look.
const mobileHud=document.getElementById('mobileHud'),movePad=document.getElementById('movePad'),stickKnob=document.getElementById('stickKnob');
let stickPointer=null,lookPointer=null,lookX=0,lookY=0,runTouch=false;
function touchButton(id,down,up){const el=document.getElementById(id);if(!el)return;el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();el.setPointerCapture?.(e.pointerId);down?.(e)});const release=e=>{e.preventDefault();e.stopPropagation();up?.(e)};el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',()=>up?.());}
movePad.addEventListener('pointerdown',e=>{if(!running||paused)return;e.preventDefault();stickPointer=e.pointerId;movePad.setPointerCapture?.(e.pointerId);updateStick(e)});
movePad.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer){e.preventDefault();updateStick(e)}});
function releaseStick(e){if(stickPointer!==null&&( !e||e.pointerId===stickPointer)){stickPointer=null;keys.KeyW=keys.KeyA=keys.KeyS=keys.KeyD=false;stickKnob.style.transform='translate(0,0)'}}
movePad.addEventListener('pointerup',releaseStick);movePad.addEventListener('pointercancel',releaseStick);movePad.addEventListener('lostpointercapture',()=>releaseStick());
function updateStick(e){const r=movePad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,max=36,len=Math.hypot(dx,dy)||1;if(len>max){dx=dx/len*max;dy=dy/len*max}stickKnob.style.transform=`translate(${dx}px,${dy}px)`;const nx=dx/max,ny=dy/max;keys.KeyW=ny<-.25;keys.KeyS=ny>.25;keys.KeyA=nx<-.25;keys.KeyD=nx>.25}
canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!running||paused)return;const x=e.clientX,y=e.clientY;if(x>innerWidth*.38){lookPointer=e.pointerId;lookX=x;lookY=y;canvas.setPointerCapture?.(e.pointerId)}},{passive:false});
canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'||e.pointerId!==lookPointer||paused||!running)return;e.preventDefault();const dx=e.clientX-lookX;lookX=e.clientX;lookY=e.clientY;player.a+=dx*(scoped?.006:.0105)},{passive:false});
function releaseLook(e){if(lookPointer!==null&&(!e||e.pointerId===lookPointer))lookPointer=null}canvas.addEventListener('pointerup',releaseLook);canvas.addEventListener('pointercancel',releaseLook);
touchButton('btnShoot',()=>{if(!running||paused)return;shoot();mouseDown=true},()=>{mouseDown=false});
touchButton('btnScope',()=>{if(!running||paused)return;if(!guns[weapon].scope){notify('این سلاح اسکوپ ندارد');return}scoped=!scoped;ui.wrap.classList.toggle('scoped',scoped);notify(scoped?'اسکوپ فعال':'اسکوپ غیرفعال')});
touchButton('btnReload',()=>{if(running&&!paused)reload()});
touchButton('btnSmoke',()=>{if(running&&!paused)throwSmoke()});
touchButton('btnSwap',()=>{if(!running||paused)return;const order=['awp','ak','m4','scout','smg','knife'];switchWeapon(order[(order.indexOf(weapon)+1)%order.length])});
touchButton('btnRun',()=>{runTouch=true;keys.ShiftLeft=true},()=>{runTouch=false;keys.ShiftLeft=false});
touchButton('btnPause',()=>{if(running&&!paused){paused=true;ui.pause.classList.remove('hidden')}});
function switchWeapon(k){weapon=k;scoped=false;ui.wrap.classList.remove('scoped');reloading=false;updateHUD();notify(guns[k].name+' آماده است')}
function reload(){const g=guns[weapon];if(g.melee||reloading||ammo[weapon]>=g.mag||reserve[weapon]<=0)return;reloading=true;notify('در حال تعویض خشاب...');setTimeout(()=>{if(!running)return;let n=Math.min(g.mag-ammo[weapon],reserve[weapon]);ammo[weapon]+=n;reserve[weapon]-=n;reloading=false;updateHUD()},g.reload)}
function shoot(){
 if(paused||!running)return;
 const g=guns[weapon],now=performance.now();
 if(now-lastShot<g.delay||reloading)return;
 lastShot=now;
 if(g.melee){let target=null,bd=Infinity;for(const b of bots){if(!b.alive)continue;const d=Math.hypot(b.x-player.x,b.y-player.y),a=angleDiff(Math.atan2(b.y-player.y,b.x-player.x),player.a);if(d<g.range&&Math.abs(a)<.22&&los(player.x,player.y,b.x,b.y)&&d<bd){target=b;bd=d}}if(target)hitBot(target,g.damage);else notify('چاقو فقط از فاصله نزدیک و روبه‌روی دشمن اثر دارد');recoil=.03;return}
 if(ammo[weapon]<=0){notify('خشاب خالی است — R برای تعویض');return}
 ammo[weapon]--;flash=.13;
 // Real ray-style hit test: each shot follows one narrow line from the crosshair.
 // A target is hit only if that line intersects its body and no wall is in front of it.
 const moving=(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD);
 const baseSpread=g.spread+(weapon==='ak'?recoil*.45:weapon==='m4'?recoil*.28:recoil*.08)+(moving?.012:0);
 const shotAngle=player.a+(Math.random()*2-1)*(scoped&&g.scope?Math.min(baseSpread,.0018):baseSpread);
 const wallHit=cast(shotAngle);let best=null,bestAlong=Infinity;
 for(const b of bots){if(!b.alive)continue;
  const vx=b.x-player.x,vy=b.y-player.y,along=vx*Math.cos(shotAngle)+vy*Math.sin(shotAngle);
  if(along<=0||along>g.range||along>wallHit.d+.02)continue;
  const perp=Math.abs(vx*Math.sin(shotAngle)-vy*Math.cos(shotAngle));
  // Approximate human torso width: deliberately narrow, so shots beside a bot miss.
  const bodyRadius=Math.max(.13,Math.min(.23,.19+along*.002));
  if(perp<=bodyRadius&&los(player.x,player.y,b.x,b.y)&&along<bestAlong){best=b;bestAlong=along}
 }
 if(best)hitBot(best,g.damage);else{ui.hit.style.opacity='0';if(weapon==='awp'||weapon==='scout')notify('خطا رفت — دقیقاً روی بدن هدف بگیر')}
 recoil=Math.min(.12,recoil+(weapon==='ak'?.052:weapon==='m4'?.032:.012));updateHUD()
}
function hitBot(b,damage){b.hp-=damage;b.alert=true;b.hit=.16;ui.hit.style.opacity='1';setTimeout(()=>ui.hit.style.opacity='0',120);if(b.hp<=0){b.alive=false;killCount++;const row=document.createElement('div');row.textContent='YOU  ✕  BOT-'+String(killCount).padStart(2,'0');ui.killfeed.prepend(row);while(ui.killfeed.children.length>4)ui.killfeed.lastChild.remove();if(!bots.some(x=>x.alive)){clearTimer=1.65;ui.objective.textContent='منطقه پاکسازی شد · دشمنان جدید در راه‌اند';notify('منطقه پاکسازی شد؛ آماده گروه بعدی باش')} }updateHUD()}
function throwSmoke(){if(smokeCharges<=0){notify('اسموک تمام شده است');return}smokeCharges--;const x=player.x+Math.cos(player.a)*2.3,y=player.y+Math.sin(player.a)*2.3;if(!wall(x,y))smokes.push({x,y,r:0,life:9,max:9});else smokes.push({x:player.x+Math.cos(player.a)*.8,y:player.y+Math.sin(player.a)*.8,r:0,life:9,max:9});updateHUD();notify('اسموک پرتاب شد؛ دید دشمن محدود می‌شود')}
function inSmoke(x,y){return smokes.some(s=>s.life>0&&Math.hypot(s.x-x,s.y-y)<s.r)}
function hurt(d){if(player.armor>0){const block=Math.min(player.armor,d*.55);player.armor-=block;d-=block}player.health-=d;damageFlash=.35;updateHUD();if(player.health<=0){player.health=0;updateHUD();endGame(false)}}
function update(dt){if(clearTimer>0){clearTimer-=dt;if(clearTimer<=0&&running&&!paused){roundCount++;randomSpawns();for(const k of ['awp','ak','m4','scout','smg']){reserve[k]=Math.min(guns[k].reserve,reserve[k]+Math.ceil(guns[k].mag*.5));if(ammo[k]===0)ammo[k]=Math.min(guns[k].mag,5)}smokeCharges=Math.min(3,smokeCharges+1);ui.objective.textContent='پاکسازی بی‌پایان · گروه '+roundCount;notify('گروه جدید وارد منطقه شد');updateHUD()}}recoil=Math.max(0,recoil-dt*.16);moveBob+=dt*((keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD)?10:1.5);let speed=(keys.ShiftLeft||keys.ShiftRight)?3.8:2.65;let dx=0,dy=0;if(keys.KeyW||keys.ArrowUp){dx+=Math.cos(player.a);dy+=Math.sin(player.a)}if(keys.KeyS||keys.ArrowDown){dx-=Math.cos(player.a);dy-=Math.sin(player.a)}if(keys.KeyA){dx+=Math.cos(player.a-Math.PI/2);dy+=Math.sin(player.a-Math.PI/2)}if(keys.KeyD){dx+=Math.cos(player.a+Math.PI/2);dy+=Math.sin(player.a+Math.PI/2)}const len=Math.hypot(dx,dy)||1;dx=dx/len*speed*dt;dy=dy/len*speed*dt;if(!wall(player.x+dx,player.y))player.x+=dx;if(!wall(player.x,player.y+dy))player.y+=dy;
for(const b of bots){if(!b.alive)continue;b.walk+=dt;b.hit=Math.max(0,b.hit-dt);const d=Math.hypot(player.x-b.x,player.y-b.y),visible=los(b.x,b.y,player.x,player.y)&&!inSmoke((b.x+player.x)/2,(b.y+player.y)/2);if(d<10&&visible)b.alert=true;if(b.alert&&d>1.5){let tx=player.x-b.x,ty=player.y-b.y,ln=Math.hypot(tx,ty)||1;const speedBot=(difficulty==='hard'?.9:difficulty==='easy'?.4:.62)*dt;let side=b.strafe*.28;let nx=b.x+tx/ln*speedBot+(-ty/ln)*side*dt,ny=b.y+ty/ln*speedBot+(tx/ln)*side*dt;if(!wall(nx,b.y))b.x=nx;if(!wall(b.x,ny))b.y=ny;if(Math.random()<dt*.35)b.strafe*=-1}
if(b.alert&&visible&&d<13){b.fire-=dt;if(b.fire<=0){b.fire=(difficulty==='hard'?.75:difficulty==='easy'?1.65:1.15)+Math.random()*.65;if(Math.abs(angleDiff(Math.atan2(player.y-b.y,player.x-b.x),b.a))<2.5){b.a=Math.atan2(player.y-b.y,player.x-b.x);const accuracy=difficulty==='hard'?.72:difficulty==='easy'?.27:.48;if(Math.random()<accuracy&&d>1.5)hurt(difficulty==='hard'?12:difficulty==='easy'?5:8)}}}else b.fire=Math.min(b.fire,0.5);b.a+=(angleDiff(Math.atan2(player.y-b.y,player.x-b.x),b.a))*.04;
}for(const s of smokes){s.life-=dt;s.r=Math.min(2.8,s.r+dt*2.2)}smokes=smokes.filter(s=>s.life>0);if(flash>0)flash-=dt;if(damageFlash>0)damageFlash-=dt;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show')}if(mouseDown&&guns[weapon].auto)shoot();updateHUD()}
function cast(angle){let prev=0;for(let d=.02;d<MAX;d+=.035){let x=player.x+Math.cos(angle)*d,y=player.y+Math.sin(angle)*d;if(wall(x,y))return{d,x,y,side:Math.abs((x%1)-.5)>Math.abs((y%1)-.5)?0:1,edge:Math.min(x%1,1-x%1,y%1,1-y%1)}}return{d:MAX,x:0,y:0,side:0,edge:0}}
function shadeColor(hex,f){const n=parseInt(hex.slice(1),16),r=Math.min(255,Math.max(0,Math.floor((n>>16)*f))),g=Math.min(255,Math.max(0,Math.floor(((n>>8)&255)*f))),b=Math.min(255,Math.max(0,Math.floor((n&255)*f)));return`rgb(${r},${g},${b})`}
function render(){const w=canvas.width,h=canvas.height,half=h/2,fov=scoped&&guns[weapon].scope?FOV*.19:FOV;let sky=ctx.createLinearGradient(0,0,0,half);sky.addColorStop(0,'#607989');sky.addColorStop(.58,'#a8b6b6');sky.addColorStop(1,'#dfcaa3');ctx.fillStyle=sky;ctx.fillRect(0,0,w,half);let floor=ctx.createLinearGradient(0,half,0,h);floor.addColorStop(0,'#b69a70');floor.addColorStop(.45,'#756044');floor.addColorStop(1,'#29251d');ctx.fillStyle=floor;ctx.fillRect(0,half,w,half);
// Perspective ground grid and concrete markings
ctx.strokeStyle='#f0d6a01a';ctx.lineWidth=1;for(let i=1;i<16;i++){let y=half+Math.pow(i/16,2)*half;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}for(let i=-10;i<=10;i++){ctx.beginPath();ctx.moveTo(w/2,half);ctx.lineTo(w/2+i*w*.13,h);ctx.stroke()}
const rays=Math.floor(w/2);depthBuffer=new Array(rays);for(let i=0;i<rays;i++){const cam=(i/rays-.5)*fov,hit=cast(player.a+cam),dist=Math.max(.01,hit.d*Math.cos(cam));depthBuffer[i]=dist;const wh=Math.min(h*1.8,h/dist*.88),y=half-wh/2;let shade=Math.max(.17,1-dist/19);if(hit.side)shade*=.76;const tile=(Math.floor(hit.x*3)+Math.floor(hit.y*3))%2;ctx.fillStyle=shadeColor(tile?palette.wall:palette.wall2,shade*(hit.edge<.035?.72:1));ctx.fillRect(i*2,y,2,wh);if(hit.edge<.035){ctx.fillStyle='#51432f';ctx.fillRect(i*2,y,2,wh)}if(wh>42){const seed=Math.abs(Math.floor(hit.x*13+hit.y*19));ctx.fillStyle=shadeColor(seed%3===0?'#d5bd91':'#786044',shade*.55);for(let br=0;br<Math.min(8,Math.floor(wh/32));br++){const yy=y+br*32+(seed%11);if(yy<y+wh)ctx.fillRect(i*2,yy,2,1.4)}if((i+seed)%17===0){ctx.fillStyle='#e0cba4';ctx.fillRect(i*2,y+wh*.22,2,Math.max(2,wh*.015))}}}
// Project all bots into the same camera frustum, including magnified scope view
const sprites=bots.filter(b=>b.alive).map(b=>{const dx=b.x-player.x,dy=b.y-player.y;return{b,d:Math.hypot(dx,dy),a:angleDiff(Math.atan2(dy,dx),player.a)}}).filter(s=>Math.abs(s.a)<fov*.72&&s.d<MAX).sort((a,b)=>b.d-a.d);for(const s of sprites)drawBot(s,w,h,fov);
for(const s of smokes){if(s.life<=0)continue;const d=Math.hypot(s.x-player.x,s.y-player.y),a=angleDiff(Math.atan2(s.y-player.y,s.x-player.x),player.a);if(Math.abs(a)<fov*.7&&d<MAX){const sx=(.5+a/fov)*w,sy=half+Math.max(-h*.1,Math.min(h*.18,(d-2)*h*.025)),r=Math.min(h*.48,h/(d+.25)*s.r*.75);const grad=ctx.createRadialGradient(sx,sy,r*.08,sx,sy,r);grad.addColorStop(0,'rgba(190,198,191,.82)');grad.addColorStop(.7,'rgba(160,170,164,.55)');grad.addColorStop(1,'rgba(140,150,145,0)');ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(sx,sy,r,r*.82,0,0,Math.PI*2);ctx.fill()}}
if(scoped&&guns[weapon].scope)drawScope(w,h);else drawWeapon(w,h);if(flash>0){ctx.fillStyle=`rgba(255,220,130,${Math.min(.65,flash*5)})`;ctx.beginPath();ctx.moveTo(w*.57,h*.77);ctx.lineTo(w*.61,h*.68);ctx.lineTo(w*.66,h*.77);ctx.fill()}if(damageFlash>0){ctx.fillStyle=`rgba(190,0,0,${damageFlash*.25})`;ctx.fillRect(0,0,w,h)}if(player.health<35){ctx.strokeStyle=`rgba(180,0,0,${.2+Math.sin(performance.now()/120)*.15})`;ctx.lineWidth=18;ctx.strokeRect(0,0,w,h)}}
function drawBot(s,w,h,fov){
 const b=s.b,d=Math.max(.25,s.d),sx=(.5+s.a/fov)*w;
 const unit=Math.min(h*.82,h/d*.72),top=h/2-unit*.49;
 const ix=Math.max(0,Math.min(depthBuffer.length-1,Math.floor(sx/2)));
 if(depthBuffer[ix]<d-.22)return;
 const k=unit/190, bob=Math.sin(b.walk*7)*2*k, lean=Math.sin(b.walk*3)*2*k;
 ctx.save();ctx.translate(sx,top);ctx.globalAlpha=Math.min(1,.25+1/(d*.035));
 // Ground shadow anchors the character to the map.
 ctx.globalAlpha*=.5;ctx.fillStyle='#070907';ctx.beginPath();ctx.ellipse(0,unit*.96,31*k,7*k,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=Math.min(1,.25+1/(d*.035));
 const poly=(pts,fill,stroke)=>{ctx.beginPath();ctx.moveTo(pts[0][0]*k,pts[0][1]*k);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0]*k,pts[i][1]*k);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.2*k;ctx.stroke()}};
 const ellipse=(x,y,rx,ry,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x*k,y*k,rx*k,ry*k,0,0,Math.PI*2);ctx.fill()};
 const torso=b.hit>0?'#b7c8b0':(Math.floor(b.x*3+b.y*4)%2?'#5b6b58':'#71654d');
 // Boots and articulated legs, angled slightly to suggest a walking animation.
 ctx.save();ctx.translate(-11*k,0);ctx.rotate(-.08+Math.sin(b.walk*6)*.12);poly([[-9,105],[-6,65],[2,55],[10,64],[12,104],[17,119],[-4,122]],'#252923','#121612');poly([[-5,117],[17,116],[23,124],[20,130],[-7,129]],'#111511');ctx.restore();
 ctx.save();ctx.translate(12*k,0);ctx.rotate(.08-Math.sin(b.walk*6)*.12);poly([[-9,65],[2,60],[10,69],[9,105],[17,119],[-4,122],[-10,103]],'#343a31','#171c17');poly([[-4,117],[17,116],[23,124],[20,130],[-7,129]],'#111511');ctx.restore();
 // Pants seams and knee pads.
 poly([[-19,58],[-3,60],[-5,86],[-13,99],[-22,94]],'#454b3e');poly([[3,60],[20,58],[22,93],[11,99],[5,84]],'#41483c');ellipse(-14,87,7,6,'#252b24');ellipse(14,87,7,6,'#252b24');
 // Torso, shoulder pads, tactical vest and pouch geometry.
 poly([[-25,13],[-17,4],[15,4],[26,15],[22,56],[13,66],[-15,66],[-24,54]],torso,'#242a23');
 poly([[-18,14],[-11,9],[11,9],[18,17],[16,53],[-15,53]],'#30372e','#171c17');
 poly([[-23,16],[-16,12],[-12,25],[-17,38],[-25,35]],'#424a3c');poly([[16,12],[23,16],[26,35],[17,39],[12,25]],'#424a3c');
 for(let i=0;i<3;i++){poly([[-12+i*9,20],[-6+i*9,20],[-6+i*9,32],[-12+i*9,32]],i===1?'#555d4c':'#454d40','#20261f')}
 poly([[-13,39],[-5,38],[-5,48],[-13,48]],'#202720');poly([[3,39],[12,38],[12,48],[3,48]],'#202720');
 // Arms reach forward toward the rifle; elbows and gloves are separate shapes.
 poly([[-23,17],[-31,21],[-37,43],[-30,50],[-21,33]],torso,'#252b24');ellipse(-32,44,6,7,'#3b4438');poly([[-33,46],[-26,45],[-18,54],[-22,61],[-31,57]],'#343d32');
 poly([[23,17],[31,20],[35,39],[29,46],[21,32]],torso,'#252b24');ellipse(31,40,6,7,'#3b4438');poly([[30,42],[24,43],[17,51],[21,59],[30,54]],'#343d32');
 // Neck, face, helmet, eye shadow and a simple fabric face covering.
 poly([[-7,1],[-6,-7],[7,-7],[8,2]],'#8b775e');ellipse(0,-19,13,15,b.hit>0?'#d0b79a':'#b99b7a');
 ellipse(0,-27,15,9,'#353d32');poly([[-16,-24],[-13,-33],[-5,-37],[7,-36],[14,-30],[15,-23],[8,-25],[-7,-25]],'#454d3f');
 poly([[-11,-18],[11,-18],[9,-7],[-8,-7]],'#4a5144');ctx.fillStyle='#242a24';ctx.fillRect(-10*k,-22*k,20*k,3*k);ctx.fillStyle='#c9d5bf';ctx.fillRect(-7*k,-22*k,4*k,1.5*k);ctx.fillRect(3*k,-22*k,4*k,1.5*k);
 // A compact dark weapon silhouette held across the chest, aligned with the arms.
 poly([[15,47],[28,42],[47,43],[55,46],[55,50],[34,51],[28,56],[22,55]],'#151a16','#080b09');poly([[31,45],[43,45],[43,48],[31,48]],'#535a4d');poly([[25,49],[31,50],[29,60],[25,60]],'#242a23');poly([[48,44],[58,44],[58,47],[48,47]],'#090d0a');
 // Small shoulder strap and radio pouch give the silhouette more human detail.
 ctx.strokeStyle='#171d17';ctx.lineWidth=3*k;ctx.beginPath();ctx.moveTo(-15*k,12*k);ctx.lineTo(12*k,49*k);ctx.stroke();poly([[-19,43],[-10,42],[-8,54],[-18,56]],'#252c24');
 // Health bar is deliberately subtle so it does not dominate the character.
 ctx.globalAlpha=.88;ctx.fillStyle='#111611';ctx.fillRect(-23*k,-48*k,46*k,3*k);ctx.fillStyle='#e15b4d';ctx.fillRect(-23*k,-48*k,46*k*Math.max(0,b.hp/100),3*k);ctx.restore();
}
function drawScope(w,h){ctx.save();const r=Math.min(w,h)*.46;ctx.beginPath();ctx.rect(0,0,w,h);ctx.arc(w/2,h/2,r,0,Math.PI*2,true);ctx.fillStyle='#030505';ctx.fill('evenodd');ctx.beginPath();ctx.arc(w/2,h/2,r,0,Math.PI*2);ctx.clip();ctx.fillStyle='rgba(35,48,39,.13)';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#202721';ctx.lineWidth=1;for(let i=0;i<22;i++){let y=h/2+(i-11)*Math.max(10,h*.035);ctx.beginPath();ctx.moveTo(w*.05,y);ctx.lineTo(w*.95,y);ctx.stroke()}ctx.strokeStyle='#101511';ctx.lineWidth=Math.max(5,Math.min(w,h)*.018);ctx.beginPath();ctx.arc(w/2,h/2,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#dbe3d5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w/2,h*.09);ctx.lineTo(w/2,h*.91);ctx.moveTo(w*.08,h/2);ctx.lineTo(w*.92,h/2);ctx.stroke();ctx.fillStyle='#e4eee0';ctx.beginPath();ctx.arc(w/2,h/2,2.5,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawWeapon(w,h){
 // Stylized fictional first-person energy device: centered toward the reticle,
 // rather than a flat side-on sprite. It intentionally avoids real-world weapon detail.
 ctx.save();const k=Math.min(w/1280,h/720),bob=Math.sin(moveBob)*2.2;
 ctx.translate(w*.58,h*.80+bob);ctx.scale(k,k);ctx.rotate(-recoil*.65);
 const poly=(pts,fill,stroke='#0a0d0a',lw=2)=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}};
 const metal=(x,y,ww,hh,c='#303830')=>{const g=ctx.createLinearGradient(x,y,x+ww,y+hh);g.addColorStop(0,'#778176');g.addColorStop(.2,c);g.addColorStop(.55,'#151b16');g.addColorStop(.82,'#424a40');g.addColorStop(1,'#111510');ctx.fillStyle=g;ctx.fillRect(x,y,ww,hh);ctx.strokeStyle='#b5c0ad35';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,ww-1,hh-1)};
 // Sleeves and gloves frame the device from the bottom corners.
 poly([[-155,185],[-144,125],[-98,86],[-62,103],[-40,160],[-57,205]],'#263027');poly([[-136,155],[-115,111],[-87,102],[-64,125],[-74,166],[-105,181]],'#3c493a');
 poly([[54,160],[76,112],[120,99],[158,131],[171,197],[118,218],[69,195]],'#252d25');poly([[76,155],[91,122],[119,117],[143,143],[148,177],[112,192],[84,181]],'#3d493a');
 // Front emitter converges toward the center of the screen.
 poly([[-10,42],[12,42],[30,-94],[20,-108],[7,-104]],'#171d18');poly([[12,42],[28,42],[38,-96],[27,-106]],'#4b5549');
 metal(8,-93,25,17,'#222a22');metal(11,-111,20,17,'#111712');
 // Geometric housing, luminous status strip, and energy-cell module.
 poly([[-21,29],[27,22],[54,54],[69,126],[45,157],[0,145],[-22,77]],'#202720');poly([[-12,37],[20,32],[40,58],[53,115],[36,139],[8,130],[-9,76]],'#424b3e');
 poly([[-4,5],[17,-3],[31,13],[26,35],[5,40],[-7,23]],'#111712');poly([[0,9],[16,3],[24,14],[20,28],[5,31],[-1,21]],'#4e6a58');
 ctx.save();ctx.globalAlpha=.85;ctx.shadowColor='#6cffc1';ctx.shadowBlur=12;ctx.fillStyle='#7dffbf';ctx.fillRect(7,13,10,3);ctx.restore();
 poly([[-12,94],[13,88],[25,112],[18,154],[3,172],[-12,159],[-19,124]],'#111611');poly([[-7,102],[9,99],[17,121],[12,149],[4,160],[-6,151],[-12,123]],'#30382f');
 poly([[20,91],[36,88],[42,108],[31,122],[17,116]],'#151a15');poly([[25,99],[32,98],[33,111],[26,112]],'#596253');
 poly([[36,125],[72,127],[101,158],[105,199],[77,218],[46,197],[35,162]],'#202820');poly([[54,145],[78,148],[90,172],[87,198],[69,204],[54,185]],'#3c4639');
 // Hands hold the device; small panels are fictional visual accents.
 ctx.fillStyle='#3d493a';ctx.beginPath();ctx.roundRect(-5,111,49,43,10);ctx.fill();ctx.strokeStyle='#101510';ctx.stroke();ctx.fillStyle='#a2b49a55';ctx.fillRect(5,120,27,3);
 ctx.fillStyle='#3d493a';ctx.beginPath();ctx.roundRect(51,165,64,46,12);ctx.fill();ctx.strokeStyle='#101510';ctx.stroke();ctx.fillStyle='#a2b49a55';ctx.fillRect(64,176,31,3);
 if(flash>0){ctx.save();ctx.globalAlpha=Math.min(.9,flash*5);ctx.shadowColor='#8affd2';ctx.shadowBlur=25;poly([[9,-107],[22,-137],[35,-108],[25,-94]],'#a6ffdc',null);ctx.restore()}
 ctx.restore();
}
function loop(now){if(!running||paused)return;const dt=Math.min(.04,(now-last)/1000||0);last=now;update(dt);render();requestAnimationFrame(loop)}
})();

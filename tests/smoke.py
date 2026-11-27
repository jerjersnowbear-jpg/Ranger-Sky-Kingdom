"""Browser smoke test for RANGER: The Lost Sky Kingdom.

Serves the game over local HTTP and runs it in headless Chromium twice:
  1. with WebGL 2 (SwiftShader software GPU), checking the Three.js renderer, every mission, the gameplay logic
     and normal movement, and saving tests/menu-preview.png and tests/gameplay-preview.png;
  2. with WebGL switched off, checking that the compatibility view still starts and plays.
Usage: pip install playwright && python -m playwright install chromium && python tests/smoke.py
"""
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}/index.html?test'
GPU = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
NO_GPU = ['--no-sandbox', '--disable-webgl', '--disable-3d-apis']

LOGIC = '''()=>{let v=__ranger;let tests=[];let check=(x,m)=>{if(!x)throw Error(m);tests.push(m)};
for(let i=0;i<6;i++){v.init(i);v.render();check(v.state.frame>0,'render mission '+(i+1))}
v.init(1);v.action('scent');check(v.state.hidden&&!!v.floorAt(0,-10),'hidden bridge');
v.init(2);v.move(0,0,-6);v.action('grapple');check(!!v.state.grapple,'grapple engaged');v.step(.025,50);check(v.state.player.p[2]<-15,'grapple landed');
v.init(3);v.move(-4,.4,-17);v.action('bark');check(v.state.sequence===0,'wrong order resets');v.step(.05,14);for(let n of v.state.nodes){v.move(...n.p);v.action('bark');v.step(.05,14)}check(v.state.nodes.every(n=>n.on),'ordered nodes');
v.init(4);v.move(-5,.5,-15);v.action('bark');check(v.state.rescue[0].done,'rescue');v.action('pulse');check(v.state.enemies.some(e=>e.stun>0),'scout stunned');
v.init(5);for(let n of v.state.nodes){v.move(...n.p);v.action('bark');v.action('pulse');v.step(.05,14)}check(v.state.boss.hp===0,'boss three phases');
v.init(0);for(let r of v.state.relics){v.move(r.p[0],r.p[1]-.8,r.p[2]);v.step(.02)}v.move(0,.8,-27);v.action('bark');check(v.ready(),'mission ready');v.move(0,.8,-29);v.step(.02);check(v.state.save.unlocked>=1,'mission complete and save');return tests}'''

MOVEMENT = '''()=>{let v=__ranger;v.init(0);let checks=[];let check=(x,m)=>{if(!x)throw Error(m+' '+JSON.stringify(v.state.player));checks.push(m)};
function walk(x,z){let p=v.state.player.p,d=Math.hypot(x-p[0],z-p[2]),dx=(x-p[0])/d,dz=(z-p[2])/d;v.motion(dx,dz);v.step(.01,Math.round(d/6.3/.01));v.motion(0,0)}
walk(2,-3);check(v.state.relics[0].got,'normal movement collects relic');walk(0,-6);v.motion(0,-1);v.hold('jump',true);v.step(.01,90);v.hold('jump',false);v.motion(0,0);v.step(.01,50);check(v.state.player.grounded&&v.state.player.p[2]<-9,'first gap crossed by jumping');
walk(-2,-12);check(v.state.relics[1].got,'second relic');walk(0,-16);v.motion(0,-1);v.hold('jump',true);v.step(.01,115);v.hold('jump',false);v.motion(0,0);v.step(.01,50);check(v.state.player.grounded&&v.state.player.p[2]<-20,'second gap crossed by jumping');
walk(2,-25);check(v.state.relics[2].got,'third relic');walk(0,-27);v.action('bark');check(v.ready(),'beacon activated');walk(0,-29);check(!v.state.playing&&v.state.save.unlocked>=1,'first mission completed without teleport');return checks}'''


def launch(p, args):
    opts = {'headless': True, 'args': args}
    if os.environ.get('CHROMIUM_BIN'):
        opts['executable_path'] = os.environ['CHROMIUM_BIN']
    return p.chromium.launch(**opts)


def open_page(browser):
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    page.goto(URL)
    page.wait_for_function('!!window.__ranger')
    return page, errors


with sync_playwright() as p:
    # 1. Full 3D renderer
    b = launch(p, GPU)
    page, errors = open_page(b)
    info = page.evaluate('({webgl:G.ok&&!software,renderer:G.ok?G.renderer.getContext().getParameter(G.renderer.getContext().VERSION):null})')
    print('graphics', info, errors)
    assert info['webgl'], '3D renderer did not start'
    page.wait_for_timeout(1500)
    page.screenshot(path=str(ROOT / 'tests/menu-preview.png'))
    page.locator('#continue').click()
    page.evaluate('__ranger.freeze(true)')
    page.evaluate('()=>{let v=__ranger;for(let i=0;i<150;i++)v.update(1/30);for(let i=0;i<6;i++)v.render(1/30)}')
    page.screenshot(path=str(ROOT / 'tests/gameplay-preview.png'))
    print('state', page.evaluate('({frame:__ranger.state.frame,playing:__ranger.state.playing,calls:G.renderer.info.render.calls})'), errors)
    print(page.evaluate(LOGIC))
    print(page.evaluate(MOVEMENT))
    print('errors (3D)', errors)
    assert not errors, errors
    b.close()

    # 2. Compatibility view without WebGL
    b = launch(p, NO_GPU)
    page, errors = open_page(b)
    errors[:] = [e for e in errors if 'WebGL' not in e]  # the expected "no WebGL" report from Three.js
    assert page.evaluate('software'), 'compatibility mode expected without WebGL'
    page.evaluate('__ranger.freeze(true)')
    print(page.evaluate('''()=>{let v=__ranger;let out=[];for(let i=0;i<6;i++){v.init(i);v.render(1/30);if(!(v.state.frame>0))throw Error('compat render '+(i+1));out.push('compat render mission '+(i+1))}return out}'''))
    print(page.evaluate(MOVEMENT))
    print('errors (compatibility)', errors)
    assert not errors, errors
    b.close()
server.shutdown()
print('ALL PASS')

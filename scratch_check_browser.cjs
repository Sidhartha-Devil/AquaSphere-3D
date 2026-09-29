// scratch_check_browser.cjs
const { spawn } = require('child_process');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Users\\sidha\\AppData\\Local\\Temp\\chrome-debug-profile',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const newTabRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:5174/', { method: 'PUT' });
    const tab = await newTabRes.json();

    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('[CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
      }
    };

    await new Promise(r => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
        r();
      };
    });

    // Wait 2 seconds for initial render
    await new Promise(r => setTimeout(r, 2000));

    // Click the 3D Globe button in sidebar
    console.log('--- Clicking 3D Globe button in navigation ---');
    ws.send(JSON.stringify({
      id: 20,
      method: 'Runtime.evaluate',
      params: { expression: `
        const btns = Array.from(document.querySelectorAll('.nav-item'));
        const globeBtn = btns.find(b => b.textContent.includes('3D Globe'));
        if (globeBtn) { globeBtn.click(); 'Clicked 3D Globe'; } else { 'Globe button not found'; }
      ` }
    }));

    // Wait 4 seconds for GlobeView to mount and compile shaders
    await new Promise(r => setTimeout(r, 4000));

    // Check what is currently on the screen
    ws.send(JSON.stringify({
      id: 30,
      method: 'Runtime.evaluate',
      params: { expression: `
        JSON.stringify({
          hasCanvas: !!document.querySelector('canvas'),
          canvasCount: document.querySelectorAll('canvas').length,
          globeShell: !!document.querySelector('.globe-view-shell'),
          hudTopBar: !!document.querySelector('.globe-hud-topbar'),
          topRightMenu: !!document.querySelector('.top-right-menu'),
          bottomDock: !!document.querySelector('.globe-hud-bottom-dock'),
          canvasStyle: document.querySelector('canvas')?.getAttribute('style'),
          bodyHTML: document.querySelector('.app-content')?.innerHTML?.slice(0, 300)
        })
      ` }
    }));

    const result = await new Promise((resolve) => {
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === 30) {
          ws.removeEventListener('message', handler);
          resolve(msg.result?.result?.value);
        }
      };
      ws.addEventListener('message', handler);
    });

    console.log('GLOBE VIEW STATE:', result);

    ws.close();
  } catch (err) {
    console.error('CDP Error:', err);
  } finally {
    chromeProc.kill();
  }
}

main();

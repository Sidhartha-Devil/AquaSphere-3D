const fs = require('fs');

function applyBlackYellowTheme(css) {
  // ── Background colors → pure black ──
  css = css.replace(/background:\s*#[0-9a-fA-F]{3,8}(?!\w)/g, (m) => {
    // keep gradients and non-bg colors; only replace solid bg hex
    return m;
  });

  // Replace all dark background hex colors → #000000 or very dark
  const bgHexMap = [
    [/#090204/gi, '#000000'],
    [/#080102/gi, '#000000'],
    [/#0a0202/gi, '#000000'],
    [/#0a0510/gi, '#000000'],
    [/#05020a/gi, '#000000'],
    [/#0d0614/gi, '#000000'],
    [/#120819/gi, '#000000'],
    [/#020914/gi, '#000000'],
    [/#010810/gi, '#000000'],
    [/#010914/gi, '#000000'],
    [/#031c3b/gi, '#0a0000'],
    [/#010c1c/gi, '#000000'],
    [/#00060f/gi, '#000000'],
    [/#04142a/gi, '#050000'],
    [/#280408/gi, '#000000'],
    [/#200408/gi, '#000000'],
    [/#0a0202/gi, '#000000'],
    [/#140102/gi, '#000000'],
    [/#080102/gi, '#000000'],
    // GlobeView specific
    [/#010810/gi, '#000000'],
  ];
  for (const [f, t] of bgHexMap) css = css.replace(f, t);

  // ── All rgba backgrounds → near-black ──
  // Panel backgrounds
  css = css.replace(/rgba\(\s*[\d]+,\s*[\d]+,\s*[\d]+,\s*(0\.[0-9]+)\s*\)/g, (match, alpha) => {
    // Only darken rgba that appear to be background/container colors (high alpha or already dark)
    return match; // We'll handle these with targeted replacements below
  });

  // Targeted background rgba → black with same alpha
  const rgbaMap = [
    [/rgba\(40,\s*4,\s*8/g, 'rgba(0, 0, 0'],
    [/rgba\(38,\s*4,\s*8/g, 'rgba(0, 0, 0'],
    [/rgba\(50,\s*6,\s*10/g, 'rgba(0, 0, 0'],
    [/rgba\(35,\s*4,\s*8/g, 'rgba(0, 0, 0'],
    [/rgba\(30,\s*3,\s*6/g, 'rgba(0, 0, 0'],
    [/rgba\(28,\s*2,\s*5/g, 'rgba(0, 0, 0'],
    [/rgba\(25,\s*2,\s*5/g, 'rgba(0, 0, 0'],
    [/rgba\(20,\s*2,\s*4/g, 'rgba(0, 0, 0'],
    [/rgba\(28,\s*3,\s*6/g, 'rgba(0, 0, 0'],
    [/rgba\(25,\s*3,\s*6/g, 'rgba(0, 0, 0'],
    [/rgba\(45,\s*4,\s*8/g, 'rgba(0, 0, 0'],
    [/rgba\(20,\s*1,\s*3/g, 'rgba(0, 0, 0'],
    [/rgba\(18,\s*1,\s*3/g, 'rgba(0, 0, 0'],
    [/rgba\(100,\s*10,\s*10/g, 'rgba(0, 0, 0'],
    [/rgba\(200,\s*20,\s*20/g, 'rgba(5, 0, 0'],
    [/rgba\(30,\s*5,\s*8/g, 'rgba(0, 0, 0'],
    [/rgba\(22,\s*2,\s*4/g, 'rgba(0, 0, 0'],
    [/rgba\(10,\s*2,\s*5/g, 'rgba(0, 0, 0'],
    [/rgba\(15,\s*5,\s*20/g, 'rgba(0, 0, 0'],
    [/rgba\(25,\s*8,\s*30/g, 'rgba(0, 0, 0'],
    // Generic remaining dark blues/reds
    [/rgba\(2,\s*10,\s*22/g, 'rgba(0, 0, 0'],
    [/rgba\(4,\s*14,\s*28/g, 'rgba(0, 0, 0'],
    [/rgba\(4,\s*16,\s*34/g, 'rgba(0, 0, 0'],
    [/rgba\(10,\s*15,\s*30/g, 'rgba(0, 0, 0'],
    [/rgba\(10,\s*24,\s*48/g, 'rgba(0, 0, 0'],
    [/rgba\(3,\s*16,\s*36/g, 'rgba(0, 0, 0'],
  ];
  for (const [f, t] of rgbaMap) css = css.replace(f, t);

  // ── Red/orange accents → yellow ──
  const accentHexMap = [
    [/#ff4444/gi, '#ffd700'],
    [/#ff6666/gi, '#ffdd44'],
    [/#ff7777/gi, '#ffe033'],
    [/#ff9999/gi, '#ffe680'],
    [/#ffaaaa/gi, '#fff0aa'],
    [/#ffcccc/gi, '#fff5cc'],
    [/#ffeeee/gi, '#fffaee'],
    [/#cc2222/gi, '#ccaa00'],
    [/#aa1111/gi, '#aa8800'],
    [/#ff8800/gi, '#ffcc00'],
    [/#ffcc00/gi, '#ffd700'],
    [/#ffaa00/gi, '#ffc400'],
    [/#ffb84d/gi, '#ffd966'],
    [/#ff6b35/gi, '#ffc107'],
    [/#ff6b6b/gi, '#ffd700'],
    [/#ff6600/gi, '#ffc000'],
    [/#ff8888/gi, '#ffe033'],
    [/#ff9900/gi, '#ffcc00'],
    [/#ffd700/gi, '#ffd700'], // keep gold as-is
    [/#ffc000/gi, '#ffc000'],
    [/#ffc107/gi, '#ffc107'],
  ];
  for (const [f, t] of accentHexMap) css = css.replace(f, t);

  // Red rgba → yellow rgba
  const accentRgbaMap = [
    [/rgba\(\s*255,\s*68,\s*68/g, 'rgba(255, 215, 0'],
    [/rgba\(\s*255,\s*60,\s*60/g, 'rgba(255, 215, 0'],
    [/rgba\(\s*255,\s*80,\s*80/g, 'rgba(255, 215, 0'],
    [/rgba\(\s*255,\s*102,\s*102/g, 'rgba(255, 215, 0'],
    [/rgba\(\s*255,\s*119,\s*119/g, 'rgba(255, 215, 0'],
    [/rgba\(\s*255,\s*170,\s*0/g, 'rgba(255, 200, 0'],
    [/rgba\(\s*255,\s*200,\s*0/g, 'rgba(255, 200, 0'],
    [/rgba\(\s*220,\s*40,\s*40/g, 'rgba(200, 160, 0'],
    [/rgba\(\s*170,\s*20,\s*20/g, 'rgba(180, 140, 0'],
    [/rgba\(\s*150,\s*15,\s*15/g, 'rgba(160, 120, 0'],
    [/rgba\(\s*180,\s*20,\s*20/g, 'rgba(180, 140, 0'],
    [/rgba\(\s*120,\s*10,\s*10/g, 'rgba(120, 95, 0'],
    [/rgba\(\s*255,\s*153,\s*0/g, 'rgba(255, 200, 0'],
    [/rgba\(\s*255,\s*102,\s*0/g, 'rgba(255, 190, 0'],
    [/rgba\(\s*255,\s*107,\s*53/g, 'rgba(255, 193, 7'],
    [/rgba\(\s*140,\s*10,\s*10/g, 'rgba(140, 110, 0'],
    [/rgba\(\s*200,\s*160,\s*0/g, 'rgba(200, 160, 0'],
  ];
  for (const [f, t] of accentRgbaMap) css = css.replace(f, t);

  // ── Gradients: replace ocean/red gradients with black+yellow ──
  // Sidebar gradient
  css = css.replace(/linear-gradient\(180deg,\s*rgba\(200,\s*20,\s*20[^)]+\)[^,]+,\s*rgba\(100,\s*10,\s*10[^)]+\)[^)]+\)/g,
    'linear-gradient(180deg, rgba(10, 10, 10, 0.98) 0%, rgba(0, 0, 0, 1) 100%)');
  css = css.replace(/linear-gradient\(160deg,[^;!]+rgba\(60,\s*5,\s*8[^)]*\)[^;!]+!important;/g,
    'linear-gradient(160deg, rgba(10, 10, 10, 0.98) 0%, rgba(0, 0, 0, 1) 100%) !important;');
  // Nav active gradient
  css = css.replace(/linear-gradient\(135deg,\s*rgba\([0-9,\s\.]+\),\s*rgba\([0-9,\s\.]+\)\)/g,
    'linear-gradient(135deg, rgba(255, 215, 0, 0.18), rgba(200, 160, 0, 0.10))');
  // Brand title gradient
  css = css.replace(/linear-gradient\(90deg,\s*#ffffff,\s*#ffaaaa\)/g,
    'linear-gradient(90deg, #ffffff, #ffd700)');
  css = css.replace(/linear-gradient\(90deg,\s*#ffffff,\s*#ffcc00,\s*#ff4444\)/g,
    'linear-gradient(90deg, #ffffff, #ffd700, #ffaa00)');
  css = css.replace(/linear-gradient\(90deg,\s*#ffcc00,\s*#ff4444\)/g,
    'linear-gradient(90deg, #ffd700, #ffaa00)');

  // Replace globe/dashboard topbar linear-gradient backgrounds
  css = css.replace(/linear-gradient\(\s*180deg,\s*rgba\(18,\s*1,\s*3/g,
    'linear-gradient(180deg, rgba(0, 0, 0');
  css = css.replace(/linear-gradient\(\s*0deg,\s*rgba\(18,\s*1,\s*3/g,
    'linear-gradient(0deg, rgba(0, 0, 0');
  css = css.replace(/rgba\(22,\s*2,\s*4,\s*0\.90\)/g, 'rgba(0, 0, 0, 0.90)');
  css = css.replace(/rgba\(22,\s*2,\s*4,\s*0\.92\)/g, 'rgba(0, 0, 0, 0.92)');
  css = css.replace(/rgba\(22,\s*2,\s*4,\s*0\.00\)/g, 'rgba(0, 0, 0, 0.00)');

  // ── Text color: light cyan/blue references → white or light yellow ──
  css = css.replace(/#e2f1ff/gi, '#ffffff');
  css = css.replace(/#ffe0e0/gi, '#ffffff');
  css = css.replace(/#94a3b8/gi, '#aaaaaa');
  css = css.replace(/#64748b/gi, '#888888');
  css = css.replace(/#cbd5e1/gi, '#dddddd');
  css = css.replace(/#e2e8f0/gi, '#eeeeee');
  css = css.replace(/#f1f5f9/gi, '#ffffff');
  css = css.replace(/#cffafe/gi, '#fffde7');
  css = css.replace(/#7dd3fc/gi, '#fff176');
  css = css.replace(/#38bdf8/gi, '#ffd700');
  css = css.replace(/#a5f3fc/gi, '#fff9c4');

  // ── Border and box-shadow glow: red → yellow ──
  // Already handled by rgba replacements above

  return css;
}

const files = [
  'src/index.css',
  'src/components/NavigationSidebar.css',
  'src/components/GlobeView.css',
  'src/components/DashboardView.css',
  'src/components/AnalyticsView.css',
  'src/components/ControlPanel.css',
  'src/components/TopRightMenu.css',
  'src/components/DataPanel.css',
  'src/components/DataUploader.css',
  'src/components/OceanTimeline.css',
  'src/components/ViewToggle.css',
  'src/components/DepthProbe.css',
  'src/components/GeoLabelsOverlay.css',
  'src/components/Legend.css',
  'src/components/Header.css',
  'src/components/AlertsView.css',
];

for (const file of files) {
  try {
    const original = fs.readFileSync(file, 'utf8');
    const themed = applyBlackYellowTheme(original);
    fs.writeFileSync(file, themed);
    console.log(`✅ ${file}`);
  } catch (e) {
    console.error(`❌ ${file}: ${e.message}`);
  }
}

// Also patch the DashboardView root background explicitly
let dashCss = fs.readFileSync('src/components/DashboardView.css', 'utf8');
// ensure root bg is pure black
dashCss = dashCss.replace(/\.dash-ocean-command-deck \{[\s\S]*?background:[^;]+;/,
  (m) => m.replace(/background:[^;]+;/, 'background: #000000;'));
fs.writeFileSync('src/components/DashboardView.css', dashCss);

// Patch GlobeView shell
let globeCss = fs.readFileSync('src/components/GlobeView.css', 'utf8');
globeCss = globeCss.replace(/\.globe-view-shell \{[\s\S]*?background:[^;]+;/,
  (m) => m.replace(/background:[^;]+;/, 'background: #000000;'));
fs.writeFileSync('src/components/GlobeView.css', globeCss);

// Patch NavigationSidebar to be pure black
let navCss = fs.readFileSync('src/components/NavigationSidebar.css', 'utf8');
navCss = navCss.replace(/\.navigation-sidebar \{[\s\S]*?background:[^;]+;/,
  (m) => m.replace(/background:[^;]+;/, 'background: linear-gradient(180deg, #111111 0%, #000000 100%);'));
// Override the !important block too
navCss = navCss.replace(
  /background: linear-gradient\(160deg,[^!]+!important;/,
  'background: linear-gradient(180deg, #111111 0%, #000000 100%) !important;'
);
fs.writeFileSync('src/components/NavigationSidebar.css', navCss);

// Patch index.css root vars
let indexCss = fs.readFileSync('src/index.css', 'utf8');
indexCss = indexCss.replace(/--col-void:\s*[^;]+;/, '--col-void: #000000;');
indexCss = indexCss.replace(/--col-deep:\s*[^;]+;/, '--col-deep: #050505;');
indexCss = indexCss.replace(/--col-abyss:\s*[^;]+;/, '--col-abyss: #080808;');
indexCss = indexCss.replace(/--col-surface:\s*[^;]+;/, '--col-surface: #0f0f0f;');
indexCss = indexCss.replace(/--col-panel:\s*[^;]+;/, '--col-panel: rgba(5, 5, 5, 0.90);');
indexCss = indexCss.replace(/--col-panel-hover:\s*[^;]+;/, '--col-panel-hover: rgba(15, 15, 15, 0.95);');
indexCss = indexCss.replace(/--col-border:\s*[^;]+;/, '--col-border: rgba(255, 215, 0, 0.25);');
indexCss = indexCss.replace(/--col-border-bright:\s*[^;]+;/, '--col-border-bright: rgba(255, 215, 0, 0.65);');
indexCss = indexCss.replace(/--col-cyan:\s*[^;]+;/, '--col-cyan: #ffd700;');
indexCss = indexCss.replace(/--col-cyan-dim:\s*[^;]+;/, '--col-cyan-dim: rgba(255, 215, 0, 0.6);');
indexCss = indexCss.replace(/--col-cyan-glow:\s*[^;]+;/, '--col-cyan-glow: rgba(255, 215, 0, 0.2);');
indexCss = indexCss.replace(/html,\s*body,\s*#root \{[^}]+background:[^;]+;/, (m) => m.replace(/background:[^;]+;/, 'background: #000000;'));
indexCss = indexCss.replace(/color:\s*#ffe0e0;/, 'color: #ffffff;');
fs.writeFileSync('src/index.css', indexCss);

console.log('\n🟡 Black + Yellow theme applied to ALL interfaces!');

// VisualMenu Studio - Vision 2026 Core v1 (Desktop Ready)
const canvas = document.getElementById('canvas');
const container = document.getElementById('canvasContainer');
const screenListEl = document.getElementById('screenList');
const screenTabsEl = document.getElementById('screenTabs');

// Project State (The Store)
let project = {
    name: "My Project",
    screens: [
        { name: "MainHUD.java", widgets: [], history: [], historyIndex: -1, zoom: 1 }
    ],
    currentScreenIdx: 0
};

// Global References
let selectedId = null;
let currentPlatform = "minecraft";
let currentLoader = "neoforge";
let currentFormat = "source";

function init() {
    setupEventListeners();
    populateStaticLists();
    initResizableLayout();
    switchPlatform(document.getElementById('platformSelect').value);
    rebuildScreenUI();
    saveState();
}

function setupEventListeners() {
    document.getElementById('platformSelect').addEventListener('change', (e) => switchPlatform(e.target.value));
    document.getElementById('resSelector').addEventListener('change', (e) => updateResolution(e.target.value));
    
    document.getElementById('zoomSlider').addEventListener('input', (e) => {
        const s = getActiveScreen();
        s.zoom = e.target.value / 100;
        document.getElementById('zoomVal').textContent = e.target.value;
        container.style.transform = `scale(${s.zoom})`;
    });

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
        if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    });

    canvas.addEventListener('dragover', e => e.preventDefault());
    canvas.addEventListener('drop', handleDrop);

    // Universal Property Sync
    document.querySelectorAll('.property-group input, .property-group select').forEach(input => {
        input.addEventListener('input', (e) => {
            if (!selectedId) return;
            const w = getActiveScreen().widgets.find(x => x.id === selectedId);
            const prop = e.target.id.replace('prop', '');
            const val = e.target.type === 'number' || e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
            const keyMap = { Id: 'id', Text: 'text', X: 'x', Y: 'y', Width: 'width', Height: 'height', Rotation: 'rotation', Opacity: 'opacity', Scale: 'scale', Color: 'color', Accent: 'accent', Progress: 'progress', Font: 'font', Texture: 'texture', U: 'u', V: 'v', Uw: 'uw', Uh: 'uh' };
            const key = keyMap[prop];
            if (key) w[key] = val;
            render();
        });
        if (['color', 'range', 'text', 'number'].includes(input.type)) input.addEventListener('change', saveState);
    });
}

function getActiveScreen() { return project.screens[project.currentScreenIdx]; }

function addScreen() {
    const name = prompt("Enter screen name (e.g. Inventory.java):", "NewScreen.java");
    if (!name) return;
    project.screens.push({ name, widgets: [], history: [], historyIndex: -1, zoom: 1 });
    project.currentScreenIdx = project.screens.length - 1;
    rebuildScreenUI();
    render();
    saveState();
}

function switchScreen(idx) {
    project.currentScreenIdx = idx;
    const s = getActiveScreen();
    document.getElementById('zoomSlider').value = s.zoom * 100;
    document.getElementById('zoomVal').textContent = s.zoom * 100;
    container.style.transform = `scale(${s.zoom})`;
    rebuildScreenUI();
    render();
}

function rebuildScreenUI() {
    screenListEl.innerHTML = project.screens.map((s, idx) => `
        <li class="file-item ${idx === project.currentScreenIdx ? 'active' : ''}" onclick="switchScreen(${idx})">
            <i class="fas fa-file-code"></i><span>${s.name}</span>
        </li>
    `).join('');
    
    screenTabsEl.innerHTML = project.screens.map((s, idx) => `
        <div class="screen-tab ${idx === project.currentScreenIdx ? 'active' : ''}" onclick="switchScreen(${idx})">
            ${s.name} <i class="fas fa-times" onclick="removeScreen(event, ${idx})"></i>
        </div>
    `).join('');
}

function removeScreen(e, idx) {
    e.stopPropagation();
    if (project.screens.length <= 1) return;
    project.screens.splice(idx, 1);
    if (project.currentScreenIdx >= project.screens.length) project.currentScreenIdx = project.screens.length - 1;
    rebuildScreenUI();
    render();
}

function handleDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    const rect = canvas.getBoundingClientRect();
    const s = getActiveScreen();
    const x = Math.round((e.clientX - rect.left) / s.zoom);
    const y = Math.round((e.clientY - rect.top) / s.zoom);
    
    const id = `${type}_${s.widgets.length + 1}`;
    s.widgets.push({
        id, type, x, y, width: 120, height: 30, text: type==='label'?'New Label':'',
        texture: '', u:0, v:0, uw:256, uh:256, color:'#00ff88', progress:75, opacity:100, rotation:0, scale:100, font:'Minecraft'
    });
    selectWidget(id);
    render();
    saveState();
}

function render() {
    canvas.innerHTML = '';
    const s = getActiveScreen();
    s.widgets.forEach(w => {
        const el = document.createElement('div');
        el.className = `mc-widget mc-${w.type} ${w.id === selectedId ? 'selected' : ''}`;
        el.id = w.id;
        Object.assign(el.style, {
            left: `${w.x}px`, top: `${w.y}px`, width: `${w.width}px`, height: `${w.height}px`,
            opacity: w.opacity/100, transform: `rotate(${w.rotation}deg) scale(${w.scale/100})`,
            fontFamily: `'${w.font}', sans-serif`, color: w.color
        });
        if (w.texture) {
            el.classList.add('custom-textured');
            if (w.texture.startsWith('http')) el.style.backgroundImage = `url('${w.texture}')`;
            el.style.backgroundPosition = `-${w.u}px -${w.v}px`;
        }
        if (w.type.includes('bar')) {
            const inner = document.createElement('div');
            inner.className = 'bar-inner'; inner.style.width = `${w.progress}%`; inner.style.backgroundColor = w.color;
            el.appendChild(inner);
        } else if (w.text && w.type !== 'image') {
            const span = document.createElement('span'); span.textContent = w.text; el.appendChild(span);
        }
        el.addEventListener('mousedown', (e) => { e.stopPropagation(); selectWidget(w.id); startDragging(e, w); });
        canvas.appendChild(el);
    });
    updateLayers(); updateExport();
}

function selectWidget(id) {
    selectedId = id; const w = getActiveScreen().widgets.find(x => x.id === id);
    const form = document.getElementById('propertiesForm');
    if (w) {
        form.style.display = 'block'; document.getElementById('noSelection').style.display = 'none';
        ['Id','Text','X','Y','Width','Height','Rotation','Opacity','Scale','Color','Progress','Font','Texture','U','V','Uw','Uh'].forEach(p => {
            const val = w[p.toLowerCase()];
            if (val !== undefined) document.getElementById(`prop${p}`).value = val;
        });
    } else { form.style.display = 'none'; document.getElementById('noSelection').style.display = 'block'; }
    render();
}

function saveState() {
    const s = getActiveScreen();
    if (s.historyIndex < s.history.length - 1) s.history = s.history.slice(0, s.historyIndex + 1);
    s.history.push(JSON.stringify(s.widgets));
    if (s.history.length > 50) s.history.shift(); else s.historyIndex++;
}

function undo() {
    const s = getActiveScreen();
    if (s.historyIndex > 0) { s.historyIndex--; s.widgets = JSON.parse(s.history[s.historyIndex]); render(); }
}

function initResizableLayout() {
    const resizers = { L: 'sidebar', R: 'inspector', B: 'codePanel' };
    Object.entries(resizers).forEach(([dir, id]) => {
        const el = document.getElementById(`resizer${dir}`);
        const target = document.getElementById(id);
        el.addEventListener('mousedown', (e) => {
            const startVal = dir === 'B' ? target.offsetHeight : target.offsetWidth;
            const startPos = dir === 'B' ? e.clientY : e.clientX;
            const onMove = (me) => {
                const delta = (me[dir==='B'?'clientY':'clientX'] - startPos) * (dir === 'L' ? 1 : -1);
                target.style[dir==='B'?'height':'width'] = `${startVal + delta}px`;
            };
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    });
}

function populateStaticLists() {
    document.getElementById('resSelector').innerHTML = window.RESOLUTIONS.map(r => `<option value="${r.w},${r.h}">${r.name}</option>`).join('');
    updateResolution(document.getElementById('resSelector').value);
}

function updateResolution(val) {
    const [w, h] = val.split(',').map(Number);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    document.getElementById('sbRes').textContent = `${w}x${h}`;
}

function switchPlatform(p) {
    currentPlatform = p; const config = window.PLATFORMS[p];
    document.body.className = config.theme;
    document.getElementById('loaderSelect').innerHTML = config.loaders.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    document.getElementById('widgetGrid').innerHTML = config.widgets.map(w => `<div class="widget-item" draggable="true" data-type="${w}"><i class="fas ${getIcon(w)}"></i><span>${w}</span></div>`).join('');
    document.querySelectorAll('.widget-item').forEach(i => i.addEventListener('dragstart', e => e.dataTransfer.setData('type', e.target.dataset.type)));
    document.getElementById('sbPlatform').textContent = config.name;
    updateExport();
}

function updateLayers() {
    document.getElementById('layersList').innerHTML = getActiveScreen().widgets.map(w => `<li class="layer-item ${w.id===selectedId?'active':''}" onclick="selectWidget('${w.id}')">${w.id}</li>`).join('');
}

function updateExport() {
    if (window.UniversalExporter) {
        const res = window.UniversalExporter.generate(getActiveScreen().widgets, currentPlatform, document.getElementById('loaderSelect').value, currentFormat);
        document.getElementById('codeOutput').innerHTML = res.code;
        document.getElementById('exportMeta').textContent = res.meta;
    }
}

function getIcon(t) {
    const i = { button:'fa-square', label:'fa-font', slot:'fa-border-all', xp_bar:'fa-minus', healthbar:'fa-heart', image:'fa-image' };
    return i[t] || 'fa-cube';
}

let isDragging = false, currentW = null, sX, sY, oX, oY;
function startDragging(e, w) { isDragging = true; currentW = w; sX = e.clientX; sY = e.clientY; oX = w.x; oY = w.y; document.addEventListener('mousemove', drag); document.addEventListener('mouseup', () => { if (isDragging) saveState(); isDragging = false; document.removeEventListener('mousemove', drag); }); }
function drag(e) { if (!isDragging) return; const z = getActiveScreen().zoom; currentW.x = Math.round(oX + (e.clientX - sX)/z); currentW.y = Math.round(oY + (e.clientY - sY)/z); selectWidget(currentW.id); }

window.toggleSidebar = () => document.getElementById('sidebar').classList.toggle('collapsed');
window.toggleInspector = () => document.getElementById('inspector').classList.toggle('collapsed');

init();

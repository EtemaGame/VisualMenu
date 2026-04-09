// VisualMenu Studio - Universal Application Logic v6 (Resizable Layout)
const canvas = document.getElementById('canvas');
const container = document.getElementById('canvasContainer');
const platformSelect = document.getElementById('platformSelect');
const loaderSelect = document.getElementById('loaderSelect');
const resSelector = document.getElementById('resSelector');
const widgetGrid = document.getElementById('widgetGrid');
const sceneBg = document.getElementById('sceneBg');
const codeOutput = document.getElementById('codeOutput');
const exportMeta = document.getElementById('exportMeta');

// Panels
const sidebar = document.getElementById('sidebar');
const inspector = document.getElementById('inspector');
const codePanel = document.getElementById('codePanel');

// Refined controls
const zoomSlider = document.getElementById('zoomSlider');
const zoomVal = document.getElementById('zoomVal');
const gridToggle = document.getElementById('gridToggle');
const sbPos = document.getElementById('sbPos');
const sbLayers = document.getElementById('sbLayers');
const sbRes = document.getElementById('sbRes');
const sbPlatform = document.getElementById('sbPlatform');

let widgets = [];
let selectedId = null;
let currentPlatform = "minecraft";
let currentLoader = "neoforge";
let currentFormat = "source";

let zoom = 1;
let history = [];
let historyIndex = -1;

function init() {
    setupEventListeners();
    populateStaticLists();
    initResizableLayout();
    switchPlatform(platformSelect.value);
    saveState();
}

function setupEventListeners() {
    platformSelect.addEventListener('change', (e) => switchPlatform(e.target.value));
    loaderSelect.addEventListener('change', (e) => { currentLoader = e.target.value; updateExport(); });
    resSelector.addEventListener('change', (e) => updateResolution(e.target.value));
    sceneBg.addEventListener('change', (e) => canvas.className = e.target.value);
    
    zoomSlider.addEventListener('input', (e) => {
        zoom = e.target.value / 100;
        zoomVal.textContent = e.target.value;
        container.style.transform = `scale(${zoom})`;
    });
    gridToggle.addEventListener('change', (e) => document.body.classList.toggle('show-grid', e.target.checked));

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
        if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) / zoom);
        const y = Math.round((e.clientY - rect.top) / zoom);
        sbPos.textContent = `${x}, ${y}`;
    });

    canvas.addEventListener('dragover', e => e.preventDefault());
    canvas.addEventListener('drop', handleDrop);

    // Property Sync
    const inputs = document.querySelectorAll('#propertiesForm input, #propertiesForm select');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            if (!selectedId) return;
            const w = widgets.find(x => x.id === selectedId);
            const prop = e.target.id.replace('prop', '');
            const val = e.target.type === 'number' || e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
            const keyMap = { Id: 'id', Text: 'text', X: 'x', Y: 'y', Width: 'width', Height: 'height', Rotation: 'rotation', Opacity: 'opacity', Scale: 'scale', Color: 'color', Accent: 'accent', Progress: 'progress', Font: 'font', Texture: 'texture', U: 'u', V: 'v', Uw: 'uw', Uh: 'uh' };
            const key = keyMap[prop];
            if (key) w[key] = val;
            render();
        });
        if (input.type === 'color' || input.type === 'range' || input.type === 'text' || input.type === 'number') {
            input.addEventListener('change', saveState);
        }
    });

    document.querySelectorAll('.code-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFormat = tab.getAttribute('data-target');
            updateExport();
        });
    });
}

function initResizableLayout() {
    const resizerL = document.getElementById('resizerL');
    const resizerR = document.getElementById('resizerR');
    const resizerB = document.getElementById('resizerB');

    // Vertical Resize Left
    resizerL.addEventListener('mousedown', (e) => {
        const startX = e.clientX;
        const startWidth = sidebar.offsetWidth;
        const doDrag = (e) => {
            const width = startWidth + (e.clientX - startX);
            if (width > 45 && width < 500) sidebar.style.width = `${width}px`;
        };
        const stopDrag = () => { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); };
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    });

    // Vertical Resize Right
    resizerR.addEventListener('mousedown', (e) => {
        const startX = e.clientX;
        const startWidth = inspector.offsetWidth;
        const doDrag = (e) => {
            const width = startWidth - (e.clientX - startX);
            if (width > 45 && width < 500) inspector.style.width = `${width}px`;
        };
        const stopDrag = () => { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); };
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    });

    // Horizontal Resize Bottom
    resizerB.addEventListener('mousedown', (e) => {
        const startY = e.clientY;
        const startHeight = codePanel.offsetHeight;
        const doDrag = (e) => {
            const height = startHeight - (e.clientY - startY);
            if (height > 100 && height < 600) codePanel.style.height = `${height}px`;
        };
        const stopDrag = () => { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); };
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    });
}

window.toggleSidebar = () => sidebar.classList.toggle('collapsed');
window.toggleInspector = () => inspector.classList.toggle('collapsed');

function switchPlatform(platformId) {
    currentPlatform = platformId;
    const config = window.PLATFORMS[platformId];
    document.body.className = config.theme;
    loaderSelect.innerHTML = config.loaders.map(l => `<option value="${l.id}" ${l.default ? 'selected' : ''}>${l.name}</option>`).join('');
    currentLoader = loaderSelect.value;
    widgetGrid.innerHTML = config.widgets.map(w => `<div class="widget-item" draggable="true" data-type="${w}"><i class="fas ${getIcon(w)}"></i><span>${w.replace('_', ' ')}</span></div>`).join('');
    document.querySelectorAll('.widget-item').forEach(item => {
        item.addEventListener('dragstart', (e) => e.dataTransfer.setData('type', e.target.getAttribute('data-type')));
    });
    sbPlatform.textContent = config.name;
    updateExport();
}

function updateResolution(val) {
    const [w, h] = val.split(',').map(Number);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    sbRes.textContent = `${w}x${h}`;
}

function handleDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoom);
    const y = Math.round((e.clientY - rect.top) / zoom);
    const finalX = gridToggle.checked ? Math.round(x / 20) * 20 : x;
    const finalY = gridToggle.checked ? Math.round(y / 20) * 20 : y;
    const id = `${type}_${widgets.length + 1}`;
    const widget = {
        id, type, x: finalX, y: finalY, width: type==='image'?64:(type==='slot'?36:120), height: type==='image'?64:(type==='slot'?36:30), 
        text: type === 'button' ? 'Action' : (type==='label'?'New Label':''), texture: '', u: 0, v: 0, uw: 256, uh: 256,
        color: type==='healthbar'?'#ff4757':'#00ff88', progress: 75, opacity: 100, rotation: 0, scale: 100, font: 'Minecraft'
    };
    widgets.push(widget);
    selectWidget(id);
    render();
    saveState();
}

function render() {
    canvas.innerHTML = '';
    widgets.forEach(w => {
        const el = document.createElement('div');
        el.className = `mc-widget mc-${w.type} ${w.id === selectedId ? 'selected' : ''}`;
        el.id = w.id;
        el.style.left = `${w.x}px`; el.style.top = `${w.y}px`;
        el.style.width = `${w.width}px`; el.style.height = `${w.height}px`;
        el.style.opacity = w.opacity / 100;
        el.style.transform = `rotate(${w.rotation}deg) scale(${w.scale / 100})`;
        el.style.fontFamily = `'${w.font}', sans-serif`; el.style.color = w.color;

        if (w.texture) {
            el.classList.add('custom-textured');
            if (w.texture.startsWith('http')) el.style.backgroundImage = `url('${w.texture}')`;
            el.style.backgroundPosition = `-${w.u}px -${w.v}px`;
        }

        if (w.type === 'healthbar' || w.type === 'xp_bar') {
            const inner = document.createElement('div');
            inner.className = 'bar-inner'; inner.style.width = `${w.progress}%`; inner.style.backgroundColor = w.color;
            el.appendChild(inner);
        } else if (w.text && w.type !== 'image') {
            const span = document.createElement('span'); span.textContent = w.text; el.appendChild(span);
        }

        el.addEventListener('mousedown', (e) => { e.stopPropagation(); selectWidget(w.id); startDragging(e, w); });
        canvas.appendChild(el);
    });
    updateLayers(); updateExport(); sbLayers.textContent = widgets.length;
}

function selectWidget(id) {
    selectedId = id; const w = widgets.find(x => x.id === id);
    const form = document.getElementById('propertiesForm'); const noSel = document.getElementById('noSelection');
    if (w) {
        form.style.display = 'block'; noSel.style.display = 'none';
        document.getElementById('propId').value = w.id; document.getElementById('propText').value = w.text || '';
        document.getElementById('propX').value = w.x; document.getElementById('propY').value = w.y;
        document.getElementById('propWidth').value = w.width; document.getElementById('propHeight').value = w.height;
        document.getElementById('propRotation').value = w.rotation; document.getElementById('propOpacity').value = w.opacity;
        document.getElementById('propScale').value = w.scale; document.getElementById('propColor').value = w.color;
        document.getElementById('propProgress').value = w.progress || 0; document.getElementById('propFont').value = w.font || 'Minecraft';
        document.getElementById('propTexture').value = w.texture || '';
        document.getElementById('propU').value = w.u || 0; document.getElementById('propV').value = w.v || 0;
        document.getElementById('propUw').value = w.uw || 256; document.getElementById('propUh').value = w.uh || 256;
    } else { form.style.display = 'none'; noSel.style.display = 'block'; }
    render();
}

function saveState() {
    if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
    history.push(JSON.stringify(widgets));
    if (history.length > 50) history.shift(); else historyIndex++;
}

function undo() { if (historyIndex > 0) { historyIndex--; widgets = JSON.parse(history[historyIndex]); render(); showToast("Undo"); } }
function redo() { if (historyIndex < history.length - 1) { historyIndex++; widgets = JSON.parse(history[historyIndex]); render(); showToast("Redo"); } }
function showToast(msg) { const t = document.getElementById('toast'); if (t) { t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000); } }

function populateStaticLists() {
    resSelector.innerHTML = window.RESOLUTIONS.map(r => `<option value="${r.w},${r.h}">${r.name}</option>`).join('');
    updateResolution(resSelector.value);
}

let isDragging = false, currentWidget = null, startX, startY, origX, origY;
function startDragging(e, w) {
    isDragging = true; currentWidget = w; startX = e.clientX; startY = e.clientY; origX = w.x; origY = w.y;
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', () => { if (isDragging) saveState(); isDragging = false; document.removeEventListener('mousemove', drag); });
}
function drag(e) {
    if (!isDragging) return;
    let dx = (e.clientX - startX) / zoom, dy = (e.clientY - startY) / zoom;
    let nx = origX + dx, ny = origY + dy;
    if (gridToggle.checked) { nx = Math.round(nx / 10) * 10; ny = Math.round(ny / 10) * 10; }
    currentWidget.x = Math.round(nx); currentWidget.y = Math.round(ny);
    selectWidget(currentWidget.id);
}

function updateLayers() {
    const list = document.getElementById('layersList');
    list.innerHTML = widgets.map(w => `<li class="layer-item ${w.id === selectedId ? 'active' : ''}" onclick="selectWidget('${w.id}')"><span>${w.id}</span><i class="fas fa-eye visibility"></i></li>`).join('');
}

function updateExport() {
    if (window.UniversalExporter) {
        const result = window.UniversalExporter.generate(widgets, currentPlatform, currentLoader, currentFormat);
        codeOutput.innerHTML = result.code;
        exportMeta.textContent = `Target: ${result.meta}`;
    }
}

function getIcon(type) {
    const icons = { button: 'fa-square', label: 'fa-font', slot: 'fa-border-all', xp_bar: 'fa-minus', healthbar: 'fa-heart', minimap: 'fa-compass', ammo: 'fa-gun', score: 'fa-star', image: 'fa-image' };
    return icons[type] || 'fa-cube';
}

init();

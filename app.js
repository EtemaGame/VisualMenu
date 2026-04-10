// VisualMenu Studio - Vision 2026 Core v2 (Bug-Fixed)
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
let isGridActive = false;

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

    // FIX #2: Grid toggle now works correctly
    document.getElementById('gridToggle').addEventListener('change', (e) => {
        isGridActive = e.target.checked;
        document.querySelector('.canvas-scroller').classList.toggle('show-grid', isGridActive);
    });

    // FIX #3: Mock Background now actually changes the canvas background
    document.getElementById('sceneBg').addEventListener('change', (e) => {
        const val = e.target.value;
        // Remove all background classes
        canvas.classList.remove('mc_overworld', 'mc_nether', 'game_forest', 'game_city');
        if (val !== 'none') canvas.classList.add(val);
    });

    document.getElementById('zoomSlider').addEventListener('input', (e) => {
        const s = getActiveScreen();
        s.zoom = e.target.value / 100;
        document.getElementById('zoomVal').textContent = e.target.value;
        container.style.transform = `scale(${s.zoom})`;
        // Compensate transform origin so canvas stays top-left
        container.style.transformOrigin = 'top left';
    });

    // FIX #4: redo() now exists
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
        if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
        if (e.key === 'Delete' && selectedId) { deleteSelected(); }
    });

    // FIX #5: dragstart on widget-item set from closest parent with data-type
    document.addEventListener('dragstart', (e) => {
        const item = e.target.closest('[data-type]');
        if (item) e.dataTransfer.setData('type', item.dataset.type);
    });

    canvas.addEventListener('dragover', e => e.preventDefault());
    canvas.addEventListener('drop', handleDrop);

    // Deselect when clicking canvas background
    canvas.addEventListener('mousedown', (e) => {
        if (e.target === canvas) { selectedId = null; selectWidget(null); }
    });

    // Universal Property Sync
    document.querySelectorAll('.property-group input, .property-group select').forEach(input => {
        input.addEventListener('input', (e) => {
            if (!selectedId) return;
            const w = getActiveScreen().widgets.find(x => x.id === selectedId);
            if (!w) return;
            const prop = e.target.id.replace('prop', '');
            const val = e.target.type === 'number' || e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
            const keyMap = { Id: 'id', Text: 'text', X: 'x', Y: 'y', Width: 'width', Height: 'height', Rotation: 'rotation', Opacity: 'opacity', Scale: 'scale', Color: 'color', Accent: 'accent', Progress: 'progress', Font: 'font', Texture: 'texture', U: 'u', V: 'v', Uw: 'uw', Uh: 'uh' };
            const key = keyMap[prop];
            if (key) w[key] = val;
            renderWidget(w); // FIX #6: render only the modified widget, not full re-render
            updateExport();
        });
        if (['color', 'range', 'text', 'number'].includes(input.type)) {
            input.addEventListener('change', saveState);
        }
    });

    // Code panel tabs — FIX #12
    document.querySelectorAll('.code-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFormat = tab.dataset.target;
            updateExport();
        });
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', () => {
        const code = document.getElementById('codeOutput').textContent;
        const blob = new Blob([code], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const ext = currentPlatform === 'minecraft' ? 'java' : (currentPlatform === 'godot' ? 'gd' : (currentPlatform === 'unity' ? 'cs' : 'txt'));
        a.download = `${getActiveScreen().name.replace(/\.[^.]+$/, '')}.${ext}`;
        a.click();
        showToast('Code exported!');
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
    selectedId = null;
    document.getElementById('zoomSlider').value = s.zoom * 100;
    document.getElementById('zoomVal').textContent = Math.round(s.zoom * 100);
    container.style.transform = `scale(${s.zoom})`;
    container.style.transformOrigin = 'top left';
    
    // Sync button visibility based on source link
    document.getElementById('syncSourceBtn').style.display = s.sourcePath ? 'flex' : 'none';
    
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
    if (project.screens.length <= 1) { showToast("Cannot remove the last screen"); return; }
    
    const s = project.screens[idx];
    const msg = s.sourcePath ? `Remove source-linked screen "${s.name}"? Changes not synced to file will be lost.` : `Remove screen "${s.name}"?`;
    
    if (!confirm(msg)) return;
    
    project.screens.splice(idx, 1);
    if (project.currentScreenIdx >= project.screens.length) project.currentScreenIdx = project.screens.length - 1;
    
    // Use switchScreen instead of manual rebuild+render to update UI state (like sync button)
    switchScreen(project.currentScreenIdx);
}

// FIX #5 + #8: Correct drop position accounting for scroll and zoom
function handleDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (!type) return;
    const scroller = document.querySelector('.canvas-scroller');
    const rect = canvas.getBoundingClientRect();
    const s = getActiveScreen();
    // Account for zoom transform
    const x = Math.round((e.clientX - rect.left) / s.zoom);
    const y = Math.round((e.clientY - rect.top) / s.zoom);

    // Use widget-specific default sizes if available
    const mc = window.MC_WIDGETS && window.MC_WIDGETS[type];
    const defaultW = mc ? mc.defaultWidth : 120;
    const defaultH = mc ? mc.defaultHeight : 30;

    const id = `${type}_${Date.now()}`;
    s.widgets.push({
        id, type, x, y, width: defaultW, height: defaultH,
        text: type === 'label' ? 'New Label' : (type === 'button' ? 'Button' : ''),
        texture: '', u: 0, v: 0, uw: 256, uh: 256,
        color: '#00ff88', accent: '#ff4757', progress: 75,
        opacity: 100, rotation: 0, scale: 100, font: 'Minecraft'
    });
    selectWidget(id);
    render();
    saveState();
}

// FIX #6: Full render (only called when needed)
function render() {
    canvas.innerHTML = '';
    const s = getActiveScreen();
    s.widgets.forEach(w => {
        canvas.appendChild(createWidgetEl(w));
    });
    updateLayers();
    updateExport();
    updateStatusBar();
}

// FIX #6: Single widget re-render — update the DOM element without clearing canvas
function renderWidget(w) {
    const existing = document.getElementById(w.id);
    if (!existing) { render(); return; }
    applyWidgetStyle(existing, w);
    updateExport();
}

function createWidgetEl(w) {
    const el = document.createElement('div');
    el.className = `mc-widget mc-${w.type}${w.id === selectedId ? ' selected' : ''}`;
    el.id = w.id;
    applyWidgetStyle(el, w);
    el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        selectWidget(w.id);
        startDragging(e, w);
    });
    return el;
}

function applyWidgetStyle(el, w) {
    el.className = `mc-widget mc-${w.type}${w.id === selectedId ? ' selected' : ''}`;
    Object.assign(el.style, {
        left: `${w.x}px`, top: `${w.y}px`,
        width: `${w.width}px`, height: `${w.height}px`,
        opacity: w.opacity / 100,
        transform: `rotate(${w.rotation}deg) scale(${w.scale / 100})`,
        fontFamily: `'${w.font}', sans-serif`,
        color: w.color
    });
    el.innerHTML = '';
    if (w.texture) {
        el.classList.add('custom-textured');
        el.style.backgroundImage = `url('${w.texture}')`;
        el.style.backgroundPosition = `-${w.u}px -${w.v}px`;
    } else {
        el.style.backgroundImage = '';
    }
    if (w.type.includes('bar')) {
        const inner = document.createElement('div');
        inner.className = 'bar-inner';
        inner.style.width = `${w.progress}%`;
        inner.style.backgroundColor = w.color;
        el.appendChild(inner);
    } else if (w.text && w.type !== 'image') {
        const span = document.createElement('span');
        span.textContent = w.text;
        el.appendChild(span);
    }
}

function selectWidget(id) {
    selectedId = id;
    const w = id ? getActiveScreen().widgets.find(x => x.id === id) : null;
    const form = document.getElementById('propertiesForm');
    const noSel = document.getElementById('noSelection');

    // Update selection visuals without full re-render
    document.querySelectorAll('.mc-widget').forEach(el => {
        el.classList.toggle('selected', el.id === selectedId);
    });
    updateLayers();

    if (w) {
        form.style.display = 'block';
        noSel.style.display = 'none';
        ['Id', 'Text', 'X', 'Y', 'Width', 'Height', 'Rotation', 'Opacity', 'Scale', 'Color', 'Accent', 'Progress', 'Font', 'Texture', 'U', 'V', 'Uw', 'Uh'].forEach(p => {
            const el = document.getElementById(`prop${p}`);
            if (el) {
                const val = w[p.toLowerCase()];
                if (val !== undefined) el.value = val;
            }
        });
    } else {
        form.style.display = 'none';
        noSel.style.display = 'block';
    }
}

function deleteSelected() {
    if (!selectedId) return;
    const s = getActiveScreen();
    s.widgets = s.widgets.filter(w => w.id !== selectedId);
    selectedId = null;
    render();
    selectWidget(null);
    saveState();
    showToast('Widget deleted');
}

function saveState() {
    const s = getActiveScreen();
    if (s.historyIndex < s.history.length - 1) s.history = s.history.slice(0, s.historyIndex + 1);
    s.history.push(JSON.stringify(s.widgets));
    if (s.history.length > 50) s.history.shift(); else s.historyIndex++;
}

function undo() {
    const s = getActiveScreen();
    if (s.historyIndex > 0) {
        s.historyIndex--;
        s.widgets = JSON.parse(s.history[s.historyIndex]);
        selectedId = null;
        render();
        selectWidget(null);
        showToast('Undo');
    }
}

// FIX #4: redo() now implemented
function redo() {
    const s = getActiveScreen();
    if (s.historyIndex < s.history.length - 1) {
        s.historyIndex++;
        s.widgets = JSON.parse(s.history[s.historyIndex]);
        selectedId = null;
        render();
        selectWidget(null);
        showToast('Redo');
    }
}

function initResizableLayout() {
    const resizers = { L: 'sidebar', R: 'inspector' };
    Object.entries(resizers).forEach(([dir, id]) => {
        const el = document.getElementById(`resizer${dir}`);
        if (!el) return;
        const target = document.getElementById(id);
        const varName = `--${id}-width`;

        el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            // Don't resize if panel is collapsed
            if (target.classList.contains('collapsed')) return;

            const startWidth = target.offsetWidth;
            const startX = e.clientX;
            const onMove = (me) => {
                const delta = (me.clientX - startX) * (dir === 'L' ? 1 : -1);
                const newW = Math.max(160, Math.min(640, startWidth + delta));
                document.documentElement.style.setProperty(varName, `${newW}px`);
                // Clear inline style if any (to prevent conflicts)
                target.style.width = '';
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    });

    // FIX #14: Bottom resizer — resize code panel correctly
    const resizerB = document.getElementById('resizerB');
    const codePanel = document.getElementById('codePanel');
    if (resizerB && codePanel) {
        resizerB.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startH = codePanel.offsetHeight;
            const startY = e.clientY;
            const onMove = (me) => {
                const delta = startY - me.clientY;
                const newH = Math.max(0, Math.min(1000, startH + delta));
                document.documentElement.style.setProperty('--code-panel-height', `${newH}px`);
                codePanel.style.height = ''; 
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }
}

function populateStaticLists() {
    document.getElementById('resSelector').innerHTML = window.RESOLUTIONS.map(r => `<option value="${r.w},${r.h}">${r.name}</option>`).join('');
    updateResolution(document.getElementById('resSelector').value);
    
    document.getElementById('syncSourceBtn').addEventListener('click', () => window.syncToSource());
}

function updateResolution(val) {
    const [w, h] = val.split(',').map(Number);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    document.getElementById('sbRes').textContent = `${w}×${h}`;
}

// FIX #17: preserve grid state when switching platform
function switchPlatform(p) {
    currentPlatform = p;
    const config = window.PLATFORMS[p];
    if (!config) return;
    // Preserve show-grid class
    const wasGrid = document.querySelector('.canvas-scroller').classList.contains('show-grid');
    document.body.className = config.theme;
    if (wasGrid) document.querySelector('.canvas-scroller').classList.add('show-grid');

    document.getElementById('loaderSelect').innerHTML = config.loaders.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    currentLoader = config.loaders[0].id;

    document.getElementById('widgetGrid').innerHTML = config.widgets.map(w => `
        <div class="widget-item" draggable="true" data-type="${w}">
            <i class="fas ${getIcon(w)}"></i><span>${w}</span>
        </div>
    `).join('');

    document.getElementById('sbPlatform').textContent = config.name;
    updateExport();
}

// FIX #7: updateLayers now also updates sbLayers counter
function updateLayers() {
    const widgets = getActiveScreen().widgets;
    document.getElementById('layersList').innerHTML = widgets.map((w, i) => `
        <li class="layer-item ${w.id === selectedId ? 'active' : ''}" onclick="selectWidget('${w.id}')">
            <span><i class="fas ${getIcon(w.type)}" style="margin-right:8px;opacity:0.6"></i>${w.id}</span>
            <span class="layer-actions">
                <i class="fas fa-arrow-up layer-btn" onclick="moveLayer(event,'${w.id}',-1)" title="Move Up"></i>
                <i class="fas fa-arrow-down layer-btn" onclick="moveLayer(event,'${w.id}',1)" title="Move Down"></i>
                <i class="fas fa-trash layer-btn" onclick="deleteWidget(event,'${w.id}')" title="Delete" style="color:#ff4757"></i>
            </span>
        </li>
    `).join('');
    document.getElementById('sbLayers').textContent = widgets.length;
}

function moveLayer(e, id, dir) {
    e.stopPropagation();
    const s = getActiveScreen();
    const idx = s.widgets.findIndex(w => w.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= s.widgets.length) return;
    [s.widgets[idx], s.widgets[newIdx]] = [s.widgets[newIdx], s.widgets[idx]];
    render();
    saveState();
}

function deleteWidget(e, id) {
    e.stopPropagation();
    const s = getActiveScreen();
    s.widgets = s.widgets.filter(w => w.id !== id);
    if (selectedId === id) { selectedId = null; selectWidget(null); }
    render();
    saveState();
    showToast('Widget removed');
}

function updateStatusBar() {
    document.getElementById('sbLayers').textContent = getActiveScreen().widgets.length;
}

function updateExport() {
    const s = getActiveScreen();

    // JSON and CSS always use generated output
    if (currentFormat === 'json') {
        if (window.UniversalExporter) {
            const res = window.UniversalExporter.generate(s.widgets, currentPlatform, document.getElementById('loaderSelect').value, 'json');
            document.getElementById('codeOutput').innerHTML = res.code;
            document.getElementById('exportMeta').textContent = res.meta;
        }
        return;
    }
    if (currentFormat === 'css') {
        if (window.UniversalExporter) {
            const res = window.UniversalExporter.generate(s.widgets, currentPlatform, document.getElementById('loaderSelect').value, 'css');
            document.getElementById('codeOutput').innerHTML = res.code;
            document.getElementById('exportMeta').textContent = res.meta;
        }
        return;
    }

    // Source Code tab: if a file is linked, show the ACTUAL source file content
    if (currentFormat === 'source' && s.sourcePath && s.originalContent) {
        const escaped = s.originalContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        // Java syntax highlight
        let h = escaped
            .replace(/(&quot;[^&]*?&quot;)/g, '<span class="hl-str">$1</span>')
            .replace(/\b(public|private|protected|class|interface|enum|void|int|float|double|boolean|String|return|new|import|package|static|final|abstract|extends|implements|super|this|if|else|for|while|do|try|catch|finally|throw|throws|override|Override|SubscribeEvent|Mod|EventBusSubscriber)\b/g, '<span class="hl-kw">$1</span>')
            .replace(/(&#x2F;&#x2F;[^\n]*|&#x2F;\*[\s\S]*?\*&#x2F;)/g, '<span class="hl-cmt">$1</span>')
            .replace(/(\/\/[^\n]*)/g, '<span class="hl-cmt">$1</span>')
            .replace(/(@\w+)/g, '<span style="color:#61afef">$1</span>')
            .replace(/\b(GuiGraphics|Minecraft|ResourceLocation|Component|Button|Screen|ForgeGui|IGuiOverlay|PoseStack|RenderSystem)\b/g, '<span style="color:#e5c07b">$1</span>');

        const lineCount = s.originalContent.split('\n').length;
        const detectedNote = s.widgets.length > 0
            ? `${s.widgets.length} component${s.widgets.length > 1 ? 's' : ''} detected`
            : 'No renderable components detected — add guiGraphics.blit() / drawString() calls';

        document.getElementById('codeOutput').innerHTML = `<code>${h}</code>`;
        document.getElementById('exportMeta').textContent = `📄 ${s.name}  •  ${lineCount} lines  •  ${detectedNote}`;
        return;
    }

    // Default: show generated code
    if (window.UniversalExporter) {
        const loader = document.getElementById('loaderSelect').value;
        const res = window.UniversalExporter.generate(s.widgets, currentPlatform, loader, currentFormat);
        document.getElementById('codeOutput').innerHTML = res.code;
        document.getElementById('exportMeta').textContent = res.meta;
    }
}

function getIcon(t) {
    const i = {
        button: 'fa-square', label: 'fa-font', slot: 'fa-border-all',
        xp_bar: 'fa-minus', healthbar: 'fa-heart', image: 'fa-image',
        ammo: 'fa-crosshairs', score: 'fa-star', notification: 'fa-bell',
        minimap: 'fa-map', radar: 'fa-satellite-dish', target: 'fa-bullseye'
    };
    return i[t] || 'fa-cube';
}

// FIX #8: Dragging correctly compensates for canvas scroll position and zoom
let isDragging = false, currentW = null, sX, sY, oX, oY;

function startDragging(e, w) {
    isDragging = true;
    currentW = w;
    sX = e.clientX; sY = e.clientY;
    oX = w.x; oY = w.y;

    const onMove = (me) => {
        if (!isDragging) return;
        const z = getActiveScreen().zoom;
        const newX = Math.round(oX + (me.clientX - sX) / z);
        const newY = Math.round(oY + (me.clientY - sY) / z);

        // BOUNDS CHECKING: Keep within canvas +/- 500px to avoid losing widgets
        const canvasW = canvas.offsetWidth;
        const canvasH = canvas.offsetHeight;
        currentW.x = Math.max(-200, Math.min(canvasW + 200, newX));
        currentW.y = Math.max(-200, Math.min(canvasH + 200, newY));

        // Update position live without full re-render
        const el = document.getElementById(currentW.id);
        if (el) {
            el.style.left = `${currentW.x}px`;
            el.style.top = `${currentW.y}px`;
        }
        // Update inspector if this widget is selected
        if (selectedId === currentW.id) {
            const px = document.getElementById('propX');
            const py = document.getElementById('propY');
            if (px) px.value = currentW.x;
            if (py) py.value = currentW.y;
        }
        document.getElementById('sbPos').textContent = `${currentW.x}, ${currentW.y}`;
    };

    const onUp = () => {
        if (isDragging) saveState();
        isDragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

window.toggleSidebar = () => document.getElementById('sidebar').classList.toggle('collapsed');
window.toggleInspector = () => document.getElementById('inspector').classList.toggle('collapsed');
window.moveLayer = moveLayer;
window.deleteWidget = deleteWidget;

// Native Persistence Bridge
window.saveProjectNative = async () => {
    if (!window.electronAPI) {
        showToast("Native Save only available in Desktop App");
        return;
    }
    const result = await window.electronAPI.saveProject(project);
    if (result && result.success) {
        showToast(`Saved: ${result.path.split('\\').pop()}`);
    }
};

window.selectSourceFolderNative = async () => {
    if (!window.electronAPI) return showToast("Desktop only feature");
    const path = await window.electronAPI.selectFolder();
    if (path) {
        document.getElementById('treeContent').innerHTML = '<div class="empty-state">Scanning directory...</div>';
        document.getElementById('projectTree').style.display = 'block';
        const tree = await window.electronAPI.getDirectoryTree(path);
        renderTree(tree, document.getElementById('treeContent'));
        showToast("Source folder loaded");
    }
};

function renderTree(items, container) {
    container.innerHTML = '';
    const activePath = getActiveScreen().sourcePath;
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = `tree-item ${item.type}${item.path === activePath ? ' active' : ''}`;
        div.innerHTML = `<i class="fas ${item.type === 'dir' ? 'fa-folder' : 'fa-file-code'}"></i><span>${item.name}</span>`;
        if (item.type === 'file') {
            div.onclick = () => openSourceFile(item.path, item.name);
        }
        container.appendChild(div);
        if (item.children) {
            const group = document.createElement('div');
            group.className = 'tree-folder-group';
            renderTree(item.children, group);
            container.appendChild(group);
        }
    });
}

async function openSourceFile(path, name) {
    const content = await window.electronAPI.readFile(path);
    if (!content) { showToast('Could not read file'); return; }

    const widgets = window.ImportEngine.parse(content);

    // Create or Update Screen (always open, even if 0 widgets)
    const existingIdx = project.screens.findIndex(s => s.sourcePath === path);
    if (existingIdx !== -1) {
        // Update widgets but preserve existing history
        const s = project.screens[existingIdx];
        if (widgets.length > 0) s.widgets = widgets;
        project.currentScreenIdx = existingIdx;
    } else {
        project.screens.push({
            name: name,
            widgets: widgets,
            history: [],
            historyIndex: -1,
            zoom: 1,
            sourcePath: path,
            originalContent: content
        });
        project.currentScreenIdx = project.screens.length - 1;
    }

    document.getElementById('syncSourceBtn').style.display = 'flex';
    rebuildScreenUI();
    switchScreen(project.currentScreenIdx);
    saveState();

    if (widgets.length > 0) {
        showToast(`\u2713 ${widgets.length} element${widgets.length > 1 ? 's' : ''} imported from ${name}`);
    } else {
        showToast(`Opened ${name} \u2014 no renderable components detected yet`);
    }
}

window.syncToSource = async () => {
    const s = getActiveScreen();
    if (!s.sourcePath) return;
    
    showToast("Syncing to source...");
    const loader = document.getElementById('loaderSelect').value;
    const res = window.UniversalExporter.generate(s.widgets, currentPlatform, loader, 'source');
    
    // Improved block replacement: handle multiple render method variations
    let content = await window.electronAPI.readFile(s.sourcePath);
    const renderRegex = /(@Override\s+)?public\s+void\s+render\(GuiGraphics\s+\w+,.*?\)\s*{[\s\S]*?}/i;
    const fallbackRegex = /public\s+void\s+render\(.*?\)\s*{[\s\S]*?}/i;
    
    // Extract the generated render method
    const genCode = res.code.replace(/<[^>]*>/g, ''); // Strip HTML if any
    const newRenderMatch = genCode.match(/public\s+void\s+render\(.*?\)\s*{[\s\S]*?}/i);
    
    if (content && newRenderMatch) {
        let newContent;
        if (renderRegex.test(content)) {
            newContent = content.replace(renderRegex, newRenderMatch[0]);
        } else if (fallbackRegex.test(content)) {
            newContent = content.replace(fallbackRegex, newRenderMatch[0]);
        } else {
            showToast("Target render method not found!");
            return;
        }
        
        const success = await window.electronAPI.writeFile({ filePath: s.sourcePath, content: newContent });
        if (success) showToast("Source synchronized!");
        else showToast("Write failed. Check file permissions.");
    } else {
        showToast("Parser error: Could not extract render block");
    }
};

window.openProjectNative = async () => {
    if (!window.electronAPI) {
        showToast("Native Open only available in Desktop App");
        return;
    }
    const data = await window.electronAPI.loadProject();
    if (data) {
        project = data;
        // Restore history arrays if missing (older files)
        project.screens.forEach(s => {
            if (!s.history) { s.history = []; s.historyIndex = -1; }
            if (!s.zoom) s.zoom = 1;
        });
        selectedId = null;
        rebuildScreenUI();
        switchScreen(project.currentScreenIdx || 0);
        showToast("Project loaded successfully");
    }
};

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

window.addScreen = addScreen;

init();

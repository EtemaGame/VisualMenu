/**
 * VisualMenu Studio - Reverse Parser Engine v4 (Ultra-Lax)
 * Handles variable-based coordinates, dynamic colors, and multi-argument signatures.
 */
window.ImportEngine = {

    parse(content, platform = 'minecraft') {
        const widgets = [];
        const lines = content.split('\n');
        let idc = 0;
        const uid = (p) => `${p}_${Date.now()}_${idc++}`;

        // ── PASS 1: Broad Variable Extraction ─────────────────
        const vars = {
            'white': 0xFFFFFF, 'black': 0x000000, 'red': 0xFF0000, 'green': 0x00FF00, 'blue': 0x0000FF
        };
        // Capturamos cualquier int/float/final int
        content.replace(/\b(?:int|float|double|long)\s+(\w+)\s*=\s*([^;]+);/g, (_, name, val) => {
            const cleanVal = val.trim().replace(/[fLd]$/i, '');
            if (/^-?\d+(\.\d+)?$/.test(cleanVal)) vars[name] = parseFloat(cleanVal);
        });

        // ── Coordinate/Color Resolver ──────────────────────────
        const resolveRaw = (expr) => {
            if (!expr) return NaN;
            const e = expr.trim();
            if (/^-?\d+$/.test(e)) return parseInt(e);
            if (vars[e] !== undefined) return vars[e];
            
            // screenWidth/2 style
            if (/(?:width|screenWidth|pWidth|guiWidth|w)\s*\/\s*2/i.test(e)) {
                const adj = e.match(/[+-]\s*\d+/);
                return 960 + (adj ? parseInt(adj[0].replace(/\s/g, '')) : 0);
            }
            if (/(?:height|screenHeight|pHeight|guiHeight|h)\s*\/\s*2/i.test(e)) {
                const adj = e.match(/[+-]\s*\d+/);
                return 540 + (adj ? parseInt(adj[0].replace(/\s/g, '')) : 0);
            }
            return NaN;
        };

        const resolveColor = (expr) => {
            if (!expr) return '#ffffff';
            const e = expr.trim();
            if (e.startsWith('0x')) return '#' + e.substring(2).slice(-6).padStart(6, '0');
            // Si es una variable conocida o un número
            if (!isNaN(parseInt(e))) return '#' + (parseInt(e) & 0xFFFFFF).toString(16).padStart(6, '0');
            return '#ffffff'; // Default para variables desconocidas (como nameColor)
        };

        // ── PATTERNS ──────────────────────────────────────────
        const G = '(?:guiGraphics|pGuiGraphics|graphics|g|ctx|event\\.getGuiGraphics\\(\\))';
        const ARG = '([^,()]+)'; // Cualquier cosa que no sea coma o paréntesis

        const patterns = [
            // 1. drawString (Cualquier variante de 5 o 6 argumentos)
            {
                label: 'drawString',
                re: new RegExp(`${G}\\s*\\.\\s*drawString\\s*\\(\\s*([^,]+)\\s*,\\s*${ARG}\\s*,\\s*${ARG}\\s*,\\s*${ARG}\\s*,\\s*${ARG}`, 'i'),
                map: (m) => {
                    const x = resolveRaw(m[3]), y = resolveRaw(m[4]);
                    const text = m[2].match(/"([^"]*)"/) ? m[2].match(/"([^"]*)"/)[1] : m[2].trim();
                    return { id: uid('lbl'), type: 'label', text: text.substring(0,30), x: isNaN(x)?0:x, y: isNaN(y)?0:y, width: 100, height: 12, color: resolveColor(m[5]), opacity: 100, rotation: 0, scale: 100, font: 'Minecraft' };
                }
            },
            // 2. blit (Cualquier variante)
            {
                label: 'blit',
                re: new RegExp(`${G}\\s*\\.\\s*blit\\s*\\(\\s*([^,]+)\\s*,\\s*${ARG}\\s*,\\s*${ARG}\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)`, 'i'),
                map: (m) => {
                    const x = resolveRaw(m[2]), y = resolveRaw(m[3]);
                    return { id: uid('img'), type: 'image', x: isNaN(x)?0:x, y: isNaN(y)?0:y, u: parseInt(m[4]), v: parseInt(m[5]), width: parseInt(m[6]), height: parseInt(m[7]), uw: 256, uh: 256, texture: 'modid:textures/gui/overlay.png', color: '#ffffff', opacity: 100, rotation: 0, scale: 100, font: 'Minecraft' };
                }
            },
            // 3. fill (rectángulos)
            {
                label: 'fill',
                re: new RegExp(`${G}\\s*\\.\\s*fill\\s*\\(\\s*${ARG}\\s*,\\s*${ARG}\\s*,\\s*${ARG}\\s*,\\s*${ARG}\\s*,\\s*${ARG}`, 'i'),
                map: (m) => {
                    const x1 = resolveRaw(m[1]), y1 = resolveRaw(m[2]), x2 = resolveRaw(m[3]), y2 = resolveRaw(m[4]);
                    if (isNaN(x1) || isNaN(x2)) return null;
                    return { id: uid('slot'), type: 'slot', x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2-x1), height: Math.abs(y2-y1), color: resolveColor(m[5]), opacity: 80, rotation: 0, scale: 100, font: 'Minecraft', text: '' };
                }
            }
        ];

        // SCAN
        lines.forEach(line => {
            const t = line.trim();
            if (!t || t.startsWith('//') || t.startsWith('*')) return;
            patterns.forEach(p => {
                const m = t.match(p.re);
                if (m) {
                    try {
                        const w = p.map(m);
                        if (w && !isNaN(w.x)) widgets.push(w);
                    } catch(e){}
                }
            });
        });

        return widgets;
    }
};

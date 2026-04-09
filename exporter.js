// VisualMenu Studio - Universal Exporter Engine v5 (Universal Textures & UV)
window.UniversalExporter = {
    generate(widgets, platform, loader, format) {
        if (format === 'json') return { code: JSON.stringify(widgets, null, 4), meta: "Standard JSON Configuration" };
        if (format === 'css') return { code: this.generateCSS(widgets), meta: "Global CSS Layout" };

        const template = this.getTemplate(platform, loader);
        const code = template ? template(widgets) : "// Template not found for this configuration";
        
        return {
            code: this.highlight(code, platform),
            meta: `${platform.toUpperCase()} (${loader})`
        };
    },

    getTemplate(platform, loader) {
        const key = `${platform}_${loader}`;
        const registry = {
            minecraft_neoforge: (ws) => {
                const textures = ws.filter(w => w.texture && !w.texture.startsWith('http'));
                let header = `import net.minecraft.resources.ResourceLocation;\n`;
                let constants = textures.map(w => `    private static final ResourceLocation ${w.id.toUpperCase()}_TEX = ResourceLocation.fromNamespaceAndPath("modid", "${w.texture.split(':').pop()}");`).join('\n');
                
                return `${header}
public class MyScreen extends Screen {
${constants}

    @Override
    public void render(GuiGraphics g, int mx, int my, float pt) {
        super.render(g, mx, my, pt);
        ${ws.map(w => {
            const x = `this.width / 2 + (${w.x} - 960)`;
            const y = `this.height / 2 + (${w.y} - 540)`;
            if (w.texture && !w.texture.startsWith('http')) {
                // blit(texture, x, y, u, v, width, height, textureWidth, textureHeight)
                return `g.blit(${w.id.toUpperCase()}_TEX, ${x}, ${y}, ${w.u}, ${w.v}, ${w.width}, ${w.height}, ${w.uw}, ${w.uh});`;
            }
            if (w.type === 'label') return `g.drawString(this.font, "${w.text}", ${x}, ${y}, 0xFFFFFF);`;
            return "";
        }).filter(c => c).join('\n        ')}
    }
}`;
            },
            python_pygame: (ws) => `import pygame
pygame.init()
screen = pygame.display.set_mode((1920, 1080))

# Pre-loading textures
${ws.filter(w => w.texture).map(w => `${w.id}_img = pygame.image.load("${w.texture || 'assets/missing.png'}")`).join('\n')}

while True:
    screen.fill((20, 20, 20))
    ${ws.map(w => {
        const x = w.x, y = w.y;
        if (w.texture) {
            // Pick UV region and scale
            return `screen.blit(${w.id}_img, (${x}, ${y}), (${w.u}, ${w.v}, ${w.width}, ${w.height}))`;
        }
        return ``;
    }).join('\n    ')}
    pygame.display.flip()`,

            c_cpp_raylib: (ws) => `#include "raylib.h"

int main() {
    InitWindow(1920, 1080, "HUD Universal Textures");
    ${ws.filter(w => w.texture).map(w => `Texture2D ${w.id}_tex = LoadTexture("${w.texture || 'assets/btn.png'}");`).join('\n    ')}

    while (!WindowShouldClose()) {
        BeginDrawing();
        ClearBackground(BLACK);
        ${ws.map(w => {
            if (w.texture) {
                // DrawTexturePro uses a source rectangle for UV mapping
                return `DrawTexturePro(${w.id}_tex, (Rectangle){${w.u}, ${w.v}, ${w.width}, ${w.height}}, (Rectangle){${w.x}, ${w.y}, ${w.width}, ${w.height}}, (Vector2){0,0}, ${w.rotation}, WHITE);`;
            }
            return "";
        }).join('\n        ')}
        EndDrawing();
    }
    CloseWindow(); return 0;
}`
        };
        return registry[key] || registry['minecraft_neoforge'];
    },

    generateCSS(ws) {
        return ws.map(w => {
            let css = `#${w.id} { position: absolute; left: ${w.x}px; top: ${w.y}px; width: ${w.width}px; height: ${w.height}px; `;
            if (w.texture) {
                css += `background-image: url('${w.texture}'); background-position: -${w.u}px -${w.v}px; `;
            }
            return css + `}`;
        }).join('\n');
    },

    highlight(code, platform) {
        const keywords = {
            minecraft: ['public', 'class', 'extends', 'protected', 'void', 'super', 'this', 'new', 'import', 'return', '@Override', 'static', 'final', 'private'],
            python: ['import', 'def', 'class', 'for', 'if', 'while', 'as', 'True', 'False'],
            c_cpp: ['int', 'void', 'include', 'while', 'return', 'main', 'if']
        };
        let h = code.replace(/(\".*?\")/g, '<span style="color: #6a8759;">$1</span>');
        (keywords[platform] || []).forEach(kw => h = h.replace(new RegExp(`\\b${kw}\\b`, 'g'), `<span style="color: #cc7832;">${kw}</span>`));
        return h.replace(/(\/\/.*)/g, '<span style="color: #808080;">$1</span>').replace(/(#.*)/g, '<span style="color: #bd93f9;">$1</span>');
    }
};

// Clipboard & Import
document.getElementById('copyCode').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('codeOutput').innerText).then(() => {
        const btn = document.getElementById('copyCode');
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => btn.innerHTML = '<i class="far fa-copy"></i>', 2000);
    });
});

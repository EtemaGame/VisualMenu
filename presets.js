// VisualMenu Studio - Platform & Loader Presets v3 (Vision 2026)

window.PLATFORMS = {
    minecraft: {
        name: "Minecraft (Java Modding)",
        theme: "theme-minecraft",
        loaders: [
            { id: "neoforge", name: "NeoForge (1.21+)", default: true },
            { id: "forge", name: "Forge (1.20.1+)" },
            { id: "fabric", name: "Fabric (1.20.1+)" }
        ],
        widgets: ["button", "label", "slot", "xp_bar", "image"]
    },
    godot: {
        name: "Godot Engine",
        theme: "theme-modern",
        loaders: [
            { id: "gdscript", name: "GDScript (Standard)", default: true }
        ],
        widgets: ["button", "label", "healthbar", "image"]
    },
    unity: {
        name: "Unity Engine",
        theme: "theme-scifi",
        loaders: [
            { id: "csharp", name: "C# (UI Toolkit)", default: true }
        ],
        widgets: ["button", "label", "image", "healthbar"]
    },
    python: {
        name: "Python Applications",
        theme: "theme-modern",
        loaders: [
            { id: "tkinter", name: "Tkinter (Standard App)", default: true },
            { id: "pygame", name: "Pygame (HUD/Game)" }
        ],
        widgets: ["button", "label", "healthbar", "ammo", "score", "notification", "image"]
    },
    c_cpp: {
        name: "C / C++ Development",
        theme: "theme-scifi",
        loaders: [
            { id: "raylib", name: "Raylib (HUD Engine)", default: true }
        ],
        widgets: ["button", "healthbar", "minimap", "radar", "target", "image"]
    }
};

window.RESOLUTIONS = [
    { name: "Full HD (1920x1080)", w: 1920, h: 1080 },
    { name: "Minecraft Scaled (854x480)", w: 854, h: 480 },
    { name: "Mobile Portrait (390x844)", w: 390, h: 844 },
    { name: "Small Window (640x480)", w: 640, h: 480 }
];

console.log("Presets Engine v3 (Vision 2026) Loaded");

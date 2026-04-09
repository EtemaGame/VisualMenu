# VisualMenu Studio Ultimate 🚀

**VisualMenu Studio** es un motor de diseño de interfaces (UI) y HUDs multiplataforma diseñado para creadores de mods, desarrolladores de juegos y apasionados de las interfaces gráficas. Permite diseñar visualmente y exportar código listo para producción en múltiples lenguajes y frameworks.

![VisualMenu Mockup](https://raw.githubusercontent.com/EtemaGame/VisualMenu/main/assets/preview.png) *(Nota: Imagen placeholder)*

## ✨ Características Principales

- 🎮 **Multi-Plataforma & Multi-Loader**:
  - **Minecraft**: Soporte para NeoForge (1.21+), Forge (1.20.1+) y Fabric.
  - **Python**: Generación de código para Pygame y Tkinter.
  - **C / C++**: Soporte nativo para Raylib.
- 🎨 **Mapeo UV Profesional**: Usa tus propios Sprite Sheets PNG y recorta secciones exactas con coordenadas U, V, UW y UH.
- 📐 **Layout Dinámico**: Paneles laterales y de código redimensionables y colapsables para maximizar el espacio de trabajo.
- 🔄 **Sistema de Historial**: Deshacer y Rehacer (Undo/Redo) con atajos de teclado (`Ctrl+Z`, `Ctrl+Y`).
- 🔍 **Zoom de Precisión**: Escala el lienzo de 20% a 200% con recalibración automática de coordenadas.
- 🎯 **Snapping & Grid**: Alineación magnética a cuadrícula para una precisión píxel-perfecta.
- 📤 **Exportación Universal**: Genera código fuente, configuraciones JSON y estilos CSS.

## 🛠️ Instalación y Uso

1. **Clona el repositorio**:
   ```bash
   git clone https://github.com/EtemaGame/VisualMenu.git
   ```
2. **Abre el estudio**:
   Simplemente abre el archivo `index.html` en cualquier navegador moderno. No requiere servidor local ni dependencias externas.

## 📁 Estructura del Proyecto

- `index.html`: Estructura principal y layout de la aplicación.
- `app.js`: Lógica del motor, gestión de estado y rendering.
- `exporter.js`: Registro de plantillas de código y lógica de exportación.
- `styles.css`: Sistema de diseño basado en Glassmorphism y temas oscuros.
- `presets.js`: Metadatos de plataformas, loaders y resoluciones.

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Si tienes ideas para nuevos exportadores (Unity, Godot, Unreal) o mejoras en la UI, no dudes en abrir un Pull Request.

---
Desarrollado con ❤️ para la comunidad de modding.
**EtemaGame**

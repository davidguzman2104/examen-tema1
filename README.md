# 🐍 Snake 2D — Neon Tech (Canvas)

## Instituto Tecnológico de Pachuca

**Materia:** DESARROLLO DE SOLUCIONES EN AMBIENTES VIRTUALES  
**Trabajo:** 1.6 Examen Tema 1. Introducción a las interfaces 3D y experiencia de usuario  
**Estudiante:** David Fidel Guzmán Sánchez — 21200255  
**Profesor:** M.C. Víctor Manuel Pinedo Fernández  
**Fecha:** 23/02/26  

---

Un videojuego web estilo **arcade** del clásico **Snake**, desarrollado con **HTML5 Canvas + Vanilla JavaScript** y estética **Neon Tech**.  
Incluye **niveles**, **obstáculos**, **pausa**, **reinicio**, **música**, **sonidos** y **High Score** guardado en `localStorage`.

---

## ✨ Características destacadas

- 🎮 Gameplay arcade: control fluido con teclado, crecimiento por comida y colisiones.
- 📈 Progresión por niveles: cada **30 puntos** subes de nivel automáticamente.
- ⚡ Velocidad progresiva: la serpiente aumenta su velocidad conforme avanzas.
- 🧱 Obstáculos dinámicos: se generan más obstáculos a mayor nivel (hasta un límite).
- 🍎 Comida con temporizador (Food TTL): si no consumes la comida a tiempo, cambia de posición.
- ⏸ Pausa / Reanudar: con tecla **P** y botón.
- 🔄 Reinicio rápido: con tecla **R** y botón.
- 🏆 High Score persistente: se guarda por navegador y dominio usando `localStorage`.
- 🎵 Audio: música de fondo al jugar y SFX al perder (Game Over).
- 🖼️ Render neón por Canvas: fondo grid tech, glow y trazos estilo neon.

---

## 🎮 Controles

| Tecla | Acción |
|------:|:------|
| ⬅ ⬆ ➡ ⬇ | Mover la serpiente |
| W A S D | Mover la serpiente |
| P | Pausar / Reanudar |
| R | Reiniciar partida |

---

## 🛠️ Tecnologías y conceptos aplicados

- JavaScript (ES Modules) — manejo de estado, lógica del juego y eventos.
- HTML5 Canvas 2D — renderizado del tablero, serpiente, comida y obstáculos.
- requestAnimationFrame — game loop con delta time.
- Responsive + HiDPI — ajuste del canvas con `devicePixelRatio`.
- localStorage — High Score con la clave `snake2d_highscore`.
// Neon Harbor — keyboard + mouse input with per-frame edge detection.
// WASD/arrows move, E interacts, F punches, Space handbrake, Esc/P pauses, M mutes.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set(); // keys pressed since the last endFrame()
  const mouse = { x: 0, y: 0, down: false, clicked: false, worldX: 0, worldY: 0 };

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    pressed.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  }
  function onMouseDown(e) {
    onMouseMove(e);
    mouse.down = true;
    mouse.clicked = true;
  }
  function onMouseUp() {
    mouse.down = false;
  }
  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    keys,
    mouse,
    down(code) {
      return keys.has(code);
    },
    // True once per physical press; consumed at the end of each frame.
    wasPressed(code) {
      return pressed.has(code);
    },
    anyMove() {
      return keys.has('KeyW') || keys.has('ArrowUp') || keys.has('KeyA') || keys.has('ArrowLeft')
        || keys.has('KeyS') || keys.has('ArrowDown') || keys.has('KeyD') || keys.has('ArrowRight');
    },
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.sqrt(2);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}

export function initializeFallSim() {
  const ENABLE_FALL_SIM = true;
  if (!ENABLE_FALL_SIM) return;

  const person = document.querySelector('.js-walking-person');
  const circle = document.querySelector('.js-circle');
  const floorEl = document.querySelector('.js-floor');
  if (!person || !circle || !floorEl) return;

  let fallState = 'idle'; // idle | falling | settled
  let lastTriggerTurn = -1;
  const angleOffset = -90; // align 0deg to top if needed
  const triggerAngle = 280; // 欠けが真下に来る角度をさらに5度遅らせる
  const triggerBuffer = 6; // tolerance
  const rotationDurationMs = 18000; // spin-circle 18s
  const triggerDelayMs = (triggerAngle / 360) * rotationDurationMs;
  const gravity = 2000; // px/s^2
  const restitution = 0.4;
  const stopVelocity = 6;
  const getPersonRect = () => person.getBoundingClientRect();

  const state = {
    y: 0,
    v: 0,
  };

  function getFloorY() {
    const rect = circle.getBoundingClientRect();
    // 円の最下端よりさらに55px上げた位置から、さらに15px上げて合計70px→85px上げた位置を床とする
    return rect.top + rect.height - 85;
  }

  function shouldTrigger(now) {
    const elapsed = (now - startTime) % rotationDurationMs;
    return elapsed >= triggerDelayMs - 120 && elapsed <= triggerDelayMs + 120;
  }

  function getAngleProgress(now) {
    const elapsed = (now - startTime) % rotationDurationMs;
    const angle = (elapsed / rotationDurationMs) * 360;
    return ((angle + angleOffset) % 360 + 360) % 360;
  }

  function resetPerson() {
    fallState = 'idle';
    state.y = 0;
    state.v = 0;
    person.style.transform = `translate(-50%, 0)`;
  }

  function setPersonY(y) {
    person.style.transform = `translate(-50%, ${y}px)`;
  }

  const startTime = performance.now();
  let lastTime = startTime;
  function tick(now) {
    const dt = Math.min(32, now - lastTime) / 1000;
    lastTime = now;

    if (fallState === 'idle') {
      const turn = Math.floor((now - startTime) / rotationDurationMs);
      if (shouldTrigger(now) && turn !== lastTriggerTurn) {
        fallState = 'falling';
        lastTriggerTurn = turn;
        state.y = 0;
        state.v = 0;
      }
    } else if (fallState === 'falling') {
      const personRect = getPersonRect();
      state.v += gravity * dt;
      state.y += state.v * dt;
      const floor = getFloorY();
      const personBottom = personRect.bottom + state.y;
      if (personBottom >= floor) {
        // 補正して床位置に固定
        state.y = floor - personRect.bottom;
        state.v = -state.v * restitution;
        if (Math.abs(state.v) < stopVelocity) {
          fallState = 'settled';
          state.v = 0;
          state.y = floor - personRect.bottom;
        }
      }
      setPersonY(state.y);
    }

    requestAnimationFrame(tick);
  }

  resetPerson();
  requestAnimationFrame((t) => {
    lastTime = t;
    tick(t);
  });
}

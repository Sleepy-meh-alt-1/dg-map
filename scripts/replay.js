const floorReplay =
  window.opener?.floorReplay ?? [];

const slider =
  document.getElementById("replaySlider");

const label =
  document.getElementById("replayLabel");

const debug =
  document.getElementById("debug");

const canvas =
  document.getElementById("replayCanvas");

const ctx =
  canvas.getContext("2d");

const autoPlay =
  document.getElementById("autoPlay");

let autoPlayInterval = null;

slider.min = 0;
slider.max = Math.max(0, floorReplay.length - 1);
slider.value = Math.max(0, floorReplay.length - 1);

function loadReplayStep(index) {

  const snapshot = floorReplay[index];

  if (!snapshot) {
    return;
  }

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  for (const row of snapshot.grid) {

    for (const room of row) {

      if (!room?.capture) {
        continue;
      }

      const roomImg = new ImageData(
        room.width,
        room.height
      );

      A1lib.decodeImageString(
        room.capture,
        roomImg,
        0,
        0,
        room.width,
        room.height
      );

        ctx.putImageData(
            roomImg,
            room.col * room.width,
            room.row * room.height
        );
    }
  }

  label.textContent =
    `${index + 1} / ${floorReplay.length}`;

  debug.textContent =
    snapshot.reason || "";
}

slider.addEventListener("input", () => {

  loadReplayStep(
    Number(slider.value)
  );

});

autoPlay.addEventListener("change", () => {

  if (autoPlay.checked) {

    autoPlayInterval = setInterval(() => {

      let index =
        Number(slider.value);

      index =
        (index + 1) % floorReplay.length;

      slider.value = index;

      loadReplayStep(index);

    }, 1000);

  } else {

    clearInterval(
      autoPlayInterval
    );

  }
});

console.log({
  length: floorReplay.length,
  min: slider.min,
  max: slider.max,
  value: slider.value
});

if (floorReplay.length > 0) {
  loadReplayStep(
    floorReplay.length - 1
  );
}
"use strict";

A1lib.identifyApp("appconfig.json");

const reader = new Chatbox.default();
const appColor = A1lib.mixColor(255, 199, 0);
const timestampRegex = /\[\d{2}:\d{2}:\d{2}\]/g;


// These will be used as default, and any saved settings will override them on load
const SETTINGS = {

  showCameraAngle: true,
  showMinimapHUD: true,
  hudRoomScale: 2,
  hudRoomSteps: 3,
  hudPosition: {},

  colorKeyYes: 0xff33aa33,
  colorKeyNo: 0xffff0000,
  colorCritTrue: 0xffffd700,
  colorCritFalse: 0xff00bfff,

  showKeyOverlay: true,
  showCritOverlay: true,
  showUnreachableOverlay: true,
  showScanOverlay: true,
  highlightMyLocation: true,
  highlightCorridors: true,
  highlightGatestone: true,

  alt1TogglePartyOverlay: false,
  alt1ToggleHUD: true,
  shareFloorData: false,

  goalMinutes: 0,
  goalSeconds: 0,

  floorSize: "large",

  debug: false,


  showStatsOverlay: true,
  statsOverlayPosition: {},

  statsOverlay_visited: false,
  statsOverlay_unknown: false,
  statsOverlay_locked: false,
  statsOverlay_unreachable: false,
  statsOverlay_deadEnds: false,
  statsOverlay_branches: false,
  statsOverlay_completion: false,
  statsOverlay_time: false,
  statsOverlay_projected: false,
  statsOverlay_rpm: false,
};

const DEBUG = {
  settings: SETTINGS,
  scanDungeonMapFullCount: 0,
  scanDungeonMapFullAt: null,
  scanDungeonMapFullTime: 0,
  scanDungeonMapPartialCount: 0,
  scanDungeonMapPartialAt: null,
  scanDungeonMapPartialTime: 0,
  lastStartBy: null,
}
window.DEBUG = DEBUG;

let chatInterval = null;

const timeouts = {
  scanInterface: null,
  scanDungeonMap: null,
  scanPlayerRoom: null,
  buildGrid: null,
  highlightCorridors: null,
  highlightGatestone: null,
  clearTooltip: null,
  scanCompass: null,
  setHUDPosition: null,
  setStatsPosition: null,
}


let indexedRooms;
let knownRooms;
let teamMembersSinceUs = [];
let playerIndex = 0;
let partySize = null;
let gatestone1Location = null;
let dungeonStartTime = null;
let inFloor = false;
let myKeys;
let playerPath = [];
let GRID_WIDTH = 8, GRID_HEIGHT = 8, grid, mapWidth = 280, mapHeight = 280;
let mapX = 0, mapY = 0;
let minimapX = null, minimapY = null, minimapWidth = null, minimapHeight = null;
let cameraAngle = null;

let failedGoal = false;

let partyListRowBounds = [];
let partyListCaptures = [];

const OVERLAYS = {
  default: 'default',
  members: 'members',
  rooms: 'rooms',
  player: 'player',
  corridors: 'corridors',
  gatestone: 'gatestone',
  cameraAngle: 'cameraAngle',
  minimapHUD: 'minimapHUD',
  minimapHUDCorridors: 'minimapHUDCorridors',
  minimapKey: 'minimapKey',
  stats: 'stats',
  hudPosition: 'hudPosition',
  debug: 'debug',
  debugMap: 'debugMap',
  debugCompass: 'debugCompass',
  debugMinimap: 'debugMinimap',
}
const OVERLAY_Z_INDEX = {
  minimapHUD: 10,
  minimapHUDCorridors: 5,
}

const renderedOverlays = new Set();

const mapRoomSize = 29;
const mapRoomGap = 3;

const RED = 0xffff0000
const GREEN = 0xff33aa33
const ORANGE = 0xffff8800

const TEAM_MEMBER_COLORS = [
  // [210, 53, 0], // [187,60,25], //
  // [2, 133, 129], // [0, 137, 133], //
  // [73, 109, 30],
  // [128, 130, 37],
  // [97, 113, 83],

  // Icon colors
  // [114, 39, 16],
  // [50, 124, 122],
  // [76, 116, 31],
  // [136, 139, 39],
  // [46, 53, 42],

  [186, 52, 6],
  [8, 123, 118],
  [68, 116, 7],
  [130, 134, 6],
  [100, 120, 87],
]

const CARDINAL_DIRECTIONS = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
const CARDINAL_ANGLES = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
}
const CARDINAL_OPPOSITES = {
  north: "south",
  east:  "west",
  south: "north",
  west:  "east",
}
const ADJACENCE_OFFSETS = {
  north: [-1, 0],
  east:  [0, 1],
  south: [1, 0],
  west:  [0, -1],
}

function hexToDecimalARGB(hex) {
  hex = hex.replace("#", "");
  return parseInt(hex, 16) | 0xff000000;
}
function decimalToHexRGB(color) {
  return '#' + (color & 0xffffff).toString(16).padStart(6, "0");
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case r:
        h = 60 * (((g - b) / delta) % 6);
        break;
      case g:
        h = 60 * ((b - r) / delta + 2);
        break;
      case b:
        h = 60 * ((r - g) / delta + 4);
        break;
    }
  }

  if (h < 0) {
    h += 360;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function clearAllOverlays() {
  for (let name of renderedOverlays) {
    clearOverlay(name);
  }
}

function clearOverlay(name) {
  renderedOverlays.delete(name);
  alt1.overLayClearGroup(name);
  alt1.overLayRefreshGroup(name);
}


const overlayStack = [OVERLAYS.default];
function overlay(name, draw, { reset = true, resume = true } = {}) {
  overlayStack.push(name);
  renderedOverlays.add(name);
  alt1.overLaySetGroup(name);
  alt1.overLayFreezeGroup(name);
  if (reset) alt1.overLayClearGroup(name);
  draw();
  // if (resume) alt1.overLayRefreshGroup(name);
  if (resume) alt1.overLayContinueGroup(name);
  overlayStack.pop();
  alt1.overLaySetGroup(overlayStack[overlayStack.length - 1]);
}

function setTooltip(text, duration = 5000) {
  clearTimeout(timeouts.clearTooltip);
  alt1.setTooltip(text);
  timeouts.clearTooltip = setTimeout(alt1.clearTooltip, duration);
}

let partyListOverlayVisibleUntil = 0;

function handleAlt1Pressed(event) {
  // console.log('alt1pressed', event)

  const { x, y } = event;

  // Easier reloads during development, alt1 outside of the rs window
  if (x > alt1.rsWidth && !location.host.includes("github.io"))
    return window.location.reload();

  if (hudPositionStartAt) {
    SETTINGS[hudPositionTarget] = { x, y };
    clearTimeout(timeouts.setHUDPosition);
    hudPositionStartAt = null;
    hudPositionTarget = null;
    alt1.clearTooltip();
    return;
  }

  if (!inFloor && findMapButton()) {
    DEBUG.lastStartBy = "alt1Pressed";
    startFloor();
    return;
  }

  // if (x >= mapX && x <= mapX + mapWidth && y >= mapY && y <= mapY + mapHeight) {
  //   console.log('Map clicked at', x, y);
  //   for (let i = 0; i < PLAYER_ICONS.length; i++) {
  //     const icon = PLAYER_ICONS[i];
  //     const bind = alt1.bindRegion(x - 10, y - 10, 20, 20);
  //     const matches = JSON.parse(alt1.bindFindSubImg(bind, icon.icon, icon.width, 0, 0, 20, 20));
  //     if (matches.length > 0) {
  //       console.log('Selected player index', i);
  //       playerIndex = i;
  //     }
  //     break;
  //   }
  // }
  // else
  if (partyListOverlayVisibleUntil > Date.now() || findDgIcon()) {
    for (let i = 0; i < partyListRowBounds.length; i++) {
      const bounds = partyListRowBounds[i];
      if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
        playerIndex = i;
        console.log('Player index set to', i);

        overlay(OVERLAYS.members, () => {
          alt1.overLayImage(bounds.x, bounds.y, partyListCaptures[i], bounds.width, 1000)
          alt1.overLayRect(
            A1lib.mixColor(...TEAM_MEMBER_COLORS[i]),
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            1000,
            playerIndex === i ? 3 : 1
          );
        });
        partyListOverlayVisibleUntil = Date.now() + 1000;
        return;
      }
    }
    clearOverlay(OVERLAYS.members);
    partyListOverlayVisibleUntil = Date.now();
  }
  else if (SETTINGS.alt1TogglePartyOverlay) {
    overlay(OVERLAYS.members, () => {
      for (let i = 0; i < partyListRowBounds.length; i++) {
        const bounds = partyListRowBounds[i];
        alt1.overLayImage(bounds.x, bounds.y, partyListCaptures[i], bounds.width, 5000)
        alt1.overLayRect(
          A1lib.mixColor(...TEAM_MEMBER_COLORS[i]),
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height,
          5000,
          playerIndex === i ? 3 : 1
        );
      }
    });
    partyListOverlayVisibleUntil = Date.now() + 5000;
  }

  if (SETTINGS.alt1ToggleHUD) {
    SETTINGS.showMinimapHUD = !SETTINGS.showMinimapHUD;
    SETTING_CHANGED_HANDLERS.showMinimapHUD(SETTINGS.showMinimapHUD);
  }
}

function clearTimeouts() {
  for (let key in timeouts) {
    clearTimeout(timeouts[key]);
    timeouts[key] = null;
  }
}

function showSelectedChat(chat) {
  try {
    alt1.overLayRect(
      appColor,
      chat.mainbox.rect.x,
      chat.mainbox.rect.y,
      chat.mainbox.rect.width,
      chat.mainbox.rect.height,
      2000,
      5
    );
  } catch { }
}

function readChatbox() {
  const opts = reader.read() || [];
  let chatStr = "";
  let chatArr;

  if (opts.length) {
    for (let line in opts) {
      if (!opts[line].text.match(timestampRegex) && line == "0") continue;
      if (opts[line].text.match(timestampRegex)) {
        if (line > 0) chatStr += "\n";
        chatStr += opts[line].text + " ";
        continue;
      }
      chatStr += opts[line].text;
    }
  }

  if (chatStr.trim()) chatArr = chatStr.trim().split("\n");

  if (chatArr) {
    for (let line of chatArr) {
      const chatLine = line.trim();
      if (chatLine && !isInHistory(chatLine)) {
        checkLine(chatLine);
      }
    }
    updateChatHistory(chatArr);
  }
}

function isInHistory(chatLine) {
  if (!sessionStorage.chatHistory) return false;
  return sessionStorage.chatHistory.split("\n").includes(chatLine);
}

function updateChatHistory(chatArr) {
  if (!sessionStorage.chatHistory) {
    sessionStorage.chatHistory = chatArr.join("\n");
    return;
  }
  let history = sessionStorage.chatHistory.split("\n");
  while (history.length > 100) history.shift();
  chatArr.forEach(line => history.push(line.trim()));
  sessionStorage.chatHistory = history.join("\n");
}

const lastLines = [];
async function checkLine(line) {

  // console.log(line)
  lastLines.unshift(line);

  console.log(SETTINGS.shareFloorData)
  if (lastLines.length > 11) {
    lastLines.pop();
  }

  const critMatch = line.match(/level (\d+) (\w+)/i);
  if (critMatch) {
    const level = Number(critMatch[1]);
    const skillName = critMatch[2].toLowerCase();
    const skill = SKILL_ICONS.find(s => s.name.toLowerCase() === skillName);

    const skillRoom = findNearestRoom(room => {
      if (room.state !== "locked") return false;
      if (room.crit !== null) return false;

      return room.skill === skill.name;
    }, { traversal: "doors" });

    if (skillRoom) {
      const crit = level >= skill.max_level - 10 && level <= skill.max_level;
      skillRoom.crit = crit;
      skillRoom.color = crit ? SETTINGS.colorCritTrue : SETTINGS.colorCritFalse;
      skillRoom.skill = skill.name;
    }

    return;
  }


  // [18:58:56] Your perfect juju dungeoneering potion and Daemonheim skill door unlock boost your attempt +6 to open this level 105 Prayer door without the level requirements.
  // TODO
  const tierMatch = line.match(/\(Tier (\d+)\)/i);
  if (tierMatch) {
    const tier = Number(tierMatch[1]);

    const playerRoom = scanPlayerRoom()
    if (playerRoom) {
      const crit = tier >= 9;
      playerRoom.crit = crit;
      playerRoom.color = crit ? SETTINGS.colorCritTrue : SETTINGS.colorCritFalse;
    }

    return;
  }

  const gatestoneMatch = line.match(/You (create|place) (?:a|the) gatestone( 2)?\./i);
  if (gatestoneMatch) {
    const action = gatestoneMatch[1].toLowerCase();
    const gs1 = !gatestoneMatch[2];

    if (gs1) {
      if (action === "create") {
        gatestone1Location = null;
        clearOverlay(OVERLAYS.gatestone);
      }
      else if (action === "place") {
        gatestone1Location = scanPlayerRoom();
        highlightGatestone();
      }
    }
    return;
  }
  if (line.includes("The gatestone breaks as you draw upon the magic that binds it")) {
    if (!gatestone1Location) return;

    const playerRoom = scanPlayerRoom();
    if (playerRoom.id === gatestone1Location.id) {
      console.log('Gatestone 1 broken in room', playerRoom.id);
      gatestone1Location = null;
      clearOverlay(OVERLAYS.gatestone);
    }
    return;
  }

  const riddleMatch = RIDDLES.find(r => line.toLowerCase().includes(r.search));
  if (riddleMatch) {
    console.log(`Riddle found: ${riddleMatch.item}`);
    setTooltip(riddleMatch.item);
    return;
  }

  const sarcophagusMatch = line.match(/posthumously honoured with the discovery of (\w+)/i);
  if (sarcophagusMatch) {
    const herb = sarcophagusMatch[1];
    const title = SARCOPHAGUS[herb];
    console.log('Sarcophagus: ', herb);
    setTooltip(title);
    return;
  }

  const dungeonSizeMatch = line.match(/Dungeon Size:.*(Small|Medium|Large)/);
  if (dungeonSizeMatch) {
    const size = dungeonSizeMatch[1].toLowerCase();
    setMapSize(size);
    return;
  }

  const partySizeMatch = line.match(/Party Size:.*(\d):\d/);
  if (partySizeMatch) {
    if (teamMembersSinceUs.length > 0) {
      partySize = parseInt(partySizeMatch[1], 10);
      playerIndex = partySize - teamMembersSinceUs.length;
      console.log(`We're player ${playerIndex + 1} of ${partySize}`);
      for (let i = 0; i < partySize; i++) {
        const color = TEAM_MEMBER_COLORS[i];
        const displayName = i < playerIndex ?
          `Unknown${i + 1}` :
          teamMembersSinceUs[i - playerIndex] || 'Unknown';
        console.log(`%c ${displayName} `, `color: white; background-color: rgb(${color[0]}, ${color[1]}, ${color[2]}); padding: 2px 10px; border-radius: 5px;`);
      }

      teamMembersSinceUs = [];
    }

    DEBUG.lastStartBy = "partySizeLine";
    startFloor();

    return;
  }

  if (line.includes("You leave the party.")) {
    stopFloor();
    return;
  }

  if (!inFloor) {
    const partyStarterMatch = line.match(/You have been set as the party leader/);
    if (partyStarterMatch) {
      console.log("You are the party leader");
      teamMembersSinceUs = ['Us'];
      scanInterface();
      return;
    }

    const teamMemberJoinedMatch = line.match(/(\[\d{2}:\d{2}:\d{2}\] )?(.*?) has joined the party/);
    if (teamMemberJoinedMatch) {
      const playerName = teamMemberJoinedMatch[2].trim();
      console.log(`'${playerName}' joined the party`);
      teamMembersSinceUs.push(
        teamMembersSinceUs.length ?
          playerName :
          `Us (${playerName})`
      );
      scanInterface();
      return;
    }
  }
}

function startFloor() {
  console.log('Starting floor');
  clearAllOverlays();
  clearTimeouts();
  inFloor = true
  dungeonStartTime = Date.now();
  playerIndex = playerIndex || 0;
  partySize = partySize || 1;
  gatestone1Location = null;
  myKeys = new Set();
  playerPath = [];
  failedGoal = false;
  buildGrid();
  if (SETTINGS.highlightMyLocation) scanPlayerRoom();
  if (SETTINGS.highlightGatestone) highlightGatestone();
  if (SETTINGS.highlightCorridors) highlightCorridors();
  scanInterface();
  scanCompass();
  alt1.clearTooltip();
}

function stopFloor() {

  if (SETTINGS.shareFloorData){
const WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbz-2reAQfoCRHXPfuU9d6Viz3ryx6RT_FsAxKqPN6hBy26L20GE40H1JjNY-PeNJuRA/exec";


  // send data of grid and stats to a spreadsheet

  const serializableGrid = grid.map(row =>
  row.map(room => ({
    id: room.id,
    row: room.row,
    col: room.col,

    state: room.state,
    lockType: room.lockType,
    key: room.key,
    skill: room.skill,
    crit: room.crit,

    north: room.north?.id ?? null,
    east: room.east?.id ?? null,
    south: room.south?.id ?? null,
    west: room.west?.id ?? null
  }))
);
  const floorData = {
    timestamp: new Date().toISOString(),
    stats,
    serializableGrid
  };

  fetch(WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain"
    },
    body: JSON.stringify(floorData)
  });


  }
  
  clearAllOverlays();
  clearTimeouts();
  scanInterface();
  inFloor = false
  myKeys = new Set();
  playerPath = [];
  grid = []
  indexedRooms = {};
  knownRooms = new Set();
  playerIndex = 0;
  partySize = null;
  gatestone1Location = null;
  failedGoal = false;
  teamMembersSinceUs = [];
  partyListCaptures = [];
  alt1.clearTooltip();
}

function findMinimap() {
  const mapButton = findMapButton();
  if (!mapButton)
    return;

  const compass = findCompass(mapButton.x, mapButton.y);
  if (!compass)
    return;

  minimapX = compass.x - 18;
  minimapY = compass.y - 39;
  minimapWidth = mapButton.x + DG_MAP_ICON.width - minimapX + 20;
  minimapHeight = mapButton.y + DG_MAP_ICON.height - minimapY + 8;
  console.log('Minimap found at', minimapX, minimapY);

  overlay(OVERLAYS.default, () => {
    alt1.overLayRect(appColor, minimapX, minimapY, minimapWidth, minimapHeight, 1000, 2);
  }, { reset: false });
  return true;
}

function findCompass(limitX, limitY) {
  const rsBind = alt1.bindRegion(0, 0, limitX || alt1.rsWidth, limitY || alt1.rsHeight);
  const matches = JSON.parse(alt1.bindFindSubImg(rsBind, COMPASS.icon, COMPASS.width, 0, 0, limitX || alt1.rsWidth, limitY || alt1.rsHeight));
  return matches[0];
}

function findMapButton() {
  const rsBind = alt1.bindRegion(0, 0, alt1.rsWidth, alt1.rsHeight);
  const matches = JSON.parse(alt1.bindFindSubImg(rsBind, DG_MAP_ICON.icon, DG_MAP_ICON.width, 0, 0, alt1.rsWidth, alt1.rsHeight));
  return matches[0];
}

function scanMapButton() {
  const location = findMapButton();
  if (location) {
    console.log('Loaded while in a floor, starting floor');
    // overlay(OVERLAYS.default, () => {
    //   alt1.overLayRect(appColor, location.x - 3, location.y - 14, 22, 21, 2000, 2);
    // });

    DEBUG.lastStartBy = "scanMapButton";
    startFloor();
  }
}

function applyBorder(imageData, color, thickness = 1) {
  const { width, height, data } = imageData;
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isBorder =
        x < thickness ||
        x >= width - thickness ||
        y < thickness ||
        y >= height - thickness;

      if (isBorder) {
        const i = (y * width + x) * 4;

        data[i + 0] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
  }

  return imageData;
}


function processImage(imageData, { rotate: angle = 0, scale = 1, borderColor = null, borderThickness = 1, } = {}) {
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;

  const srcCtx = srcCanvas.getContext("2d");
  srcCtx.putImageData(imageData, 0, 0);

  if (borderColor !== null) {
    const a = ((borderColor >>> 24) & 0xff) / 255;
    const r = (borderColor >>> 16) & 0xff;
    const g = (borderColor >>> 8) & 0xff;
    const b = (borderColor & 0xff);

    srcCtx.strokeStyle = `rgba(${r},${g},${b},${a})`;
    srcCtx.lineWidth = borderThickness;

    srcCtx.strokeRect(
      srcCtx.lineWidth / 2,
      srcCtx.lineWidth / 2,
      srcCanvas.width - srcCtx.lineWidth,
      srcCanvas.height - srcCtx.lineWidth
    );
  }

  const rads = angle * Math.PI / 180;

  const scaledWidth = imageData.width * scale;
  const scaledHeight = imageData.height * scale;

  const cos = Math.abs(Math.cos(rads));
  const sin = Math.abs(Math.sin(rads));

  const rotatedWidth = Math.ceil(
    scaledWidth * cos + scaledHeight * sin
  );

  const rotatedHeight = Math.ceil(
    scaledWidth * sin + scaledHeight * cos
  );

  const canvas = document.createElement("canvas");
  canvas.width = rotatedWidth;
  canvas.height = rotatedHeight;

  const ctx = canvas.getContext("2d");

  ctx.translate(
    canvas.width / 2,
    canvas.height / 2
  );

  if (angle) {
    ctx.rotate(rads);
  }

  if (scale !== 1) {
    ctx.scale(scale, scale);
  }

  ctx.drawImage(
    srcCanvas,
    -imageData.width / 2,
    -imageData.height / 2
  );

  return ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );
}

function roomImageForHUD(room, angle) {
  const roomImg = new ImageData(mapRoomSize, mapRoomSize);
  A1lib.decodeImageString(room.capture, roomImg, 0, 0, roomImg.width, roomImg.height);
  let borderColor = 0xffc0c0c0;
  let borderThickness = 1;
  if (room.state === "locked" && room.lockType === "key") {
    borderColor = room.color;
    borderThickness = myKeys.has(room.key) ? 3 : 2;
  }
  else if (SETTINGS.showCritOverlay && room.crit != null) {
    borderColor = room.color;
    borderThickness = 2;
  }

  const img = processImage(roomImg, { scale: SETTINGS.hudRoomScale, rotate: -angle, borderColor, borderThickness });
  const imgStr = A1lib.encodeImageString(img, 0, 0, img.width, img.height);
  return {
    img: imgStr,
    width: img.width,
    height: img.height,
  }
}

function renderRoomsForHUD(room, steps, entryFrom, p1, p2, offsetH, offsetV, angle, prevCx, prevCy) {
  if (!room) return;

  const { cX, cY } = renderRoomForHUD(room, p1, p2, offsetH, offsetV, angle, entryFrom, prevCx, prevCy, steps);

  for (const dir in ADJACENCE_OFFSETS) {
    if (dir === entryFrom) continue;

    const adjRoom = room[dir];
    if (!adjRoom?.capture) continue;

    const [rowOffset, colOffset] = ADJACENCE_OFFSETS[dir];
    if (steps > 1)
      renderRoomsForHUD(adjRoom, steps - 1, CARDINAL_OPPOSITES[dir], p1, p2, offsetH + colOffset, offsetV + rowOffset, angle, cX, cY);
  }
}

function renderRoomForHUD(room, p1, p2, offsetH, offsetV, angle, entryFrom, prevCx, prevCy) {
  const { img, width, height } = roomImageForHUD(room, angle);

  const gap = 10 * SETTINGS.hudRoomScale;
  const angleRad = (-angle + 360) % 360 * Math.PI / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;

  const tx = (
    mx
    + offsetH * (mapRoomSize * SETTINGS.hudRoomScale + gap) * cos
    - offsetV * (mapRoomSize * SETTINGS.hudRoomScale + gap) * sin
  );
  const ty = (
    my
    + offsetH * (mapRoomSize * SETTINGS.hudRoomScale + gap) * sin
    + offsetV * (mapRoomSize * SETTINGS.hudRoomScale + gap) * cos
  );

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const length = Math.hypot(dx, dy);
  const offsetX = Math.round(-dy / length * -(gap + mapRoomSize * SETTINGS.hudRoomScale / 2));
  const offsetY = Math.round(dx / length * -(gap + mapRoomSize * SETTINGS.hudRoomScale / 2));

  const posX = Math.round(tx + offsetX - width / 2);
  const posY = Math.round(ty + offsetY - height / 2);

  alt1.overLayImage(
    posX,
    posY,
    img,
    width,
    600
  );

  if (entryFrom) {
    const [rowOffset, colOffset] = ADJACENCE_OFFSETS[entryFrom];

    overlay(OVERLAYS.minimapHUDCorridors, () => {
      let color = 0xffc0c0c0;
      if (room.state === "locked" && room.lockType === "key") {
        color = room.color;
      }
      else if (SETTINGS.showCritOverlay && room.crit != null) {
        color = room.color;
      }

      alt1.overLayLine(
        color,
        7,
        prevCx,
        prevCy,
        Math.round(posX + width / 2),
        Math.round(posY + height / 2),
        600
      );
    }, { reset: false, resume: false });
  }


  return {
    cX: Math.round(posX + width / 2),
    cY: Math.round(posY + height / 2),
  }
}

function scanCompass() {
  clearTimeout(timeouts.scanCompass);
  if (!(SETTINGS.showCameraAngle || SETTINGS.showMinimapHUD)) {
    clearOverlay(OVERLAYS.cameraAngle);
    clearOverlay(OVERLAYS.minimapHUD);
    clearOverlay(OVERLAYS.minimapHUDCorridors);
    return;
  }

  if (!minimapWidth && !findMinimap()) {
    timeouts.scanCompass = setTimeout(scanCompass, 1000);
    console.log('Minimap not found, retrying...');
    return;
  }

  const start = performance.now();

  const compassOffset = 6;
  const compassSize = 38;
  const compassRadius = compassSize / 2;

  const img = A1lib.capture(minimapX + compassOffset, minimapY + compassOffset, compassSize, compassSize);

  let brightestRed, brightestRedX, brightestRedY;
  for (let x = 0; x < compassSize; x++) {
    for (let y = 0; y < compassSize; y++) {

      // ignore pixels outside of compass circle
      const centerOffset = Math.sqrt((x - compassRadius)**2 + (y - compassRadius)**2);
      if (centerOffset > compassRadius) continue;

      const idx = (y * img.width + x) * 4;
      const r = img.data[idx];
      const g = img.data[idx + 1];
      const b = img.data[idx + 2];

      const { h, s, l } = rgbToHsl(r, g, b);
      if (h >= 0 && h <= 10 && s >= 50 && l >= 40) {
        if (!brightestRed || r > brightestRed) {
          brightestRed = r;
          brightestRedX = x;
          brightestRedY = y;
        }
      }
    }
  }

  cameraAngle = (Math.atan2(compassRadius - brightestRedX - 1, compassRadius - brightestRedY) * 180 / Math.PI + 360) % 360;
  const directionIndex = Math.round(cameraAngle / 45) % 8;
  const direction = CARDINAL_DIRECTIONS[directionIndex];

  if (SETTINGS.debug) {
    console.log('Minimap viewing angle:', Math.round(cameraAngle), 'degrees, facing', direction);
    overlay(OVERLAYS.debugCompass, () => {
      alt1.overLayRect(0xffff0000,
        minimapX + compassOffset,
        minimapY + compassOffset,
        compassSize,
        compassSize,
        200,
        2
      );
      alt1.overLayLine(0xffff00ff, 3,
        minimapX + compassOffset + compassSize/2 - 1,
        minimapY + compassOffset + compassSize/2,
        minimapX + compassOffset + brightestRedX - 1,
        minimapY + compassOffset + brightestRedY,
        200
      );
    });


    overlay(OVERLAYS.debugMinimap, () => {
      alt1.overLayRect(appColor, minimapX, minimapY, minimapWidth, minimapHeight, 1000, 2);
    });
  }

  const playerRoom = scanPlayerRoom();
  if (playerRoom) {
    if (SETTINGS.showCameraAngle) {
      const roomCenterX = playerRoom.x + Math.round(playerRoom.width / 2);
      const roomCenterY = playerRoom.y + Math.round(playerRoom.height / 2);

      const cameraWindowAngle = 60;
      const angle1 = (((cameraAngle - cameraWindowAngle/2) + 360) % 360) * Math.PI / 180;
      const angle2 = (((cameraAngle + cameraWindowAngle/2) + 360) % 360) * Math.PI / 180;
      const lineLength = 50;

      const x1 = roomCenterX + Math.round(Math.sin(angle1) * lineLength);
      const y1 = roomCenterY - Math.round(Math.cos(angle1) * lineLength);
      const x2 = roomCenterX + Math.round(Math.sin(angle2) * lineLength);
      const y2 = roomCenterY - Math.round(Math.cos(angle2) * lineLength);

      overlay(OVERLAYS.cameraAngle, () => {
        alt1.overLayLine(0xff00ffff, 2, roomCenterX, roomCenterY, x1, y1, 600);
        alt1.overLayLine(0xff00ffff, 2, roomCenterX, roomCenterY, x2, y2, 600);
      });
    }

    if (SETTINGS.showMinimapHUD) {
      const hudBoxSize = mapRoomSize * SETTINGS.hudRoomScale; // 150;
      const centerX = SETTINGS.hudPosition?.x || Math.round(alt1.rsWidth/2);
      const centerY = SETTINGS.hudPosition?.y || Math.round(alt1.rsHeight/2);

      const angleRad = (-cameraAngle + 360) % 360 * Math.PI / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);

      const corners = [
        { x: -hudBoxSize/2, y: -hudBoxSize/2 },
        { x:  hudBoxSize/2, y: -hudBoxSize/2 },
        { x:  hudBoxSize/2, y:  hudBoxSize/2 },
        { x: -hudBoxSize/2, y:  hudBoxSize/2 },
      ].map(corner => {
        return {
          x: centerX + Math.round(corner.x * cos - corner.y * sin),
          y: centerY + Math.round(corner.x * sin + corner.y * cos),
        }
      });

      const color = playerRoom.color || 0xffa0663d;
      const colors = [0xffff0000, color, 0xffffffff, color];
      const dirs = ['north', 'east', 'south', 'west'];

      overlay(OVERLAYS.minimapHUD, () => {
        alt1.overLayClearGroup(OVERLAYS.minimapHUDCorridors);

        for (let i = 0; i < 4; i++) {
          const next = (i + 1) % 4;
          alt1.overLayLine(
            colors[i],
            3,
            corners[i].x,
            corners[i].y,
            corners[next].x,
            corners[next].y,
            600
          );

          renderRoomsForHUD(
            playerRoom[dirs[i]],
            SETTINGS.hudRoomSteps,
            CARDINAL_OPPOSITES[dirs[i]],
            corners[i],
            corners[next],
            0,
            0,
            cameraAngle,
            Math.round((corners[i].x + corners[next].x) / 2),
            Math.round((corners[i].y + corners[next].y) / 2),
          );
        }

        alt1.overLayRefreshGroup(OVERLAYS.minimapHUDCorridors);

      });
    }
  }

  const end = performance.now();
  // console.log('Projection overlay rendered in', Math.round(end - start), 'ms');
  timeouts.scanCompass = setTimeout(scanCompass, 50);

  return {
    cameraAngle,
    direction,
  }
}

function findAnchor() {
  const rsBind = alt1.bindRegion(0, 0, alt1.rsWidth, alt1.rsHeight);
  const matches = JSON.parse(alt1.bindFindSubImg(rsBind, ANCHOR_ICON.icon, ANCHOR_ICON.width, 0, 0, alt1.rsWidth, alt1.rsHeight));
  for (const anchor of matches) {
    console.log(`Anchor found at {${anchor.x}, ${anchor.y}} – verifying...`);

    overlay(OVERLAYS.debugMap, () => {
      alt1.overLayRect(appColor, anchor.x, anchor.y, ANCHOR_ICON.width, ANCHOR_ICON.height, 600, 2);
      alt1.overLayRect(appColor, anchor.x - mapWidth + ANCHOR_ICON.width, anchor.y, mapWidth, mapHeight, 600, 2);
    });

    // Verify match by checking assumed map for a locked room
    const x = anchor.x - mapWidth + ANCHOR_ICON.width;
    const y = anchor.y;
    const bind = alt1.bindRegion(x, y, mapWidth, mapHeight);
    for (const r of ROOMS) {
      const matches = JSON.parse(alt1.bindFindSubImg(bind, r.icon, r.width, 0, 0, mapWidth, mapHeight));
      const roomMatch = matches[0];
      if (roomMatch) {
        overlay(OVERLAYS.debugMap, () => {
          alt1.overLayRect(appColor, x + roomMatch.x, y + roomMatch.y, r.width, r.height, 600, Math.ceil(r.width / 2));
        }, { reset: false });

        return anchor;
      }
    }

    overlay(OVERLAYS.debugMap, () => {
      alt1.overLayRect(0xffff0000, x, y, mapWidth, mapHeight, 600, 2);
    });
    console.log('Anchor found was a false positive, retrying...');
  }

  return null;
}

function setMapSize(floorSize) {
  if (floorSize === "small") {
    GRID_WIDTH = 4;
    GRID_HEIGHT = 4;
    mapWidth = 152;
    mapHeight = 152;
  }
  else if (floorSize === "medium") {
    GRID_WIDTH = 4;
    GRID_HEIGHT = 8;
    mapWidth = 152;
    mapHeight = 280;
  }
  else {
    floorSize = "large";
    GRID_WIDTH = 8;
    GRID_HEIGHT = 8;
    mapWidth = 280;
    mapHeight = 280;
  }
  console.log('Map size:', floorSize);
  SETTINGS.floorSize = floorSize;
  saveSettings();
  updateDebugStats();
  updateDebugOverlays();

  const radio = document.querySelector(`input[data-setting="floorSize"][value="${floorSize}"]`);
  radio.checked = true;

  if (grid && grid.length > 0) {
    buildGrid();
  }
}

function buildGrid() {
  const location = findAnchor();

  if (!location) {
    timeouts.buildGrid = setTimeout(buildGrid, 600);
    return;
  }

  // const mapX = location.x - mapWidth + 28;
  // const mapY = location.y + 7;
  mapX = location.x - mapWidth + ANCHOR_ICON.width;
  mapY = location.y;
  const offsetX = 13;
  const offsetY = 14;

  // alt1.overLayText("MAP", appColor, 20, Math.floor(mapX + mapWidth / 2) - 40, mapY - 40, 1000);
  alt1.overLayRect(appColor, mapX, mapY, mapWidth, mapHeight, 1000, 1);
  // alt1.overLayRect(0xffff0000, mapX + mapPadding, mapY + mapPadding, mapWidth - 2 * mapPadding, mapWidth - 2 * mapPadding, 5000, 1);

  grid = [];
  indexedRooms = {};

  for (let row = 0; row < GRID_HEIGHT; row++) {

    const rowArray = [];

    for (let col = 0; col < GRID_WIDTH; col++) {

      const x = mapX + offsetX + col * (mapRoomSize + mapRoomGap);
      const y = mapY + offsetY + row * (mapRoomSize + mapRoomGap);

      const room = {
        id: `${row}:${col}`,
        row, col,
        x, y,
        x2: x + mapRoomSize,
        y2: y + mapRoomSize,
        width: mapRoomSize,
        height: mapRoomSize,
        color: null,
        key: null,
        skill: null,
        state: null,
        crit: null,
        north: null,
        east: null,
        south: null,
        west: null,
      };
      rowArray.push(room);
      indexedRooms[room.id] = room;

      //alt1.overLayRect(0xff00ff00, x, y, mapRoomSize, mapRoomSize, 1000, 2);
    }

    grid.push(rowArray);
  }
  scanDungeonMapFull();
}

function scanDungeonMapFull() {
  clearTimeout(timeouts.scanDungeonMap);
  const start = performance.now();
  console.log('scanDungeonMapFull', grid);


  if (!grid || grid.length === 0) {
    return;
  }

  knownRooms = new Set();

  for (const roomId in indexedRooms) {
    const room = indexedRooms[roomId];
    setRoomState(room);
  }

  updateStats()

  const end = performance.now();

  document.getElementById("statScanTime").innerText = Math.round(end - start);

  DEBUG.scanDungeonMapFullCount++;
  DEBUG.scanDungeonMapFullAt = new Date();
  DEBUG.scanDungeonMapFullTime = Math.round(end - start);
  updateDebugStats();
  timeouts.scanDungeonMap = setTimeout(scanDungeonMapPartial, 1000);
}

function highlightCorridors() {
  clearTimeout(timeouts.highlightCorridors);

  if (inFloor && grid && grid.length > 0) {
    overlay(OVERLAYS.corridors, () => {
      for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
          const room = grid[row][col];
          if (room.north) alt1.overLayRect(0xffff00ff, room.x + Math.round(room.width / 2) - 2, room.y - 4, 4, 4, 5000, 2)
          if (room.south) alt1.overLayRect(0xffff00ff, room.x + Math.round(room.width / 2) - 2, room.y + room.height + 2, 4, 4, 5000, 2)
          if (room.east)  alt1.overLayRect(0xffff00ff, room.x + room.width + 2, room.y + Math.round(room.height / 2) - 2, 4, 4, 5000, 2)
          if (room.west)  alt1.overLayRect(0xffff00ff, room.x - 4, room.y + Math.round(room.height / 2) - 2, 4, 4, 5000, 2)
        }
      }
    });
  }

  timeouts.highlightCorridors = setTimeout(highlightCorridors, 4000);
}

function scanDungeonMapPartial() {
  clearTimeout(timeouts.scanDungeonMap);
  const start = performance.now();
  // console.log('scanDungeonMapPartial');

  if (!knownRooms || knownRooms.size === 0) {
    timeouts.scanDungeonMap = setTimeout(scanDungeonMapFull, 1000);
    return;
  }

  overlay(OVERLAYS.rooms, () => {
    for (let roomId in indexedRooms) {
      const room = indexedRooms[roomId];

      if (knownRooms.has(roomId) && room.state !== 'visited') {
        if (SETTINGS.showScanOverlay && !room.scanShown) {
          alt1.overLayRect(0xffff00ff, room.x , room.y, room.width, room.height, 1000, 1);
          room.scanShown = true;
        }

        setRoomState(room);
      }

      //DEBUG
      // alt1.overLayRect(room.color, room.x, room.y, room.width, room.height, 2000, 1)

      if (
        (SETTINGS.showKeyOverlay && room.state === "locked" && room.lockType === "key") ||
        (SETTINGS.showCritOverlay && room.crit != null)
      ) {
        alt1.overLayRect(room.color, room.x, room.y, room.width, room.height, 2000, 1)
      }
      else if (SETTINGS.showUnreachableOverlay && room.state === "unreachable") {
        alt1.overLayLine(room.color, 2, room.x + 8, room.y + 8, room.x + room.width - 8, room.y + room.height - 8, 2000);
        alt1.overLayLine(room.color, 2, room.x + room.width - 8, room.y + 8, room.x + 8, room.y + room.height - 8, 2000);
      }
    }

  });

  updateStats()

  const end = performance.now();

  document.getElementById("statScanTime").innerText = Math.round(end - start);

  DEBUG.scanDungeonMapPartialCount++;
  DEBUG.scanDungeonMapPartialAt = new Date();
  DEBUG.scanDungeonMapPartialTime = Math.round(end - start);
  updateDebugStats();
  updateDebugOverlays();

  timeouts.scanDungeonMap = setTimeout(scanDungeonMapPartial, 50);
}
window.grid = grid;
window.indexedRooms = indexedRooms;

// const debugLockedRoomCaptures = new Set();
// function exportDebugLockedRoomCaptures() {
//   const imageStrings = [];
//   for (let capture of debugLockedRoomCaptures) {
//     // const img = A1lib.decodeImageString(capture);
//     const canvas = document.createElement('canvas');
//     canvas.width = 29;
//     canvas.height = 29;
//     const ctx = canvas.getContext('2d');
//     const imageData = ctx.createImageData(29, 29);
//     A1lib.decodeImageString(capture, imageData, 0, 0, 29, 29);
//     ctx.putImageData(imageData, 0, 0);
//     imageStrings.push(canvas.toDataURL());
//   }
//   const html = '<html><body>' +
//     imageStrings.map(src => `<img src="${src}" />`).join('') +
//     '</body></html>'

//   return html;
// }
// window.exportDebugLockedRoomCaptures = exportDebugLockedRoomCaptures;

function updateUnreachables(startRoom) {
  const queue = [startRoom];
  const visited = new Set();
  const unknownPath = [];

  console.log('Start unreachable scan from', startRoom.id);

  while (queue.length > 0) {
    const room = queue.shift();
    if (room && room.state === null) return console.log('Found null state room during unreachable scan, aborting and waiting for next scan to try again', room.id);
    if (!room || visited.has(room.id) || room.state !== "unknown") continue;
    visited.add(room.id);
    unknownPath.push(room);

    for (const d in ADJACENCE_OFFSETS) {
      const [ro, co] = ADJACENCE_OFFSETS[d];
      const adj = indexedRooms[`${room.row + ro}:${room.col + co}`];
      if (!adj) continue;
      if (adj.state === "unknown") {
        queue.push(adj);
      }
      else if (adj.state !== "visited") {
        return;
      }
    }
  }

  for (const room of unknownPath) {
    room.state = "unreachable";
    room.color = 0xffaa0000;
  }

  console.log('Unreachable check', visited, unknownPath);
}

function setRoomState(room) {
  // alt1.overLayRect(0xff0000ff, room.x, room.y, room.width, room.height, 1000, 1)

  const img = A1lib.capture(room.x, room.y, room.width, room.height);
  const bind = alt1.bindRegion(room.x, room.y, room.width, room.height);

  const { state, corridors, boss } = ROOMS.find(r => {
    const matches = JSON.parse(alt1.bindFindSubImg(bind, r.icon, r.width, 0, 0, room.width, room.height));
    return matches.length > 0;
  }) || {};

  if (boss)
    console.log('Found boss room at', room.id);


  // if (SETTINGS.debug) {
  //   if (state)
  //     console.log('Scanned', room.id, 'and found', state, 'room with corridors', corridors);
  //   else
  //     console.log('Scanned', room.id, 'but found nothing');
  // }

  if (!state) {
    if (room.state)
      return console.log('Unable to determine state of room', room.id);

    room.state = "unknown";
    return;
  }

  room.state = state;
  knownRooms.add(room.id);

  room.capture = A1lib.encodeImageString(img, 0, 0, img.width, img.height);
  if (room.state === "visited") {
    if (room.crit === null)
      room.color = 0xffa0663d;

    // alt1.overLayText(corridors.map(c => c[0].toUpperCase()).join(''), 0xffffffff, 10, room.x + 6, room.y + 8, 1000);

    if (corridors?.length) {
      for (const dir of corridors) {
        // console.log('Found corridor', dir, 'in room', room.id);
        const [rowOffset, colOffset] = ADJACENCE_OFFSETS[dir];
        const adjacentRoom = indexedRooms[`${room.row + rowOffset}:${room.col + colOffset}`];
        room[dir] = adjacentRoom;
        if (adjacentRoom) {
          knownRooms.add(adjacentRoom.id);
          console.log('Found adjacent of', room.id, dir, 'at', adjacentRoom.id)
          if (adjacentRoom.state === "unknown")
            setRoomState(adjacentRoom);
        }
      }
    }

    for (const dir in ADJACENCE_OFFSETS) {
      if (corridors?.includes(dir)) continue;

      const [ro, co] = ADJACENCE_OFFSETS[dir];
      const adjacentRoom = indexedRooms[`${room.row + ro}:${room.col + co}`];
      if (adjacentRoom)
        updateUnreachables(adjacentRoom);
    }

    if (SETTINGS.highlightCorridors && (room.north || room.east || room.south || room.west))
      highlightCorridors(room);
  }
  else if (room.state === "locked") {
    // debugLockedRoomCaptures.add(
    //   A1lib.encodeImageString(img, 0, 0, img.width, img.height)
    // )

    let scans = 0;
    if (!room.lockType) {
      scans++;
      const matches = JSON.parse(alt1.bindFindSubImg(bind, GENERIC_LOCK_ICON.icon, GENERIC_LOCK_ICON.width, 0, 0, room.width, room.height));
      if (matches.length > 0) {
        room.lockType = "generic";
        room.color = 0xffee6f00;
        console.log(`Found generic lock @ ${room.id}`);
      }
    }

    if (!room.lockType) {
      scans++;
      for (const skill of SKILL_ICONS) {
        const matches = JSON.parse(alt1.bindFindSubImg(bind, skill.icon, skill.width, 0, 0, room.width, room.height));
        if (matches.length > 0) {
          room.lockType = "skill"
          room.skill = skill.name;
          room.color = 0xffee6f00;

          console.log(`Found ${skill.name} skill door @ ${room.id}`);
          break;
        }
      }
    }

    if (!room.lockType || (room.lockType === "key" && !myKeys.has(room.key))) {
      scans++;
      for (const key of KEY_HL_ICONS) {
        const matches = JSON.parse(alt1.bindFindSubImg(bind, key.icon, key.width, 0, 0, room.width, room.height));
        if (matches.length > 0) {
          room.lockType = "key"
          room.key = key.name.toLowerCase();
          room.color = SETTINGS.colorKeyYes
          myKeys.add(room.key);

          console.log(`Key scan: highlighted ${key.name} @ ${room.id} (owned)`);
          break;
        }
      }
    }

    if (!room.lockType) {
      scans++;
      for (const key of KEY_ICONS) {
        const matches = JSON.parse(alt1.bindFindSubImg(bind, key.icon, key.width, 0, 0, room.width, room.height));
        if (matches.length > 0) {
          room.lockType = "key"
          room.key = key.name.toLowerCase();
          room.color = SETTINGS.colorKeyNo;

          console.log(`Key scan: plain ${key.name} @ ${room.id} (not owned)`);
          break;
        }
      }
    }
  }
  updateDebugStats();
}

function highlightGatestone() {
  clearTimeout(timeouts.highlightGatestone);
  if (!SETTINGS.highlightGatestone)
    return;

  if (gatestone1Location) {
    overlay(OVERLAYS.gatestone, () => {
      alt1.overLayImage(gatestone1Location.x + 7, gatestone1Location.y + 6, GATESTONE_1_HL.icon, GATESTONE_1_HL.width, 1000);
    });
  }

  timeouts.highlightGatestone = setTimeout(highlightGatestone, 300);
}

let playerScanCounter = -1;
function scanPlayerRoom() {
  let ready = true;
  if (!knownRooms || knownRooms.size === 0) {
    console.log('Player room scan failed, rooms not indexed yet');
    ready = false;
  }

  if (!playerIndex && playerIndex !== 0) {
    console.log('Player room scan failed, player index not set');
    ready = false;
  }

  clearTimeout(timeouts.scanPlayerRoom);
  if (!ready) {
    if (SETTINGS.highlightMyLocation)
      timeouts.scanPlayerRoom = setTimeout(scanPlayerRoom, 500);
    return;
  }


  playerScanCounter = (playerScanCounter + 1) % 3;
  const start = performance.now();
  let playerRoom;
  // console.log(playerIndex, PLAYER_ICONS[playerIndex], knownRooms);

  for (const roomId of [...knownRooms].reverse()) {
    const room = indexedRooms[roomId];
    const bind = alt1.bindRegion(room.x, room.y, room.width, room.height);
    const matches = JSON.parse(alt1.bindFindSubImg(bind, PLAYER_ICONS[playerIndex].icon, PLAYER_ICONS[playerIndex].width, 0, 0, room.width, room.height));
    const match = matches[0];
    if (match) {
      playerRoom = room;
      if (SETTINGS.highlightMyLocation) {
        const color = A1lib.mixColor(...TEAM_MEMBER_COLORS[playerIndex]);
        // alt1.overLayRect(color, room.x + match.x - 3, room.y + match.y - 1, 11, 11, 300, 1);
        // alt1.overLayRect(0xffffffff, room.x + 2, room.y + 2, room.width - 4, room.height - 4, 150, 4);
        overlay(OVERLAYS.player, () => {
          // const offset = playerScanCounter === 0 ? 5 : 2;
          // alt1.overLayRect(color, room.x + offset, room.y + offset, room.width - offset * 2, room.height - offset * 2, 5000, 3);

          const offset = 2 + playerScanCounter * 2;
          alt1.overLayRect(color, room.x + offset, room.y + offset, room.width - offset * 2, room.height - offset * 2, 5000, 3);


          // if (playerScanCounter === 0)
          //   alt1.overLayRect(color, room.x + 5, room.y + 5, room.width - 10, room.height - 10, 5000, 3);
          //   // alt1.overLayRect(color, room.x + 7, room.y + 7, room.width - 14, room.height - 14, 150, 2);
          // else
          //   alt1.overLayRect(color, room.x + 2, room.y + 2, room.width - 4, room.height - 4, 5000, 3);
        });
      }
      break;
    }
  }

  if (playerPath[playerPath.length - 1] !== playerRoom?.id) {
    const prevRoomId = playerPath[playerPath.length - 1];
    playerPath.push(playerRoom?.id);
    if (prevRoomId) {
      const prevRoom = indexedRooms[prevRoomId];
      const img = A1lib.capture(prevRoom.x, prevRoom.y, prevRoom.width, prevRoom.height);
      prevRoom.capture = A1lib.encodeImageString(img, 0, 0, img.width, img.height);
    }
  }

  const end = performance.now();

  if (SETTINGS.highlightMyLocation)
    timeouts.scanPlayerRoom = setTimeout(scanPlayerRoom, 250);

  // console.log(PLAYER_ICONS[playerIndex].name, playerRoom ? `found at ${playerRoom.id}` : 'not found', `in <${Math.ceil((end - start) / 100) * 100} ms`);
  return playerRoom;
}

function findDgIcon() {
  const rsBind = alt1.bindRegion(0, 0, alt1.rsWidth, alt1.rsHeight);
  const matches = JSON.parse(alt1.bindFindSubImg(rsBind, DG_ICON.icon, DG_ICON.width, 0, 0, alt1.rsWidth, alt1.rsHeight));
  return matches[0];
}

function scanInterface() {
  clearTimeout(timeouts.scanInterface);
  const start = performance.now();

  const dgIcon = findDgIcon();
  if (!dgIcon) {
    timeouts.scanInterface = setTimeout(scanInterface, 600);
    // console.log('DG icon not found, retrying scanInterface');
    return;
  }


  // alt1.overLayRect(0xff0000ff, dgIcon.x, dgIcon.y, DG_ICON.width, DG_ICON.height, 1000, 2);

  // alt1.overLayRect(
  //   0xff0000ff,
  //   dgIcon.x + DG_ICON.width,
  //   dgIcon.y + DG_ICON.height - DG_INTERFACE_ROW_END.height,
  //   alt1.rsWidth - (dgIcon.x + DG_ICON.width),
  //   DG_INTERFACE_ROW_END.height,
  //   1000, 2
  // );
  const rowHeight = 22;
  const rowX = dgIcon.x;
  const firstRowLineY = dgIcon.y + DG_ICON.height - DG_INTERFACE_ROW_END.height;

  const rowLineBind = alt1.bindRegion(rowX, firstRowLineY, alt1.rsWidth - rowX, DG_INTERFACE_ROW_END.height);
  const rowLineMatches = JSON.parse(alt1.bindFindSubImg(rowLineBind, DG_INTERFACE_ROW_END.icon, DG_INTERFACE_ROW_END.width, 0, 0, alt1.rsWidth - rowX, DG_INTERFACE_ROW_END.height));
  const rowEnd = rowLineMatches[0];

  if (rowEnd) {
    const rowWidth = rowEnd.x > 160 ? 160 : rowEnd.x;
    const cropX = rowX + Math.floor((rowEnd.x - rowWidth) / 2);

    partyListRowBounds = [];
    partyListCaptures = [];
    overlay(OVERLAYS.members, () => {
      for (let i = 0; i < 5; i++) {
        const rowY = firstRowLineY + rowHeight * i + DG_INTERFACE_ROW_END.height - rowHeight;
        const color = TEAM_MEMBER_COLORS[i];
        alt1.overLayRect(
          A1lib.mixColor(...color),
          cropX,
          rowY,
          rowWidth,
          rowHeight - DG_INTERFACE_ROW_END.height,
          1000, 1
        );

        partyListRowBounds.push({
          x: cropX,
          y: rowY,
          width: rowWidth,
          height: rowHeight - DG_INTERFACE_ROW_END.height
        });

        const img = A1lib.capture(cropX, rowY, rowWidth, rowHeight - DG_INTERFACE_ROW_END.height);
        const imgStr = A1lib.encodeImageString(img, 0, 0, img.width, img.height);
        partyListCaptures.push(imgStr);

        // for (const font of Object.keys(Alt1Fonts)) {
        //   const text = OCR.findReadLine(img, Alt1Fonts[font], [color], Math.floor(rowWidth / 2), Math.floor(rowHeight / 2));
        //   console.log(text.text, font, text);
        // }
      }
    });
  }

  const end = performance.now();

  console.log(`scanInterface finished in ${end - start} ms`, dgIcon);
}

let stats;
function updateStats() {
  let visited = 0;
  let unknown = 0;

  let keys = 0;
  let skills = 0;
  let generic = 0;

  let deadEnds = 0;
  let branches = 0;

  let unreachable = 0;

  let rpm = 0;

  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      const room = grid[row][col];

      // count states
      switch (room.state) {
        case "visited":
          visited++;
          break;
        case "unknown":
          unknown++;
          break;
        case "locked":
          switch (room.lockType) {
            case "key":
              keys++;
              break;
            case "skill":
              skills++;
              break;
            case "generic":
              generic++;
              break;
          }
          break;
        case "unreachable":
          unreachable++;
          break;
      }

      // count exits
      const exits = Number(!!room.north) + Number(!!room.east) + Number(!!room.south) + Number(!!room.west);

      if (room.state === "visited") {
        if (exits === 1) {
          deadEnds++;
        }

        if (exits >= 3) {
          branches++;
        }
      }
    }
  }


  const total = visited + unknown + keys + skills + generic;

  const completion = total > 0 ? Math.round((visited / total) * 100) : 0;

  const TARGET_TIME_SECONDS = SETTINGS.goalMinutes * 60 + SETTINGS.goalSeconds;

  let elapsed = "-";
  let projected = "-";
  let pace = "-";

  if (dungeonStartTime) {
    const seconds = Math.floor((Date.now() - dungeonStartTime) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    elapsed = `${mins}:${secs.toString().padStart(2, "0")}`;
    const minutes = seconds / 60;

    if (minutes > 0) {
      rpm = ((visited) / minutes).toFixed(2);
    }
  }


  let elapsedSeconds

  if (dungeonStartTime && completion > 0) {

    elapsedSeconds = Math.floor((Date.now() - dungeonStartTime) / 1000);

    const mins = Math.floor(elapsedSeconds / 60);

    const secs = elapsedSeconds % 60;

    elapsed = `${mins}:${secs.toString().padStart(2, "0")}`;

    const projectedTotal = elapsedSeconds / (completion / 100);

    const projectedMins = Math.floor(projectedTotal / 60);

    const projectedSecs = Math.floor(projectedTotal % 60);

    projected = `${projectedMins}:${projectedSecs.toString().padStart(2, "0")}`;

    if (!failedGoal && elapsedSeconds > TARGET_TIME_SECONDS && TARGET_TIME_SECONDS > 0) {
      failedGoal = true;
      setTooltip("Too slow");
    }
  }

  const targetRpm = TARGET_TIME_SECONDS && (total / (TARGET_TIME_SECONDS / 60)) || 0;

  const behindTargetSince = targetRpm && rpm < targetRpm ? (stats?.behindTargetSince || Date.now()) : null;

  stats = {
    visited,
    unknown,
    locked: `${keys} keys + ${skills} skills + ${generic} generic`,
    lockedCount: keys + skills + generic, //+hidden locked
    unreachable,
    deadEnds,
    branches,
    completion: `${completion}%`,
    time: elapsed,
    elapsedSeconds,
    projected,
    targetRpm,
    rpm,
    behindTargetSince,
  }

  document.getElementById("statVisited").innerText = visited;
  document.getElementById("statUnknown").innerText = unknown;
  document.getElementById("statLocked").innerText = `${keys} keys + ${skills} skills + ${generic} generic`;
  document.getElementById("statUnreachable").innerText = unreachable;

  document.getElementById("statDeadEnds").innerText = deadEnds;
  document.getElementById("statBranches").innerText = branches;

  document.getElementById("statCompletion").innerText = completion;
  document.getElementById("statTime").innerText = elapsed;
  document.getElementById("statProjected").innerText = projected;
  document.getElementById("statRPM").innerText = rpm;

  if (SETTINGS.showStatsOverlay) {
    overlay(OVERLAYS.stats, () => {
      renderStatsOverlay();
    });
  }
}

function renderStatsOverlay({ x, y } = {}) {
  const barWidth = 250;
  const posX = x || SETTINGS.statsOverlayPosition?.x || Math.round(alt1.rsWidth / 2 - barWidth / 2);
  const posY = y || SETTINGS.statsOverlayPosition?.y || 50;
  let textOffsetY = 0;

if (stats.targetRpm) {
  const TARGET_TIME_SECONDS = SETTINGS.goalMinutes * 60 + SETTINGS.goalSeconds;

  // credits to Notaphily! 
  const roomRanges = {
    small: { min: 10, max: 16 },
    medium: { min: 23, max: 32 },
    large: { min: 50, max: 64 }
  };

  const floorRange = roomRanges[SETTINGS.floorSize] || roomRanges.large;
  const minTargetRpm = floorRange.min / (TARGET_TIME_SECONDS / 60);
  const maxTargetRpm = floorRange.max / (TARGET_TIME_SECONDS / 60);

  const padding = 1;
  const minRpmBar = Math.max(0, minTargetRpm - padding);
  const maxRpmBar = maxTargetRpm + padding;

  const rpmToX = (rpm, width) => Math.max(0, Math.min(1, (rpm - minRpmBar) / (maxRpmBar - minRpmBar))) * width;

  //TODO calc hidden locked doors
  const reachableRooms = floorRange.max - stats.unreachable;
  const dynamicMaxTargetRpm = reachableRooms  / (TARGET_TIME_SECONDS / 60);
  const dynamicMinTargetRpm = Math.max(floorRange.min, stats.visited + stats.lockedCount /*+  hidden locked*/) / (TARGET_TIME_SECONDS / 60);

  const img = withCanvas((ctx, width, height) => {
    const barHeight = 25;
    const barY = 17;

    ctx.fillStyle = "#333";
    ctx.fillRect(0, barY, barWidth, barHeight);

    const minTargetX = rpmToX(minTargetRpm, barWidth);
    const maxTargetX = rpmToX(maxTargetRpm, barWidth);
    const dynamicMinX = rpmToX(dynamicMinTargetRpm, barWidth);
    const dynamicMaxX = rpmToX(dynamicMaxTargetRpm, barWidth);

    let color;
    if (stats.rpm >= dynamicMaxTargetRpm)
      color = "#0f0";
    else if (stats.rpm >= dynamicMinTargetRpm)
      color = "#ff0";
    else
      color = "#f00";

    ctx.fillStyle = color;

    const rpmWidth = rpmToX(stats.rpm, barWidth);
    ctx.fillRect(0, barY, rpmWidth, barHeight);

    ctx.fillStyle = "#000000";

    // markers
    //ctx.fillRect(minTargetX - 1, 0, 1, height);
    //ctx.fillRect(maxTargetX - 1, 0, 1, height);
    ctx.fillRect(dynamicMaxX - 1, 0, 1, height);
    ctx.fillRect(dynamicMinX - 1, 0, 1, height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Arial";

    //labels
    ctx.textAlign = "center";
    ctx.fillText(dynamicMinTargetRpm.toFixed(2), dynamicMinX, 12);
    ctx.fillText(dynamicMaxTargetRpm.toFixed(2), dynamicMaxX, 12);

    ctx.textAlign = "left";
    ctx.fillText(stats.rpm, rpmWidth, 32);

    /* range labels
    ctx.textAlign = "left";
    ctx.fillText(minRpmBar.toFixed(2), 2, barY + barHeight / 2 + 4);

    ctx.textAlign = "right";
    ctx.fillText(maxRpmBar.toFixed(2), width - 2, barY + barHeight / 2 + 4);
    */

    if (stats.behindTargetSince) {
      const elapsed = Math.floor((Date.now() - stats.behindTargetSince) / 1000);

      if (elapsed > 0) {
        ctx.fillStyle = "#ff0000";

        ctx.fillText(
          `${elapsed}s`,
          width - 300,
          12
        );
      }
    }

  }, 300, 60);

  textOffsetY += img.height + 5;

  alt1.overLayImage(
    posX,
    posY,
    A1lib.encodeImageString(img),
    img.width,
    1000
  );


}

  let idx = 0;
  for (const key in stats) {
    if (!SETTINGS[`statsOverlay_${key}`]) continue;

    const text = `${key[0].toUpperCase() + key.slice(1)}: ${stats[key]}`;
    alt1.overLayText(text, 0xffffffff, 14, posX, posY + textOffsetY + idx * 20, 1000);
    idx++;
  }
}

function withCanvas(callback, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  callback(ctx, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function findNearestRoom(predicate, { startRoom = null, traversal = "grid" } = {}) {
  const queue = [startRoom || scanPlayerRoom()];
  const visited = new Set();

  while (queue.length > 0) {
    const room = queue.shift();
    if (!room || visited.has(room.id)) {
      continue;
    }

    visited.add(room.id);

    if (predicate(room)) {
      return room;
    }

    const sortedDirs = Object.keys(ADJACENCE_OFFSETS).sort((a, b) => {
      const dA = Math.abs(((CARDINAL_ANGLES[a] - cameraAngle) % 360));
      const dB = Math.abs(((CARDINAL_ANGLES[b] - cameraAngle) % 360));

      return Math.min(dA, 360 - dA) - Math.min(dB, 360 - dB);
    });

    switch (traversal) {
    case "doors":
      for (const dir of sortedDirs) {
        if (room[dir]) {
          queue.push(room[dir]);
        }
      }
      break;
    case "grid":
      for (const dir of sortedDirs) {
        const [rowOffset, colOffset] = ADJACENCE_OFFSETS[dir];
        const adjacentId = `${room.row + rowOffset}:${room.col + colOffset}`;
        const adjacentRoom = indexedRooms[adjacentId];
        if (adjacentRoom) {
          queue.push(adjacentRoom);
        }
      }
      break;
    }
  }

  return null;
}

function updateDebugOverlays() {
  if (!SETTINGS.debug) return;

  overlay(OVERLAYS.debug, () => {
    showSelectedChat(reader.pos);
    alt1.overLayRect(0xffff00ff, mapX, mapY, mapWidth, mapHeight, 1000, 5);

    for (let i = 0; i < partyListRowBounds.length; i++) {
      const bounds = partyListRowBounds[i];
      alt1.overLayRect(0xffff00ff, bounds.x, bounds.y, bounds.width, bounds.height, 1000, i === playerIndex ? 3 : 1);
    }

    for (const roomId in indexedRooms) {
      const room = indexedRooms[roomId];
      let color = 0xffffffff, inset = 0;
      switch (room.state) {
        case 'visited': color = 0xff00ff00; inset = 3; break;
        case 'locked': color = room.color; break;
        case 'unknown': color = 0xffff00ff; break;
        case 'unreachable': color = room.color; break;
      }
      if (room.state === "unreachable") {
        alt1.overLayLine(color, 2, room.x + 8, room.y + 8, room.x + room.width - 8, room.y + room.height - 8, 2000);
        alt1.overLayLine(color, 2, room.x + room.width - 8, room.y + 8, room.x + 8, room.y + room.height - 8, 2000);
      }
      else
        alt1.overLayRect(color, room.x + inset, room.y + inset, room.width - 2 * inset, room.height - 2 * inset, 600, 1);
    }


    // KEY_HL_ICONS.forEach((key, i) => {
    //   alt1.overLayImage(Math.round(alt1.rsWidth*.5) + (i % 8) * (15 + 2), Math.round(alt1.rsHeight*.4) + 6 + Math.floor(i / 8) * (25 + 2), key.icon, key.width, 3000);
    // });

  });
}

/*
GUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
*/

function updateDebugStats() {
  if (!SETTINGS.debug) return;

  document.getElementById("debugScanDungeonMapFullCount").innerText = DEBUG.scanDungeonMapFullCount || '-';
  document.getElementById("debugScanDungeonMapFullAt").innerText = DEBUG.scanDungeonMapFullAt ? DEBUG.scanDungeonMapFullAt.toISOString().split('T')[1] : '-';
  document.getElementById("debugScanDungeonMapFullTime").innerText = (DEBUG.scanDungeonMapFullTime || '-') + ' ms';

  document.getElementById("debugScanDungeonMapPartialCount").innerText = DEBUG.scanDungeonMapPartialCount || '-';
  document.getElementById("debugScanDungeonMapPartialAt").innerText = DEBUG.scanDungeonMapPartialAt ? DEBUG.scanDungeonMapPartialAt.toISOString().split('T')[1] : '-';
  document.getElementById("debugScanDungeonMapPartialTime").innerText = (DEBUG.scanDungeonMapPartialTime || '-') + ' ms';

  document.getElementById("debugPlayerIndex").innerText = playerIndex !== null ? playerIndex : '-';
  document.getElementById("debugPartySize").innerText = partySize !== null ? partySize : '-';
  document.getElementById("debugFloorSize").innerText = SETTINGS.floorSize || '-';

  document.getElementById("debugInFloor").innerText = inFloor;
  document.getElementById("debugGridSize").innerText = grid?.[0] ? grid.length * grid[0].length : '-';
  document.getElementById("debugKnownRooms").innerText = knownRooms ? knownRooms.size : '-';
  document.getElementById("debugLastStartBy").innerText = DEBUG.lastStartBy || '-';

  document.getElementById("debugChatStatus").innerText = lastLines.join("\n");
}

document.querySelectorAll(".panel .panel-toggle").forEach(button => {
  const panel = button.closest(".panel");
  const key = panel.dataset.panelKey && `panel_${panel.dataset.panelKey}_collapsed`;
  const open = key ? localStorage.getItem(key) !== "true" : true;

  const togglePanel = (isOpen) => {
    if (isOpen) {
      panel.classList.add("open");
      button.innerText = "–";
      if (key) localStorage.removeItem(key);
    }
    else {
      panel.classList.remove("open");
      button.innerText = "+";
      if (key) localStorage.setItem(key, "true");
    }
  };

  togglePanel(open);

  button.addEventListener("click", () => {
    togglePanel(!panel.classList.contains("open"));
  });
});

let hudPositionStartAt = null;
let hudPositionTarget = null;
function waitForHUDPosition(target, description, renderPreview) {
  clearTimeout(timeouts.setHUDPosition);

  if (hudPositionStartAt === null) {
    hudPositionStartAt = Date.now();
    hudPositionTarget = target;
  }
  const remaining = 30 - (Date.now() - hudPositionStartAt) / 1000;

  if (remaining > 0) {
    alt1.setTooltip(`${description} (${Math.round(remaining)}s)`);
    const pos = A1lib.getMousePosition();
    if (pos && renderPreview) {
      overlay(OVERLAYS.hudPosition, () => {
          renderPreview(pos.x,  pos.y);
      });
    }
    timeouts.setHUDPosition = setTimeout(waitForHUDPosition.bind(null, hudPositionTarget, description, renderPreview), 100);
  }
  else {
    hudPositionStartAt = null;
    alt1.clearTooltip();
  }
}

document.getElementById("setHUDPosition").addEventListener("click", () => {
  if (!hudPositionStartAt) {
    waitForHUDPosition(
      "hudPosition",
      "Position your mouse where you want the HUD to be, and press alt+1 to set position.\nFor best effect, position it centered on your character.",
      (x, y) => {
        const size = mapRoomSize * SETTINGS.hudRoomScale;
        alt1.overLayRect(0xffffff00, x - Math.round(size/2), y - Math.round(size/2), Math.round(size), Math.round(size), 500, 2);
      }
    );

  }
  else {
    clearTimeout(timeouts.setHUDPosition);
    hudPositionStartAt = null;
    hudPositionTarget = null;
    alt1.clearTooltip();
  }
});

document.getElementById("setStatsPosition").addEventListener("click", () => {
  if (!hudPositionStartAt) {
    waitForHUDPosition(
      "statsOverlayPosition",
      "Position your mouse where you want the stats to be, and press alt+1 to set position.",
      (x, y) => {
        renderStatsOverlay({ x, y });
      }
    );
  }
  else {
    clearTimeout(timeouts.setHUDPosition);
    hudPositionStartAt = null;
    hudPositionTarget = null;
    alt1.clearTooltip();
  }
});

const SETTING_CHANGED_HANDLERS = {

  debug: value => {
    if (!value) {
      clearOverlay(OVERLAYS.debug);
    }

    document.querySelector('[data-setting="debug"]').closest('.panel').classList.toggle('open', value);
  },

  showCameraAngle: value => {
    if (value) {
      scanCompass();
    }
    else {
      clearOverlay(OVERLAYS.cameraAngle);
    }
  },

  showMinimapHUD: value => {
    if (value) {
      scanCompass();
    }
    else {
      clearOverlay(OVERLAYS.minimapHUD);
      clearOverlay(OVERLAYS.minimapHUDCorridors);
    }
    document.querySelector('[data-setting="showMinimapHUD"]').checked = value;
  },

  floorSize: value => {
    setMapSize(value);
  },

  highlightMyLocation: value => {
    if (value) {
      scanPlayerRoom();
    }
    else {
      clearTimeout(timeouts.scanPlayerRoom);
      clearOverlay(OVERLAYS.player);
    }
  },

  highlightCorridors: value => {
    if (value) {
      highlightCorridors();
    }
    else {
      clearTimeout(timeouts.highlightCorridors);
      clearOverlay(OVERLAYS.corridors);
    }
  },

  highlightGatestone: value => {
    if (value) {
      highlightGatestone();
    }
    else {
      clearTimeout(timeouts.highlightGatestone);
      clearOverlay(OVERLAYS.gatestone);
    }
  },

  showStatsOverlay: value => {
    if (value) {
      document.getElementById("stats").classList.add("show-checkboxes");
    }
    else {
      document.getElementById("stats").classList.remove("show-checkboxes");
      clearOverlay(OVERLAYS.stats);
    }
  },

};

function saveSettings() {
    localStorage.setItem("dgmap_settings", JSON.stringify(SETTINGS));
}

function loadSettings() {
  console.log('Load settings');

  const storedSettings = JSON.parse(localStorage.getItem("dgmap_settings")) || {};

  for (const key in SETTINGS) {
    const storedValue = storedSettings[key];
    if (storedValue !== undefined && storedValue !== null)
      SETTINGS[key] = storedValue;

    const value = SETTINGS[key];

    const controls = document.querySelectorAll(`[data-setting="${key}"]`);

    if (!controls || controls.length === 0)
      continue;

    if (controls[0].type === "radio") {
      controls.forEach(control => {
        control.checked = control.value === value;
      });
    }
    else {
      const el = controls[0];

      if (el?.type === "checkbox") {
        el.checked = value;
      }
      else if (el?.type === "color") {
        if (typeof value === "number") {
          el.value = decimalToHexRGB(value);
        }
        else {
          el.value = value;
          SETTINGS[key] = hexToDecimalARGB(value);
        }
      }
      else {
        el.value = SETTINGS[key];
      }
    }

    SETTING_CHANGED_HANDLERS[key]?.(SETTINGS[key]);
  }

  document.querySelectorAll('input[data-setting]').forEach(input => {
    const key = input.dataset.setting;
    if (!SETTINGS.hasOwnProperty(key))
      return;

    let valueAttr, eventName, parseFunc;
    let value = SETTINGS[key];

    switch (input.type) {
      case "color":
        valueAttr = "value";
        value = decimalToHexRGB(value);
        parseFunc = hexToDecimalARGB;
        break;
      case "number":
        valueAttr = "value";
        parseFunc = Number;
        break;
      case "range":
        valueAttr = "value";
        parseFunc = Number;
        break;
      case "checkbox":
        valueAttr = "checked";
        eventName = "change";
        break;
      case "radio":
        eventName = "change";
        parseFunc = (input) => input.checked ? input.value : SETTINGS[key];
        input.checked = input.value === value;
        break;
    }

    parseFunc = parseFunc || (v => v);
    eventName = eventName || "input";

    if (valueAttr)
      input[valueAttr] = value;

    input.addEventListener(eventName, e => {
      SETTINGS[key] = parseFunc(valueAttr ? input[valueAttr] : input);
      SETTING_CHANGED_HANDLERS[key]?.(SETTINGS[key]);

      saveSettings();
    });

    input.removeAttribute("disabled");
  });
}

window.addEventListener('beforeunload', () => {
    saveSettings();
    clearAllOverlays();
});

window.addEventListener('load', () => {
  loadSettings();

  reader.readargs = {
    colors: [
      A1lib.mixColor(255, 255, 255),
      A1lib.mixColor(0, 255, 0),
      A1lib.mixColor(30, 255, 0),
      A1lib.mixColor(45, 186, 20),
      A1lib.mixColor(255, 203, 5),
      A1lib.mixColor(30, 255, 0),

      A1lib.mixColor(210, 183, 109), // light brown (floor start config)

      // Key colors
      A1lib.mixColor(51, 102, 255), // blue
      A1lib.mixColor(220, 20, 60), // crimson
      A1lib.mixColor(254, 222, 0), // gold
      A1lib.mixColor(0, 255, 0), // green
      A1lib.mixColor(255, 102, 0), // orange
      A1lib.mixColor(102, 0, 255), // purple
      A1lib.mixColor(191, 191, 191), // silver
      A1lib.mixColor(255, 255, 0), // yellow
    ],
    backwards: true,
  };
  clearAllOverlays();
  alt1.overLaySetGroup(OVERLAYS.default);

  A1lib.on('alt1pressed', handleAlt1Pressed);

  reader.find();

  scanMapButton();

  const findChat = setInterval(() => {
    if (reader.pos === null) reader.find();
    else {
      clearInterval(findChat);
      reader.pos.mainbox = reader.pos.boxes[0];
      showSelectedChat(reader.pos);

      document.getElementById("debugChatStatus").innerText = "Chat: Found";
      chatInterval = setInterval(() => {
        readChatbox();
        updateDebugStats();
        updateDebugOverlays();
      }, 200);
    }
  }, 1000);

  scanInterface();

  for (const o in OVERLAY_Z_INDEX) {
    alt1.overLaySetGroupZIndex(OVERLAYS[o], OVERLAY_Z_INDEX[o]);
  }

});

A1lib.identifyApp("appconfig.json");

const reader = new Chatbox.default();
const appColor = A1lib.mixColor(255, 199, 0);
const timestampRegex = /\[\d{2}:\d{2}:\d{2}\]/g;


// These will be used as default, and any saved settings will override them on load
const SETTINGS = {

  colorKeyYes: 0xff33aa33,
  colorKeyNo: 0xffff0000,
  colorCritTrue: 0xffffd700,
  colorCritFalse: 0xff00bfff,

  showKeyOverlay: true,
  showCritOverlay: true,
  showScanOverlay: true,
  highlightMyLocation: true,
  highlightCorridors: true,
  highlightGatestone: true,

  goalMinutes: 0,
  goalSeconds: 0,

  floorSize: "large",

};

let chatInterval = null;

const timeouts = {
  scanInterface: null,
  scanDungeonMap: null,
  scanPlayerRoom: null,
  buildGrid: null,
  highlightCorridors: null,
  highlightGatestone: null,
}

let teamMembersSinceUs = [];
let playerIndex = 0;
let gatestone1Location = null;
let dungeonStartTime = null;
let inFloor = false;
let myKeys;
let GRID_WIDTH = 8, GRID_HEIGHT = 8, grid, mapWidth = 280, mapHeight = 280;
let mapX, mapY;

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
}
const currentOverlay = OVERLAYS.default;
const renderedOverlays = new Set();

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

function hexToDecimalARGB(hex) {
  hex = hex.replace("#", "");
  return parseInt(hex, 16) | 0xff000000;
}
function decimalToHexRGB(color) {
  return '#' + (color & 0xffffff).toString(16).padStart(6, "0");
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

function overlay(name, draw, reset = true) {
  const prevOverlay = currentOverlay;
  renderedOverlays.add(name);
  alt1.overLaySetGroup(name);
  alt1.overLayFreezeGroup(name);
  if (reset) alt1.overLayClearGroup(name);
  draw();
  alt1.overLayRefreshGroup(name);
  alt1.overLaySetGroup(prevOverlay);
}

let partyListOverlayVisibleUntil = 0;

function handleAlt1Pressed(event) {
  console.log('alt1pressed', event)

  if (!inFloor && findMapButton())
    startFloor();

  const { x, y } = event;

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
  else {
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

  if (lastLines.length > 11) {
    lastLines.pop();
  }
  document.getElementById("debugChatStatus").innerText = lastLines.join("\n");


  const keyMatch = line.match(/Your party (found|used) a key: (\w+) (\w+) key/i);
  if (keyMatch) {
    const action = keyMatch[1].toLowerCase();
    const color = keyMatch[2].toLowerCase();
    const shape = keyMatch[3].toLowerCase();

    const keyName = `${color} ${shape} key`;

    console.log(action, keyName)

    if (action === "found")
      myKeys.add(keyName);
    else if (action === "used")
      myKeys.delete(keyName);

    return;
  }

  const critMatch = line.match(/level (\d+) (\w+)/i);
  if (critMatch) {
    const level = Number(critMatch[1]);
    const skill = critMatch[2].toLowerCase();
    const iconData = SKILL_ICONS.find(s => s.name.toLowerCase() === skill);

    const skillRoom = scanAdjacentSkillDoors(iconData)[0]
    if (skillRoom) {
      if (level >= iconData.max_level - 10 && level <= iconData.max_level) {
        grid[skillRoom.room.row][skillRoom.room.col].crit = true
      }
      else {
        grid[skillRoom.room.row][skillRoom.room.col].crit = false
      }
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
      if (tier > 8) {
        if (grid[playerRoom.row][playerRoom.col].crit !== false) {
          grid[playerRoom.row][playerRoom.col].crit = true;
        }
      }
      else {
        grid[playerRoom.row][playerRoom.col].crit = false;
      }
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

  const dungeonSizeMatch = line.match(/Dungeon Size:.*(Small|Medium|Large)/);
  if (dungeonSizeMatch) {
    const size = dungeonSizeMatch[1].toLowerCase();
    setMapSize(size);
    return;
  }

  const partySizeMatch = line.match(/Party Size:.*(\d):\d/);
  if (partySizeMatch) {
    startFloor();

    if (teamMembersSinceUs.length > 0) {
      const size = parseInt(partySizeMatch[1], 10);
      playerIndex = size - teamMembersSinceUs.length;
      console.log(`We're player ${playerIndex + 1} of ${size}`);
      for (let i = 0; i < size; i++) {
        const color = TEAM_MEMBER_COLORS[i];
        const displayName = i < playerIndex ?
          `Unknown${i + 1}` :
          teamMembersSinceUs[i - playerIndex] || 'Unknown';
        console.log(`%c ${displayName} `, `color: white; background-color: rgb(${color[0]}, ${color[1]}, ${color[2]}); padding: 2px 10px; border-radius: 5px;`);
      }

      teamMembersSinceUs = [];
    }

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
  gatestone1Location = null;
  myKeys = new Set();
  failedGoal = false;
  buildGrid();
  if (SETTINGS.highlightMyLocation) scanPlayerRoom();
  if (SETTINGS.highlightGatestone) highlightGatestone();
  if (SETTINGS.highlightCorridors) highlightCorridors();
  scanInterface();
  alt1.clearTooltip();
}

function stopFloor() {
  console.log('Stopping floor');
  clearAllOverlays();
  clearTimeouts();
  scanInterface();
  inFloor = false
  myKeys = new Set();
  grid = []
  failedGoal = false;
  teamMembersSinceUs = [];
  partyListCaptures = [];
  alt1.clearTooltip();
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

    startFloor();
  }
}

function findAnchor() {
  const rsBind = alt1.bindRegion(0, 0, alt1.rsWidth, alt1.rsHeight);
  const matches = JSON.parse(alt1.bindFindSubImg(rsBind, ANCHOR_ICON.icon, ANCHOR_ICON.width, 0, 0, alt1.rsWidth, alt1.rsHeight));
  return matches[0];
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

  const roomSize = 29;
  const gap = 3;

  // alt1.overLayText("MAP", 0xffffffff, 20, Math.floor(mapX + mapWidth / 2) - 40, mapY - 40, 3000);
  // alt1.overLayRect(0xffff0000, mapX, mapY, mapWidth, mapWidth, 5000, 1);
  // alt1.overLayRect(0xffff0000, mapX + mapPadding, mapY + mapPadding, mapWidth - 2 * mapPadding, mapWidth - 2 * mapPadding, 5000, 1);

  grid = [];

  for (let row = 0; row < GRID_HEIGHT; row++) {

    const rowArray = [];

    for (let col = 0; col < GRID_WIDTH; col++) {

      const x = mapX + offsetX + col * (roomSize + gap);
      const y = mapY + offsetY + row * (roomSize + gap);

      rowArray.push({
        row, col,
        x, y,
        x2: x + roomSize,
        y2: y + roomSize,
        width: roomSize,
        height: roomSize,
        color: null,
        key: null,
        skill: null,
        state: null,
        crit: null,
        north: false,
        east: false,
        south: false,
        west: false,
        player: false
      });

      //alt1.overLayRect(0xff00ff00, x, y, roomSize, roomSize, 1000, 2);
    }

    grid.push(rowArray);
  }
  scanDungeonMapFull();
}

let knownRooms, indexedRooms, unknownAdjacents, unknownRescans;

function scanDungeonMapFull() {
  clearTimeout(timeouts.scanDungeonMap);
  const start = performance.now();
  console.log('scanDungeonMapFull', grid);


  if (!grid || grid.length === 0) {
    return;
  }

  indexedRooms = {};
  knownRooms = new Set();
  unknownAdjacents = new Set();
  unknownRescans = new Set();

  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      const room = grid[row][col];
      setRoomState(room);
      indexedRooms[room.id] = room;

      //DEBUG
      // alt1.overLayRect(room.color, room.x, room.y, room.width, room.height, 3000, 1)
    }
  }

  showStats()

  const end = performance.now();

  document.getElementById("statScanTime").innerText = Math.round(end - start);

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
    for (let roomId of knownRooms) {
      const room = indexedRooms[roomId];

      if (room.state !== 'visited')
        setRoomState(room);

      //DEBUG
      // alt1.overLayRect(room.color, room.x, room.y, room.width, room.height, 2000, 1)

      if (SETTINGS.showKeyOverlay && room.state == 'key') {
        alt1.overLayRect(room.color, room.x, room.y, room.width, room.height, 2000, 1)
      }

      if (SETTINGS.showCritOverlay && room.crit != null) {
        alt1.overLayRect(room.crit ? SETTINGS.colorCritTrue : SETTINGS.colorCritFalse, room.x, room.y, room.width, room.height, 2000, 1);
      }
    }

    for (let roomId of unknownAdjacents) {
      const room = indexedRooms[roomId];
      setRoomState(room);

      if (SETTINGS.showScanOverlay)
        alt1.overLayRect(0xffff00ff, room.x, room.y, room.width, room.height, 600, 1)

      if (room.state !== "unknown") {
        knownRooms.add(room.id);
      }
    }

    for (let roomId of unknownRescans) {
      const room = indexedRooms[roomId];
      setRoomState(room);

      if (SETTINGS.showScanOverlay)
        alt1.overLayRect(0xffff00ff, room.x, room.y, room.width, room.height, 600, 1)

      if (room.state !== "unknown") {
        knownRooms.add(room.id);
      }
    }
  });

  showStats()

  const end = performance.now();

  document.getElementById("statScanTime").innerText = Math.round(end - start);

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
const ADJACENCE_OFFSETS = {
  north: [-1, 0],
  south: [1, 0],
  east: [0, 1],
  west: [0, -1],
}

function setRoomState(room) {
  room.id = `${room.row}:${room.col}`;
  // alt1.overLayRect(0xff0000ff, room.x, room.y, room.width, room.height, 1000, 1)

  const img = A1lib.capture(room.x, room.y, room.width, room.height);
  const bind = alt1.bindRegion(room.x, room.y, room.width, room.height);

  const prevState = room.state;
  room.state = 'unknown';

  const { state, corridors } = ROOMS.find(r => {
    const matches = JSON.parse(alt1.bindFindSubImg(bind, r.icon, r.width, 0, 0, room.width, room.height));
    return matches.length > 0;
  }) || {};

  if (state)
    room.state = state;

  if (room.state === "unknown") {
    knownRooms.delete(room.id);
    if (prevState && prevState !== "unknown") {
      console.log('Room', room.id, 'state changed from', prevState, 'to unknown');
      unknownRescans.add(room.id);
    }
  }
  else {
    knownRooms.add(room.id);
    unknownAdjacents.delete(room.id);
    unknownRescans.delete(room.id);
  }


  if (room.state === "visited") {
    room.color = SETTINGS.colorKeyYes;

    // alt1.overLayText(corridors.map(c => c[0].toUpperCase()).join(''), 0xffffffff, 10, room.x + 6, room.y + 8, 1000);

    if (corridors?.length) {
      for (const dir of corridors) {
        // console.log('Found corridor', dir, 'in room', room.id);
        room[dir] = true;
        const [rowOffset, colOffset] = ADJACENCE_OFFSETS[dir];
        const adjacentRoom = indexedRooms[`${room.row + rowOffset}:${room.col + colOffset}`];
        if (adjacentRoom?.state === "unknown") {
          unknownAdjacents.add(adjacentRoom.id);
          console.log('Found adjacent of', room.id, dir, 'at', adjacentRoom.id)
        }
      }
    }

    if (SETTINGS.highlightCorridors && (room.north || room.east || room.south || room.west))
      highlightCorridors(room);
  }
  else if (room.state === "locked") {
    room.color = SETTINGS.colorKeyNo;

    // debugLockedRoomCaptures.add(
    //   A1lib.encodeImageString(img, 0, 0, img.width, img.height)
    // )
    for (const key of KEY_HL_ICONS) {
      const matches = JSON.parse(alt1.bindFindSubImg(bind, key.icon, key.width, 0, 0, room.width, room.height));
      const match = matches[0];

      if (match) {
        room.state = "key"

        myKeys.add(key.name.toLowerCase());
        room.color = SETTINGS.colorKeyYes
        break;
      }
    }

    if (room.state !== "key") {
      for (const key of KEY_ICONS) {
        const matches = JSON.parse(alt1.bindFindSubImg(bind, key.icon, key.width, 0, 0, room.width, room.height));
        const match = matches[0];

        // if we have the key, set the color to green, oterwise set to red
        if (match) {
          room.state = "key"
          room.color = myKeys.has(key.name.toLowerCase()) ?
            SETTINGS.colorKeyYes :
            SETTINGS.colorKeyNo

          break;
        }
      }
    }
  }
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

function showStats() {
  let visited = 0;
  let unknown = 0;
  let locked = 0;
  let keys = 0;

  let deadEnds = 0;
  let branches = 0;

  let unreachable = 0;

  getUnreachableRooms()


  let rpm = "-";

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
          locked++;
          break;
        case "key":
          keys++;
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


  const total = visited + unknown + locked + keys;

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
      rpm = (visited / minutes).toFixed(2);
    }
  }


  if (dungeonStartTime && completion > 0) {

    const elapsedSeconds = Math.floor((Date.now() - dungeonStartTime) / 1000);

    const mins = Math.floor(elapsedSeconds / 60);

    const secs = elapsedSeconds % 60;

    elapsed = `${mins}:${secs.toString().padStart(2, "0")}`;

    const projectedTotal = elapsedSeconds / (completion / 100);

    const projectedMins = Math.floor(projectedTotal / 60);

    const projectedSecs = Math.floor(projectedTotal % 60);

    projected = `${projectedMins}:${projectedSecs.toString().padStart(2, "0")}`;

    if (!failedGoal && elapsedSeconds > TARGET_TIME_SECONDS && TARGET_TIME_SECONDS > 0) {
      failedGoal = true;
      alt1.setTooltip("Too slow");
    }
  }

  document.getElementById("statVisited").innerText = visited;
  document.getElementById("statUnknown").innerText = unknown;
  document.getElementById("statLocked").innerText = keys + " keys + " + locked + " locked";
  document.getElementById("statUnreachable").innerText = unreachable;

  document.getElementById("statDeadEnds").innerText = deadEnds;
  document.getElementById("statBranches").innerText = branches;

  document.getElementById("statCompletion").innerText = completion;
  document.getElementById("statTime").innerText = elapsed;
  document.getElementById("statProjected").innerText = projected;
  document.getElementById("statRPM").innerText = rpm;

}



function getUnreachableRooms() {

  const fakeGrid = structuredClone(grid);

  const directions = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1]
  ];

  let changed = true;

  while (changed) {

    changed = false;
    const toLock = [];

    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {

        const room = fakeGrid[row][col];

        // locked/key become visited
        if (
          room.state === "locked" ||
          room.state === "key"
        ) {

          room.state = "visited";

          // spread into neighbors
          for (const [dr, dc] of directions) {

            const nr = row + dr;
            const nc = col + dc;

            if (
              nr < 0 ||
              nr >= GRID_HEIGHT ||
              nc < 0 ||
              nc >= GRID_WIDTH
            ) {
              continue;
            }

            const neighbor =
              fakeGrid[nr][nc];

            if (!neighbor) {
              continue;
            }

            // unknown becomes locked
            if (
              neighbor.state === "unknown"
            ) {

              toLock.push(neighbor);
            }
          }
        }
      }
    }

    for (const room of toLock) {
      room.state = "locked";
      changed = true;
    }
  }

  let unreachable = 0;
  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      const room = fakeGrid[row][col];

      if (room.state === "unknown") {
        grid[row][col].state = "unreachable"

        // debug overlay
        //alt1.overLayRect(0xffff00ff, room.x, room.y, room.width, room.height, 200, 1);

      }
    }
  }

}


function scanAdjacentSkillDoors(skill) {


  console.log(skill)
  const playerRoom = scanPlayerRoom();
  console.log(playerRoom)
  // alt1.overLayRect(0xff0000ff, playerRoom.x, playerRoom.y, playerRoom.width, playerRoom.height, 1000, 2);

  if (!playerRoom) {
    return [];
  }

  const matchesFound = [];

  const directions = [
    ["north", -1, 0],
    ["east", 0, 1],
    ["south", 1, 0],
    ["west", 0, -1]
  ];

  for (const [dir, dr, dc] of directions) {

    const row = playerRoom.row + dr;
    const col = playerRoom.col + dc;

    // bounds checks
    if (row < 0 || row >= GRID_HEIGHT || col < 0 || col >= GRID_WIDTH) {
      continue;
    }

    const room = grid[row][col];

    if (!room) {
      continue;
    }

    const bind = alt1.bindRegion(room.x, room.y, room.width, room.height);
    const matches = JSON.parse(alt1.bindFindSubImg(bind, skill.icon, skill.width, 0, 0, room.width, room.height));

    if (matches.length > 0) {

      room.skill = skill.name;
      matchesFound.push({ direction: dir, room, match: matches[0] });
    }
  }

  return matchesFound;
}


/*
GUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
*/


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

const SETTING_CHANGED_HANDLERS = {
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

  const findChat = setInterval(() => {
    if (reader.pos === null) reader.find();
    else {
      clearInterval(findChat);
      reader.pos.mainbox = reader.pos.boxes[0];
      showSelectedChat(reader.pos);

      document.getElementById("debugChatStatus").innerText = "Chat: Found";
      chatInterval = setInterval(() => {
        readChatbox();
      }, 200);
    }
  }, 1000);

  scanInterface();
  scanMapButton();

});

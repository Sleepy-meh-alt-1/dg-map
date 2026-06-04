const ROOMS = [

  // -------- LOCKED
  {
    state: "locked",
    corridors: ["east"],
    // icon: "ESo8/xg1S/8TLkH/GDVL/xo4Tv8cPFP/FTFF/xw8U/8YNUv/FjNJ/yVNaf8mUG3/ESo8/xg1S/8RKjz/Iklk/yFGYf8TLkH/GjhO/xo4Tv8hRmH/IUZh/xUxRf8RKjz/Iklk/yFGYf8cPFP/HkFa/xEqPP8lTWn/KVRy/yVNaf8YNUv/FTFF/yFEXf8iSWT/",
    // Cut out bottom left 3x3 to avoid '?' icon
    icon: "CSU5/xEySv8LKj//ETJK/xM1Tf8WOVL/DS1D/xY5Uv8RMkr/DjBH/yBMaf8hT23/CSU5/xEySv8JJTn/HEdk/xtEYf8LKj//AAAAAAAAAAAAAAAAG0Rh/w0tQ/8JJTn/AAAAAAAAAAAAAAAAGD9a/wklOf8gTGn/AAAAAAAAAAAAAAAADS1D/xtCXf8cR2T/",
    width: 6,
    height: 6
  },
  {
    state: "locked",
    corridors: ["south"],
    icon: "ECY4/xAmOP8RKjz/ECY4/w4mOP8QJjj/ESo8/xUxRf8RKjz/FTFF/xEqPP8RKjz/HDxT/xYzSf8VMUX/ESo8/xEqPP8VMUX/IURd/yJJZP8WM0n/ESo8/xUxRf8TLkH/GDVL/yFEXf8cPFP/IUZh/yFEXf8cPFP/HDxT/yFGYf8cPFP/IURd/yFEXf8aOE7/",
    width: 6,
    height: 6
  },
  {
    state: "locked",
    corridors: ["north"],
    icon: "CiAu/wkeLf8JHi3/CR4t/wkeLf8JHi3/HDxT/xw8U/8YNUv/GjhO/xw8U/8cPFP/HDxT/xg1S/8cPFP/HDxT/xw8U/8hRF3/GDVL/xo4Tv8cPFP/ESo8/xMuQf8RKjz/GDVL/yFEXf8cPFP/ESo8/wsiMv8hRF3/Ey5B/xw8U/8VMUX/ECY4/xEqPP8hRF3/",
    width: 6,
    height: 6
  },
  {
    state: "locked",
    corridors: ["west"],
    icon: "ESo8/xUxRf8TLkH/FTFF/xEqPP8LIjL/CR4t/xYzSf8cPFP/FjNJ/xEqPP8KIC7/HDxT/xo4Tv8YNUv/Ey5B/xEqPP8JHi3/JU1p/yJJZP8dPlj/Ey5B/xAmOP8JHi3/JU1p/xw8U/8cPFP/Ey5B/w4oOv8KIC7/IUZh/xUxRf8eQVr/Ey5B/w4oOv8KIC7/",
    width: 6,
    height: 6
  },


  // -------- VISITED
  {
    state: "visited",
    corridors: ["south"],
    icon: "FTFF/xMtQf8VMUX/FTFF/xMtQf8TLUH/HkFa/x5BWv8eQVr/HkFa/xk4Tv8WNEn/KVRy/ylUcv8kTWn/I0lk/zBZdf8bPFP/MWKE/zFihP8xYoT/L2B//zBZdf8eQVr/MWKE/y1be/8xYoT/LmCB/zBZdf8jSWT/MWKE/zFihP8xYoT/MWKE/zBZdf8eQVr/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["west"],
    icon: "GzxT/xs8U/8bPFP/GzxT/xMtQf8LIjL/I0lk/yNJZP8jSWT/HkFa/xY0Sf8LIjL/MmaJ/yRNaf8jSWT/GzxT/xY0Sf8LIjL/MmaJ/zFihP8pVHL/GzxT/xUxRf8LIjL/MWKE/ytYdv8mUG3/GzxT/xMtQf8LIjL/MWKE/zFihP8pVHL/GzxT/xMtQf8LIjL/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["west", "south"],
    icon: "ECo9/xAqPf8QKj3/ECo9/xAqPf8QKj3/CyIy/xUxRf8TLUH/CR0r/xUxRf8QKj3/GDVL/xg1S/8YNUv/GDVL/xs8U/8VMUX/I0lk/yRNaf8kTWn/I0lk/yNJZP8mUnD/I0lk/y1be/8pVHL/JE1p/ylRbP8mUG3/LVt7/ylUcv8tW3v/KVFs/ylUcv8mUnD/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["west", "east"],
    icon: "KVRy/ylUcv8pVHL/I0lk/yNJZP8WNEn/KVRy/ylUcv8pVHL/KVRy/xs8U/8bPFP/Om2Q/zRpjP86bZD/OWqM/z1wkv8pUWz/OGaF/zFihP86bZD/Om2Q/zptkP8oTmn/Om2Q/zlqjP85aoz/OGaF/zptkP8pUWz/KVRy/zlqjP85aoz/OWqM/zptkP8pUWz/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["west", "east", "south"],
    icon: "ECo9/xAqPf8QKj3/ECo9/xAqPf8QKj3/IUZg/xk4Tv8YNUv/GDVL/xk4Tv8ZOE7/KVFs/ylRbP8pUWz/KVFs/ylRbP8pUWz/NGmM/zRpjP8xYoT/NGmM/zRpjP8pUWz/MWKE/zRpjP8xYoT/K1h2/zRpjP8pUWz/MmaJ/zFihP80aYz/NmuQ/zRpjP8pUWz/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["west", "north"],
    icon: "KVFs/ylUcv8pVHL/KVFs/yFGYP8oTmn/OWqM/zlqjP8xYoT/MFl1/zhmhf8jSWT/OWqM/zNgfv85aoz/OWqM/yFCVv8gPlT/OWqM/zlqjP8wWXX/MVdu/zNgfv8hRmD/NGmM/zNgfv85aoz/OWqM/ylRbP8hRF3/NGmM/zFihP8xXXv/M2B+/ylRbP8hRF3/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["west", "north", "south"],
    icon: "KVFs/ylRbP8pUWz/KVFs/xg1S/8QKj3/NGmM/zRpjP80aYz/KVFs/xk4Tv8QKj3/LVt7/ylRbP80aYz/KVFs/xk4Tv8QKj3/NGmM/zRpjP8xYoT/KVFs/xk4Tv8QKj3/NGmM/zFihP8tW3v/KVFs/xk4Tv8QKj3/LVt7/ytYdv8xYoT/KVFs/yFGYP8QKj3/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["west", "north", "east"],
    icon: "JlJw/yZScP8pVHL/JlBt/ylUcv8hRF3/MWKE/zFihP8tW3v/MWKE/yZScP8hRF3/Ll6A/yRNaf8xYoT/MWKE/yZScP8hRmD/MmaJ/y1be/8yZon/MWKE/ylUcv8eQVr/MWKE/zFihP8uXoD/MWKE/yZScP8bPFP/MWKE/ylUcv8xYoT/MWKE/yZScP8eQVr/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["west", "north", "east", "south"],
    icon: "IURd/yFEXf8hRF3/IURd/xs8U/8bPFP/JlBt/yZQbf8mUG3/JE1p/yRNaf8eQVr/MWKE/y1be/8pUWz/LVt7/yNJZP8mUnD/LVt7/y1be/8xYoT/MWKE/y1be/8mUnD/MWKE/zFihP8rWHb/K1h2/zFihP8mUnD/LVt7/ylUcv8kTWn/LVt7/y5ggf8mUnD/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["east"],
    icon: "IURd/yFEXf8hRF3/IURd/x5BWv8hRF3/MWKE/zFihP8jSWT/KVRy/zFihP8yZon/MWKE/zBfgP8pVHL/MWKE/y1be/8tW3v/MWKE/zFihP8xYoT/MF+A/y1be/8uXoD/MWKE/zFihP8tW3v/Ll6A/y1be/8xYoT/KVRy/zFihP8xYoT/MWKE/zFihP8tW3v/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["east", "south"],
    icon: "FjRJ/xY0Sf8WNEn/FjRJ/xs8U/8ZOE7/HkFa/yFGYP8hRmD/IURd/yNJZP8jSWT/JlJw/ytYdv8tW3v/LVt7/y1be/8pUWz/MmaJ/zJmif8xYoT/Om2Q/zJmif80aYz/NGmM/zlqjP85aoz/NGmM/zlqjP80aYz/OWqM/zptkP8xYoT/NGmM/zlqjP8xYoT/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["north"],
    icon: "CyIy/wsiMv8LIjL/CyIy/wsiMv8LIjL/IURd/yFEXf8hRF3/IURd/yFEXf8hRF3/KVRy/yNJZP8pVHL/KVRy/ylUcv8wWXX/KVFs/ylUcv8rWHb/IUZg/yNJZP8wWXX/KVFs/ylUcv8rWHb/IUZg/yNJZP8wWXX/KVRy/ylUcv8pUWz/GzxT/ytYdv8wWXX/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["north", "south"],
    icon: "JE1p/yRNaf8kTWn/JE1p/xs8U/8VMUX/LVt7/zJmif8yZon/MWKE/xs8U/8kTWn/LVt7/zJmif8xYoT/MmaJ/yZQbf8jSWT/MmaJ/zFihP8yZon/JE1p/yZScP8kTWn/K1h2/zFihP8xYoT/K1h2/yZScP8mUG3/KVRy/zJmif8yZon/MmaJ/yZQbf8mUG3/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["north", "east"],
    icon: "Om2Q/zptkP8yZon/PXCS/ylRbP8jSWT/MmaJ/zFihP80aYz/KVFs/y1be/8jSWT/MWKE/zRpjP8xYoT/MWKE/zFde/8jSWT/MV17/y1be/80aYz/MmaJ/y1be/8jSWT/NGmM/zFihP80aYz/MWKE/zFde/8jSWT/NGmM/zFde/8xXXv/MWKE/ylUcv8jSWT/",
    width: 6,
    height: 6
  },
  {
    state: "visited",
    corridors: ["north", "east", "south"],
    icon: "JE1p/yRNaf8kTWn/I0lk/x5BWv8bPFP/MWKE/zFihP8xYoT/MWKE/yRNaf8kTWn/MmaJ/ylUcv8xYoT/MWKE/zFihP8pVHL/MWKE/y1be/8xYoT/MmaJ/zBfgP8pVHL/MWKE/zFihP8rWHb/MWKE/zFihP8pVHL/MmaJ/zFihP8yZon/MWKE/y5egP8pVHL/",
    width: 6,
    height: 6
  }
]

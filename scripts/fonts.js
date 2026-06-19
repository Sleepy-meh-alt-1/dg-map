const FONTS = {};

(async () => {
  const img = await A1lib.ImageDetect.imageDataFromUrl("/fonts/chatbox/12pt.data.png");

  FONTS.chatbox_12pt = OCR.loadFontImage(
    img,
    {
      "basey": 9,
      "spacewidth": 3,
      "treshold": 0.5,
      "color": [
        127,
        169,
        255
      ],
      "unblendmode": "removebg",
      "shadow": false,
      "chars": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%/+?!@#$^~&*()_-=[]{}:;\"'<>\\.,|",
      "seconds": ",.-:;\"'"
    }
  );
})();

from pathlib import Path
from PIL import Image

INPUT_DIR = Path(r"./images/rooms/highlighted keys")
OUTPUT_DIR = Path(r"./images/rooms/cropped")

OUTPUT_DIR.mkdir(exist_ok=True)

for image_path in INPUT_DIR.glob("*.png"):

    img = Image.open(image_path)

    crop_box = (0, 0, 29, 29)

    filename = image_path.name.lower()

    if "corner" in filename:
        crop_box = (7,10,12,16)

    if "crescent" in filename:
        crop_box = (5,13,16,16)

    if "diamond" in filename:
        crop_box = (14,12,18,24)

    if "pentagon" in filename:
        crop_box = (5,8,13,12)

    if "rectangle" in filename:
        crop_box = (9,9,18,20)

    if "shield" in filename:
        crop_box = (5,7,17,12)

    if "triangle" in filename:
        crop_box = (10,17,18,24)

    if "wedge" in filename:
        crop_box = (11,7,15,23)

    cropped = img.crop(crop_box)

    output_path = OUTPUT_DIR / image_path.name
    cropped.save(output_path)

    print(f"Processed {image_path.name}")
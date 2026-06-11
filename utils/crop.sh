#!/usr/bin/env bash

declare -A HL_CROPS=(
    [corner]="5x10+13+13"
    [crescent]="6x9+10+13"
    [diamond]="12x2+12+16"
    [pentagon]="4x12+16+14"
    [rectangle]="8x14+9+9"
    [shield]="15x5+10+14"
    [triangle]="8x8+10+17"
    [wedge]="5x16+11+7"
)

DIR="./images/rooms/highlighted keys"
mkdir -p "$DIR/crops"
rm "$DIR/crops"/*.png

for image_path in "$DIR"/*.png; do
  filename=$(basename "$image_path")
  filename_lower=${filename,,}

  crop="29x29+0+0"

  for key in "${!HL_CROPS[@]}"; do
    [[ $filename_lower == *$key* ]] && {
      crop=${HL_CROPS[$key]}
      break
    }
  done

  convert "$image_path" -crop "$crop" +repage "$DIR/crops/$filename"
done

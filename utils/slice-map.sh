#!/usr/bin/env bash

mkdir -p tiles
# rm -f tiles/*.png

for img in *.png; do
  base="${img%.png}"

  for row in {0..7}; do
    for col in {0..7}; do
      x=$((13 + col * 32))
      y=$((14 + row * 32))

      mean=$(
        convert "$img" \
          -crop 29x29+"$x"+"$y" +repage \
          -colorspace Gray \
          -format "%[fx:mean]" info:
      )

      prefix=""
      awk -v m="$mean" 'BEGIN { exit !(m <= 0.10) }' && prefix="dark_"

      convert "$img" \
        -crop 29x29+"$x"+"$y" +repage \
        "tiles/${prefix}${base}_r${row}_c${col}.png"
    done
  done
done

#!/usr/bin/env bash

mkdir -p cropped
rm -f cropped/*.png

for f in *.png; do
  convert "$f" \
    -gravity NorthEast \
    -crop 6x6+2+2 \
    +repage \
    "cropped/$f"
done

mkdir -p grouped
rm -rf grouped/*

for f in cropped/*.png; do
  hash=$(convert "$f" rgba:- | sha256sum | cut -d' ' -f1)
  mkdir -p "grouped/$hash"
  cp "$f" "grouped/$hash/"
done

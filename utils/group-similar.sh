#!/usr/bin/env bash

mkdir -p grouped
rm -f grouped/*.png

for f in *.png; do
  hash=$(
    convert "$f" \
      -shave 2x2 \
      rgba:- |
    sha256sum |
    cut -d' ' -f1
  )
  mkdir -p "grouped/$hash"
  cp "$f" "grouped/$hash/"
done

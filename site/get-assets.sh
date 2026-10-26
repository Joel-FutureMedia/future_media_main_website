#!/bin/sh
# Run once from this folder: sh get-assets.sh  (Figma links expire ~7 days after export)
cd "$(dirname "$0")/assets"
P="https://www.figma.com/api/mcp/asset/04cfdf95-6510-46ec-afe6-5e5c250a4aeb"
g(){ curl -fsSL -o "$2" "$P/$1" || echo "FAILED $2"; }
g 7d916.png hero.png
g bfbfd.png card-1.png
g fe8c7.png card-2.png
g 4b9a4.png card-3.png
g a733c.svg offer-icon.svg
g 3d3c7.svg arrow-next.svg
g 7b2d1.svg arrow-prev.svg
g 65cb0.svg whatsapp.svg
g 972af.svg logo.svg
g 20201.svg brands-strip.svg
g ca081.svg search.svg

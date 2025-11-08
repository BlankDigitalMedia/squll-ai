#!/bin/bash
# Create minimal valid PNG files (1x1 pixel blue squares)
# These are placeholders - replace with proper icons later

# Minimal 1x1 blue PNG (base64 encoded)
# PNG signature + IHDR + IDAT + IEND
MINIMAL_PNG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

for size in 16 32 48 128; do
  echo "$MINIMAL_PNG" | base64 -d > "icon${size}.png"
done

echo "Created minimal placeholder icons"

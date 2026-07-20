from rembg import remove
from PIL import Image
import glob
import os

for file in glob.glob('assets/mascot_*.jpg'):
    print(f"Processing {file}...")
    input_img = Image.open(file)
    output_img = remove(input_img)
    out_file = file.replace('.jpg', '.png')
    output_img.save(out_file)
    print(f"Saved {out_file}")


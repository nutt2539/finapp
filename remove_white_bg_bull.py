from PIL import Image
import glob
import os
import sys

input_dir = sys.argv[1]
output_dir = sys.argv[2]

def make_white_transparent(img_path, out_path):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    threshold = 240
    for item in datas:
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(out_path, "PNG")

files = glob.glob(os.path.join(input_dir, 'mascot_*.jpg'))
# Sort by modification time so newer ones overwrite older ones
files.sort(key=os.path.getmtime)

for file in files:
    filename = os.path.basename(file)
    parts = filename.split('_')
    base_name = f"{parts[0]}_{parts[1]}.png"
    out_path = os.path.join(output_dir, base_name)
    
    print(f"Processing {file} -> {out_path}")
    make_white_transparent(file, out_path)
    print(f"Saved {out_path}")

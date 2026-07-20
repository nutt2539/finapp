from rembg import remove
from PIL import Image
import glob
import os

for file in glob.glob('/Users/nuttp./.gemini/antigravity/brain/0ada54a8-9cd0-43b3-8e97-682d41e6ac18/mascot_*.jpg'):
    filename = os.path.basename(file)
    parts = filename.split('_')
    # only process bulls (timestamp starts with 1784572)
    timestamp = parts[2].replace('.jpg', '')
    if timestamp.startswith('1784572'):
        base_name = f"{parts[0]}_{parts[1]}.png"
        out_path = os.path.join('/Users/nuttp./.gemini/antigravity/scratch/finance-dashboard/assets', base_name)
        
        print(f"Removing background for {file} -> {out_path}")
        try:
            input_img = Image.open(file)
            output_img = remove(input_img)
            output_img.save(out_path)
            print(f"Successfully saved {out_path}")
        except Exception as e:
            print(f"Error processing {file}: {e}")

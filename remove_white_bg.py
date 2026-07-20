from PIL import Image
import glob

def make_white_transparent(img_path):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    # threshold for near white
    threshold = 240
    for item in datas:
        # item is (R, G, B, A)
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            newData.append((255, 255, 255, 0)) # transparent
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(img_path.replace('.jpg', '.png'), "PNG")

for file in glob.glob('assets/mascot_*.jpg'):
    print(f"Processing {file}...")
    make_white_transparent(file)
    print(f"Saved PNG for {file}")

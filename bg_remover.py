from PIL import Image

def make_transparent(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    threshold = 240
    for item in datas:
        # white or near white becomes transparent
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")

make_transparent("/Users/nuttp./.gemini/antigravity/brain/0ada54a8-9cd0-43b3-8e97-682d41e6ac18/kuunnui_operator_1784620329633.jpg", "assets/kuunnui_operator.png")

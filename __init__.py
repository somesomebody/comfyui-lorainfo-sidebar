import os, base64, json, io
from PIL import Image
from aiohttp import web
from server import PromptServer
import folder_paths
from safetensors.torch import safe_open

# Recursively searches all .safetensors files in the loras folders
# Returns a JSON list containing each file’s index, filename, and absolute path
@PromptServer.instance.routes.get("/lorainfo_sidebar/get_lora_list")
async def get_lora_list(request) :
    lora_files = []

    lora_file_index = 1
    lora_folder_paths = folder_paths.get_folder_paths("loras")
    for lora_folder_path in lora_folder_paths :
        # Convert the given path to an absolute path
        lora_folder_abspath = os.path.realpath(lora_folder_path) 
        if os.path.exists(lora_folder_abspath) :
            for root, dirs, files in os.walk(lora_folder_abspath, followlinks=True):
                files.sort()

                for filename in files :
                    # Ignore hidden files
                    if filename.startswith('.') or filename.startswith('._'):
                        continue
                    
                    file_path = os.path.join(root, filename)
                    file_abspath = os.path.realpath(file_path)
                    if os.path.isfile(file_abspath) and filename.lower().endswith(('.safetensors')) :
                        lora_files.append({"index": lora_file_index, "filename": filename, "path": file_abspath})
                        lora_file_index = lora_file_index + 1

    return web.json_response(lora_files)


# Returns a LoRA preview iamge
@PromptServer.instance.routes.get("/lorainfo_sidebar/get_lora_preview/{requested_path}")
async def get_lora_preview(request) :
    requested_path = request.match_info["requested_path"]
    lora_info = {
        "img_content": None,
        "img_ext": None
    }
    img_exists = False
    img_exts = [".jpg", ".jpeg", ".png", ".webp"]

    # Split path of dir and file
    dir_path, filename_with_ext = os.path.split(requested_path)
    # Split file's name and extension
    filename, ext_safetensors = os.path.splitext(filename_with_ext)

    for ext in img_exts :
        if os.path.exists(os.path.join(dir_path, filename + ext)) :
            img_exists = True
            lora_info["img_content"] = resize_and_encode_image(os.path.join(dir_path, filename + ext), ext[1:])
            lora_info["img_ext"] = ext[1:]
            break

    if img_exists == False :
        lora_info["img_content"] = resize_and_encode_image(os.path.dirname(__file__) + "\\img\\no_preview_img.png", "png")
        lora_info["img_ext"] = "png"

    return web.json_response(lora_info)

# Resize the image to 200(width) x 300(height)
def resize_and_encode_image(path, ext) :
    with Image.open(path) as img :
        target_height = 300
        target_width = int(img.width / img.height * target_height)
        img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

        # Add a white background if the image width is less than 200 pixels
        if target_width < 200 :
            background = Image.new("RGB", (200, target_height), (255, 255, 255))
            paste_x = (200 - target_width) // 2
            background.paste(img, (paste_x, 0))
            img = background
            target_width = 200

        # Crop the image
        center_x = target_width // 2
        left = max(center_x - 100, 0)
        right = min(center_x + 100, target_width)
        cropped_img = img.crop((left, 0, right, target_height))

        # Convert the image to a base64 string and return it
        buffer = io.BytesIO()
        cropped_img.save(buffer, format=ext)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')

# Returns the LoRA metadata and JSON data
@PromptServer.instance.routes.get("/lorainfo_sidebar/get_lora_json/{requested_path}")
async def get_lora_info(request) :
    requested_path = request.match_info["requested_path"]

    # split path of dir and file
    dir_path, filename_with_ext = os.path.split(requested_path)
    # split file's name and extension
    filename, ext_safetensors = os.path.splitext(filename_with_ext)

    response = {}

    # Read the metadata of LoRA file
    with safe_open(os.path.join(dir_path, filename + ext_safetensors), framework="pt", device="cpu") as safetensors_file:
        response["metadata"] = safetensors_file.metadata()

    # Read the custom JSON file when its filename is the same as the LoRA filename
    try: 
        with open(os.path.join(dir_path, filename + ".json"), "r", encoding="utf-8") as custom_json_file:
            response["custom_json_file"] = json.load(custom_json_file)
    except Exception as e :
        response["custom_json_file"] = None

    # Read the rgthree JSON file
    try: 
        with open(os.path.join(dir_path, filename + ".safetensors.rgthree-info.json"), "r", encoding="utf-8") as rgthree_json_file:
            response["rgthree_json_file"] = json.load(rgthree_json_file)
    except Exception as e :
        response["rgthree_json_file"] = None

    return web.json_response(response)

# Saves the received LoRA JSON data
@PromptServer.instance.routes.post("/lorainfo_sidebar/save_lora_json")
async def save_lora_json(request) :
    try:
        data = await request.json()
        requested_path = data["path"]
        data = data["json_data"]

        # split path of dir and file
        dir_path, filename_with_ext = os.path.split(requested_path)
        # split file's name and extension
        filename, ext_safetensors = os.path.splitext(filename_with_ext)

        # Saves JSON data to the file
        with open(os.path.join(dir_path, filename + ".json"), "w", encoding="utf-8") as json_file:
            json.dump(data, json_file, ensure_ascii=False, indent=4)
            return web.Response(text="true")

        return web.Response(text="false")
    
    except Exception as e:
        return web.Response(text="false")

# ComfyUI Setting for custom nodes
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
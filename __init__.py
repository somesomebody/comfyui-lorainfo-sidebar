import os, base64, json, io
from PIL import Image
from aiohttp import web
from server import PromptServer
import folder_paths
from safetensors.torch import safe_open

@PromptServer.instance.routes.get("/lorainfo_sidebar/get_lora_list")
async def get_lora_list(request):
    lora_files = []

    lora_file_index = 1
    lora_folder_paths = folder_paths.get_folder_paths("loras")
    for lora_folder_path in lora_folder_paths:
        lora_folder_abspath = os.path.realpath(lora_folder_path)
        if os.path.exists(lora_folder_abspath):
            for root, dirs, files in os.walk(lora_folder_abspath, followlinks=True):
                files.sort()

                for filename in files:
                    if filename.startswith('.') or filename.startswith('._'):
                        continue
                    
                    file_path = os.path.join(root, filename)
                    file_abspath = os.path.realpath(file_path)
                    if os.path.isfile(file_abspath) and filename.lower().endswith(('.safetensors')):
                        lora_files.append({"index": lora_file_index, "filename": filename})
                        lora_file_index = lora_file_index + 1

    return web.json_response(lora_files)

@PromptServer.instance.routes.get("/lorainfo_sidebar/get_lora_preview/{requested_filename}")
async def get_lora_preview(request) :
    requested_filename = request.match_info["requested_filename"]
    lora_info = {
        "img_content": None,
        "img_ext": None
    }
    img_exists = False
    img_exts = [".jpg", ".jpeg", ".png", ".webp"]

    lora_folder_paths = folder_paths.get_folder_paths("loras")

    for lora_folder_path in lora_folder_paths:
        lora_folder_abspath = os.path.realpath(lora_folder_path)
        if os.path.exists(lora_folder_abspath):
            for root, dirs, files in os.walk(lora_folder_abspath, followlinks=True):
                for filename in files:
                    if os.path.splitext(filename)[0].strip() == requested_filename:
                        if os.path.splitext(filename)[1].strip().lower() in img_exts:
                            img_exists = True
                            lora_info["img_content"] = resize_and_encode_image(os.path.join(root, filename), os.path.splitext(filename)[1].strip()[1:])
                            lora_info["img_ext"] = os.path.splitext(filename)[1].strip()[1:]
                            break
                if img_exists == True: break
        if img_exists == True: break

    if img_exists == False:
        lora_info["img_content"] = resize_and_encode_image(os.path.dirname(__file__) + "\\img\\no_preview_img.png", "png")
        lora_info["img_ext"] = "png"

    return web.json_response(lora_info)

def resize_and_encode_image(path, ext):
    with Image.open(path) as img:
        target_height = 300
        target_width = int(img.width / img.height * target_height)
        img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

        if target_width < 200:
            background = Image.new("RGB", (200, target_height), (255, 255, 255))
            paste_x = (200 - target_width) // 2
            background.paste(img, (paste_x, 0))
            img = background
            target_width = 200

        center_x = target_width // 2
        left = max(center_x - 100, 0)
        right = min(center_x + 100, target_width)
        cropped_img = img.crop((left, 0, right, target_height))
        buffer = io.BytesIO()
        cropped_img.save(buffer, format=ext)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')

@PromptServer.instance.routes.get("/lorainfo_sidebar/get_lora_json/{requested_filename}")
async def get_lora_json(request):
    requested_filename = request.match_info["requested_filename"]

    lora_folder_paths = folder_paths.get_folder_paths("loras")

    for lora_folder_path in lora_folder_paths:
        lora_folder_abspath = os.path.realpath(lora_folder_path)
        if os.path.exists(lora_folder_abspath):
            for root, dirs, files in os.walk(lora_folder_abspath, followlinks=True):
                for filename in files:
                    if filename.lower().endswith(".json"):
                        if requested_filename == os.path.splitext(filename)[0].strip():
                            filepath_no_ext = os.path.join(root, requested_filename)
                            json_content = {}

                            with safe_open(filepath_no_ext + ".safetensors", framework="pt", device="cpu") as safetensors_file:
                                json_content["metadata"] = safetensors_file.metadata()

                            with open(filepath_no_ext + ".json", "r", encoding="utf-8") as json_file:
                                json_content["json_file"] = json.load(json_file)

                            return web.json_response(json_content)

    return web.json_response(None)

@PromptServer.instance.routes.post("/lorainfo_sidebar/save_lora_json")
async def save_lora_json(request):
    try:
        data = await request.json()
        requested_filename = data["filename"]
        del data["filename"]

        lora_folder_paths = folder_paths.get_folder_paths("loras")

        for lora_folder_path in lora_folder_paths:
            lora_folder_abspath = os.path.realpath(lora_folder_path)
            if os.path.exists(lora_folder_abspath):
                for root, dirs, files in os.walk(lora_folder_abspath, followlinks=True):
                    for filename in files:
                        if requested_filename == os.path.splitext(filename)[0].strip():
                            print("check")
                            with open(root + "\\" + requested_filename + ".json", "w", encoding="utf-8") as json_file:
                                json.dump(data, json_file, ensure_ascii=False, indent=4)
                                return web.Response(text="true")

        return web.Response(text="false")
    except Exception as e:
        print(e)
        return web.Response(text="false")
    
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
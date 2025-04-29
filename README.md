# comfyui-lorainfo-sidebar

![Preview](readme_img/01.png)

## Description 
**LoRA Info Sidebar** allows you to preview images of LoRA files and edit their associated JSON files

## Installation
1. Goto `ComfyUI/custom_nodes` in terminal 
2. `git clone https://github.com/somesomebody/comfyui-lorainfo-sidebar.git`
3. Restart the ComfyUI

**OR**

If ComfyUI Manager already installed
1. search `comfyui-lorainfo-sidebar` and install 
2. Restart the ComfyUI

## Usage
- This extension scans the `models/loras` folder for `.safetensors`, `.ckpt`, and `.pt` files.
- The JSON and preview image filenames must match the LoRA file's name.
- You can add a preview image and a JSON file in the same directory as the LoRA file.
- You can edit the JSON file like this:
![Preview](readme_img/02.png)
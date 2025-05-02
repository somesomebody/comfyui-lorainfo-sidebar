import { app } from "../../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { $el } from "../../../scripts/ui.js";

class LoRAInfo_SideBar {
    constructor(app) {
        this.app = app;

        this.controlPanel = this.createControlPanel();
        this.galleryContainer = this.createGalleryContainer();

        this.element = $el("div.lorainfo-sidebar", {
            draggable: false
        }, [
            $el("div.lorainfo-sidebar-content", {
                draggable: false
            }, [
                $el("h3.lorainfo-title", "LoRA Info SideBar"),
                this.controlPanel,
                this.galleryContainer
            ])
        ]);

        this.createStyle();

        this.loadLoraGallery();

        document.body.appendChild(
            $el("div.lorainfo-sidebar-overlay", {
                draggable: false,
                style: {
                    display: "none"
                },
                onclick: (e) => {
                    if (e.target == document.getElementsByClassName("lorainfo-sidebar-overlay")[0]) {
                        document.getElementsByClassName("lorainfo-sidebar-overlay")[0].style.display = "none";
                        document.getElementsByClassName("lorainfo-sidebar-modal")[0].style.display = "none";
                    }
                }
            }, [
                $el("div.lorainfo-sidebar-modal", {
                    draggable: false,
                    style: {
                        display: "none"
                    },
                }, [
                    $el("div.lorainfo-sidebar-modal-header", [
                        $el("h2.lorainfo-sidebar-modal-title", {
                            innerHTML: "Test Title", 
                            style: {
                                display: "inline-block"
                            }
                        }),
                        $el("button.lorainfo-sidebar-modal-close", {
                            innerHTML: "&#x2715;",
                            onclick: () => {
                                document.getElementsByClassName("lorainfo-sidebar-overlay")[0].style.display = "none";
                                document.getElementsByClassName("lorainfo-sidebar-modal")[0].style.display = "none";
                            }
                        })
                    ]), 
                    $el("hr.lorainfo-sidebar-modal-hrline"),
                    $el("img.lorainfo-sidebar-modal-preview"), 
                    $el("div.lorainfo-sidebar-modal-contentContainer"),
                    $el("button.lorainfo-sidebar-modal-addContent", {
                        innerHTML: "Add Key-Value",
                        onclick: (e) => this.addKeyValue(e)
                    }),
                    $el("hr.lorainfo-sidebar-modal-hrline"),
                    $el("div.lorainfo-sidebar-modal-footer", [
                        $el("button.lorainfo-sidebar-modal-save", {
                            innerHTML: "Save",
                            onclick: () => this.saveJSON()
                        })
                    ])
                ])
            ])
        );
    }

    async createStyle() {
        try {
            const response = await fetch('./extensions/comfyui-lorainfo-sidebar/css/lorainfo-sidebar.css');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const css = await response.text();
            const styleElement = document.createElement('style');
            styleElement.textContent = css;
            document.head.appendChild(styleElement);
        } catch (error) {
            console.error('Error loading LoRA Sidebar styles:', error);
        }
    }

    createControlPanel() {
        const controlPanelContainer = $el("div.control-panel-container", [
            $el("input.search-input", {
                type: "text",
                placeholder: "Search LoRA's File Name",
                value: "",
                oninput: () => this.searchLora()
            }),
            $el("button.search-clear", {
                innerHTML: "&#x2715;",
                title: "Clear Search",
                onclick: () => {
                    const searchInput = this.element.querySelector('.search-input');
                    searchInput.value = '';
                    this.loadLoraGallery();
                }
            }),
            $el("button.reload", {
                innerHTML: "&#x21BB;",
                title: "Reload Gallery",
                onclick: () => this.loadLoraGallery()
            })
        ]);
        return controlPanelContainer;
    }

    createGalleryContainer() {
        this.galleryContainer = $el("div.lora-gallery-container", {
            draggable: false,            
        });
        return this.galleryContainer;
    }

    loadLoraGallery() {
        this.galleryContainer.innerHTML = "";
        this.controlPanel.querySelector('.search-input').value = "";

        this.getLoraList().then(data => {
            const previewPromises = data.map(({index, filename}) => {
                return this.getLoraPreview(filename).then(preview_data => {
                    const previewConainer = $el("div.preview-container", {
                        draggable: false,
                        id: filename,
                        dataset: {
                            "index": index
                        }
                    });

                    const infoButton = $el("button.info-button", {
                        innerHTML: "Info",
                        onclick: (e) => this.displayLoraEditModal(e)
                    });
                    previewConainer.appendChild(infoButton);

                    const previewImage = $el("img.preview-image");
                    previewImage.src = `data:image/${preview_data["ext"]};base64,${preview_data["content"]}`;
                    previewConainer.appendChild(previewImage);

                    const previewTextContainer = $el("div.preview-text-container", {
                        draggable: false
                    }, [
                        $el("p.preview-text", {
                            innerHTML: filename
                        })
                    ]);

                    previewConainer.appendChild(previewTextContainer);
                    this.galleryContainer.appendChild(previewConainer);
                });
            });

            Promise.all(previewPromises).then(() => {
                const children = Array.from(this.galleryContainer.children);

                children.sort((a, b) => {
                    const aIndex = parseInt(a.dataset.index || "0", 10);
                    const bIndex = parseInt(b.dataset.index || "0", 10);
                    return aIndex - bIndex;
                });

                this.galleryContainer.innerHTML = "";
                children.forEach(child => this.galleryContainer.appendChild(child));
            });
        });
    }

    async getLoraList() {
        try {
            const response = await api.fetchApi("/lorainfo_sidebar/get_lora_list");
            if (response.ok) {
                let result = []
                const data = await response.json();
                data.forEach(item => {
                    result.push({"index": item["index"], "filename": item["filename"].slice(0, item["filename"].lastIndexOf("."))});
                })
                return result;
            }
        } catch (error) {
            console.error("[LoRA Info SideBar - Error: getLoraList]", error);
            return null; 
        }
    }

    async getLoraPreview(filename) {
        try {
            const encodedFilename = encodeURIComponent(filename);
            const response = await api.fetchApi(`/lorainfo_sidebar/get_lora_preview/${encodedFilename}`);
            if (response.ok) {
                const data = await response.json();
                return {"content": data["img_content"], "ext": data["img_ext"]};
            }
        } catch (error) {
            console.error("[LoRA Info SideBar - Error: getLoraInfo]", error);
            return null; 
        }
    }

    searchLora() {
        const searchText = document.getElementsByClassName("search-input")[0].value;
        if (searchText == "") {
            for (const child of this.galleryContainer.children) {
                child.style.display = "block";
            }
        } else {
            for (const child of this.galleryContainer.children) {
                if (child.id.toLowerCase().includes(searchText)) {
                    child.style.display = "block";
                } else {
                    child.style.display = "none";
                }
            }
        }
    }

    displayLoraEditModal(e) {
        document.getElementsByClassName("lorainfo-sidebar-overlay")[0].style.display = "block";
        document.getElementsByClassName("lorainfo-sidebar-modal")[0].style.display = "block";
        
        const previewContainer = e.target.parentElement;
        const modal = document.getElementsByClassName("lorainfo-sidebar-modal")[0];

        modal.children[0].children[0].innerHTML = previewContainer.id;

        modal.children[2].src = previewContainer.children[1].src;

        const contentContainer = modal.children[3];
        contentContainer.innerHTML = "";
        this.getLoraJSON(previewContainer.id).then(data => {
            if (data != null) {
                for (const [key, value] of Object.entries(data)) {
                    contentContainer.appendChild(
                        $el("div.lorainfo-sidebar-modal-content", [
                            $el("input.lorainfo-sidebar-modal-content-key", {
                                value: key
                            }),
                            $el("textarea.lorainfo-sidebar-modal-content-value", {
                                innerHTML: value
                            }),
                            $el("button.lorainfo-sidebar-modal-delete-content", {
                                innerHTML: "&#x2715;",
                                onclick: (e) => this.deleteKeyValue(e)
                            })
                        ])
                    );
                }
            }
        });
    }

    async getLoraJSON(filename) {
        try {
            const encodedFilename = encodeURIComponent(filename);
            const response = await api.fetchApi(`/lorainfo_sidebar/get_lora_json/${encodedFilename}`);
            if (response.ok) {
                const data = await response.json();
                return data;
            }
        } catch (error) {
            console.error("[LoRA Info SideBar - Error: getLoraJSON]", error);
            return null; 
        }
    }

    addKeyValue(e) {
        e.target.parentElement.children[3].appendChild(
            $el("div.lorainfo-sidebar-modal-content", [
                $el("input.lorainfo-sidebar-modal-content-key"),
                $el("textarea.lorainfo-sidebar-modal-content-value"),
                $el("button.lorainfo-sidebar-modal-delete-content", {
                    innerHTML: "&#x2715;",
                    onclick: (e) => this.deleteKeyValue(e)
                })
            ])
        );
    }

    deleteKeyValue(e) {
        const check = confirm("Do you want to delete this item?");
        if (check) {
            e.target.parentElement.remove();
        }
    }

    async saveJSON() {
        let json_info = {};
        const contentContainer = document.getElementsByClassName("lorainfo-sidebar-modal-contentContainer")[0];
        for (const content of contentContainer.children) {
            const key = content.children[0].value;
            const value = content.children[1].value;
            if (key == "") {
                alert("Key is empty");
                return ;
            } 
            if (value == "") {
                alert("Value is empty");
                return ;
            }
            json_info[key] = value;
        }

        const filename = document.getElementsByClassName("lorainfo-sidebar-modal-title")[0].innerHTML;
        json_info["filename"] = filename;
        try {
            const response = await api.fetchApi("/lorainfo_sidebar/save_lora_json", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(json_info)
            });

            if (response.ok) {
                const text = await response.text();
                if (text == "true") {
                    alert("Success to save JSON");
                } else {
                    alert("Fail to save JSON");
                }
            } else {
                console.error("[LoRA Info SideBar - Error: saveJSON] request was sent but failed");
            }
        } catch (error) {
            console.error("[LoRA Info SideBar - Error: saveJSON]", error);
        }
    }
}

app.registerExtension({
    name: "comfy.LoRAInfo.SideBar",
    async setup() {
        // create tab
        const LoRAInfo = new LoRAInfo_SideBar(app);
        app.LoRAInfo = LoRAInfo;
        app.extensionManager.registerSidebarTab({
            id: "LoRAInfo_SideBar",
            icon: "pi pi-th-large",
            title: "LoRA Info",
            tooltip: "LoRA Info",
            type: "custom",
            render: (el) => {
                el.appendChild(LoRAInfo.element);
            }
        });
    }, 
});
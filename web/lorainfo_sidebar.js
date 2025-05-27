import { app } from "../../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { $el } from "../../../scripts/ui.js";

class LoRAInfo_SideBar {
    constructor(app) {
        this.app = app;

        // Dict for JSON editing
        this.keyIndex = 0;
        this.keyDict = {};
        this.valueIndex = 0;
        this.valueDict = {};

        // Load CSS
        this.createStyle();

        // Create sidebar elements
        this.controlPanel = this.createControlPanel();
        this.gallery = $el("div.lorainfo-gallery");

        // Create a sidebar
        this.element = $el("div.lorainfo-sidebar", {
            draggable: false
        }, [
            $el("div.lorainfo-sidebar-content", {
                draggable: false
            }, [
                $el("h1.lorainfo-title", "LoRA Info SideBar"),
                this.controlPanel,
                this.gallery,
                $el("div.lorainfo-spinnerContainer", [
                    $el("p.lorainfo-spinner-text", {
                        innerHTML: "Loading LoRA Info SideBar ....."
                    }),
                    $el("div.lorainfo-spinner")
                ])
            ])
        ]);

        // Create a modal
        this.modal = this.createModal();

        // Load a sidebar
        this.loadLoRAGallery();
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // CSS
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    async createStyle() {
        try {
            // Request CSS from the server
            const response = await fetch('./extensions/lorainfo-sidebar/css/lorainfo-sidebar.css');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Create a <style> and append the CSS to it
            const css = await response.text();
            const styleElement = document.createElement('style');
            styleElement.textContent = css;

            // Append a <style> to <head>
            document.head.appendChild(styleElement);

        } catch (error) {
            console.error("Error loading LoRA Sidebar styles:", error);
            alert("[Custom Node: lorainfo-sidebar]\n⚠ Failed to load CSS styles. Some layout may look broken.");
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Sidbar elements
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Create a control panel that includes a search box, a clear button, and a reload button
    createControlPanel() {
        const controlPanelContainer = $el("div.control-panel-container", [
            // Search box
            $el("input.lorainfo-control-panel-search-input", {
                type: "text",
                placeholder: "Search LoRA's File Name",
                value: "",
                oninput: () => this.searchLora()
            }),
            // Clear button
            $el("button.search-clear", {
                innerHTML: "&#x2715;",
                title: "Clear Search",
                onclick: () => {
                    const searchInput = this.element.querySelector('.lorainfo-control-panel-search-input');
                    searchInput.value = '';
                    for (const child of this.gallery.children) {
                        child.style.display = "block";
                    }
                }
            }),
            // Reload button
            $el("button.reload", {
                innerHTML: "&#x21BB;",
                title: "Reload Gallery",
                onclick: () => {
                    this.element.children[0].children[3].style.display = "block";
                    this.loadLoRAGallery();
                }
            })
        ]);

        return controlPanelContainer;
    }

    // Search the LoRAs that contain the search term
    searchLora() {
        // Get the search term
        const searchTerm = document.getElementsByClassName("lorainfo-control-panel-search-input")[0].value;

        // Display all LoRAs if the search term is an empty string
        if (searchTerm == "") {
            for (const child of this.gallery.children) {
                child.style.display = "block";
            }
        } 
        // Display LoRAs that contain the search term
        else {
            for (const child of this.gallery.children) {
                if (child.id.toLowerCase().includes(searchTerm)) {
                    child.style.display = "block";
                } else {
                    child.style.display = "none";
                }
            }
        }
    }

    // Load LoRA preview images
    loadLoRAGallery() {
        // Clear LoRA gallery
        this.gallery.innerHTML = "";
        
        // Clear search box
        this.controlPanel.querySelector('.lorainfo-control-panel-search-input').value = "";

        // Get LoRA list
        this.getLoraList().then(data => {
            // Request LoRA preview image, name, and absolute path
            // Stores promises in previewPromises and runs a callback when each one resolves
            const previewPromises = data.map(({index, filename, path}) => {
                return this.getLoraPreviewImage(path).then(preview_data => {

                    // LoRA preview container
                    const previewContainer = $el("div.lorainfo-gallery-preview-container", {
                        draggable: false,
                        id: filename,
                        dataset: {
                            "index": index,
                            "path": path
                        }
                    });

                    // Button to display the LoRA information
                    const infoButton = $el("button.lorainfo-control-panel-info-button", {
                        innerHTML: "Info",
                        onclick: (e) => this.displayLoraEditModal(e)
                    });
                    previewContainer.appendChild(infoButton);

                    // Set a LoRA preview image
                    const previewImage = $el("img.preview-image");
                    previewImage.src = `data:image/${preview_data["ext"]};base64,${preview_data["content"]}`;
                    previewContainer.appendChild(previewImage);

                    // Constructs a LoRA preview container
                    const previewTextContainer = $el("div.preview-text-container", {
                        draggable: false
                    }, [
                        $el("p.preview-text", {
                            innerHTML: filename
                        })
                    ]);
                    previewContainer.appendChild(previewTextContainer);

                    // Add a LoRA preview container to the gallery
                    this.gallery.appendChild(previewContainer);
                });
            });

            // When all promises have resolved
            Promise.all(previewPromises).then(() => {
                // Sort the LoRA list using their index
                const children = Array.from(this.gallery.children);

                children.sort((a, b) => {
                    const aIndex = parseInt(a.dataset.index || "0", 10);
                    const bIndex = parseInt(b.dataset.index || "0", 10);
                    return aIndex - bIndex;
                });

                // Clear the gallery and reappend them
                this.gallery.innerHTML = "";
                children.forEach(child => this.gallery.appendChild(child));

                // Hide loading overlay
                this.element.children[0].children[3].style.display = "none";
            });
        });
    }

    // Get LoRA list
    async getLoraList() {
        try {
            // Request LoRA list
            const response = await api.fetchApi("/lorainfo_sidebar/get_lora_list");

            // Recieve the server response
            if (response.ok) {
                // Get LoRA list information
                const data = await response.json();

                // Construct LoRA list
                let result = [];
                data.forEach(item => {
                    result.push({
                        "index": item["index"], 
                        "filename": item["filename"].slice(0, item["filename"].lastIndexOf(".")),
                        "path": item["path"]
                    });
                });
                return result;
            }

        } catch (error) {
            console.error("[LoRA Info SideBar - Error: getLoraList]", error);
            return null; 
        }
    }

    // Get a LoRA preview image
    async getLoraPreviewImage(path) {
        try {
            // Encode the path before making a request
            const encodedPath = encodeURIComponent(path);

            // Send a request
            const response = await api.fetchApi(`/lorainfo_sidebar/get_lora_preview/${encodedPath}`);

            // Recieve the server response
            if (response.ok) {
                // Get a LoRA preview image and return it
                const data = await response.json();
                return {"content": data["img_content"], "ext": data["img_ext"]};
            }

        } catch (error) {
            console.error("[LoRA Info SideBar - Error: getLoraPreview]", error);
            return null; 
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // JSON edit modal window
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Create a modal window
    createModal() {
        // Modal window
        this.modal = $el("div.lorainfo-sidebar-modal", { 
            draggable: false,
            style: {
                display: "none",
                zIndex: 0
            },
        }, [
            // Header container
            $el("div.lorainfo-sidebar-modal-header", [
                // A title
                $el("h2.lorainfo-sidebar-modal-title", {
                    innerHTML: "Test Title", 
                    style: {
                        display: "inline-block"
                    }
                }),
                // Modal close button
                $el("button.lorainfo-sidebar-modal-close", {
                    innerHTML: "&#x2715;",
                    onclick: () => {
                        document.getElementsByClassName("lorainfo-sidebar-modal")[0].style.display = "none";
                        document.getElementsByClassName("lorainfo-sidebar-modal")[0].style.zIndex = 0;
                    }
                })
            ]), 
            // Separator line
            $el("hr.lorainfo-sidebar-modal-hrline"),
            // Brief LoRA description container
            $el("div.lorainfo-sidebar-modal-modelspecContainer", [
                // LoRA preview image
                $el("img.lorainfo-sidebar-modal-preview"), 
                // Brief description of the LoRA
                $el("div.lorainfo-sidebar-modal-modelspec", [
                    $el("span", {innerHTML: "• Output Name: "}), $el("span.lorainfo-sidebar-modelspec-outputName"), $el("br"),
                    $el("span", {innerHTML: "• Training Date: "}), $el("span.lorainfo-sidebar-modelspec-trainingDate"), $el("br"),
                    $el("span", {innerHTML: "• Architecture: "}), $el("span.lorainfo-sidebar-modelspec-architecture"), $el("br"),
                    $el("span", {innerHTML: "• Training Resolution: "}), $el("span.lorainfo-sidebar-modelspec-resolution"), $el("br"),
                    $el("span", {innerHTML: "• Learning Rate: "}), $el("span.lorainfo-sidebar-modelspec-lr"), $el("br"),
                    $el("span", {innerHTML: "• Learning Rate Scheduler: "}), $el("span.lorainfo-sidebar-modelspec-lrScheduler"), $el("br"),
                    $el("span", {innerHTML: "• Learning Rate Warmup Steps: "}), $el("span.lorainfo-sidebar-modelspec-"), $el("br"),
                    $el("span", {innerHTML: "• Optimizer: "}), $el("span.lorainfo-sidebar-modelspec-optimizer"), $el("br"),
                    $el("span", {innerHTML: "• Loss Function: "}), $el("span.lorainfo-sidebar-modelspec-lf"), $el("br"),
                    $el("span", {innerHTML: "• Gradient Accumulation steps: "}), $el("span.lorainfo-sidebar-modelspec-gradientAccSteps"), $el("br"),
                    $el("span", {innerHTML: "• Gradient Checkpointing: "}), $el("span.lorainfo-sidebar-modelspec-gradientCheckpointing"), $el("br"),
                    $el("span", {innerHTML: "• Clip Skip: "}), $el("span.lorainfo-sidebar-modelspec-clipSkip"), $el("br"),
                    $el("span", {innerHTML: "• Epoch: "}), $el("span.lorainfo-sidebar-modelspec-epoch"), $el("br"),
                    $el("span", {innerHTML: "• Batch per device: "}), $el("span.lorainfo-sidebar-modelspec-batchPerDevice"), $el("br"),
                    $el("span", {innerHTML: "• Total Batch: "}), $el("span.lorainfo-sidebar-modelspec-totalBatch"), $el("br"),
                    $el("span", {innerHTML: "• Steps: "}), $el("span.lorainfo-sidebar-modelspec-steps"), $el("br"),
                    $el("span", {innerHTML: "• Mixed Precision: "}), $el("span.lorainfo-sidebar-modelspec-mixedPrecision"), $el("br")
                ])
            ]),
            // All metadata of LoRA
            $el("details.lorainfo-sidebar-modal-modelspec-details", [
                $el("summary", {innerHTML: "All Metadata"}),
                // Metadata container
                $el("div.lorainfo-sidebar-modal-metadata-container")
            ]), 
            // Separator line
            $el("hr.lorainfo-sidebar-modal-hrline"),
            // Custom JSON header 
            $el("div.lorainfo-sidebar-modal-custom-JSON-header", [
                // Custom JSON title
                $el("h3.lorainfo-sidebar-modal-custom-JSON-title", {
                    innerHTML: "Custom JSON"
                }),
                // Expand all button
                $el("button.lorainfo-sidebar-modal-custom-JSON-expand-all", {
                    innerHTML: "Expand all items",
                    onclick: (e) => {
                        this.expandRecursively(e.target.parentElement.nextSibling);
                    }
                }),
                // Collapse all button
                $el("button.lorainfo-sidebar-modal-custom-JSON-collapse-all", {
                    innerHTML: "Collapse all items",
                    onclick: (e) => {
                        this.collapseRecursively(e.target.parentElement.nextSibling);
                    }
                })
            ]),
            // Custom JSON container
            $el("div.lorainfo-sidebar-modal-custom-JSON-content-container"),
            // Custom JSON save button
            $el("button.lorainfo-sidebar-modal-custom-JSON-save", {
                innerHTML: "Save",
                onclick: (e) => this.saveJSON(e)
            }),
            // Button to add a top-level array to the custom JSON container
            $el("button.lorainfo-sidebar-modal-add-arr", {
                innerHTML: "Add arr",
                onclick: () => this.createTopLevelArray()
            }),
            // Button to add a top-level dictionary to the custom JSON container
            $el("button.lorainfo-sidebar-modal-add-dict", {
                innerHTML: "Add dict",
                onclick: () => this.createTopLevelDictionary()
            }),
            // Separator line
            $el("hr.lorainfo-sidebar-modal-hrline"),
            // rgthree JSON header
            $el("div.lorainfo-sidebar-modal-rgthree-JSON-header", [
                // rgthree JSON title
                $el("h3.lorainfo-sidebar-modal-rgthree-JSON-title", {
                    innerHTML: "rgthree JSON"
                }),
                // Expand all button
                $el("button.lorainfo-sidebar-modal-rgthree-JSON-expand-all", {
                    innerHTML: "Expand all items",
                    onclick: (e) => {
                        this.expandRecursively(e.target.parentElement.nextSibling);
                    }
                }),
                // Collapse all button
                $el("button.lorainfo-sidebar-modal-rgthree-JSON-collapse-all", {
                    innerHTML: "Collapse all items",
                    onclick: (e) => {
                        this.collapseRecursively(e.target.parentElement.nextSibling);
                    }
                })
            ]),
            // rgthree JSON container
            $el("div.lorainfo-sidebar-modal-rgthree-JSON-content-container"),
            // rgthree JSON save button
            $el("button.lorainfo-sidebar-modal-rgthree-JSON-save", {
                innerHTML: "Save",
                onclick: (e) => this.saveJSON(e)
            })
        ]);

        // Add the modal to <body>
        document.body.appendChild(this.modal);

        return this.modal;
    }

    // Save the edited JSON information to the file
    async saveJSON(e) {
        // Deep copy of the content container
        const copiedContainer = e.target.previousElementSibling.cloneNode(true);
        this.expandRecursively(copiedContainer);

        const json_info = { "path": null, "json_data": null };

        try {
            // Get the edited JSON data and file path
            if (e.target.previousElementSibling.previousElementSibling.innerHTML === "rgthree JSON") {
                const lora_path = document.getElementsByClassName("lorainfo-sidebar-modal")[0].children[0].children[0].dataset.path;
                const path_no_ext = lora_path.substring(0, lora_path.lastIndexOf('.'));
                json_info["path"] = path_no_ext + ".safetensors.rgthree-info.json";
            } else {
                json_info["path"] = document.getElementsByClassName("lorainfo-sidebar-modal")[0].children[0].children[0].dataset.path;
            }
            json_info["json_data"] = this.convertNumericStrings(this.list2JSON(copiedContainer.children[0]));
        } catch (e) {
            console.error("[LoRA Info SideBar - Error: saveCustomJSON]", e);
            alert("[Custom Node: lorainfo-sidebar]\n⚠ Duplicated Key");
            return;
        }

        console.log(json_info);

        try {
            // Send a post request
            const response = await api.fetchApi("/lorainfo_sidebar/save_lora_json", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(json_info)
            });

            // Recieve the server response
            if (response.ok) {
                const text = await response.text();
                if (text == "true") {
                    alert("Success to save JSON");
                } else {
                    alert("Fail to save JSON");
                }
            } else {
                console.error("[LoRA Info SideBar - Error: saveCustomJSON] request was sent but failed");
            }

        } catch (error) {
            console.error("[LoRA Info SideBar - Error: saveCustomJSON]", error);
        }
    }

    convertNumericStrings(obj) {
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertNumericStrings(item));
        } else if (obj !== null && typeof obj === "object") {
            const newObj = {};
            for (const [key, value] of Object.entries(obj)) {
                newObj[key] = this.convertNumericStrings(value);
            }
            return newObj;
        } else if (typeof obj === "string" && /^-?\d+(\.\d+)?$/.test(obj)) {
            return Number(obj);
        } else {
            return obj;
        }
    }

    list2JSON(ul) {
        const formType = ul.dataset.form;
        const liList = Array.from(ul.querySelectorAll(":scope > .lorainfo-sidebar-modal-custom-JSON-content-liWraper > li"));
        liList.pop(); // remove dropdown menu

        if (formType === "arr") {
            const result = [];

            for (const li of liList) {
                const nestedUl = li.querySelector("ul");
                if (nestedUl) {
                    result.push(this.list2JSON(nestedUl));
                } else {
                    result.push(li.childNodes[2].innerHTML.trim());
                }
            }

            return result;

        } else if (formType === "dict") {
            const result = {};
            const seenKeys = new Set();

            for (const li of liList) {
                const key = li.querySelector('.lorainfo-sidebar-modal-custom-JSON-content-key').textContent.trim();

                if (seenKeys.has(key)) {
                    throw new Error("[list2JSON] Duplicated Key");
                }

                const nestedUl = li.querySelector("ul");
                if (nestedUl) {
                    result[key] = this.list2JSON(nestedUl);
                } else {
                    result[key] = li.querySelector('.lorainfo-sidebar-modal-custom-JSON-content-value').textContent.trim();
                }

                seenKeys.add(key);
            }

            return result;
        }
    }

    createToggleButton() {
        return $el("button.lorainfo-sidebar-modal-custom-JSON-content-toggle", {
            innerHTML: "&#x25BC",
            title: "Toggle Content",
            onclick: (e) => this.toggleItem(e)
        });
    }

    toggleItem(e) {
        const lengthLimit = 20;
        const isOpen = e.target.innerHTML === "▼" ? true : false;
        const ulType = e.target.parentElement.parentElement.parentElement.dataset.form;

        if (ulType === "arr") {
            const valueIndex = e.target.nextSibling.nextSibling.dataset.index;

            if (isOpen) {
                e.target.innerHTML = "&#x25B6";

                let collapsedValue = e.target.nextSibling.nextSibling.innerHTML;
                collapsedValue = (collapsedValue.length > lengthLimit ? collapsedValue.substring(0,lengthLimit) : collapsedValue) + " [ Collapsed ]";

                this.valueDict[valueIndex] = e.target.nextSibling.nextSibling.innerHTML;
                e.target.nextSibling.nextSibling.innerHTML = collapsedValue;
            } else {
                e.target.innerHTML = "&#x25BC";

                const value = this.valueDict[valueIndex];
                delete this.valueDict.valueIndex;

                e.target.nextSibling.nextSibling.innerHTML = value;
            }
        } else if (ulType === "dict") {
            const keyIndex = e.target.nextSibling.nextSibling.dataset.index;
            
            if (isOpen) {
                e.target.innerHTML = "&#x25B6";

                let collapsedKey = e.target.nextSibling.nextSibling.innerHTML;
                collapsedKey = (collapsedKey.length > lengthLimit ? collapsedKey.substring(0,lengthLimit) : collapsedKey) + " [ Collapsed ]";

                this.keyDict[keyIndex] = e.target.nextSibling.nextSibling.innerHTML;
                e.target.nextSibling.nextSibling.innerHTML = collapsedKey;

                e.target.parentElement.children[3].style.display = "none";
                e.target.parentElement.children[4].style.display = "none";
                e.target.parentElement.children[5].style.display = "none";
            } else {
                e.target.innerHTML = "&#x25BC";

                const key = this.keyDict[keyIndex];
                delete this.keyDict.keyIndex;

                e.target.nextSibling.nextSibling.innerHTML = key;
                e.target.parentElement.children[3].style.display = "inline";
                e.target.parentElement.children[4].style.display = "inline";
                e.target.parentElement.children[5].style.display = e.target.parentElement.children[5].localName === "ul" ? "block" : "inline";
            }
        }
    }

    expandRecursively(e) {
        if (e.localName === "button" && e.className === "lorainfo-sidebar-modal-custom-JSON-content-toggle") {
            if (e.innerHTML === "▶") {
                e.innerHTML = "&#x25BC";

                const ulType = e.parentElement.parentElement.parentElement.dataset.form;

                if (ulType === "arr") {
                    const valueIndex = e.nextSibling.nextSibling.dataset.index;
                    const value = this.valueDict[valueIndex];
                    delete this.valueDict.valueIndex;

                    e.nextSibling.nextSibling.innerHTML = value;
                } else if (ulType === "dict") {
                    const keyIndex = e.nextSibling.nextSibling.dataset.index;
                    const key = this.keyDict[keyIndex];
                    delete this.keyDict.keyIndex;

                    e.nextSibling.nextSibling.innerHTML = key;
                    e.parentElement.children[3].style.display = "inline";
                    e.parentElement.children[4].style.display = "inline";
                    e.parentElement.children[5].style.display = e.parentElement.children[5].localName === "ul" ? "block" : "inline";
                }
            }
        }

        if (e.children) {
            for (let child of e.children) {
                this.expandRecursively(child);
            }
        }
    }

    collapseRecursively(e) {
        if (e.localName === "button" && e.className === "lorainfo-sidebar-modal-custom-JSON-content-toggle") {
            if (e.innerHTML === "▼") {
                e.innerHTML = "&#x25B6";

                const lengthLimit = 20;
                const ulType = e.parentElement.parentElement.parentElement.dataset.form;

                if (ulType === "arr") {
                    const valueIndex = e.nextSibling.nextSibling.dataset.index;

                    let collapsedValue = e.nextSibling.nextSibling.innerHTML;
                    collapsedValue = (collapsedValue.length > lengthLimit ? collapsedValue.substring(0,lengthLimit) : collapsedValue) + " [ Collapsed ]";

                    this.valueDict[valueIndex] = e.nextSibling.nextSibling.innerHTML;
                    e.nextSibling.nextSibling.innerHTML = collapsedValue;
                } else if (ulType === "dict") {
                    const keyIndex = e.nextSibling.nextSibling.dataset.index;

                    let collapsedKey = e.nextSibling.nextSibling.innerHTML;
                    collapsedKey = (collapsedKey.length > lengthLimit ? collapsedKey.substring(0,lengthLimit) : collapsedKey) + " [ Collapsed ]";

                    this.keyDict[keyIndex] = e.nextSibling.nextSibling.innerHTML;
                    e.nextSibling.nextSibling.innerHTML = collapsedKey;

                    e.parentElement.children[3].style.display = "none";
                    e.parentElement.children[4].style.display = "none";
                    e.parentElement.children[5].style.display = "none";
                }
                
            }
        }
        
        if (e.children) {
            for (let child of e.children) {
                this.collapseRecursively(child);
            }
        }
    }

    createDeleteButton() {
        return $el("button.lorainfo-sidebar-modal-custom-JSON-content-delete", {
            innerHTML: "&#x2716;",
            title: "Delete Key and Value",
            onclick: (e) => this.deleteItem(e)
        });
    }

    deleteItem(e) {
        let li = e.target.parentElement;
        let currentUl = li.parentElement.parentElement;

        // Remove item
        li.remove();

        // Remove list if list is empty
        while (currentUl.children[0].children.length === 1) {
            if (currentUl.parentElement.classList.contains("lorainfo-sidebar-modal-custom-JSON-content-container")) {
                currentUl.remove();
                break;
            }

            let toRemove = currentUl.parentElement;
            currentUl = toRemove.parentElement.parentElement;

            toRemove.remove();
        }

        // If All contents has removed, display Add arr / dict button
        if (this.modal.children[6].children.length == 0) {
            this.modal.children[7].style.display = "none";
            this.modal.children[8].style.display = "inline-block";
            this.modal.children[9].style.display = "inline-block";
        }
    }

    createAddContentButton() {
        return $el("button.lorainfo-sidebar-modal-custom-JSON-content-add", {
            innerHTML: "&#x271A;",
            title: "Toggle add dropdown menu",
            onclick: (e) => this.toggleDropdown(e)
        });
    }

    toggleDropdown(e) {
        const dropdown = e.target.nextSibling;
        if (window.getComputedStyle(dropdown).display === "none") {
            dropdown.style.display = "block";
        } else {
            dropdown.style.display = "none";
        }
    }

    createDropdownMenu(addType) {
        const div = $el("div.lorainfo-sidebar-modal-custom-JSON-content-dropdownmenu");

        if (addType === "arr") {
            const options = [
                "Add primitive value", 
                "Add array", 
                "Add dictionary"
            ];
            for (const option of options) {
                div.appendChild(
                    $el("p.lorainfo-sidebar-modal-custom-JSON-content-dropdownmenu-option", {
                        innerHTML: option,
                        onclick: (e) => this.addArrItem(e)
                    })
                );
            }
        } else if (addType === "dict") {
            const options = [
                "Add key - primitive value", 
                "Add key - array", 
                "Add key - dictionary"
            ];
            for (const option of options) {
                div.appendChild(
                    $el("p.lorainfo-sidebar-modal-custom-JSON-content-dropdownmenu-option", {
                        innerHTML: option,
                        onclick: (e) => this.addDictItem(e)
                    })
                );
            }
        }

        return div;
    }

    convertEditable(obj) {
        obj.contentEditable = true;
        obj.spellcheck = false;
    }

    // Prevent event propagation but don't prevent the default browser actions (like select all, copy, paste, etc)
    preventPropagation(obj) {
        const stop = (e) => {
            e.stopImmediatePropagation();
            e.stopPropagation();
        };
        obj.addEventListener("keydown", stop, true);
        obj.addEventListener("keypress", stop, true);
        obj.addEventListener("keyup", stop, true);
        obj.addEventListener("paste", stop, true);
    }

    createKeySpanforEdit(str, index) {
        const keySpan = $el("span.lorainfo-sidebar-modal-custom-JSON-content-key", {
            innerHTML: str === undefined ? "insert your key" : str,
            dataset: {
                index: index
            }
        });
        this.convertEditable(keySpan);
        this.preventPropagation(keySpan);
        return keySpan;
    }

    createKeySpanforDisplay(str) {
        const keySpan = $el("span.lorainfo-sidebar-modal-metadata-key", {
            innerHTML: str
        });

        return keySpan;
    }

    createColonSpan() {
        return $el("span.lorainfo-sidebar-modal-custom-JSON-content-colon", {
            innerHTML: " : "
        });
    }

    createValueSpanforEdit(str, index) {
        const valueContent = $el("span.lorainfo-sidebar-modal-custom-JSON-content-value", {
            innerHTML: str === undefined ? "insert your value" : str,
            dataset: {
                index: index
            }
        });

        this.convertEditable(valueContent);
        this.preventPropagation(valueContent);
        return valueContent;
    }

    createValueSpanforDisplay(str) {
        const valueContent = $el("span.lorainfo-sidebar-modal-metadata-value", {
            innerHTML: str
        });

        return valueContent;
    }

    addDictItem(e) {
        const addType = e.target.innerHTML;
        let liWraper = e.target.parentElement.parentElement.parentElement;

        if (addType === "Add key - primitive value") {
            const li = $el("li");

            li.appendChild(this.createToggleButton());
            li.appendChild(this.createDeleteButton());
            li.appendChild(this.createKeySpanforEdit(undefined, this.keyIndex++));
            li.appendChild(this.createColonSpan());
            li.appendChild($el("br"));
            li.appendChild(this.createValueSpanforEdit(undefined, this.valueIndex++));

            const dropdownButton = liWraper.children[liWraper.children.length - 1];
            liWraper.insertBefore(li, dropdownButton);

        } else if (addType === "Add key - array") {
            const li = $el("li", [
                this.createToggleButton(),
                this.createDeleteButton(),
                this.createKeySpanforEdit(undefined, this.keyIndex++),
                this.createColonSpan(),
                $el("br"),
                $el("ul", {
                    dataset: {
                        form: "arr"
                    }
                }, [
                    $el("div.lorainfo-sidebar-modal-custom-JSON-content-liWraper", [
                        $el("li", [
                            this.createToggleButton(),
                            this.createDeleteButton(),
                            this.createValueSpanforEdit(undefined, this.valueIndex++)
                        ]),
                        $el("li", [
                            this.createAddContentButton(),
                            this.createDropdownMenu("arr")
                        ])
                    ])
                ])
            ]);

            const dropdownButton = liWraper.children[liWraper.children.length - 1];
            liWraper.insertBefore(li, dropdownButton);

        } else if (addType === "Add key - dictionary") {
            const li = $el("li", [
                this.createToggleButton(),
                this.createDeleteButton(),
                this.createKeySpanforEdit("insert your key1", this.keyIndex++),
                this.createColonSpan(),
                $el("br"),
                $el("ul", {
                    dataset: {
                        form: "dict"
                    }
                }, [
                    $el("div.lorainfo-sidebar-modal-custom-JSON-content-liWraper", [
                        $el("li", [
                            this.createToggleButton(),
                            this.createDeleteButton(),
                            this.createKeySpanforEdit("insert your key2", this.keyIndex++),
                            this.createColonSpan(),
                            $el("br"),
                            this.createValueSpanforEdit(undefined, this.valueIndex++)
                        ]),
                        $el("li", [
                            this.createAddContentButton(),
                            this.createDropdownMenu("dict")
                        ])
                    ])
                ])
            ]);

            const dropdownButton = liWraper.children[liWraper.children.length - 1];
            liWraper.insertBefore(li, dropdownButton);
        }

        e.target.parentElement.style = "none";
    }

    addArrItem(e) {
        const addType = e.target.innerHTML;
        let liWraper = e.target.parentElement.parentElement.parentElement;

        if (addType === "Add primitive value") {
            const li = $el("li", [
                this.createToggleButton(),
                this.createDeleteButton(),
                this.createValueSpanforEdit(undefined, this.valueIndex++)
            ]);
            
            const dropdownButton = liWraper.children[liWraper.children.length - 1];
            liWraper.insertBefore(li, dropdownButton);
        } else if (addType === "Add array") {
            const li = $el("li", [
                $el("ul", {
                    dataset: {
                        form: "arr"
                    }
                }, [
                    $el("div.lorainfo-sidebar-modal-custom-JSON-content-liWraper", [
                        $el("li", [
                            this.createToggleButton(),
                            this.createDeleteButton(),
                            this.createValueSpanforEdit(undefined, this.valueIndex++)
                        ]),
                        $el("li", [
                            this.createAddContentButton(),
                            this.createDropdownMenu("arr")
                        ])
                    ])
                ])
            ]);

            const dropdownButton = liWraper.children[liWraper.children.length - 1];
            liWraper.insertBefore(li, dropdownButton);
        } else if (addType === "Add dictionary") {
            const li = $el("li", [
                $el("ul", {
                    dataset: {
                        form: "dict"
                    }
                }, [
                    $el("div.lorainfo-sidebar-modal-custom-JSON-content-liWraper", [
                        $el("li", [
                            this.createToggleButton(),
                            this.createDeleteButton(),
                            this.createKeySpanforEdit(undefined, this.keyIndex++), 
                            this.createColonSpan(),
                            $el("br"),
                            this.createValueSpanforEdit(undefined, this.valueIndex++)
                        ]),
                        $el("li", [
                            this.createAddContentButton(),
                            this.createDropdownMenu("dict")
                        ])
                    ])
                ])
            ]);

            const dropdownButton = liWraper.children[liWraper.children.length - 1];
            liWraper.insertBefore(li, dropdownButton);
        }

        e.target.parentElement.style = "none";
    }

    // Add array to the custom JSON content container
    createTopLevelArray() {
        this.modal.children[6].appendChild(
            $el("ul", {
                dataset: {
                    form: "arr"
                }
            }, [
                $el("div.lorainfo-sidebar-modal-custom-JSON-content-liWraper", [
                    $el("li", [
                        this.createToggleButton(),
                        this.createDeleteButton(),
                        this.createValueSpanforEdit(undefined, this.valueIndex++)
                    ]),
                    $el("li", [
                        this.createAddContentButton(),
                        this.createDropdownMenu("arr")
                    ])
                ])
            ])
        );

        this.modal.children[5].children[1].style.display = "inline-block";
        this.modal.children[5].children[2].style.display = "inline-block";
        this.modal.children[7].style.display = "inline-block";
        this.modal.children[8].style.display = "none";
        this.modal.children[9].style.display = "none";
    }

    // Add dictionary to the custom JSON content container
    createTopLevelDictionary() {
        this.modal.children[6].appendChild(
            $el("ul", {
                dataset: {
                    form: "dict"
                }
            }, [
                $el("div.lorainfo-sidebar-modal-custom-JSON-content-liWraper", [
                    $el("li", [
                        this.createToggleButton(),
                        this.createDeleteButton(),
                        this.createKeySpanforEdit(undefined, this.keyIndex++),
                        this.createColonSpan(),
                        $el("br"),
                        this.createValueSpanforEdit(undefined, this.valueIndex++)
                    ]),
                    $el("li", [
                        this.createAddContentButton(),
                        this.createDropdownMenu("dict")
                    ])
                ])
            ])
        );

        this.modal.children[5].children[1].style.display = "inline-block";
        this.modal.children[5].children[2].style.display = "inline-block";
        this.modal.children[7].style.display = "inline-block";
        this.modal.children[8].style.display = "none";
        this.modal.children[9].style.display = "none";
    }

    // Display LoRA edit modal window
    displayLoraEditModal(e) {
        // Show modal window
        document.getElementsByClassName("lorainfo-sidebar-modal")[0].style.display = "block";
        document.getElementsByClassName("lorainfo-sidebar-modal")[0].style.zIndex = 1000;
        
        // Get preview container and modal window
        const previewContainer = e.target.parentElement;
        const modal = document.getElementsByClassName("lorainfo-sidebar-modal")[0];
        
        // Set LoRa name and path
        modal.children[0].children[0].innerHTML = previewContainer.id;
        modal.children[0].children[0].dataset.path = previewContainer.dataset.path;

        // Copy image from preview container
        modal.children[2].children[0].src = previewContainer.children[1].src;

        // Reset modal window fields
        for (let i = 1; i < 50; i = i + 3) {
            modal.children[2].children[1].children[i].innerHTML = "None";
        }
        if (modal.children[3].children[1].children[0]) {
            modal.children[3].children[1].removeChild(modal.children[3].children[1].children[0]);
        }

        // Close All metadata
        modal.children[3].open = false; 

        // Set modal window fields
        this.getLoraJSON(previewContainer.dataset.path).then(data => {
            if (data != null) {
                // Fetch safetensors metadata
                const metadata = data["metadata"];
                modal.children[2].children[1].children[1].innerHTML = metadata["modelspec.title"] ? metadata["modelspec.title"] : "None";
                modal.children[2].children[1].children[4].innerHTML = metadata["modelspec.date"] ? metadata["modelspec.date"].replace("T", " ") : "None";
                modal.children[2].children[1].children[7].innerHTML = metadata["modelspec.architecture"] ? metadata["modelspec.architecture"] : "None";
                modal.children[2].children[1].children[10].innerHTML = metadata["modelspec.resolution"] ? metadata["modelspec.resolution"] : "None";
                modal.children[2].children[1].children[13].innerHTML = metadata["ss_learning_rate"] ? metadata["ss_learning_rate"] : "None";
                modal.children[2].children[1].children[16].innerHTML = metadata["ss_lr_scheduler"] ? metadata["ss_lr_scheduler"] : "None";
                modal.children[2].children[1].children[19].innerHTML = metadata["ss_lr_warmup_steps"] ? metadata["ss_lr_warmup_steps"] : "None";
                modal.children[2].children[1].children[22].innerHTML = metadata["ss_optimizer"] ? this.extractOptimizerName(metadata["ss_optimizer"]) : "None";
                modal.children[2].children[1].children[25].innerHTML = metadata["ss_loss_type"] ? metadata["ss_loss_type"] : "None";
                modal.children[2].children[1].children[28].innerHTML = metadata["ss_gradient_accumulation_steps"] ? metadata["ss_gradient_accumulation_steps"] : "None";
                modal.children[2].children[1].children[31].innerHTML = metadata["ss_gradient_checkpointing"] ? metadata["ss_gradient_checkpointing"] : "None";
                modal.children[2].children[1].children[34].innerHTML = metadata["ss_clip_skip"] ? metadata["ss_clip_skip"] : "None";
                modal.children[2].children[1].children[37].innerHTML = metadata["ss_num_epochs"] ? metadata["ss_num_epochs"] : "None";
                modal.children[2].children[1].children[40].innerHTML = metadata["ss_batch_size_per_device"] ? metadata["ss_batch_size_per_device"] : "None";
                modal.children[2].children[1].children[43].innerHTML = metadata["ss_total_batch_size"] ? metadata["ss_total_batch_size"] : "None";
                modal.children[2].children[1].children[46].innerHTML = metadata["ss_steps"] ? metadata["ss_steps"] : "None";
                modal.children[2].children[1].children[49].innerHTML = metadata["ss_mixed_precision"] ? metadata["ss_mixed_precision"] : "None";

                // Fetch all metadata
                modal.children[3].children[1].appendChild(this.JSON2ListforDisplay(metadata));

                // Fetch custom JSON data
                const custom_json_data = data["custom_json_file"];
                const customJSONContainer = modal.children[6];
                customJSONContainer.innerHTML = "";
                if (custom_json_data !== null) {
                    customJSONContainer.appendChild(this.JSON2ListforEdit(custom_json_data));
                    modal.children[5].children[1].style.display = "inline-block";
                    modal.children[5].children[2].style.display = "inline-block";
                    modal.children[7].style.display = "inline-block";
                    modal.children[8].style.display = "none";
                    modal.children[9].style.display = "none";
                } else {
                    modal.children[5].children[1].style.display = "none";
                    modal.children[5].children[2].style.display = "none";
                    modal.children[7].style.display = "none";
                    modal.children[8].style.display = "inline-block";
                    modal.children[9].style.display = "inline-block";
                }

                // Fetch rgthree JSON data
                const rgthree_json_data = data["rgthree_json_file"];
                const rgthreeJSONContainer = modal.children[12];
                rgthreeJSONContainer.innerHTML = "";
                if (rgthree_json_data !== null) {
                    rgthreeJSONContainer.appendChild(this.JSON2ListforEdit(rgthree_json_data));
                    modal.children[10].style.setProperty('display', 'block', 'important');
                    modal.children[11].style.display = "block";
                    modal.children[12].style.display = "block";
                    modal.children[13].style.display = "inline-block";
                } else {
                    modal.children[10].style.setProperty('display', 'none', 'important');
                    modal.children[11].style.display = "none";
                    modal.children[12].style.display = "none";
                    modal.children[13].style.display = "none";
                }
            }
        });
    }

    // Extract optimizer name
    extractOptimizerName(full_string) {
        const match = full_string.match(/\.([^.()]+)(?:\(|$)/);
        return match ? match[1] : null;
    }

    async getLoraJSON(path) {
        try {
            const encodedPath = encodeURIComponent(path);
            const response = await api.fetchApi(`/lorainfo_sidebar/get_lora_json/${encodedPath}`);
            if (response.ok) {
                const data = await response.json();
                return data;
            }
        } catch (error) {
            console.error("[LoRA Info SideBar - Error: getLoraJSON]", error);
            return null; 
        }
    }

    JSON2ListforEdit(obj) {
        if (Array.isArray(obj)) { // Case of Array
            const ul = $el("ul", {
                dataset: {
                    form: "arr"
                }
            }, [
                $el("div.lorainfo-sidebar-modal-custom-JSON-content-liWraper")
            ]);

            for (const value of obj) {
                const li = $el("li");

                if (typeof value === "object") {
                    li.appendChild(this.JSON2ListforEdit(value));
                } else {
                    li.appendChild(this.createToggleButton());
                    li.appendChild(this.createDeleteButton());
                    li.appendChild(this.createValueSpanforEdit(value, this.valueIndex++));
                }

                ul.children[0].appendChild(li);
            }

            ul.children[0].appendChild($el("li", [this.createAddContentButton(), this.createDropdownMenu("arr")]));

            return ul;

        } else if (typeof obj === "object" && obj !== null) { // Case of Dictionary
            const ul = $el("ul", {
                dataset: {
                    form: "dict"
                }
            }, [
                $el("div.lorainfo-sidebar-modal-custom-JSON-content-liWraper")
            ]);

            for (const [key, value] of Object.entries(obj)) {
                const li = $el("li", [
                    this.createToggleButton(),
                    this.createDeleteButton(),
                    this.createKeySpanforEdit(key, this.keyIndex++),
                    this.createColonSpan(),
                    $el("br")
                ]);

                if (typeof value === 'object' && value !== null) {
                    li.appendChild(this.JSON2ListforEdit(value));
                } else {
                    li.appendChild(this.createValueSpanforEdit(value, this.valueIndex++));
                }

                ul.children[0].appendChild(li);
            }

            ul.children[0].appendChild($el("li", [this.createAddContentButton(), this.createDropdownMenu("dict")]));
            
            return ul;
        }
    }

    JSON2ListforDisplay(obj) {
        if (Array.isArray(obj)) { // Case of Array
            const ul = $el("ul", {
                dataset: {
                    form: "arr"
                }
            }, [
                $el("div.lorainfo-sidebar-modal-metadata-liWraper")
            ]);

            for (let value of obj) {
                const li = $el("li");
                
                // Try to transform the string into a object
                try {
                    const parsed = JSON.parse(value);
                    if (parsed && typeof parsed === "object") {
                        value = parsed;
                    }
                } catch (e) {
                    // Intentionally ignored
                }

                if (typeof value === "object") {
                    li.appendChild(this.JSON2ListforDisplay(value));
                } else {
                    li.appendChild(this.createValueSpanforDisplay(value));
                }

                ul.children[0].appendChild(li);
            }

            return ul;

        } else if (typeof obj === "object" && obj !== null) { // Case of Dictionary
            const ul = $el("ul", {
                dataset: {
                    form: "dict"
                }
            }, [
                $el("div.lorainfo-sidebar-modal-metadata-liWraper")
            ]);

            for (let [key, value] of Object.entries(obj)) {
                const li = $el("li", [
                    this.createKeySpanforDisplay(key),
                    this.createColonSpan()
                ]);

                // Try to transform the string into a object
                try {
                    const parsed = JSON.parse(value);
                    if (parsed && typeof parsed === "object") {
                        value = parsed;
                    }
                } catch (e) {
                    // Intentionally ignored
                }

                if (typeof value === 'object' && value !== null) {
                    li.appendChild(this.JSON2ListforDisplay(value));
                } else {
                    li.appendChild(this.createValueSpanforDisplay(value));
                }

                ul.children[0].appendChild(li);
            }
            
            return ul;
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Register LoRA Info SideBar
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
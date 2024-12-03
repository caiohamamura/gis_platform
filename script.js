const { ref, onCreated, onMounted } = Vue;
const { createVuetify } = Vuetify

const vuetify = createVuetify()

Vue.createApp({
    setup() {
        const activeBaseLayer = ref();
        const baseLayerActive = ref();
        const activeLayer = ref();
        const layersRef = ref();
        const mapRef = ref();
        const overleafLayersRef = ref();
        const opacity = ref(100);
        let rectangles = [];
        let polygons = [];
        let shapes = [];
        let overlays = [];

        onMounted(async () => {
            const layers = await (await fetch('layers.json')).json();
            layersRef.value = layers;
            const initLayer = Object.keys(layers)[0];

            activeLayer.value = initLayer;

            let createArrayUpToIndex = (index) => Array.from(Array(index + 1).keys());

            let overleafLayers = {};
            let map;

            for (const l in layers) {
                const layer = layers[l];
                lyr =
                    L.tileLayer(
                        `${layers[l].location}/{z}/{x}/{y}.png`,
                        {
                            tms: 0,
                            opacity: opacity.value / 100.0,
                            attribution: "",
                            minZoom: 0,
                            maxZoom: 20,
                            nativeZooms: createArrayUpToIndex(layer.max_zoom),
                            bounds: layer.bounds,
                        }
                    );
                lyr.addEventListener('add', function () {
                    let checked = document.querySelector('.leaflet-left span.checked');
                    lyr.setOpacity(opacity.value / 100.0);
                    setTimeout(
                        function () {
                            checked?.classList.add('checked')
                        },
                        0
                    );
                    activeLayer.value = l;

                    unbindPopups();
                    for (let rect of rectangles) {
                        handleRectangle(rect);
                    }
                    for (let pol of polygons) {
                        handlePolygon(pol);
                    }
                    for (let shp of shapes) {
                        handleGeoJSON(shp);
                    }
                });
                overleafLayers[l] = lyr;
            }

            overleafLayersRef.value = overleafLayers;



            let osm = L.tileLayer(
                'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
                minZoom: 0,
                maxZoom: 18,
            });
            let esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            });
            var baseMaps = {
                "ESRI": esri,
                "OpenStreetMap": osm,
            };

            for (let k in baseMaps) {
                let layer = baseMaps[k];
                layer.addEventListener('add', function () {
                    if (activeLayer.value in overleafLayers) {
                        overleafLayers[activeLayer.value]?.setZIndex(101);
                        let checked = document.querySelector('.leaflet-right span.checked');
                        setTimeout(
                            function () {
                                checked?.classList.add('checked');
                            },
                            0
                        );
                    }
                })
            }

            activeBaseLayer.value = 'ESRI';
            map = L.map('map', {
                crs: L.CRS.EPSG3857,
                pmIgnore: false,
                layers: [
                ],
                zoomControl: false,
            }).setView([27.5, -81.5], 9);

            window.mapa = map;

            mapRef.value = map;
            baseMaps[activeBaseLayer.value].addTo(map);
            overleafLayers[activeLayer.value].addTo(map);

            map.createPane('basePane');
            map.getPane('basePane').style.zIndex = 199;

            var layerControl = L.control.layers(baseMaps, {}, options = {
                "collapsed": false,
                "autoZIndex": false,
                position: 'topleft'
            }).addTo(map);


            let vectors = {

            };

            function addVectorGrid(overlayerInfo) {

                let url = `${overlayerInfo.location}/{z}/{x}/{y}.pbf`
                let styleFunc = function (feature) {
                    return processStyle(feature, overlayerInfo.style);
                }
                let style = {}
                style[overlayerInfo.layer] = styleFunc;

                options = {
                    vectorTileLayerStyles: style,
                    interactive: true,
                }
                const tileLayer = L.vectorGrid.protobuf(url, options)

                tileLayer.on('mouseover', function (e) {
                    e.layer.bindTooltip(e.layer.properties.county_nam, overlayerInfo.tooltip);
                    e.layer._tooltip.setLatLng([e.layer.properties.lat, e.layer.properties.lon]).addTo(map);

                })

                return tileLayer;
            }

            // Test if x is in range
            function inRange(x, range) {
                let op1 = range[0] == '[' ? '>=' : '>'
                let op2 = range.endsWith(']') ? '<=' : '<'
                let [a, b] = range.slice(1, -1).split(',').map(e => parseFloat(e));
                return eval(`x${op1}${a} && x${op2}${b}`)
            }

            // Check if test is a valid range
            function isRange(range) {
                return /^(\[|\()[0-9]+\.?[0-9]*, ?[0-9]+\.?[0-9]*(\]|\))$/.test(range)
            }

            function processStyle(properties, style) {
                let styleKeys = Object.keys(style);

                for (let key of styleKeys) {
                    // if key ends with Map check if style also have a key
                    // with the same name ending with Prop
                    // If it does use override the key prefix with the value
                    // of the property in feature
                    keyProp = key + 'Prop';
                    if (key.endsWith('Map') && style.hasOwnProperty(keyProp)) {
                        // Check if the property exists in the feature
                        if (properties.hasOwnProperty(style[keyProp])) {
                            let newKey = key.replace('Map', '');
                            let value = properties[style[keyProp]];

                            // Check if the first key from the style[key] is a range
                            if (isRange(Object.keys(style[key])[0])) {
                                for (let range of Object.keys(style[key])) {
                                    if (inRange(value, range)) {
                                        style[newKey] = style[key][range];
                                    }
                                }
                            }
                            else {
                                let keysMap = Object.keys(style[key]);
                                // Check if the value exists in the style[key]
                                if (keysMap.includes(value)) {
                                    style[newKey] = style[key][value];
                                }

                            }

                        }
                    }

                }
                return style;
            }


            async function loadLayerData() {
                try {
                    const response = await fetch('overlayers.json');
                    const data = await response.json();
                    window.data = data;
                    let allKeys = Object.keys(data);
                    let layersJson = allKeys.filter(
                        e => data[e].location.endsWith('geojson')
                    );
                    // Set difference from Object.keys(data) and layersJson
                    let layersGridVector = allKeys.filter(e => !layersJson.includes(e));
                    console.log(layersGridVector);
                    for (let chave of layersGridVector) {
                        const Layer = addVectorGrid(data[chave]);
                        console.log(Layer);
                        if (data[chave].title in vectors) {
                            // Is LayerGroup just add 
                            if (vectors[data[chave].title] instanceof Layer.LayerGroup) {
                                vectors[data[chave].title].addLayer(Layer)
                            } else {
                                vectors[data[chave].title] = Layer.layerGroup([vectors[data[chave].title], Layer])
                            }
                        } else {
                            vectors[data[chave].title] = Layer;
                        }
                        
                        addLeg2(Layer, map, data[chave]);
                        
                    }
                    for (let chave of layersJson) {

                        const LayerData = await (await fetch(data[chave].location)).json()
                        const Layer = L.geoJSON(LayerData, {
                            style: function (feature) {
                                let style = processStyle(feature.properties, data[chave].style);

                                // if (chave === "countyLayer2") {
                                //     let color = 'rgb(225, 225, 225)';
                                //     const countValue = feature.properties.c2_byAll;
                                //     if (countValue >= 0.1 && countValue < 5) {
                                //         color = "rgb(184, 213, 232)";
                                //     } else if (countValue >= 5 && countValue < 10) {
                                //         color = "rgb(113, 172, 209)";
                                //     } else if (countValue >= 10) {
                                //         color = "rgb(43, 131, 186)";
                                //     }
                                //     style = {
                                //         ...data[chave].style,
                                //         fillColor: color
                                //     };
                                // }

                                if (chave === "countyLayer3") {
                                    let color = 'rgb(200, 200, 200)';
                                    const countValue = feature.properties.c3_byAll;
                                    if (countValue >= 0.1 && countValue < 2) {
                                        color = "rgb(205, 225, 202)";
                                    } else if (countValue >= 2 && countValue < 4) {
                                        color = "rgb(155, 195, 149)";
                                    } else if (countValue >= 4) {
                                        color = "rgb(106, 166, 97)";
                                    }
                                    return {
                                        ...data[chave].style,
                                        fillColor: color
                                    };
                                }

                                else if (chave === "countyLayer4") {
                                    let color = 'rgb(200, 200, 200)';
                                    const countValue = feature.properties.c4_byAll;
                                    if (countValue >= 0.2 && countValue < 1) {
                                        color = "rgb(247, 211, 177)";
                                    } else if (countValue >= 1 && countValue < 2) {
                                        color = "rgb(239, 167, 99)";
                                    } else if (countValue >= 2) {
                                        color = "rgb(232, 123, 21)";
                                    }
                                    return {
                                        ...data[chave].style,
                                        fillColor: color
                                    };
                                }

                                else if (chave === "countyLayer5") {
                                    let color = 'rgb(200, 200, 200)';
                                    const countValue = feature.properties.c5_byAll;
                                    if (countValue >= 0.1 && countValue < 0.5) {
                                        color = "rgb(241, 178, 179)";
                                    } else if (countValue >= 0.5 && countValue < 1) {
                                        color = "rgb(228, 101, 103)";
                                    } else if (countValue >= 1) {
                                        color = "rgb(215, 25, 28)";
                                    }
                                    return {
                                        ...data[chave].style,
                                        fillColor: color
                                    };
                                }

                                return style
                            },

                            pointToLayer: function (feature, latlng) {
                                if (data[chave].location === "vector/ianpts.geojson") {
                                    function stylePoints(feature) {
                                        return data[chave].style
                                    }
                                    return L.circleMarker(latlng, stylePoints(feature))
                                }
                            },

                            onEachFeature: function (feature, layer) {
                                if (feature.properties && feature.properties[data[chave].property]) {
                                    layer.bindTooltip(feature.properties[data[chave].property],
                                        data[chave].tooltip)

                                }

                                if (data[chave].location === "vector/ianpts.geojson") {

                                    if (feature.properties && feature.properties.DTG && feature.properties.INTENSITY) {
                                        layer.bindTooltip('<b>Date:</b> ' + feature.properties.Date + '<br><b>Hour:</b> ' + feature.properties.Hour + '<br><b>Intensity:</b> ' + feature.properties.INTENSITY + ' m/s', { direction: 'top', className: 'label-style' });
                                    }
                                }

                            },

                        }
                        )

                        // If already exists, add to the layer group
                        if (data[chave].title in vectors) {
                            // Is LayerGroup just add 
                            if (vectors[data[chave].title] instanceof L.LayerGroup) {
                                vectors[data[chave].title].addLayer(Layer)
                            } else {
                                vectors[data[chave].title] = L.layerGroup([vectors[data[chave].title], Layer])
                            }
                        } else {
                            vectors[data[chave].title] = Layer;
                        }

                        if (chave === "ianTrack") {
                            addLeg(Layer, map);
                        }

                        if (chave === "countyLayer2") {
                            addLeg2(Layer, map);
                        }

                        if (chave === "countyLayer3") {
                            addLeg3(Layer, map);
                        }

                        if (chave === "countyLayer4") {
                            addLeg4(Layer, map);
                        }
                        if (chave === "countyLayer5") {
                            addLeg5(Layer, map);
                        }
                    }

                } catch (error) {
                    console.error('Error loading the layer data:', error);
                }
            }

            await loadLayerData();




            function addLeg(feature, map) {
                const legendContent = `
                    <div class="legend">
                        <div class="legend-title" style="font-weight: bold;">Hurricane Ian, 22 Sep - 1 Oct 2022</div>
                        <div class="legend-item" style="background-color: rgb(215, 25, 28);"></div> Major Hurricane<br>
                        <div class="legend-item" style="background-color: rgb(253, 174, 97);"></div> Hurricane<br>
                        <div class="legend-item" style="background-color: rgb(255, 255, 191);"></div> Tropical Storm<br>
                        <div class="legend-item" style="background-color: rgb(96, 162, 203);"></div> Tropical Depression<br>
                        <div class="legend-item" style="background-color: rgb(43, 131, 186);"></div> Wave/Low/Disturbance<br>
                    </div>
                `;

                const legendControl = L.control({ position: 'bottomleft' });

                legendControl.onAdd = function (map) {
                    const div = L.DomUtil.create('div', 'info legend');
                    div.innerHTML = legendContent;
                    return div;
                };

                map.on('layeradd', function (event) {
                    if (event.layer === feature) {
                        legendControl.addTo(map);
                    }
                });

                map.on('layerremove', function (event) {
                    if (event.layer === feature) {
                        legendControl.remove();
                    }
                });
            }

            function addLeg2(feature, map, data) {
                let legendContent = `
                    <div class="legend">
                        <div class="legend-title" style="font-weight: bold;">${data.legend}</div> 
                        `; 
                        for (range in data.style.fillColorMap) {
                            let [a, b] = range.slice(1,-1).split(',');
                            legendContent += `<div class="legend-item" style="background-color: ${data.style.fillColorMap[range]};"></div>${a} to ${b}%<br>`;
                        }

                       legendContent += "</div>";

                const legendControl = L.control({ position: 'bottomleft' });

                legendControl.onAdd = function (map) {
                    const div = L.DomUtil.create('div', 'info legend');
                    div.innerHTML = legendContent;
                    return div;
                };

                map.on('layeradd', function (event) {
                    if (event.layer === feature) {
                        legendControl.addTo(map);
                    }
                });

                map.on('layerremove', function (event) {
                    if (event.layer === feature) {
                        legendControl.remove();
                    }
                });
            }


            function addLeg3(feature, map) {
                const legendContent = `
                <div class="legend">
                <div class="legend-title" style="font-weight: bold;">Percentage of forested area classified as moderate damage within the county</div>
                <div class="legend-item2" style="background-color: rgb(225, 225, 225);"></div> No damage<br>
                    <div class="legend-item2" style="background-color: rgb(205, 225, 202);"></div> 0 to 2%<br>
                    <div class="legend-item2" style="background-color: rgb(155, 195, 149);"></div> 2 to 4%<br>
                    <div class="legend-item2" style="background-color: rgb(106, 166, 97);"></div> 4 to 8%<br>
                </div>
            `;
                const legendControl = L.control({ position: 'bottomleft' });

                legendControl.onAdd = function (map) {
                    const div = L.DomUtil.create('div', 'info legend');
                    div.innerHTML = legendContent;
                    return div;
                };

                map.on('layeradd', function (event) {
                    if (event.layer === feature) {
                        legendControl.addTo(map);
                    }
                });

                map.on('layerremove', function (event) {
                    if (event.layer === feature) {
                        legendControl.remove();
                    }
                });
            }

            function addLeg4(feature, map) {
                const legendContent = `
                <div class="legend">
                <div class="legend-title" style="font-weight: bold;">Percentage of forested area classified as severe damage within the county</div>
                <div class="legend-item2" style="background-color: rgb(225, 225, 225);"></div> No damage<br>
                    <div class="legend-item2" style="background-color: rgb(247, 211, 177);"></div> 0 to 1%<br>
                    <div class="legend-item2" style="background-color: rgb(239, 167, 99);"></div> 1 to 2%<br>
                    <div class="legend-item2" style="background-color: rgb(232, 123, 21);"></div> 2 to 4%<br>
                </div>
            `;
                const legendControl = L.control({ position: 'bottomleft' });

                legendControl.onAdd = function (map) {
                    const div = L.DomUtil.create('div', 'info legend');
                    div.innerHTML = legendContent;
                    return div;
                };

                map.on('layeradd', function (event) {
                    if (event.layer === feature) {
                        legendControl.addTo(map);
                    }
                });

                map.on('layerremove', function (event) {
                    if (event.layer === feature) {
                        legendControl.remove();
                    }
                });
            }

            function addLeg5(feature, map) {
                const legendContent = `
                <div class="legend">
                <div class="legend-title" style="font-weight: bold;">Percentage of forested area classified as catastrophic damage within the county</div>
                <div class="legend-item2" style="background-color: rgb(200, 200, 200);"></div> No damage<br>
                    <div class="legend-item2" style="background-color:rgb(241, 178, 179);"></div> 0 to 0.5%<br>
                    <div class="legend-item2" style="background-color: rgb(228, 101, 103);"></div> 0.5 to 1%<br>
                    <div class="legend-item2" style="background-color: rgb(215, 25, 28);"></div> 1 to 1.5%<br>
                </div>
            `;
                const legendControl = L.control({ position: 'bottomleft' });

                legendControl.onAdd = function (map) {
                    const div = L.DomUtil.create('div', 'info legend');
                    div.innerHTML = legendContent;
                    return div;
                };

                map.on('layeradd', function (event) {
                    if (event.layer === feature) {
                        legendControl.addTo(map);
                    }
                });

                map.on('layerremove', function (event) {
                    if (event.layer === feature) {
                        legendControl.remove();
                    }
                });
            }

            let overleafLayersTitle = {};
            let groupsCreated = {};

            for (let k in overleafLayers) {
                const layer = layersRef.value[k];
                overleafLayersTitle[layer.title] = overleafLayers[k];
            }

            let layerControl2 = L.control.layers(overleafLayersTitle, vectors, options = {
                "collapsed": false,
                "autoZIndex": false,
                position: 'topright'
            }).addTo(map);

            // map.on('overlayadd', function (eventLayer) {
            //     console.log(eventLayer.name);
            //     if (eventLayer.name === 'Counties or equivalent') {
            //         if (map.hasLayer(Object.values(vectors)[3])) {
            //             map.removeLayer(Object.values(vectors)[3]);

            //         }
            //     }
            //     // Check if the added layer is the cityLayer
            //     else if (eventLayer.name === 'Minor civil division') {
            //         if (map.hasLayer(Object.values(vectors)[2])) {
            //             map.removeLayer(Object.values(vectors)[2]);
            //         }
            //     }
            // });

            window.layerControl2 = layerControl2;






            for (let ii of [...document.querySelectorAll("label")].slice(-4)) {
                let label = ii;
                console.log(label.textContent);
                let icone = document.createElement("span");
                icone.innerHTML = '<img src="figures/info-16x16.png">';

                // Show the modal on mousedown
                icone.onmouseenter = function (e) {
                    //console.log(e); 
                    var modal = document.getElementById("myModal");
                    modal.style.display = "block";

                    // Prevent the modal from closing when clicking inside it
                    var modalContent = document.getElementsByClassName("modal-content")[0];
                    modalContent.onclick = function (event) {
                        event.stopPropagation();
                    }
                };

                // Hide the modal on mouseup 
                window.onmouseout = function () {
                    var modal = document.getElementById("myModal");
                    if (modal.style.display === "block") {
                        modal.style.display = "none";
                    }
                };

                label.appendChild(icone);
            }

            // window.layers = layers;

            // refazer = function () {
            //     let overlayLabels = layerControl2._overlaysList.querySelectorAll("label");
            //     // window.vectors = vectors;

            //     overlayLabels[2].addEventListener("click", () => {
            //         if (overlayLabels[2].querySelector("input").checked) {
            //             if (overlayLabels[3].querySelector("input").checked) {
            //                 overlayLabels[3].querySelector("input").checked = false;
            //                 setTimeout(refazer, 0);
            //                 setTimeout(acordionear, 0);
            //                 vectors["Minor civil division"].removeFrom(map);

            //             }
            //             map.addLayer(vectors["Counties or equivalent"]);
            //         }

            //     })
            //     overlayLabels[3].addEventListener("click", () => {
            //         if (overlayLabels[3].querySelector("input").checked) {
            //             if (overlayLabels[2].querySelector("input").checked) {
            //                 overlayLabels[2].querySelector("input").checked = false;
            //                 setTimeout(refazer, 0);
            //                 setTimeout(acordionear, 0);
            //                 map.removeLayer(vectors["Counties or equivalent"]);
            //             }
            //             map.addLayer(vectors["Minor civil division"]);
            //         }
            //     })
            // }
            // refazer()


            // let first = true;
            // let acordionear = function () {

            //     let labels = layerControl2._baseLayersList.querySelectorAll("label");
            //     let groups = Object.values(layers).map(e => e.group);
            //     let uniqueGroups = new Set(groups);
            //     let groupsElement = {};
            //     console.log(groups);
            //     uniqueGroups.forEach(groupName => {
            //         if (groupName) {
            //             let accordion = document.createElement("div");
            //             accordion.className = "ui accordion";
            //             let title = document.createElement("div");
            //             let content = document.createElement("div");
            //             accordion.append(title);
            //             accordion.append(content);
            //             title.innerHTML = `<i class="dropdown icon"></i>${groupName}`;
            //             title.className = "title";
            //             content.className = "content";
            //             labels[0].insertAdjacentElement("beforebegin", accordion);
            //             groupsElement[groupName] = [title, content];
            //         }
            //     });

            //     layerVals = Object.values(layers);
            //     for (let index = 0; index < layerVals.length; index++) {
            //         let groupName = layerVals[index].group;
            //         if (groupName) {
            //             console.log(groupsElement[groupName]);
            //             groupsElement[groupName][1].append(labels[index]);
            //         }
            //     }

            //     $('.ui.accordion').accordion({
            //         animateChildren: false
            //     })
            //     let layers2 = document.querySelector('.leaflet-right .leaflet-control-layers-base');

            //     layers2.querySelectorAll("label")[baseLayerActive.value].querySelector("span>span").classList.add("checked");

            //     let openedAccordion = Math.floor(baseLayerActive.value / 2)
            //     Object.values(groupsElement)[openedAccordion][0].classList.add("active");
            //     Object.values(groupsElement)[openedAccordion][1].classList.add("active");

            //     opacityLabel.innerHTML = "Opacity:";
            //     layers2.append(opacityLabel);
            //     layers2.append(slider);

            // }


            let opacityLabel = document.querySelector('#opacity-label');
            let slider = document.querySelector('.v-slider');
            slider.remove();

            let layers2 = document.querySelector('.leaflet-right .leaflet-control-layers-base');
            opacityLabel.innerHTML = "Opacity:";
            layers2.append(opacityLabel);
            layers2.append(slider);








            // baseLayerActive.value = 0;
            // acordionear();

            // let vectorLabel = document.querySelector('#vector-label');
            // layers2.append(vectorLabel);


            var zoomControl = L.control.zoom().addTo(map);


            // ALLOW ONLY ONE TO BE SELECTED
            // Get the overlay container element
            const overlayContainer = layerControl.getContainer();

            L.control.scale().addTo(map);
            layerControl._baseLayersList.querySelector('label>span>span').classList.add('checked');




            map.pm.addControls({
                position: 'topleft',
                drawMarker: false,
                drawPolyline: false,
                drawCircle: false,
                drawCircleMarker: false,
                drawText: false,
                editMode: false,
                dragMode: false,
                cutPolygon: false,
                removalMode: false,
                rotateMode: false,
            });

            function bindPopup(overlay, mean) {
                overlay.bindPopup(
                    L.popup({ closeOnClick: false, })
                        .setLatLng(overlay.getBounds().getCenter())
                        .setContent(`<p>Mean: ${mean} Mg/ha</p>`)
                        .addTo(map));
                overlay.on('mouseover', function () {
                    this.openPopup();
                });
            }

            async function handleDrawEnd(event) {
                let overlay = event.layer;
                let res, obj;
                switch (event.shape) {
                    case 'Rectangle':
                        await handleRectangle(overlay);
                        break;
                    case 'Polygon':
                        await handlePolygon(overlay);
                        break;
                }
            }

            map.on('pm:create', handleDrawEnd);

            map.pm.Toolbar.createCustomControl({
                name: 'uploadShp',
                block: '',
                className: 'fas fa-file-upload font-awesome-toolbar',
                title: 'Upload zipped shapefile',
                onClick: () => {
                    shapefile.click();
                    shapefile.onchange = async () => {
                        let file = shapefile.files[0];
                        const formData = new FormData();
                        formData.append('file', file);
                        const response = await fetch(`${location.href.match(/(http:\/\/.*?)(:\d+)?\//)[1]}:9000/upload?layer=${activeLayer.value}`, {
                            method: 'POST',
                            body: formData
                        });
                        const obj = await response.json();
                        let overlay = L.geoJSON(JSON.parse(obj.geojson[0])).addTo(map);
                        shapes.push(overlay);
                        bindPopup(overlay, obj.mean[0]);
                    }
                },
                toggle: false,
            });

            map.pm.Toolbar.createCustomControl({
                name: 'clearAll',
                block: 'custom',
                className: 'fas fa-remove font-awesome-toolbar',
                title: 'Clear all layers',
                onClick: () => {
                    handleClearAll();
                },
                toggle: false,
            });


            function unbindPopups() {
                for (let overlay of overlays) {
                    overlay.closePopup();
                    overlay.unbindPopup();
                }
            }
            function handleClearAll() {
                for (let layerIndex = 0; layerIndex < overlays.length; layerIndex++) {
                    overlays[layerIndex]?.remove();
                    delete overlays[layerIndex];
                }
                delete overlays;
                overlays = [];
                rectangles = [];
                polygons = [];
            }

            async function handlePolygon(overlay) {
                if (polygons.some(e => e == overlay) === false)
                    polygons.push(overlay);
                if (overlays.some(e => e == overlay) == false)
                    overlays.push(overlay)

                let wkt = convertLatLngToWKT(overlay.getLatLngs()[0]);
                try {
                    let res = await fetch(`${location.href.match(/(http:\/\/.*?)(:\d+)?\//)[1]}:9000/polygon?${new URLSearchParams({
                        wkt: wkt,
                        layer: activeLayer.value
                    })}`);
                    let obj = await res.json();

                    bindPopup(overlay, obj.mean[0]);
                } catch (error) {
                    console.warn('Error handling polygon:', error);
                }
            }

            async function handleRectangle(overlay) {
                if (rectangles.some(e => e === overlay) === false) {
                    rectangles.push(overlay);
                }
                if (overlays.some(e => e == overlay) == false)
                    overlays.push(overlay)

                try {
                    let res = await fetch(`${location.href.match(/(http:\/\/.*?)(:\d+)?\//)[1]}:9000/api?bbox=${overlay.getBounds().toBBoxString()}&layer=${activeLayer.value}`);
                    let obj = await res.json();
                    bindPopup(overlay, obj.mean[0]);
                } catch (error) {
                    console.warn('Error handling rectangle:', error);
                }
            }

            async function handleShp(overlay) {
                handleGeoJSON(overlay)
            }

            function convertLatLngToWKT(latlngList, srid) {
                var wktString = "POLYGON ((";

                // Iterate over each latlng object and construct the WKT string
                for (var i = 0; i < latlngList.length; i++) {
                    var latlng = latlngList[i];
                    wktString += latlng.lng + " " + latlng.lat;

                    // Add a comma separator between coordinates except for the last one
                    if (i < latlngList.length - 1) {
                        wktString += ",";
                    }
                }

                wktString += "))";
                let sridOut = srid ? `SRID=${srid};` : '';
                return sridOut + wktString;
            }

            let results = [];

            $('#searchPrompt')
                .dropdown({
                    forceSelection: true,
                    searchDelay: 500,
                    apiSettings: {
                        url: 'https://nominatim.openstreetmap.org/search.php?q={query}&format=jsonv2',
                        onResponse: function (res) {
                            var response = {
                                results: {}
                            };
                            results = Object.values(res).filter(el => el.category == 'boundary').map((el, ind) => ({
                                name: el.display_name,
                                value: el.place_id,
                                text: el.display_name,
                                bbox: el.boundingbox,
                                lat: el.lat,
                                lon: el.lon,
                            }));
                            response.results = results;
                            return response;
                        },
                    },
                    onChange: changedValue
                });

            async function changedValue(value, text, choice) {
                let res = await fetch(`https://nominatim.openstreetmap.org/details.php?place_id=${value}&format=json&polygon_geojson=1`);
                let result = await res.json();

                let bbox = result.boundingbox;
                let layer = L.geoJSON(result.geometry).addTo(map);
                map.fitBounds(layer.getBounds());
                handleGeoJSON(layer);
                document.activeElement.blur();
            }
            $('#searchPrompt').onselect = changedValue;

            async function handleGeoJSON(layer) {
                if (shapes.some(e => e == layer) === false)
                    shapes.push(layer);
                if (overlays.some(e => e == overlay) == false)
                    overlays.push(overlay)
                
                let res = await fetch(`${location.href.match(/(http:\/\/.*?)(:\d+)?\//)[1]}:9000/geojson?layer=${activeLayer.value}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        "geojson": layer.toGeoJSON()
                    })
                });
                let obj = await res.json();
                bindPopup(layer, obj.mean[0]);
            }

            map.on('baselayerchange', function (e) {
                // e.layer is the selected base layer

                $(".leaflet-right .leaflet-control-layers-base label").each((i, el) => {
                    el = el.querySelector("span > span");
                    if (el.innerText == e.name) {
                        el.classList.add('checked');
                        console.log(i);
                        baseLayerActive.value = i;
                    } else { el.classList.remove('checked'); }
                });
            });

        })



        Vue.watch(opacity, function () {
            overleafLayersRef.value[activeLayer.value].setOpacity(opacity.value / 100.0);
        })

        const expandLayers = ref(false);
        return {
            activeLayer,
            activeBaseLayer,
            expandLayers,
            overleafLayersRef,
            layersRef,
            mapRef,
            opacity,
        };
    }
}).use(vuetify).mount('#app')

function openPopup() {
    $('#popupBox').modal('show');
}

// Function to close the popup
function closePopup() {
    $('#popupBox').modal('hide');
}

// Open the modal pop-up when the page is loaded
window.onload = openPopup;


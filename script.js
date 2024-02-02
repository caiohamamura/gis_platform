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
        // Allow drawing rectangle
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

            mapRef.value = map;
            baseMaps[activeBaseLayer.value].addTo(map);
            overleafLayers[activeLayer.value].addTo(map);

            map.createPane('basePane');
            map.getPane('basePane').style.zIndex = 199;

            let vectors = {

            };

            async function loadLayerData() {
                try {
                    const response = await fetch('overlayers.json');
                    const data = await response.json();
                    window.data = data;
                    for (let chave in data) {

                        const LayerData = await (await fetch(data[chave].location)).json()
                        const Layer = L.geoJSON(LayerData, {
                            style: function (feature) {

                                if (chave === "ianTrack") {
                                    let featureColor = data[chave].style.colorMap[feature.properties.ID]
                                    return {
                                        ...data[chave].style,
                                        color: featureColor
                                    };
                                }

                                else if (data[chave].title === "Counties or equivalent2") {

                                    let color = 'grey'; // Default color for values outside specified ranges
                                    const countValue = feature.properties.c4_and_c5;

                                    if (countValue < 0.4) {
                                        color = "rgb(255, 245, 240)";
                                    } else if (countValue >= 0.4 && countValue < 1) {
                                        color = "rgb(252, 164, 134)";
                                    } else if (countValue >= 1 && countValue < 2.5) {
                                        color = "rgb(234, 55, 42)";
                                    } else if (countValue >= 2.5) {
                                        color = "rgb(103, 0, 14)";
                                    }
                                    return {
                                        ...data[chave].style,
                                        fillColor: color
                                    };

                                    // return {
                                    //     fillColor: color,
                                    //     weight: 2,
                                    //     opacity: 1,
                                    //     color: 'black', // Border color
                                    //     fillOpacity: 0.7
                                    // };
                                }





                                else {
                                    return data[chave].style

                                }
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

                            },




                }
                        )

        if (data[chave].title in vectors) {
            vectors[data[chave].title] = L.layerGroup([vectors[data[chave].title], Layer])
        } else {
            vectors[data[chave].title] = Layer;
        }

        if(chave === "ianTrack") {
            addLeg(Layer, map);
}
        
    }

    // Additional code to utilize the loaded data
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
            <div class="legend-item" style="background-color: rgb(171, 221, 164);"></div> Tropical Depression<br>
            <div class="legend-item" style="background-color: rgb(43, 131, 186);"></div> Wave/Low/Disturbance<br>
        </div>
    `;
    const legendControl = L.control({ position: 'bottomright' });

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
};



// Add county
// const countyLayerData = await (await fetch('/vector/county_or_equivalent.geojson')).json();
// const countyLayer = L.geoJSON(countyLayerData, {
//     style: function (feature) {
//         return {
//             weight: 2,
//             color: '#DFDFDF ',
//             fillOpacity: 0
//         };
//     },

//     onEachFeature: function (feature, layer) {
//         if (feature.properties && feature.properties.county_nam) {
//             layer.bindTooltip(feature.properties.county_nam, {
//                 permanent: false,
//                 direction: 'center',
//                 className: 'county-label',
//             });
//         }

//     }
// });





// Add city 
// const cityLayerData = await (await fetch('/vector/minor_civil_division.geojson')).json();

// const cityLayer = L.geoJSON(cityLayerData, {
//     style: function (feature) {
//         return {
//             weight: 2,
//             color: '#DFDFDF',
//             fillOpacity: 0
//         };
//     },

//     onEachFeature: function (feature, layer) {
//         if (feature.properties && feature.properties.minorciv_1) {
//             layer.bindTooltip(feature.properties.minorciv_1, {
//                 permanent: false,
//                 direction: 'center',
//                 className: 'county-label',
//             });
//         }

//     }
// });


// Add Ian area

// const aoiLayerData = await (await fetch('/vector/aoi.geojson')).json();
// const aoiLayer = L.geoJSON(aoiLayerData, {
//     style: function (feature) {
//         return {
//             weight: 2,
//             color: '#DFDFDF ',
//             fillOpacity: 0.2
//         };
//     },
// });


// Add Ian Track 

// const response = await fetch('/vector/iantrack.geojson');
// const data = await response.json();

// function getColor(d) {
//     return d == 'HU_1' ? 'rgb(253, 174, 97)' :
//         d == 'HU_2' ? 'rgb(253, 174, 97)' :
//             d == 'HU_3' ? 'rgb(215, 25, 28)' :
//                 d == 'HU_4' ? 'rgb(215, 25, 28)' :
//                     d == 'HU_5' ? 'rgb(215, 25, 28)' :
//                         d == 'LO_0' ? 'rgb(43, 131, 186)' :
//                             d == 'TD_0' ? 'rgb(171, 221, 164)' :
//                                 d == 'TS_0' ? 'rgb(255, 255, 191)' :
//                                     'green';
// }

// function style(feature) {
//     return {
//         weight: 5,
//         opacity: 1,
//         color: getColor(feature.properties.ID),
//         dashArray: '1',
//     };
// }

// let ianTrack = L.geoJSON(data, {
//     style: style
// })

const legendContent = `
              <div class="legend">
              <div class="legend-title" style="font-weight: bold;">Hurricane Ian, 22 Sep - 1 Oct 2022</div>
              <div class="legend-item" style="background-color: rgb(215, 25, 28);"></div> Major Hurricane<br>
              <div class="legend-item" style="background-color: rgb(253, 174, 97);"></div> Hurricane<br>
              <div class="legend-item" style="background-color: rgb(255, 255, 191);"></div> Tropical Storm<br>
              <div class="legend-item" style="background-color: rgb(171, 221, 164);"></div> Tropical Depression<br>
              <div class="legend-item" style="background-color: rgb(43, 131, 186);"></div> Wave/Low/Disturbance<br>
             </div>
            `;

// Add Ian Points 

// const responsePts = await fetch('/vector/ianpts.geojson');
// const dataPts = await responsePts.json();

// function stylePoints(feature) {
//     return {
//         radius: 7,
//         fillColor: 'white',
//         color: '#000',
//         weight: 3,
//         opacity: 1,
//         fillOpacity: 1
//     };
// }

// let ianPts = L.geoJSON(dataPts, {
//     pointToLayer: function (feature, latlng) {
//         return L.circleMarker(latlng, stylePoints(feature));
//     },
//     onEachFeature: function (feature, layer) {
//         if (feature.properties && feature.properties.DTG && feature.properties.INTENSITY) {
//             layer.bindTooltip('<b>Date:</b> ' + feature.properties.Date + '<br><b>Hour:</b> ' + feature.properties.Hour + '<br><b>Intensity:</b> ' + feature.properties.INTENSITY + ' m/s', { direction: 'top', className: 'label-style' });
//         }
//     }
// });

// ianPts.on('add', function () {
//     // legendControlWithTitle.addTo(map);
// });

// ianPts.on('remove', function () {
//     // legendControlWithTitle.removeFrom(map);
// });


// var vectors = {
//     "Hurricane info": L.layerGroup([ianPts, ianTrack]),
//     "Area of interest": L.layerGroup([aoiLayer]),
//     "Counties or equivalent": L.layerGroup([countyLayer]),
//     "Minor civil division": L.layerGroup([cityLayer])
// };
// window.map = map
// window.cityLayer = cityLayer

// This function handles the addition of layers to the map



const legendControl = L.control({ position: 'bottomright' });


legendControl.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = legendContent;
    return div;
};

// ianTrack.on('add', function () {
//     if (map.hasLayer(ianPts)) {
//         map.removeLayer(ianPts);
//         ianPts.addTo(map);
//     }
//     legendControl.addTo(map);
//     console.log(ianTrack)
// });

// ianTrack.on('remove', function () {
//     if (map.hasLayer(ianPts)) {
//         map.removeLayer(ianPts);
//         ianPts.addTo(map);
//     }
//     legendControl.remove();
// });



var layerControl = L.control.layers(baseMaps, {}, options = {
    "collapsed": false,
    "autoZIndex": false,
    position: 'topleft'
}).addTo(map);


let overleafLayersTitle = {};
let groupsCreated = {};

for (let k in overleafLayers) {
    // let currentGroup = layers[k].group;
    // if (currentGroup) {
    //     if ((currentGroup in groupsCreated) == false) {
    //         groupsCreated[currentGroup] = document.createElement("div");

    //     }
    // }
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
// window.layers = layers;


refazer = function () {
    let overlayLabels = layerControl2._overlaysList.querySelectorAll("label");
    // window.vectors = vectors;

    overlayLabels[2].addEventListener("click", () => {
        if (overlayLabels[2].querySelector("input").checked) {
            if (overlayLabels[3].querySelector("input").checked) {
                overlayLabels[3].querySelector("input").checked = false;
                setTimeout(refazer, 0);
                setTimeout(acordionear, 0);
                vectors["Minor civil division"].removeFrom(map);

            }
            map.addLayer(vectors["Counties or equivalent"]);
        }

    })
    overlayLabels[3].addEventListener("click", () => {
        if (overlayLabels[3].querySelector("input").checked) {
            if (overlayLabels[2].querySelector("input").checked) {
                overlayLabels[2].querySelector("input").checked = false;
                setTimeout(refazer, 0);
                setTimeout(acordionear, 0);
                map.removeLayer(vectors["Counties or equivalent"]);
            }
            map.addLayer(vectors["Minor civil division"]);
        }
    })
}
refazer()


let acordionear = function () {
    let labels = layerControl2._baseLayersList.querySelectorAll("label");
    let groups = Object.values(layers).map(e => e.group);
    let uniqueGroups = new Set(groups);
    let groupsElement = {};
    console.log(groups);
    uniqueGroups.forEach(groupName => {
        if (groupName) {
            let accordion = document.createElement("div");
            accordion.className = "ui accordion";
            let title = document.createElement("div");
            let content = document.createElement("div");
            accordion.append(title);
            accordion.append(content);
            title.innerHTML = `<i class="dropdown icon"></i>${groupName}`;
            title.className = "title";
            content.className = "content";
            labels[0].insertAdjacentElement("beforebegin", accordion);
            groupsElement[groupName] = [title, content];
        }
    });

    layerVals = Object.values(layers);
    for (let index = 0; index < layerVals.length; index++) {
        let groupName = layerVals[index].group;
        if (groupName) {
            console.log(groupsElement[groupName]);
            groupsElement[groupName][1].append(labels[index]);
        }
    }

    $('.ui.accordion').accordion({
        animateChildren: false
    })
    let layers2 = document.querySelector('.leaflet-right .leaflet-control-layers-base');

    layers2.querySelectorAll("label")[baseLayerActive.value].querySelector("span>span").classList.add("checked");

    let openedAccordion = Math.floor(baseLayerActive.value / 2)
    Object.values(groupsElement)[openedAccordion][0].classList.add("active");
    Object.values(groupsElement)[openedAccordion][1].classList.add("active");

    opacityLabel.innerHTML = "Opacity:";
    layers2.append(opacityLabel);
    layers2.append(slider);

}

let opacityLabel = document.querySelector('#opacity-label');
let slider = document.querySelector('.v-slider');
slider.remove();








baseLayerActive.value = 0;
acordionear();

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
    if (overlays.some(e => e == overlay) == false)
        overlays.push(overlay)
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
    let wkt = convertLatLngToWKT(overlay.getLatLngs()[0]);
    let res = await fetch(`${location.href.match(/(http:\/\/.*?)(:\d+)?\//)[1]}:9000/polygon?${new URLSearchParams({
        wkt: wkt,
        layer: activeLayer.value
    })}`);
    let obj = await res.json();
    if (polygons.some(e => e == overlay) === false)
        polygons.push(overlay);
    bindPopup(overlay, obj.mean[0]);
}

async function handleRectangle(overlay) {
    let res = await fetch(`${location.href.match(/(http:\/\/.*?)(:\d+)?\//)[1]}:9000/api?bbox=${overlay.getBounds().toBBoxString()}&layer=${activeLayer.value}`);
    let obj = await res.json();
    if (rectangles.some(e => e === overlay) === false) {
        rectangles.push(overlay);
    }
    bindPopup(overlay, obj.mean[0]);
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
    let res = await fetch(`${location.href.match(/(http:\/\/.*?)(:\d+)?\//)[1]}:9000/geojson?layer=${activeLayer.value}`, {
        method: 'POST',
        body: JSON.stringify({
            "geojson": layer.toGeoJSON()
        })
    });
    let obj = await res.json();
    if (shapes.some(e => e == layer) === false)
        shapes.push(layer);
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
//window.onload = openPopup;


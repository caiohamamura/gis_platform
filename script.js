let osm = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors', minZoom: 0, maxZoom: 18 });

let lyr = L.tileLayer('tms/{z}/{x}/{y}.png', { tms: 0, opacity: 0.7, attribution: "", minZoom: 0, maxZoom: 18, nativeZooms: [0, 1, 2, 3, 4, 5, 6, 7] });

let map = L.map('map', {
    layers: [osm, lyr],
}).setView([40, -90], 3);

L.control.scale().addTo(map);

// var basemaps = {"OpenStreetMap": osm}
// var overlaymaps = {"Layer": lyr}
// L.control.layers(basemaps, overlaymaps, {collapsed: true}).addTo(map);



// Allow drawing rectangle
let rectangle;
let isDrawing = false;
let startPoint, endPoint;
let thePopup;


function drawRectangle() {
    document.getElementById('draw').classList.add('drawing');
    map.dragging.disable();
    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    rectangle?.remove();
    rectangle = undefined;
    thePopup?.remove()
    thePopup = undefined;

    isDrawing = true;
}


async function onMouseUp() {
    document.getElementById('draw').classList.remove('drawing');
    map.dragging.enable();
    map.off('mousedown', onMouseDown);
    map.off('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    if (rectangle) {
        
        let bounds = rectangle.getBounds();
        let res = await fetch(`http://localhost:9000/api?bbox=${bounds.toBBoxString()}&layer=carbon`)
        let obj = await res.json();
        thePopup = L.popup()
            .setLatLng(bounds._northEast)
            .setContent(`<p>Mean: ${obj.mean[0]}</p>`)
            .addTo(map);

    }

    isDrawing = false;
}

function onMouseDown(e) {
    if (isDrawing) {
        startPoint = e.latlng;
        endPoint = e.latlng;
        rectangle = L.rectangle([startPoint, endPoint], { color: 'red' }).addTo(map);
        rectangle.on('mouseover', function() {
            thePopup?.addTo(map);
        });
    }
}

function onMouseMove(e) {
    if (isDrawing && rectangle) {
        endPoint = e.latlng;
        rectangle.setBounds(L.latLngBounds(startPoint, endPoint));
    }
}
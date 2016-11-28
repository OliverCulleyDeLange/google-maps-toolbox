var map;
var tmpPolygonMarkers = [];
var tmpPolygonCloseLine;
var tmpPolyLine;
var polygons = [];
var circles = [];
var selectedElement;

var metric = true;
function changeMetric(m) {
    metric = m;
    for (var i = 0; i < polygons.length; i++) {
        updatePolygonMeasures(polygons[i]);
    }
    for (var i = 0; i < circles.length; i++) {
        updateCircleMeasures(circles[i]);
    }
    if (selectedElement instanceof google.maps.Polygon){
        updatePolygonMeasures(selectedElement);
    } else if (selectedElement instanceof google.maps.Circle){
        updateCircleMeasures(selectedElement);
    }
    if (tmpPolygonMarkers.length > 2) {
            tmpPolyline.updateArea();
    } 
    if (tmpPolygonMarkers.length > 1) {
        tmpPolyline.updateLength();
    }
    
}
$(document).ready(DocLoaded);

function DocLoaded() {	
    metric = document.getElementById("myonoffswitch").checked;
    map = new google.maps.Map($("#map_div")[0], 
        {
                center: new google.maps.LatLng(53.148996, -1.448909),
                zoom: 7,
//                zoom: 18,
                mapTypeId: google.maps.MapTypeId.ROADMAP
        }
    );
    //Enable below functionality when finished - its annoying when testing
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            map.setCenter(initialLocation);
            map.setZoom(12);
            placeMarker(initialLocation, "You are here");
        });
    }
    google.maps.event.addListener(map, 'click', function(event) {
        if (newPolygonPointDoesntIntersect(event.latLng.lat(), event.latLng.lng())) {
            placeMarker(event.latLng, "Point " + tmpPolygonMarkers.length);
        }
    }); 
    google.maps.event.addListener(map, 'rightclick', function(event) {
//       placeCircle(event.latLng,map.getZoom());
        placeCircle(event.latLng);
    });
}
//
////PLACING MARKERS
// 
function placeMarker (location, infoBoxText){
    var marker = new google.maps.Marker({
        position: location,
        map: map,
        draggable: true
    });
    marker.infoBox = addInfoBox(marker,infoBoxText);
    tmpPolygonMarkers.push(marker);
    
    if (tmpPolygonMarkers.length===1) {
        google.maps.event.addListener(marker, 'click', function(event) {
            if (tmpPolygonMarkers.length > 2) {
                marker.infoBox.close();
                if (newPolygonPointDoesntIntersect(event.latLng.lat(), event.latLng.lng())) {
                    makePolygon();
                } 
            };
        }); 
    }

    drawPolyline();
    
    if (tmpPolygonMarkers.length > 1){
        google.maps.event.addListener(marker, 'rightclick', function(event) {
            if (removingPolygonPointWontLeaveIntersectingLines(marker)) {
                marker.infoBox.close();
                marker.setMap(null);
                var idx = tmpPolygonMarkers.indexOf(marker);
                if (idx > -1) {tmpPolygonMarkers.splice(idx, 1);} else {console.log("Couldn't remove marker from tmpPolygonMarkers array");}
                drawPolyline();
            } 
        });
    } else {
        google.maps.event.addListener(marker, 'rightclick', function(event) {
            if (tmpPolygonMarkers.length > 1) {
                var question = confirm("This is the polygon anchor, removing this will remove the whole polyline - proceed?");
                if (question) {
                    removeAll();
                }
            } else { removeAll(); }
            function removeAll() {
                marker.infoBox.close();
                for (var i = 0; i < tmpPolygonMarkers.length; i++) {
                    tmpPolygonMarkers[i].setMap(null);
                }
                if (typeof tmpPolyline !== 'undefined') {
                    tmpPolyline.setMap(null);
                }
                if (tmpPolygonCloseLine) tmpPolygonCloseLine.setMap(null);
                tmpPolygonMarkers = [];
                nullifyPolygonMeasures();
            }
        });
    }
}

function drawPolyline() {
    if (tmpPolygonMarkers.length > 1) {
        if (typeof tmpPolyline !== 'undefined') {
            tmpPolyline.setMap(null); //Remove if drawn
        }
        tmpPolyline = polyLine('#FF0000',getPosArrayFromMarkers(tmpPolygonMarkers));
        if (tmpPolygonMarkers.length > 2) {
            if (tmpPolygonCloseLine) tmpPolygonCloseLine.setMap(null);
            tmpPolygonCloseLine = polyLine('#00FF00',[tmpPolygonMarkers[tmpPolygonMarkers.length-1].getPosition(),tmpPolygonMarkers[0].getPosition()]);
//            tmpPolyline.updateArea();
        } else {
            if (tmpPolygonCloseLine) tmpPolygonCloseLine.setMap(null);
        }
        tmpPolyline.updateLength();
        tmpPolyline.updateArea();
        $( "#toolbox" ).accordion({active: 0});
    } else {
        if (typeof tmpPolyline !== 'undefined') {
            tmpPolyline.setMap(null); //Remove if only one marker
        }
        nullifyPolygonMeasures();
    }
}

function placeCircle (center) {
    	var circle = new google.maps.Circle({
            strokeColor: '#FF00FF',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.1,
            map: map,
            center: center,
            radius: google.maps.geometry.spherical.computeDistanceBetween(map.getBounds().getNorthEast(), map.getBounds().getSouthWest()) / 10,
            zIndex: 1000,
            draggable: true,
            clickable: true,
            editable: true
        });
        circles.push(circle);
        activateElement(circle);        
        google.maps.event.addListener(circle, 'radius_changed', function(index) {
            activateElement(circle);
            updateCircleMeasures(circle);
        });
        google.maps.event.addListener(circle, 'center_changed', function(index) {
            activateElement(circle);
            updateCircleMeasures(circle);
        });
        google.maps.event.addListener(circle, 'drag', function(index) {
            activateElement(circle);
            updateCircleMeasures(circle);
        });
        google.maps.event.addListener(circle, 'click', function(index) {
            activateElement(circle);
            updateCircleMeasures(circle); 
        });
        google.maps.event.addListener(circle, 'rightclick', function(index) {
            circle.label.close();
            circle.setMap(null);
            var idx = circles.indexOf(circle);
            if (idx > -1) {circles.splice(idx, 1);} else {console.log("Couldn't remove circle from circles array");}
            if (selectedElement === circle){ nullifyCircleMeasures();}
            circle.setDraggable(false); // Neded to stop annoying box that follows mouse around after removing object
        });
        circle.overallCircumference = circle.getRadius() * 2 * Math.PI;
        circle.overallArea = circle.getRadius() * circle.getRadius() * Math.PI;
        circle.label = new InfoBox({
            content: "<strong>Circumference:</strong> <br />" + getCircumferenceText(circle.overallCircumference) + "<br />" + 
                    "<strong>Area:</strong> <br />" + getAreaText(circle.overallArea),
            position: circle.getCenter(),
            closeBoxURL: "",
            isHidden: false,
            pane: "mapPane",
            enableEventPropagation: true
        });
        circle.updateCircumference = function() {
            circle.overallCircumference = circle.getRadius() * 2 * Math.PI ;
        };
        circle.updateArea = function() {
            circle.overallArea = circle.getRadius() * circle.getRadius() * Math.PI;
        };
        updateCircleMeasures(circle);
        circle.label.open(map);
}

function updateCircleMeasures(circle) {
    circle.updateCircumference(); 
    circle.updateArea();
    circle.label.setContent("<strong>Circumference:</strong> <br />" + getCircumferenceText(circle.overallCircumference) + "<br />" + 
                            "<strong>Area:</strong> <br />" + getAreaText(circle.overallArea));
    circle.label.setPosition(circle.getCenter());
    $("#aoc.result").html(getAreaText(circle.overallArea));
    $("#coc.result").html(getlengthText(circle.overallCircumference));
}
//
////Turning open polyline into a polygon
// 
function makePolygon() {
    //Create new polygon
    var polygon = new google.maps.Polygon({
        paths: getPosArrayFromMarkers(tmpPolygonMarkers),
        strokeColor: "#FF00FF",
        strokeOpacity: 0.5,
        strokeWeight: 1,
        fillColor: "#00FF00",
        fillOpacity: 0.20,
        map: map,
        zIndex: 1000,
        draggable: true,
        clickable: true,
        editable: true,
        geodesic: true
    });
    polygons.push(polygon);
    activateElement(polygon);        
    google.maps.event.addListener(polygon.getPath(), 'set_at', function(index) {
        activateElement(polygon);
        updatePolygonMeasures(polygon);
    });
    google.maps.event.addListener(polygon.getPath(), 'insert_at', function(index) {
        activateElement(polygon);
        updatePolygonMeasures(polygon);
    });
    google.maps.event.addListener(polygon, 'click', function(index) {
        activateElement(polygon);
        updatePolygonMeasures(polygon); 
    });
    google.maps.event.addListener(polygon, 'rightclick', function(index) {
            polygon.label.close();
            polygon.setMap(null);
            var idx = polygons.indexOf(polygon);
            if (idx > -1) {polygons.splice(idx, 1);} else {console.log("Couldn't remove polygon from polygons array");}
            if (selectedElement === polygon) {nullifyPolygonMeasures();}
            polygon.setDraggable(false); // Neded to stop annoying box that follows mouse around after removing object
        });
    polygon.updateLengthFromPolygon = function() {
        polygon.overallLength = 0;
        var vertices = polygon.getPath();
        for (var i = 0; i < vertices.getLength() -1; i++) {
            var pos1 = vertices.getAt(i);
            var pos2 = vertices.getAt(i+1);
            polygon.overallLength += google.maps.geometry.spherical.computeDistanceBetween(pos1,pos2);
        }
        this.overallLength += google.maps.geometry.spherical.computeDistanceBetween(vertices.getAt(i),vertices.getAt(0));
    };
    polygon.updateAreaFromPolygon = function() {
        polygon.overallArea = google.maps.geometry.spherical.computeArea(polygon.getPath());
         
    };
    polygon.label = new InfoBox({
        content: "<strong>Length:</strong> <br />" + getlengthText(polygon.overallLength) + "<br />" + 
                "<strong>Area:</strong> <br />" + getAreaText(polygon.overallArea),
        position: getCenterOfLatLngArray(getPosArrayFromPolyPath(polygon.getPath())),
        isHidden: false,
        pane: "mapPane",
        enableEventPropagation: true,
        pixelOffset: new google.maps.Size(-25,-50, "px", "px")
    });
    updatePolygonMeasures(polygon);
    polygon.label.open(map, polygon.getPath[0]);
    //Remove lines & markers that made up polyline
    tmpPolygonCloseLine.setMap(null);
    tmpPolygonCloseLine = null;
    tmpPolyline.setMap(null);
    removetmpPolygonMarkers();
}

//
//// Update sidebar and infobox measures for given Polygon
// 
function updatePolygonMeasures(polygon) {
    polygon.updateLengthFromPolygon(); 
    polygon.updateAreaFromPolygon();
    polygon.label.setContent("<strong>Length:</strong> <br />" + getlengthText(polygon.overallLength) + "<br />" + 
                             "<strong>Area:</strong> <br />" + getAreaText(polygon.overallArea));
    polygon.label.setPosition(getCenterOfLatLngArray(getPosArrayFromPolyPath(polygon.getPath())));
    $("#aop.result").html(getAreaText(polygon.overallArea));
    $("#lop.result").html(getlengthText(polygon.overallLength));
}

function addInfoBox(marker,infoboxText) {
	var infobox = new InfoBox({
		 disableAutoPan: false,
		 zIndex: null,
                 content: infoboxText
	});
	
	google.maps.event.addListener(marker, 'mouseover', function(event) {
            infobox.open(map, marker);
	});
	
	google.maps.event.addListener(marker, 'mouseout', function(event) {
            infobox.close();
	});
        return infobox;
}

function circumferenceOfCircleMeasure() {
    
}

function areaOfCircleMeasure() {
    
}

//
//// REALLY USEFUL FUNCTIONS!
// 
function getCenterOfLatLngArray(posArray) {
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0; i < posArray.length; i++) {
        bounds.extend(posArray[i]);
    }
    return bounds.getCenter();
}

function getPosArrayFromMarkers(m) {
    var arrayOfLatLng = [];
    for (var i=0; i<m.length; i++) {
        arrayOfLatLng.push(m[i].getPosition());
    }
    return arrayOfLatLng;
}

function getPosArrayFromPolyPath(p) {
    var posArray = [];
    for (var i = 0; i < p.getLength(); i++) {
            posArray.push(p.getAt(i));
    }
    return posArray;
}

function getAreaText(area){
//    console.log("Area = " + area + " metres2 = " + area * 1.0936133 + " yards, = " + area * 0.000621371192 +  " miles");
    if (metric){
        return roundNumber(area,2) + " square metres<br />" + roundNumber(area/1000,2) + " square km";
    } else {
        return roundNumber(area * 1.0936133,2) + " square yards<br />" + roundNumber(area * 0.000621371192 ,2) + " square miles";
    }
}

function getlengthText(length){
//    console.log("Length = " + length + " metres = " + length * 1.0936133 + " yards, = " + length * 0.000621371192 + " miles");
    if (metric){
        return roundNumber(length,2) + " metres<br />" + roundNumber(length/1000,2) + " km";
    } else {
        return roundNumber(length * 1.0936133,2) + " yards<br />" + roundNumber(length * 0.000621371192,2) + " miles";
    }
}

function getCircumferenceText(circ) {
    if (metric){
        return roundNumber(circ,2) + " metres<br />" + roundNumber(circ/1000,2) + " km";
    } else {
        return roundNumber(circ * 1.0936133,2) + " yards<br />" + roundNumber(circ * 0.000621371192,2) + " miles";
    }
}

function roundNumber(number, digits) {
    var multiple = Math.pow(10, digits);
    var rndedNum = Math.round(number * multiple) / multiple;
    return rndedNum;
}

function polyLine(colour, posArray){
    var line = new google.maps.Polyline({
            path: posArray,
            strokeColor: colour,
            strokeOpacity: 0.5,
            strokeWeight: 2,
            map: map
        });
        
    line.updateArea = function() {
        tmpPolyline.overallArea = 0;
        tmpPolyline.overallArea = google.maps.geometry.spherical.computeArea(getPosArrayFromPolyPath(tmpPolyline.getPath()));
        $("#aop.result").html(getAreaText(tmpPolyline.overallArea)); 
    };
    line.updateLength = function() {
        tmpPolyline.overallLength = 0;
        for (var i=0; i<tmpPolygonMarkers.length - 1; i++) {
            tmpPolyline.overallLength += google.maps.geometry.spherical.computeDistanceBetween(tmpPolygonMarkers[i].getPosition(),tmpPolygonMarkers[i+1].getPosition());
        }
        $("#lop.result").html(getlengthText(tmpPolyline.overallLength));
    };
    
    return line;
}

function removetmpPolygonMarkers() {
    for (var i = 0; i < tmpPolygonMarkers.length; i++ ) {
        tmpPolygonMarkers[i].setMap(null);
    }
    tmpPolygonMarkers = [];
}

function hideMarkers(arrMarkers) {
  if (arrMarkers) {
	for( var i = 0, n = arrMarkers.length; i < n; ++i ) {
	  arrMarkers[i].setVisible(false);
	}
  }
}

function showMarkers(arrMarkers) {
  if (arrMarkers) {
	for( var i = 0, n = arrMarkers.length; i < n; ++i ) {
	  arrMarkers[i].setVisible(true);
	}
  }
}

function activateElement(elem) {
    if (typeof selectedElement !== 'undefined') selectedElement.setOptions({fillColor: "#FF0000"});
    if (elem.fillColor !== "#00FF00") elem.setOptions({fillColor: "#00FF00"});
    selectedElement = elem;
    if (elem instanceof google.maps.Polygon) {
        $( "#toolbox" ).accordion({active: 0});
    } else if (elem instanceof google.maps.Circle){
        $( "#toolbox" ).accordion({active: 1});
    }
}

function nullifyPolygonMeasures() {
    $("#lop.result").html("");
    $("#aop.result").html("");
}
function nullifyCircleMeasures() {
    $("#coc.result").html("");
    $("#aoc.result").html("");
}

function removingPolygonPointWontLeaveIntersectingLines(markerToRemove) {
    var markerIndex = tmpPolygonMarkers.indexOf(markerToRemove);
    var prevMarkerPos = tmpPolygonMarkers[markerIndex -1].position;
    var nextMarkerPos = tmpPolygonMarkers[markerIndex +1].position;
    
    for (var i = 0; i < tmpPolygonMarkers.length-1; i++) {
        if (i == markerIndex) { 
            i++; continue; 
        }
        var aPos = tmpPolygonMarkers[i].position;
        var bPos = tmpPolygonMarkers[i+1].position;
        if (lineIntersect(prevMarkerPos.lat(),prevMarkerPos.lng(), nextMarkerPos.lat(), nextMarkerPos.lng(), 
                aPos.lat(), aPos.lng(), bPos.lat(), bPos.lng())) return false;
    }
    return true;  
}

function newPolygonPointDoesntIntersect(newLat,newLng) {
    if (tmpPolygonMarkers.length > 2) {
        var originPos = tmpPolygonMarkers[tmpPolygonMarkers.length-1].position;
        var originLat = originPos.lat();
        var originLng = originPos.lng();

        for (var i = 0; i < tmpPolygonMarkers.length-2; i++) {
            var aPos = tmpPolygonMarkers[i].position;
            var bPos = tmpPolygonMarkers[i+1].position;
            if (lineIntersect(newLat,newLng, originLat, originLng, 
                    aPos.lat(), aPos.lng(), bPos.lat(), bPos.lng())) return false;
        }
    }
    return true;
}

//http://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
function lineIntersect(x1,y1,x2,y2, x3,y3,x4,y4) {
    var x=((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
    var y=((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
    if (isNaN(x)||isNaN(y)) {
        return false;
    } else {
        if (x1>=x2) {
            if (!(x2<=x&&x<=x1)) {return false;}
        } else {
            if (!(x1<=x&&x<=x2)) {return false;}
        }
        if (y1>=y2) {
            if (!(y2<=y&&y<=y1)) {return false;}
        } else {
            if (!(y1<=y&&y<=y2)) {return false;}
        }
        if (x3>=x4) {
            if (!(x4<=x&&x<=x3)) {return false;}
        } else {
            if (!(x3<=x&&x<=x4)) {return false;}
        }
        if (y3>=y4) {
            if (!(y4<=y&&y<=y3)) {return false;}
        } else {
            if (!(y3<=y&&y<=y4)) {return false;}
        }
    }
    return true;
}
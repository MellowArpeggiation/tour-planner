/*jslint browser: true, devel: true, eqeq: true*/
"use strict";

// Global functions
/*global google, Modernizr, $*/

// Function list
/*global initialize, geocodeAddress, setMapViewport, calculateRoute,
	generateTable, setAttractionMarkers, notifyUser, removeNotifications,
	initMap, initPlanTour, initAttractions, initHotels, loadTrip, saveTrip,
	calculateTotalDistance, setTimeTable, getPlacesArray, getStartTime,
	timeCalculation, findPlaceIdAndName, createMarker, addAttraction*/

// Initialised in mapproperties.js
/*global reasonableZoom, mapProperties*/

// Google Maps specific variable declaration
var geocoder,
	directionsDisplay,
	directionsService,
	placesService,
	infoWindow,
	map;

// Variables for 'autocomplete' on the start and end location text boxes
var startLocation,
	endLocation,
	userLocation;

// variables for displaying information on start and end locations
var startLocationName,
	startLocationId,
	endLocationName,
	endLocationId;

// constant for time when hotel must be found
var lateTime = 20;
// constant for time when leaving the hotel
var earlyTime = 9;
// constant for duration of visiting places (1h - 60mins)
var visitingTime = 60;

var departureDateTime = null;
var totalDistance = 0;

var placesAndHotels = [];
var timeTable = [];

var userMarker;

var attractionMarkers = [];

// Store the travel type
var travelType = "walking",
	isLooping = false;

var minimumRating = 2;

// Transit, traffic, and bicycle layers
var transitLayer,
	trafficLayer,
	bicycleLayer;

/* FOR POPUP PAGE */
// Variables of the current location set by asynchronous method 
var currentLocationName,
	currentLocation,
	currentMarkerLocation,
	currentMarkerName;

var allWaypoints = [];
var wpType = {
	ATTRACTION: "a",
	HOTEL: "h"
};

function initialize() {
	initMap();
	initPlanTour();
	initAttractions();
	initHotels();
	
	loadTrip();
}

function initMap() {
	//Add Map to Div
	map = new google.maps.Map(document.getElementById("map-canvas"), mapProperties);
	
	// Detect browser location support
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function (position) {
			userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
			map.setCenter(userLocation);
			map.setZoom(reasonableZoom);
			$("#set-location").show();
		}, function () {
			console.log("Geolocation service failed");
		});
	} else {
		console.log("Browser does not support Geolocation");
	}
	
	// Prepare directions API
	directionsDisplay = new google.maps.DirectionsRenderer();
	directionsService = new google.maps.DirectionsService();
	
	// Prepare places API
	placesService = new google.maps.places.PlacesService(map);
	
	//Initialise Geocoder object
	geocoder = new google.maps.Geocoder();
	
	transitLayer = new google.maps.TransitLayer();
	trafficLayer = new google.maps.TrafficLayer();
	bicycleLayer = new google.maps.BicyclingLayer();
	
	google.maps.event.addListener(map, "idle", function () {
		var request = {
			bounds: map.getBounds()
		};
		placesService.nearbySearch(request, setAttractionMarkers);
	});
	
	infoWindow = new google.maps.InfoWindow();
}

function initPlanTour() {
	// Function scope variables
    var startAutocomplete,
		endAutocomplete,
		attractionAutocomplete,
		hotelAutocomplete;

	// Initialising the autocomplete objects, restricting the search
	// to geographical location types.
	startAutocomplete = new google.maps.places.Autocomplete((document.getElementById('start-location')), { types: ['geocode'] });
	endAutocomplete = new google.maps.places.Autocomplete((document.getElementById('end-location')), { types: ['geocode'] });

	// When the user selects an address from the dropdown,
	// populate the address fields in the form.
	// start location autocomplete event
	google.maps.event.addListener(startAutocomplete, "place_changed", function () {
		geocodeAddress(document.getElementById("start-location").value, 1);
	});

	// destination location autocomplete event
	google.maps.event.addListener(endAutocomplete, "place_changed", function () {
		geocodeAddress(document.getElementById("end-location").value, 2);
	});
	
	// Initialise date picker for departure time
	if (!Modernizr.inputtypes["datetime-local"]  || navigator.userAgent.toLowerCase().indexOf("chrome") > -1) {
		$("#departure-time").datetimepicker({
			sideBySide: true,
			format: "D MMM YYYY h:mm a"
		});
	} else {
		// Remove the button and place the input field in the parent
		// styling breaks if the button is removed without reordering DOM
		$("#departure-time>input").attr("type", "datetime-local");
	}
}

function initAttractions() {
	// Function scope variables
	var attractionAutocomplete,
		addressSegments;
					
	// Initialising the autocomplete objects, restricting the search
	// to geographical location types.
	attractionAutocomplete = new google.maps.places.Autocomplete(document.getElementById("attraction-location"), {
		types: ["establishment"],
		componentRestrictions: {country: "aus"}
	});
		
	// When the user selects an address from the dropdown,
	// populate the address fields in the form.
	//start location autocomplete event
	google.maps.event.addListener(attractionAutocomplete, "place_changed", function () {
		addressSegments = $("#attraction-location").val().split(",");
		currentLocationName = addressSegments[0] + "," + addressSegments[1];
		geocodeAddress(document.getElementById("attraction-location").value, 3);
		
		$("#add-attraction").removeAttr("disabled");
	});
	
	$("#attraction-table-container").hide();
}

function initHotels() {
	// Set cost slider
	if (typeof (Storage) !== "undefined" && localStorage.getItem("has-saved")) {
		var costRange = localStorage.getItem("cost-range").split(",");
		$("#cost-range").slider({
			value: [parseInt(costRange[0], 10), parseInt(costRange[1], 10)]
		});
	} else {
		$("#cost-range").slider({});
	}
	
	$("#cost-range").on("slide", function (slideEvt) {
		$("#cost-min").text("$" + slideEvt.value[0]);
		$("#cost-max").text("$" + slideEvt.value[1]);
	});
}

//Takes the entered address and set the start and end location latitude and longitude
//The assign variable being a 1 or a 2 determines whether the locations is the start or destination
function geocodeAddress(location, assign) {
	geocoder.geocode({'address': location}, function (results, status) {
		if (status === google.maps.GeocoderStatus.OK) {
			//global variable assignment
			if (assign === 1) {
				startLocation = results[0].geometry.location;
			} else if (assign === 2) {
				endLocation = results[0].geometry.location;
			} else if (assign === 3) {
				currentLocation = results[0].geometry.location;
			}
			
			if (assign !== 3) {
				calculateRoute();
			}
		} else {
			console.log('Geocode was not successful for the following reason: ' + status);
		}
	});
}


function setMapViewport(arrayOfLocations) {
	var i, mapBounds;
	mapBounds = new google.maps.LatLngBounds();
	if (arrayOfLocations.length > 0) {
		for (i = 0; i < arrayOfLocations.length; i += 1) {
			if (arrayOfLocations[i] != null) {
				mapBounds.extend(arrayOfLocations[i]);
			}
		}
		
		map.fitBounds(mapBounds);
		
		if (arrayOfLocations.length === 1) {
			map.setZoom(reasonableZoom);
		}
	}
}

function addAttractionFromMarker() {
	currentLocationName = currentMarkerName;
	currentLocation = currentMarkerLocation;
	
	addAttraction();
}

function addAttraction() {
	if (allWaypoints.length < 8) {
		removeNotifications();
		allWaypoints.push({
			name: currentLocationName,
			location: currentLocation,
			distance: "0 km",
			time: "00:00",
			wpType: wpType.ATTRACTION
		});

		// Clears the attractions auto complete box 
		document.getElementById("attraction-location").value = '';
		$("#add-attraction").attr("disabled", true);

		calculateRoute();
	} else {
		notifyUser("Maximum Waypoints Set", "You have reached the maximum amount of waypoints currently allowed: 8", "info");
	}
}

function generateTable(response) {
    var table,
        row,
        locationNameCell,
        travelInfoCell,
        infoButtonCell,
        closeButtonCell,
		waypointOrder,
		currentWaypoint,
        i;
    
	table = document.getElementById("attraction-table");

	// Delete contents of table
	$(table).empty();
	
	waypointOrder = response.routes[0].waypoint_order;
	console.log(waypointOrder.length);
	console.log(allWaypoints.length);
	
	if (allWaypoints.length !== 0) {
		$("#attraction-table-container").show();
		// Attractions
		for (i = 0; i < waypointOrder.length; i += 1) {
			currentWaypoint = allWaypoints[waypointOrder[i]];
			
			currentWaypoint.time = response.routes[0].legs[i].duration.text;
			currentWaypoint.distance = response.routes[0].legs[i].distance.text;
			
			row = table.insertRow(-1);
			
			locationNameCell = row.insertCell(0);
			travelInfoCell = row.insertCell(1);
			infoButtonCell = row.insertCell(2);
			closeButtonCell = row.insertCell(3);

			locationNameCell.innerHTML = currentWaypoint.name;
			travelInfoCell.innerHTML = currentWaypoint.time + "<br />" + currentWaypoint.distance;
			infoButtonCell.innerHTML = "<span class='glyphicon glyphicon-info-sign info-button'></span>";
			closeButtonCell.innerHTML = "<button type='button' class='close' onclick='deleteAttraction(this)' data-wpnum='" + waypointOrder[i] + "'>&times;</button>";
		}
	}
		
	// To destination
	i = response.routes[0].legs.length - 1;

	row = table.insertRow(-1);
	
	locationNameCell = row.insertCell(0);
	travelInfoCell = row.insertCell(1);
	infoButtonCell = row.insertCell(2);
	closeButtonCell = row.insertCell(3);

	locationNameCell.innerHTML = "To Destination";
	travelInfoCell.innerHTML = response.routes[0].legs[i].duration.text + "<br />" + response.routes[0].legs[i].distance.text;
	infoButtonCell.innerHTML = "";
	closeButtonCell.innerHTML = "";

	// Totals
	row = table.insertRow(-1);

	locationNameCell = row.insertCell(0);
	travelInfoCell = row.insertCell(1);
	infoButtonCell = row.insertCell(2);
	closeButtonCell = row.insertCell(3);

	locationNameCell.innerHTML = "Total Distance and Travel Time";
	travelInfoCell.innerHTML = "00:00<br />" + totalDistance;
	infoButtonCell.innerHTML = "";
	closeButtonCell.innerHTML = "";
}

function deleteAttraction(button) {
	var row = $(button).attr("data-wpnum");
	allWaypoints.splice(row, 1);
	
	calculateRoute();
}

function deleteAllAttractions() {
	allWaypoints = [];
	
	calculateRoute();
}

function shareRoute() {
	
}

/** Get the Google travel method **/
function getGTravelMode() {
	var travelMode;
	if (travelType === "driving") {
		travelMode = google.maps.TravelMode.DRIVING;
	} else if (travelType === "walking") {
		travelMode = google.maps.TravelMode.WALKING;
	} else if (travelType === "cycling") {
		travelMode = google.maps.TravelMode.BICYCLING;
	} else if (travelType === "transit") {
		travelMode = google.maps.TravelMode.TRANSIT;
	}
	return travelMode;
}

function directionsCallback(response, status) {
	if (status === google.maps.DirectionsStatus.OK) {
		directionsDisplay.setDirections(response);

		calculateTotalDistance(response);
		setTimeTable(response);
		getPlacesArray(response);
		
		
	} else {
		notifyUser("Routing failed", "The application has failed to plot your route", "danger");
	}
	
	generateTable(response);
}

function calculateRoute() {
	// Function level variables
	var request,
		allLocations,
		waypoints = [],
		i;
	
	// Calculate and draw directions
	for (i = 0; i < allWaypoints.length; i += 1) {
		waypoints.push({
			location: allWaypoints[i].location,
			stopover: true
		});
	}
	
	if (startLocation != undefined && endLocation != undefined) {
		directionsDisplay.setMap(map);
		request = {
			origin: startLocation,
			destination: endLocation,
			travelMode: getGTravelMode(),
			waypoints: waypoints,
			optimizeWaypoints: true
		};
		directionsService.route(request, directionsCallback);
	} else if (startLocation != undefined && isLooping) {
		directionsDisplay.setMap(map);
		request = {
			origin: startLocation,
			destination: startLocation,
			travelMode: getGTravelMode(),
			waypoints: waypoints,
			optimizeWaypoints: true
		};
		directionsService.route(request, directionsCallback);
	} else {
		directionsDisplay.setMap(null);
	}
	
	// Set the maps view
	allLocations = [];
	if (startLocation != undefined && endLocation != "null") {
		allLocations.push(startLocation);
	}
	if (endLocation != undefined && endLocation != "null") {
		allLocations.push(endLocation);
	}
	for (i = 0; i < allWaypoints.length; i += 1) {
		allLocations.push(allWaypoints[i].location);
	}
	
    setMapViewport(allLocations);
}

/** Generates and regenerates all the nearby attraction markers **/
function setAttractionMarkers(results, status) {
	if (status == google.maps.places.PlacesServiceStatus.OK) {
		var i;
		for (i = 0; i < attractionMarkers.length; i += 1) {
			attractionMarkers[i].setMap(null);
		}
		attractionMarkers = [];

		for (i = 0; i < results.length; i += 1) {
			createMarker(results[i]);
		}
	}
}

function createMarker(place) {
	var placeLoc = place.geometry.location,
		marker = new google.maps.Marker({
			map: map,
			position: place.geometry.location,
			icon: {
				url: place.icon,
				origin: new google.maps.Point(0, 0),
				anchor: new google.maps.Point(14, 14),
				scaledSize: new google.maps.Size(28, 28)
			}
		});

	google.maps.event.addListener(marker, "click", function () {
		placesService.getDetails(place, function (result, status) {
			if (status != google.maps.places.PlacesServiceStatus.OK) {
				console.log(status);
				return;
			}
			infoWindow.setContent("<span class='text-center'>" + result.name + "<br /><button class='btn btn-primary' onclick='addAttractionFromMarker()' ontouchend='addAttractionFromMarker()'>Add</button></span>");
			infoWindow.open(map, marker);
			
			currentMarkerLocation = result.geometry.location;
			currentMarkerName = result.name;
		});
	});

	attractionMarkers.push(marker);
}

function setTravelType(originElement) {
	travelType = originElement.name;
	$("#travel-mode>.btn-group").each(function () {
		$(this).children().first().attr("class", "btn btn-default");
	});
	if (travelType === "transit") {
		$(originElement).attr("class", "btn btn-warning");
		notifyUser("Experimental Transit.", "This travel mode is experimental and subject to change by Google", "warning");
	} else {
		$(originElement).attr("class", "btn btn-success");
		removeNotifications();
	}
	
	transitLayer.setMap(undefined);
	bicycleLayer.setMap(undefined);
	trafficLayer.setMap(undefined);
	
	switch (travelType) {
    case "transit":
        transitLayer.setMap(map);
        break;
    case "cycling":
        bicycleLayer.setMap(map);
        break;
    case "driving":
        trafficLayer.setMap(map);
        break;
	}
	
	calculateRoute();
}

function setRating(originElement, newRating) {
	minimumRating = newRating;
	$("#hotel-rating>.btn-group").each(function () {
		$(this).children().first().attr("class", "btn btn-default");
	});
	$(originElement).attr("class", "btn btn-success");
}

function setRoundTrip(button) {
	// Returns a string rather than a boolean
	// ALSO is inverted
	if ($(button).attr("aria-pressed") !== "true") {
		isLooping = true;
		$("#end-location").hide();
		$(button).addClass("btn-success");
		$(button).removeClass("btn-default");
		
		endLocation = undefined;
		$("#end-location").val("");
	} else {
		isLooping = false;
		$("#end-location").show();
		$(button).addClass("btn-default");
		$(button).removeClass("btn-success");
	}
	
	calculateRoute();
}

function setCurrentLocation() {
	startLocation = userLocation;
	console.log(userLocation);
	
	geocoder.geocode({'latLng': userLocation}, function (results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			// Grab the first result as the address
			$("#start-location").val(results[0].formatted_address);
		} else {
			console.log('Geocoder failed due to: ' + status);
		}
	});
	
	calculateRoute();
}

/** Save and load the trip at the beginning and end of each session, 
	Save/load buttons are not user friendly **/
function saveTrip() {
	if (typeof (Storage) !== "undefined") {
		// All inputs with an ID saved
		$("input").each(function () {
			var id = $(this).attr("id"),
				value = $(this).val();
			localStorage.setItem(id, value);
		});
		
		// Button states
		localStorage.setItem("travel-type", travelType);
		localStorage.setItem("round-trip", isLooping);
		localStorage.setItem("minimum-rating", minimumRating);
		
		// Attraction list
		localStorage.setItem("attractions", JSON.stringify(allWaypoints));
		
		// Start and End locations
		localStorage.setItem("start-latlng", JSON.stringify(startLocation));
		localStorage.setItem("end-latlng", JSON.stringify(endLocation));
		
		localStorage.setItem("has-saved", true);
		
		console.log("Saving successful");
	} else {
		return "Your tour plan can not be saved";
	}
}

setInterval(saveTrip, 5000);

function loadTrip() {
	if (typeof (Storage) !== "undefined") {
		if (!localStorage.getItem("has-saved")) {
			return;
		}
		
		var id,
			value,
			costRange,
			roundTripButton,
			currentTravelButton,
			currentRatingButton,
			currentLatLng,
			currentLatLngParsed,
			i;
		
		// All inputs with an ID loaded
		$("input").each(function () {
			id = $(this).attr("id");
			value = localStorage.getItem(id);
			
			$(this).val(value);
		});
		
		/* Button states */
		// Round trip state
		if (localStorage.getItem("round-trip") === "true") {
			roundTripButton = document.getElementById("round-trip");
			$(roundTripButton).attr("aria-pressed", false);
			setRoundTrip(roundTripButton);
		}
		
		// Travel type state
		currentTravelButton = $("[name=" + localStorage.getItem("travel-type") + "]").get(0);
		setTravelType(currentTravelButton);
		
		// Minimum rating state
		currentRatingButton = $("#hotel-rating div:nth-child(" + localStorage.getItem("minimum-rating") + ") button").get(0);
		setRating(currentRatingButton, localStorage.getItem("minimum-rating"));
		
		
		// Attraction array
		allWaypoints = JSON.parse(localStorage.getItem("attractions"));
		
		// Fix JSON parse bug
		for (i = 0; i < allWaypoints.length; i += 1) {
			allWaypoints[i].location = new google.maps.LatLng(allWaypoints[i].location.A, allWaypoints[i].location.F);
		}
		
		// Start and End locations
		if (localStorage.getItem("start-latlng") != "undefined") {
			currentLatLng = JSON.parse(localStorage.getItem("start-latlng"));
			
			startLocation = new google.maps.LatLng(currentLatLng.A, currentLatLng.F);
		}
		if (localStorage.getItem("end-latlng") != "undefined") {
			currentLatLng = JSON.parse(localStorage.getItem("end-latlng"));
			
			endLocation = new google.maps.LatLng(currentLatLng.A, currentLatLng.F);
		}
		
		calculateRoute();
	} else {
		notifyUser("Local Storage Unavailable", "Your device does not support Local Storage, your tour will not be saved", "danger");
	}
}

function changeTab(tabName) {
	var newTab = $("#planTab a[href='" + tabName + "']");
	newTab.tab("show");
	
	$("#footer-tabs a").each(function () {
		$(this).removeAttr("class");
		if ($(this).attr("href") === tabName) {
			$(this).attr("class", "active");
		}
	});
	
	$(".current-tab-title").html($("#planTab>.active>a").html());
}

/** type includes success, info, warning, danger **/
function notifyUser(title, text, type) {
	// Can't do multiline strings apparently?
	var html = "<div class='alert alert-" + type + " alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong><span class='glyphicon glyphicon-" + type + "-sign'></span> " + title + "</strong> " + text + "</div>";
	$("#popup-container").html(html);
}

function removeNotifications() {
	$("#popup-container").html("");
}

$(window).on("beforeunload", function () {
	return saveTrip();
});

/** Parameter = location
	sort by rating specified on the third tab
**/
function findNearbyHotel() {
	var request;

	request = {
		location: startLocation,
		types: ['lodging'],
		rankBy: google.maps.places.RankBy.DISTANCE
	};

	placesService.nearbySearch(request, function (result, status) {
		if (status == google.maps.places.PlacesServiceStatus.OK) {
			console.log("OK");
		}
	});
}

function getPlaceInfo(id) {
	var request,
		attractionImage;
	
	request = {
		placeId: id
	};

	placesService.getDetails(request, function (place, status) {
		if (status == google.maps.places.PlacesServiceStatus.OK) {
			if (place.photos != null) {
				attractionImage.src = place.photos[0].getUrl({
					'maxWidth': 200,
					'maxHeight': 200
				});
			}
			if (place.name != null) {
				$('#attractionDetailsName').text(place.name);
			}
			if (place.formatted_address != null) {
				$('#attractionDetailsAddress').text(place.formatted_address);
			}
			if (place.formatted_phone != null) {
				$('#attractionDetailsPhone').text(place.formatted_phone);
			}
			if (place.opening_hours != null && place.weekday_text != null) {
				$('#attractionDetailsOpeningHours').text(place.weekday_text[0] + place.weekday_text[1] + place.weekday_text[2]);
			}
			if (place.rating != null) {
				$('#attractionDetailsRating').text(place.rating);
			}
			if (place.website != null) {
				$('#attractionDetailsWebsite').text(place.website);
			}
		}
	});
}

function calculateTotalDistance(response) {
	var i;
	totalDistance = 0;
	
	for (i = 0; i < response.routes[0].legs.length; i += 1) {
		totalDistance += response.routes[0].legs[i].distance.value;
	}
	
	totalDistance = (totalDistance / 1000).toFixed(1) + " km"; // Convert to km
}

function getPlacesArray(response) {
	var allPlaces = [],
		s_location,
		e_location,
		i,
		obj,
		exit;
	
	// add start location
	s_location = {name: startLocationName, location: startLocation, id: startLocationId};
	allPlaces.push(s_location);
	
	for (i = 0; i < response.routes[0].legs.length; i += 1) {
		// find name and id in array of attractions
		// if not found, then select name and id of destination point
		
		e_location = findPlaceIdAndName(response.routes[0].legs[i].end_location);
		// add end location
		if (e_location == null) {
			e_location = {name: endLocationName, location: endLocation, id: endLocationId};
		}
		allPlaces.push(e_location);
	}

	exit = false;

	while (!exit) {
		obj = timeCalculation(0, allPlaces, response);
		console.log(obj);
		allPlaces = obj.list;
		console.log("all places: ", allPlaces);
		if (obj.index == obj.list.length - 1) {
			exit = true;
		}
	}
	
	console.log(timeTable);
}

function getStartTime() {
	var startTime = $('#startTime').val(),
		startTimeFormattedDate = new Date(startTime);
	departureDateTime = startTimeFormattedDate;
	return startTimeFormattedDate;
}

function setTimeTable(response) {
	var i;
	timeTable[0] = 0;
	
	for (i = 0; i < response.routes[0].legs.length; i += 1) {
		timeTable[i + 1] = response.routes[0].legs[i].duration.value;
	}
}

function findPlaceIdAndName(location) {
	var object = null,
		i;
	for (i = 0; i < allWaypoints.length; i += 1) {
	
		if (allWaypoints[i].location.A == location.A && allWaypoints[i].location.F == location.F) {
			object = {name: allWaypoints[i].name, location: allWaypoints[i].location, id: allWaypoints[i].id};
		}
	}
	return object;
}

function timeCalculation(fromWhichIndex, placeList, response) {
	var newList = [],
		finished = false,
		start = getStartTime(),
		currentDate,
		indexFinished,
		hours,
		i,
		j;
	
	if (departureDateTime != null) {
		currentDate = departureDateTime;
	} else {
		currentDate = start;
	}
	
	// if first location is not hotel already
	if (placesAndHotels[0] != "h") {
		// then check if start time is too late or too early
		
		if (currentDate.getHours() >= lateTime || currentDate.getHours() < earlyTime) {
			newList[0] = "Hotel";
			placesAndHotels[0] = "h";
			for (i = 0; i < placeList.length; i += 1) {
				newList[i + 1] = placeList[i];
				placesAndHotels[i + 1] = "p";
			}
			finished = true;
			indexFinished = 0;
			
		} else {
			placesAndHotels[0] = "p";
			newList = placeList;
		}
	} else {
		newList[0] = placeList[0];
	}

	if (!finished) {
	
		for (i = 1; i < placeList.length; i += 1) {
			//if finished then break and return value
			if (finished) {
				break;
			}
			if (placesAndHotels[i - 1] != "h") {
				// if last place wasn't a hotel, add hours allocated for visiting
				currentDate.setMinutes(currentDate.getMinutes() + timeTable[i - 1] + visitingTime);
				timeTable[i - 1] = timeTable[i - 1] + visitingTime;
			} else {
				// if previous location was hotel, calculate current time 
				hours = 0;
				if (currentDate.getHours() >= lateTime) {
					hours = (24 - currentDate.getHours()) + earlyTime;
				} else if (currentDate.getHours() < earlyTime) {
					hours = earlyTime - currentDate.getHours();
				}
				currentDate = currentDate.setHours(currentDate.getHours() + hours);
				
				timeTable[i - 1] = hours * 60 + timeTable[i - 1];
			}
			// checking current date
			
			console.log(placesAndHotels);

			currentDate = new Date(currentDate);

			if (currentDate.getHours() >= lateTime || currentDate.getHours() < earlyTime) {
				// copy old list prior to current location
				for (j = 0; j < i; j += 1) {
					newList[j] = placeList[j];
					placesAndHotels[j] = "p";
				}
				
				newList[i] = "Hotel";
				placesAndHotels[i] = "h";
				
				for (j = i + 1; j < placeList.length; j += 1) {
					newList[j] = placeList[j];
					placesAndHotels[j] = "p";
				}
				finished = true;
				indexFinished = i;
			} else {
				placesAndHotels[i] = "p";
				newList = placeList;
				indexFinished = i;
			}
		}
	}

	// index is a next stop after hotel
	return {index: indexFinished, list: newList};
}
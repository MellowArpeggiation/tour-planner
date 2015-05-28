// Preset Locations
var australia = new google.maps.LatLng(-24.994167, 134.866944);

var fullZoom = 4;
var reasonableZoom = 10;

// Company colours
var blueIris = "#2B167B";
var emerald = "#08CA74";
var bellyDance = "#F05329";

var mapProperties = {
	center: australia,
	zoom: fullZoom,
	mapTypeId: google.maps.MapTypeId.ROADMAP,
	disableDefaultUI: true,
	styles: [
		{
			stylers: [
				{ hue: blueIris },
				{ saturation: 0 }
			]
		}, {
			featureType: "road",
			elementType: "geometry",
			stylers: [
				{ lightness: 60 },
				{ visibility: "simplified" }
			]
		}, {
			elementType: "labels",
			stylers: [
				{ visibility: "off" }
			]
		}, {
			featureType: "road.highway",
			elementType: "geometry",
			stylers: [
				{ hue: bellyDance }
			]
		}, {
			featureType: "poi.attraction",
			elementType: "geometry",
			stylers: [
				{ hue: bellyDance },
				{ saturation: 50 },
				{ lightness: -10 }
			]
		}, {
			featureType: "poi.sports_complex",
			elementType: "geometry",
			stylers: [
				{ hue: bellyDance },
				{ saturation: 50 },
				{ lightness: -10 }
			]
		}, {
			featureType: "poi.park",
			elementType: "geometry",
			stylers: [
				{ hue: emerald },
				{ saturation: 50 }
			]
		}, {
			featureType: "administrative",
			elementType: "labels",
			stylers: [
				{ visibility: "on" }
			]
		}
	]
};
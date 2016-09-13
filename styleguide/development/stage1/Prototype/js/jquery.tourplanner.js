//Variable decaration
var geocoder;
var autocomplete;

//Variables for 'autocomplete' on the start and end location text boxes
var startLocation;
var destinationLocation;

//Map variable
var map;



//FOR POPUP PAGE
//Variables of the current location set by asynchronous method 
var currentLocationName;
var currentLocationLat;
var currentLocationLng;
var addedAttractionsArray = new Array();



function initialize() {
	//Map Specifications
	var mapProp = {
		center:new google.maps.LatLng(-24.994167,134.866944),
		zoom:5,
		mapTypeId:google.maps.MapTypeId.ROADMAP
	};
		
	//Add Map to Div
	map=new google.maps.Map(document.getElementById("map-canvas"),mapProp);

	//Initialise Geocoder object
	geocoder = new google.maps.Geocoder();

	// Initialising the autocomplete objects, restricting the search
	// to geographical location types.
	startLocationAutocomplete = new google.maps.places.Autocomplete((document.getElementById('start-location')),{ types: ['geocode'] });
	destinationLocationAutocomplete = new google.maps.places.Autocomplete((document.getElementById('end-location')),{ types: ['geocode'] });


	// When the user selects an address from the dropdown,
	// populate the address fields in the form.
	// start location autocomplete event
	google.maps.event.addListener(startLocationAutocomplete, 'place_changed', function() {
		geocodeAddress(document.getElementById('start-location').value, 1);
	});

	// destination location autocomplete event
	google.maps.event.addListener(destinationLocationAutocomplete, 'place_changed', function() {
		geocodeAddress(document.getElementById('end-location').value, 2);
	});
	
	
	//------------------------------------------------------------------------------------------------------------------------
	//POPUPWINDOW 
	//------------------------------------------------------------------------------------------------------------------------

	//POPUPWINDOW: Date time picker init
	jQuery('#datetimepicker').datetimepicker();



	//POPUPWINDOW: Autocomplete search filtering conditions set to only establishments within australia
	var options = {
		types: ['establishment'],
		componentRestrictions: {country: "aus"}
	};


	//POPUPWINDOW: Textfield input
	var input = document.getElementById('attraction-location');
	
					
	// Initialising the autocomplete objects, restricting the search
	// to geographical location types.
	startLocationAutocomplete = new google.maps.places.Autocomplete(input,options);
		
	// When the user selects an address from the dropdown,
	// populate the address fields in the form.
	//start location autocomplete event
	google.maps.event.addListener(startLocationAutocomplete, 'place_changed', function() {

		currentLocationName = document.getElementById('attraction-location').value;
		geocodeAddress(document.getElementById('attraction-location').value, 3);
	});
	
	
	
	
}

//Takes the entered address and set the start and end location latitude and longitude
//The assign variable being a 1 or a 2 determines whether the locations is the start or destination
function geocodeAddress(location, assign) {
	geocoder.geocode( { 'address': location}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			//global variable assignment
			if(assign == 1){
				startLocation = results[0].geometry.location;
			} else if(assign == 2){
				destinationLocation = results[0].geometry.location;
			} else if(assign == 3){
			currentLocationLat = results[0].geometry.location.lat();
			currentLocationLng = results[0].geometry.location.lng();
			
			}
			
		} else {
			alert('Geocode was not successful for the following reason: ' + status);
		}
	});
}



function addAttraction()
{
var location = {name:currentLocationName, lat:currentLocationLat, lng:currentLocationLng};
addedAttractionsArray.push(location);


//Clears the attractions auto complete box 
document.getElementById("attraction-location").value = '';

generateTable();
}


function generateTable()
{
var table = document.getElementById("myTable");

//DELETE ENTIRE TABLE - Very crude deletion method
table.innerHTML = "";

for (i = 0; i < addedAttractionsArray.length; i++) 
{
	var row = table.insertRow(-1);

	var locationNameCell = row.insertCell(0);
	var cell2 = row.insertCell(1);
	var cell3 = row.insertCell(2);

	locationNameCell.innerHTML = addedAttractionsArray[i].name;
	cell2.innerHTML = "[Time/ Distance this destination adds to the trip]";
	cell3.innerHTML = "<input type='checkbox'>";
}
}


//(!BUG!) WITHIN METHOD NOT ALOT SELECTED ATTRACTIONS ARE DELETED
function deleteAttraction()
{
var table=document.getElementById("myTable");
var rowCount=table.rows.length;

for(var i=0;i<rowCount;i++)
{
	var chkbox = document.getElementById("myTable").rows[i].cells[2].childNodes[0];


	if(null!=chkbox&&true==chkbox.checked)
	{
		//Deletes an array entry - (Splice Method Supported by all browsers???)
		addedAttractionsArray.splice(i, 1)
	}

}
generateTable();
}	





function calculateRoute(){
	//alert("Start Location: " + startLocation + "\nEnd Location: " + destinationLocation);
	
	var e = document.getElementById("travel-mode");
	var strUser = e.options[e.selectedIndex].text;
	
	
	if(strUser == "Driving")
	{
		alert("!!!!!");
	}
	else if(strUser == "Walking")
	{
	}
	else if(strUser == "Bicycling")
	{
	}
	else if(strUser == "Transit")
	{
	}

}








$(document).on('click touchend', '#select-attractions-button', function(){
	$('#overlay').fadeIn(500, function() {
		$('#popup').slideDown();
	});
});
$(document).on('click touchend', '#close-popup', function(){
	$('#popup').slideUp(500, function() {
		$('#overlay').fadeOut();
	});
});
"use strict";
/*
============================Utils============================
 */
class Utils {
    static makeMarkerIcon(color, markerCounter) {
        const url = 'http://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=' + markerCounter + '|' + color;
        const markerImage = {
            url: url
        };
        return markerImage;
    }
    static screenCheck() {
        if (window.innerWidth < 740) {
            $('meta[name=viewport]').attr('content', 'initial-scale=0.9, user-scalable=no');
            $(".placeInfo").css("font-size", "15px");
        }
        $(".search-result-content").css("max-height", function () {
            let maxHeight = window.innerHeight - 125;
            return maxHeight + "px";
        });
    }
}
/*
==============Globle variable and constraints================
 */
//CLIENT_ID_FOURSQUARE && CLIENT_SECRET_FOURSQUARE
const CLIENT_ID_FOURSQUARE = "GC2SCLU4FHTAX1CRCGBWA3KTG5W0CVFEQQXWWKH0YD3CUDD1";
const CLIENT_SECRET_FOURSQUARE = "CGWI0XNKEUWD0FV0YH3Q1PEJPWIAQ5CFTPZTBDDNOD4YOMRE";
// KEY_ENTER for ko.bindingHandlers.enterKey
const KEY_ENTER = 13;
// Screen check and adjust
(function () {
    Utils.screenCheck();
    window.addEventListener("orientationchange", function () {
        Utils.screenCheck();
    }, false);
})();
// Callback function for async defer google map api
function initMap() {
    // Create a styles array to use with the map.
    var styles = [{
            featureType: 'water',
            stylers: [{
                    color: '#19a0d8'
                }]
        }, {
            featureType: 'administrative',
            elementType: 'labels.text.stroke',
            stylers: [{
                    color: '#ffffff'
                }, {
                    weight: 6
                }]
        }, {
            featureType: 'administrative',
            elementType: 'labels.text.fill',
            stylers: [{
                    color: '#e85113'
                }]
        }, {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{
                    color: '#efe9e4'
                }, {
                    lightness: -40
                }]
        }, {
            featureType: 'transit.station',
            stylers: [{
                    weight: 9
                }, {
                    hue: '#e85113'
                }]
        }, {
            featureType: 'road.highway',
            elementType: 'labels.icon',
            stylers: [{
                    visibility: 'off'
                }]
        }, {
            featureType: 'water',
            elementType: 'labels.text.stroke',
            stylers: [{
                    lightness: 100
                }]
        }, {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{
                    lightness: -100
                }]
        }, {
            featureType: 'poi',
            elementType: 'geometry',
            stylers: [{
                    visibility: 'on'
                }, {
                    color: '#f0e4d3'
                }]
        }, {
            featureType: 'road.highway',
            elementType: 'geometry.fill',
            stylers: [{
                    color: '#efe9e4'
                }, {
                    lightness: -25
                }]
        }];
    const mapOption = {
        center: {
            lat: 40.7413549,
            lng: -73.9980244
        },
        zoom: 15,
        styles: styles,
        mapTypeControl: false,
        scrollwheel: false
    };
    // Constructor creates a new map
    const map = new google.maps.Map(document.getElementById('map'), mapOption);
    // Responsive map by resizing window
    google.maps.event.addDomListener(window, "resize", function () {
        var center = map.getCenter();
        google.maps.event.trigger(map, "resize");
        map.setCenter(center);
    });
    // Make sure google api is ready then display the tag binding with ViewModel otherwise wired tag will display
    $("#searchResultList").css("display", "inline");
    const mapInfoWindow = new google.maps.InfoWindow();
    // Create the new ViewModel in the initMap scope to make sure google map api is ready.
    const vm = new ViewModel(map, mapInfoWindow);
    ko.applyBindings(vm);
    vm.zoomArea();
}
// Onerror function for async defer google map api
function googleMapApiError() {
    alert("Oooops!\nSomething wrong with loading google map api.");
}
/*
==========================ViewModel===========================
 */
class ViewModel {
    constructor(map, infoWindow) {
        this.map = map;
        this.infoWindow = infoWindow;
        this.searchInfo = ko.observable('New York');
        this.searchQuery = ko.observable('');
        this.searchResultList = ko.observableArray();
        this.errorMsg = ko.observable();
        this.visibleButton = ko.observable(true);
        this.sortCategory = ko.observable();
        this.sortPriceMethod = "lowToHigh";
        this.sortRatingMethod = "HighToLow";
        const self = this;
        // Custom binding for enterKey
        ko.bindingHandlers.enterKey = self.keyupBindingFactory(KEY_ENTER);
        // Custom binding for Autocomplete input
        ko.bindingHandlers.addressAutocomplete = {
            init: function (element, valueAccessor, allBindingsAccessor) {
                const value = valueAccessor(), allBindings = allBindingsAccessor();
                const options = {
                    types: ['geocode']
                };
                ko.utils.extend(options, allBindings.autocompleteOptions);
                const zoomAutocomplete = new google.maps.places.Autocomplete(document.getElementById('search-zoom-text'), {
                    types: ['(cities)'],
                    componentRestrictions: {
                        country: "us"
                    }
                });
                google.maps.event.addListener(zoomAutocomplete, 'place_changed', function () {
                    const result = zoomAutocomplete.getPlace();
                    if (result.formatted_address !== undefined)
                        value(result.formatted_address);
                    else
                        value(element.value);
                    self.inputCheck();
                });
            },
        };
    }
    // Create knockout keyupBindingFactory && Ignore typescript error
    keyupBindingFactory(keyCode) {
        return {
            init: function (element, valueAccessor, allBindingsAccessor, data, bindingContext) {
                var wrappedHandler, newValueAccessor;
                // wrap the handler with a check for the enter key
                wrappedHandler = function (data, event) {
                    if (event.keyCode === keyCode) {
                        valueAccessor().call(this, data, event);
                    }
                };
                // create a valueAccessor with the options that we would want to pass to the event binding
                newValueAccessor = function () {
                    return {
                        keyup: wrappedHandler
                    };
                };
                // call the real event binding's init function
                ko.bindingHandlers.event.init(element, newValueAccessor, allBindingsAccessor, data, bindingContext);
            }
        };
    }
    // Using event to interact with user. check if the Address is empty and guide for filter.
    queryInputCheck() {
        switch (this.searchQuery()) {
            case "food":
                $("#filter-text").attr("placeholder", "(EX:pizza)");
                break;
            case "fun":
                $("#filter-text").attr("placeholder", "(EX:park)");
                break;
            case "nightlife":
                $("#filter-text").attr("placeholder", "(EX:bar)");
                break;
            case "shopping":
                $("#filter-text").attr("placeholder", "(EX:shop)");
                break;
            default:
                break;
        }
        if (this.searchInfo() === '')
            return;
        this.zoomArea();
    }
    inputCheck() {
        if (this.searchInfo() === '') {
            window.alert('Please enter an area, or address.');
        }
        else {
            this.zoomArea();
        }
    }
    // Main search function using Foursquare API
    zoomArea() {
        const self = this;
        let zoomUrl = "https://api.foursquare.com/v2/venues/explore?near=" + this.searchInfo() + "&query=" + this.searchQuery() + "&client_id=" + CLIENT_ID_FOURSQUARE + "&client_secret=" + CLIENT_SECRET_FOURSQUARE + "&v=20171101";
        const bounds = new google.maps.LatLngBounds();
        self.clearMap();
        $.getJSON(zoomUrl, function (data) {
            if (data.response.hasOwnProperty("suggestedBounds")) {
                bounds.extend({
                    "lat": data.response.suggestedBounds.ne.lat,
                    "lng": data.response.suggestedBounds.ne.lng
                });
                bounds.extend({
                    "lat": data.response.suggestedBounds.sw.lat,
                    "lng": data.response.suggestedBounds.sw.lng
                });
                self.map.fitBounds(bounds);
            }
            else {
                bounds.extend({
                    "lat": data.response.geocode.center.lat,
                    "lng": data.response.geocode.center.lng
                });
                self.map.fitBounds(bounds);
                self.map.setZoom(13);
            }
            if (data.response.groups[0].items.length === 0) {
                self.errorMsg('Try to search a bigger area!');
            }
            else {
                $.each(data.response.groups[0].items, function (index, value) {
                    let title = "";
                    let address = "";
                    let phone = "";
                    let price = "100";
                    let rating = "";
                    let openHour = "";
                    let category = "none";
                    let placeNum = (Number(index) + 1).toString();
                    let location = {
                        "lat": value.venue.location.lat,
                        "lng": value.venue.location.lng
                    };
                    if (value.venue.hasOwnProperty("name")) {
                        title = value.venue.name;
                    }
                    if (value.venue.location.hasOwnProperty("formattedAddress")) {
                        address = value.venue.location.formattedAddress;
                    }
                    if (value.venue.contact.hasOwnProperty("formattedPhone")) {
                        phone = value.venue.contact.formattedPhone;
                    }
                    if (value.venue.hasOwnProperty("price")) {
                        price = value.venue.price.tier;
                    }
                    if (value.venue.hasOwnProperty("rating")) {
                        rating = value.venue.rating;
                    }
                    if (value.venue.hasOwnProperty("hours")) {
                        openHour = value.venue.hours.status;
                    }
                    if (value.venue.hasOwnProperty("categories")) {
                        category = value.venue.categories[0].name;
                    }
                    self.addSearchResult(title, address, location, placeNum, phone, price, rating, openHour, category);
                });
                self.showMarkers();
            }
        }).fail(function (data, textStatus, error) {
            const err = textStatus + ", " + error;
            console.log("Request Failed: " + err);
            if (data.status === 500) {
                self.errorMsg('Foursquare’s servers are unhappy. Try later.');
            }
            else {
                self.errorMsg('Try to search a bigger area!');
            }
        });
    }
    addSearchResult(title, address, location, placeNum, phone = "", price = "", rating = "", openHour = "", category = "") {
        const self = this;
        const sResult = new PlaceInfo(title, address, location, placeNum, phone, price, rating, openHour, category);
        sResult.setInfoWindow(self.infoWindow, self.map);
        self.searchResultList.push(sResult);
    }
    showMarkers() {
        const self = this;
        ko.utils.arrayForEach(self.searchResultList(), function (placeInfo) {
            placeInfo.marker.setMap(self.map);
        });
    }
    clearMap() {
        const self = this;
        self.errorMsg("");
        self.closeInfoWindow();
        self.clearMarkers();
        self.searchResultList.removeAll();
    }
    clearMarkers() {
        const self = this;
        ko.utils.arrayForEach(self.searchResultList(), function (placeInfo) {
            placeInfo.marker.setMap(null);
        });
    }
    closeInfoWindow() {
        this.infoWindow.set("marker", null);
        this.infoWindow.close();
    }
    sortByPrice() {
        const self = this;
        if (self.sortPriceMethod === "lowToHigh") {
            self.sortPriceMethod = "HighToLow";
            self.searchResultList.sort(function (a, b) {
                let aa = Number(a.price);
                let bb = Number(b.price);
                // make sure the unknow info show in the bottom
                if (aa === 100) {
                    aa = 100;
                }
                if (bb === 100) {
                    bb = 100;
                }
                return aa - bb;
            });
        }
        else {
            self.sortPriceMethod = "lowToHigh";
            self.searchResultList.sort(function (a, b) {
                let aa = Number(a.price);
                let bb = Number(b.price);
                if (aa === 100) {
                    aa = -1;
                }
                if (bb === 100) {
                    bb = -1;
                }
                return bb - aa;
            });
        }
    }
    sortByRating() {
        const self = this;
        if (self.sortRatingMethod === "lowToHigh") {
            self.sortRatingMethod = "HighToLow";
            self.searchResultList.sort(function (a, b) {
                let aa = Number(a.rating);
                let bb = Number(b.rating);
                // make sure the unknow info show in the bottom
                if (aa === 0) {
                    aa = 100;
                }
                if (bb === 0) {
                    bb = 100;
                }
                return aa - bb;
            });
        }
        else {
            self.sortRatingMethod = "lowToHigh";
            self.searchResultList.sort(function (a, b) {
                let aa = Number(a.rating);
                let bb = Number(b.rating);
                if (aa === 0) {
                    aa = -1;
                }
                if (bb === 0) {
                    bb = -1;
                }
                return bb - aa;
            });
        }
    }
    sortByCategory() {
        const self = this;
        const category = self.sortCategory();
        let i = 0;
        for (i = 0; i < self.searchResultList().length; i++) {
            if (!self.searchResultList()[i].category.toLowerCase().includes(category.toLowerCase())) {
                self.searchResultList()[i].marker.setMap(null);
                self.searchResultList.remove(self.searchResultList()[i]);
                i--;
            }
        }
    }
    sortBack() {
        this.zoomArea();
    }
    hideAside() {
        if (this.visibleButton())
            this.visibleButton(false);
        else
            this.visibleButton(true);
    }
}
/*
===========================Module=============================
 */
class PlaceInfo {
    constructor(title, address, location, placeNum, phone = "", price = "", rating = "", openHour = "", category = "none") {
        const self = this;
        self.title = title;
        self.address = address;
        self.location = location;
        self.placeNum = placeNum;
        self.phone = phone;
        self.price = price;
        self.rating = rating;
        self.openHour = openHour;
        self.category = category;
        // Style the markers a bit. This will be our listing marker icon.
        self.defaultIcon = Utils.makeMarkerIcon('0091ff', placeNum);
        // Create a "highlighted location" marker color for when the user
        // mouses over the marker.
        self.highlightedIcon = Utils.makeMarkerIcon('FFFF24', placeNum);
        self.setMarker();
    }
    // Set marker
    setMarker() {
        const self = this;
        self.marker = new google.maps.Marker({
            position: self.location,
            title: self.title,
            animation: google.maps.Animation.DROP,
            icon: self.defaultIcon,
        });
        self.marker.addListener('click', function () {
            self.popMarker();
        });
        self.marker.addListener('mouseover', function () {
            self.marker.setIcon(self.highlightedIcon);
            window.location.href = "#" + self.placeNum;
        });
        self.marker.addListener('mouseout', function () {
            self.marker.setIcon(self.defaultIcon);
        });
    }
    setInfoWindow(infowindow, map) {
        this.infoWindow = infowindow;
        this.map = map;
    }
    formatPrice() {
        let fp = "";
        if (this.price === "100")
            return fp;
        let i = 1;
        for (i; i <= Number(this.price); i++) {
            fp += "$";
        }
        return fp;
    }
    popMarker() {
        this.populateInfoWindow();
        this.marker.setAnimation(google.maps.Animation.BOUNCE);
        const thisMarker = this.marker;
        setTimeout(() => { thisMarker.setAnimation(null); }, 5000);
    }
    populateInfoWindow() {
        const self = this;
        let infowindow = self.infoWindow;
        // Check to make sure the infowindow is not already opened on this marker.
        if (infowindow && infowindow.get("marker") !== self.marker) {
            // Clear the infowindow content to give the streetview time to load.
            infowindow.setContent('');
            // Make sure the marker property is cleared if the infowindow is closed.
            infowindow.addListener('closeclick', function () {
                infowindow.set("marker", null);
            });
            infowindow.setContent(`<div class="windowResultHeader">
          <strong class="windowResultTitle">${self.title}</strong>
          <span class="ui-corner-right ui-corner-left windowRating" >${self.rating}</span>
        </div>
        <div class="windowPlaceInfo">
          <strong>Tel:&nbsp;&nbsp;</strong><span > ${self.phone}</span><br>
          <strong>Price:&nbsp;&nbsp;</strong> <span >${self.formatPrice()} </span><br>
          <strong>OpenNow:&nbsp;&nbsp;</strong><span > ${self.openHour}</span><br>
          <strong id="powerBy">Power by Foursquare API</strong>
        </div>
        <div id="pano"></div>`);
            const radius = 50;
            const streetViewService = new google.maps.StreetViewService();
            streetViewService.getPanoramaByLocation(self.location, radius, function (data, status) {
                if (status === google.maps.StreetViewStatus.OK) {
                    const nearStreetViewLocation = self.marker.getPosition();
                    const heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, nearStreetViewLocation);
                    const panoramaOptions = {
                        position: nearStreetViewLocation,
                        pov: {
                            heading: heading,
                            pitch: 30
                        }
                    };
                    const divPano = document.getElementById("pano");
                    if (divPano) {
                        const panorama = new google.maps.StreetViewPanorama(divPano, panoramaOptions);
                    }
                }
                else {
                    $("#pano").css("diplay", "none");
                }
            });
            // Open the infowindow on the correct marker.
            infowindow.open(self.map, self.marker);
            self.map.setZoom(15);
            self.map.setCenter(self.location);
            self.map.panBy(-200, -200);
        }
    }
}
//# sourceMappingURL=app.js.map
/*
============================Utils============================
 */
class Utils {
    public static makeMarkerIcon(color: string, markerCounter: string) {
        const url = 'http://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=' + markerCounter + '|' + color;
        const markerImage = {
            url: url
        }
        return markerImage;
    }

    public static screenCheck() {
        if (window.innerWidth < 740) {
            if (window.innerWidth < 375 || window.innerHeight < 375)
                $("meta[name=viewport]").attr("content", "initial-scale=0.8, user-scalable=no");
            else
                $("meta[name=viewport]").attr("content", "initial-scale=0.9, user-scalable=no");
        } else {
            $("meta[name=viewport]").attr("content", "initial-scale=1.0, user-scalable=no");
        }
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
(function() {
    Utils.screenCheck();
    window.addEventListener("orientationchange", function() {
        Utils.screenCheck();
    }, false);
})();
// Callback function for async defer google map api
function initMap() {
    // Create a styles array to use with the map.
    var styles: google.maps.MapTypeStyle[] = [{
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


    const mapOption: google.maps.MapOptions = {
        center: {
            lat: 40.7413549,
            lng: -73.9980244
        },
        zoom: 15,
        styles: styles,
        mapTypeControl: false,
        scrollwheel: false

    }
    // Constructor creates a new map
    const map = new google.maps.Map(document.getElementById('map'), mapOption);

    // Responsive map by resizing window
    google.maps.event.addDomListener(window, "resize", function() {
        var center = map.getCenter();
        google.maps.event.trigger(map, "resize");
        map.setCenter(center);
    });

    // Make sure google api is ready then display the tag binding with ViewModel otherwise wired tag will display
    $("#searchResultList").css("display", "inline");
    const mapInfoWindow = new google.maps.InfoWindow();

    // Create the new ViewModel in the initMap scope to make sure google map api is ready.
    const vm = new ViewModel();
    vm.setMapInfo(map, mapInfoWindow);
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

    public searchInfo = ko.observable('New York');
    public searchQuery = ko.observable('');
    public searchResultList = ko.observableArray<PlaceInfo>();
    public errorMsg = ko.observable<string>();
    public visibleButton = ko.observable(true);
    public sortCategory = ko.observable<string>();
    public sortPriceMethod = "lowToHigh";
    public sortRatingMethod = "HighToLow";
    public placeholderValue = ko.observable("Ex:pizza");
    public hideIconUrl = ko.observable("./src/css/images/icons8-up-left-30.png");
    public searchResultFilter;
    public textWidth = ko.observable("310px");
    public textHolder = ko.observable("Enter City Name:(Ex: New York, NY)");
    public windowHeight = ko.observable(window.innerHeight);
    public windowWidth = ko.observable(window.innerWidth);
    public maxHeight;
    public map;
    public infoWindow;

    public constructor() {
        const self = this;
        // Screen check
        self.winsizeCheck();
        // Array filter for searchResultList
        self.searchResultFilter = ko.computed(() => {
            const sortCategory = self.sortCategory();
            if (!sortCategory) {
                return self.searchResultList()
            } else {
                return ko.utils.arrayFilter(self.searchResultList(), (place) => {
                    if (place.title.toLowerCase().includes(sortCategory.toLowerCase()) || place.category.toLowerCase().includes(sortCategory.toLowerCase())) {
                        place.marker.setMap(self.map);
                        return true;
                    } else {
                        place.marker.setMap(null);
                        return false;
                    }
                });
            }
        });
        // Custom binding for Autocomplete input
        ko.bindingHandlers.addressAutocomplete = {
            init: function(element, valueAccessor, allBindingsAccessor) {
                const value = valueAccessor(),
                    allBindings = allBindingsAccessor();

                const options = {
                    types: ['geocode']
                };
                ko.utils.extend(options, allBindings.autocompleteOptions);
                const zoomAutocomplete = new google.maps.places.Autocomplete(
                    <HTMLInputElement>document.getElementById('search-zoom-text')
                    , {
                        types: ['(cities)'],
                        componentRestrictions: {
                            country: "us"
                        }
                    }
                );

                google.maps.event.addListener(zoomAutocomplete, 'place_changed', function() {
                    const result = zoomAutocomplete.getPlace();
                    if (result.formatted_address !== undefined)
                        value(result.formatted_address);
                    else
                        value(element.value);
                    self.inputCheck();
                });

            },
        };
        // Custom binding for enterKey
        ko.bindingHandlers.enterKey = self.keyupBindingFactory(KEY_ENTER);

    }

    public winsizeCheck() {
        const self = this;
        window.addEventListener("orientationchange", function() {
            self.windowHeight(window.innerHeight);
            self.windowWidth(window.innerWidth);
        });

        self.maxHeight = ko.computed(function() {
            const h = self.windowHeight() - 125;
            return h + "px";
        });
    }

    public setMapInfo(map, mapinfowindow) {
        this.map = map;
        this.infoWindow = mapinfowindow;
    }

    // Create knockout keyupBindingFactory && Ignore typescript error
    public keyupBindingFactory(keyCode: number) {
        return {
            init: function(element, valueAccessor, allBindingsAccessor, data, bindingContext) {
                var wrappedHandler, newValueAccessor;

                // wrap the handler with a check for the enter key
                wrappedHandler = function(data, event) {
                    if (event.keyCode === keyCode) {
                        valueAccessor().call(this, data, event);
                    }
                };

                // create a valueAccessor with the options that we would want to pass to the event binding
                newValueAccessor = function() {
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
    public queryInputCheck(): void {
        switch (this.searchQuery()) {
            case "food":
                this.placeholderValue("EX:pizza");
                break;
            case "fun":
                this.placeholderValue("EX:park");
                break;
            case "nightlife":
                this.placeholderValue("EX:bar");
                break;
            case "shopping":
                this.placeholderValue("EX:shop");
                break;
            default:
                break;
        }
        if (this.searchInfo() === '')
            return;
        this.zoomArea();
    }

    public inputCheck(): void {
        if (this.searchInfo() === '') {
            window.alert('Please enter an area, or address.');
        } else {
            this.zoomArea();
        }
    }

    // Main search function using Foursquare API
    public zoomArea(): void {
        const self = this;
        let zoomUrl = "https://api.foursquare.com/v2/venues/explore?near=" + this.searchInfo() + "&query=" + this.searchQuery() + "&client_id=" + CLIENT_ID_FOURSQUARE + "&client_secret=" + CLIENT_SECRET_FOURSQUARE + "&v=20171101";
        const bounds = new google.maps.LatLngBounds();
        self.clearMap();
        $.getJSON(zoomUrl, function(data) {
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
            } else {
                bounds.extend({
                    "lat": data.response.geocode.center.lat,
                    "lng": data.response.geocode.center.lng
                });
                self.map.fitBounds(bounds);
                self.map.setZoom(13);
            }

            if (data.response.groups[0].items.length === 0) {
                self.errorMsg('Try to search a bigger area!');
            } else {
                $.each(data.response.groups[0].items, function(index, value) {
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
        }).fail(function(data, textStatus, error) {
            const err = textStatus + ", " + error;
            console.log("Request Failed: " + err);
            if (data.status === 500) {
                self.errorMsg('Foursquare’s servers are unhappy. Try later.');
            } else {
                self.errorMsg('Try to search a bigger area!');
            }
        });
    }

    public addSearchResult(title: string, address: string, location: google.maps.LatLngLiteral, placeNum: string, phone = "", price = "", rating = "", openHour = "", category = ""): void {
        const self = this;
        const sResult = new PlaceInfo(title, address, location, placeNum, phone, price, rating, openHour, category);
        sResult.setInfoWindow(self.infoWindow, self.map);
        self.searchResultList.push(sResult);
    }

    public showMarkers(): void {
        const self = this;
        ko.utils.arrayForEach<PlaceInfo>(self.searchResultFilter(), function(placeInfo) {
            placeInfo.marker.setMap(self.map);
        });
    }

    public clearMap(): void {
        const self = this;
        self.errorMsg('');
        self.sortCategory('');
        self.closeInfoWindow();
        self.clearMarkers();
        self.searchResultList.removeAll();
    }

    public clearMarkers(): void {
        const self = this;
        ko.utils.arrayForEach<PlaceInfo>(self.searchResultList(), function(placeInfo) {
            placeInfo.marker.setMap(null);
        });
    }
    public closeInfoWindow(): void {
        this.infoWindow.set("marker", null)
        this.infoWindow.close();
    }

    public sortByPrice(): void {
        const self = this;
        if (self.sortPriceMethod === "lowToHigh") {
            self.sortPriceMethod = "HighToLow";
            self.searchResultList.sort(function(a, b) {
                let aa = Number(a.price);
                let bb = Number(b.price);
                // make sure the unknow info show in the bottom
                if (aa === 100) { aa = 100; }
                if (bb === 100) { bb = 100; }
                return aa - bb;
            });
        } else {
            self.sortPriceMethod = "lowToHigh"
            self.searchResultList.sort(function(a, b) {
                let aa = Number(a.price);
                let bb = Number(b.price);
                if (aa === 100) { aa = -1; }
                if (bb === 100) { bb = -1; }
                return bb - aa;
            });
        }
    }

    public sortByRating(): void {
        const self = this;
        if (self.sortRatingMethod === "lowToHigh") {
            self.sortRatingMethod = "HighToLow";
            self.searchResultList.sort(function(a, b) {
                let aa = Number(a.rating);
                let bb = Number(b.rating);
                // make sure the unknow info show in the bottom
                if (aa === 0) { aa = 100; }
                if (bb === 0) { bb = 100; }
                return aa - bb;
            });
        } else {
            self.sortRatingMethod = "lowToHigh"
            self.searchResultList.sort(function(a, b) {
                let aa = Number(a.rating);
                let bb = Number(b.rating);
                if (aa === 0) { aa = -1; }
                if (bb === 0) { bb = -1; }
                return bb - aa;
            });
        }
    }

    public clearSortText() {
        this.sortCategory('');
    }

    public hideAside(): void {
        if (this.visibleButton()) {
            this.hideIconUrl("./src/css/images/icons8-down-right-30.png");
            this.visibleButton(false);
        } else {
            this.hideIconUrl("./src/css/images/icons8-up-left-30.png");
            this.visibleButton(true);
        }
    }

}




/*
===========================Module=============================
 */

class PlaceInfo {

    public title: string;
    public address: string;
    public location: google.maps.LatLngLiteral;
    public placeNum: string;
    public phone: string;
    public price: string;
    public rating: string;
    public openHour: string;
    public category: string;
    public defaultIcon: {};
    public highlightedIcon: {};
    public marker: google.maps.Marker;
    public infoWindow: google.maps.InfoWindow;
    public map: google.maps.Map;

    public constructor(title: string, address: string, location: google.maps.LatLngLiteral, placeNum: string, phone = "", price = "", rating = "", openHour = "", category = "none") {
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
    public setMarker(): void {
        const self = this;
        self.marker = new google.maps.Marker({
            position: self.location,
            title: self.title,
            animation: google.maps.Animation.DROP,
            icon: self.defaultIcon,
        });
        self.marker.addListener('click', function() {
            self.popMarker();
        });
        self.marker.addListener('mouseover', function() {
            self.marker.setIcon(self.highlightedIcon);
            window.location.href = "#" + self.placeNum;
        });
        self.marker.addListener('mouseout', function() {
            self.marker.setIcon(self.defaultIcon);
        });
    }

    public setInfoWindow(infowindow: google.maps.InfoWindow, map: google.maps.Map): void {
        this.infoWindow = infowindow;
        this.map = map;
    }


    public formatPrice(): string {
        let fp = "";
        if (this.price === "100") return fp;
        let i = 1;
        for (i; i <= Number(this.price); i++) {
            fp += "$";
        }
        return fp;
    }

    public popMarker(): void {
        this.populateInfoWindow();
        this.marker.setAnimation(google.maps.Animation.BOUNCE);
        const thisMarker = this.marker;
        setTimeout(() => { thisMarker.setAnimation(null) }, 5000)
    }

    public populateInfoWindow(): void {
        const self = this;
        let infowindow = self.infoWindow;
        // Check to make sure the infowindow is not already opened on this marker.
        if (infowindow && infowindow.get("marker") !== self.marker) {
            // Clear the infowindow content to give the streetview time to load.
            infowindow.setContent('');
            // Make sure the marker property is cleared if the infowindow is closed.
            infowindow.addListener('closeclick', function() {
                infowindow.set("marker", null);
            });
            infowindow.setContent(
                `<div class="windowResultHeader">
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
            streetViewService.getPanoramaByLocation(self.location, radius, function(data, status) {
                if (status === google.maps.StreetViewStatus.OK) {
                    $("#pano").css("height", "150px").css("width", "250px");
                    const nearStreetViewLocation = self.marker.getPosition();
                    const heading = google.maps.geometry.spherical.computeHeading(
                        nearStreetViewLocation, nearStreetViewLocation);
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
            });
            // Open the infowindow on the correct marker.
            infowindow.open(self.map, self.marker);
            self.map.setZoom(15);
            self.map.setCenter(self.location);
            self.map.panBy(-200, -250);
        }
    }

}
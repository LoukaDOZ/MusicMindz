//Request object which contains filters when sending and information of an element when receive
const RequestOptions = function () {
	this.name = null; 	//Name
	this.type = null;		//Type
	this.gender = null; 	//Gender
	this.begin = null; 	//Begin date
	this.end = null;	//End date
	this.area = null;	//Associated area
	this.authors = null;	//Authors
	this.album = null;	//Album
	this.dead = null;	//Is dead or ended
	this.score = null;	//Score (for pertinence sort)
	this.id = null;	//Id (for image)
	this.image = null;	//Image
};

//Request object which contains information of a request
const RequestInfos = function () {
	this.results = [];	//Array of RequestOptions from the request
	this.count = 0;	//Max elements
	this.offset = 0;	//Offset
	this.max = 10; //Max element per pages
	this.belonging = ARTIST_BELONGING; //Belonging
	this.name = "";	//Searched name or title
	this.filters = new RequestOptions;	//Filters
	this.toURL = function () {	//Creates a string corresponding to the request URL
		//Initializing url
		let url = "https://musicbrainz.org/ws/2/" + this.belonging + "/?query=";
		url += this.name ? ("\"" + this.name + "\"") : "-name:*";
		url += this.filters.type ? (" AND type:\"" + this.filters.type + "\"") : "";
		url += this.filters.gender ? (" AND gender:\"" + this.filters.gender + "\"") : "";
		url += this.filters.begin ? (" AND begin:\"" + this.filters.begin + "\"") : "";
		url += this.filters.end ? (" AND end:\"" + this.filters.end + "\"") : "";
		url += this.filters.area ? (" AND area:\"" + this.filters.area + "\"") : "";
		url += this.filters.authors ? (" AND artist:\"" + this.filters.authors + "\"") : "";
		url += "&limit=" + this.max + "&offset=" + this.offset + "&fmt=json";
		return encodeURI(url);	//Encoding
	}
};

//Object to make requests
const requestMaker = {
	//Get infos from MusicBrainz API
	doRequest: function(infos){
		return new Promise(function(resolve,reject){
			//Encoding
			let url = infos.toURL();

			//If this request was already made
			let exist = window.localStorage.getItem(url);
			if(exist) {
				//Return the saved values
				resolve(JSON.parse(exist));
			} else {
				//Making a new request
				let request = new XMLHttpRequest();

				request.open('GET', url);
				request.responseType = "json";

				request.onload = function () {
					//If ok
					if (request.status === 200) {
						//Initializing return
						let newInfos = new RequestInfos();

						//For each element from the answer
						for(let element of request.response[infos.belonging + "s"]) {
							//Creating a RequestOptions object with the needed values
							let item = new RequestOptions();
							item.id = infos.belonging === RECORDING_BELONGING && element[RELEASES] ? element[RELEASES][INDEX_0].id : element.id;
							item.score = element.score;
							item.authors = [];
							item.country = element.country || null;
							item.type = element.type || element[PRIMARY_TYPE] || null;
							item.name = element.name || element.title || null;
							item.begin = element[LIFE_SPAN] ? element[LIFE_SPAN].begin : null;
							item.end = element[LIFE_SPAN] ? element[LIFE_SPAN].end : null;
							item.dead = element[LIFE_SPAN] ? element[LIFE_SPAN].ended : false;
							item.area = element.area ? element.area.name : null;
							item.gender = element.gender || null;
							item.album = infos.belonging === RECORDING_BELONGING
							&& element[RELEASES] ? element[RELEASES][INDEX_0][RELEASE_GROUP].title : null;

							//If there is at least one artist
							if(element[ARTIST_CREDIT]) {
								//Getting each artist name
								for (artist of element[ARTIST_CREDIT]){
									item.authors.push(artist.artist.name);
								}
							}

							//For future comparisons with constants
							if(item.type)
								item.type = item.type.toLowerCase();

							//Adding element in results
							newInfos.results.push(item);
						}
						//Fulfill infos
						newInfos.count = request.response.count;
						newInfos.belonging = infos.belonging;
						newInfos.offset = infos.offset;
						newInfos.max = infos.max;
						newInfos.name = infos.name;
						newInfos.filters = infos.filters;

						try {
							//Saving in the proxy
							window.localStorage.setItem(url,JSON.stringify(newInfos));
						} catch (e) {
							//If localstorage is full
							console.log("storage full");
							//Clearing it
							window.localStorage.clear();
							//Saving again in the proxy
							window.localStorage.setItem(url,JSON.stringify(newInfos));
							console.log(e);
						}

						//Returning all items
						resolve(newInfos);
					} else
						//If error, return the error
						reject("Error (" + url + ") : " + request.statusText);
				};

				//If error, return the error
				request.onerror = function () {
					reject("Network error (" + url + ")");
				};

				//Sending request
				request.send();

			}
		});
	},
	//Get an image from MusicBrainz API for an album or a song
	doRequestImage: function(belonging,id){
		return new Promise(function(resolve,reject){
			//Initializing request
			let request = new XMLHttpRequest();
			//Initializing request url
			let url = "https://coverartarchive.org/" ;
			url += belonging === RECORDING_BELONGING ? 'release' : belonging;
			url += "/" + id;
			url = encodeURI(url); //Encoding

			//If this request was already made
			let exist = window.localStorage.getItem(url);
			if(exist) {
				//Return the saved values
				resolve(exist);
			} else {
				request.open('GET', url);
				request.responseType = "json";

				request.onload = function () {
					let response = NO_IMAGE_PATH;
					//If ok
					if (request.status === 200) {
						//Get image url
						response = request.response[IMAGES][INDEX_0][IMAGE];
					} else {
						//If error, print the error
						console.log("Error (" + url + ") : " + request.statusText);
					}

					//Saving in cache
					window.localStorage.setItem(url,response);
					resolve(response);
				};

				//If error, return the error
				request.onerror = function () {
					//Saving in cache
					window.localStorage.setItem(url,NO_IMAGE_PATH);
					//If error, print the error
					console.log("Network error (" + url + ")");
					//Return no image path
					resolve(NO_IMAGE_PATH);
				};
			}

			//Sending request
			request.send();
		});
	}
};

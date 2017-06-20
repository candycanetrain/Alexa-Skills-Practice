/* Space Skill */

/* ************************************************
 Intents
************************************************ */

{
  "intents": [
    {
      "intent": "HelloWorldIntent"
    },
    {
      "intent": "PeopleInSpaceIntent"
    },
    {
      "intent": "WhereIsItIntent"
    },
    {
      "intent": "VisitUsIntent",
      "slots": [
        {
          "name": "City",
          "type": "AMAZON.US_CITY"
        }
      ]
    }
  ]
}

/* ************************************************
 Utterances
************************************************ */

PeopleInSpaceIntent how many people are in space
VisitUsIntent when will the I I S visit {City}
VisitUsIntent when will the I I S fly over {City}
WhereIsItIntent where is the I I S


/* ************************************************
 STEP 1: Hello World!
************************************************ */

'use strict';

const Alexa = require('alexa-sdk');
let handlerContext = null;

const buildSpeechletResponse = function(speechOutput) {
    handlerContext.emit(':tellWithCard', speechOutput, 'Space Info', speechOutput);
};

const handlers = {
    'HelloWorldIntent': function () {
        handlerContext = this;
        buildSpeechletResponse('Hello AWS Loft!');
    }
};

exports.handler = function (event, context) {

    const alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();

};

/* ************************************************
 STEP 2: Adding an API call
************************************************ */

const http = require('http');
const https = require('https');

const getRequest = function (httpType, options, success) {

    var req = httpType.get(options, function(res) {

      var body = '';

      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        const json = JSON.parse(body);
      	success(json);
      });

    });

    req.on('error', function(e) {
        console.log(e);
        buildSpeechletResponse('Ouch, something went wrong!');
    });

}

const httpGet = function(options, success) {
    getRequest(http, options, success);
};

const httpsGet = function(options, success) {
    getRequest(https, options, success);
};

/* ************************************************
 STEP 3: Calling an API: Space people!

http://api.open-notify.org/astros.json

Response:

 {
    number: 3,
    message: "success",
    people: [
      ...
      {
        name: "Peggy Whitson",
        craft: "ISS"
      },
      ...
    ]
 }

************************************************ */

const handlers = {
    ...
    'PeopleInSpaceIntent': function () {

        handlerContext = this;
        getPeopleInSpace();

    },
    ...
}

const getPeopleInSpace = function() {

    var options = {
     host: 'api.open-notify.org',
     path: '/astros.json',
     method: 'GET',
     port: 80
    };

    httpGet(options, peopleInSpaceSuccess);

};

const peopleInSpaceSuccess = function(json) {

    console.log(json);
    const spacePeople = json.people;
    const numSpacePeople = spacePeople.length;

    let speechResponse = (numSpacePeople === 1) ?
        'There is 1 person in space. '
        : 'There are ' + numSpacePeople + ' people in space. '

    if (numSpacePeople > 0) {

        const lastIndex = numSpacePeople > 1 ? numSpacePeople - 1 : null;

        for(let i=0; i<numSpacePeople; i++) {

            const person = spacePeople[i];

            if (lastIndex && (i === lastIndex)) {
                speechResponse += ' and ';
            }

            speechResponse += person.name + ', ';
        }
    }

    buildSpeechletResponse(speechResponse);

}

/* ************************************************
 STEP 4: Where is the IIS?

http://api.open-notify.org/iss-now.json

Response:

{
  iss_position: {
    latitude: "-50.7509",
    longitude: "121.5455"
  },
  ...
}

https://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452

Response:

{
  results: {
    ...,
    formatted_address: "277 Bedford Ave, Brooklyn, NY 11211, USA",
    ...
  }
}

************************************************ */

const handlers = {
    ...
    'WhereIsItIntent': function () {

        handlerContext = this;
        getCurrentLocation();

    },
    ...
}

const convertCoordsToAddress = function(location, callback) {

    var options = {
     host: 'maps.googleapis.com',
     path: '/maps/api/geocode/json?latlng=' + encodeURI(location.lat + ',' + location.lon),
     method: 'GET'
    };

    httpsGet(options, function(json) {
        console.log(json);
        const address = json.results.length > 0 ? json.results[0].formatted_address : ' an unidentified land mass or open ocean';
        callback(address);
    });

};

const getCurrentLocation = function() {

    var options = {
     host: 'api.open-notify.org',
     path: '/iss-now.json',
     method: 'GET',
     port: 80
    };

    httpGet(options, currentLocationSuccess);

};

const currentLocationSuccess = function(json) {

    const location = {
        lat: json.iss_position.latitude,
        lon: json.iss_position.longitude
    };

    convertCoordsToAddress(location, function(address) {
        const speechResponse = 'The I I S is currently over, ' + address;
        buildSpeechletResponse(speechResponse);
    });

};


/* ************************************************
 STEP 5: Calling an API with parameters - Visit Time

https://maps.googleapis.com/maps/api/geocode/json?address=san%20francisco

Response:

{
  results: {
    ...
    geometry: {
      ...
      location: { lat: 37.7749295, lng: -122.4194155 }
    }
  }

}

http://api.open-notify.org/iss-pass.json?lat=37.9298239&lon=-122.28178

Response:

{
  response: [
    ...
    {
      ...
      risetime: 1497977749
    }
  ]
}


************************************************ */

const handlers = {
    ...
    'VisitUsIntent': function () {

        handlerContext = this;
        city = this.event.request.intent.slots.City.value;
        convertCityToCoords(city, getVisitTime);
    },
    ...
}

const convertCityToCoords = function(city, callback) {

    var options = {
     host: 'maps.googleapis.com',
     path: '/maps/api/geocode/json?address=' + encodeURI(city),
     method: 'GET'
    };

    httpsGet(options, function(json) {
        const location = json.results[0].geometry.location;
        callback(location);
    });

};

const getVisitTime = function(location) {

    var options = {
     host: 'api.open-notify.org',
     path: '/iss-pass.json?lat=' + location.lat + '&lon=' + location.lng,
     method: 'GET',
     port: 80
    };

    httpGet(options, visitTimeSuccess);

};

const visitTimeSuccess = function(json) {

    const timeInMillis = json.response[0].risetime * 1000;
    const nowInMillis = new Date().getTime();
    const time = new Date(timeInMillis - nowInMillis);
    const hoursString = time.getHours() > 0 ? time.getHours() + ' hours and ' : '';
    const speechResponse = 'The I S S will fly over ' + city + ' in ' + hoursString + time.getMinutes() + ' minutes';

    buildSpeechletResponse(speechResponse);

};

/* ************************************************
  FULL SOURCE
************************************************ */

'use strict';

const http = require('http');
const https = require('https');
const Alexa = require('alexa-sdk');

let handlerContext = null;
let city = null;

const buildSpeechletResponse = function(speechOutput) {
    handlerContext.emit(':tellWithCard', speechOutput, 'Space Info', speechOutput);
};

const getRequest = function (httpType, options, success) {

    var req = httpType.get(options, function(res) {

      var body = '';

      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        const json = JSON.parse(body);
      	success(json);
      });

    });

    req.on('error', function(e) {
        console.log(e);
        buildSpeechletResponse('Ouch, something went wrong!');
    });

}

const httpGet = function(options, success) {
    getRequest(http, options, success);
};

const httpsGet = function(options, success) {
    getRequest(https, options, success);
};

const getPeopleInSpace = function() {

    var options = {
     host: 'api.open-notify.org',
     path: '/astros.json',
     method: 'GET',
     port: 80
    };

    httpGet(options, peopleInSpaceSuccess);

};

const peopleInSpaceSuccess = function(json) {

    console.log(json);
    const spacePeople = json.people;
    const numSpacePeople = spacePeople.length;

    let speechResponse = (numSpacePeople === 1) ?
        'There is 1 person in space. '
        : 'There are ' + numSpacePeople + ' people in space. '

    if (numSpacePeople > 0) {

        const lastIndex = numSpacePeople > 1 ? numSpacePeople - 1 : null;

        for(let i=0; i<numSpacePeople; i++) {

            const person = spacePeople[i];

            if (lastIndex && (i === lastIndex)) {
                speechResponse += ' and ';
            }

            speechResponse += person.name + ', ';
        }
    }

    buildSpeechletResponse(speechResponse);

}

const convertCityToCoords = function(city, callback) {

    var options = {
     host: 'maps.googleapis.com',
     path: '/maps/api/geocode/json?address=' + encodeURI(city),
     method: 'GET'
    };

    httpsGet(options, function(json) {
        const location = json.results[0].geometry.location;
        callback(location);
    });

};

const convertCoordsToAddress = function(location, callback) {

    var options = {
     host: 'maps.googleapis.com',
     path: '/maps/api/geocode/json?latlng=' + encodeURI(location.lat + ',' + location.lon),
     method: 'GET'
    };

    httpsGet(options, function(json) {
        console.log(json);
        const address = json.results.length > 0 ? json.results[0].formatted_address : ' an unidentified land mass or open ocean';
        callback(address);
    });

};

const getVisitTime = function(location) {

    var options = {
     host: 'api.open-notify.org',
     path: '/iss-pass.json?lat=' + location.lat + '&lon=' + location.lng,
     method: 'GET',
     port: 80
    };

    httpGet(options, visitTimeSuccess);

};

const visitTimeSuccess = function(json) {

    const timeInMillis = json.response[0].risetime * 1000;
    const nowInMillis = new Date().getTime();
    const time = new Date(timeInMillis - nowInMillis);
    const hoursString = time.getHours() > 0 ? time.getHours() + ' hours and ' : '';
    const speechResponse = 'The I S S will fly over ' + city + ' in ' + hoursString + time.getMinutes() + ' minutes';

    buildSpeechletResponse(speechResponse);

};

const getCurrentLocation = function() {

    var options = {
     host: 'api.open-notify.org',
     path: '/iss-now.json',
     method: 'GET',
     port: 80
    };

    httpGet(options, currentLocationSuccess);

};

const currentLocationSuccess = function(json) {

    const location = {
        lat: json.iss_position.latitude,
        lon: json.iss_position.longitude
    };

    convertCoordsToAddress(location, function(address) {
        const speechResponse = 'The I I S is currently over, ' + address;
        buildSpeechletResponse(speechResponse);
    });

};

const handlers = {
    'PeopleInSpaceIntent': function () {

        handlerContext = this;
        getPeopleInSpace();

    },

    'VisitUsIntent': function () {

        handlerContext = this;
        city = this.event.request.intent.slots.City.value;
        convertCityToCoords(city, function(location) {
            getVisitTime(location);
        });

    },

    'WhereIsItIntent': function () {

        handlerContext = this;
        getCurrentLocation();

    }
};

exports.handler = function (event, context) {

    const alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();


};

/*
New Relic Scripted API Synthetic Transaction to demo Microsoft OAuth.
The function does the following:
1. Authenticate against Microsoft Active Directory as an application using OAuth.
2. Retrieve availability status of all resources within a Azure subscription id. See:
   https://docs.microsoft.com/en-us/rest/api/resourcehealth/availability-statuses/list-by-subscription-id
3. Save the data from 2. in a New Relic custom event.

The function uses the following New Relic synthetic secure credentials:
AZURE_DIRECTORY_ID - the Azure Directory (tenant) id for the application.
AZURE_SUBSCRIPTION_ID - the Azure subscription id.
NR_ACCOUNT_ID - the New Relic account id.
NR_INSERT_LICENSE_KEY - the New Relic insert license key.
AZURE_CLIENT_ID - the Azure client id.
AZURE_CLIENT_SECRET - the Azure client secret.
*/
var assert = require('assert');

// Scope of the OAuth access request
var scope = "https://management.azure.com/.default";
// OAuth request URI, uses the Azure Directory (tenant) id secret (AZURE_DIRECTORY_ID).
var oauthUIR = "https://login.microsoftonline.com/" + $secure.AZURE_DIRECTORY_ID + "/oauth2/v2.0/token";
// The health URI. Uses the a secret for the Azure subscription id (AZURE_SUBSCRIPTION_ID).
var healthURI = "https://management.azure.com/subscriptions/" + $secure.AZURE_SUBSCRIPTION_ID + "/providers/Microsoft.ResourceHealth/availabilityStatuses?api-version=2018-07-01&$expand=recommendedactions";
// New Relic event API endpoint. Uses a account id secret (NR_ACCOUNT_ID).
// Please ensure you use the correct endpoint EU or US (insights-collector.newrelic.com or insights-collector.eu01.nr-data.net).
var nRPostEndPoint = "https://insights-collector.eu01.nr-data.net/v1/accounts/" + $secure.NR_ACCOUNT_ID + "/events";
// New Relic Event name
var nREventType = "AzureStatusSubscription";

// Function to post results back into New Relic.
// Uses a secret called NR_INSERT_LICENSE_KEY for the New Relic insert key.
function postNRData(jsonBody) {
  var nROptions = {
    uri: nRPostEndPoint,
    headers: {
      'Api-Key': $secure.NR_INSERT_LICENSE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(jsonBody)
  };
  
  $http.post(nROptions,
    function (error, response, body) {
      assert.equal(response.statusCode, 200, 'Expected a 200 OK response from New Relic, got ' + response.statusCode);
      console.log('Event data sent to New Relic.');
    }
  );
}

// Function to get the health status of entities for a certain subscription id from Azure.
function getHealth(token, url) {
  var healthOptions = {
    'uri': url,
    'headers': {
    'Authorization': 'Bearer ' + token
    }
  };

  $http.get(healthOptions,
      function (err, response, body) {
        // JSON object to send to New Relic, empty for now!
        var jsonNR = [{}];
        // Did we get the right response code back from Azure?
        assert.equal(response.statusCode, 200, 'Expected a 200 OK response from Azure, got ' + response.statusCode);
        // Parse the response into JSON
        var jsonBody = JSON.parse(body);
        // Walk through each of the entity details returned
        for (var i = 0; i < jsonBody.value.length; i++) {
          // Build a JSON object for this entity and start filling it in
          var js = {};
          var jsPos = jsonBody.value[i];
          js.eventType = nREventType;
          // Force the id to lower case, Azure seems to randomly return different cases and
          // things work a lot better in New Relic if they are the same!
          js.id = String(jsPos.id).toLocaleLowerCase();
          // Split the id and use the components
          var splitId = String(jsPos.id).split("/");
          if (splitId.length >= 8){
            js.subscription = splitId[2];
            js.resourceGroups = splitId[4];
            js.providers = String(splitId[6] + "/" + splitId[7]).toLocaleLowerCase();
            js.name = splitId[8];
          }
          js.location = jsPos.location;
          js.availabilityState = jsPos.properties.availabilityState;
          // If this entity has recommended actions then store these.
          // We will only take the first two.
          if (jsPos.properties.hasOwnProperty('recommendedActions')) {
            if (jsPos.properties.recommendedActions.length > 0) {
              js.recommendedAction1 = jsPos.properties.recommendedActions[0].action
            }
            if (jsPos.properties.recommendedActions.length > 1) {
              js.recommendedAction2 = jsPos.properties.recommendedActions[1].action
            }
          }
          js.title = jsPos.properties.title;
          js.summary = jsPos.properties.summary;
          js.reasonType = jsPos.properties.reasonType;
          js.reasonChronicity = jsPos.properties.reasonChronicity;
          js.detailedStatus = jsPos.properties.detailedStatus;
          js.occurredTime = jsPos.properties.occurredTime;
          js.reportedTime = jsPos.properties.reportedTime;
          // If there is a recently resolved issue, then store this too.
          if (jsPos.hasOwnProperty('properties.recentlyResolved'))
          {
            js.recentlyResolvedUnavailableOccurredTime = jsPos.properties.recentlyResolved.unavailableOccurredTime;
            js.recentlyResolvedResolvedTime = jsPos.properties.recentlyResolved.resolvedTime;
            js.recentlyResolvedUnavailabilitySummary = jsPos.properties.recentlyResolved.unavailabilitySummary;
          }
          // Add the JSON object we have built for this entity to the overall object we will send to New Relic.
          jsonNR[i] = js;
          console.log('Found - name: ' + js.name + ', state: ' + js.availabilityState);
        }
        console.log(jsonBody.value.length + ' records returned by Azure.');
        // Post the data to New Relic.
        postNRData(jsonNR);
        // If there is another page of data, then get it.
        if (jsonBody.hasOwnProperty('nextLink')) {
          // Call this function recursively.
          // The link returned includes the character '$' as an encoded %24 which seems to cause problems (return code 400).
          // Therefore remove the encoded character and replace with a '$'!
          getHealth(token, String(jsonBody.nextLink).replace(/%24/g, "$"));
        }
      }
  );
};

// OAuth configuration options, sends form data to Microsoft login.
// Uses AZURE_CLIENT_ID and AZURE_CLIENT_SECRET secrets for the client id and secret.
var OAuthOptions = {
  'uri': oauthUIR,
  form: {
    'scope': scope,
    'client_id': $secure.AZURE_CLIENT_ID,
    'client_secret': $secure.AZURE_CLIENT_SECRET,
    'grant_type': 'client_credentials'
  },
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json'
  }
};

// Get the OAuth token
$http.post(OAuthOptions,
  function (err, response, body) {
    assert.equal(response.statusCode, 200, 'Expected a 200 OK response, got ' + response.statusCode);
    // Parse the JSON and get the token.
    var jsRtn = JSON.parse(body);
    assert.equal(jsRtn.hasOwnProperty('access_token'), true, 'Access token not found.');
    console.log('OAuth token found.');
    // Now get the health data.
    getHealth(jsRtn.access_token, healthURI);
  }
);

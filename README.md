# Example Microsoft OAuth Integration with New Relic
This project provides an example New Relic integration with Microsoft OAuth to pull current Azure resource statuses and save them within New Relic as a custom event. The script could be adapted to pull data from many other Microsoft/Azure APIs.

## How it works
This project uses a New Relic scripted API synthetic transaction to pull the data at regualr intervals. The script does the following:
1. Authenticate against Microsoft Active Directory as an application using OAuth.
2. Retrieve the availability status of all resources within a Azure subscription id. See:
   https://docs.microsoft.com/en-us/rest/api/resourcehealth/availability-statuses/list-by-subscription-id
3. Save the data from 2. in a New Relic custom event.

## Azure setup
Perform the following actions in Azure to setup your application:
- Register an application in Azure (App registrations), copy the Application (client) ID for the `AZURE_CLIENT_ID` and Directory (tenant) ID for the `AZURE_DIRECTORY_ID` New Relic secure credentials.
- Create a client secret (under Certificates & secrets) and save the value for the `AZURE_CLIENT_SECRET` New Relic secure credential.
- Save the subscription ID (under subscriptions) for the `AZURE_SUBSCRIPTION_ID` New Relic secure credential.
- Assign the application the correct permissions. In this case, select the subscription, select Access control (IAM) and assign the Contributor role to the application.

Optionally collect resource status changes via the New Relic Event Hub integration:
- Follow the instructions in here: https://docs.newrelic.com/docs/logs/forward-logs/azure-log-forwarding/#azure-eventhub.
- Ensure to select the forwarding of resource health Azure activity logs.

## New Relic setup
The script uses the following secure credentials which need to be created:
- `NR_ACCOUNT_ID` - the New Relic account id.
- `NR_INSERT_LICENSE_KEY` - the New Relic insert (ingest) license key.
- `AZURE_DIRECTORY_ID` - the Azure Directory (tenant) id for the application.
- `AZURE_SUBSCRIPTION_ID` - the Azure subscription id.
- `AZURE_CLIENT_ID` - the Azure Application (client) id.
- `AZURE_CLIENT_SECRET` - the Azure client secret.

Once these are created perform the following actions:
- Create an Endpoint availability, Scripted API monitor in New Relic. 
- Paste in the synthetic-script.js JavaScript code.
- Ensure the New Relic event API endpoint is set correctly for the US or EU data centre.
- Test the monitor, search for data within the AzureStatusSubscription custom event and set the monitor running.

Optionally create the example dashboard:
- Copy the json from the example-dashboard.json file.
- Replace the account id with the correct account id.
- Import the dashboard.

![Dashboard example](dashboard.png)

## Availability
You can safely run the synthetic script from multiple locations.

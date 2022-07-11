# microsoft-oauth-example
New Relic Scripted API Synthetic Transaction to demo Microsoft OAuth.


# Example Microsoft OAuth Integration with New Relic
This project provides an example New Relic integration with Microsoft OAuth to pull current Azure resource statuses and save them within New Relic as a custom event. The script could be adapted to pull data from many other Microsoft/Azure APIs.

## How it works
This project uses a New Relic scripted API synthetic transaction to pull the data at regualr intervals. The script does the following:
1. Authenticate against Microsoft Active Directory as an application using OAuth.
2. Retrieve the availability status of all resources within a Azure subscription id. See:
   https://docs.microsoft.com/en-us/rest/api/resourcehealth/availability-statuses/list-by-subscription-id
3. Save the data from 2. in a New Relic custom event.

## Azure setup

## New Relic setup
The script using the following secure credentials which need to be created:
- `NR_ACCOUNT_ID` - the New Relic account id.
- `NR_INSERT_LICENSE_KEY` - the New Relic insert (ingest) license key.
- `AZURE_DIRECTORY_ID` - the Azure Directory (tenant) id for the application.
- `AZURE_SUBSCRIPTION_ID` - the Azure subscription id.
- `AZURE_CLIENT_ID` - the Azure client id.
- `AZURE_CLIENT_SECRET` - the Azure client secret.

Once these are created perform the following actions:
- Create an Endpoint availability, Scripted API monitor. 
- Paste in the outlier-alert.js JavaScript code.
- Ensure the USER key and account id are set correctly, the example uses 2 secure credentials (`MIKE_ACCOUNT_ID` and `MIKE_USER_KEY`). Rename these or hardcode them, as appropriate.
- Change the NRQL accordingly (`NRQL_TranCount` variable), for example appName in the WHERE clause and time period (5 minutes will allow for some smoothing of data and reduce the likelihood of false alerts). Note, if you change any of the field names then you will need to reflect this in the JavaScript code.
- Optional - Change the `threshold` variable depending on your needs (the example uses 2 times the standard deviation of the cluster as a whole).
- Optional - Change the `MinTranCount` value, this is the minimum number of transactions a host needs to be executing before it can be considered as an outlier. This is to stop false alerts when transaction numbers are low.
- Test the monitor and set it running.

## Availability
You can safely run the synthetic script from multiple locations.

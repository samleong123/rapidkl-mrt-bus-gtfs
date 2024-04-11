# RapidKL & MRT Feeder Bus Schedule Checker
A repository that contains scripts for pulling data from GTFS Static and data for the RapidKL & MRT Feeder Bus Schedule Checker website.

## NodeJS Part
There are two JavaScript scripts that will run with NodeJS on GitHub Actions: `GenerateJSONMRTFeeder.js` and `GenerateJSONRapidKLBus.js`, running every day at 1 AM UTC+8 to pull and generate data from [GTFS Static](https://developer.data.gov.my/realtime-api/gtfs-static). The generated outputs will be stored in `/results/`.

## Website Part
Users could visit the [RapidKL & MRT Feeder Bus Schedule Checker website](https://bus.samsam123.name.my) to check the current frequency/schedule for respective bus routes covered by the GTFS Static Feed. The MyRapid Bus Kiosk is integrated as an `iframe` within this website, allowing users to track the bus within the site.

## Issue
Please create an issue if you experience any problems.

## Credits
1. [Public Sector Open Data - Government of Malaysia](https://developer.data.gov.my/realtime-api/gtfs-static)

#!/bin/bash

echo -e "\e[1;31m [INFO] Installing Node JS\e[0m"
sudo apt update
sudo apt install nodejs

echo -e "\e[1;31m [INFO] Installing Node JS dependencies \e[0m"
npm install fs axios adm-zip csv-parser strip-bom-stream

echo -e "\e[1;31m [INFO] Generating routes data from GTFS Static Feed \e[0m"
node GenerateJSONRapidKLBus.js
node GenerateJSONMRTFeeder.js

echo -e "\e[1;31m [INFO] Done \e[0m"

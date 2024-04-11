const fs = require('fs');
const axios = require('axios');
const AdmZip = require('adm-zip');
const csv = require('csv-parser');
const { createReadStream, createWriteStream } = require('fs');
const { promisify } = require('util');
const { pipeline } = require('stream');
const path = require('path');
const readline = require('readline');

const streamPipeline = promisify(pipeline);

// Function to download and unzip the GTFS file from a URL
async function unzipGTFSFromURL(zipFileUrl, outputDir) {
    const tempZipPath = 'temp.zip';
    try {
        const response = await axios({
            method: 'get',
            url: zipFileUrl,
            responseType: 'stream'
        });

        await streamPipeline(response.data, createWriteStream(tempZipPath));

        const zip = new AdmZip(tempZipPath);
        zip.extractAllTo(outputDir, true);
        fs.unlinkSync(tempZipPath); // Delete the temp file
    } catch (error) {
        console.error('Error downloading or extracting zip file', error);
        throw error;
    }
}

// Function to read CSV file with BOM handling
async function readCSV(filePath) {
    return new Promise(async (resolve, reject) => {
        const stripBom = (await import('strip-bom-stream')).default;

        let results = [];
        fs.createReadStream(filePath, { encoding: 'utf8' })
            .pipe(stripBom()) // This will strip out the BOM character
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                resolve(results);
            });
    });
}

// Function to read and process calendar data
async function processCalendarData(calendarFilePath) {
    const calendarData = await readCSV(calendarFilePath);
    const serviceIdMapping = {};

    calendarData.forEach(entry => {
        const isWeekday = entry.monday === '1' || entry.tuesday === '1' || 
                          entry.wednesday === '1' || entry.thursday === '1' || 
                          entry.friday === '1';
        const isWeekend = entry.saturday === '1' || entry.sunday === '1';

        if (isWeekday && !isWeekend) {
            serviceIdMapping[entry.service_id] = 'weekday';
        } else if (isWeekend && !isWeekday) {
            serviceIdMapping[entry.service_id] = 'weekend';
        } else {
            serviceIdMapping[entry.service_id] = 'mixed'; // For services that run on both weekdays and weekends
        }
    });

    return serviceIdMapping;
}

// Function to generate JSON files for MRT Bus trips
async function generateMRTJSONFiles() {
    try {
        const routes = await readCSV('data/routes.txt');
        const trips = await readCSV('data/trips.txt');
        const stopTimes = await readCSV('data/stop_times.txt');
        const serviceIdMapping = await processCalendarData('data/calendar.txt');

        const outputDir = path.join(__dirname, 'results');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        routes.forEach(route => {
            console.log(`Processing route: ${route.route_long_name}, ID: ${route.route_id}`);

            const routeTrips = trips.filter(trip => trip.route_id === route.route_id);

            if (routeTrips.length === 0) {
                console.log(`No trips found for route ID ${route.route_id} (${route.route_long_name})`);
                return;
            }

            const tripDetails = routeTrips.map(trip => {
                const tripStopTimes = stopTimes.filter(st => st.trip_id === trip.trip_id);
                if (tripStopTimes.length === 0) {
                    console.log(`No stop times found for trip ID ${trip.trip_id}`);
                    return null;
                }
                const firstStopTime = tripStopTimes.sort((a, b) => a.stop_sequence - b.stop_sequence)[0];
                return {
                    trip_id: trip.trip_id,
                    departure_time: firstStopTime.departure_time,
                    service_id: serviceIdMapping[trip.service_id], // Modify service_id to weekday/weekend
                    trip_headsign: trip.trip_headsign,
                    direction_id: trip.direction_id,
                    route_name: route.route_long_name
                };
            }).filter(t => t !== null);

            if (tripDetails.length > 0) {
                const fileName = `${route.route_long_name.replace(/\s+/g, '_')}.json`;
                fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(tripDetails, null, 2));
                console.log(`Generated file: ${fileName}`);
            }
        });
    } catch (error) {
        console.error('Error generating JSON files for MRT Bus:', error);
    }
}

// Start the process for MRT Bus service
const gtfsZipUrl = 'https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-mrtfeeder';
unzipGTFSFromURL(gtfsZipUrl, 'data')
    .then(() => {
        generateMRTJSONFiles()
            .then(() => {
                console.log('MRT Bus JSON files generated successfully.');
            })
            .catch((error) => {
                console.error('Failed to generate MRT Bus JSON files:', error);
            });
    })
    .catch((error) => {
        console.error('Failed to unzip GTFS data for MRT Bus:', error);
    });

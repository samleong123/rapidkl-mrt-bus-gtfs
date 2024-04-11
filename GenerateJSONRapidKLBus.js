const fs = require('fs');
const axios = require('axios');
const AdmZip = require('adm-zip');
const csv = require('csv-parser');
const { createWriteStream } = require('fs');
const { promisify } = require('util');
const { pipeline } = require('stream');
const path = require('path');

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

// Function to read CSV file
async function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        let results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                resolve(results);
            });
    });
}

// Function to generate JSON files based on route_short_name
async function generateJSONFiles() {
    try {
        const routes = await readCSV('data/routes.txt');
        const trips = await readCSV('data/trips.txt');
        const frequencies = await readCSV('data/frequencies.txt');

        const outputDir = path.join(__dirname, 'results');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        for (let route of routes) {
            console.log(`Processing route: ${route.route_short_name}, ID: ${route.route_id}`);
            const routeTrips = trips.filter(t => t.route_id === route.route_id);
            const tripDetails = routeTrips.map(trip => {
                const frequency = frequencies.find(f => f.trip_id === trip.trip_id);
                return frequency ? {
                    trip_id: trip.trip_id,
                    start_time: frequency.start_time,
                    end_time: frequency.end_time,
                    headway_secs: frequency.headway_secs,
                    headway_mins: (frequency.headway_secs / 60),
                    service_id: trip.service_id,
                    trip_headsign: trip.trip_headsign,
                    direction_id: trip.direction_id,
                    route_name: route.route_short_name
                } : null;
            }).filter(t => t !== null);

            if (tripDetails.length > 0) {
                const fileName = `${route.route_short_name.replace(/\s+/g, '_')}.json`;
                fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(tripDetails, null, 2));
                console.log(`Generated file: ${fileName}`);
            }
        }
    } catch (error) {
        console.error('Error generating JSON files:', error);
    }
}

// Start the process
const gtfsZipUrl = 'https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-kl';
unzipGTFSFromURL(gtfsZipUrl, 'data')
    .then(() => {
        generateJSONFiles()
            .then(() => {
                console.log('JSON files generated successfully.');
            })
            .catch((error) => {
                console.error('Failed to generate JSON files:', error);
            });
    })
    .catch((error) => {
        console.error('Failed to unzip GTFS data:', error);
    });

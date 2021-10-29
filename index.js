#!/usr/bin/env node
import process from 'process';
import express from 'express';
import luxon from 'luxon';
import {isDateBetween, runScraper} from './src/scraper.js';
import {Y_M_D} from './src/constants.js';

const {DateTime} = luxon;
const ERROR_HTML = (e) => `<!DOCTYPE html>
<html lang="en-us">
    <head></head>
    <body>
        <h2>Error encountered</h2>
        <div>${e}</div>
    </body>
</html>`;
// runScraper().then(result => console.log(`Wrote results to file ${result}`));

//Runs every time a request is recieved
const logger = (req, res, next) => {
    console.log('Request from: ' + req.ip + ' For: ' + req.path); //Log the request to the console
    next(); //Run the next handler (IMPORTANT, otherwise your page won't be served)
};
const app = express();

app.use(logger); //Tells the app to send all requests through the 'logger' function
// app.use(app.router); //Tells the app to use the router

app.get('/', (req, res) => {
    console.log("Server up!");
});

app.get('/scrape', (req, res) => {
    let startDateParam = req.query.start;
    let endDateParam = req.query.end;
    let startDate = !!startDateParam && DateTime.fromFormat(startDateParam, Y_M_D) || DateTime.now().minus({months: 1});
    let endDate = !!endDateParam && DateTime.fromFormat(endDateParam, Y_M_D) || DateTime.now();
    console.log(`Scraping donor data from ${startDate.toFormat(Y_M_D)} to ${endDate.toFormat(Y_M_D)}`);
    runScraper(startDate, endDate).then(r => {
        if (!!r.error) {
            console.log('Error:', r.error);
            res.send(ERROR_HTML(r.error));
        } else {
            console.log('Sending results file to browser for download...');
            res.header('Content-Type', 'text/csv');
            res.attachment(r.resultsFilename);
            res.send(r.results);
        }
    });

});

app.get('/test', (req, res) => {
    let date = DateTime.fromFormat('2020-09-29', Y_M_D);
    let startDate = DateTime.fromFormat('2020-09-28', Y_M_D);
    let endDate = DateTime.fromFormat('2021-10-29', Y_M_D);
    console.log('is date in range?', isDateBetween(date, startDate, endDate));
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
    console.log("Your app is listening on port " + listener.address().port);
});
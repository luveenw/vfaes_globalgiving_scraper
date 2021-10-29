#!/usr/bin/env node
import process from 'process';
import express from 'express';
import luxon from 'luxon';
import {isDateAfter, isDateBetween, runScraper} from './src/scraper.js';
import {emailAppError, emailResults, failuresString} from './src/mailer.js';
import {Y_M_D} from './src/constants.js';

const {DateTime} = luxon;
const SCRAPING_IN_PROGRESS_HTML = (startDate, endDate) => `<!DOCTYPE html>
<html lang="en-us">
    <head><title>Processing donor data from ${startDate.toFormat(Y_M_D)} to before ${endDate.toFormat(Y_M_D)}</title></head>
    <body>
        <ol>
            <h2>🚀 Processing donor data from ${startDate.toFormat(Y_M_D)} to before ${endDate.toFormat(Y_M_D)}</h2>
            <div style="padding-top:14px;">Results will be emailed to 📪 <strong>${process.env.RECIPIENT_EMAILS}.</strong></div>
            <div style="padding-top:14px;">🕗 Depending on the specified date range, this could take a while.</div>
            <div>If the email hasn't arrived in an hour, please try again! 😊</div>
            <h2 style="padding-top: 14px;">⚠ Please set up your captcha app so you can solve the GlobalGiving login captcha.</h2>
            <div>ℹ The login key for the captcha app is called TWO_CAPTCHA_TOKEN, and it can be found <a target="_blank" href="https://glitch.com/edit/#!/fortunate-likeable-confidence?path=.env">here</a>.</div>
            <h3>🔨 Desktop Captcha App Setup</h3>
            <ol>
                <li>Download the desktop captcha app <a target="_blank" href="https://github.com/rucaptcha/bot-x/releases/download/v0.52/x-bot-en-v0.52.zip">here (Windows only)</a></li>
                <li>Extract the zip contents to your computer.</li>
                <li>Double click RuCaptchaBot.exe to start the app.</li>
                <li>On the screen titled <strong>Authorization</strong>, enter the key from <a target="_blank" href="https://glitch.com/edit/#!/fortunate-likeable-confidence?path=.env%3A6%3A52">TWO_CAPTCHA_TOKEN</a>.</li>
                <li>Click <strong>Start</strong> to start receiving GlobalGiving login captchas.</li>
            </ol>
        </div>
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
    if (startDate > endDate) {
        let temp = startDate;
        startDate = endDate;
        endDate = temp;
    }
    console.log(`Scraping donor data from ${startDate.toFormat(Y_M_D)} to ${endDate.toFormat(Y_M_D)}`);
    res.send(SCRAPING_IN_PROGRESS_HTML(startDate, endDate));
    runScraper(startDate, endDate).then(r => {
        if (!!r.error) {
            console.log('Error during scraping:', r.error);
            console.log('Error stacktrace:', r.error.stack);
            emailAppError(r.error, startDate, endDate);
        } else {
            // console.log('Sending results file to browser for download...');
            // res.header('Content-Type', 'text/csv');
            // res.attachment(r.resultsFilename);
            // res.send(r.results);
            !!r.failures && !!r.failures.length &&
            console.log(`${r.failures.length} processing failures:\n`, failuresString(r.failures));
            console.log(`Emailing results file to ${process.env.RECIPIENT_EMAILS}...`);
            emailResults(r, startDate, endDate);
        }
    }).catch(e => {
        console.log('Unknown error encountered:', e);
        console.log('Error stacktrace:', e.stack);
        emailAppError(e, startDate, endDate);
    });
});

app.get('/test', (req, res) => {
    let date = DateTime.fromFormat('2020-12-01', Y_M_D);
    let startDate = DateTime.fromFormat('2020-09-14', Y_M_D);
    let endDate = DateTime.fromFormat('2021-12-01', Y_M_D);
    console.log('is date in range?', isDateBetween(date, startDate, endDate));
    console.log('is date after?', isDateAfter(date, endDate));
    res.end();
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
    console.log("Your app is listening on port " + listener.address().port);
});
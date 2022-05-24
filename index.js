import process from 'process';
import path from 'path';
import {fileURLToPath} from 'url';
import express from 'express';
import handlebars from 'express-handlebars';
import luxon from 'luxon';
import {isDateAfter, isDateBetween, runScraper} from './src/scraper.js';
import {emailAppError, emailResults, failuresString} from './src/mailer.js';
import {Y_M_D} from './src/constants.js';

const {DateTime} = luxon;

// runScraper().then(result => console.log(`Wrote results to file ${result}`));

//Runs every time a request is recieved
const logger = (req, res, next) => {
    console.log('Request from: ' + req.ip + ' For: ' + req.path); //Log the request to the console
    next(); //Run the next handler (IMPORTANT, otherwise your page won't be served)
};
const app = express();

//we need to change up how __dirname is used for ES6 purposes
const __dirname = path.dirname(fileURLToPath(import.meta.url));
//now please load my static html and css files for my express app, from my /public directory
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '/public/views'));

//Sets handlebars configurations (we will go through them later on)
app.engine('hbs', handlebars({
    layoutsDir: path.join(__dirname, '/public/views/layouts'),
    partialsDir: path.join(__dirname, '/public/views/partials'),
    extname: 'hbs'
}));

app.use(express.static('public'));

app.use(logger); //Tells the app to send all requests through the 'logger' function
// app.use(app.router); //Tells the app to use the router

const PAGE_TITLE = prefix => `${prefix} | VFAES GlobalGiving Scraper`;

app.get('/', (req, res) => {
    let endDate = DateTime.now();
    let startDate = endDate.minus({months: 1});
    res.render('main',
        {
            layout: 'index',
            pageTitle: PAGE_TITLE('Welcome'),
            startDate: startDate.toFormat(Y_M_D),
            endDate: endDate.toFormat(Y_M_D)
        });
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
    const startDateStr = startDate.toFormat(Y_M_D);
    const endDateStr = endDate.toFormat(Y_M_D);
    const scrapingMsg = `Scraping donor data from ${startDateStr} to ${endDateStr}`;
    console.log(scrapingMsg);
    res.render('scrapingStarted',
        {
            layout: 'index',
            pageTitle: PAGE_TITLE(scrapingMsg),
            startDate: startDateStr,
            endDate: endDateStr,
            recipientEmails: process.env.RECIPIENT_EMAILS,
            requestEmail: `${process.env.REPLY_TO_EMAIL}?subject=Request to Add VFAES GG Scraper Recipient&body=Hello - please add me to the mailing list for VFAES GlobalGiving data. Thank you!`
        });
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
          let numFailures = !!r.failures && !!r.failures.length ? r.failures.length : 0;
            !!numFailures &&
            console.log(`${numFailures} processing failure${numFailures === 1 ? '' : 's'}:\n`, failuresString(r.failures));
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
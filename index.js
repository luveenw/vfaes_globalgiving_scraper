#!/usr/bin/env node
import process from 'process';
import express from 'express';
import nodemailer from 'nodemailer';
import luxon from 'luxon';
import {isDateAfter, isDateBetween, runScraper} from './src/scraper.js';
import {DONATION_DATE_PATTERN, SCRAPER_EMAIL_FROM, Y_M_D, Y_M_D_TIME_EMAIL} from './src/constants.js';

const {DateTime} = luxon;
const ERROR_HTML = (e) => `<!DOCTYPE html>
<html lang="en-us">
    <head></head>
    <body>
        <h2>Error encountered</h2>
        <div>${e}</div>
    </body>
</html>`;
const SCRAPING_IN_PROGRESS_HTML = (startDate, endDate) => `<!DOCTYPE html>
<html lang="en-us">
    <head></head>
    <body>
        <ol>
            <h2>🚀 Processing donor data from ${startDate.toFormat(Y_M_D)} to before ${endDate.toFormat(Y_M_D)} 🚀</h2>
            <div style="padding-top:14pxsetupin"s will be emailed to 📪 ${process.env.RECIPIENT_EMAILS}</div>
            <div>🕗 Depending on the specified date range, this could take a while.</div>
            <div>If the email hasn't arrived in an hour, please try again! 😊</div>
            <h2 style="padding-top: 14px;">⚠ Please set up your captcha app so you can solve the GlobalGiving login captcha. ⚠</h2>
            <div>ℹ The login key for the captcha app is called TWO_CAPTCHA_TOKEN, and it can be found <a target="_blank" href="https://glitch.com/edit/#!/fortunate-likeable-confidence?path=.env%3A6%3A52">here</a>.</div>
            <h3>🔨 Desktop Captcha App Setup</h3>
            <ol>
                <li>Download the desktop captcha app <a target="_blank" href="https://github.com/rucaptcha/bot-x/releases/download/v0.52/x-bot-en-v0.52.zip">here (Windows only)</a></li>
                <li>Extract the zip contents to your computer. Double click RuCaptchaBot.exe to start the app.</li>
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
            console.log('Error:', r.error);
            res.send(ERROR_HTML(r.error));
        } else {
            // console.log('Sending results file to browser for download...');
            // res.header('Content-Type', 'text/csv');
            // res.attachment(r.resultsFilename);
            // res.send(r.results);
            console.log(`${r.failures.length} processing failures:\n`, failuresString(r.failures));
            console.log(`Emailing results file to ${process.env.RECIPIENT_EMAILS}...`);
            emailResults(r, startDate, endDate);
        }
    });
    res.end();
});

const failuresString = failures => {
    failures.map(({field, result}) => failureString(field, result)).join('\n');
};
const failureString = (f, r) =>
    `Failed to process ${f} for donation ID ${r.donationId} on ${r.donationDate.toFormat(DONATION_DATE_PATTERN)} by ${r.donorName} of $${r.totalAmountUSD}`;

const MAIL = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD,
    }
});

const emailResults = (r, startDate, endDate) => {
    let dateRangeStr = `${startDate.toFormat(Y_M_D)} to before ${endDate.toFormat(Y_M_D)}`;
    let mainEmailText = `Donor data for ${dateRangeStr}. Generated at ${DateTime.now().toFormat(Y_M_D_TIME_EMAIL)}`;
    let mailOptions = {
        from: SCRAPER_EMAIL_FROM,
        replyTo: process.env.REPLY_TO_EMAIL,
        to: process.env.RECIPIENT_EMAILS,
        subject: `VFAES GlobalGiving Donor Data (${dateRangeStr})`,
        text: `${mainEmailText}\n\n${r.failures.length} Processing Failures:\n${failuresString(r.failures)}`,
        attachments: [{
            filename: r.resultsFilename,
            content: r.results,
            contentType: 'text/csv'
        }]
    };

    MAIL.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

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
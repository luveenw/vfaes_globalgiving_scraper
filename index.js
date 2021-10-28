import puppeteer from 'puppeteer-extra';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import {resultsFilename, scrapeUserData, testRedirects} from './scraper.js';
import {TWO_CAPTCHA_TOKEN} from './constants.js';
import luxon from "luxon";

const {DateTime} = luxon;

puppeteer.use(
    RecaptchaPlugin({
        provider: {
            id: '2captcha',
            token: TWO_CAPTCHA_TOKEN // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
        },
        visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
    })
);
puppeteer.use(StealthPlugin());

let endDate = DateTime.now();
let startDate = endDate.minus({months: 1});
// testRedirects().then(result => console.log("Result:", result)).catch(e => console.log("Error:", e));
scrapeUserData(startDate, endDate).then(result => console.log("Result:", result)).catch(e => console.log("Error:", e));
// while (true) {console.log(resultsFilename(LocalDate.now()));}

export default scrapeUserData;
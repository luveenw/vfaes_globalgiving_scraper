#!/usr/bin/env node

import puppeteer from 'puppeteer-extra';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import {getResultsFilename, scrapeUserData, testRedirects, writeResultsToFile} from './src/scraper.js';
import {TWO_CAPTCHA_TOKEN} from './src/constants.js';
import luxon from "luxon";

const {DateTime} = luxon;

export const runScraper = () => {

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
    scrapeUserData(startDate, endDate)
        .then(async (result) => {
            let resultsFilename = getResultsFilename(endDate);
            await writeResultsToFile(result, resultsFilename);
        })
        .catch(e => console.log("Error:", e));
// while (true) {console.log(getResultsFilename(LocalDate.now()));}
};

// runScraper();
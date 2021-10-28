import luxon from 'luxon';
import process from 'process';
import fspkg from 'fs';
import {sep} from 'path';
import puppeteer from 'puppeteer-extra';

import {elementForQuery, gotoUrl, performLogin} from './pageHelpers.js';
import {
    COLUMN_FIELDS,
    donationDate,
    FIELD_COLUMN,
    FIELD_SCRAPERS,
    PROCESSORS,
    RESULT_COLUMN_HEADERS
} from './scrapeFunctions.js';
import {scrapeResult, scrapeResultsString} from './scrapeResult.js';

import {
    DONATIONS_URL,
    NEXT_BUTTON_CLASS,
    TABLE_ROW_SELECTOR,
    TWO_CAPTCHA_TOKEN,
    Y_M_D,
    Y_M_D_TIME
} from './constants.js';
import RecaptchaPlugin from "puppeteer-extra-plugin-recaptcha";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const fs = fspkg.promises;
const {DateTime} = luxon;

export const testRedirects = async () => {
    let browser = await puppeteer.launch();
    let page = await browser.newPage();

    await gotoUrl(page, 'https://www.globalgiving.org/52013');
    let projectTitleText = await (await (await page.$('h1')).getProperty('innerText')).jsonValue();
    console.log(`Project title: ${projectTitleText}`);
    !!browser && await browser.close();
};
const defaultSetMessage = (message, sameLine = false) => {
    if (sameLine) {
        process.stdout.write(message);
    } else {
        console.log(message);
    }
};
export const runScraper = async (setMessage = defaultSetMessage) => {

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
    let resultsFilename = '';
    // testRedirects().then(result => console.log("Result:", result)).catch(e => console.log("Error:", e));
    await scrapeUserData(startDate, endDate, setMessage)
        .then(async (result) => {
            resultsFilename = getResultsFilename(endDate);
            await writeResultsToFile(result, resultsFilename, setMessage);
        })
        .catch(e => console.log("Error:", e));
    // while (true) {console.log(getResultsFilename(LocalDate.now()));}
    return resultsFilename;
};

const scrapeUserData = async (startDate, endDate, setMessage) => {
    // console.log(`promisePoller [type ${typeof promisePoller}]:`, promisePoller);
    let browser;
    let page;
    let loginResult;
    let results;
    try {
        // console.log(`Loading url ${LOCAL_FILE_URL}...`);
        // ({browser, page} = await loadFile(LOCAL_FILE_URL));
        setMessage('Logging in...');
        ({browser, page, loginResult} = await performLogin(setMessage));
        if (!loginResult) {
            !!browser && await browser.close();
        } else {
            setMessage('Logged in.');
            page = await gotoDashboard(page);
            setMessage('Gathering user data...');
            ({page, results} = await gatherUserData(page, startDate, endDate, setMessage));
            let processedResults = await processResults(page, results, setMessage);
            !!browser && await browser.close();
            setMessage(`Gathered ${processedResults.length} rows.`);
            return processedResults;
            // mailFile(resultsFilename);
        }
    } catch (e) {
        setMessage("Error:", e);
        !!browser && await browser.close();
    }
};

const writeResultsToFile = async (results, path, setMessage) => {
    let filePath = `result${sep}${path}`;
    setMessage(`Writing ${results.length} results to file ${filePath}`);
    let writeLines = [
        () => fs.writeFile(`${filePath}`, Object.values(RESULT_COLUMN_HEADERS).join(',')),
        () => fs.appendFile(`${filePath}`, '\n'),
        () => fs.appendFile(`${filePath}`, scrapeResultsString(results), err => !!err && console.log('Error writing results:', err)),
        () => fs.appendFile(`${filePath}`, '\n')
    ];
    for (const line of writeLines) {
        await line();
    }
};

const gatherUserData = async (page, startDate, endDate, setMessage) => {
    // for each page,
    // 0. rows = find #donation tbody tr. Filter these as in 1.
    // 1. donation date = find 6th td. If donation date is before beginning of last month, stop collecting
    // 1. email = find td.email
    // page.$$eval('td.email', nodes => nodes.reduce(node => if find a.email returns non-empty, push into result; return result))
    // find a.next and click on it
    let shouldContinue = true;
    let pageNumber = 1;
    let numRows = 0;
    let counter = 0;
    let results = [];
    while (shouldContinue) {
        let tableRows = await page.$$(TABLE_ROW_SELECTOR);
        let pageResults = [];
        numRows = tableRows.length;
        setMessage(`\rPage ${pageNumber}: ${numRows} rows found.`, true);
        if (numRows === 0) {
            break;
        }
        let filteredRows = await filterRows(tableRows, startDate, endDate);
        setMessage(` ${filteredRows.length} are in range ${startDate.toFormat(Y_M_D)} - ${endDate.toFormat(Y_M_D)} \r`, true);
        setMessage('\r');
        for (const row of filteredRows) {
            let scrapeObject = {};
            let colElems = await row.$$("td");
            for (const index of colElems.keys()) {
                let fields = COLUMN_FIELDS[index];
                if (!!fields) {
                    for (const field of fields) {
                        // console.log(`Running scraper for ${field} column...`);
                        let scrapedValue = await FIELD_SCRAPERS[field](colElems[FIELD_COLUMN[field]]);
                        // console.log(`Scraped value ${scrapedValue} for ${field}`);
                        scrapeObject[field] = scrapedValue;
                    }
                }
            }
            pageResults.push(scrapeResult(scrapeObject));
            setMessage(`\rScraped ${++counter} / ${filteredRows.length} rows`, true);
        }
        setMessage('\r');
        // console.log(`${pageResults.length} rows remain after reading and filtering.`);
        // console.log(`Results from scraping page ${pageNumber}:\n${scrapeResultsString(pageResults)}`);
        // console.log(`Adding ${pageResults.length} rows to results...`);
        results.push(...pageResults);

        shouldContinue = pageResults.length === numRows;
        if (shouldContinue) {
            pageNumber++;
            await gotoNextUserDataPage(page);
        }
    }
    // console.log('results after reading and filtering:', Object.entries(results));
    return {page, results};
};
const filterRows = async (tableRows, startDate, endDate) => {
    let rowsInRange = [];
    for (const row of tableRows) {
        let colElems = await row.$$("td");
        let donationDateCol = await colElems[FIELD_COLUMN['donationDate']];
        let dateDonated = await donationDate(donationDateCol);
        if (isDateBetween(dateDonated, startDate, endDate, true)) {
            rowsInRange.push(row);
        }
    }
    return rowsInRange;
};
const processResults = async (page, results, setMessage) => {
    let processedResults = [];
    let counter = 0;
    for (const result of results) {
        let processedResult = {};
        for (const [field, processor] of Object.entries(PROCESSORS)) {
            // console.log(`Processed value ${processedValue} for ${field}`);
            processedResult[field] = await processor(page, result);
        }
        // console.log("result:", Object.entries(result));
        // console.log("processedResult:", Object.entries(processedResult));
        for (const field of Object.keys(processedResult)) {
            result[field] = processedResult[field];
        }
        // console.log("merged result:", Object.entries(result));
        processedResults.push(result);
        setMessage(`\rProcessed ${++counter} / ${results.length} rows`, true);
    }
    setMessage('\r');
    return processedResults;
};

const gotoDashboard = async (page) => {
    await gotoUrl(page, DONATIONS_URL);
    return page;
};

export const getResultsFilename = date =>
    `donations_ending_${date.toFormat(Y_M_D)}_${DateTime.now().toFormat(Y_M_D_TIME)}_${Math.floor(Math.random() * 9999)}.csv`;

const areDatesEqual = (d1, d2) => d1.toMillis() === d2.toMillis();

const isDateBetween = (date, startDate, endDate, includeStart = false, includeEnd = false) => {
    let isAtOrAfterStart = date > startDate || (includeStart && areDatesEqual(date, startDate));
    let isAtOrBeforeEnd = date < endDate || (includeEnd && areDatesEqual(date, endDate));
    return isAtOrAfterStart && isAtOrBeforeEnd;
};

const gotoNextUserDataPage = async page => {
    elementForQuery(page, NEXT_BUTTON_CLASS) &&
    await Promise.all([
        page.waitForNavigation(),
        page.click(NEXT_BUTTON_CLASS, {delay: 100, button: "left", clickCount: 1})
    ]);
};




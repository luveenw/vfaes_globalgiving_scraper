import luxon from 'luxon';
import process from 'process';
// import fspkg from 'fs';
import {default as puppeteer} from 'puppeteer-extra';

import {gotoUrl, performLogin, timeout} from './pageHelpers.js';
import {
    COLUMN_FIELDS,
    FIELD_COLUMN,
    FIELD_SCRAPERS,
    PROCESSORS,
    RESULT_COLUMN_HEADERS
} from './scrapeFunctions.js';
import {scrapeResult, scrapeResultsString} from './scrapeResult.js';

import {
    CONTINUE_SCRAPE,
    DONATIONS_URL,
    DONATION_DATE_PATTERN,
    END_DATE,
    START_DATE,
    STOP_SCRAPE,
    TABLE_ROW_SELECTOR,
    TWO_CAPTCHA_TOKEN,
    Y_M_D,
    Y_M_D_TIME
} from './constants.js';
import RecaptchaPlugin from "puppeteer-extra-plugin-recaptcha";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// const fs = fspkg.promises;
const {DateTime} = luxon;

export const testRedirects = async () => {
    let browser = await puppeteer.launch();
    let page = await browser.newPage();

    await gotoUrl(page, 'https://www.globalgiving.org/52013');
    let projectTitleText = await (await (await page.$('h1')).getProperty('innerText')).jsonValue();
    console.log(`Project title: ${projectTitleText}`);
    !!browser && await browser.close();
};
export const runScraper = async (startDate, endDate) => {
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

    // testRedirects().then(result => console.log("Result:", result)).catch(e => console.log("Error:", e));
    try {
        let data = await scrapeUserData(startDate, endDate);
        return {results: resultsString(data), resultsFilename: getResultsFilename(endDate)};
    } catch (e) {
        console.log("Error:", e);
        return {results: '', resultsFilename: '', error: e};
    }
};

const scrapeUserData = async (startDate, endDate) => {
    // console.log(`promisePoller [type ${typeof promisePoller}]:`, promisePoller);
    let browser;
    let page;
    let loginResult;
    let results;
    try {
        // console.log(`Loading url ${LOCAL_FILE_URL}...`);
        // ({browser, page} = await loadFile(LOCAL_FILE_URL));
        ({browser, page, loginResult} = await performLogin());
        if (!loginResult) {
            !!browser && await browser.close();
        } else {
            console.log('Logged in.');
            page = await gotoDashboard(page);
            console.log('Gathering user data...');
            ({page, results} = await gatherUserData(page, startDate, endDate));
            let processedResults = await processResults(page, results);
            !!browser && await browser.close();
            console.log(`Gathered ${processedResults.length} rows.`);
            return processedResults;
            // mailFile(resultsFilename);
        }
    } catch (e) {
        console.log("Error:", e);
        !!browser && await browser.close();
    }
};

/*const writeResultsToFile = async (results, path) => {
    let filePath = `result${sep}${path}`;
    console.log(`Writing ${results.length} results to file ${filePath}`);
    let writeLines = [
        () => fs.writeFile(`${filePath}`, Object.values(RESULT_COLUMN_HEADERS).join(',')),
        () => fs.appendFile(`${filePath}`, '\n'),
        () => fs.appendFile(`${filePath}`, scrapeResultsString(results), err => !!err && console.log('Error writing results:', err)),
        () => fs.appendFile(`${filePath}`, '\n')
    ];
    for (const line of writeLines) {
        await line();
    }
};*/

const resultsString = (results) =>
    [Object.values(RESULT_COLUMN_HEADERS).join(','), scrapeResultsString(results), ''].join('\n');

const gatherUserData = async (page, startDate, endDate) => {
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
        process.stdout.write(`Page ${pageNumber}: ${numRows} rows found.\r`);
        if (numRows === 0) {
            break;
        }
        let filteredRows = await filterRows(tableRows, startDate, endDate);
        process.stdout.write(` ${filteredRows.length} are in range ${startDate.toFormat(Y_M_D)} - ${endDate.toFormat(Y_M_D)} \r`);
        console.log('\r');
        let earliestDate = await donationDateFromRow(tableRows[tableRows.length - 1]);
        for (const row of filteredRows) {
            let scrapeObject = {};
            let colElems = await row.$$("td");
            for (const index of colElems.keys()) {
                let fields = COLUMN_FIELDS[index];
                if (!!fields) {
                    for (const field of fields) {
                        // console.log(`Running scraper for ${field} column...`);
                        // console.log(`Scraped value ${scrapedValue} for ${field}`);
                        scrapeObject[field] = await FIELD_SCRAPERS[field](colElems[FIELD_COLUMN[field]]);
                    }
                }
            }
            pageResults.push(scrapeResult(scrapeObject));
            process.stdout.write(`Scraped ${++counter} rows\r`);
        }
        console.log('\r');
        // console.log(`${pageResults.length} rows remain after reading and filtering.`);
        // console.log(`Results from scraping page ${pageNumber}:\n${scrapeResultsString(pageResults)}`);
        // console.log(`Adding ${pageResults.length} rows to results...`);
        results.push(...pageResults);

        shouldContinue = isDateBetween(earliestDate, startDate, endDate);
        console.log(`Earliest date found so far (${earliestDate.toFormat(Y_M_D)}) is ${!!shouldContinue ? CONTINUE_SCRAPE : STOP_SCRAPE}`);
        if (!!shouldContinue) {
            await gotoDashboard(page, ++pageNumber);
        }
    }
    // console.log('results after reading and filtering:', Object.entries(results));
    return {page, results};
};

const donationDateFromRow = async (row) => {
    let colElems = await row.$$("td");
    let donationDateCol = await colElems[FIELD_COLUMN['donationDate']];
    return await donationDateFromColumn(donationDateCol);
};

const donationDateFromColumn = async (column) => {
    // console.log(`Evaluating donation date for column ${column}...`);
    let dateText = await (await column.getProperty('innerText')).jsonValue();
    // console.log(`Date column: "${dateText}" converts to -> `, date);
    return DateTime.fromFormat(dateText, DONATION_DATE_PATTERN);
};

const areDatesEqual = (d1, d2) => d1.toMillis() === d2.toMillis();

export const isDateBetween = (date, startDate, endDate, includeStart = true, includeEnd = false) => {
    let isAtOrAfterStart = date > startDate || (includeStart && areDatesEqual(date, startDate));
    let isAtOrBeforeEnd = date < endDate || (includeEnd && areDatesEqual(date, endDate));
    return isAtOrAfterStart && isAtOrBeforeEnd;
};

const filterRows = async (tableRows, startDate, endDate) => {
    let rowsInRange = [];
    for (const row of tableRows) {
        let dateDonated = await donationDateFromRow(row);
        if (isDateBetween(dateDonated, startDate, endDate)) {
            rowsInRange.push(row);
        }
    }
    return rowsInRange;
};

const processResults = async (page, results) => {
    let processedResults = [];
    let counter = 0;
    for (const result of results) {
        let processedResult = {};
        for (const [field, processor] of Object.entries(PROCESSORS)) {
            await timeout(300);
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
        process.stdout.write(`Processed ${++counter} / ${results.length} rows\r`);
    }
    console.log('\r');
    return processedResults;
};

const gotoDashboard = async (page, pageNumber = 1) => {
    await gotoUrl(page, DONATIONS_URL(pageNumber));
    return page;
};

export const getResultsFilename = date =>
    `donations_ending_${date.toFormat(Y_M_D)}_${DateTime.now().toFormat(Y_M_D_TIME)}_${Math.floor(Math.random() * 9999)}.csv`;

/*const gotoNextUserDataPage = async page => {
    if (elementForQuery(page, NEXT_BUTTON_CLASS)) {
        let a = await page.$(NEXT_BUTTON_CLASS);
        await Promise.all([
            page.waitForNavigation(),
            a.click({delay: 100, button: "left", clickCount: 1})
        ]);
    }
};*/

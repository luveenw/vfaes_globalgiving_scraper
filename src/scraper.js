import luxon from "luxon";
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

import {DONATIONS_URL, LOCAL_FILE_URL, NEXT_BUTTON_CLASS, TABLE_ROW_SELECTOR, Y_M_D, Y_M_D_TIME} from './constants.js';

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

export const scrapeUserData = async (startDate, endDate) => {
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
            page = await gotoDashboard(page);
            ({page, results} = await gatherUserData(page, startDate, endDate));
            !!browser && await browser.close();
            return await processResults(page, results);
            // mailFile(resultsFilename);
        }
    } catch (e) {
        console.error("Error:", e);
        !!browser && await browser.close();
    }
};

const gotoDashboard = async (page) => {
    await gotoUrl(page, DONATIONS_URL);
    return page;
};

export const writeResultsToFile = async (results, path) => {
    let writeLines = [
        () => fs.writeFile(`result${sep}${path}`, Object.values(RESULT_COLUMN_HEADERS).join(',')),
        () => fs.appendFile(`result${sep}${path}`, '\n'),
        () => fs.appendFile(`result${sep}${path}`, scrapeResultsString(results), err => !!err && console.log('Error writing results:', err)),
        () => fs.appendFile(`result${sep}${path}`, '\n')
    ];
    for (const line of writeLines) {
        await line();
    }
};
export const getResultsFilename = date =>
    `donations_ending_${date.toFormat(Y_M_D)}_${DateTime.now().toFormat(Y_M_D_TIME)}_${Math.floor(Math.random() * 9999)}.csv`;

const areDatesEqual = (d1, d2) => d1.toMillis() === d2.toMillis();

const isDateBetween = (date, startDate, endDate, includeStart = false, includeEnd = false) => {
    let isAtOrAfterStart = date > startDate || (includeStart && areDatesEqual(date, startDate));
    let isAtOrBeforeEnd = date < endDate || (includeEnd && areDatesEqual(date, endDate));
    return isAtOrAfterStart && isAtOrBeforeEnd;
};

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
    let results = [];
    while (shouldContinue) {
        let tableRows = await page.$$(TABLE_ROW_SELECTOR);
        let pageResults = [];
        numRows = tableRows.length;
        // console.log(`${numRows} rows found.`);
        if (numRows === 0) {
            break;
        }
        // console.log(`Filtering rows by date...`);
        /*let cols1 = await (await tableRows[0]).$$("td");
        console.log(`Columns:${await cols1}`);
        console.log(`Donation date column: ${cols1[5]}`);
        console.log(`Donation date column value: ${await (await cols1[5].getProperty('innerText')).jsonValue()}`);*/
        for (const row of tableRows) {
            let colElems = await row.$$("td");
            // console.log(`colElems: ${colElems}`);
            let donationDateCol = await colElems[FIELD_COLUMN['donationDate']];
            // console.log(`Checking dateDonated for ${donationDateCol}...`);
            let dateDonated = await donationDate(donationDateCol);
            let dateInRange = isDateBetween(dateDonated, startDate, endDate, true);
            // console.log(`${dateDonated} in range: ${dateInRange}`);
            if (dateInRange) {
                let scrapeObject = {};
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
            }
        }

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

const processResults = async (page, results) => {
    let processedResults = [];
    for (const result of results) {
        let processedResult = {};
        for (const [field, processor] of Object.entries(PROCESSORS)) {
            let processedValue = await processor(page, result);
            // console.log(`Processed value ${processedValue} for ${field}`);
            processedResult[field] = processedValue;
        }
        // console.log("result:", Object.entries(result));
        // console.log("processedResult:", Object.entries(processedResult));
        for (const field of Object.keys(processedResult)) {
            result[field] = processedResult[field];
        }
        // console.log("merged result:", Object.entries(result));
        processedResults.push(result);
    }
    return processedResults;
};

const gotoNextUserDataPage = async page => {
    elementForQuery(page, NEXT_BUTTON_CLASS) &&
    await Promise.all([
        page.waitForNavigation(),
        page.click(NEXT_BUTTON_CLASS, {delay: 100, button: "left", clickCount: 1})
    ]);
};




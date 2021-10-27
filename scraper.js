import luxon from "luxon";
import fspkg from 'fs';

import {elementForQuery, loadFile} from './pageHelpers.js';
import {
    COLUMN_FIELDS,
    donationDate,
    FIELD_COLUMN,
    FIELD_SCRAPERS,
    PROCESSORS,
    RESULT_COLUMN_HEADERS
} from './scrapeFunctions.js';
import {scrapeResult, scrapeResultsString} from './scrapeResult.js';

import {DONATIONS_URL, LOCAL_FILE_URL, NEXT_BUTTON_CLASS, TABLE_ROW_SELECTOR} from './constants.js';

const fs = fspkg.promises;
const {DateTime} = luxon;

export const scrapeUserData = async (startDate, endDate) => {
    // console.log(`promisePoller [type ${typeof promisePoller}]:`, promisePoller);
    let browser;
    let page;
    let results;
    try {
        console.log(`Loading url ${LOCAL_FILE_URL}...`);
        ({browser, page} = await loadFile(LOCAL_FILE_URL));
        // await screenshot(page, 'page');
        /*({browser, page, result} = await performLogin());
        if (!result) {
            !!browser && await browser.close();
        }
        page = await gotoDashboard(page);*/
        ({page, results} = await gatherUserData(page, startDate, endDate));
        console.log('results before processing:', Object.entries(results));
        console.log('Processing results...');
        results = await processResults(page, results);
        await writeResultsToFile(results, resultsFilename(endDate));
        !!browser && await browser.close();

    } catch (e) {
        console.error("Error:", e);
        !!browser && await browser.close();
    }
};

const gotoDashboard = async (page) => {
    await page.goto(DONATIONS_URL);
    return page;
};

const writeResultsToFile = async (results, path) => {
    let writeLines = [
        () => fs.writeFile(`result\\${path}`, Object.values(RESULT_COLUMN_HEADERS).join(',')),
        () => fs.appendFile(`result\\${path}`, '\n'),
        () => fs.appendFile(`result\\${path}`, scrapeResultsString(results), err => !!err && console.log('Error writing results:', err)),
        () => fs.appendFile(`result\\${path}`, '\n')
    ];
    for (const line of writeLines) {
        await line();
    }
};
export const resultsFilename = date => `donations_ending_${date.toFormat('yyyy-MM-dd')}_${DateTime.now().toFormat('yyyy-MM-dd_mm_ss_SSS')}_${Math.floor(Math.random() * 9999)}.csv`;

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
        console.log(`${numRows} rows found.`);
        if (numRows === 0) {
            break;
        }
        console.log(`Filtering rows by date...`);
        /*let cols1 = await (await tableRows[0]).$$("td");
        console.log(`Columns:${await cols1}`);
        console.log(`Donation date column: ${cols1[5]}`);
        console.log(`Donation date column value: ${await (await cols1[5].getProperty('innerText')).jsonValue()}`);*/

        await Promise.all(tableRows.map(async (row) => {
            let colElems = await row.$$("td");
            console.log(`colElems: ${colElems}`);
            let cols = [...colElems];
            let donationDateCol = await cols[FIELD_COLUMN['donationDate']];
            console.log(`Checking dateDonated for ${donationDateCol}...`);
            let dateDonated = await donationDate(donationDateCol);
            let dateInRange = isDateBetween(dateDonated, startDate, endDate);
            console.log(`${dateDonated} in range: ${dateInRange}`);
            if (dateInRange) {
                let scrapeObject = {};
                await Promise.all(cols.map(async (col, index) => {
                    let fields = COLUMN_FIELDS[index];
                    !!fields && await Promise.all(fields.map(async field => {
                        console.log(`Running scraper for ${field} column...`);
                        let scrapedValue = await FIELD_SCRAPERS[field](cols[FIELD_COLUMN[field]]);
                        console.log(`Scraped value ${scrapedValue} for ${field}`);
                        scrapeObject[field] = scrapedValue;
                    }));
                }));
                pageResults.push(scrapeResult(scrapeObject));
            }

            /*let cols = Array.from(, (col, index) => scrapers[COLUMN_FIELDS]());
            let colsText = cols.reduce((result, col) => `${result} [${col}]`, '');
            console.log(`Columns: ${colsText}`);
            let dateDonated = donationDate({row, page}).donationDate;
            if (isDateBetween(dateDonated, startDate, endDate)) {
                result.push(row);
            }*/
        }));

        console.log(`${pageResults.length} rows remain after reading and filtering.`);
        /*let filteredResults = [];
        for (const row of processedRows) {
            let result = scrapeRow(row, page);
            filteredResults.push(result);
        }*/


        console.log(`Results from scraping page ${pageNumber}:\n${scrapeResultsString(pageResults)}`);
        console.log(`Adding ${pageResults.length} rows to results...`);
        results.push(...pageResults);

        shouldContinue = pageResults.length === numRows;
        if (shouldContinue) {
            await gotoNextUserDataPage(page);
        }
    }
    console.log('results after reading and filtering:', Object.entries(results));
    return {page, results};
};

const processResults = async (page, results) =>
    await Promise.all(results.map(async (result) => {
        let processedResult = {};
        await Promise.all(Object.keys(PROCESSORS).map(async (field) => {
            let processedValue = await PROCESSORS[field](page, result);
            console.log(`Processed value ${processedValue} for ${field}`);
            processedResult[field] = processedValue;
        }));
        console.log("result:", Object.entries(result));
        console.log("processedResult:", Object.entries(processedResult));
        for (const field of Object.keys(processedResult)) {
            result[field] = processedResult[field];
        }
        console.log("merged result:", Object.entries(result));
        return result;
    }));

const gotoNextUserDataPage = async page => {
    elementForQuery(page, NEXT_BUTTON_CLASS) &&
    await Promise.all([
        page.waitForNavigation(),
        page.click(NEXT_BUTTON_CLASS, {delay: 100, button: "left", clickCount: 1})
    ]);
};




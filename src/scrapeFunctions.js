import luxon from 'luxon';

import {
    DECIMAL_OR_INTEGER_REGEX,
    DIGIT_REGEX,
    DONATION_ID_REGEX,
    DONOR_EMAIL_TEXT_ID,
    GLOBALGIVING_URL
} from './constants.js';
import {elementForQuery, gotoUrl} from './pageHelpers.js';

// import * as fs from "fs";

const {DateTime} = luxon;

const donationId = async (column) => {
    // console.log(`Evaluating donation ID for column ${column}...`);
    let result = '';
    let link = await elementForQuery(column, 'a');
    if(!!link) {
        let donorProfilePath = await column.$eval('a', el => el.getAttribute("href"));
        let matches = donorProfilePath.match(DONATION_ID_REGEX);
        if(!!matches) {
            let donationIdKeyValue = matches[0];
            let keyAndValue = donationIdKeyValue.split('=');
            if(keyAndValue.length === 2) {
                result = keyAndValue[1];
            }
        }
    }
    // console.log(`Donor email link: "${donorProfilePath}"`);
    // console.log(`Extracting donation ID from ${donorProfilePath}...`);
    // let donationIdText = donationIdKeyValue.split('=')[1];
    // console.log(`Donation ID: ${donationIdText}`);
    return result;
};
const projectId = async (column) => {
    // console.log(`Evaluating project link for column ${column}...`);
    // console.log(`Project ID: ${projectIdText}`);
    return await (await (await column.$('a')).getProperty('innerText')).jsonValue();
};
const projectLink = async (column) => {
    // console.log(`Evaluating project link for column ${column}...`);
    let projectLinkText = await column.$eval('a', el => el.getAttribute("href"));
    // console.log(`Project link: ${projectLinkText}`);
    return GLOBALGIVING_URL + '/projects' + projectLinkText;
};
const PROJECT_TITLE_CACHE = {};
const projectTitle = async (page, result) => {
    // console.log(`Extracting project title using url ${result.projectLink}...`);
    let cachedTitle = PROJECT_TITLE_CACHE[result.projectLink];
    if (!!cachedTitle) {
        // console.log(`Found project title cache hit ${result.projectLink} -> ${cachedTitle}`)
        return cachedTitle;
    }
    await gotoUrl(page, result.projectLink);
    // REPLACE WITH THIS REAL PAGE NAV CODE
    // await page.setContent(fs.readFileSync(LOCAL_PROJECT_PAGE_URL).toString());
    // await page.$("body");
    // let projectTitleText = await page.$eval('#subjectText', el => el.getAttribute('value')) || '';
    let projectTitleText = await (await (await page.$('h1')).getProperty('innerText')).jsonValue();
    // console.log(`Project title: ${projectTitleText}`);
    PROJECT_TITLE_CACHE[result.projectLink] = projectTitleText;
    return projectTitleText;
};
const donorName = async (column) => {
    // console.log(`Evaluating donor name for column ${column}...`);
    // console.log(`Donor email link node HTML: ${await (await column.getProperty('innerHTML')).jsonValue()}`);
    // let donorNameText = await (await (await column.$('h4')).getProperty('innerText')).jsonValue();
    // console.log(`Donor name text: ${donorNameText}`);
    return await (await (await column.$('h4')).getProperty('innerText')).jsonValue();
};
const donorProfileLink = async (column) => {
    // console.log(`Evaluating donor email link for column ${column}...`);
    // console.log(`Donor email link node HTML: ${await (await column.getProperty('innerHTML')).jsonValue()}`);
    let result = '';
    let elem = await column.$('a');
    if (!!elem) {
        let classes = (await (await elem.getProperty('className')).jsonValue()).split(' ');
        let hasEmail = classes.includes('email');
        if (hasEmail) {
            let donorProfilePath = await column.$eval('a', el => el.getAttribute("href"));
            result = GLOBALGIVING_URL + donorProfilePath;
        }
    }
    // console.log(`Donor email path text: ${donorProfilePath}`);
    return result;
};
const donorEmail = async (page, result) => {
    // console.log(`Extracting donor email using url ${result.donorProfileLink}...`);
    let email = '';
    if (!!result.donorProfileLink) {
        await gotoUrl(page, result.donorProfileLink);
        // REPLACE THIS WITH REAL PAGE NAV CODE
        // await page.setContent(fs.readFileSync(LOCAL_DONOR_PROFILE_URL).toString());
        // await page.$("body");
        let emailField = elementForQuery(page, DONOR_EMAIL_TEXT_ID);
        if (!!emailField) {
            // TODO luveenw verify fixed row 1155 reporting Error: failed to find element matching selector "input#thankyou_to"
            email = await page.$eval(DONOR_EMAIL_TEXT_ID, el => !!el && el.getAttribute("value")) || '';
        }
    }
    return email;
};
const trafficSource = async (column) => {
    // console.log(`Evaluating traffic source for column ${column}...`);
    // let trafficSourceText = await (await column.getProperty('innerText')).jsonValue();
    // console.log(`Traffic source text: ${trafficSourceText}`);
    return await (await column.getProperty('innerText')).jsonValue();
};

const paymentMethod = async (column) => {
    // console.log(`Evaluating payment method for column ${column}...`);
    // console.log(`Payment method text: ${paymentMethodText}`);
    return await (await (await column.$('span.tinyCaption')).getProperty('innerText')).jsonValue();
};

export const donationDateString = async (column) => {
    // console.log(`Evaluating donation date for column ${column}...`);
    let dateString = await (await column.getProperty('innerText')).jsonValue();
    return `"${dateString}"`;
};

const recurring = async (column) => {
    // console.log(`Evaluating recurring status for column ${column}...`);
    let recurringText = await (await column.getProperty('innerText')).jsonValue();
    // let statusText = (!!recurringText && ~recurringText.indexOf('Yes')) ? 'Yes' : 'No';
    // console.log(`Recurring text: ${statusText}`);
    return (!!recurringText && recurringText.indexOf('Yes') >= 0) ? 'Yes' : 'No';
};
const recurringStatus = async (column) => {
    // console.log(`Evaluating recurring status for column ${column}...`);
    let rsTxt = await (await column.getProperty('innerText')).jsonValue();
    // console.log(`Original recurring status text: ${rsTxt}`);
    // console.log(`Recurring status text: ${statusText}`);
    return (!!rsTxt && rsTxt.indexOf('Yes') >= 0 && rsTxt.indexOf('(') >= 0) ? rsTxt.match(/\(.*\)/)[0].slice(1, -1) : '';
};
const totalAmount = async (column) => {
    let totalAmtText = await (await column.getProperty('innerText')).jsonValue();
    let regexMatch = DECIMAL_OR_INTEGER_REGEX.exec(totalAmtText)[0];
    // console.log(`Looked for number in ${totalAmtText}, found ${regexMatch}`);
    // console.log(`Total amount: ${totalAmt}`);
    return JSON.parse(regexMatch);
};
const currency = async (column) => {
    let totalAmtText = await (await column.getProperty('innerText')).jsonValue();
    let firstNumberIndex = DIGIT_REGEX.exec(totalAmtText).index;
    // console.log(`Currency: ${currency}`);
    return totalAmtText.slice(0, firstNumberIndex);
};
const totalAmountUSD = async (column) => {
    let totalAmtText = await (await column.getProperty('innerText')).jsonValue();
    let regexMatch = DECIMAL_OR_INTEGER_REGEX.exec(totalAmtText)[0];
    // console.log(`Looked for number in ${totalAmtText}, found ${regexMatch}`);
    // console.log(`Total amount in USD: ${totalAmt}`);
    return JSON.parse(regexMatch);
};

export const FIELD_SCRAPERS = {
    'donationDate': donationDateString,
    'donorProfileLink': donorProfileLink,
    'projectId': projectId,
    'projectLink': projectLink,
    'donationId': donationId,
    'donorName': donorName,
    'trafficSource': trafficSource,
    'paymentMethod': paymentMethod,
    'recurring': recurring,
    'recurringStatus': recurringStatus,
    'totalAmount': totalAmount,
    'currency': currency,
    'totalAmountUSD': totalAmountUSD,
};

export const COLUMN_FIELDS = {
    0: ['projectId', 'projectLink'],
    1: ['donorName'],
    2: ['donorProfileLink', 'donationId'],
    3: ['trafficSource'],
    4: ['paymentMethod'],
    5: ['donationDate'],
    6: ['recurring', 'recurringStatus'],
    7: ['totalAmount', 'currency'],
    8: ['totalAmountUSD'],
};

export const FIELD_COLUMN = {
    'projectId': 0,
    'projectLink': 0,
    'donorProfileLink': 2,
    'donationId': 2,
    'donationDate': 5,
    'donorName': 1,
    'trafficSource': 3,
    'recurring': 6,
    'recurringStatus': 6,
    'paymentMethod': 4,
    'currency': 7,
    'totalAmount': 7,
    'totalAmountUSD': 8,
};

export const PROCESSORS = {
    'donorEmail': donorEmail,
    'projectTitle': projectTitle,
};

export const RESULT_COLUMN_HEADERS = {
    'projectId': 'Project Id',
    'projectTitle': 'Project Title',
    'donationId': 'Donation ID',
    'donorName': 'Donor Name',
    'donorEmail': 'Donor Email',
    'trafficSource': 'Traffic Source',
    'paymentMethod': 'Payment Method',
    'donationDate': 'Donation Date',
    'recurring': 'Recurring',
    'recurringStatus': 'Recurring Status',
    'totalAmount': 'Total Amount',
    'currency': 'Currency',
    'totalAmountUSD': 'Total Amount in USD',
};

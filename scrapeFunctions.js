import luxon from "luxon";

import {DONATION_ID_REGEX, DONOR_EMAIL_TEXT_ID, DONOR_PROFILE_LOCAL_URL, PROJECT_PAGE_LOCAL_URL} from './constants.js';
import * as fs from "fs";

const {DateTime} = luxon;

const donationId = async (column) => {
    console.log(`Evaluating donation ID for column ${column}...`);
    let donorEmailLink = await column.$eval('a.email', el => el.getAttribute("href"));
    console.log(`Donor email link: "${donorEmailLink}"`);
    console.log(`Extracting donation ID from ${donorEmailLink}...`);
    let donationIdKeyValue = donorEmailLink.match(DONATION_ID_REGEX)[0];
    let donationIdText = donationIdKeyValue.split('=')[1];
    console.log(`Donation ID: ${donationIdText}`);
    return donationIdText;
};
const projectId = async (column) => {
    console.log(`Evaluating project link for column ${column}...`);
    let projectIdText = await (await (await column.$('a')).getProperty('innerText')).jsonValue();
    console.log(`Project ID: ${projectIdText}`);
    return projectIdText;
};
const projectLink = async (column) => {
    console.log(`Evaluating project link for column ${column}...`);
    let projectLinkText = await column.$eval('a', el => el.getAttribute("href"));
    console.log(`Project link: ${projectLinkText}`);
    return projectLinkText;
};
const projectTitle = async (page, result) => {
    console.log('Extracting project title...');
    // REPLACE WITH THIS REAL PAGE NAV CODE
    // await page.goto(result.donorEmailLink);
    await page.setContent(fs.readFileSync(PROJECT_PAGE_LOCAL_URL).toString());
    await page.$("body");
    let projectTitleText = await (await (await page.$('h1')).getProperty('innerText')).jsonValue();
    console.log(`Project title: ${projectTitleText}`);
    return projectTitleText;
};
const donorName = ({row, page, result}) => {
};
const donorEmailLink = async (column) => {
    console.log(`Evaluating donor email link for column ${column}...`);
    let donorEmailLink = await column.$eval('a.email', el => el.getAttribute("href"));
    console.log(`Donor email link: "${donorEmailLink}"`);
    console.log(`Extracting donor email link from ${donorEmailLink}...`);
    console.log(`typeof donorEmailLink: ${typeof donorEmailLink}`);
    return donorEmailLink;
};
const donorEmail = async (page, result) => {
    console.log('Extracting donor email...');
    // REPLACE WITH THIS REAL PAGE NAV CODE
    // await page.goto(result.donorEmailLink);
    await page.setContent(fs.readFileSync(DONOR_PROFILE_LOCAL_URL).toString());
    await page.$("body");
    let donorEmailText = await page.$eval(DONOR_EMAIL_TEXT_ID, el => el.getAttribute("value")) || '';
    return donorEmailText;
};
const trafficSource = ({row, page, result}) => {
};
const paymentMethod = ({row, page, result}) => {
};

const DONATION_DATE_PATTERN = 'MMM dd, y';

export const donationDate = async (column) => {
    console.log(`Evaluating donation date for column ${column}...`);
    let dateText = await (await column.getProperty('innerText')).jsonValue();
    console.log(`Date column: "${dateText}"`);
    console.log(`Extracting donation date from text ${dateText}...`);
    return DateTime.fromFormat(dateText, DONATION_DATE_PATTERN);
};

export const donationDateString = async (column) => {
    console.log(`Evaluating donation date for column ${column}...`);
    let dateString = await (await column.getProperty('innerText')).jsonValue();
    return `"${dateString}"`;
};

const recurringStatus = ({row, page, result}) => {
};
const quantity = ({row, page, result}) => {
};
const amount = ({row, page, result}) => {
};
const giftAid = ({row, page, result}) => {
};
const totalAmount = ({row, page, result}) => {
};
const currency = ({row, page, result}) => {
};
const disbursed = ({row, page, result}) => {
};
const totalAmountUSD = ({row, page, result}) => {
};

export const DONATION_ID = 'donationId';
export const PROJECT_ID = 'projectId';
export const PROJECT_LINK = 'projectLink';
export const DONOR_NAME = 'donorName';
export const DONOR_EMAIL_LINK = 'donorEmailLink';
export const TRAFFIC_SOURCE = 'trafficSource';
export const PAYMENT_METHOD = 'paymentMethod';
export const DONATION_DATE = 'donationDate';
export const RECURRING_STATUS = 'recurringStatus';
export const TOTAL_AMOUNT = 'totalAmount';
export const CURRENCY = 'currency';
export const TOTAL_AMOUNT_USD = 'totalAmountUSD';


export const FIELD_SCRAPERS = {
    'donationDate': donationDateString,
    'donorEmailLink': donorEmailLink,
    'projectId': projectId,
    'projectLink': projectLink,
    'donationId': donationId,
};

/*export const COLUMN_FIELDS = {
    0: [/!*'projectId', *!/'projectLink'],
    1: [/!*'donorName'*!/],
    2: ['donorEmailLink'/!*, 'donationId'*!/],
    3: [/!*'trafficSource', 'isRecurring'*!/],
    4: [/!*'paymentMethod'*!/],
    5: ['donationDate'],
    6: [/!*'recurringStatus'*!/],
    7: [/!*'totalAmount', 'currency'*!/],
    8: [/!*'totalAmountUSD'*!/],
};*/

export const COLUMN_FIELDS = {
    0: ['projectId', 'projectLink'],
    // 1: [/*'donorName'*/],
    2: ['donorEmailLink', 'donationId'],
    // 3: [/*'trafficSource', 'isRecurring'*/],
    // 4: [/*'paymentMethod'*/],
    5: ['donationDate'],
    // 6: [/*'recurringStatus'*/],
    // 7: [/*'totalAmount', 'currency'*/],
    // 8: [/*'totalAmountUSD'*/],
};

export const FIELD_COLUMN = {
    'projectId': 0,
    'projectLink': 0,
    'donorEmailLink': 2,
    'donationId': 2,
    'donationDate': 5,
};

export const PROCESSORS = {
    'projectTitle': projectTitle,
    'donorEmail': donorEmail,
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
    'recurringStatus': 'Recurring Status',
    'totalAmount': 'Total Amount',
    'currency': 'Currency',
    'totalAmountUSD': 'Total Amount in USD',
};

// export const scrapers = {
//     'donationId': donationId,
//     'projectId': projectId,
//     'projectLink': projectLink,
//     'donorName': donorName,
//     'donorEmailLink': donorEmailLink,
//     'trafficSource': trafficSource,
//     'paymentMethod': paymentMethod,
//     'includesCorpGiftCards': includesCorpGiftCards,
//     'donationDate': donationDate,
//     'recurringStatus': recurringStatus,
//     'quantity': quantity,
//     'amount': amount,
//     'totalAmount': totalAmount,
//     'currency': currency,
//     'totalAmountUSD': totalAmountUSD,
// };
//
// export const FIELD_SCRAPERS = {
//     'donationId': donationId,
//     'projectId': projectId,
//     'projectLink': projectLink,
//     'donorName': donorName,
//     'donorEmailLink': donorEmailLink,
//     'trafficSource': trafficSource,
//     'paymentMethod': paymentMethod,
//     'includesCorpGiftCards': includesCorpGiftCards,
//     'donationDate': donationDate,
//     'inHonorOf': inHonorOf,
//     'isRecurring': isRecurring,
//     'recurringStatus': recurringStatus,
//     'quantity': quantity,
//     'amount': amount,
//     'totalAmount': totalAmount,
//     'currency': currency,
//     'totalAmountUSD': totalAmountUSD,
// };
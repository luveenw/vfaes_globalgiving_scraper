import luxon from "luxon";

import {
    DONATION_ID_REGEX,
    DONOR_EMAIL_TEXT_ID,
    GLOBALGIVING_URL/*, LOCAL_DONOR_PROFILE_URL, LOCAL_PROJECT_PAGE_URL*/
} from './constants.js';
import {gotoUrl} from './pageHelpers.js';

// import * as fs from "fs";

const {DateTime} = luxon;

const donationId = async (column) => {
    console.log(`Evaluating donation ID for column ${column}...`);
    let donorProfilePath = await column.$eval('a', el => el.getAttribute("href"));
    console.log(`Donor email link: "${donorProfilePath}"`);
    console.log(`Extracting donation ID from ${donorProfilePath}...`);
    let donationIdKeyValue = donorProfilePath.match(DONATION_ID_REGEX)[0];
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
    return GLOBALGIVING_URL + '/projects' + projectLinkText;
};
const projectTitle = async (page, result) => {
    console.log(`Extracting project title using url ${result.donorProfileLink}...`);
    // await gotoUrl(page, result.projectLink, {waitUntil: 'networkidle0'});
    await page.goto(result.donorProfileLink);
    // REPLACE WITH THIS REAL PAGE NAV CODE
    // await page.setContent(fs.readFileSync(LOCAL_PROJECT_PAGE_URL).toString());
    // await page.$("body");
    // let projectTitleText = await (await (await page.$eval('#subjectText', el => el.getAttribute('value'))).getProperty('innerText')).jsonValue();
    let projectTitleText = await page.$eval('#subjectText', el => el.getAttribute('value')) || '';
    console.log(`Project title: ${projectTitleText}`);
    return projectTitleText;
};
const donorName = ({row, page, result}) => {
};
const donorProfileLink = async (column) => {
    console.log(`Evaluating donor email link for column ${column}...`);
    // console.log(`Donor email link node HTML: ${await (await column.getProperty('innerHTML')).jsonValue()}`);
    let donorProfilePath = await column.$eval('a', el => el.getAttribute("href"));
    console.log(`Donor email path text: ${donorProfilePath}`);
    return GLOBALGIVING_URL + donorProfilePath;
};
const donorEmail = async (page, result) => {
    console.log(`Extracting donor email using url ${result.donorProfileLink}...`);
    await gotoUrl(page, result.donorProfileLink);
    // REPLACE WITH THIS REAL PAGE NAV CODE
    // await page.setContent(fs.readFileSync(LOCAL_DONOR_PROFILE_URL).toString());
    // await page.$("body");
    return await page.$eval(DONOR_EMAIL_TEXT_ID, el => el.getAttribute("value")) || '';
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
const totalAmount = ({row, page, result}) => {
};
const currency = ({row, page, result}) => {
};
const totalAmountUSD = ({row, page, result}) => {
};

export const FIELD_SCRAPERS = {
    'donationDate': donationDateString,
    'donorProfileLink': donorProfileLink,
    'projectId': projectId,
    'projectLink': projectLink,
    'donationId': donationId,
};

export const COLUMN_FIELDS = {
    0: ['projectId', 'projectLink'],
    // 1: [/*'donorName'*/],
    2: ['donorProfileLink', 'donationId'],
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
    'donorProfileLink': 2,
    'donationId': 2,
    'donationDate': 5,
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
    'recurringStatus': 'Recurring Status',
    'totalAmount': 'Total Amount',
    'currency': 'Currency',
    'totalAmountUSD': 'Total Amount in USD',
};

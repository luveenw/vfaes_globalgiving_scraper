import {RESULT_COLUMN_HEADERS} from './scrapeFunctions.js';

const RESULT_TEMPLATE = {
    donationId: 0, // receiptItemId queryParam in link on donorEmail column
    projectLink: '', // url in project ID column
    projectId: 0,
    projectTitle: '',  // project title - second pass scrape
    donorName: '', // donor name or 'Anonymous'
    donorEmail: '',    // donor email - second pass scrape
    donorProfileLink: '',    // link to donor profile page, which has email listed
    trafficSource: '',
    isRecurring: false,    // is value of trafficSource column == 'recurring'
    paymentMethod: '', // 'paypal', 'applepay', or 'creditcard' - confirm these are all possible values
    donationDate: '',
    recurringStatus: 'No', // 'No' or 'Yes (N donations)'
    totalAmount: 0.00,
    currency: 'USD',
    totalAmountUSD: 0.00
};

export const scrapeResult = (object = undefined) =>
    Object.assign({...RESULT_TEMPLATE, ...object});


export const scrapeResultsString = results =>
    results.map(result => Object.keys(RESULT_COLUMN_HEADERS).map(key => result[key]).join(',')).join('\n');

import { RESULT_COLUMN_HEADERS } from "./scrapeFunctions.js";

const RESULT_TEMPLATE = {
  donationId: 0, // receiptItemId queryParam in link on donorEmail column
  projectLink: "", // url in project ID column
  projectId: 0,
  projectTitle: "", // project title - second pass scrape
  donorName: "", // donor name or 'Anonymous'
  donorEmail: "", // donor email - second pass scrape
  donorProfileLink: "", // link to donor profile page, which has email listed
  trafficSource: "",
  recurring: "No", // 'Yes' or 'No'
  recurringStatus: "", // Blank if recurring is 'No'; string enclosed in () if recurring is 'Yes'
  paymentMethod: "", // 'paypal', 'applepay', or 'creditcard' - confirm these are all possible values
  donationDate: "",
  totalAmount: 0.0,
  currency: "USD",
  totalAmountUSD: 0.0,
};

/**
 * Creates a scrape result object using the values specified for the fields in object.
 * @param object object with fields to assign values to in scrape result object
 * @returns a scrape result object with updates to fields specified in the object passed as a parameter.
 * NOTE: This version does not support deep copies! Update to use Object.assign() or spread syntax {...obj} if this is needed in the future.
 */
export const scrapeResult = (object = undefined) => ({
  ...RESULT_TEMPLATE,
  ...object,
});

export const scrapeResultsString = (results) =>
  results
    .map((result) =>
      Object.keys(RESULT_COLUMN_HEADERS)
        .map((key) => result[key])
        .join(",")
    )
    .join("\n");

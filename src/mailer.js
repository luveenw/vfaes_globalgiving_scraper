import nodemailer from "nodemailer";
import process from "process";
import luxon from "luxon";
import { DONATION_DATE_PATTERN, Y_M_D, Y_M_D_TIME_EMAIL } from "./constants.js";

const issuesMessage = (numFailures) => {
  const isOneFailure = numFailures === 1;
  const suffix = isOneFailure ? "" : "s";
  const notSuffix = isOneFailure ? "s" : "";
  return `${numFailures} Processing Issue${suffix}:

  The following data row${suffix} contain${notSuffix} fields that could not be processed. The corresponding report row${suffix} may contain inaccurate data for these specific fields.`;
};

const { DateTime } = luxon;

const MAIL = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USERNAME,
    pass: process.env.GMAIL_PASSWORD,
  },
});

const dateRangeStr = (startDate, endDate) =>
  `${startDate.toFormat(Y_M_D)} to before ${endDate.toFormat(Y_M_D)}`;

export const failuresString = (failures) => {
  console.log(issuesMessage(failures.length), failures);
  failures
    .map(({ field, result, err }, index) => {
      console.log(
        `Delegating to function to generate failure string for field ${field} of result ${result} due to error ${err}...`
      );
      return failureString(index, field, result, err);
    })
    .join("\n\n");
};

const failureString = (i, f, r, e) => {
  const string = `${i + 1}. Failed to process ${f} for donation ID ${
    r.donationId
  } amount $${r.totalAmountUSD} on ${r.donationDate} \
by ${r.donorName}. Error:

${!!e ? e.stack : e}`;
  console.log(
    `Generating failure string: result ${r} | field ${f} - ${string}`
  );
  return string;
};

const sendMail = (mailOptions) => {
  MAIL.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email:", error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

export const getRecipients = (isTestRun) => {
  console.log("Get recipients for test run? ", isTestRun);
  return !!isTestRun
    ? process.env.TEST_RECIPIENT_EMAILS
    : process.env.RECIPIENT_EMAILS;
};

export const emailResults = (r, startDate, endDate, isTestRun) => {
  let mainEmailText = `Donor data for ${dateRangeStr(startDate, endDate)}. \
Generated at ${DateTime.now().toFormat(Y_M_D_TIME_EMAIL)}`;
  let numFailures = !!r.failures && !!r.failures.length ? r.failures.length : 0;
  let failuresText = !!numFailures
    ? `
    
${issuesMessage(numFailures)}
      
${failuresString(r.failures)}`
    : "";
  sendMail({
    from: process.env.SCRAPER_EMAIL_FROM,
    replyTo: process.env.REPLY_TO_EMAIL,
    to: getRecipients(isTestRun),
    subject: `VFAES GlobalGiving Donor Data (${dateRangeStr(
      startDate,
      endDate
    )})`,
    text: `${mainEmailText}${failuresText}`,
    attachments: [
      {
        filename: r.resultsFilename,
        content: r.results,
        contentType: "text/csv",
      },
    ],
  });
};

export const emailAppError = (e, startDate, endDate, isTestRun) => {
  let dateRange = dateRangeStr(startDate, endDate);
  let mainEmailText = `An error was encountered while generating donor data for ${dateRange}. Please try again!
This email was generated at ${DateTime.now().toFormat(Y_M_D_TIME_EMAIL)}.`;
  sendMail({
    from: process.env.SCRAPER_EMAIL_FROM,
    replyTo: process.env.REPLY_TO_EMAIL,
    to: getRecipients(isTestRun),
    subject: `[ERROR] VFAES GlobalGiving Donor Data (${dateRange})`,
    text: `${mainEmailText}
        
        Error: ${e}
        
        Stacktrace: ${e.stack}`,
  });
};

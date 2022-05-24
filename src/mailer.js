import nodemailer from 'nodemailer';
import process from 'process';
import luxon from 'luxon';
import {DONATION_DATE_PATTERN, Y_M_D, Y_M_D_TIME_EMAIL} from './constants.js';

const {DateTime} = luxon;

const MAIL = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD,
    }
});

const dateRangeStr = (startDate, endDate) => `${startDate.toFormat(Y_M_D)} to before ${endDate.toFormat(Y_M_D)}`;
export const failuresString = failures => {
    failures.map(({field, result}) => failureString(field, result)).join('\n');
};

const failureString = (f, r) =>
    `Failed to process ${f} for donation ID ${r.donationId} on ${r.donationDate} \
by ${r.donorName} of $${r.totalAmountUSD}`;

const sendMail = (mailOptions) => {
    MAIL.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

export const emailResults = (r, startDate, endDate) => {
    let mainEmailText = `Donor data for ${dateRangeStr(startDate, endDate)}. \
Generated at ${DateTime.now().toFormat(Y_M_D_TIME_EMAIL)}`;
    let failuresText = !!r.failures && !!r.failures.length ? `\n\n${r.failures.length} Processing Failures:\\n\n${failuresString(r.failures)}` : '';
    sendMail({
        from: process.env.SCRAPER_EMAIL_FROM,
        replyTo: process.env.REPLY_TO_EMAIL,
        to: process.env.RECIPIENT_EMAILS,
        subject: `VFAES GlobalGiving Donor Data (${dateRangeStr(startDate, endDate)})`,
        text: `${mainEmailText}${failuresText}`,
        attachments: [{
            filename: r.resultsFilename,
            content: r.results,
            contentType: 'text/csv'
        }]
    });
};

export const emailAppError = (e, startDate, endDate) => {
    let dateRange = dateRangeStr(startDate, endDate);
    let mainEmailText = `An error was encountered while generating donor data for ${dateRange}. Please try again!
This email was generated at ${DateTime.now().toFormat(Y_M_D_TIME_EMAIL)}.`;
    sendMail({
        from: process.env.SCRAPER_EMAIL_FROM,
        replyTo: process.env.REPLY_TO_EMAIL,
        to: [process.env.RECIPIENT_EMAILS, process.env.REPLY_TO_EMAIL].join(','),
        subject: `[ERROR] VFAES GlobalGiving Donor Data (${dateRange})`,
        text: `${mainEmailText}
        
        Error: ${e}
        
        Stacktrace: ${e.stack}`,
    });
};
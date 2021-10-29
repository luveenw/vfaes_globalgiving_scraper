import process from 'process';
import luxon from 'luxon';
import {default as dotenv} from 'dotenv';

const {DateTime} = luxon;
dotenv.config();

// GlobalGiving
export const GLOBALGIVING_URL = 'https://www.globalgiving.org';
export const LOGIN_URL = `${GLOBALGIVING_URL}/dy/v2/login/form.html`;
export const LOGIN_USERNAME = process.env.LOGIN_USERNAME;
export const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
export const LOGIN_USERNAME_ID = '#login_email';
export const LOGIN_PASSWORD_ID = '#passwd';
export const LOGIN_BUTTON_ID = '#login_button';
export const LOGGED_IN_URL = 'https://www.globalgiving.org/';
export const DONATIONS_URL = (page = 1) => `https://www.globalgiving.org/dy/v2/pe/manage/donations.html?organization.id=50094&d-3999764-p=${page}`;
export const TABLE_ROW_SELECTOR = '#donation tbody tr';
export const NEXT_BUTTON_CLASS = 'a.next';
export const DONOR_EMAIL_TEXT_ID = 'input#thankyou_to';
export const DONATION_ID_REGEX = /receiptItemId=[0-9]*/;
export const DIGIT_REGEX = /[0-9]/;
export const DECIMAL_OR_INTEGER_REGEX = /([0-9]+\.[0-9]+)|([0-9]+)/;
export const DONATION_DATE_PATTERN = 'MMM d, y';
export const Y_M_D = 'yyyy-MM-dd';
export const Y_M_D_TIME = `${Y_M_D}_HH.mm.ss.SSS`;

// scraping variables
export const END_DATE = !!process.env.END_DATE ? DateTime.fromFormat(process.env.END_DATE, Y_M_D) : DateTime.now();
export const START_DATE = !!process.env.START_DATE ? DateTime.fromFormat(process.env.START_DATE, Y_M_D) : END_DATE.minus({months: 1});
export const CONTINUE_SCRAPE = 'in range of scraping; looking for more data on next page';
export const STOP_SCRAPE = 'earlier than start date; stopping scraping on this page';

// 2captcha
export const TWO_CAPTCHA_TOKEN = process.env.TWO_CAPTCHA_TOKEN;
export const TWO_CAPTCHA_UNSOLVABLE_ERROR = 'ERROR_CAPTCHA_UNSOLVABLE';

// testing with local files
export const LOCAL_FILE_URL = 'C:\\Users\\luvee\\OneDrive\\Documents\\Conservation\\Voice for Asian Elephants Society VfAES Volunteering\\Donation Manager - GlobalGiving.html';
export const LOCAL_DONOR_PROFILE_URL = 'C:\\Users\\luvee\\OneDrive\\Documents\\Conservation\\Voice for Asian Elephants Society VfAES Volunteering\\Send Custom Note - GlobalGiving.html';
export const LOCAL_PROJECT_PAGE_URL = 'C:\\Users\\luvee\\OneDrive\\Documents\\Conservation\\Voice for Asian Elephants Society VfAES Volunteering\\Champions to Feed Odisha Elephants - GlobalGiving.html';
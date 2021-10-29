import * as fs from 'fs';
import promisePoller from 'promise-poller';
import puppeteer from 'puppeteer-extra';

import * as consts from './constants.js';

export const elementForQuery = async (page, selector, debug = false) => {
    // debug && console.log(`Finding ${selector}...`);
    let a = await page.$(selector);
    if (!a) {
        throw new Error(`No element found for selector ${selector} on page`);
    }
    return a;
};

const sliceStr = s => `0${s}`.slice(-2);
const sliceStrs = a => a.map(s => sliceStr(s)).join('');

export const timestamp = () => {
    let d = new Date();
    return `${d.getFullYear()}${sliceStrs([
        d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()])}`;
};

export const pollPromise = promisePoller.default;

export const screenshot = async (page, prefix) => {
    let options = {path: `screenshots\\${prefix}-${timestamp()}.png`, fullPage: true};
    // console.log(`Taking screenshot ${options.path}...`);
    await page.screenshot(options);
};

let timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

let solveCaptchas = async (page, retries = 3, interval = 1500, delay = 15000) => {
    console.log(`Waiting ${delay} milliseconds...`);
    await timeout(delay);
    return pollPromise({
        taskFn: solveCaptchaTask(page),
        interval,
        retries,
        progressCallback: (remaining, error) => {
            console.log(`Attempt ${retries - remaining + 1} / ${retries} failed with error`, error);
        }
    });
};

let solveCaptchaTask = (page) => {
    return async function () {
        return new Promise(async function (resolve, reject) {
            console.log('Sending login captcha to app...');
            // await screenshot(page, 'before-solve-captchas');
            let response = await page.solveRecaptchas();
            // console.log('Captcha attempt response:', response);
            // await screenshot(page, 'after-plugin-response');
            if (response && response.error) return reject(response.captchas);
            resolve(response.captchas);
        });
    }
};

export const performLogin = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await gotoUrl(page, consts.LOGIN_URL);

    elementForQuery(page, consts.LOGIN_USERNAME_ID, true) &&
    await page.type(consts.LOGIN_USERNAME_ID, consts.LOGIN_USERNAME, {delay: 100});
    elementForQuery(page, consts.LOGIN_PASSWORD_ID, true) &&
    await page.type(consts.LOGIN_PASSWORD_ID, consts.LOGIN_PASSWORD, {delay: 100});
    console.log('Trying captcha...');
    let result = await solveCaptchas(page);
    console.log('Finished working on captcha.');

    // await screenshot(page, 'after-solve-captchas');

    elementForQuery(page, consts.LOGIN_BUTTON_ID) &&
    await Promise.all([
        page.waitForNavigation({}),
        page.click(consts.LOGIN_BUTTON_ID, {delay: 100, button: "left", clickCount: 1})
    ]);

    // await screenshot(page, 'logged-in');

    if (page.url() !== consts.LOGGED_IN_URL) {
        return {browser, page, undefined};
    }

    return {browser, page, loginResult: result};
};

export const loadFile = async (url) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(fs.readFileSync(url).toString());
    await page.$("body");
    // console.log(`Page contains body: ${page.$("body")}`);

    return {browser, page};
};

export const gotoUrl = async (page, url, options = {waitUntil: 'domcontentloaded'}) =>
    await Promise.all([
        page.waitForNavigation(),
        page.goto(url, options),
    ]);
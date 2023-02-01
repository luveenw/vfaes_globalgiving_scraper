# GlobalGiving Report Data Scraper
I freelance for Voice for Asian Elephants Society (VFAES), a wildlife conservation nonprofit working to protect the threatened Asian elephant in India. The team had a pain point with their donor data reporting. Their earnings are spread across a variety of donor management platforms, one of which is GlobalGiving.

Collecting donor emails in GlobalGiving's web interface is a days-long manual process. They don't make the information available for download in their reports either. This project instructs a web scraper to log in to Global Giving using VFAES' account information (managed via a hidden secrets file in [this Glitch project](https://glitch.com/edit/#!/fortunate-likeable-confidence), and collects donor information to generate an on-demand report in minutes.

## Usage
This tool is only usable by VFAES team members that can access their GlobalGiving account.
1. Head to the [project website](fortunate-likeable-confidence.glitch.me/) and follow the instructions to get set up for solving the GlobalGiving login captcha.
1. Specify the date range for which donor data is desired and submit the form.
1. Donor data will be generated and emailed to a pre-defined list of recipients once it is ready, which typically takes under 10 minutes for recent date ranges.

## Implementation Details
1. The nodejs code handles presenting the login captcha and solving it via a combination of Puppeteer plugins including [ReCaptcha](https://www.npmjs.com/package/puppeteer-extra-plugin-recaptcha) and [stealth](https://www.npmjs.com/package/puppeteer-extra-plugin-stealth).
1. The captcha is presented to my [2captcha](https://2captcha.com/) account, which is set to sandbox mode, so can only be solved manually by myself or a team member I have shared this account's access key with.
1. Custom processors handle each column of data presented in the GlobalGiving UI. The processors are run using an Observer pattern. This makes it very easy to customize what columns ultimately end up in the report, for example by aggregating multiple columns in the UI, or conditionally processing column data.

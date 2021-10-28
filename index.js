#!/usr/bin/env node

import {runScraper} from './src/scraper.js';

runScraper().then(result => console.log(`Wrote results to file ${result}`));
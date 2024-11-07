const puppeteer = require('puppeteer');
const { URL } = require('url');

async function getUrls(domain) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const visitedUrls = new Set();
    const urlQueue = [domain];

    while (urlQueue.length > 0) {
        const currentUrl = urlQueue.shift();

        if (!visitedUrls.has(normalizeUrl(currentUrl))) {
            visitedUrls.add(normalizeUrl(currentUrl));

            try {
                await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

                const links = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('a'))
                        .map(link => link.href);
                });

                links.forEach(link => {
                    const linkUrl = new URL(link);
                    linkUrl.hash = ''; // Remove hash fragment

                    if (linkUrl.origin === new URL(domain).origin) {
                        const normalizedLink = normalizeUrl(linkUrl.toString());
                        if (!visitedUrls.has(normalizedLink) && !urlQueue.includes(normalizedLink)) {
                            urlQueue.push(normalizedLink);
                        }
                    }
                });
            } catch (err) {
                console.log(`Failed to load: ${currentUrl} - ${err.message}`);
            }
        }
    }

    await browser.close();
    return Array.from(visitedUrls);
}

// Helper function to normalize URLs by removing trailing slashes
function normalizeUrl(url) {
    return url.endsWith('/') ? url.slice(0, -1) : url;
}

// Replace 'https://example.com' with your domain
getUrls('https://elanenterprises.in').then(urls => {
    console.log('Filtered and Unique Crawled URLs:', urls);
}).catch(err => {
    console.error('Error during crawl:', err);
});

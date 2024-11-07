const puppeteer = require('puppeteer');
const { URL } = require('url');

async function getUrls(domain) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    // Set a user agent to mimic a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    const visitedUrls = new Set();
    const urlQueue = [domain];

    while (urlQueue.length > 0) {
        const currentUrl = urlQueue.shift();

        if (!visitedUrls.has(normalizeUrl(currentUrl))) {
            visitedUrls.add(normalizeUrl(currentUrl));

            try {
                await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                console.log(`Visiting: ${currentUrl}`);

                // Scroll to the bottom of the page to load dynamic content
                await autoScroll(page);

                const links = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('a'))
                        .map(link => link.href);
                });

                links.forEach(link => {
                    try {
                        const linkUrl = new URL(link);
                        linkUrl.hash = ''; // Remove hash fragment

                        if (linkUrl.origin === new URL(domain).origin) {
                            const normalizedLink = normalizeUrl(linkUrl.toString());
                            if (!visitedUrls.has(normalizedLink) && !urlQueue.includes(normalizedLink)) {
                                urlQueue.push(normalizedLink);
                            }
                        }
                    } catch (err) {
                        console.log(`Invalid URL encountered: ${link}`);
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

// Helper function to scroll down the page
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

// Replace 'https://example.com' with your domain
getUrls('https://elanenterprises.in/').then(urls => {
    console.log('Filtered and Unique Crawled URLs:', urls);
}).catch(err => {
    console.error('Error during crawl:', err);
});

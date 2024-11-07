const puppeteer = require('puppeteer');
const { URL } = require('url');

module.exports = async (req, res) => {
    const domain = req.query.url || 'https://elanenterprises.in';
    const visitedUrls = new Set();
    const urlQueue = [domain];

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

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
        res.status(200).json({ urls: Array.from(visitedUrls) });
    } catch (error) {
        console.error('Error during crawl:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Helper function to normalize URLs by removing trailing slashes
function normalizeUrl(url) {
    return url.endsWith('/') ? url.slice(0, -1) : url;
}

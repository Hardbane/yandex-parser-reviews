const { chromium } = require('playwright');
const fs = require('fs');

const url = process.argv[2];

if (!url) {
    console.error('URL is required');
    process.exit(1);
}

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
        ],
    });

    const page = await browser.newPage({
        locale: 'ru-RU',
        viewport: {
            width: 1400,
            height: 1000,
        },
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    const requests = [];

    page.on('response', async (response) => {
        const request = response.request();
        const responseUrl = response.url();

        if (!responseUrl.includes('yandex')) {
            return;
        }
        const resourceType = request.resourceType();

        if (!['xhr', 'fetch'].includes(resourceType)) {
            return;
        }

        const contentType = response.headers()['content-type'] || '';

        if (
            contentType.includes('application/json') ||
            responseUrl.includes('reviews') ||
            responseUrl.includes('business') ||
            responseUrl.includes('card') ||
            responseUrl.includes('maps')
        ) {
            let body = null;

            try {
                if (contentType.includes('application/json')) {
                    body = await response.text();
                }
            } catch (e) {}

            requests.push({
                method: request.method(),
                status: response.status(),
                resourceType,
                url: responseUrl,
                contentType,
                body: body ? body.slice(0, 3000) : null,
            });
        }
    });

    try {
        await page.goto(url, {

            waitUntil: 'load',
            timeout: 120000,
        });

        await page.waitForTimeout(10000);

        const reviewSelectors = [
            'text=Отзывы',
            'a[href*="reviews"]',
            'button:has-text("Отзывы")',
            '[role="tab"]:has-text("Отзывы")',
        ];

        for (const selector of reviewSelectors) {
            const item = page.locator(selector).first();

            if (await item.count()) {
                await item.click({ timeout: 5000 }).catch(() => {});
                await page.waitForTimeout(8000);
                break;
            }
        }


        const reviewsTab = page.getByText(/Отзывы/i).first();

        if (await reviewsTab.count()) {
            await reviewsTab.click().catch(() => {});
            await page.waitForTimeout(5000);
        }

        for (let i = 0; i < 30; i++) {
            await page.mouse.wheel(0, 1000);
            await page.waitForTimeout(1000);
        }

        await page.screenshot({
            path: 'storage/app/network-debug-screen.png',
            fullPage: true,
        });

        fs.writeFileSync(
            'storage/app/yandex-network-debug.json',
            JSON.stringify(requests, null, 2)
        );
        console.log('CURRENT URL:', page.url());
        console.log('TITLE:', await page.title());
        console.log(JSON.stringify({
            total: requests.length,
            savedTo: 'storage/app/yandex-network-debug.json',
            urls: requests.map((item) => item.url),
        }, null, 2));
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();

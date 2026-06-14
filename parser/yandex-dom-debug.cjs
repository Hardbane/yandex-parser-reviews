const { chromium } = require('playwright');
const fs = require('fs');

const url = process.argv[2];

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage({
        locale: 'ru-RU',
        viewport: { width: 1400, height: 1000 },
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(8000);

    for (let i = 0; i < 20; i++) {
        await page.mouse.wheel(0, 1200);
        await page.waitForTimeout(700);
    }

    await page.screenshot({
        path: 'storage/app/dom-debug-screen.png',
        fullPage: true,
    });

    const data = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*'))
            .map((el) => ({
                tag: el.tagName,
                className: el.className,
                text: (el.innerText || '').trim().slice(0, 500),
            }))
            .filter((item) =>
                item.text.includes('Знаток') ||
                item.text.includes('Отзыв') ||
                item.text.includes('★') ||
                item.text.length > 100
            )
            .slice(0, 300);
    });

    fs.writeFileSync(
        'storage/app/yandex-dom-debug.json',
        JSON.stringify(data, null, 2)
    );

    const reviewsCount = await page.locator('.business-review-view').count();

    console.log('REVIEWS IN DOM:', reviewsCount);

    await browser.close();

    console.log('Saved to storage/app/yandex-dom-debug.json');
})();

const { chromium } = require('playwright');
const fs = require('fs');
const url = process.argv[2];

if (!url) {
    console.error(JSON.stringify({
        error: 'URL is required',
    }));
    process.exit(1);
}

function cleanNumber(text) {
    if (!text) return 0;

    return Number(
        String(text)
            .replace(/\s/g, '')
            .replace(/[^\d]/g, '')
    ) || 0;
}

function isCaptchaText(text) {
    return text.includes('Подтвердите, что вы не робот') ||
        text.toLowerCase().includes('captcha') ||
        text.toLowerCase().includes('робот');
}

async function parseReviewsFromPage(page) {
    await page.waitForSelector('.business-review-view', {
        timeout: 30000,
    });

    return await page.$$eval('.business-review-view', (items) => {
        return items.map((item, index) => {
            const author = item
                .querySelector('.business-review-view__author-info')
                ?.innerText
                ?.split('\n')[0]
                ?.trim() || null;

            const text = item
                .querySelector('.business-review-view__body')
                ?.innerText
                ?.trim() || null;

            const fullText = item.innerText || '';

            const dateMatch = fullText.match(
                /(\d{1,2}\s+[а-яё]+\s+\d{4}|\d{1,2}\s+[а-яё]+|сегодня|вчера)/iu
            );

            return {
                externalId: `${author || 'unknown'}-${index}`,
                author,
                date: dateMatch ? dateMatch[1] : null,
                text,
                rating: null,
            };
        }).filter((review) => review.text);
    });
}

function parseReviewsFromHtmlSnapshot(html) {
    const reviewBlocks = html.match(/<div[^>]*class="[^"]*business-review-view[^"]*"[\s\S]*?(?=<div[^>]*class="[^"]*business-review-view[^"]*"|<\/body>)/g) || [];

    return reviewBlocks.map((block, index) => {
        const authorMatch = block.match(/business-review-view__author-info[\s\S]*?>([\s\S]*?)<\/div>/);
        const bodyMatch = block.match(/business-review-view__body[\s\S]*?>([\s\S]*?)<\/div>/);

        const strip = (value) => {
            return value
                ? value
                    .replace(/<[^>]+>/g, '\n')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/\s+\n/g, '\n')
                    .replace(/\n\s+/g, '\n')
                    .replace(/\n+/g, '\n')
                    .trim()
                : null;
        };

        const author = strip(authorMatch?.[1])?.split('\n')[0] || null;
        const text = strip(bodyMatch?.[1]);

        return {
            externalId: `${author || 'snapshot'}-${index}`,
            author,
            date: null,
            text,
            rating: null,
        };
    }).filter((review) => review.text);
}

async function autoScrollUntilReviewsLoaded(page, target = 600, maxIterations = 160) {
    let previousCount = 0;
    let sameCountTimes = 0;

    for (let i = 0; i < maxIterations; i++) {
        const currentCount = await page.locator('.business-review-view').count();

        if (currentCount >= target) {
            break;
        }

        if (currentCount === previousCount) {
            sameCountTimes++;
        } else {
            sameCountTimes = 0;
            previousCount = currentCount;
        }

        if (sameCountTimes >= 12) {
            break;
        }

        await page.evaluate(() => {
            const container =
                document.querySelector('.scroll__container') ||
                document.querySelector('.scroll');

            if (container) {
                container.scrollTop += 1200;
            } else {
                window.scrollBy(0, 1200);
            }
        });
        await page.waitForTimeout(1200 + Math.floor(Math.random() * 700));
    }
}

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHROMIUM_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-quic',
            '--ignore-certificate-errors',
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

    function toReviewsUrl(inputUrl) {
        const parsed = new URL(inputUrl);

        parsed.hostname = 'yandex.com';

        const parts = parsed.pathname.split('/').filter(Boolean);
        const orgIndex = parts.indexOf('org');

        if (orgIndex !== -1 && parts[orgIndex + 1] && parts[orgIndex + 2]) {
            parsed.pathname = `/maps/org/${parts[orgIndex + 1]}/${parts[orgIndex + 2]}/reviews/`;
        }

        return parsed.toString();
    }

    try {
        await page.goto(url, {
            waitUntil: 'load',
            timeout: 120000,
        });

        await page.waitForTimeout(5000);

        const pageText = await page.locator('body').textContent();

        if (isCaptchaText(pageText)) {
            const snapshotPath = 'storage/app/yandex-success-snapshot.html';

            if (!fs.existsSync(snapshotPath)) {
                throw new Error('captcha: нет сохранённого HTML snapshot');
            }

            const html = fs.readFileSync(snapshotPath, 'utf8');
            await autoScrollUntilReviewsLoaded(page, 600);
            const reviews = parseReviewsFromHtmlSnapshot(html);

            console.log(JSON.stringify({
                title: 'Данные из сохранённого snapshot',
                rating: null,
                ratingsCount: reviews.length,
                reviewsCount: reviewsCount || reviews.length,
                reviews: reviews.slice(0, 600),
                source: 'snapshot',
            }));

            await browser.close();
            process.exit(0);
        }

        const reviewsTab = page.locator('.tabs-select-view__title._name_reviews').first();

        if (await reviewsTab.count()) {
            const isSelected = (await reviewsTab.getAttribute('class'))?.includes('_selected');

            if (!isSelected) {
                await reviewsTab.click({ force: true });
                await page.waitForTimeout(5000);
            }
        }

        await page.waitForTimeout(4000 + Math.floor(Math.random() * 3000));

        await page.screenshot({
            path: 'storage/app/parser-debug.png',
            fullPage: true,
        });

        await require('fs').promises.writeFile(
            'storage/app/parser-debug.html',
            await page.content()
        );

        if (
            pageText.includes('Подтвердите, что вы не робот') ||
            pageText.includes('captcha') ||
            pageText.includes('робот')
        ) {
            throw new Error('captcha');
        }

        await page.waitForTimeout(5000);

        const title = await page.locator('h1').first().textContent().catch(() => null);

        const ratingText = await page
            .locator('[class*="business-rating-badge-view__rating-text"]')
            .first()
            .textContent()
            .catch(() => null);

        const rating = ratingText
            ? Number(ratingText.replace(',', '.'))
            : null;

        const bodyText = await page.locator('body').textContent();

        const reviewsCountMatch = bodyText.match(/(\d[\d\s]*)\s+отзыв/iu);
        const ratingsCountMatch = bodyText.match(/(\d[\d\s]*)\s+оцен/iu);

        const reviewsCount = reviewsCountMatch ? cleanNumber(reviewsCountMatch[1]) : 0;
        const ratingsCount = ratingsCountMatch ? cleanNumber(ratingsCountMatch[1]) : 0;



        if (await reviewsTab.count()) {
            await reviewsTab.click().catch(() => {});
            await page.waitForTimeout(3000);
        }

        await autoScroll(page, 40);

        const reviews = await parseReviewsFromPage(page);
        fs.writeFileSync(
            'storage/app/yandex-success-snapshot.html',
            await page.content()
        );


        console.log(JSON.stringify({
            title,
            rating,
            ratingsCount,
            reviewsCount: reviewsCount || reviews.length,
            reviews,
        }));
    } catch (error) {
        console.error(JSON.stringify({
            error: error.message,
        }));

        process.exit(1);
    } finally {
        await browser.close();
    }
})();

import * as puppeteer from 'puppeteer';

export async function getData() {
    let nbPageSelect = 1;
    const browser = await puppeteer.launch({headless: false})
    const page = await browser.newPage();
    do {
        await page.goto(`https://mangakakalot.com/manga_list?type=latest&category=all&state=all&page=${nbPageSelect}`);
        const links: Array<string> = await page.evaluate(() => {
            const fiches: NodeListOf<any> = document.querySelectorAll(".list-truyen-item-wrap");
            const array: Array<string> = [];

            for (let i = 0; i < fiches.length; i++) {
                array.push(fiches[i].querySelector("a").href)
            }

            return array;
        });
        let h1s: Array<string> = [];
        const MAX_PAGE_TO_LOAD = 5;
        for (let i = 0; i < links.length; i += MAX_PAGE_TO_LOAD) {
            const linksChunk: Array<string> = links.slice(i, i + MAX_PAGE_TO_LOAD);
            const promises = linksChunk.map(async (link) => {
                const newPage = await browser.newPage();

                await newPage.goto(link,{timeout: 0});
                await newPage.setCacheEnabled(false);
                const h1: string = await newPage.evaluate(() => {
                    return document.querySelector("h1")?.textContent as string;
                });
                await newPage.close();
                return h1;
            });
            h1s = h1s.concat(await Promise.all(promises));
        }
        h1s.forEach((h1) => {
            console.log(h1);
        });
        nbPageSelect += 1;
    } while (nbPageSelect < 4);

    await browser.close();
}
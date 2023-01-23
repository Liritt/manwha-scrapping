import * as puppeteer from 'puppeteer';

export async function getData() {
    const browser = await puppeteer.launch({headless: false})
    const page = await browser.newPage();

    await page.goto('https://mangakakalot.com');

    const links: Array<string> = await page.evaluate(() => {
        const fiches: NodeListOf<any> = document.querySelectorAll(".itemupdate");
        const array: Array<string> = [];

        for (let i = 0; i < fiches.length; i++) {
            array.push(fiches[i].querySelector("a").href)
        }

        return array;
    });
    let h1s: Array<string> = [];
    const MAX_PAGE_TO_LOAD: number = 5;
    for (let i = 0; i < links.length; i += MAX_PAGE_TO_LOAD) {
        let linksChunk: Array<string> = links.slice(i, i + MAX_PAGE_TO_LOAD);
        const promises = linksChunk.map(async (link) => {
            const newPage = await browser.newPage();

            await newPage.goto(link,{timeout: 60000});
            // @ts-ignore
            const h1: string = await newPage.evaluate(() => {
                // @ts-ignore
                return document.querySelector("h1").textContent;
            });
            await newPage.close();
            return h1;
        });
        h1s = h1s.concat(await Promise.all(promises));
    }
    h1s.forEach((h1) => {
        console.log(h1);
    });

    await browser.close();
}
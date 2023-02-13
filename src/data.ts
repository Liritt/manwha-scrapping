import * as puppeteer from 'puppeteer';

export async function getData() {
    let nbPageSelect = 1;
    const browser = await puppeteer.launch({headless: false})
    const page = await browser.newPage();
    let lstManwhas: Array<{name: string, genres: string[], status: string, lstAltNames: string[], rating: number, link: string, datUpdate: string | Date, description: string, nbViews: number, manwhaPicUrl: string}> = [];
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
        let manwhas: Array<{name: string, genres: string[], status: string, lstAltNames: string[], rating: number, link: string, datUpdate: string | Date, description: string, nbViews: number, manwhaPicUrl: string}> = [];
        const MAX_PAGE_TO_LOAD = 5;
        const bannedGenres: Array<string> = ["Yaoi", "Shounen ai", "Yuri"];
        for (let i = 0; i < links.length; i += MAX_PAGE_TO_LOAD) {
            const linksChunk: Array<string> = links.slice(i, i + MAX_PAGE_TO_LOAD);
            const promises = linksChunk.map(async (link) => {
                const newPage = await browser.newPage();

                await newPage.goto(link,{timeout: 0});
                const h1: string = await newPage.evaluate(() => {
                    return document.querySelector("h1")?.textContent as string;
                });

                const lstAltNames: Array<string> = await newPage.evaluate(() => {
                    let altNames = document.querySelector("div.leftCol div.manga-info-top ul.manga-info-text li:nth-child(1) h2")?.textContent as string;
                    if (altNames === undefined) {
                        const labelValue = document.querySelector("table.variations-tableInfo tbody tr:nth-child(1) td.table-label")?.textContent as string ?? "Pas de label";
                        if (labelValue.trim() === "Alternative :") {
                            altNames = document.querySelector("table.variations-tableInfo tbody tr:nth-child(1) td.table-value h2")?.textContent as string;
                        }
                    }
                    if (altNames !== undefined) {
                        if (altNames.startsWith("Alternative : ")) {
                            altNames = altNames.substring(14, altNames.length);
                        }
                        let newAltNames: Array<string>;
                        if (altNames.includes(";")) {
                            newAltNames = altNames.split(";");
                        } else if (altNames.includes("/")) {
                            newAltNames = altNames.split("/");
                        } else {
                            newAltNames = altNames.split(",")
                        }
                        const regex = /^[\u0000-\u00FF]+$/;
                        const verifNewAltNames: Array<string> = newAltNames.filter((altName) => altName.match(regex)).map((altName) => altName.trim());
                        return verifNewAltNames.length > 0 ? verifNewAltNames : ['Pas de nom alternatif'];
                    }
                    return ['Pas de nom alternatif'];
                });

                if (lstAltNames.some((altName) => bannedGenres.includes(altName))) {
                    await newPage.close();
                    return;
                }

                const lstGenre: Array<string> = await newPage.evaluate(() => {
                    const tempGenreCase1: string = document.querySelector("table.variations-tableInfo tr:last-child td.table-value")?.textContent as string;
                    let genres: Array<string> = [];
                    let separator;
                    genres?.includes(",") ? separator = "," : separator = " - ";
                    if (tempGenreCase1 === undefined) {
                        const tempGenreCase2 = document.querySelector("ul.manga-info-text li:nth-child(7)");
                        if (tempGenreCase2 !== null) {
                            for (let i = 0; i < tempGenreCase2.children.length; ++i) {
                                genres.push(tempGenreCase2.children[i].textContent as string)
                            }
                        }
                    } else {
                        genres = tempGenreCase1?.replace(/\n/g, "").split(separator) as Array<string>;
                    }
                    return genres;
                });
                const status: string = await newPage.evaluate(() => {
                    let statusName: string = document.querySelector("table.variations-tableInfo tr:nth-child(3) td.table-value")?.textContent as string;
                    const allowedStatuses = ["Completed", "Ongoing"];
                    if (statusName !== undefined) {
                        if (!allowedStatuses.includes(statusName)) {
                            statusName = document.querySelector("table.variations-tableInfo tr:nth-child(2) td.table-value")?.textContent as string;
                        }
                    } else {
                        statusName = document.querySelector("div.manga-info-top ul.manga-info-text li:nth-child(3)")?.textContent?.split(":")[1].trim() as string;
                    }
                    return statusName;
                });

                const rating: number | null = await newPage.evaluate(() => {
                    let tempRating: number = document.querySelector("#rate_row_cmd > em > em:nth-child(2) > em > em:nth-child(1)")?.textContent as unknown as number;
                    if (tempRating === undefined) {
                        tempRating = document.querySelector("#rate_row > input")?.getAttribute("value") as unknown as number;
                    }
                    return tempRating;
                });

                const datUpdate: string = await newPage.evaluate(() => {
                    let tempDatUpdate: string = document.querySelector("div.story-info-right div.story-info-right-extent p:nth-child(1) span.stre-value")?.textContent as string;
                    if (tempDatUpdate === undefined) {
                        tempDatUpdate = document.querySelector("div.manga-info-top ul.manga-info-text li:nth-child(4)")?.textContent?.replace("Last updated : ", "") as string;
                    }
                    tempDatUpdate = tempDatUpdate.replace("- ", "");
                    // Prepare the string to be converted to a date with the french timezone
                    return tempDatUpdate.substring(0, tempDatUpdate.length-2) + "UTC+7";
                });

                const description: string | undefined = await newPage.evaluate(() => {
                    let description = document.getElementById("panel-story-info-description")?.textContent?.replace("Description :\n", "");
                    if (description === undefined) {
                        description = document.querySelector("#noidungm")?.textContent as string;
                        if (description === undefined) {
                            return "Pas de description";
                        }
                    }
                    return description.replace(/\n/g, "");
                });

                const nbViews: number = await newPage.evaluate(() => {
                    let tempNbViews: number = document.querySelector("div.story-info-right div.story-info-right-extent p:nth-child(2) span.stre-value")?.textContent as unknown as number
                    if (tempNbViews === undefined) {
                        tempNbViews = document.querySelector("div.manga-info-top ul.manga-info-text li:nth-child(6)")?.textContent as unknown as number;
                    }
                    return tempNbViews;
                });

                const manwhaPicUrl: string = await newPage.evaluate(() => {
                    return document.querySelector("div.panel-story-info div.story-info-left span.info-image img")?.getAttribute("src") as string ?? document.querySelector("div.leftCol > div.manga-info-top > div.manga-info-pic > img")?.getAttribute("src") as string;
                });
                await newPage.close();
                return {name: h1, genres: lstGenre, status: status, lstAltNames: lstAltNames, rating: rating, link: link, datUpdate: datUpdate, description: description, nbViews: nbViews, manwhaPicUrl: manwhaPicUrl};
            });
            manwhas = manwhas.concat(await Promise.all(promises)).filter((manwha) => manwha !== undefined);
        }
        manwhas.forEach((manwha) => {
            if (typeof manwha.datUpdate === "string") {
                manwha.datUpdate = new Date(manwha.datUpdate)
            }
        });
        nbPageSelect += 1;
        lstManwhas = lstManwhas.concat(manwhas)
    } while (nbPageSelect < 1);


    await browser.close();
    return lstManwhas;
}
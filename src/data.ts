import * as puppeteer from 'puppeteer';

export async function getManwhasData() {
    let nbPageSelect = 1;
    const browser = await puppeteer.launch({headless: false})
    const page = await browser.newPage();
    /*
    let nbPageSelect: string = document.querySelector("div.leftCol.listCol div div.panel_page_number div.group_page a.page_blue.page_last")?.textContent;
    nbPageSelect = nbPageSelect.substring(5, nbPageSelect.length-1);
     */
    let lstManwhas: Array<{name: string, genres: string[], status: string, lstAltNames: string[], rating: number, link: string, datUpdate: string | Date, description: string, nbViews: string, manwhaPicUrl: string, lstChapters: Array<{ name: string, number: number, url: string, datUpload: string | Date }>}> = [];
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
        let manwhas: Array<{name: string, genres: string[], status: string, lstAltNames: string[], rating: number, link: string, datUpdate: string | Date, description: string, nbViews: string, manwhaPicUrl: string, lstChapters: Array<{ name: string, number: number, url: string, datUpload: string | Date }>}> = [];
        const MAX_PAGE_TO_LOAD = 5;
        const bannedGenres: Array<string> = ["Yaoi", "Shounen ai", "Yuri"];
        for (let i = 0; i < links.length; i += MAX_PAGE_TO_LOAD) {
            const linksChunk: Array<string> = links.slice(i, i + MAX_PAGE_TO_LOAD);
            const promises = linksChunk.map(async (link) => {
                const newPage = await browser.newPage();

                await newPage.goto(link,{timeout: 0});
                const name: string = await newPage.evaluate(() => {
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


                const genres: Array<string> = await newPage.evaluate(() => {
                    const tempGenreCase1: string = document.querySelector("table.variations-tableInfo tr:last-child td.table-value")?.textContent as string;
                    let lstGenres: Array<string> = [];
                    let separator;
                    lstGenres?.includes(",") ? separator = "," : separator = " - ";
                    if (tempGenreCase1 === undefined) {
                        const tempGenreCase2 = document.querySelector("ul.manga-info-text li:nth-child(7)");
                        if (tempGenreCase2 !== null) {
                            for (let i = 0; i < tempGenreCase2.children.length; ++i) {
                                lstGenres.push(tempGenreCase2.children[i].textContent as string)
                            }
                        }
                    } else {
                        lstGenres = tempGenreCase1?.replace(/\n/g, "").split(separator) as Array<string>;
                    }
                    return lstGenres;
                });

                if (genres.some((genre) => bannedGenres.includes(genre))) {
                    await newPage.close();
                    return;
                }

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
                    return tempDatUpdate.substring(0, tempDatUpdate.length-2);
                });

                const lstChapters: Array<{ name: string, number: number, url: string, datUpload: string | Date }> = await newPage.evaluate(() =>
                    {
                        const newLst: Array<{ name: string, number: number, url: string, datUpload: string }> = [];
                        const getNumber = (title: string) => {
                            let testedChar = "";
                            let finalNumber = "";
                            do {
                                testedChar = title.charAt(title.length-1);
                                if (testedChar === ".") {
                                    finalNumber = testedChar + finalNumber;
                                    title = title.substring(0, title.length-1);
                                    testedChar = title.charAt(title.length-1);
                                }
                                if (!isNaN(parseFloat(testedChar))) {
                                    finalNumber = testedChar + finalNumber;
                                    title = title.substring(0, title.length-1);
                                }
                            } while (!isNaN(parseFloat(testedChar)));

                            return parseFloat(finalNumber);
                        }

                        const getDate = (date: string): Date => {
                            const finalDate: Date = new Date(date);
                            finalDate.setHours(finalDate.getHours()-7)
                            return finalDate;
                        }

                        const chapters = document.querySelectorAll("div.container-main-left div.panel-story-chapter-list ul.row-content-chapter li.a-h, #chapter div div.chapter-list div.row");

                        if (chapters.length !== 0) {
                            chapters?.forEach((chapter) => {
                                const urlElement: HTMLLinkElement | HTMLAnchorElement = chapter.querySelector("a") ?? chapter.querySelector("span a") as HTMLLinkElement;
                                const url: string = urlElement.href;
                                try {
                                    const titleElement: HTMLElement = chapter.querySelector("a") ?? chapter.querySelector("span a") as HTMLElement;
                                    const title: string = titleElement.title;
                                    let name: string;
                                    let number: number | string;
                                    if (title.includes('Chapter')) {
                                        name = title.split('Chapter')[0].trim();
                                        number = title.split('Chapter')[1].trim()
                                        if (number.includes(':')) {
                                            number = number.split(':')[0].trim()
                                        }
                                        if (name.includes('chapter')) {
                                            name = name.split('chapter')[0].trim();
                                        }
                                    } else if (title.includes('chapter')) {
                                        name = title.split('chapter')[0].trim();
                                        number = title.split('chapter')[1].trim()
                                        if (number.includes(':')) {
                                            number = number.split(':')[0].trim()
                                        }
                                    }
                                    const datUpload: string = (chapter.querySelector("span.chapter-time.text-nowrap") as HTMLElement).title;

                                    if (typeof number === "string") {
                                        number = parseFloat(number);
                                    }

                                    if (number !== null || name !== null) {
                                        newLst.push({name, number, url, datUpload});
                                    }
                                } catch (error) {
                                    console.log(error);
                                }
                            });
                        }
                        return newLst;
                    }
                )

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

                const nbViews: string = await newPage.evaluate(() => {
                    let tempNbViews: string = document.querySelector("div.story-info-right div.story-info-right-extent p:nth-child(2) span.stre-value")?.textContent as string
                    if (tempNbViews === undefined) {
                        tempNbViews = document.querySelector("div.manga-info-top ul.manga-info-text li:nth-child(6)")?.textContent as string;
                        tempNbViews = tempNbViews.substring(7, tempNbViews.length).replace(",", ".");
                    }
                    return tempNbViews;
                });

                const manwhaPicUrl: string = await newPage.evaluate(() => {
                    return document.querySelector("div.panel-story-info div.story-info-left span.info-image img")?.getAttribute("src") as string ?? document.querySelector("div.leftCol > div.manga-info-top > div.manga-info-pic > img")?.getAttribute("src") as string;
                });

                await newPage.close();

                return {name, genres, status, lstAltNames, rating, link, datUpdate, description, nbViews, manwhaPicUrl, lstChapters};
            });
            manwhas = manwhas.concat(await Promise.all(promises)).filter((manwha) => manwha !== undefined);
        }
        manwhas.forEach((manwha) => {
            if (typeof manwha.datUpdate === "string") {
                manwha.datUpdate = new Date(manwha.datUpdate);
                manwha.datUpdate.setHours(manwha.datUpdate.getHours()-7);
            }
            manwha.lstChapters.forEach((chapter) => {
                chapter.datUpload = new Date(manwha.datUpdate);
                chapter.datUpload.setHours(chapter.datUpload.getHours()-7);
            })
        });
        nbPageSelect += 1;
        lstManwhas = lstManwhas.concat(manwhas);
    } while (nbPageSelect < 3);


    await browser.close();
    return lstManwhas;
}
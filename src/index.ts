import {getManwhasData} from "./data";
import {dbConnexion} from "../DBConnexion";

dbConnexion.connect()
    .then(async () =>
        {
            const allManwhas = await dbConnexion.query(`SELECT "name" FROM "startedManwha"`);
            const alreadyInsertedManwhas = await dbConnexion.query(`SELECT "name" FROM "Manwha"`);
            const lstManwhaNames: Array<string> = [];
            allManwhas.rows.forEach(manwha => {
                lstManwhaNames.push(manwha.name.toLowerCase());
            });
            const lstAlreadyInsertedManwhaNames: Array<string> = [];
            alreadyInsertedManwhas.rows.forEach(manwha => {
                lstAlreadyInsertedManwhaNames.push(manwha.name.toLowerCase());
            });

            getManwhasData().then(async (lstManwhas) => {
                    for (const manwha of lstManwhas) {
                        if (lstManwhaNames.includes(manwha.name.toLowerCase())) {
                            if (!lstAlreadyInsertedManwhaNames.includes(manwha.name.toLowerCase())) {
                                await dbConnexion.query(`
                                    INSERT INTO "Manwha" ("name", "datUpdate", "rating", "url", "manwhaPic", "genres", "nbViews", "description", "status", "lstAltName") 
                                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                                    [manwha.name, manwha.datUpdate, manwha.rating, manwha.link, manwha.manwhaPicUrl, manwha.genres, manwha.nbViews, manwha.description, manwha.status, manwha.lstAltNames]
                                );
                                console.log(`Le manwha "${manwha.name}" a été inséré dans la base de donnée`);
                            }
                            const idMan = (await dbConnexion.query(`SELECT "idMan" from "Manwha" WHERE "name"=$1`, [manwha.name])).rows[0].idMan;
                            const nbChaptersAlreadyRead = (await dbConnexion.query(`SELECT "numLastChap" FROM "startedManwha" WHERE lower(name)=$1`, [manwha.name.toLowerCase()])).rows[0].numLastChap;
                            try {
                                for (const chapter of manwha.lstChapters) {
                                    console.log(chapter.number);
                                    console.log(nbChaptersAlreadyRead);
                                    if (chapter.number >= nbChaptersAlreadyRead) {
                                        console.log("coucou")
                                        await dbConnexion.query(`
                                            INSERT INTO "Chapter" ("name", "number", "url", "datUpload", "idMan")
                                            VALUES ($1, $2, $3, $4, $5)`,
                                            [chapter.name, chapter.number, chapter.url, chapter.datUpload, idMan]
                                        );
                                    }
                                }
                                console.log(`Les chapitres du manwha ${manwha.name} ont été insérés avec succès !`)
                            } catch (error) {
                                console.log("Echec de l'insertion des chapitres :", error)
                            }
                        }
                    }
                }
            );
        }
);



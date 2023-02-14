import {getData} from "./data";
import {dbConnexion} from "../DBConnexion";

dbConnexion.connect()
    .then(async () =>
        {
            const allManwhas = await dbConnexion.query(`SELECT "name" FROM "startedManwha"`);
            const lstManwhaNames: Array<string> = [];
            allManwhas.rows.forEach(manwha => {
                lstManwhaNames.push(manwha.name.toLowerCase());
            })

            getData().then((lstManwhas) =>
                lstManwhas.forEach(async manwha => {
                    if (lstManwhaNames.includes(manwha.name.toLowerCase())) {
                        await dbConnexion.query(`
                        INSERT INTO "Manwha" ("name", "datUpdate", "rating", "url", "manwhaPic", "genres", "nbViews", "description", "status", "lstAltName") 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [manwha.name, manwha.datUpdate, manwha.rating, manwha.link, manwha.manwhaPicUrl, manwha.genres, manwha.nbViews, manwha.description, manwha.status, manwha.lstAltNames]
                        );
                        console.log(`Le manwha "${manwha.name}" a été inséré dans la base de donnée`);
                    }
                })
            );
        }
);



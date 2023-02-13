import {getData} from "./data";
import {dbConnexion} from "../DBConnexion";

dbConnexion.connect()
    .then(async () =>
        {
            const allManwhas = await dbConnexion.query(`SELECT "name" FROM "startedManwha"`);
            const lstManwhaNames: Array<string> = [];
            allManwhas.rows.forEach(manwha => {
                lstManwhaNames.push(manwha.name);
            })

            getData().then((lstManwhas) =>
                lstManwhas.forEach(manwha => {
                    if (lstManwhaNames.includes(manwha.name)) {
                        console.log(manwha);
                    }
                })
            );
        }
);



import {Client} from "pg";
import * as dotenv from 'dotenv';
dotenv.config();

export const dbConnexion = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: process.env.DB_PASSWORD,
    database: "ScrappingDB"
});
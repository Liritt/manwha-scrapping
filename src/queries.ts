import { dbConnexion } from '../DBConnexion';

dbConnexion.connect();

const triggerInsertStartedManwha = `
    CREATE OR REPLACE FUNCTION insert_idMan()
    RETURNS TRIGGER AS $$
    DECLARE
    BEGIN
      NEW."idStartMan" = (SELECT COUNT(*) FROM "startedManwha")+1;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    CREATE OR REPLACE TRIGGER insert_idMan
    BEFORE INSERT ON "startedManwha"
    FOR EACH ROW
    EXECUTE FUNCTION insert_idMan();
`;

dbConnexion.query(triggerInsertStartedManwha, (err, res) => {
    console.log(err ? err.stack : 'Trigger created successfully');
});

const triggerDeleteStartedManwha = `
    CREATE OR REPLACE FUNCTION update_trigger_on_delete()
    RETURNS TRIGGER AS $$
    DECLARE
      current_max INTEGER;
    BEGIN
    SELECT max("idStartMan") INTO current_max FROM "startedManwha";
    IF OLD."idStartMan" < current_max THEN
      UPDATE "startedManwha" SET "idStartMan" = "idStartMan" - 1 WHERE "idStartMan" > OLD."idStartMan";
    END IF;
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
    
    CREATE OR REPLACE TRIGGER update_trigger_on_delete
    AFTER DELETE ON "startedManwha"
    FOR EACH ROW
    EXECUTE FUNCTION update_trigger_on_delete();
`;

dbConnexion.query(triggerDeleteStartedManwha, (err, res) => {
    console.log(err ? err.stack : 'Trigger created successfully');
    dbConnexion.end();
});
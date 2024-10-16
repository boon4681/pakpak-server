const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const filepath = "./src/sensorData.db";

function createDbConnection() {
    //check if has table
    if (fs.existsSync(filepath)) {
        return new sqlite3.Database(filepath);
    } else {
        const db = new sqlite3.Database(filepath, (error) => {
            if (error) {
                return console.error(error.message);
            }
        });

        createTable(db);

        console.log("Connection with SQLite has been established");
        return db;
    }
}

// @ts-ignore
function createTable(db) {
    db.exec(`
CREATE TABLE sensorData (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Hm INTEGER NOT NULL,
    DHm INTEGER NOT NULL,
    Lm INTEGER NOT NULL,
    temp INTEGER NOT NULL,
    dateTime VARCHAR(50) NOT NULL
  );
  `);
}

module.exports = createDbConnection();
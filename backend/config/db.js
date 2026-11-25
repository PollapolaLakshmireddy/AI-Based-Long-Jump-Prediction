const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "long_jump_ai",
    password: "Reddy@2005",
    port: 5432
});

pool.connect()
    .then(client => {

        console.log("========================================");
        console.log("POSTGRESQL CONNECTED");
        console.log("Database: long_jump_ai");
        console.log("========================================");

        client.release();

    })
    .catch(error => {

        console.error("POSTGRESQL CONNECTION FAILED");
        console.error(error.message);

    });

module.exports = pool;
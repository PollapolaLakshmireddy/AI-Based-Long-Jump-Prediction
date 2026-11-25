const { Pool } = require("pg");
require("dotenv").config();


// ============================================================
// DATABASE CONNECTION
// ============================================================

const pool = new Pool({

    user:
        process.env.DB_USER || "postgres",

    host:
        process.env.DB_HOST || "localhost",

    database:
        process.env.DB_NAME || "long_jump_ai",

    password:
        process.env.DB_PASSWORD || "postgres",

    port:
        Number(process.env.DB_PORT) || 5432

});


// ============================================================
// CONNECTION TEST
// ============================================================

pool.on(
    "connect",
    () => {

        console.log(
            "PostgreSQL database connected"
        );

    }
);


pool.on(
    "error",
    (error) => {

        console.error(
            "PostgreSQL error:",
            error
        );

    }
);


module.exports = pool;
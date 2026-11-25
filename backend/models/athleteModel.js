const pool = require("../config/db");

// ========================================
// GET ALL ATHLETES
// ========================================

const getAllAthletes = async () => {
    const result = await pool.query(`
        SELECT *
        FROM athletes
        ORDER BY created_at DESC
    `);

    return result.rows;
};


// ========================================
// GET ATHLETE BY ID
// ========================================

const getAthleteById = async (id) => {
    const result = await pool.query(
        `
        SELECT *
        FROM athletes
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0];
};


// ========================================
// CREATE ATHLETE
// ========================================

const createAthlete = async (athlete) => {

    const {
        name,
        age,
        gender,
        height,
        weight
    } = athlete;

    const result = await pool.query(
        `
        INSERT INTO athletes (
            name,
            age,
            gender,
            height_cm,
            weight_kg
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
            name,
            age,
            gender,
            height,
            weight
        ]
    );

    return result.rows[0];
};


// ========================================
// UPDATE ATHLETE
// ========================================

const updateAthlete = async (id, athlete) => {

    const {
        name,
        age,
        gender,
        height,
        weight
    } = athlete;

    const result = await pool.query(
        `
        UPDATE athletes
        SET
            name = $1,
            age = $2,
            gender = $3,
            height_cm = $4,
            weight_kg = $5
        WHERE id = $6
        RETURNING *
        `,
        [
            name,
            age,
            gender,
            height,
            weight,
            id
        ]
    );

    return result.rows[0];
};


// ========================================
// DELETE ATHLETE
// ========================================

const deleteAthlete = async (id) => {

    const result = await pool.query(
        `
        DELETE FROM athletes
        WHERE id = $1
        RETURNING *
        `,
        [id]
    );

    return result.rows[0];
};


// ========================================
// EXPORT
// ========================================

module.exports = {
    getAllAthletes,
    getAthleteById,
    createAthlete,
    updateAthlete,
    deleteAthlete
};
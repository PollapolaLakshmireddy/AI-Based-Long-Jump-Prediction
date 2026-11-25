const pool = require("../config/db");


// ============================================================
// SAVE ANALYSIS RESULT
// ============================================================

const saveResult = async (req, res) => {

    const client = await pool.connect();

    try {

        const {
            name,
            age,
            gender,
            height_cm,
            weight_kg,

            sprint_speed,
            vertical_jump,
            standing_long_jump,
            takeoff_speed,

            takeoff_angle,
            jump_distance,

            flight_time,
            takeoff_knee_angle,
            takeoff_hip_angle,
            takeoff_ankle_angle,
            landing_stability,
            pose_confidence,
            analysis_quality,
            runup_time,

            predicted_distance,
            talent_level,
            confidence
        } = req.body;


        // ====================================================
        // VALIDATION
        // ====================================================

        if (!name || name.trim() === "") {

            return res.status(400).json({
                success: false,
                message: "Athlete name is required"
            });

        }


        // ====================================================
        // START TRANSACTION
        // ====================================================

        await client.query("BEGIN");


        // ====================================================
        // CREATE ATHLETE
        // ====================================================

        const athleteResult = await client.query(
            `
            INSERT INTO athletes
            (
                name,
                age,
                gender,
                height_cm,
                weight_kg
            )
            VALUES
            ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [
                name.trim(),
                age || null,
                gender || null,
                height_cm || null,
                weight_kg || null
            ]
        );

        const athlete = athleteResult.rows[0];


        // ====================================================
        // SAVE PERFORMANCE
        // ====================================================

        const performanceResult = await client.query(
            `
            INSERT INTO performance
            (
                athlete_id,

                sprint_speed,
                vertical_jump,
                standing_long_jump,
                takeoff_speed,

                takeoff_angle,
                jump_distance,

                flight_time,
                takeoff_knee_angle,
                takeoff_hip_angle,
                takeoff_ankle_angle,

                landing_stability,
                pose_confidence,
                analysis_quality,

                runup_time
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,

                $6,
                $7,

                $8,
                $9,
                $10,
                $11,

                $12,
                $13,
                $14,

                $15
            )
            RETURNING *
            `,
            [
                athlete.id,

                sprint_speed || null,
                vertical_jump || null,
                standing_long_jump || null,
                takeoff_speed || null,

                takeoff_angle || null,
                jump_distance || null,

                flight_time || null,
                takeoff_knee_angle || null,
                takeoff_hip_angle || null,
                takeoff_ankle_angle || null,

                landing_stability || null,
                pose_confidence || null,
                analysis_quality || null,

                runup_time || null
            ]
        );


        // ====================================================
        // SAVE PREDICTION
        // ====================================================

        const predictionResult = await client.query(
            `
            INSERT INTO predictions
            (
                athlete_id,
                predicted_distance,
                talent_level,
                confidence
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4
            )
            RETURNING *
            `,
            [
                athlete.id,
                predicted_distance || null,
                talent_level || null,
                confidence || null
            ]
        );


        // ====================================================
        // COMMIT
        // ====================================================

        await client.query("COMMIT");


        // ====================================================
        // RESPONSE
        // ====================================================

        return res.status(201).json({

            success: true,

            message:
                "Analysis result saved successfully",

            athlete:
                athlete,

            performance:
                performanceResult.rows[0],

            prediction:
                predictionResult.rows[0]

        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Save result error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to save analysis result",

            error:
                error.message

        });

    } finally {

        client.release();

    }
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    saveResult
};
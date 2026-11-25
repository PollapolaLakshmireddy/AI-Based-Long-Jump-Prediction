import os
import sys
import json
import traceback
import joblib
import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_DIR = os.path.join(BASE_DIR, "models")

DISTANCE_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "distance_model.pkl"
)

PERFORMANCE_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "performance_model.pkl"
)


# ============================================================
# JSON OUTPUT
# ============================================================

def output_json(data):
    print(json.dumps(data, ensure_ascii=False))
    sys.stdout.flush()


# ============================================================
# LOAD MODELS
# ============================================================

def load_models():

    if not os.path.exists(DISTANCE_MODEL_PATH):
        raise FileNotFoundError(
            "Distance model not found: "
            + DISTANCE_MODEL_PATH
        )

    if not os.path.exists(PERFORMANCE_MODEL_PATH):
        raise FileNotFoundError(
            "Performance model not found: "
            + PERFORMANCE_MODEL_PATH
        )

    print(
        "Loading distance model...",
        file=sys.stderr
    )

    distance_model = joblib.load(
        DISTANCE_MODEL_PATH
    )

    print(
        "Loading performance model...",
        file=sys.stderr
    )

    performance_model = joblib.load(
        PERFORMANCE_MODEL_PATH
    )

    return distance_model, performance_model


# ============================================================
# GET FEATURES
# ============================================================

def get_model_features(model):

    # Direct model
    if hasattr(model, "feature_names_in_"):
        return list(model.feature_names_in_)

    # Pipeline
    if hasattr(model, "named_steps"):

        for name, step in model.named_steps.items():

            if hasattr(step, "feature_names_in_"):
                return list(step.feature_names_in_)

    return None


# ============================================================
# PREPARE DATA
# ============================================================

# ============================================================
# NORMALIZE INPUT WITH INTELLIGENT DEFAULTS
# ============================================================

def normalize_input(data):
    if not isinstance(data, dict):
        data = {}
    normalized = {}

    # Age
    try:
        normalized["Age"] = float(data.get("Age") or data.get("age") or 20)
    except Exception:
        normalized["Age"] = 20.0

    # Gender
    g = str(data.get("Gender") or data.get("gender") or "Male").strip().capitalize()
    normalized["Gender"] = g if g in ["Male", "Female"] else "Male"

    # Height & Weight
    try:
        h = float(data.get("Height_cm") or data.get("height") or data.get("Height") or 178.0)
    except Exception:
        h = 178.0
    try:
        w = float(data.get("Weight_kg") or data.get("weight") or data.get("Weight") or 72.0)
    except Exception:
        w = 72.0
    normalized["Height_cm"] = h
    normalized["Weight_kg"] = w

    # BMI
    bmi = data.get("BMI") or data.get("bmi")
    try:
        if bmi is not None and float(bmi) > 0:
            normalized["BMI"] = float(bmi)
        else:
            normalized["BMI"] = round(w / ((h / 100.0) ** 2), 2) if h > 0 else 22.7
    except Exception:
        normalized["BMI"] = 22.7

    # Skill_Level
    sk = str(data.get("Skill_Level") or data.get("skillLevel") or data.get("skill_level") or "Intermediate").strip().capitalize()
    normalized["Skill_Level"] = sk if sk in ["Beginner", "Intermediate", "Advanced", "Elite"] else "Intermediate"

    # Sprint_Speed_mps
    try:
        normalized["Sprint_Speed_mps"] = float(data.get("Sprint_Speed_mps") or data.get("sprintSpeed") or data.get("sprint_speed") or data.get("sprint") or 8.5)
    except Exception:
        normalized["Sprint_Speed_mps"] = 8.5

    # Reaction_Time_sec
    try:
        normalized["Reaction_Time_sec"] = float(data.get("Reaction_Time_sec") or data.get("reactionTime") or data.get("reaction_time") or 0.18)
    except Exception:
        normalized["Reaction_Time_sec"] = 0.18

    # Flexibility_Score
    try:
        normalized["Flexibility_Score"] = float(data.get("Flexibility_Score") or data.get("flexibility") or data.get("flexibilityScore") or 70.0)
    except Exception:
        normalized["Flexibility_Score"] = 70.0

    # Leg_Strength_Score
    try:
        leg = data.get("Leg_Strength_Score") or data.get("legStrength") or data.get("leg_strength")
        if leg is not None and float(leg) > 0:
            normalized["Leg_Strength_Score"] = float(leg)
        elif data.get("verticalJump"):
            normalized["Leg_Strength_Score"] = min(100.0, float(data["verticalJump"]) * 1.3)
        else:
            normalized["Leg_Strength_Score"] = 75.0
    except Exception:
        normalized["Leg_Strength_Score"] = 75.0

    # Balance_Score
    try:
        normalized["Balance_Score"] = float(data.get("Balance_Score") or data.get("balance") or data.get("balanceScore") or 75.0)
    except Exception:
        normalized["Balance_Score"] = 75.0

    # Endurance_Score
    try:
        normalized["Endurance_Score"] = float(data.get("Endurance_Score") or data.get("endurance") or data.get("enduranceScore") or 70.0)
    except Exception:
        normalized["Endurance_Score"] = 70.0

    # Runup_Distance_m
    try:
        normalized["Runup_Distance_m"] = float(data.get("Runup_Distance_m") or data.get("runupDistance") or data.get("runup_distance") or data.get("runUpSpeed") or 30.0)
    except Exception:
        normalized["Runup_Distance_m"] = 30.0

    # Runup_Style
    rs = str(data.get("Runup_Style") or data.get("runupStyle") or data.get("runup_style") or "Progressive").strip().capitalize()
    if rs == "Normal":
        rs = "Controlled"
    elif rs == "Fast":
        rs = "Progressive"
    normalized["Runup_Style"] = rs if rs in ["Controlled", "Progressive", "Aggressive"] else "Progressive"

    # Takeoff_Foot
    tf = str(data.get("Takeoff_Foot") or data.get("takeoffFoot") or data.get("takeoff_foot") or "Right").strip().capitalize()
    normalized["Takeoff_Foot"] = tf if tf in ["Left", "Right"] else "Right"

    # Takeoff_Angle_deg
    try:
        normalized["Takeoff_Angle_deg"] = float(data.get("Takeoff_Angle_deg") or data.get("takeoffAngle") or data.get("takeoff_angle") or 20.0)
    except Exception:
        normalized["Takeoff_Angle_deg"] = 20.0

    # Training_Hours_Per_Week
    try:
        normalized["Training_Hours_Per_Week"] = float(data.get("Training_Hours_Per_Week") or data.get("trainingHours") or data.get("training_hours") or 10.0)
    except Exception:
        normalized["Training_Hours_Per_Week"] = 10.0

    # Previous_Injuries
    pi = str(data.get("Previous_Injuries") or data.get("previousInjuries") or data.get("previous_injuries") or "None").strip().capitalize()
    if pi in ["No", "None", "False", "0"]:
        pi = "None"
    elif pi in ["Yes", "True", "1"]:
        pi = "Minor"
    normalized["Previous_Injuries"] = pi if pi in ["None", "Minor", "Moderate", "Major"] else "None"

    # Coach_Rating
    try:
        normalized["Coach_Rating"] = float(data.get("Coach_Rating") or data.get("coachRating") or data.get("coach_rating") or 7.5)
    except Exception:
        normalized["Coach_Rating"] = 7.5

    return normalized


def generate_suggestions(data, predicted_distance, performance_label):
    suggestions = []

    # Takeoff Angle
    angle = float(data.get("Takeoff_Angle_deg", 20.0))
    if angle < 18.0:
        suggestions.append({
            "aspect": "Takeoff Angle",
            "status": "Needs Work",
            "current_value": f"{angle:.1f}°",
            "optimal_range": "18.0° - 23.0°",
            "tip": "Takeoff angle is too flat (< 18°). Lower hips on penultimate stride to produce vertical impulse off the board."
        })
    elif angle > 23.0:
        suggestions.append({
            "aspect": "Takeoff Angle",
            "status": "Needs Work",
            "current_value": f"{angle:.1f}°",
            "optimal_range": "18.0° - 23.0°",
            "tip": "Takeoff angle is too steep (> 23°). Maintain horizontal sprint momentum through the board instead of jumping upward."
        })
    else:
        suggestions.append({
            "aspect": "Takeoff Angle",
            "status": "Optimal",
            "current_value": f"{angle:.1f}°",
            "optimal_range": "18.0° - 23.0°",
            "tip": "Optimal takeoff angle! Perfect balance between vertical launch impulse and horizontal momentum retention."
        })

    # Sprint Speed
    speed = float(data.get("Sprint_Speed_mps", 8.5))
    if speed < 8.0:
        suggestions.append({
            "aspect": "Approach Runway Speed",
            "status": "Needs Work",
            "current_value": f"{speed:.2f} m/s",
            "optimal_range": "> 9.0 m/s",
            "tip": "Approach velocity is below competitive standards. Use 30m flying sprints and resisted sled drills to build runway speed."
        })
    elif speed < 9.2:
        suggestions.append({
            "aspect": "Approach Runway Speed",
            "status": "Good",
            "current_value": f"{speed:.2f} m/s",
            "optimal_range": "> 9.2 m/s",
            "tip": "Solid runway velocity. Focus on rhythm consistency and converting top speed into the final 3 strides."
        })
    else:
        suggestions.append({
            "aspect": "Approach Runway Speed",
            "status": "Optimal",
            "current_value": f"{speed:.2f} m/s",
            "optimal_range": "9.2 - 10.5 m/s",
            "tip": "Elite sprint speed detected! Maintain posture and board accuracy so you do not decelerate before the board."
        })

    # Leg Strength
    strength = float(data.get("Leg_Strength_Score", 75.0))
    if strength < 70.0:
        suggestions.append({
            "aspect": "Lower Body Explosive Power",
            "status": "Needs Work",
            "current_value": f"{strength:.1f}/100",
            "optimal_range": "80 - 100",
            "tip": "Lower leg strength and ground stiffness need enhancement. Perform box depth jumps, single-leg hops, and compound squats."
        })
    elif strength < 85.0:
        suggestions.append({
            "aspect": "Lower Body Explosive Power",
            "status": "Good",
            "current_value": f"{strength:.1f}/100",
            "optimal_range": "80 - 100",
            "tip": "Good explosive base. Add reactive hurdle bounces to minimize ground contact time at takeoff."
        })
    else:
        suggestions.append({
            "aspect": "Lower Body Explosive Power",
            "status": "Optimal",
            "current_value": f"{strength:.1f}/100",
            "optimal_range": "85 - 100",
            "tip": "Outstanding leg strength! Excellent explosive force capacity off the board."
        })

    # Flexibility
    flex = float(data.get("Flexibility_Score", 70.0))
    if flex < 70.0:
        suggestions.append({
            "aspect": "Flexibility & Mobility",
            "status": "Needs Work",
            "current_value": f"{flex:.1f}/100",
            "optimal_range": "75 - 100",
            "tip": "Hamstring and hip tightness limits flight extension. Dedicate 15 mins daily to dynamic hip mobility and pike stretching."
        })

    return suggestions


# ============================================================
# PREPARE DATA
# ============================================================

def prepare_data(data, model):
    normalized = normalize_input(data)
    athlete = pd.DataFrame([normalized])

    model_features = get_model_features(model)
    if model_features is not None:
        athlete = athlete[model_features]

    return athlete


# ============================================================
# GET CLASSES
# ============================================================

def get_classes(model):

    # Direct classifier
    if hasattr(model, "classes_"):
        return list(model.classes_)

    # Pipeline
    if hasattr(model, "named_steps"):

        if "model" in model.named_steps:

            classifier = model.named_steps["model"]

            if hasattr(classifier, "classes_"):
                return list(classifier.classes_)

        for name, step in model.named_steps.items():

            if hasattr(step, "classes_"):
                return list(step.classes_)

    return []


# ============================================================
# PREDICT ATHLETE
# ============================================================

def predict_athlete(
    data,
    distance_model,
    performance_model
):

    # --------------------------------------------------------
    # DISTANCE
    # --------------------------------------------------------

    print(
        "Preparing distance data...",
        file=sys.stderr
    )

    distance_data = prepare_data(
        data,
        distance_model
    )

    print(
        "Running distance prediction...",
        file=sys.stderr
    )

    predicted_distance = distance_model.predict(
        distance_data
    )[0]

    print(
        "Distance prediction:",
        predicted_distance,
        file=sys.stderr
    )


    # --------------------------------------------------------
    # PERFORMANCE
    # --------------------------------------------------------

    print(
        "Preparing performance data...",
        file=sys.stderr
    )

    performance_data = prepare_data(
        data,
        performance_model
    )

    print(
        "Running performance prediction...",
        file=sys.stderr
    )

    performance = performance_model.predict(
        performance_data
    )[0]

    print(
        "Performance prediction:",
        performance,
        file=sys.stderr
    )


    # --------------------------------------------------------
    # PROBABILITIES
    # --------------------------------------------------------

    probability_dict = {}

    if hasattr(
        performance_model,
        "predict_proba"
    ):

        print(
            "Calculating probabilities...",
            file=sys.stderr
        )

        probabilities = performance_model.predict_proba(
            performance_data
        )[0]

        classes = get_classes(
            performance_model
        )

        for label, probability in zip(
            classes,
            probabilities
        ):

            probability_dict[str(label)] = round(
                float(probability) * 100,
                2
            )


    # --------------------------------------------------------
    # CONFIDENCE
    # --------------------------------------------------------

    if len(probability_dict) > 0:

        confidence = max(
            probability_dict.values()
        )

    else:

        confidence = None


    # --------------------------------------------------------
    # RESULT
    # --------------------------------------------------------

    norm_data = normalize_input(data)
    suggestions = generate_suggestions(norm_data, predicted_distance, performance)

    result = {

        "success": True,

        "predicted_distance": round(
            float(predicted_distance),
            2
        ),

        "predicted_distance_m": round(
            float(predicted_distance),
            2
        ),

        "performance_label": str(
            performance
        ),

        "talent_level": str(
            performance
        ),

        "confidence_percent": (
            round(
                confidence,
                2
            )
            if confidence is not None
            else None
        ),

        "class_probabilities":
            probability_dict,

        "suggestions": suggestions

    }

    return result


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    try:

        print(
            "========================================",
            file=sys.stderr
        )

        print(
            "STARTING ATHLETE PREDICTION",
            file=sys.stderr
        )

        print(
            "========================================",
            file=sys.stderr
        )


        # ----------------------------------------------------
        # CHECK INPUT
        # ----------------------------------------------------

        if len(sys.argv) < 2:

            raise ValueError(
                "No athlete JSON data received."
            )


        # ----------------------------------------------------
        # READ INPUT
        # ----------------------------------------------------

        input_json = sys.argv[1]


        print(
            "JSON input received.",
            file=sys.stderr
        )


        # ----------------------------------------------------
        # PARSE JSON
        # ----------------------------------------------------

        data = json.loads(
            input_json
        )


        if not isinstance(
            data,
            dict
        ):

            raise ValueError(
                "Input must be a JSON object."
            )


        # ----------------------------------------------------
        # LOAD MODELS
        # ----------------------------------------------------

        distance_model, performance_model = load_models()


        print(
            "Models loaded successfully.",
            file=sys.stderr
        )


        # ----------------------------------------------------
        # RUN PREDICTION
        # ----------------------------------------------------

        result = predict_athlete(
            data,
            distance_model,
            performance_model
        )


        # ----------------------------------------------------
        # RETURN JSON
        # ----------------------------------------------------

        output_json(
            result
        )


        print(
            "Prediction completed successfully.",
            file=sys.stderr
        )


    except Exception as error:

        print(
            "========================================",
            file=sys.stderr
        )

        print(
            "PREDICTION ERROR:",
            str(error),
            file=sys.stderr
        )

        print(
            "========================================",
            file=sys.stderr
        )

        traceback.print_exc(
            file=sys.stderr
        )


        output_json({

            "success": False,

            "error": str(error)

        })


        sys.exit(1)
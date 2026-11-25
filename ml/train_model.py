import os
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer

from sklearn.ensemble import (
    RandomForestRegressor,
    RandomForestClassifier
)

from sklearn.metrics import (
    mean_absolute_error,
    r2_score,
    accuracy_score,
    classification_report
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATASET_PATH = os.path.join(
    BASE_DIR,
    "dataset",
    "long_jump_dataset.csv"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)


# ============================================================
# LOAD DATASET
# ============================================================

print("\n========================================")
print("LOADING DATASET")
print("========================================")

if not os.path.exists(DATASET_PATH):

    raise FileNotFoundError(
        f"\nDataset not found:\n{DATASET_PATH}"
    )


# IMPORTANT:
# keep_default_na=False prevents the string "None"
# from automatically becoming NaN.

df = pd.read_csv(
    DATASET_PATH,
    keep_default_na=False
)


print(
    f"\nRows    : {df.shape[0]}"
)

print(
    f"Columns : {df.shape[1]}"
)


# ============================================================
# BASIC VALIDATION
# ============================================================

required_columns = [

    "Age",
    "Gender",
    "Height_cm",
    "Weight_kg",
    "BMI",
    "Skill_Level",

    "Sprint_Speed_mps",
    "Reaction_Time_sec",

    "Flexibility_Score",
    "Leg_Strength_Score",
    "Balance_Score",
    "Endurance_Score",

    "Runup_Distance_m",
    "Runup_Style",
    "Takeoff_Foot",

    "Takeoff_Angle_deg",

    "Training_Hours_Per_Week",
    "Previous_Injuries",

    "Coach_Rating",

    "Jump_Distance_m",
    "Performance_Label"

]


missing_columns = [

    column

    for column in required_columns

    if column not in df.columns

]


if missing_columns:

    print(
        "\nMissing columns:"
    )

    for column in missing_columns:

        print(
            "-",
            column
        )

    raise ValueError(
        "\nDataset structure is incorrect."
    )


# ============================================================
# TARGETS
# ============================================================

DISTANCE_TARGET = "Jump_Distance_m"

PERFORMANCE_TARGET = "Performance_Label"


# ============================================================
# FEATURES
# ============================================================
#
# IMPORTANT:
#
# We intentionally DO NOT use:
#
# Flight_Time_sec
# Airtime_sec
# Landing_Stability_Score
# Knee_Angle_deg
# Hip_Angle_deg
# Ankle_Angle_deg
#
# because these are post/during-jump measurements.
#
# This model represents PRE-JUMP TALENT PREDICTION.
#
# ============================================================

features = [

    "Age",

    "Gender",

    "Height_cm",

    "Weight_kg",

    "BMI",

    "Skill_Level",

    "Sprint_Speed_mps",

    "Reaction_Time_sec",

    "Flexibility_Score",

    "Leg_Strength_Score",

    "Balance_Score",

    "Endurance_Score",

    "Runup_Distance_m",

    "Runup_Style",

    "Takeoff_Foot",

    "Takeoff_Angle_deg",

    "Training_Hours_Per_Week",

    "Previous_Injuries",

    "Coach_Rating"

]


# ============================================================
# REMOVE IDENTITY COLUMNS
# ============================================================

# We don't use Athlete_ID or Name as ML features.

df = df.drop(

    columns=[
        "Athlete_ID",
        "Name"
    ],

    errors="ignore"

)


# ============================================================
# CLEAN TARGET VALUES
# ============================================================

df[DISTANCE_TARGET] = pd.to_numeric(

    df[DISTANCE_TARGET],

    errors="coerce"

)


# Remove rows where target is missing.

df = df.dropna(

    subset=[

        DISTANCE_TARGET,

        PERFORMANCE_TARGET

    ]

)


# ============================================================
# CLEAN CATEGORICAL VALUES
# ============================================================

categorical_columns = [

    "Gender",
    "Skill_Level",
    "Runup_Style",
    "Takeoff_Foot",
    "Previous_Injuries"

]


for column in categorical_columns:

    if column in df.columns:

        df[column] = (

            df[column]

            .astype(str)

            .str.strip()

        )


# ============================================================
# DISPLAY DATASET
# ============================================================

print(
    "\n========================================"
)

print(
    "DATASET INFORMATION"
)

print(
    "========================================"
)


print(
    f"\nTraining rows: {len(df)}"
)


print(
    "\nPerformance distribution:"
)

print(

    df[
        PERFORMANCE_TARGET
    ].value_counts()

)


# ============================================================
# CREATE X AND Y
# ============================================================

X = df[features]

y_distance = df[

    DISTANCE_TARGET

]


y_performance = df[

    PERFORMANCE_TARGET

]


# ============================================================
# DETECT NUMERIC / CATEGORICAL FEATURES
# ============================================================

numeric_features = [

    column

    for column in features

    if pd.api.types.is_numeric_dtype(

        X[column]

    )

]


categorical_features = [

    column

    for column in features

    if column not in numeric_features

]


print(
    "\n========================================"
)

print(
    "FEATURE TYPES"
)

print(
    "========================================"
)


print(
    "\nNumeric features:"
)

for column in numeric_features:

    print(
        "-",
        column
    )


print(
    "\nCategorical features:"
)

for column in categorical_features:

    print(
        "-",
        column
    )


# ============================================================
# PREPROCESSOR FUNCTION
# ============================================================

def create_preprocessor():

    numeric_pipeline = Pipeline(

        steps=[

            (

                "imputer",

                SimpleImputer(

                    strategy="median"

                )

            )

        ]

    )


    categorical_pipeline = Pipeline(

        steps=[

            (

                "imputer",

                SimpleImputer(

                    strategy="most_frequent"

                )

            ),

            (

                "encoder",

                OneHotEncoder(

                    handle_unknown="ignore"

                )

            )

        ]

    )


    preprocessor = ColumnTransformer(

        transformers=[

            (

                "numeric",

                numeric_pipeline,

                numeric_features

            ),

            (

                "categorical",

                categorical_pipeline,

                categorical_features

            )

        ]

    )


    return preprocessor


# ============================================================
# DISTANCE MODEL
# ============================================================

print(
    "\n========================================"
)

print(
    "TRAINING DISTANCE MODEL"
)

print(
    "========================================"
)


X_train_distance, X_test_distance, y_train_distance, y_test_distance = train_test_split(

    X,

    y_distance,

    test_size=0.20,

    random_state=42

)


distance_model = Pipeline(

    steps=[

        (

            "preprocessor",

            create_preprocessor()

        ),

        (

            "model",

            RandomForestRegressor(

                n_estimators=400,

                max_depth=15,

                min_samples_leaf=2,

                max_features="sqrt",

                random_state=42,

                n_jobs=-1

            )

        )

    ]

)


print(
    "\nFitting distance model..."
)


distance_model.fit(

    X_train_distance,

    y_train_distance

)


# ============================================================
# DISTANCE PREDICTION
# ============================================================

distance_predictions = (

    distance_model.predict(

        X_test_distance

    )

)


# ============================================================
# DISTANCE METRICS
# ============================================================

mae = mean_absolute_error(

    y_test_distance,

    distance_predictions

)


r2 = r2_score(

    y_test_distance,

    distance_predictions

)


print(
    "\nDistance Model Results:"
)

print(
    f"MAE : {mae:.4f} m"
)

print(
    f"R²  : {r2:.4f}"
)


# ============================================================
# SAVE DISTANCE MODEL
# ============================================================

distance_model_path = os.path.join(

    MODEL_DIR,

    "distance_model.pkl"

)


joblib.dump(

    distance_model,

    distance_model_path

)


print(
    "\nDistance model saved:"
)

print(
    distance_model_path

)


# ============================================================
# PERFORMANCE CLASSIFICATION
# ============================================================

print(
    "\n========================================"
)

print(
    "TRAINING PERFORMANCE MODEL"
)

print(
    "========================================"
)


print(
    "\nClasses:"
)

print(

    y_performance.value_counts()

)


# ============================================================
# CLASSIFICATION SPLIT
# ============================================================

X_train_performance, X_test_performance, y_train_performance, y_test_performance = train_test_split(

    X,

    y_performance,

    test_size=0.20,

    random_state=42,

    stratify=y_performance

)


# ============================================================
# CLASSIFIER
# ============================================================

performance_model = Pipeline(

    steps=[

        (

            "preprocessor",

            create_preprocessor()

        ),

        (

            "model",

            RandomForestClassifier(

                n_estimators=400,

                max_depth=15,

                min_samples_leaf=2,

                max_features="sqrt",

                class_weight="balanced",

                random_state=42,

                n_jobs=-1

            )

        )

    ]

)


print(
    "\nFitting performance model..."
)


performance_model.fit(

    X_train_performance,

    y_train_performance

)


# ============================================================
# PERFORMANCE PREDICTION
# ============================================================

performance_predictions = (

    performance_model.predict(

        X_test_performance

    )

)


# ============================================================
# CLASSIFICATION METRICS
# ============================================================

accuracy = accuracy_score(

    y_test_performance,

    performance_predictions

)


print(
    "\nPerformance Model Results:"
)

print(
    f"Accuracy : {accuracy:.4f}"
)

print(
    f"Accuracy : {accuracy * 100:.2f}%"
)


print(
    "\nClassification Report:"
)


print(

    classification_report(

        y_test_performance,

        performance_predictions,

        zero_division=0

    )

)


# ============================================================
# SAVE PERFORMANCE MODEL
# ============================================================

performance_model_path = os.path.join(

    MODEL_DIR,

    "performance_model.pkl"

)


joblib.dump(

    performance_model,

    performance_model_path

)


print(
    "\nPerformance model saved:"
)

print(
    performance_model_path

)


# ============================================================
# MODEL SUMMARY
# ============================================================

print(
    "\n========================================"
)

print(
    "MODEL TRAINING COMPLETE"
)

print(
    "========================================"
)


print(
    "\nDistance Model:"
)

print(
    f"MAE = {mae:.4f} m"
)

print(
    f"R²  = {r2:.4f}"
)


print(
    "\nPerformance Model:"
)

print(
    f"Accuracy = {accuracy * 100:.2f}%"
)


print(
    "\nCreated files:"
)

print(
    "ml/models/distance_model.pkl"
)

print(
    "ml/models/performance_model.pkl"
)


print(
    "\n========================================"
)
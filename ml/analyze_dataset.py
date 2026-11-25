import os
import pandas as pd


# ============================================================
# DATASET PATH
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATASET_PATH = os.path.join(
    BASE_DIR,
    "dataset",
    "long_jump_dataset.csv"
)


# ============================================================
# LOAD DATASET
# ============================================================

print("\n========================================")
print("LONG JUMP DATASET ANALYSIS")
print("========================================")


# Check whether dataset exists

if not os.path.exists(DATASET_PATH):

    print("\nERROR: Dataset file not found.")

    print(
        "\nExpected file:"
    )

    print(
        DATASET_PATH
    )

    print(
        "\nMake sure your file is:"
    )

    print(
        "ml/dataset/long_jump_dataset.csv"
    )

    exit()


df = pd.read_csv(
    DATASET_PATH
)


# ============================================================
# BASIC INFORMATION
# ============================================================

print("\n========================================")
print("BASIC INFORMATION")
print("========================================")


print(
    "\nDataset shape:"
)

print(
    df.shape
)


print(
    "\nNumber of rows:"
)

print(
    len(df)
)


print(
    "\nNumber of columns:"
)

print(
    len(df.columns)
)


# ============================================================
# COLUMN NAMES
# ============================================================

print("\n========================================")
print("COLUMN NAMES")
print("========================================")


for i, column in enumerate(
    df.columns,
    start=1
):

    print(
        f"{i}. {column}"
    )


# ============================================================
# DATA TYPES
# ============================================================

print("\n========================================")
print("COLUMN DATA TYPES")
print("========================================")


print(
    df.dtypes
)


# ============================================================
# MISSING VALUES
# ============================================================

print("\n========================================")
print("MISSING VALUES")
print("========================================")


missing = df.isnull().sum()


print(
    missing
)


total_missing = (
    missing.sum()
)


print(
    f"\nTotal missing values: {total_missing}"
)


# ============================================================
# DUPLICATE ROWS
# ============================================================

print("\n========================================")
print("DUPLICATE ROWS")
print("========================================")


duplicates = df.duplicated().sum()


print(
    f"Duplicate rows: {duplicates}"
)


# ============================================================
# PERFORMANCE LABEL DISTRIBUTION
# ============================================================

print("\n========================================")
print("PERFORMANCE LABEL DISTRIBUTION")
print("========================================")


if "Performance_Label" in df.columns:

    performance_counts = (

        df[
            "Performance_Label"
        ]
        .value_counts()
    )


    print(
        performance_counts
    )


    print(
        "\nPercentage:"
    )


    performance_percentage = (

        df[
            "Performance_Label"
        ]
        .value_counts(
            normalize=True
        )
        * 100

    )


    print(
        performance_percentage.round(2)
    )


# ============================================================
# JUMP DISTANCE STATISTICS
# ============================================================

print("\n========================================")
print("JUMP DISTANCE STATISTICS")
print("========================================")


if "Jump_Distance_m" in df.columns:

    print(

        df[
            "Jump_Distance_m"
        ].describe()

    )


# ============================================================
# NUMERIC FEATURES
# ============================================================

print("\n========================================")
print("NUMERIC FEATURES")
print("========================================")


numeric_df = df.select_dtypes(
    include=[
        "int64",
        "float64"
    ]
)


for column in numeric_df.columns:

    print(
        "-",
        column
    )


# ============================================================
# CATEGORICAL FEATURES
# ============================================================

print("\n========================================")
print("CATEGORICAL FEATURES")
print("========================================")


categorical_df = df.select_dtypes(
    include=[
        "object",
        "string"
    ]
)


for column in categorical_df.columns:

    print(
        "-",
        column
    )


# ============================================================
# CORRELATION WITH JUMP DISTANCE
# ============================================================

print("\n========================================")
print("CORRELATION WITH JUMP DISTANCE")
print("========================================")


if "Jump_Distance_m" in numeric_df.columns:

    correlations = (

        numeric_df
        .corr(
            numeric_only=True
        )[
            "Jump_Distance_m"
        ]
        .sort_values(
            ascending=False
        )

    )


    print(
        correlations
    )


    # --------------------------------------------------------
    # TOP POSITIVE
    # --------------------------------------------------------

    print("\n========================================")
    print("TOP POSITIVE FEATURES")
    print("========================================")


    positive = (

        correlations
        .drop(
            "Jump_Distance_m"
        )
        .sort_values(
            ascending=False
        )

    )


    print(
        positive.head(10)
    )


    # --------------------------------------------------------
    # TOP NEGATIVE
    # --------------------------------------------------------

    print("\n========================================")
    print("TOP NEGATIVE FEATURES")
    print("========================================")


    negative = (

        correlations
        .drop(
            "Jump_Distance_m"
        )
        .sort_values(
            ascending=True
        )

    )


    print(
        negative.head(10)
    )


# ============================================================
# PERFORMANCE LABEL VS JUMP DISTANCE
# ============================================================

print("\n========================================")
print("PERFORMANCE VS JUMP DISTANCE")
print("========================================")


if (

    "Performance_Label" in df.columns

    and

    "Jump_Distance_m" in df.columns

):

    performance_distance = (

        df
        .groupby(
            "Performance_Label"
        )[
            "Jump_Distance_m"
        ]
        .agg(
            [
                "count",
                "mean",
                "std",
                "min",
                "max"
            ]
        )

    )


    print(
        performance_distance
    )


# ============================================================
# SKILL LEVEL VS JUMP DISTANCE
# ============================================================

print("\n========================================")
print("SKILL LEVEL VS JUMP DISTANCE")
print("========================================")


if (

    "Skill_Level" in df.columns

    and

    "Jump_Distance_m" in df.columns

):

    skill_distance = (

        df
        .groupby(
            "Skill_Level"
        )[
            "Jump_Distance_m"
        ]
        .agg(
            [
                "count",
                "mean",
                "std",
                "min",
                "max"
            ]
        )
        .sort_values(
            "mean",
            ascending=False
        )

    )


    print(
        skill_distance
    )


# ============================================================
# GENDER VS JUMP DISTANCE
# ============================================================

print("\n========================================")
print("GENDER VS JUMP DISTANCE")
print("========================================")


if (

    "Gender" in df.columns

    and

    "Jump_Distance_m" in df.columns

):

    gender_distance = (

        df
        .groupby(
            "Gender"
        )[
            "Jump_Distance_m"
        ]
        .agg(
            [
                "count",
                "mean",
                "std",
                "min",
                "max"
            ]
        )

    )


    print(
        gender_distance
    )


# ============================================================
# SKILL LEVEL DISTRIBUTION
# ============================================================

print("\n========================================")
print("SKILL LEVEL DISTRIBUTION")
print("========================================")


if "Skill_Level" in df.columns:

    print(

        df[
            "Skill_Level"
        ].value_counts()

    )


# ============================================================
# WEATHER DISTRIBUTION
# ============================================================

print("\n========================================")
print("WEATHER CONDITION DISTRIBUTION")
print("========================================")


if "Weather_Condition" in df.columns:

    print(

        df[
            "Weather_Condition"
        ].value_counts()

    )


# ============================================================
# PREVIOUS INJURIES DISTRIBUTION
# ============================================================

print("\n========================================")
print("PREVIOUS INJURIES DISTRIBUTION")
print("========================================")


if "Previous_Injuries" in df.columns:

    print(

        df[
            "Previous_Injuries"
        ].value_counts()

    )


# ============================================================
# TAKEOFF FOOT DISTRIBUTION
# ============================================================

print("\n========================================")
print("TAKEOFF FOOT DISTRIBUTION")
print("========================================")


if "Takeoff_Foot" in df.columns:

    print(

        df[
            "Takeoff_Foot"
        ].value_counts()

    )


# ============================================================
# IMPORTANT FEATURE STATISTICS
# ============================================================

print("\n========================================")
print("IMPORTANT ATHLETIC FEATURES")
print("========================================")


important_features = [

    "Sprint_Speed_mps",

    "Reaction_Time_sec",

    "Flexibility_Score",

    "Leg_Strength_Score",

    "Balance_Score",

    "Endurance_Score",

    "Runup_Distance_m",

    "Takeoff_Angle_deg",

    "Training_Hours_Per_Week",

    "Coach_Rating",

    "Jump_Distance_m"

]


for column in important_features:

    if column in df.columns:

        print(
            f"\n{column}"
        )

        print(
            df[column].describe().round(3)
        )


# ============================================================
# FINAL CHECK
# ============================================================

print("\n========================================")
print("FINAL DATASET CHECK")
print("========================================")


print(
    f"Rows: {df.shape[0]}"
)

print(
    f"Columns: {df.shape[1]}"
)

print(
    f"Missing values: {df.isnull().sum().sum()}"
)

print(
    f"Duplicate rows: {df.duplicated().sum()}"
)


# ============================================================
# COMPLETE
# ============================================================

print("\n========================================")
print("ANALYSIS COMPLETE")
print("========================================")
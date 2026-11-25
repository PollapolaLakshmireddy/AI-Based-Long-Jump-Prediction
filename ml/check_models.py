import os
import joblib


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)

distance_path = os.path.join(
    MODEL_DIR,
    "distance_model.pkl"
)

performance_path = os.path.join(
    MODEL_DIR,
    "performance_model.pkl"
)


print("========================================")
print("CHECKING ML MODELS")
print("========================================")


# ========================================
# DISTANCE MODEL
# ========================================

print("\nDISTANCE MODEL")
print("----------------------------------------")

if not os.path.exists(distance_path):

    print("NOT FOUND:")
    print(distance_path)

else:

    distance_model = joblib.load(
        distance_path
    )

    print(
        "Model type:",
        type(distance_model)
    )

    if hasattr(
        distance_model,
        "feature_names_in_"
    ):

        print(
            "Features:"
        )

        for feature in distance_model.feature_names_in_:

            print(
                " -",
                feature
            )

    else:

        print(
            "No feature_names_in_ found"
        )


# ========================================
# PERFORMANCE MODEL
# ========================================

print("\nPERFORMANCE MODEL")
print("----------------------------------------")

if not os.path.exists(performance_path):

    print("NOT FOUND:")
    print(performance_path)

else:

    performance_model = joblib.load(
        performance_path
    )

    print(
        "Model type:",
        type(performance_model)
    )

    if hasattr(
        performance_model,
        "feature_names_in_"
    ):

        print(
            "Features:"
        )

        for feature in performance_model.feature_names_in_:

            print(
                " -",
                feature
            )

    else:

        print(
            "No feature_names_in_ found"
        )


print("\n========================================")
print("CHECK COMPLETED")
print("========================================")
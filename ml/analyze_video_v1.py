import cv2
import os
import sys
import json
import math
import statistics
import mediapipe as mp

from mediapipe.tasks import python
from mediapipe.tasks.python import vision


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "video",
    "models",
    "pose_landmarker.task"
)


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def calculate_angle(a, b, c):

    angle = math.degrees(
        math.atan2(
            c[1] - b[1],
            c[0] - b[0]
        )
        -
        math.atan2(
            a[1] - b[1],
            a[0] - b[0]
        )
    )

    angle = abs(angle)

    if angle > 180:
        angle = 360 - angle

    return angle


def smooth(values, window=5):

    if len(values) < window:
        return values[:]

    result = []

    half = window // 2

    for i in range(len(values)):

        start = max(
            0,
            i - half
        )

        end = min(
            len(values),
            i + half + 1
        )

        result.append(
            statistics.median(
                values[start:end]
            )
        )

    return result


def average(values):

    if not values:
        return 0

    return sum(values) / len(values)


def clamp(value, minimum, maximum):

    return max(
        minimum,
        min(
            maximum,
            value
        )
    )


# ============================================================
# ANALYZE VIDEO
# ============================================================

def analyze_video(video_path):

    if not os.path.exists(video_path):

        raise FileNotFoundError(
            f"Video not found: {video_path}"
        )


    if not os.path.exists(MODEL_PATH):

        raise FileNotFoundError(
            f"Pose model not found: {MODEL_PATH}"
        )


    # ========================================================
    # OPEN VIDEO
    # ========================================================

    cap = cv2.VideoCapture(
        video_path
    )


    if not cap.isOpened():

        raise RuntimeError(
            "Could not open video"
        )


    fps = cap.get(
        cv2.CAP_PROP_FPS
    )

    total_frames = int(
        cap.get(
            cv2.CAP_PROP_FRAME_COUNT
        )
    )

    width = int(
        cap.get(
            cv2.CAP_PROP_FRAME_WIDTH
        )
    )

    height = int(
        cap.get(
            cv2.CAP_PROP_FRAME_HEIGHT
        )
    )


    if fps <= 0:

        fps = 30.0


    duration = (
        total_frames / fps
    )


    # ========================================================
    # MEDIAPIPE
    # ========================================================

    base_options = python.BaseOptions(

        model_asset_path=MODEL_PATH

    )


    options = vision.PoseLandmarkerOptions(

        base_options=base_options,

        running_mode=vision.RunningMode.VIDEO,

        num_poses=1,

        min_pose_detection_confidence=0.5,

        min_pose_presence_confidence=0.5,

        min_tracking_confidence=0.5

    )


    landmarker = (

        vision.PoseLandmarker
        .create_from_options(
            options
        )

    )


    # ========================================================
    # FRAME DATA
    # ========================================================

    frame_numbers = []

    times = []

    hip_x = []

    hip_y = []

    ankle_x = []

    ankle_y = []

    knee_angles = []

    hip_angles = []

    ankle_angles = []

    confidences = []


    # ========================================================
    # PROCESS FRAMES
    # ========================================================

    frame_number = 0


    while True:

        success, frame = cap.read()


        if not success:
            break


        rgb = cv2.cvtColor(

            frame,

            cv2.COLOR_BGR2RGB

        )


        mp_image = mp.Image(

            image_format=(
                mp.ImageFormat.SRGB
            ),

            data=rgb

        )


        timestamp_ms = int(

            frame_number
            * 1000
            / fps

        )


        result = (

            landmarker.detect_for_video(

                mp_image,

                timestamp_ms

            )

        )


        if result.pose_landmarks:

            landmarks = (
                result.pose_landmarks[0]
            )


            # ------------------------------------------------
            # LANDMARKS
            # ------------------------------------------------

            left_shoulder = landmarks[11]
            right_shoulder = landmarks[12]

            left_hip = landmarks[23]
            right_hip = landmarks[24]

            left_knee = landmarks[25]
            right_knee = landmarks[26]

            left_ankle = landmarks[27]
            right_ankle = landmarks[28]


            # ------------------------------------------------
            # AVERAGE BODY POINTS
            # ------------------------------------------------

            shoulder = (

                (
                    left_shoulder.x +
                    right_shoulder.x
                ) / 2,

                (
                    left_shoulder.y +
                    right_shoulder.y
                ) / 2

            )


            hip = (

                (
                    left_hip.x +
                    right_hip.x
                ) / 2,

                (
                    left_hip.y +
                    right_hip.y
                ) / 2

            )


            knee = (

                (
                    left_knee.x +
                    right_knee.x
                ) / 2,

                (
                    left_knee.y +
                    right_knee.y
                ) / 2

            )


            ankle = (

                (
                    left_ankle.x +
                    right_ankle.x
                ) / 2,

                (
                    left_ankle.y +
                    right_ankle.y
                ) / 2

            )


            # ------------------------------------------------
            # ANGLES
            # ------------------------------------------------

            knee_angle = calculate_angle(

                hip,
                knee,
                ankle

            )


            hip_angle = calculate_angle(

                shoulder,
                hip,
                knee

            )


            ankle_angle = calculate_angle(

                knee,
                ankle,
                (
                    ankle[0] + 0.1,
                    ankle[1]
                )

            )


            # ------------------------------------------------
            # CONFIDENCE
            # ------------------------------------------------

            visibility = [

                left_hip.visibility,
                right_hip.visibility,

                left_knee.visibility,
                right_knee.visibility,

                left_ankle.visibility,
                right_ankle.visibility

            ]


            confidence = average(
                visibility
            )


            # ------------------------------------------------
            # STORE
            # ------------------------------------------------

            frame_numbers.append(
                frame_number
            )

            times.append(
                frame_number / fps
            )

            hip_x.append(
                hip[0]
            )

            hip_y.append(
                hip[1]
            )

            ankle_x.append(
                ankle[0]
            )

            ankle_y.append(
                ankle[1]
            )

            knee_angles.append(
                knee_angle
            )

            hip_angles.append(
                hip_angle
            )

            ankle_angles.append(
                ankle_angle
            )

            confidences.append(
                confidence
            )


        frame_number += 1


    cap.release()

    landmarker.close()


    # ========================================================
    # CHECK DETECTIONS
    # ========================================================

    detected_frames = len(
        frame_numbers
    )


    if detected_frames < 15:

        raise RuntimeError(

            "Could not detect enough athlete poses. "
            "Use a clear side-view video where the full athlete "
            "is visible."

        )


    # ========================================================
    # SMOOTH TRAJECTORY
    # ========================================================

    smooth_hip_y = smooth(
        hip_y,
        7
    )

    smooth_ankle_y = smooth(
        ankle_y,
        7
    )


    # ========================================================
    # FIND FLIGHT PEAK
    # ========================================================
    #
    # In image coordinates:
    #
    # smaller Y = athlete is higher
    #
    # We search for the highest hip position.
    #
    # ========================================================

    peak_index = min(

        range(
            detected_frames
        ),

        key=lambda i:
        smooth_hip_y[i]

    )


    # ========================================================
    # IMPORTANT VIDEO VALIDATION
    # ========================================================

    # We need frames AFTER the peak to identify landing.

    frames_after_peak = (

        detected_frames
        -
        peak_index
        -
        1

    )


    frames_before_peak = peak_index


    # If the peak is too close to the end,
    # landing cannot be reliably detected.

    if frames_after_peak < max(
        5,
        int(fps * 0.20)
    ):

        landing_detected = False

    else:

        landing_detected = True


    # ========================================================
    # TAKEOFF DETECTION
    # ========================================================
    #
    # Search backwards from the peak.
    #
    # During takeoff the athlete moves upward.
    #
    # We look for a sustained upward movement.
    #
    # ========================================================

    takeoff_index = None


    search_start = max(

        1,

        peak_index -
        int(fps * 1.5)

    )


    for i in range(

        peak_index - 2,

        search_start - 1,

        -1

    ):

        upward_1 = (

            smooth_hip_y[i]
            -
            smooth_hip_y[i + 1]

        )


        upward_2 = (

            smooth_hip_y[i - 1]
            -
            smooth_hip_y[i]

        )


        if (

            upward_1 > 0.003
            and
            upward_2 > 0.003

        ):

            takeoff_index = i

            break


    # Fallback

    if takeoff_index is None:

        takeoff_index = max(

            0,

            peak_index -
            int(fps * 0.5)

        )


    # ========================================================
    # LANDING DETECTION
    # ========================================================

    landing_index = None


    if landing_detected:

        search_end = min(

            detected_frames - 1,

            peak_index +
            int(fps * 1.5)

        )


        # Search forward for downward movement
        # followed by stabilization.

        for i in range(

            peak_index + 2,

            search_end - 2

        ):

            downward_1 = (

                smooth_hip_y[i + 1]
                -
                smooth_hip_y[i]

            )


            downward_2 = (

                smooth_hip_y[i + 2]
                -
                smooth_hip_y[i + 1]

            )


            if (

                downward_1 > 0.002
                and
                downward_2 > 0.002

            ):

                landing_index = i

                break


    # ========================================================
    # FLIGHT TIME
    # ========================================================

    if landing_index is not None:

        takeoff_time = times[
            takeoff_index
        ]

        landing_time = times[
            landing_index
        ]

        flight_time = (

            landing_time
            -
            takeoff_time

        )

    else:

        takeoff_time = times[
            takeoff_index
        ]

        landing_time = None

        flight_time = None


    # ========================================================
    # RUN-UP
    # ========================================================

    runup_time = takeoff_time


    # ========================================================
    # ANGLE STATISTICS
    # ========================================================

    # Use frames around takeoff rather than
    # the entire video.

    takeoff_window = max(

        1,

        int(fps * 0.15)

    )


    angle_start = max(

        0,

        takeoff_index -
        takeoff_window

    )


    angle_end = min(

        detected_frames,

        takeoff_index +
        takeoff_window +
        1

    )


    takeoff_knee_angles = (

        knee_angles[
            angle_start:angle_end
        ]

    )


    takeoff_hip_angles = (

        hip_angles[
            angle_start:angle_end
        ]

    )


    takeoff_ankle_angles = (

        ankle_angles[
            angle_start:angle_end
        ]

    )


    average_knee_angle = average(

        takeoff_knee_angles

    )


    average_hip_angle = average(

        takeoff_hip_angles

    )


    average_ankle_angle = average(

        takeoff_ankle_angles

    )


    # ========================================================
    # LANDING STABILITY
    # ========================================================

    landing_stability = None


    if landing_index is not None:

        start = max(

            0,

            landing_index -
            int(fps * 0.10)

        )


        end = min(

            detected_frames,

            landing_index +
            int(fps * 0.20)

        )


        y_segment = smooth_hip_y[
            start:end
        ]


        if len(y_segment) > 2:

            changes = [

                abs(
                    y_segment[i]
                    -
                    y_segment[i - 1]
                )

                for i in range(
                    1,
                    len(y_segment)
                )

            ]


            movement = average(
                changes
            )


            landing_stability = clamp(

                100 -
                movement * 1000,

                0,

                100

            )

        else:

            landing_stability = 50


    # ========================================================
    # TAKEOFF MOVEMENT
    # ========================================================

    if takeoff_index > 0:

        previous_x = hip_x[
            takeoff_index - 1
        ]

        current_x = hip_x[
            takeoff_index
        ]

        horizontal_movement = abs(

            current_x -
            previous_x

        )

        runup_speed_normalized = (

            horizontal_movement
            *
            fps

        )

    else:

        runup_speed_normalized = 0


    # ========================================================
    # POSE CONFIDENCE
    # ========================================================

    pose_confidence = (

        average(
            confidences
        )

        * 100

    )


    # ========================================================
    # QUALITY SCORE
    # ========================================================

    quality_score = pose_confidence


    if landing_index is None:

        quality_score *= 0.75


    # ========================================================
    # RESULT
    # ========================================================

    result = {

        "success": True,


        "video": {

            "width":
                width,

            "height":
                height,

            "fps":
                round(
                    fps,
                    2
                ),

            "total_frames":
                total_frames,

            "duration_sec":
                round(
                    duration,
                    2
                )

        },


        "jump_phase": {

            "takeoff_frame":
                frame_numbers[
                    takeoff_index
                ],

            "takeoff_time_sec":
                round(
                    takeoff_time,
                    3
                ),

            "peak_frame":
                frame_numbers[
                    peak_index
                ],

            "peak_time_sec":
                round(
                    times[
                        peak_index
                    ],
                    3
                ),

            "landing_frame":

                (
                    frame_numbers[
                        landing_index
                    ]

                    if landing_index
                    is not None

                    else None

                ),

            "landing_time_sec":

                (
                    round(
                        landing_time,
                        3
                    )

                    if landing_time
                    is not None

                    else None

                ),

            "landing_detected":
                landing_index
                is not None

        },


        "performance": {

            "flight_time_sec":

                (
                    round(
                        flight_time,
                        3
                    )

                    if flight_time
                    is not None

                    else None

                ),

            "runup_time_sec":
                round(
                    runup_time,
                    3
                ),

            "runup_speed_normalized":
                round(
                    runup_speed_normalized,
                    4
                ),

            "knee_angle_deg":
                round(
                    average_knee_angle,
                    2
                ),

            "hip_angle_deg":
                round(
                    average_hip_angle,
                    2
                ),

            "ankle_angle_deg":
                round(
                    average_ankle_angle,
                    2
                ),

            "landing_stability_score":

                (
                    round(
                        landing_stability,
                        2
                    )

                    if landing_stability
                    is not None

                    else None

                )

        },


        "quality": {

            "pose_confidence_percent":
                round(
                    pose_confidence,
                    2
                ),

            "analysis_quality_percent":
                round(
                    quality_score,
                    2
                )

        },


        "notes": [

            "Jump phases are estimated from pose trajectory.",

            "Actual jump distance requires camera/runway calibration.",

            (
                "Landing was not confidently detected because "
                "the video ended too close to the flight peak."
                if landing_index is None
                else
                "Landing phase detected from post-peak movement."
            )

        ]

    }


    return result


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    try:

        if len(sys.argv) < 2:

            raise ValueError(

                "Usage: python analyze_video.py <video_path>"

            )


        video_path = sys.argv[1]


        result = analyze_video(

            video_path

        )


        print(

            json.dumps(
                result
            )

        )


    except Exception as error:

        print(

            json.dumps({

                "success": False,

                "error":
                    str(error)

            })

        )

        sys.exit(1)
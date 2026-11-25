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

def average(values):

    if not values:
        return 0.0

    return sum(values) / len(values)


def smooth(values, window=9):

    if len(values) <= 2:
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


def draw_text(
    frame,
    text,
    position,
    scale=0.7,
    thickness=2
):

    x, y = position

    # Black background rectangle

    font = cv2.FONT_HERSHEY_SIMPLEX

    size = cv2.getTextSize(
        text,
        font,
        scale,
        thickness
    )[0]

    cv2.rectangle(

        frame,

        (
            x - 5,
            y - size[1] - 8
        ),

        (
            x + size[0] + 5,
            y + 5
        ),

        (0, 0, 0),

        -1

    )

    cv2.putText(

        frame,

        text,

        (x, y),

        font,

        scale,

        (255, 255, 255),

        thickness,

        cv2.LINE_AA

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
    # STORE DATA
    # ========================================================

    frame_data = []


    hip_y = []

    knee_y = []

    ankle_y = []


    # ========================================================
    # FIRST PASS
    # ========================================================
    #
    # Analyze the complete video first.
    #
    # Then find:
    #
    # TAKEOFF
    # PEAK
    # LANDING
    #
    # Then perform a second pass to create the
    # visualization.
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

            image_format=mp.ImageFormat.SRGB,

            data=rgb

        )


        timestamp_ms = int(

            frame_number
            *
            1000
            /
            fps

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


            # --------------------------------------------
            # LANDMARKS
            # --------------------------------------------

            left_hip = landmarks[23]
            right_hip = landmarks[24]

            left_knee = landmarks[25]
            right_knee = landmarks[26]

            left_ankle = landmarks[27]
            right_ankle = landmarks[28]


            # --------------------------------------------
            # CENTERS
            # --------------------------------------------

            hip = (

                (
                    left_hip.x
                    +
                    right_hip.x
                ) / 2,

                (
                    left_hip.y
                    +
                    right_hip.y
                ) / 2

            )


            knee = (

                (
                    left_knee.x
                    +
                    right_knee.x
                ) / 2,

                (
                    left_knee.y
                    +
                    right_knee.y
                ) / 2

            )


            ankle = (

                (
                    left_ankle.x
                    +
                    right_ankle.x
                ) / 2,

                (
                    left_ankle.y
                    +
                    right_ankle.y
                ) / 2

            )


            frame_data.append({

                "frame":
                    frame_number,

                "hip":
                    hip,

                "knee":
                    knee,

                "ankle":
                    ankle,

                "landmarks":
                    landmarks

            })


            hip_y.append(
                hip[1]
            )

            knee_y.append(
                knee[1]
            )

            ankle_y.append(
                ankle[1]
            )


        else:

            frame_data.append(
                None
            )

            hip_y.append(
                None
            )

            knee_y.append(
                None
            )

            ankle_y.append(
                None
            )


        frame_number += 1


    cap.release()


    # ========================================================
    # BUILD CONTINUOUS TRAJECTORY
    # ========================================================

    valid_hip = []

    valid_indices = []


    for i, value in enumerate(
        hip_y
    ):

        if value is not None:

            valid_hip.append(
                value
            )

            valid_indices.append(
                i
            )


    if len(valid_hip) < 20:

        landmarker.close()

        raise RuntimeError(

            "Not enough pose detections."

        )


    # ========================================================
    # SMOOTH
    # ========================================================

    smooth_hip = smooth(
        valid_hip,
        9
    )


    # ========================================================
    # SEARCH RANGE
    # ========================================================

    detected_count = len(
        valid_indices
    )


    search_start = max(

        5,

        int(
            detected_count * 0.20
        )

    )


    search_end = min(

        detected_count - 10,

        int(
            detected_count * 0.95
        )

    )


    # ========================================================
    # FIND PEAK
    # ========================================================

    peak_window = max(

        3,

        int(
            fps * 0.16
        )

    )


    peak_candidates = []


    for i in range(

        search_start + peak_window,

        search_end - peak_window

    ):

        current = smooth_hip[i]


        before = smooth_hip[

            i - peak_window:i

        ]


        after = smooth_hip[

            i + 1:
            i + peak_window + 1

        ]


        if not before or not after:

            continue


        upward = (

            max(before)
            -
            current

        )


        downward = (

            max(after)
            -
            current

        )


        if (

            upward >= 0.015

            and

            downward >= 0.010

        ):

            peak_candidates.append({

                "index":
                    i,

                "score":
                    upward
                    +
                    downward

            })


    if peak_candidates:

        peak_valid_index = max(

            peak_candidates,

            key=lambda x:
            x["score"]

        )["index"]


    else:

        peak_valid_index = min(

            range(
                search_start,
                search_end
            ),

            key=lambda i:
            smooth_hip[i]

        )


    # ========================================================
    # TAKEOFF
    # ========================================================

    minimum_separation = max(

        5,

        int(
            fps * 0.20
        )

    )


    takeoff_valid_index = None


    takeoff_start = max(

        search_start,

        peak_valid_index
        -
        int(
            fps * 1.5
        )

    )


    best_score = 0


    for i in range(

        takeoff_start + 3,

        peak_valid_index -
        minimum_separation

    ):

        previous = average(

            smooth_hip[

                max(
                    0,
                    i - 4
                ):i

            ]

        )


        current = smooth_hip[i]


        next_value = smooth_hip[
            i + 1
        ]


        upward = (

            previous
            -
            current

        )


        continued = (

            current
            -
            next_value

        )


        score = (

            upward
            +
            continued

        )


        if (

            upward > 0.001

            and

            score > best_score

        ):

            best_score = score

            takeoff_valid_index = i


    if takeoff_valid_index is None:

        takeoff_valid_index = max(

            search_start,

            peak_valid_index
            -
            int(
                fps * 0.40
            )

        )


    # ========================================================
    # FORCE PEAK AFTER TAKEOFF
    # ========================================================

    minimum_valid_peak = (

        takeoff_valid_index
        +
        minimum_separation

    )


    if peak_valid_index < minimum_valid_peak:

        peak_valid_index = min(

            minimum_valid_peak,

            search_end - 1

        )


    # ========================================================
    # LANDING
    # ========================================================

    landing_valid_index = None


    landing_start = (

        peak_valid_index
        +
        max(
            3,
            int(
                fps * 0.10
            )
        )

    )


    landing_end = min(

        detected_count - 4,

        peak_valid_index
        +
        int(
            fps * 1.8
        )

    )


    for i in range(

        landing_start,

        landing_end

    ):

        if i + 3 >= detected_count:

            break


        downward_1 = (

            smooth_hip[i + 1]
            -
            smooth_hip[i]

        )


        downward_2 = (

            smooth_hip[i + 2]
            -
            smooth_hip[i + 1]

        )


        downward_3 = (

            smooth_hip[i + 3]
            -
            smooth_hip[i + 2]

        )


        if (

            downward_1 > 0.001

            and

            downward_2 > 0.001

            and

            downward_3 > 0.0005

        ):

            landing_valid_index = i

            break


    # ========================================================
    # CONVERT VALID INDICES TO ORIGINAL FRAME NUMBERS
    # ========================================================

    takeoff_frame = (

        valid_indices[
            takeoff_valid_index
        ]

    )


    peak_frame = (

        valid_indices[
            peak_valid_index
        ]

    )


    if landing_valid_index is not None:

        landing_frame = (

            valid_indices[
                landing_valid_index
            ]

        )

    else:

        landing_frame = None


    # ========================================================
    # TIMES
    # ========================================================

    takeoff_time = (

        takeoff_frame
        /
        fps

    )


    peak_time = (

        peak_frame
        /
        fps

    )


    if landing_frame is not None:

        landing_time = (

            landing_frame
            /
            fps

        )

        flight_time = (

            landing_time
            -
            takeoff_time

        )

    else:

        landing_time = None

        flight_time = None


    # ========================================================
    # OUTPUT VIDEO
    # ========================================================

    cap = cv2.VideoCapture(
        video_path
    )


    output_dir = os.path.join(

        BASE_DIR,

        "video",

        "outputs"

    )


    os.makedirs(

        output_dir,

        exist_ok=True

    )


    input_name = os.path.basename(
        video_path
    )


    name_without_extension = os.path.splitext(
        input_name
    )[0]


    output_path = os.path.join(

        output_dir,

        name_without_extension
        +
        "_analyzed.mp4"

    )


    fourcc = cv2.VideoWriter_fourcc(

        *"mp4v"

    )


    writer = cv2.VideoWriter(

        output_path,

        fourcc,

        fps,

        (
            width,
            height
        )

    )


    # ========================================================
    # DRAWING
    # ========================================================

    connections = [

        (11, 12),

        (11, 13),
        (13, 15),

        (12, 14),
        (14, 16),

        (11, 23),
        (12, 24),

        (23, 24),

        (23, 25),
        (25, 27),

        (24, 26),
        (26, 28),

        (27, 31),
        (28, 32)

    ]


    current_frame = 0


    while True:

        success, frame = cap.read()


        if not success:
            break


        # ====================================================
        # POSE
        # ====================================================

        data = None


        if current_frame < len(
            frame_data
        ):

            data = frame_data[
                current_frame
            ]


        if data is not None:

            landmarks = data[
                "landmarks"
            ]


            # ------------------------------------------------
            # DRAW SKELETON
            # ------------------------------------------------

            for a, b in connections:

                if a >= len(
                    landmarks
                ):
                    continue

                if b >= len(
                    landmarks
                ):
                    continue


                point_a = (

                    int(
                        landmarks[a].x
                        *
                        width
                    ),

                    int(
                        landmarks[a].y
                        *
                        height
                    )

                )


                point_b = (

                    int(
                        landmarks[b].x
                        *
                        width
                    ),

                    int(
                        landmarks[b].y
                        *
                        height
                    )

                )


                cv2.line(

                    frame,

                    point_a,

                    point_b,

                    (0, 255, 0),

                    3

                )


            # ------------------------------------------------
            # DRAW JOINTS
            # ------------------------------------------------

            important_points = [

                11, 12,
                13, 14,
                15, 16,
                23, 24,
                25, 26,
                27, 28

            ]


            for point_id in important_points:

                landmark = landmarks[
                    point_id
                ]


                x = int(

                    landmark.x
                    *
                    width

                )


                y = int(

                    landmark.y
                    *
                    height

                )


                cv2.circle(

                    frame,

                    (x, y),

                    5,

                    (0, 0, 255),

                    -1

                )


        # ====================================================
        # TOP INFORMATION PANEL
        # ====================================================

        cv2.rectangle(

            frame,

            (0, 0),

            (width, 155),

            (0, 0, 0),

            -1

        )


        draw_text(

            frame,

            "LONG JUMP AI - VIDEO ANALYSIS",

            (20, 35),

            0.75,

            2

        )


        draw_text(

            frame,

            f"Frame: {current_frame}/{total_frames}",

            (20, 65),

            0.55,

            1

        )


        draw_text(

            frame,

            f"Time: {current_frame / fps:.2f} sec",

            (20, 90),

            0.55,

            1

        )


        # ====================================================
        # PHASE INFORMATION
        # ====================================================

        if current_frame == takeoff_frame:

            draw_text(

                frame,

                "TAKEOFF",

                (
                    20,
                    130
                ),

                0.75,

                2

            )


        elif current_frame == peak_frame:

            draw_text(

                frame,

                "PEAK",

                (
                    20,
                    130
                ),

                0.75,

                2

            )


        elif (

            landing_frame is not None

            and

            current_frame == landing_frame

        ):

            draw_text(

                frame,

                "LANDING",

                (
                    20,
                    130
                ),

                0.75,

                2

            )


        # ====================================================
        # PHASE MARKERS
        # ====================================================

        if current_frame == takeoff_frame:

            cv2.line(

                frame,

                (0, height - 80),

                (width, height - 80),

                (255, 255, 255),

                3

            )


        if current_frame == peak_frame:

            cv2.line(

                frame,

                (0, height - 80),

                (width, height - 80),

                (255, 255, 255),

                3

            )


        if (

            landing_frame is not None

            and

            current_frame == landing_frame

        ):

            cv2.line(

                frame,

                (0, height - 80),

                (width, height - 80),

                (255, 255, 255),

                3

            )


        # ====================================================
        # BOTTOM INFORMATION
        # ====================================================

        cv2.rectangle(

            frame,

            (
                0,
                height - 75
            ),

            (
                width,
                height
            ),

            (0, 0, 0),

            -1

        )


        draw_text(

            frame,

            f"Takeoff: {takeoff_time:.2f}s",

            (
                15,
                height - 50
            ),

            0.48,

            1

        )


        draw_text(

            frame,

            f"Peak: {peak_time:.2f}s",

            (
                180,
                height - 50
            ),

            0.48,

            1

        )


        if landing_time is not None:

            draw_text(

                frame,

                f"Landing: {landing_time:.2f}s",

                (
                    330,
                    height - 50
                ),

                0.48,

                1

            )


        if flight_time is not None:

            draw_text(

                frame,

                f"Flight: {flight_time:.2f}s",

                (
                    500,
                    height - 50
                ),

                0.48,

                1

            )


        writer.write(
            frame
        )


        current_frame += 1


    cap.release()

    writer.release()

    landmarker.close()


    # ========================================================
    # RESULT
    # ========================================================

    return {

        "success": True,

        "output_video":
            output_path,

        "takeoff_frame":
            takeoff_frame,

        "takeoff_time_sec":
            round(
                takeoff_time,
                3
            ),

        "peak_frame":
            peak_frame,

        "peak_time_sec":
            round(
                peak_time,
                3
            ),

        "landing_frame":
            landing_frame,

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

        "flight_time_sec":

            (

                round(
                    flight_time,
                    3
                )

                if flight_time
                is not None

                else None

            )

    }


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    try:

        if len(sys.argv) < 2:

            raise ValueError(

                "Usage: python visualize_analysis.py <video_path>"

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
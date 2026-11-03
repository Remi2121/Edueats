import os
import sys
from datetime import datetime

import cv2
import numpy as np
import tensorflow as tf
from PIL import Image

MODEL_PATH = "ml/mood_model.keras"
IMAGE_SIZE = (48, 48)
CLASS_NAMES = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
LOG_DIR = "ml/logs"

# OpenCV ships this face-detector file inside the package itself, so no
# separate model download is needed
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def log_step(log_file, message):
    # timestamp every step and write it to both the screen and the log file
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {message}"
    print(line)
    with open(log_file, "a") as f:
        f.write(line + "\n")


def crop_to_face(image):
    # FER-2013's training photos are tightly cropped to just the face, but a
    # live webcam frame is a full photo (background, shoulders, etc.) — so we
    # find the face first and crop to it, to match what the model actually
    # learned from. Returns (cropped_image, True) if a face was found, or the
    # original image and False if not (a webcam frame at an odd angle should
    # still produce a check-in, not fail).
    gray = np.array(image.convert("L"))
    faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    if len(faces) == 0:
        return image, False

    # multiple "faces" can be detected (false positives); keep the biggest box
    x, y, w, h = max(faces, key=lambda box: box[2] * box[3])

    # pad 20% around the detected box so the crop isn't razor-tight on the
    # chin/hairline, then clamp to the photo's actual edges
    pad_x, pad_y = int(w * 0.2), int(h * 0.2)
    left = max(x - pad_x, 0)
    top = max(y - pad_y, 0)
    right = min(x + w + pad_x, image.width)
    bottom = min(y + h + pad_y, image.height)
    return image.crop((left, top, right, bottom)), True


def predict(image_path):
    os.makedirs(LOG_DIR, exist_ok=True)

    # one log file per date + image, so repeated tests don't overwrite each other
    image_name = os.path.splitext(os.path.basename(image_path))[0]
    date_str = datetime.now().strftime("%Y-%m-%d")
    log_file = os.path.join(LOG_DIR, f"{date_str}_{image_name}.log")

    log_step(log_file, f"Starting prediction for image: {image_path}")

    image = Image.open(image_path)
    image, face_found = crop_to_face(image)
    log_step(log_file, "Face detected, cropped to just the face" if face_found else
              "No face detected, using the full frame as-is")

    image = image.convert("L").resize(IMAGE_SIZE)
    log_step(log_file, "Image converted to grayscale, resized to 48x48")

    array = np.array(image, dtype="float32") / 255.0
    array = array.reshape(1, 48, 48, 1)
    log_step(log_file, "Image converted to numbers the model can read")

    model = tf.keras.models.load_model(MODEL_PATH)
    log_step(log_file, f"Model loaded from {MODEL_PATH}")

    predictions = model.predict(array)[0]
    log_step(log_file, "Prediction complete")

    ranked = sorted(zip(CLASS_NAMES, predictions), key=lambda pair: pair[1], reverse=True)
    log_step(log_file, f"Predicted mood: {ranked[0][0]} ({ranked[0][1]:.1%} confidence)")
    for name, score in ranked:
        log_step(log_file, f"  {name}: {score:.1%}")

    return ranked[0][0]


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python ml/predict.py <path-to-photo>")
        sys.exit(1)
    predict(sys.argv[1])

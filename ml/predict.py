import os
import sys
from datetime import datetime

import numpy as np
import tensorflow as tf
from PIL import Image

MODEL_PATH = "ml/mood_model.keras"
IMAGE_SIZE = (48, 48)
CLASS_NAMES = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
LOG_DIR = "ml/logs"


def log_step(log_file, message):
    # timestamp every step and write it to both the screen and the log file
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {message}"
    print(line)
    with open(log_file, "a") as f:
        f.write(line + "\n")


def predict(image_path):
    os.makedirs(LOG_DIR, exist_ok=True)

    # one log file per date + image, so repeated tests don't overwrite each other
    image_name = os.path.splitext(os.path.basename(image_path))[0]
    date_str = datetime.now().strftime("%Y-%m-%d")
    log_file = os.path.join(LOG_DIR, f"{date_str}_{image_name}.log")

    log_step(log_file, f"Starting prediction for image: {image_path}")

    image = Image.open(image_path).convert("L").resize(IMAGE_SIZE)
    log_step(log_file, "Image opened, converted to grayscale, resized to 48x48")

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

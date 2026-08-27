import tensorflow as tf
from tensorflow.keras import layers, models

NUM_CLASSES = 7   # angry, disgust, fear, happy, neutral, sad, surprise


def build_model():
    model = models.Sequential([
        layers.Input(shape=(48, 48, 1)),  # 48x48 grayscale (1 color channel)

        # round 1: find simple patterns (edges, curves) - look twice, then shrink
        layers.Conv2D(32, (3, 3), activation="relu", padding="same"),
        layers.BatchNormalization(),  # keep the numbers steady, so training is smoother
        layers.Conv2D(32, (3, 3), activation="relu", padding="same"),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),  # randomly ignore some, avoid memorizing this round's patterns

        # round 2: find more complex patterns built from round 1's patterns
        layers.Conv2D(64, (3, 3), activation="relu", padding="same"),
        layers.BatchNormalization(),
        layers.Conv2D(64, (3, 3), activation="relu", padding="same"),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),

        # round 3: find even higher-level patterns (e.g. parts of a face)
        layers.Conv2D(128, (3, 3), activation="relu", padding="same"),
        layers.BatchNormalization(),
        layers.Conv2D(128, (3, 3), activation="relu", padding="same"),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),

        # round 4: find the most complex, combined patterns
        layers.Conv2D(256, (3, 3), activation="relu", padding="same"),
        layers.BatchNormalization(),
        layers.Conv2D(256, (3, 3), activation="relu", padding="same"),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),

        layers.Flatten(),                       # turn the image grid into one long list
        layers.Dense(256, activation="relu"),    # combine everything learned so far
        layers.Dropout(0.5),                     # randomly ignore half, avoid memorizing
        layers.Dense(NUM_CLASSES, activation="softmax"),  # final emotion probabilities
    ])

    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    return model

import os
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

from data import load_datasets
from model import build_model

DATA_DIR = "datasets/fer2013"
MODEL_PATH = "ml/mood_model.keras"
EPOCHS = 100


def compute_class_weights():
    # count how many photos are in each emotion folder
    train_dir = f"{DATA_DIR}/train"
    class_names = sorted(os.listdir(train_dir))
    counts = [len(os.listdir(f"{train_dir}/{name}")) for name in class_names]

    # rare classes (like disgust) get a bigger weight, so the model pays more attention to them
    total = sum(counts)
    num_classes = len(counts)
    return {i: total / (num_classes * count) for i, count in enumerate(counts)}


def train():
    train_ds, test_ds, class_names = load_datasets()
    model = build_model()
    class_weights = compute_class_weights()

    callbacks = [
        EarlyStopping(patience=10, restore_best_weights=True),        # stop if it stops improving
        ModelCheckpoint(MODEL_PATH, save_best_only=True),             # keep only the best version
    ]

    model.fit(
        train_ds,
        validation_data=test_ds,
        epochs=EPOCHS,
        class_weight=class_weights,
        callbacks=callbacks,
    )

    loss, accuracy = model.evaluate(test_ds)
    print(f"Test accuracy: {accuracy:.4f}")


if __name__ == "__main__":
    train()

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, f1_score

DATA_DIR = "datasets/fer2013"
MODEL_PATH = "ml/mood_model.keras"
IMAGE_SIZE = (48, 48)
BATCH_SIZE = 32


def load_test_set():
    # same grayscale/48x48/rescale preprocessing as training, but no shuffle
    # and no augmentation — we want a fixed, honest read of the real test photos
    test_ds = tf.keras.utils.image_dataset_from_directory(
        f"{DATA_DIR}/test",
        image_size=IMAGE_SIZE,
        color_mode="grayscale",
        batch_size=BATCH_SIZE,
        label_mode="int",
        shuffle=False,
    )
    class_names = test_ds.class_names
    rescale = tf.keras.layers.Rescaling(1.0 / 255)
    test_ds = test_ds.map(lambda x, y: (rescale(x), y))
    return test_ds, class_names


def evaluate():
    test_ds, class_names = load_test_set()
    model = tf.keras.models.load_model(MODEL_PATH)

    # run the real saved model on every real test photo and collect what it
    # actually predicted vs. the real folder label, batch by batch
    y_true = []
    y_pred = []
    for images, labels in test_ds:
        predictions = model.predict(images, verbose=0)
        y_true.extend(labels.numpy())
        y_pred.extend(np.argmax(predictions, axis=1))

    print(classification_report(y_true, y_pred, target_names=class_names, digits=3))

    macro_f1 = f1_score(y_true, y_pred, average="macro")
    weighted_f1 = f1_score(y_true, y_pred, average="weighted")
    print(f"Macro F1: {macro_f1:.4f}")
    print(f"Weighted F1: {weighted_f1:.4f}")


if __name__ == "__main__":
    evaluate()

import tensorflow as tf

DATA_DIR = "datasets/fer2013"   # where the photo folders live
IMAGE_SIZE = (48, 48)           # resize every photo to 48x48
BATCH_SIZE = 32                 # group photos into batches of 32


def load_datasets():
    # load training photos, labeled by their folder name (angry, happy, ...)
    train_ds = tf.keras.utils.image_dataset_from_directory(
        f"{DATA_DIR}/train",
        image_size=IMAGE_SIZE,
        color_mode="grayscale",
        batch_size=BATCH_SIZE,
        label_mode="int",
    )
    # load test photos the same way, kept separate for checking accuracy later
    test_ds = tf.keras.utils.image_dataset_from_directory(
        f"{DATA_DIR}/test",
        image_size=IMAGE_SIZE,
        color_mode="grayscale",
        batch_size=BATCH_SIZE,
        label_mode="int",
    )

    # remember emotion names in order, e.g. number 0 = "angry"
    class_names = train_ds.class_names

    # shrink pixel brightness from 0-255 down to 0-1, easier for the model to learn
    rescale = tf.keras.layers.Rescaling(1.0 / 255)
    train_ds = train_ds.map(lambda x, y: (rescale(x), y))
    test_ds = test_ds.map(lambda x, y: (rescale(x), y))

    # randomly flip/rotate/zoom each training photo a little, differently every epoch,
    # so the model sees slight variations instead of memorizing the exact same images.
    # test_ds is left untouched, since we want to measure accuracy on real, unmodified photos
    augment = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.1),
        tf.keras.layers.RandomZoom(0.1),
    ])
    train_ds = train_ds.map(lambda x, y: (augment(x, training=True), y))
    return train_ds, test_ds, class_names
import images from "./foodImages.json";

// Real photos for every food in the real nutrition dataset — same hotlinked
// Wikipedia/Wikimedia Commons thumbnails the student web app uses (see
// EduEats/ml/fetch_food_images.py), just a local copy of the same real,
// citable JSON since this is a separate Expo/Metro project.
export function foodImageUrl(foodName) {
  return images[foodName] || null;
}

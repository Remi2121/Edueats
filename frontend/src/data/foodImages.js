import images from "./foodImages.json";

// Real photos for every food in the real nutrition dataset — one Wikipedia
// / Wikimedia Commons thumbnail URL per food name, fetched via Wikipedia's
// REST summary API (see EduEats/ml/fetch_food_images.py). Hotlinked rather
// than downloaded and stored, so no binary image files need to live in
// either repo, and every image still traces back to a real, citable source.
export function foodImageUrl(foodName) {
  return images[foodName] || null;
}

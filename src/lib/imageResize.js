/**
 * Resizes an image file to fit within maxWidth while maintaining aspect ratio,
 * then compresses to stay under maxSizeKB. Returns a new File object.
 */
export async function resizeImage(file, maxWidth = 1920, maxSizeKB = 350) {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > maxWidth) {
    height = Math.round(height * (maxWidth / width));
    width = maxWidth;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const targetBytes = maxSizeKB * 1024;
  let quality = 0.85;
  let blob;

  while (quality > 0.1) {
    blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (blob.size <= targetBytes) break;
    quality -= 0.1;
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

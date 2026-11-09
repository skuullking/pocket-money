// Même plafond que MAX_PROOF_IMAGE_CHARS dans backend/src/validation.ts.
const MAX_PROOF_IMAGE_CHARS = 700_000;

// Du plus fidèle au plus compact : on garde le premier essai qui passe sous le plafond.
const ATTEMPTS = [
  { maxSide: 1600, quality: 0.8 },
  { maxSide: 1280, quality: 0.7 },
  { maxSide: 960, quality: 0.6 },
  { maxSide: 640, quality: 0.5 },
];

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
  image.src = url;
});

const encodeJpeg = (image, { maxSide, quality }) => {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext('2d');
  // Le JPEG n'a pas de transparence : sans fond, elle deviendrait noire.
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
};

export async function compressProofImage(file) {
  const image = await loadImage(file);
  for (const attempt of ATTEMPTS) {
    const dataUrl = encodeJpeg(image, attempt);
    if (dataUrl.length <= MAX_PROOF_IMAGE_CHARS) return dataUrl;
  }
  throw new Error('Photo trop volumineuse');
}

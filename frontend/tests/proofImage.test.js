import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compressProofImage } from '../src/proofImage';

const MAX = 700_000;
let context;
let canvases;
let encodedSizes;
let imageSize;
let imageFails;

beforeEach(() => {
  context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
  canvases = [];
  encodedSizes = [10];
  imageSize = { naturalWidth: 3200, naturalHeight: 1600 };
  imageFails = false;

  URL.createObjectURL = vi.fn(() => 'blob:photo');
  URL.revokeObjectURL = vi.fn();

  vi.stubGlobal(
    'Image',
    class {
      constructor() {
        Object.assign(this, imageSize);
      }
      set src(_value) {
        queueMicrotask(() => (imageFails ? this.onerror() : this.onload()));
      }
    },
  );

  const realCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(tag => {
    if (tag !== 'canvas') return realCreateElement(tag);
    const canvas = {
      getContext: () => context,
      toDataURL: vi.fn((_type, quality) => {
        canvas.quality = quality;
        return 'x'.repeat(encodedSizes.shift() ?? 10);
      }),
    };
    canvases.push(canvas);
    return canvas;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('compressProofImage', () => {
  it('réduit le plus grand côté à 1600 px au premier essai', async () => {
    await compressProofImage(new Blob());
    expect(canvases).toHaveLength(1);
    expect(canvases[0]).toMatchObject({ width: 1600, height: 800, quality: 0.8 });
  });

  it("n'agrandit jamais une petite image", async () => {
    imageSize = { naturalWidth: 400, naturalHeight: 300 };
    await compressProofImage(new Blob());
    expect(canvases[0]).toMatchObject({ width: 400, height: 300 });
  });

  it('pose un fond blanc avant de dessiner', async () => {
    await compressProofImage(new Blob());
    expect(context.fillStyle).toBe('#fff');
    expect(context.fillRect.mock.invocationCallOrder[0]).toBeLessThan(context.drawImage.mock.invocationCallOrder[0]);
  });

  it('accepte exactement le plafond', async () => {
    encodedSizes = [MAX];
    await expect(compressProofImage(new Blob())).resolves.toHaveLength(MAX);
    expect(canvases).toHaveLength(1);
  });

  it("dégrade la qualité jusqu'à passer sous le plafond", async () => {
    encodedSizes = [MAX + 1, MAX + 1, 100];
    await expect(compressProofImage(new Blob())).resolves.toHaveLength(100);
    expect(canvases.map(c => c.width)).toEqual([1600, 1280, 960]);
    expect(canvases.map(c => c.quality)).toEqual([0.8, 0.7, 0.6]);
  });

  it('abandonne après le dernier essai', async () => {
    encodedSizes = Array(4).fill(MAX + 1);
    await expect(compressProofImage(new Blob())).rejects.toThrow('Photo trop volumineuse');
    expect(canvases).toHaveLength(4);
  });

  it("signale une image illisible et libère l'URL", async () => {
    imageFails = true;
    await expect(compressProofImage(new Blob())).rejects.toThrow('Image illisible');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
  });
});

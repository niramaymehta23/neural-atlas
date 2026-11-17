"use client";

import { useEffect, useState } from "react";
import { SIDE } from "@/engine/vision/seeing";
import { PHOTOS_PATH } from "@/engine/vision/runtime";

/** The sample photos (public/models/photos-v1), by file name without ".jpg". */
export const SINGLE_PHOTOS = ["cat", "dog", "teapot", "bananas", "bicycle"] as const;
export type SinglePhoto = (typeof SINGLE_PHOTOS)[number];
export const PHOTO_GROUPS = ["cats", "dogs", "flowers"] as const;
export type PhotoGroup = (typeof PHOTO_GROUPS)[number];
/** Photos in each group: `cats-1` … `cats-8`. */
export const GROUP_SIZE = 8;

export const photoUrl = (name: string) => `${PHOTOS_PATH}${name}.jpg`;

/** Reads a photo into 224 × 224 RGBA bytes. Swapped in tests, which have no picture decoder. */
export type PhotoReader = (name: string) => Promise<Uint8ClampedArray>;

const readInBrowser: PhotoReader = async (name) => {
  const response = await fetch(photoUrl(name));
  if (!response.ok) throw new Error(`The photo answered ${response.status}.`);
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  canvas.width = SIDE;
  canvas.height = SIDE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No canvas to read the photo.");
  context.drawImage(bitmap, 0, 0, SIDE, SIDE);
  bitmap.close();
  return context.getImageData(0, 0, SIDE, SIDE).data;
};

let reader: PhotoReader = readInBrowser;
const cache = new Map<string, Promise<Uint8ClampedArray>>();

/** For tests: read photos some other way (and forget any already read). */
export function setPhotoReader(next: PhotoReader | null) {
  reader = next ?? readInBrowser;
  cache.clear();
}

/** A photo's bytes, read once per page; a failed read is forgotten so it can be tried again. */
export function readPhoto(name: string): Promise<Uint8ClampedArray> {
  let photo = cache.get(name);
  if (!photo) {
    photo = reader(name);
    cache.set(name, photo);
    photo.catch(() => {
      if (cache.get(name) === photo) cache.delete(name);
    });
  }
  return photo;
}

export type PhotoLoad = {
  /** The photo's bytes once read, shared by every user: copy them (`slice()`) before handing them on. */
  pixels: Uint8ClampedArray | null;
  failed: boolean;
  retry: () => void;
};

/** One photo for a scene: null while it is read, `failed` if it could not be. */
export function usePhoto(name: string | null): PhotoLoad {
  const [loaded, setLoaded] = useState<{ name: string; pixels: Uint8ClampedArray } | null>(null);
  const [failedName, setFailedName] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (name === null) return;
    let live = true;
    readPhoto(name).then(
      (pixels) => {
        if (!live) return;
        setLoaded({ name, pixels });
        setFailedName(null);
      },
      () => {
        if (live) setFailedName(name);
      },
    );
    return () => {
      live = false;
    };
  }, [name, attempt]);
  const ready = loaded && loaded.name === name ? loaded.pixels : null;
  return {
    pixels: ready,
    failed: name !== null && failedName === name && !ready,
    retry: () => setAttempt((count) => count + 1),
  };
}

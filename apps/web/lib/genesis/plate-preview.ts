import { localRehearsalEnabled } from "./preview";

export const museumPlate = {
  slug: "phoenix-screen",
  src: "https://openaccess-cdn.clevelandart.org/1986.2.1/1986.2.1_web.jpg",
  sha256: "8c0cf008e2f0c467f40408511576f8d99c07d44c083b9200c234c82feb20f81e",
};

export function useLocalPlateCopies() {
  return Boolean(
    localRehearsalEnabled() && process.env.ARCANEA_GENESIS_PREVIEW_MEDIA_DIR,
  );
}

export function plateSource(plate: { slug: string; src: string }) {
  return useLocalPlateCopies()
    ? "/api/genesis/preview/plates/" + plate.slug
    : plate.src;
}

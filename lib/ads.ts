export type AdCreative = {
  id: string;
  image: string;
  href: string;
  alt: string;
  width: number;
  height: number;
};

export const ads: Record<string, AdCreative> = {
  "geely-ex5": {
    id: "geely-ex5",
    image: "/ads/geely-ex5.jpg",
    href: "#",
    alt: "Geely EX5 EV — машина, которая не шумит. Уровень шума всего 68,3 дБ при 120 км/ч",
    width: 1170,
    height: 270,
  },
};

const slotToCreative: Record<string, string> = {
  "home-top-billboard": "geely-ex5",
};

export function getAdCreative(slotId: string): AdCreative | null {
  const adId = slotToCreative[slotId];
  return adId ? (ads[adId] ?? null) : null;
}

export const normalizeCityName = (value: string): string => {
  return value.trim().toLowerCase();
};

export const createCityImageUrl = (city: string): string => {
  const seed = normalizeCityName(city).replace(/\s+/g, "-");
  return `https://picsum.photos/seed/${seed}-city/960/360`;
};

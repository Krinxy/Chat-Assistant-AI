import { useEffect, useMemo, useRef, useState } from "react";

import type { Language, NewsItem, WeatherCity } from "../../features/chat/types/chat";
import { useHorizontalWheelScroll } from "../../shared/hooks/useHorizontalWheelScroll";
import { useOutsideClick } from "../../shared/hooks/useOutsideClick";
import type { UiText } from "../../shared/i18n/uiText";
import { createCityImageUrl, normalizeCityName } from "../../shared/utils/cityMedia";

interface DashboardAsideProps {
  recommendedNews: NewsItem[];
  weatherCities: WeatherCity[];
  copy: UiText["weather"];
  language: Language;
}

const quickCitySuggestions: string[] = [
  "Berlin",
  "Hamburg",
  "Muenchen",
  "Koeln",
  "Frankfurt",
  "Stuttgart",
  "Duesseldorf",
  "Dortmund",
  "Bremen",
  "Leipzig",
  "Paris",
  "London",
  "Barcelona",
  "Madrid",
  "Lisbon",
  "Rome",
  "Milan",
  "Vienna",
  "Prague",
  "Amsterdam",
  "Zurich",
  "Copenhagen",
  "Stockholm",
  "Oslo",
  "Warsaw",
  "Istanbul",
  "New York",
  "San Francisco",
  "Tokyo",
  "Singapore",
];

const buildGeneratedCity = (
  name: string,
  language: Language,
  conditions: string[],
): WeatherCity => {
  const cleanName = name.trim();
  const seed = cleanName
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  const temperature = 12 + (seed % 15);
  const feelsLike = temperature + ((seed % 5) - 2);
  const humidity = 42 + (seed % 48);
  const wind = 7 + (seed % 29);

  const locale = language === "de" ? "de-DE" : "en-GB";
  const updatedAt = new Date().toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    id: `city-${normalizeCityName(cleanName).replace(/\s+/g, "-")}`,
    city: cleanName,
    country: "--",
    condition: conditions[seed % conditions.length] ?? conditions[0] ?? "Cloudy",
    updatedAt,
    imageUrl: createCityImageUrl(cleanName),
    stats: [
      { label: "Temperature", value: `${temperature}C` },
      { label: "Feels like", value: `${feelsLike}C` },
      { label: "Humidity", value: `${humidity}%` },
      { label: "Wind", value: `${wind} km/h` },
    ],
  };
};

export function DashboardAside({
  recommendedNews,
  weatherCities,
  copy,
  language,
}: DashboardAsideProps) {
  const [activeCityIndex, setActiveCityIndex] = useState<number>(0);
  const [cities, setCities] = useState<WeatherCity[]>(weatherCities);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [citySearch, setCitySearch] = useState<string>("");
  const [cityError, setCityError] = useState<string>("");
  const [imageFallbackByCityId, setImageFallbackByCityId] = useState<Record<string, boolean>>(
    {},
  );
  const cityStripRef = useRef<HTMLDivElement | null>(null);
  const weatherAddWrapRef = useRef<HTMLDivElement | null>(null);

  useHorizontalWheelScroll(cityStripRef);
  useOutsideClick([weatherAddWrapRef], () => setIsAddOpen(false), {
    enabled: isAddOpen,
  });

  useEffect(() => {
    setCities(weatherCities);
    setActiveCityIndex(0);
    setIsAddOpen(false);
    setCitySearch("");
    setCityError("");
    setImageFallbackByCityId({});
  }, [weatherCities, language]);

  const activeCity = useMemo<WeatherCity>(() => {
    if (cities.length === 0) {
      return {
        id: "fallback",
        city: "No City",
        country: "--",
        condition: "No data",
        updatedAt: "",
        stats: [],
      };
    }

    return cities[activeCityIndex] ?? cities[0];
  }, [activeCityIndex, cities]);

  const filteredCitySuggestions = useMemo(() => {
    const query = normalizeCityName(citySearch);

    return quickCitySuggestions.filter((cityName) => {
      const normalized = normalizeCityName(cityName);
      const alreadyExists = cities.some(
        (city) => normalizeCityName(city.city) === normalized,
      );

      if (alreadyExists) {
        return false;
      }

      if (query.length === 0) {
        return true;
      }

      return normalized.includes(query);
    });
  }, [cities, citySearch]);

  const handleMove = (direction: -1 | 1): void => {
    if (cities.length <= 1) {
      return;
    }

    setActiveCityIndex((previous) => {
      const next = previous + direction;

      if (next < 0) {
        return cities.length - 1;
      }

      if (next >= cities.length) {
        return 0;
      }

      return next;
    });
  };

  const handleAddCity = (candidate: string = citySearch): void => {
    const trimmed = candidate.trim();

    if (trimmed.length === 0) {
      return;
    }

    const alreadyExists = cities.some(
      (city) => normalizeCityName(city.city) === normalizeCityName(trimmed),
    );

    if (alreadyExists) {
      setCityError(copy.cityAlreadyAdded);
      return;
    }

    const generatedCity = buildGeneratedCity(trimmed, language, copy.generatedCondition);

    setCities((previous) => {
      const next = [...previous, generatedCity];
      setActiveCityIndex(next.length - 1);
      return next;
    });

    setCitySearch("");
    setCityError("");
    setIsAddOpen(false);
  };

  return (
    <aside className="right-column" aria-label="Recommendation and weather area">
      <div className="weather-widget panel-card">
        <div className="weather-header">
          <h4>{copy.title}</h4>

          <div className="weather-nav-controls">
            <button
              type="button"
              className="weather-nav-btn"
              onClick={() => handleMove(-1)}
              aria-label={copy.prevCity}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              type="button"
              className="weather-nav-btn"
              onClick={() => handleMove(1)}
              aria-label={copy.nextCity}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <div className="weather-add-wrap" ref={weatherAddWrapRef}>
              <button
                type="button"
                className="weather-add-btn"
                onClick={() => {
                  setIsAddOpen((previous) => !previous);
                  setCityError("");
                }}
                aria-label={copy.addCity}
                title={copy.addCity}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              {isAddOpen ? (
                <div className="weather-add-popover" role="dialog" aria-label={copy.addCity}>
                  <div className="weather-add-row">
                    <input
                      type="text"
                      value={citySearch}
                      placeholder={copy.searchCityPlaceholder}
                      onChange={(event) => {
                        setCitySearch(event.target.value);
                        if (cityError.length > 0) {
                          setCityError("");
                        }
                      }}
                    />
                    <button type="button" onClick={() => handleAddCity()}>
                      {copy.addCityAction}
                    </button>
                  </div>

                  {cityError.length > 0 ? <p className="weather-add-error">{cityError}</p> : null}

                  <ul className="weather-suggest-list" aria-label="Suggested cities">
                    {filteredCitySuggestions.map((cityName) => (
                      <li key={cityName}>
                        <button
                          type="button"
                          onClick={() => {
                            handleAddCity(cityName);
                          }}
                        >
                          {cityName}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className="weather-city-strip"
          role="tablist"
          aria-label="City selection"
          ref={cityStripRef}
        >
          {cities.map((city, index) => (
            <button
              key={city.id}
              type="button"
              role="tab"
              aria-selected={index === activeCityIndex}
              className={`weather-city-btn${index === activeCityIndex ? " is-active" : ""}`}
              onClick={() => setActiveCityIndex(index)}
            >
              {city.city}
            </button>
          ))}
        </div>

        <div className="weather-city-image" aria-label={`Image for ${activeCity.city}`}>
          {activeCity.imageUrl !== undefined && !imageFallbackByCityId[activeCity.id] ? (
            <img
              src={activeCity.imageUrl}
              alt={`View of ${activeCity.city}`}
              loading="lazy"
              onError={() => {
                setImageFallbackByCityId((previous) => ({
                  ...previous,
                  [activeCity.id]: true,
                }));
              }}
            />
          ) : (
            <span>img</span>
          )}
        </div>

        <div className="weather-city-meta">
          <p className="weather-city-name">
            {activeCity.city}, {activeCity.country}
          </p>
          <p className="weather-city-condition">{activeCity.condition}</p>
          <p className="weather-city-updated">
            {copy.updatedPrefix}: {activeCity.updatedAt}
          </p>
        </div>

        <div key={activeCity.id} className="weather-stats weather-stats-animated">
          {activeCity.stats.map((item) => (
            <div key={item.label} className="weather-stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <details className="widget-accordion panel-card" open>
        <summary className="widget-accordion-header">{copy.recommendedNews}</summary>
        <div className="widget-accordion-body">
          {recommendedNews.map((headline) => (
            <article key={headline.id} className="news-card" role="button" tabIndex={0}>
              <div className="news-thumb" aria-hidden="true" />
              <div className="news-copy">
                <h5>{headline.title}</h5>
                <p>{headline.source}</p>
              </div>
            </article>
          ))}
        </div>
      </details>
    </aside>
  );
}

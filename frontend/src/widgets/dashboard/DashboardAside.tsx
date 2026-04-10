import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";

import type {
  Language,
  NewsItem,
  WeatherCity,
  WeatherHourlyPoint,
} from "../../features/chat/types/chat";
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

type HourlyWeatherState = "sun" | "cloud" | "rain" | "storm";

interface HourlyForecastDisplay extends WeatherHourlyPoint {
  humidity: string;
  state: HourlyWeatherState;
  stateLabel: string;
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

const buildHourlyForecast = (baseTemperature: number): WeatherHourlyPoint[] => {
  const startHour = new Date().getHours();

  return Array.from({ length: 8 }, (_, index) => {
    const hour = (startHour + index) % 24;
    const wave = Math.round(Math.sin((index / 7) * Math.PI) * 2);
    const drift = index > 5 ? -1 : 0;

    return {
      hour: `${hour.toString().padStart(2, "0")}:00`,
      temperature: `${baseTemperature + wave + drift}C`,
    };
  });
};

const resolveBaseTemperature = (city: WeatherCity): number => {
  const rawTemperature = city.stats.find((item) => item.label.toLowerCase().includes("temp"))?.value;

  if (rawTemperature === undefined) {
    return 18;
  }

  const parsed = Number.parseInt(rawTemperature, 10);
  return Number.isNaN(parsed) ? 18 : parsed;
};

const resolveBaseStatNumber = (city: WeatherCity, key: string, fallback: number): number => {
  const statValue = city.stats.find((item) => item.label.toLowerCase().includes(key))?.value;

  if (statValue === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(statValue, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const resolveHourlyState = (
  humidity: number,
  windSpeed: number,
  conditionText: string,
): HourlyWeatherState => {
  const lowerCondition = conditionText.toLowerCase();

  if (lowerCondition.includes("storm") || windSpeed >= 28) {
    return "storm";
  }

  if (lowerCondition.includes("rain") || humidity >= 72) {
    return "rain";
  }

  if (lowerCondition.includes("sun") || humidity <= 45) {
    return "sun";
  }

  return "cloud";
};

const renderStateIcon = (state: HourlyWeatherState): JSX.Element => {
  if (state === "sun") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
      </svg>
    );
  }

  if (state === "rain") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 14a4 4 0 0 1 4-4 5 5 0 0 1 9.5 1.2A3.5 3.5 0 0 1 18 18H7a3 3 0 0 1-3-4z" />
        <line x1="9" y1="19" x2="8" y2="22" />
        <line x1="13" y1="19" x2="12" y2="22" />
      </svg>
    );
  }

  if (state === "storm") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 14a4 4 0 0 1 4-4 5 5 0 0 1 9.5 1.2A3.5 3.5 0 0 1 18 18H8" />
        <polyline points="13 15 10 20 13 20 11 24" />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14a4 4 0 0 1 4-4 5 5 0 0 1 9.5 1.2A3.5 3.5 0 0 1 18 18H7a3 3 0 0 1-3-4z" />
    </svg>
  );
};

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
    hourlyForecast: buildHourlyForecast(temperature),
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
  const hourlyScrollRef = useRef<HTMLDivElement | null>(null);
  const weatherAddWrapRef = useRef<HTMLDivElement | null>(null);
  const isHourlyDraggingRef = useRef<boolean>(false);
  const hourlyDragStartXRef = useRef<number>(0);
  const hourlyDragStartScrollRef = useRef<number>(0);
  const [isHourlyDragging, setIsHourlyDragging] = useState<boolean>(false);

  useHorizontalWheelScroll(cityStripRef);
  useHorizontalWheelScroll(hourlyScrollRef);
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

  const activeHourlyForecast = useMemo(() => {
    if (activeCity.hourlyForecast !== undefined && activeCity.hourlyForecast.length > 0) {
      return activeCity.hourlyForecast;
    }

    return buildHourlyForecast(resolveBaseTemperature(activeCity));
  }, [activeCity]);

  const activeHourlyDisplay = useMemo<HourlyForecastDisplay[]>(() => {
    const baseHumidity = resolveBaseStatNumber(activeCity, "humid", 58);
    const baseWind = resolveBaseStatNumber(activeCity, "wind", 16);
    const stateLabels = language === "de"
      ? {
        sun: "Sonne",
        cloud: "Wolke",
        rain: "Regen",
        storm: "Sturm",
      }
      : {
        sun: "Sun",
        cloud: "Cloud",
        rain: "Rain",
        storm: "Storm",
      };

    return activeHourlyForecast.map((point, index) => {
      const humidity = Math.min(96, Math.max(28, baseHumidity + ((index % 4) - 1) * 5));
      const windSpeed = Math.max(4, baseWind + ((index % 5) - 2) * 2);
      const state = resolveHourlyState(humidity, windSpeed, activeCity.condition);

      return {
        ...point,
        humidity: `${humidity}%`,
        state,
        stateLabel: stateLabels[state],
      };
    });
  }, [activeCity.condition, activeCity, activeHourlyForecast, language]);

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

  const handleHourlyPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const scrollElement = hourlyScrollRef.current;

    if (scrollElement === null) {
      return;
    }

    isHourlyDraggingRef.current = true;
    hourlyDragStartXRef.current = event.clientX;
    hourlyDragStartScrollRef.current = scrollElement.scrollLeft;
    setIsHourlyDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleHourlyPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!isHourlyDraggingRef.current) {
      return;
    }

    const scrollElement = hourlyScrollRef.current;

    if (scrollElement === null) {
      return;
    }

    const delta = event.clientX - hourlyDragStartXRef.current;
    scrollElement.scrollLeft = hourlyDragStartScrollRef.current - delta;
  };

  const handleHourlyPointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    if (isHourlyDraggingRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    isHourlyDraggingRef.current = false;
    setIsHourlyDragging(false);
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

        <div className="weather-hourly-block" aria-label={copy.hourlyForecastTitle}>
          <p className="weather-hourly-title">{copy.hourlyForecastTitle}</p>
          <div
            ref={hourlyScrollRef}
            className={`weather-hourly-scroll-box${isHourlyDragging ? " is-dragging" : ""}`}
            onPointerDown={handleHourlyPointerDown}
            onPointerMove={handleHourlyPointerMove}
            onPointerUp={handleHourlyPointerEnd}
            onPointerCancel={handleHourlyPointerEnd}
            onPointerLeave={handleHourlyPointerEnd}
          >
            <div className="weather-hourly-track">
              {activeHourlyDisplay.map((point) => (
                <article key={`${point.hour}-${point.temperature}`} className="weather-hourly-row-item">
                  <span className={`weather-hourly-state is-${point.state}`}>
                    {renderStateIcon(point.state)}
                  </span>
                  <div className="weather-hourly-copy">
                    <strong>{point.hour}</strong>
                    <span>{point.temperature}</span>
                    <small>{point.humidity} · {point.stateLabel}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
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

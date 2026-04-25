import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type HourlyWeatherState = "sun" | "cloud" | "rain" | "storm" | "wind";

interface HourlyForecastDisplay extends WeatherHourlyPoint {
  humidity: string;
  feelsLike: string;
  state: HourlyWeatherState;
  stateLabel: string;
}

const quickCitySuggestions: string[] = [
  "Berlin",
  "Hamburg",
  "München",
  "Köln",
  "Frankfurt",
  "Stuttgart",
  "Düsseldorf",
  "Dortmund",
  "Bremen",
  "Nürnberg",
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

const DAY_LABELS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CITY_COUNTRY_CODES: Record<string, string> = {
  berlin: "DE",
  hamburg: "DE",
  munchen: "DE",
  muenchen: "DE",
  koln: "DE",
  koeln: "DE",
  frankfurt: "DE",
  stuttgart: "DE",
  dusseldorf: "DE",
  duesseldorf: "DE",
  dortmund: "DE",
  bremen: "DE",
  nurnberg: "DE",
  nuernberg: "DE",
  leipzig: "DE",
  dresden: "DE",
  hannover: "DE",
  paris: "FR",
  marseille: "FR",
  lyon: "FR",
  london: "GB",
  manchester: "GB",
  barcelona: "ES",
  madrid: "ES",
  lisbon: "PT",
  lissabon: "PT",
  rome: "IT",
  rom: "IT",
  milan: "IT",
  mailand: "IT",
  vienna: "AT",
  wien: "AT",
  prague: "CZ",
  prag: "CZ",
  amsterdam: "NL",
  zurich: "CH",
  zuerich: "CH",
  copenhagen: "DK",
  kopenhagen: "DK",
  stockholm: "SE",
  oslo: "NO",
  warsaw: "PL",
  warschau: "PL",
  istanbul: "TR",
  "new york": "US",
  newyork: "US",
  "los angeles": "US",
  losangeles: "US",
  chicago: "US",
  toronto: "CA",
  tokyo: "JP",
  tokio: "JP",
  osaka: "JP",
  seoul: "KR",
  singapore: "SG",
  singapur: "SG",
  sydney: "AU",
  melbourne: "AU",
};

const resolveCityCountryCode = (cityName: string): string => {
  const key = cityName
    .trim()
    .toLowerCase()
    .replace(/[äöüß]/g, (character) => {
      const replacements: Record<string, string> = { ä: "a", ö: "o", ü: "u", ß: "ss" };
      return replacements[character] ?? character;
    });

  return CITY_COUNTRY_CODES[key] ?? "—";
};

// Daily weather profiles — one entry per day, drives temperature, humidity and wind character
// humidityBase + windBase control which hourly state is resolved:
//   humidity >= 90 && wind >= 25  → storm (Gewitter)
//   wind >= 28                    → wind (Sturmböen)
//   humidity >= 72                → rain
//   humidity <= 45                → sun
const DAY_PROFILES: Array<{
  tempOffset: number;
  humidityBase: number;
  feelsOffset: number;
  windBase: number;
  /** Humidity band for specific hour windows within the day [fromH, toH, humidity] */
  hourlyHumidity?: Array<[number, number, number]>;
  /** Wind band overrides [fromH, toH, wind] */
  hourlyWind?: Array<[number, number, number]>;
}> = [
  // Day 0 — warm, sunny, pleasant
  { tempOffset: +6,  humidityBase: 38, feelsOffset: +1, windBase: 10 },
  // Day 1 — hot summer day, dry
  { tempOffset: +12, humidityBase: 32, feelsOffset: +2, windBase:  8 },
  // Day 2 — muggy, clouds building
  { tempOffset: +8,  humidityBase: 62, feelsOffset: +3, windBase: 12 },
  // Day 3 — heavy rain all day, temperature drops sharply
  {
    tempOffset: -2,  humidityBase: 82, feelsOffset: -4, windBase: 18,
    hourlyHumidity: [[0, 23, 84]],
  },
  // Day 4 — Gewitter (thunderstorm): afternoon + night surge of humidity+wind
  {
    tempOffset: -8,  humidityBase: 70, feelsOffset: -5, windBase: 20,
    hourlyHumidity: [[10, 22, 93]],
    hourlyWind:     [[10, 22, 30]],
  },
  // Day 5 — Sturmböen (gusts) all day, cool, after-storm clearing rain in morning
  {
    tempOffset: -12, humidityBase: 58, feelsOffset: -7, windBase: 32,
    hourlyHumidity: [[0, 9, 78]],
    hourlyWind:     [[0, 23, 34]],
  },
  // Day 6 — Clearing, sun returns, mild temperatures
  { tempOffset: +2,  humidityBase: 44, feelsOffset: -1, windBase: 11 },
];

const buildHourlyForecast = (baseTemperature: number): WeatherHourlyPoint[] => {
  const now = new Date();
  const startHour = now.getHours();
  const startDayOfWeek = now.getDay(); // 0 = Sunday

  return Array.from({ length: 168 }, (_, index) => {
    const totalHour = startHour + index;
    const absoluteHour = totalHour % 24;
    const dayOffset = Math.floor(totalHour / 24);
    const profile = DAY_PROFILES[dayOffset % DAY_PROFILES.length] ?? DAY_PROFILES[0];

    // Diurnal temperature curve: peaks around 14:00
    const hourAngle = ((absoluteHour - 6) / 24) * Math.PI * 2 + Math.PI / 2;
    const diurnal = Math.round(Math.sin(hourAngle) * 5);
    const nightDrop = absoluteHour >= 22 || absoluteHour <= 5 ? -3 : 0;

    const temperature = baseTemperature + profile.tempOffset + diurnal + nightDrop;
    const feelsLike = temperature + profile.feelsOffset + (absoluteHour % 3 === 1 ? -1 : 0);

    // Resolve per-hour humidity from bands, falling back to daily base with small sine variation
    let humHourly: number;
    const humBand = profile.hourlyHumidity?.find(([fh, th]) => absoluteHour >= fh && absoluteHour <= th);
    if (humBand) {
      humHourly = Math.min(96, Math.max(24, humBand[2] + Math.round(Math.sin((absoluteHour / 24) * Math.PI * 2) * 4)));
    } else {
      humHourly = Math.min(86, Math.max(24, profile.humidityBase + Math.round(Math.sin((absoluteHour / 24) * Math.PI * 2) * 8)));
    }

    // Resolve per-hour wind from bands, falling back to daily base
    const windBand = profile.hourlyWind?.find(([fh, th]) => absoluteHour >= fh && absoluteHour <= th);
    const windHourly = windBand
      ? windBand[2] + (index % 3) * 2
      : profile.windBase + ((index % 5) - 2);

    const dayIndex = (startDayOfWeek + dayOffset) % 7;

    return {
      hour: `${absoluteHour.toString().padStart(2, "0")}:00`,
      temperature: `${temperature}C`,
      feelsLike: `${feelsLike}C`,
      dayLabel: `${DAY_LABELS_DE[dayIndex]}-${DAY_LABELS_EN[dayIndex]}`,
      dayOffset,
      humidityOverride: humHourly,
      windOverride: windHourly,
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

  if (
    lowerCondition.includes("storm")
    || lowerCondition.includes("thunder")
    || lowerCondition.includes("lightning")
    || (humidity >= 90 && windSpeed >= 25)
  ) {
    return "storm";
  }

  if (windSpeed >= 28) {
    return "wind";
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

  if (state === "wind") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 8h12a3 3 0 1 0-3-3" />
        <path d="M3 12h16a3 3 0 1 1-3 3" />
        <path d="M3 16h9" />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14a4 4 0 0 1 4-4 5 5 0 0 1 9.5 1.2A3.5 3.5 0 0 1 18 18H7a3 3 0 0 1-3-4z" />
    </svg>
  );
};

// ─── Weather icon path strings — swap these to customise icons ────────────────
// viewBox: 0 0 24 24. Paths follow SVG 'd' attribute format.
const WEATHER_ICON_SVG_PATHS: Record<HourlyWeatherState, string> = {
  sun:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3"
    + "M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  cloud: "M4 14a4 4 0 0 1 4-4 5 5 0 0 1 9.5 1.2A3.5 3.5 0 0 1 18 18H7a3 3 0 0 1-3-4z",
  rain:  "M4 14a4 4 0 0 1 4-4 5 5 0 0 1 9.5 1.2A3.5 3.5 0 0 1 18 18H7a3 3 0 0 1-3-4zM9 19l-1 3M13 19l-1 3",
  storm: "M4 14a4 4 0 0 1 4-4 5 5 0 0 1 9.5 1.2A3.5 3.5 0 0 1 18 18H8M13 15l-3 5h3l-2 4",
  wind:  "M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h9",
};

// ─── Catmull-Rom spline → SVG cubic bezier ────────────────────────────────────
const buildSmoothPath = (pts: ReadonlyArray<[number, number]>): string => {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;

  let d = `M ${pts[0][0]} ${pts[0][1]}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2[0]} ${p2[1]}`;
  }

  return d;
};

// ─── Graph layout constants ────────────────────────────────────────────────────
const GRAPH_COL_W = 68;      // pixels per hour column
const GRAPH_PLOT_H = 140;    // chart plot area height (px)
const GRAPH_CHART_TOP = 8;   // Y where chart starts (reserves space above for tooltips)
const GRAPH_Y_W = 40;        // left width for Y-axis labels
const GRAPH_SVG_H = GRAPH_CHART_TOP + GRAPH_PLOT_H;

interface WeatherGraphProps {
  points: HourlyForecastDisplay[];
  showFeelsLike: boolean;
  onToggle: () => void;
  title: string;
  feelsLikeLabel: string;
  language: Language;
}

function WeatherGraph({
  points,
  showFeelsLike,
  onToggle,
  title,
  feelsLikeLabel,
  language,
}: WeatherGraphProps): JSX.Element {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [yViewBot, setYViewBot] = useState(-30);
  const [panX, setPanX] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startYViewBot: number;
    maxPanX: number;
  } | null>(null);

  const totalDays = Math.ceil(points.length / 24);
  const dayPoints = useMemo(
    () => points.slice(dayIdx * 24, (dayIdx + 1) * 24),
    [points, dayIdx],
  );

  useEffect(() => {
    setHoveredIdx(null);
    setYViewBot(-30);
    setPanX(0);
  }, [dayIdx]);

  const n = dayPoints.length;
  const contentSvgW = n * GRAPH_COL_W;         // chart area width (no Y-axis column)
  const svgW = GRAPH_Y_W + contentSvgW;        // full SVG width (kept for backward-compat)
  const bottomY = GRAPH_CHART_TOP + GRAPH_PLOT_H;

  const temps = useMemo(
    () => dayPoints.map((p) => parseInt(p.temperature, 10) || 0),
    [dayPoints],
  );

  const feelsTemps = useMemo(
    () => dayPoints.map((p) => parseInt(p.feelsLike, 10) || 0),
    [dayPoints],
  );

  // activeTemps is always the main temp curve; used for hover dot on main curve
  const activeTemps = temps;

  // Extended Y range: consider both curves so the scrollbar doesn't flicker on toggle
  const allDisplayTemps = useMemo(
    () => [...temps, ...feelsTemps],
    [temps, feelsTemps],
  );

  const extTop = useMemo(() => {
    const dataMax = allDisplayTemps.length ? Math.max(...allDisplayTemps) : 30;
    if (dataMax <= 30) return 30;
    return 30 + Math.ceil((dataMax - 30) / 15) * 15;
  }, [allDisplayTemps]);

  const extBot = useMemo(() => {
    const dataMin = allDisplayTemps.length ? Math.min(...allDisplayTemps) : -30;
    if (dataMin >= -30) return -30;
    return -30 - Math.ceil((-30 - dataMin) / 15) * 15;
  }, [allDisplayTemps]);

  const needsYScroll = extTop > 30 || extBot < -30;
  const totalYRange = extTop - extBot; // always a multiple of 15, ≥ 60

  // Phantom boundary points — temp curve
  const phantomPrevT = useMemo(() => {
    if (dayIdx === 0) return null;
    const pt = points[dayIdx * 24 - 1];
    if (!pt) return null;
    return parseInt(pt.temperature, 10) || 0;
  }, [dayIdx, points]);

  const phantomNextT = useMemo(() => {
    const pt = points[(dayIdx + 1) * 24];
    if (!pt) return null;
    return parseInt(pt.temperature, 10) || 0;
  }, [dayIdx, points]);

  // Phantom boundary points — feels-like curve
  const phantomPrevF = useMemo(() => {
    if (dayIdx === 0) return null;
    const pt = points[dayIdx * 24 - 1];
    if (!pt) return null;
    return parseInt(pt.feelsLike ?? pt.temperature, 10) || 0;
  }, [dayIdx, points]);

  const phantomNextF = useMemo(() => {
    const pt = points[(dayIdx + 1) * 24];
    if (!pt) return null;
    return parseInt(pt.feelsLike ?? pt.temperature, 10) || 0;
  }, [dayIdx, points]);

  // Dynamic Y-axis: clamp current view position to valid range
  const clampedYViewBot = Math.min(Math.max(yViewBot, extBot), extTop - 60);
  const minT = clampedYViewBot;
  const rangeT = 60;

  const buildCurvePaths = useCallback((curveTemps: number[], prevPhantom: number | null, nextPhantom: number | null) => {
    const hasPrev = prevPhantom !== null;
    const hasNext = nextPhantom !== null;
    const extTemps = [
      ...(hasPrev && prevPhantom !== null ? [prevPhantom] : []),
      ...curveTemps,
      ...(hasNext && nextPhantom !== null ? [nextPhantom] : []),
    ];
    const prevOffset = hasPrev ? 1 : 0;
    const tx = (extIdx: number) => (extIdx - prevOffset + 0.5) * GRAPH_COL_W;
    const ty = (t: number) =>
      GRAPH_CHART_TOP + GRAPH_PLOT_H - ((t - minT) / rangeT) * GRAPH_PLOT_H;
    const pts: Array<[number, number]> = extTemps.map((t, i) => [tx(i), ty(t)]);
    const pathStr = buildSmoothPath(pts);
    const rightEdge = curveTemps.length * GRAPH_COL_W;
    const area =
      pts.length > 0
        ? `${pathStr} L ${rightEdge} ${GRAPH_CHART_TOP + GRAPH_PLOT_H} L 0 ${GRAPH_CHART_TOP + GRAPH_PLOT_H} Z`
        : "";
    return { linePathStr: pathStr, areaPathStr: area };
  }, [minT, rangeT]);

  const { linePathStr, areaPathStr } = useMemo(
    () => buildCurvePaths(temps, phantomPrevT, phantomNextT),
    [buildCurvePaths, temps, phantomPrevT, phantomNextT],
  );

  const { linePathStr: feelsLinePathStr, areaPathStr: feelsAreaPathStr } = useMemo(
    () => buildCurvePaths(feelsTemps, phantomPrevF, phantomNextF),
    [buildCurvePaths, feelsTemps, phantomPrevF, phantomNextF],
  );

  const yTicks = useMemo(() => {
    const top = clampedYViewBot + 60;
    return [top, top - 15, top - 30, top - 45];
  }, [clampedYViewBot]);

  const rainGroups = useMemo(() => {
    const groups: Array<{ start: number; end: number; groupType: "rain" | "storm" | "wind" }> = [];
    let gStart: number | null = null;
    let gType: "rain" | "storm" | "wind" = "rain";

    for (let i = 0; i <= dayPoints.length; i++) {
      const pt = dayPoints[i];
      const wet = pt !== undefined && (pt.state === "rain" || pt.state === "storm" || pt.state === "wind");

      if (wet && pt !== undefined) {
        if (gStart === null) {
          gStart = i;
          gType = pt.state as "rain" | "storm" | "wind";
        } else {
          // storm/wind takes priority over rain within a group
          if (pt.state === "storm") gType = "storm";
          else if (pt.state === "wind" && gType === "rain") gType = "wind";
        }
      } else if (gStart !== null) {
        groups.push({ start: gStart, end: i - 1, groupType: gType });
        gStart = null;
        gType = "rain";
      }
    }

    return groups;
  }, [dayPoints]);

  const toX = (i: number) => (i + 0.5) * GRAPH_COL_W;
  const toY = (t: number) =>
    GRAPH_CHART_TOP + GRAPH_PLOT_H - ((t - minT) / rangeT) * GRAPH_PLOT_H;

  // ── Drag-to-pan handlers ────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const viewportWidth = viewportRef.current?.clientWidth ?? 0;
    const maxPanX = Math.max(0, contentSvgW - viewportWidth);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panX,
      startYViewBot: clampedYViewBot,
      maxPanX,
    };
    e.preventDefault();
  }, [panX, clampedYViewBot, contentSvgW]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setPanX(Math.max(0, Math.min(d.maxPanX, d.startPanX - dx)));
    setYViewBot(d.startYViewBot + dy / (GRAPH_PLOT_H / rangeT));
  }, [rangeT]);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  const hovered = hoveredIdx !== null ? (dayPoints[hoveredIdx] ?? null) : null;
  const hoveredT = hoveredIdx !== null ? (temps[hoveredIdx] ?? 0) : 0;
  const hoveredF = hoveredIdx !== null ? (feelsTemps[hoveredIdx] ?? 0) : 0;

  const tipW = 82;
  const tipH = 68;
  // When both curves shown, place temp-tip above curve, feels-tip also above its curve
  const tipX =
    hoveredIdx !== null
      ? Math.min(Math.max(toX(hoveredIdx) - tipW / 2, 0), contentSvgW - tipW)
      : 0;
  const tipY =
    hoveredIdx !== null
      ? Math.max(toY(hoveredT) - tipH - 12, 4)
      : 0;
  const feelsTipY =
    hoveredIdx !== null
      ? Math.max(toY(hoveredF) - tipH - 12, 4)
      : 0;
  const feelsTipX =
    hoveredIdx !== null
      ? Math.min(Math.max(toX(hoveredIdx) - tipW / 2, 0), contentSvgW - tipW)
      : 0;

  return (
    <div className="weather-graph-wrap">
      <div className="weather-graph-header">
        <p className="weather-hourly-title">{title}</p>
        <div className="wg-day-nav">
          <button
            type="button"
            className="wg-day-nav-btn"
            onClick={() => setDayIdx((d) => Math.max(0, d - 1))}
            disabled={dayIdx === 0}
            aria-label="Previous day"
          >
            ‹
          </button>
          <span className="wg-day-nav-label">
            {dayPoints[0]?.dayLabel
              ? language === "de"
                ? dayPoints[0].dayLabel.split("-")[0]
                : dayPoints[0].dayLabel.split("-")[1]
              : ""}
          </span>
          <button
            type="button"
            className="wg-day-nav-btn"
            onClick={() => setDayIdx((d) => Math.min(totalDays - 1, d + 1))}
            disabled={dayIdx === totalDays - 1}
            aria-label="Next day"
          >
            ›
          </button>
        </div>
        <button
          type="button"
          className={`weather-feels-btn${showFeelsLike ? " is-active" : ""}`}
          onClick={onToggle}
        >
          {feelsLikeLabel}
        </button>
      </div>

      <div
        className="weather-graph-scroll"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Y-axis column — fixed, never pans */}
        <div className="wg-yaxis-col">
          <svg width={GRAPH_Y_W} height={GRAPH_SVG_H} className="wg-yaxis-svg">
            {yTicks.map((tick) => (
              <text key={tick} x={GRAPH_Y_W / 2} y={toY(tick) + 4} className="wg-y-label">
                {Math.round(tick)}°
              </text>
            ))}
            {needsYScroll && (() => {
              const trackX = 2;
              const trackW = 4;
              const trackY = GRAPH_CHART_TOP;
              const trackH = GRAPH_PLOT_H;
              const scrollRange = totalYRange - 60;
              const thumbH = Math.max(20, Math.round(trackH * 60 / totalYRange));
              const thumbTravel = trackH - thumbH;
              const normalizedPos = scrollRange > 0
                ? (clampedYViewBot - extBot) / scrollRange
                : 0;
              const thumbY = trackY + (1 - normalizedPos) * thumbTravel;
              return (
                <>
                  <rect x={trackX} y={trackY} width={trackW} height={trackH} rx={2} className="wg-yscroll-track" />
                  <rect x={trackX} y={thumbY} width={trackW} height={thumbH} rx={2} className="wg-yscroll-thumb" />
                </>
              );
            })()}
          </svg>
        </div>

        {/* Chart viewport — clips overflow, receives horizontal pan */}
        <div className="weather-graph-viewport" ref={viewportRef}>
          <div className="weather-graph-inner" style={{ width: `${contentSvgW}px`, transform: `translateX(-${panX}px)` }}>
            {/* Icon area */}
            <div className="wg-icon-area">

            {/* Time labels row — topmost */}
            <div className="wg-labels-row">
              {dayPoints.map((point, i) => (
                <div
                  key={i}
                  className={`wg-label-cell${point.hour === "00:00" && i > 0 ? " is-day-start" : ""}`}
                  style={{ width: `${GRAPH_COL_W}px` }}
                >
                  {point.hour}
                </div>
              ))}
            </div>

            {/* Weather icon row */}
            <div className="wg-icons-row">
              {dayPoints.map((point, i) => (
                <div
                  key={i}
                  className="wg-icon-cell"
                  style={{ width: `${GRAPH_COL_W}px` }}
                >
                  <span className={`weather-hourly-state is-${point.state}`}>
                    {renderStateIcon(point.state)}
                  </span>
                </div>
              ))}
            </div>

            {/* Temperature row — below icons, above graph */}
            <div className="wg-temp-row">
              {dayPoints.map((point, i) => (
                <div
                  key={i}
                  className="wg-temp-cell"
                  style={{ width: `${GRAPH_COL_W}px` }}
                >
                  {parseInt(showFeelsLike ? point.feelsLike ?? point.temperature : point.temperature, 10)}°
                </div>
              ))}
            </div>
            </div>

            <svg
              width={contentSvgW}
              height={GRAPH_SVG_H}
              className="weather-graph-svg"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                <linearGradient id="wg-temp-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--feature-lilac)" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="var(--feature-lilac)" stopOpacity="0.03" />
                </linearGradient>
                <linearGradient id="wg-feels-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5f83ff" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#5f83ff" stopOpacity="0.03" />
                </linearGradient>
                <clipPath id="wg-plot-clip">
                  <rect x={0} y={0} width={contentSvgW} height={GRAPH_SVG_H + 4} />
              </clipPath>
              </defs>

              {/* Y-axis gridlines (labels are in wg-yaxis-col, not here) */}
              {yTicks.map((tick) => (
                <line
                  key={tick}
                  x1={0}
                  y1={toY(tick)}
                  x2={contentSvgW}
                  y2={toY(tick)}
                  className="wg-grid-line"
                />
              ))}

              {/* Rain / storm / wind column highlights with animation */}
            {rainGroups.map(({ start, end, groupType }) => {
              const gx = start * GRAPH_COL_W;
              const gy = GRAPH_CHART_TOP;
              const gw = (end - start + 1) * GRAPH_COL_W;
              const gh = GRAPH_PLOT_H;
              const clipId = `wg-rg-clip-${start}`;

              // Rain drops: one column per ~28px, staggered delay
              const rainDrops = groupType === "rain" ? Array.from(
                { length: Math.ceil(gw / 28) },
                (_, c) => {
                  const cx = gx + 10 + c * 28;
                  return (
                    <line
                      key={c}
                      x1={cx} y1={gy}
                      x2={cx - 3} y2={gy + 10}
                      stroke="rgba(100,160,255,0.65)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      className="wg-rain-drop"
                      style={{ animationDelay: `${((c * 0.17) % 0.6).toFixed(2)}s` }}
                    />
                  );
                }
              ) : null;

              // Lightning bolts: one per ~80px, flashing
              const boltEls = groupType === "storm" ? Array.from(
                { length: Math.max(1, Math.ceil(gw / 80)) },
                (_, c) => {
                  const bx = gx + 28 + c * 80;
                  const by = gy + gh * 0.12;
                  const bh = gh * 0.55;
                  return (
                    <path
                      key={c}
                      d={`M ${bx} ${by} L ${bx - 5} ${by + bh * 0.45} L ${bx + 1} ${by + bh * 0.45} L ${bx - 4} ${by + bh}`}
                      stroke="rgba(255,220,40,0.95)"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      fill="none"
                      className="wg-bolt-anim"
                      style={{ animationDelay: `${(c * 0.9).toFixed(2)}s` }}
                    />
                  );
                }
              ) : null;

              // Wind lines: 4 rows of curved horizontal lines
              const windEls = groupType === "wind" ? Array.from({ length: 4 }, (_, r) => {
                const cy = gy + (r + 0.5) * (gh / 4);
                const len = 32 + (r % 2) * 14;
                const wx = gx + 6 + (r % 2) * 12;
                return (
                  <path
                    key={r}
                    d={`M ${wx} ${cy} Q ${wx + len / 2} ${cy - 5} ${wx + len} ${cy}`}
                    stroke="rgba(180,215,255,0.7)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                    className="wg-wind-anim"
                    style={{ animationDelay: `${(r * 0.28).toFixed(2)}s` }}
                  />
                );
              }) : null;

              return (
                <g key={`rain-${start}`}>
                  <defs>
                    <clipPath id={clipId}>
                      <rect x={gx} y={gy} width={gw} height={gh} />
                    </clipPath>
                  </defs>
                  <rect
                    x={gx} y={gy} width={gw} height={gh}
                    className={`wg-rain-fill is-${groupType}`}
                  />
                  <g clipPath={`url(#${clipId})`}>
                    {rainDrops}
                    {boltEls}
                    {windEls}
                  </g>
                </g>
              );
            })}

            {/* Midnight marker */}
            {dayPoints.map((point, i) => {
              const isMidnight = point.hour === "00:00" && i > 0;
              if (!isMidnight) return null;
              const x = i * GRAPH_COL_W;
              return (
                <line
                  key={`midnight-${i}`}
                  x1={x}
                  y1={GRAPH_CHART_TOP}
                  x2={x}
                  y2={GRAPH_CHART_TOP + GRAPH_PLOT_H}
                  className="wg-day-sep"
                />
              );
            })}

            {/* Gradient area fill + curve — main temperature */}
            <path
              d={areaPathStr}
              fill="url(#wg-temp-fill)"
              clipPath="url(#wg-plot-clip)"
            />
            <path
              d={linePathStr}
              fill="none"
              className="wg-line"
              clipPath="url(#wg-plot-clip)"
            />

            {/* Feels-like curve — only when toggled on */}
            {showFeelsLike && (
              <>
                <path
                  d={feelsAreaPathStr}
                  fill="url(#wg-feels-fill)"
                  clipPath="url(#wg-plot-clip)"
                />
                <path
                  d={feelsLinePathStr}
                  fill="none"
                  className="wg-line is-feels"
                  clipPath="url(#wg-plot-clip)"
                />
              </>
            )}

            {/* Hover vertical indicator */}
            {hoveredIdx !== null && (
              <line
                x1={toX(hoveredIdx)}
                y1={GRAPH_CHART_TOP}
                x2={toX(hoveredIdx)}
                y2={bottomY}
                className="wg-hover-line"
              />
            )}

            {/* Hover dot — main temp curve */}
            {hoveredIdx !== null && (
              <circle
                cx={toX(hoveredIdx)}
                cy={toY(hoveredT)}
                r={4}
                className="wg-hover-dot"
              />
            )}

            {/* Hover dot — feels-like curve */}
            {showFeelsLike && hoveredIdx !== null && (
              <circle
                cx={toX(hoveredIdx)}
                cy={toY(hoveredF)}
                r={4}
                className="wg-hover-dot is-feels"
              />
            )}

            {/* Tooltip — main temperature (only when feels-like is OFF) */}
            {!showFeelsLike && hovered !== null && hoveredIdx !== null && (
              <g className="wg-tooltip" style={{ pointerEvents: "none" }}>
                <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={8} className="wg-tooltip-bg" />
                <text x={tipX + tipW / 2} y={tipY + 15} className="wg-tooltip-time" textAnchor="middle">
                  {hovered.hour}
                </text>
                <g transform={`translate(${tipX + tipW / 2 - 8}, ${tipY + 19}) scale(0.67)`}>
                  <path
                    d={WEATHER_ICON_SVG_PATHS[hovered.state]}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <text x={tipX + tipW / 2} y={tipY + 46} className="wg-tooltip-temp" textAnchor="middle">
                  {hoveredT}°
                </text>
                <text x={tipX + tipW / 2} y={tipY + 61} className="wg-tooltip-hum" textAnchor="middle">
                  {hovered.humidity}
                </text>
              </g>
            )}

            {/* Tooltip — feels-like (only when feels-like is ON) */}
            {showFeelsLike && hovered !== null && hoveredIdx !== null && (
              <g className="wg-tooltip" style={{ pointerEvents: "none" }}>
                <rect x={feelsTipX} y={feelsTipY} width={tipW} height={tipH} rx={8} className="wg-tooltip-bg wg-tooltip-bg--feels" />
                <text x={feelsTipX + tipW / 2} y={feelsTipY + 15} className="wg-tooltip-time" textAnchor="middle">
                  {hovered.hour}
                </text>
                <g transform={`translate(${feelsTipX + tipW / 2 - 8}, ${feelsTipY + 19}) scale(0.67)`}>
                  <path
                    d={WEATHER_ICON_SVG_PATHS[hovered.state]}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <text x={feelsTipX + tipW / 2} y={feelsTipY + 46} className="wg-tooltip-temp is-feels" textAnchor="middle">
                  {hoveredF}°
                </text>
                <text x={feelsTipX + tipW / 2} y={feelsTipY + 61} className="wg-tooltip-hum" textAnchor="middle">
                  {hovered.humidity}
                </text>
              </g>
            )}

            {/* Invisible hit targets for hover detection */}
            {dayPoints.map((_, i) => (
              <rect
                key={i}
                x={i * GRAPH_COL_W}
                y={0}
                width={GRAPH_COL_W}
                height={GRAPH_SVG_H}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
              />
            ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    country: resolveCityCountryCode(cleanName),
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
  const weatherAddWrapRef = useRef<HTMLDivElement | null>(null);
  const [showFeelsLike, setShowFeelsLike] = useState<boolean>(false);

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

  const activeHourlyForecast = useMemo(() => {
    if (activeCity.hourlyForecast !== undefined && activeCity.hourlyForecast.length > 0) {
      return activeCity.hourlyForecast;
    }

    return buildHourlyForecast(resolveBaseTemperature(activeCity));
  }, [activeCity]);

  const activeHourlyDisplay = useMemo<HourlyForecastDisplay[]>(() => {
    const baseHumidity = resolveBaseStatNumber(activeCity, "humid", 58);
    const baseWind = resolveBaseStatNumber(activeCity, "wind", 16);
    const baseTemp = resolveBaseTemperature(activeCity);
    const baseFeelsLike = resolveBaseStatNumber(activeCity, "feels", baseTemp - 2);
    const feelsDiff = baseFeelsLike - baseTemp;
    const stateLabels = language === "de"
      ? { sun: "Sonne", cloud: "Wolke", rain: "Regen", storm: "Gewitter", wind: "Sturmböen" }
      : { sun: "Sun",   cloud: "Cloud", rain: "Rain",  storm: "Thunderstorm", wind: "Gusts" };

    return activeHourlyForecast.map((point, index) => {
      const humidity = point.humidityOverride !== undefined
        ? point.humidityOverride
        : Math.min(96, Math.max(28, baseHumidity + ((index % 4) - 1) * 5));
      const windSpeed = point.windOverride !== undefined
        ? point.windOverride
        : Math.max(4, baseWind + ((index % 5) - 2) * 2);
      const state = resolveHourlyState(humidity, windSpeed, activeCity.condition);
      const rawTemp = parseInt(point.temperature, 10);
      const feelsLike = point.feelsLike
        ?? `${(Number.isNaN(rawTemp) ? baseFeelsLike : rawTemp + feelsDiff + (index % 3 === 1 ? -1 : 0))}C`;

      return {
        ...point,
        humidity: `${humidity}%`,
        feelsLike,
        state,
        stateLabel: stateLabels[state],
      };
    });
  }, [activeCity, activeHourlyForecast, language]);

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

        <div key={activeCity.id} className="weather-stats-bar weather-stats-animated">
          {activeCity.stats.map((item, index) => (
            <span key={item.label} className="weather-stat-item">
              {index > 0 && <span className="weather-stat-sep" aria-hidden="true">|</span>}
              <span className="weather-stat-label">{item.label}</span>
              <strong className="weather-stat-value">{item.value}</strong>
            </span>
          ))}
        </div>

        <WeatherGraph
          points={activeHourlyDisplay}
          showFeelsLike={showFeelsLike}
          onToggle={() => { setShowFeelsLike((prev) => !prev); }}
          title={copy.hourlyForecastTitle}
          feelsLikeLabel={copy.feelsLikeToggle}
          language={language}
        />
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

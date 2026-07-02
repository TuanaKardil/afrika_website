import { JWT } from "google-auth-library";

const PROPERTY_ID = process.env.GA_PROPERTY_ID!;
const API_URL = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`;

async function getAccessToken(): Promise<string> {
  const raw = process.env.GA_SERVICE_ACCOUNT_JSON!;
  const creds = JSON.parse(raw);
  const client = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const token = await client.getAccessToken();
  return token.token!;
}

export interface GaOverview {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  avgSessionDuration: string;
  topPages: { path: string; views: number }[];
  topCountries: { country: string; users: number }[];
  dailyUsers: { date: string; users: number }[];
}

export async function fetchGaOverview(): Promise<GaOverview | null> {
  try {
    const token = await getAccessToken();

    const [mainRes, pagesRes, countriesRes, dailyRes] = await Promise.all([
      fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          metrics: [
            { name: "activeUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "averageSessionDuration" },
          ],
        }),
      }),
      fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 5,
        }),
      }),
      fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          dimensions: [{ name: "country" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 5,
        }),
      }),
      fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: "6daysAgo", endDate: "today" }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
      }),
    ]);

    const [main, pages, countries, daily] = await Promise.all([
      mainRes.json(),
      pagesRes.json(),
      countriesRes.json(),
      dailyRes.json(),
    ]);

    const row = main.rows?.[0]?.metricValues ?? [];
    const seconds = parseFloat(row[3]?.value ?? "0");
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return {
      activeUsers: parseInt(row[0]?.value ?? "0"),
      sessions: parseInt(row[1]?.value ?? "0"),
      pageViews: parseInt(row[2]?.value ?? "0"),
      avgSessionDuration: `${mins}d ${secs}s`,
      topPages: (pages.rows ?? []).map((r: { dimensionValues: {value: string}[]; metricValues: {value: string}[] }) => ({
        path: r.dimensionValues[0].value,
        views: parseInt(r.metricValues[0].value),
      })),
      topCountries: (countries.rows ?? []).map((r: { dimensionValues: {value: string}[]; metricValues: {value: string}[] }) => ({
        country: r.dimensionValues[0].value,
        users: parseInt(r.metricValues[0].value),
      })),
      dailyUsers: (daily.rows ?? []).map((r: { dimensionValues: {value: string}[]; metricValues: {value: string}[] }) => {
        const d = r.dimensionValues[0].value;
        return {
          date: `${d.slice(6, 8)}/${d.slice(4, 6)}`,
          users: parseInt(r.metricValues[0].value),
        };
      }),
    };
  } catch {
    return null;
  }
}

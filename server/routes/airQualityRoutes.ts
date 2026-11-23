import { Router } from 'express';
import { getLiveAirQualityBundle } from '../services/airQualityService.ts';
import { getUserProfile } from '../services/profileService.ts';

export const airQualityRouter = Router();

airQualityRouter.get('/', async (req, res) => {
  const queryLocation =
    typeof req.query.location === 'string' ? req.query.location.trim() : '';

  if (!queryLocation) {
    res.status(400).json({
      error: 'Missing required "location" query parameter (e.g. /api/air-quality?location=Pune).',
    });
    return;
  }

  const profile = await getUserProfile();
  const bundle = await getLiveAirQualityBundle(queryLocation, profile);

  const payload = {
    location: bundle.overview.location,
    resolvedLocation: bundle.overview.resolvedLocation,
    coordinates: bundle.overview.coordinates,
    status: bundle.overview.status,
    reason: bundle.overview.reason ?? null,
    station: bundle.overview.stationName
      ? {
          id: bundle.overview.stationId,
          name: bundle.overview.stationName,
          distanceKm: bundle.overview.stationDistanceKm,
        }
      : null,
    aqi: bundle.overview.aqi,
    aqiCategory: bundle.overview.aqiCategory,
    aqiPrimaryPollutant: bundle.overview.aqiPrimaryPollutant,
    measurements: {
      pm25: bundle.overview.pm25,
      pm10: bundle.overview.pm10,
    },
    pollutants: bundle.overview.pollutants,
    source: bundle.overview.dataSourceLabel,
    timestamp: bundle.overview.lastUpdatedIso,
    isStale: bundle.overview.isStale,
    message: bundle.overview.integrationNote,
    overview: bundle.overview,
    recommendations: bundle.recommendations,
    trends: bundle.trends,
  };

  res.status(bundle.httpStatus).json(payload);
});

airQualityRouter.get('/overview', async (req, res) => {
  const profile = await getUserProfile();
  const queryLocation =
    typeof req.query.location === 'string' ? req.query.location : profile.location;

  const bundle = await getLiveAirQualityBundle(queryLocation, profile);
  res.status(bundle.httpStatus).json({
    overview: bundle.overview,
    recommendations: bundle.recommendations,
    trends: bundle.trends,
  });
});

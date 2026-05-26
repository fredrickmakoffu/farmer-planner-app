// Activities API service
//
// API_LIVE = true  → simulates a real HTTP call (800ms latency, rare failures)
// API_LIVE = false → API is considered down; loads from the local mock calendar
//
// Flip API_LIVE to true when the real backend endpoint is wired in.

import type { PlanActivity } from "../domain/entities/activity"
import { buildActivitiesForDate } from "./activities-calendar"

export const API_LIVE = false

const API_LATENCY_MS = 800
const FALLBACK_LATENCY_MS = 150

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchFromApi(dateStr: string): Promise<PlanActivity[]> {
  await sleep(API_LATENCY_MS)
  // Simulate ~10% network error rate so the fallback path is exercised in dev
  if (Math.random() < 0.1) {
    throw new Error(`[activities-service] Network error fetching ${dateStr}`)
  }
  return buildActivitiesForDate(dateStr)
}

export async function getActivitiesForDay(dateStr: string): Promise<PlanActivity[]> {
  if (!API_LIVE) {
    // API is down — read directly from local mock calendar
    await sleep(FALLBACK_LATENCY_MS)
    return buildActivitiesForDate(dateStr)
  }

  try {
    return await fetchFromApi(dateStr)
  } catch (err) {
    console.warn("[activities-service] API failed, using local fallback:", err)
    return buildActivitiesForDate(dateStr)
  }
}

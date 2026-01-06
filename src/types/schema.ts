/**
 * Core domain models for Slow Luxury Travel service
 * Based on asia_golf_culture_itinerary_vietnam_osaka_seoul.md
 */

import { z } from 'zod';

// ============================================================================
// WELLNESS INTEGRATION (from CarePeers)
// ============================================================================

export const WellnessProfileSchema = z.object({
  userId: z.string(),
  who5Score: z.number().min(0).max(100),
  sleepQuality: z.number().min(1).max(5),
  energyLevel: z.enum(['low', 'medium', 'high']),
  stepsTarget: z.number().default(8000),
  dietaryRestrictions: z.array(z.string()).optional(),
  medicalConditions: z.array(z.string()).optional(),
  mobilityLevel: z.enum(['full', 'moderate', 'limited']).default('full'),
  medicationSchedule: z.array(z.object({
    name: z.string(),
    frequency: z.string(),
    timing: z.string(),
  })).optional(),
});

export type WellnessProfile = z.infer<typeof WellnessProfileSchema>;

// ============================================================================
// TRIP DOMAIN MODEL
// ============================================================================

export const TripSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(['planning', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  budget: z.object({
    currency: z.string().default('USD'),
    total: z.number(),
    spent: z.number().default(0),
    categories: z.object({
      flights: z.number(),
      hotels: z.number(),
      golf: z.number().optional(),
      food: z.number(),
      transport: z.number(),
      guides: z.number(),
      wellness: z.number().optional(),
    }),
  }),
  travelers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    wellnessProfileId: z.string().optional(),
  })),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Trip = z.infer<typeof TripSchema>;

// ============================================================================
// DAILY ITINERARY
// ============================================================================

export const DailyItinerarySchema = z.object({
  date: z.string().date(),
  tripId: z.string().uuid(),
  location: z.string(),
  energyLevel: z.enum(['low', 'medium', 'high']).optional(),
  sleepQuality: z.number().min(1).max(5).optional(),
  primaryIntent: z.enum(['golf', 'recovery', 'culture', 'transit', 'free']),
  schedule: z.object({
    morning: z.object({
      activity: z.string().optional(),
      transport: z.string().optional(),
      startTime: z.string().optional(),
      duration: z.number().optional(), // minutes
    }).optional(),
    midday: z.object({
      activity: z.string().optional(),
      restWindow: z.boolean().default(false),
    }).optional(),
    afternoon: z.object({
      activity: z.string().optional(),
      startTime: z.string().optional(),
      duration: z.number().optional(),
    }).optional(),
    evening: z.object({
      dining: z.string().optional(),
      notes: z.string().optional(),
    }).optional(),
  }),
  health: z.object({
    stepsTarget: z.number().default(8000),
    hydrationFocus: z.boolean().default(true),
    bodyNotes: z.string().optional(),
  }),
  spend: z.object({
    planned: z.number(),
    actual: z.number().default(0),
  }),
  agentNotes: z.string().optional(),
  adjustments: z.array(z.object({
    timestamp: z.string().datetime(),
    agentId: z.string(),
    reason: z.string(),
    change: z.string(),
  })).default([]),
});

export type DailyItinerary = z.infer<typeof DailyItinerarySchema>;

// ============================================================================
// ACTIVITIES
// ============================================================================

export const ActivitySchema = z.object({
  id: z.string().uuid(),
  tripId: z.string().uuid(),
  date: z.string().date(),
  type: z.enum(['golf', 'cultural', 'dining', 'wellness', 'transport', 'free']),
  name: z.string(),
  location: z.object({
    city: z.string(),
    venue: z.string().optional(),
    address: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),
  timing: z.object({
    startTime: z.string(),
    duration: z.number(), // minutes
    endTime: z.string(),
  }),
  physicalLoad: z.enum(['low', 'medium', 'high']),
  status: z.enum(['planned', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  booking: z.object({
    required: z.boolean(),
    confirmationCode: z.string().optional(),
    provider: z.string().optional(),
    cost: z.number().optional(),
  }).optional(),
  notes: z.string().optional(),
});

export type Activity = z.infer<typeof ActivitySchema>;

// ============================================================================
// GOLF-SPECIFIC MODELS
// ============================================================================

export const GolfRoundSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid(),
  course: z.object({
    name: z.string(),
    location: z.string(),
    rating: z.number().optional(),
    notes: z.string().optional(),
  }),
  teeTime: z.string().datetime(),
  includes: z.object({
    greenFee: z.boolean(),
    caddie: z.boolean(),
    cart: z.boolean(),
    transport: z.boolean(),
  }),
  costs: z.object({
    greenFee: z.number(),
    caddie: z.number().optional(),
    cart: z.number().optional(),
    transport: z.number().optional(),
  }),
  weather: z.object({
    condition: z.string().optional(),
    temperature: z.number().optional(),
    humidity: z.number().optional(),
  }).optional(),
  completed: z.boolean().default(false),
  score: z.number().optional(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
});

export type GolfRound = z.infer<typeof GolfRoundSchema>;

// ============================================================================
// TRANSPORT
// ============================================================================

export const TransportSegmentSchema = z.object({
  id: z.string().uuid(),
  tripId: z.string().uuid(),
  type: z.enum(['flight', 'train', 'private_car', 'taxi']),
  from: z.object({
    city: z.string(),
    location: z.string(),
    code: z.string().optional(), // airport code
  }),
  to: z.object({
    city: z.string(),
    location: z.string(),
    code: z.string().optional(),
  }),
  departure: z.string().datetime(),
  arrival: z.string().datetime(),
  booking: z.object({
    confirmationCode: z.string().optional(),
    provider: z.string(),
    seatClass: z.string().optional(),
    cost: z.number(),
  }),
  status: z.enum(['planned', 'booked', 'completed', 'cancelled']),
});

export type TransportSegment = z.infer<typeof TransportSegmentSchema>;

// ============================================================================
// ACCOMMODATIONS
// ============================================================================

export const AccommodationSchema = z.object({
  id: z.string().uuid(),
  tripId: z.string().uuid(),
  hotelName: z.string(),
  city: z.string(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  nights: z.number(),
  roomType: z.string().optional(),
  booking: z.object({
    confirmationCode: z.string().optional(),
    provider: z.string(),
    costPerNight: z.number(),
    totalCost: z.number(),
    includes: z.array(z.string()).default(['breakfast']),
  }),
  status: z.enum(['planned', 'booked', 'checked_in', 'checked_out', 'cancelled']),
  notes: z.string().optional(),
});

export type Accommodation = z.infer<typeof AccommodationSchema>;

// ============================================================================
// PREFERENCES & CONSTRAINTS
// ============================================================================

export const TravelPreferencesSchema = z.object({
  userId: z.string(),
  golfFrequency: z.enum(['daily', '3_per_week', '2_per_week', 'occasional']).optional(),
  walkingLimit: z.enum(['unlimited', 'moderate', 'limited']),
  diningStyle: z.enum(['fine_dining', 'local_authentic', 'casual', 'mixed']),
  mornings: z.enum(['early', 'preferred', 'late']),
  evenings: z.enum(['early', 'moderate', 'late']),
  constraints: z.object({
    medical: z.array(z.string()).optional(),
    dietary: z.array(z.string()).optional(),
    mobility: z.array(z.string()).optional(),
  }),
});

export type TravelPreferences = z.infer<typeof TravelPreferencesSchema>;

// ============================================================================
// AGENT FEEDBACK
// ============================================================================

export const DailyFeedbackSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string().date(),
  tripId: z.string().uuid(),
  userId: z.string(),
  energyRating: z.number().min(1).max(5),
  satisfactionScore: z.number().min(1).max(5),
  sleepQuality: z.number().min(1).max(5),
  physicalNotes: z.string().optional(),
  emotionalNotes: z.string().optional(),
  suggestions: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type DailyFeedback = z.infer<typeof DailyFeedbackSchema>;

// ============================================================================
// AGENT DECISIONS
// ============================================================================

export const AgentDecisionSchema = z.object({
  id: z.string().uuid(),
  tripId: z.string().uuid(),
  date: z.string().date(),
  agentType: z.enum([
    'travel_experience',
    'golf_operations',
    'health_recovery',
    'budget_control',
    'transport_logistics',
    'culture_dining'
  ]),
  decision: z.string(),
  rationale: z.string(),
  inputSignals: z.record(z.any()),
  outputActions: z.array(z.string()),
  timestamp: z.string().datetime(),
  approvalRequired: z.boolean().default(false),
  approved: z.boolean().optional(),
});

export type AgentDecision = z.infer<typeof AgentDecisionSchema>;

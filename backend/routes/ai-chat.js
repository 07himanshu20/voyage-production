const express = require('express');
const router = express.Router();
const db = require('../database');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Tool definitions for Gemini function calling
const tools = [{
  functionDeclarations: [
    {
      name: 'get_weather',
      description: 'Get current weather and forecast for a city. Use when customer asks about weather, rainfall, temperature at pickup, dropoff, or any city.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name to get weather for' },
        },
        required: ['city'],
      },
    },
    {
      name: 'get_traffic',
      description: 'Get traffic conditions between two locations. Use when customer asks about traffic, delays, road conditions between pickup and destination.',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: 'Origin city or address' },
          destination: { type: 'string', description: 'Destination city or address' },
        },
        required: ['origin', 'destination'],
      },
    },
    {
      name: 'get_local_time',
      description: 'Get current local time in a specific city.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name' },
        },
        required: ['city'],
      },
    },
    {
      name: 'raise_complaint',
      description: 'Raise a complaint about the ride, driver, or service. Use when customer wants to file a complaint or report an issue.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: { type: 'string', description: 'Booking ID' },
          description: { type: 'string', description: 'Complaint description' },
        },
        required: ['booking_id', 'description'],
      },
    },
    {
      name: 'submit_rating',
      description: 'Submit a rating for a completed ride.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: { type: 'string', description: 'Booking ID' },
          stars: { type: 'number', description: 'Rating 1-5 stars' },
          comment: { type: 'string', description: 'Optional review comment' },
        },
        required: ['booking_id', 'stars'],
      },
    },
  ],
}];

// Tool execution functions
async function executeFunction(name, args) {
  switch (name) {
    case 'get_weather':
      return await getWeather(args.city);
    case 'get_traffic':
      return await getTraffic(args.origin, args.destination);
    case 'get_local_time':
      return getLocalTime(args.city);
    case 'raise_complaint':
      return raiseComplaint(args.booking_id, args.description);
    case 'submit_rating':
      return submitRating(args.booking_id, args.stars, args.comment);
    default:
      return { error: 'Unknown function' };
  }
}

async function getWeather(city) {
  try {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    const res = await fetch(url);
    const data = await res.json();
    const current = data.current_condition[0];
    const today = data.weather[0];
    return {
      city,
      temperature: `${current.temp_C}°C`,
      feels_like: `${current.FeelsLikeC}°C`,
      description: current.weatherDesc[0].value,
      humidity: `${current.humidity}%`,
      wind: `${current.windspeedKmph} km/h`,
      chance_of_rain: `${today.hourly[0].chanceofrain}%`,
      max_temp: `${today.maxtempC}°C`,
      min_temp: `${today.mintempC}°C`,
    };
  } catch {
    return { city, error: 'Weather data unavailable', temperature: 'Unknown' };
  }
}

async function getTraffic(origin, destination) {
  try {
    // Use OSRM for route time estimation
    const geocode = async (addr) => {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`, {
        headers: { 'User-Agent': 'Best ClassChauffeurs/1.0' },
      });
      const d = await r.json();
      return d[0] ? { lat: d[0].lat, lng: d[0].lon } : null;
    };
    const orig = await geocode(origin);
    const dest = await geocode(destination);
    if (!orig || !dest) return { error: 'Could not geocode locations' };

    const url = `https://router.project-osrm.org/route/v1/driving/${orig.lng},${orig.lat};${dest.lng},${dest.lat}?overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes[0]) {
      const route = data.routes[0];
      const distKm = (route.distance / 1000).toFixed(1);
      const durMin = Math.ceil(route.duration / 60);
      return {
        origin, destination,
        distance_km: distKm,
        estimated_time_minutes: durMin,
        traffic_status: durMin > 60 ? 'Moderate to heavy traffic expected' : 'Light traffic expected',
        suggestion: durMin > 90 ? 'Consider leaving early due to longer journey time' : 'Journey should be smooth',
      };
    }
    return { error: 'Could not calculate route' };
  } catch {
    return { error: 'Traffic data unavailable' };
  }
}

function getLocalTime(city) {
  // Map common cities to timezones
  const tzMap = {
    london: 'Europe/London', mumbai: 'Asia/Kolkata', delhi: 'Asia/Kolkata',
    'new york': 'America/New_York', tokyo: 'Asia/Tokyo', dubai: 'Asia/Dubai',
    paris: 'Europe/Paris', sydney: 'Australia/Sydney', singapore: 'Asia/Singapore',
    noida: 'Asia/Kolkata', agra: 'Asia/Kolkata', bangalore: 'Asia/Kolkata',
    chennai: 'Asia/Kolkata', kolkata: 'Asia/Kolkata', hyderabad: 'Asia/Kolkata',
  };
  const tz = tzMap[city.toLowerCase()] || 'UTC';
  const time = new Date().toLocaleString('en-GB', { timeZone: tz, dateStyle: 'full', timeStyle: 'short' });
  return { city, timezone: tz, local_time: time };
}

function raiseComplaint(bookingId, description) {
  const booking = db.bookings.find(b => b.id === bookingId);
  if (!booking) return { error: 'Booking not found' };

  // Create a company chat with the complaint
  const { v4: uuidv4 } = require('uuid');
  const chat = {
    id: uuidv4(),
    customerId: booking.customerId,
    customerName: booking.customerName,
    bookingId,
    messages: [{
      id: uuidv4(),
      from: 'customer',
      fromName: booking.customerName,
      message: `COMPLAINT: ${description}`,
      timestamp: new Date().toISOString(),
    }],
    createdAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    status: 'open',
  };
  db.companyChats.push(chat);
  global.io.to('admin').emit('company_chat_message', { chatId: chat.id, message: chat.messages[0], chat });

  return { success: true, message: `Complaint raised successfully for booking ${bookingId}. Our team will review it shortly.`, reference: chat.id };
}

function submitRating(bookingId, stars, comment) {
  const booking = db.bookings.find(b => b.id === bookingId);
  if (!booking) return { error: 'Booking not found' };
  if (booking.status !== 'completed') return { error: 'Can only rate completed trips' };

  booking.rating = Math.min(5, Math.max(1, stars));
  booking.review = comment || '';
  return { success: true, message: `Thank you! ${stars}-star rating submitted for booking ${bookingId}.` };
}

// Build system prompt with booking context
function buildSystemPrompt(booking, driver, customer) {
  let prompt = `You are Best Class AI Assistant, a helpful and professional concierge chatbot for Best Class Chauffeurs — a premium luxury chauffeur service.

Company Information:
- Name: ${db.settings.companyName}
- Phone: ${db.settings.phone}
- Email: ${db.settings.contactEmail}
- Emergency Helpline: +44 20 7946 0999

How bookings are made:
1. Customer enters pickup and dropoff addresses in the app
2. The system calculates route distance and estimated travel time
3. Customer selects a vehicle type (Sedan, SUV, MPV, or Ultra Luxury)
4. Pricing is calculated dynamically based on distance × vehicle rate per km
5. Customer confirms booking with date, time, and any extras
6. A chauffeur is assigned and the customer can track in real-time

Vehicle rates:
- Executive Sedan (Mercedes S-Class / BMW 7 Series): £3.50/km, min £45
- Luxury SUV (Range Rover Autobiography): £4.50/km, min £65
- Executive MPV (Mercedes V-Class): £4.00/km, min £55
- Ultra Luxury (Rolls-Royce Ghost / Bentley Flying Spur): £8.00/km, min £150
`;

  if (booking) {
    prompt += `
Current Booking Details:
- Booking ID: ${booking.id}
- Status: ${booking.status}
- Trip Status: ${booking.tripStatus || 'Not started'}
- Pickup: ${booking.pickup.address}
- Dropoff: ${booking.dropoff.address}
- Date: ${booking.date}, Time: ${booking.time}
- Vehicle: ${booking.vehicleName} (${booking.vehicleType})
- Fare: £${booking.fare.total.toFixed(2)}
- Distance: ${booking.distanceKm || 'N/A'} km
- Duration: ${booking.durationMinutes || 'N/A'} minutes
`;
    if (booking.extras && booking.extras.length > 0) {
      prompt += `- Extras: ${booking.extras.join(', ')}\n`;
    }
    if (booking.notes) {
      prompt += `- Notes: ${booking.notes}\n`;
    }
  }

  if (driver) {
    prompt += `
Assigned Chauffeur:
- Name: ${driver.name}
- Phone: ${driver.phone}
- Vehicle: ${driver.vehicle.make} ${driver.vehicle.model} (${driver.vehicle.color}, ${driver.vehicle.plate})
- Rating: ${driver.rating}/5 (${driver.totalTrips} trips completed)
`;
  }

  if (customer) {
    prompt += `
Customer:
- Name: ${customer.name}
- Loyalty Tier: ${customer.loyaltyTier}
- Total Bookings: ${customer.totalBookings}
`;
  }

  prompt += `
Guidelines:
- Be concise, professional, and helpful
- Use the function tools when the customer asks about weather, traffic, time, or wants to raise a complaint or submit a rating
- If no booking context is available, you can still answer general questions about the service
- Always be polite and maintain the luxury brand tone
- For driver's phone number, only share if a driver is assigned
- For emergency, always provide the emergency helpline: +44 20 7946 0999
`;

  return prompt;
}

// AI Chat endpoint
router.post('/', async (req, res) => {
  const { message, bookingId, customerId, history = [] } = req.body;

  if (!message) return res.status(400).json({ error: 'Message required' });

  // Gather context
  const booking = bookingId ? db.bookings.find(b => b.id === bookingId) : null;
  const driver = booking && booking.driverId ? db.drivers.find(d => d.id === booking.driverId) : null;
  const customer = customerId ? db.customers.find(c => c.id === customerId) : null;

  const systemPrompt = buildSystemPrompt(booking, driver, customer);

  try {
    // Try models in order of preference
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      tools,
    });

    // Build chat history
    const chatHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.message }],
    }));

    const chat = model.startChat({ history: chatHistory });
    let result = await chat.sendMessage(message);
    let response = result.response;

    // Handle function calls in a loop
    let maxCalls = 5;
    while (maxCalls-- > 0) {
      const candidate = response.candidates[0];
      const parts = candidate.content.parts;

      const functionCalls = parts.filter(p => p.functionCall);
      if (functionCalls.length === 0) break;

      // Execute all function calls
      const functionResponses = [];
      for (const fc of functionCalls) {
        const fnResult = await executeFunction(fc.functionCall.name, fc.functionCall.args);
        functionResponses.push({
          functionResponse: {
            name: fc.functionCall.name,
            response: fnResult,
          },
        });
      }

      // Send function results back to Gemini
      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    const aiMessage = response.text();
    res.json({ reply: aiMessage });
  } catch (e) {
    console.error('AI Chat error:', e);
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.', details: e.message });
  }
});

module.exports = router;

# API Specification — Alouré

## Base URL
```
POST https://your-backend.example.com/api/v1
```

## Endpoints

### 1. Normalize color input
Convert any supported input into a normalized CIELAB target.

**Request:** `POST /api/v1/color/normalize`
```json
{
  "inputType": "hex", // "lab", "rgb", "image"
  "value": "#f7d2b6",
  "whiteReference": { "lab": { "l": 97.9, "a": 0.3, "b": 1.1 } },
  "readings": [
    { "source": "jawline", "lab": { "l": 60.1, "a": 13.2, "b": 24.5 } },
    { "source": "cheek", "lab": { "l": 58.6, "a": 11.7, "b": 26.1 } }
  ],
  "metadata": {
    "lighting": "daylight",
    "sensor": "spectro-az210"
  }
}
```

**Response:**
```json
{
  "targetLab": { "l": 59.3, "a": 12.4, "b": 25.3 },
  "hex": "#f0c7a1",
  "swatch": "rgba(...)",
  "deltaE": 0.0,
  "notes": "Adjusted for indoor daylight"
}
```

### 2. Pigment solver
Solve for pigment ratios that produce the target LAB.

**Request:** `POST /api/v1/color/pigment-formula`
```json
{
  "targetLab": { "l": 59.3, "a": 12.4, "b": 25.3 },
  "pigments": ["yellow", "red", "blue", "white", "black"],
  "constraints": {
    "sumTo": 100,
    "minRatio": 0
  }
}
```

**Response:**
```json
{
  "formula": [
    { "pigment": "yellow", "percentage": 44.8 },
    { "pigment": "red", "percentage": 26.2 },
    { "pigment": "white", "percentage": 19.4 },
    { "pigment": "black", "percentage": 7.6 },
    { "pigment": "blue", "percentage": 2.0 }
  ],
  "resultLab": { "l": 59.5, "a": 12.1, "b": 25.0 },
  "deltaE": 0.34
}
```

### 3. (Optional) Profile storage
`POST /api/v1/profiles` — store user profile with preferred pigments and target tones for repeatability.

### Authentication
Start with simple API key or token guard for backend enablement. Future versions will add OAuth2.

---
This API will be consumed by the Next.js frontend. Implement FastAPI with Pydantic schemas to match these contracts.
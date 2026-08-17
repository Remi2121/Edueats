# EduEats — Architecture

Reference diagram of the system as described in the proposal report. Nothing here is
implemented yet — this is the map to build against.

```mermaid
flowchart LR
    subgraph Frontend["Frontend Web App"]
        S["Student view\nwebcam capture every 5 min"]
        P["Parent view\nfood scan/entry, alerts"]
    end

    subgraph Backend["Backend API (Node.js + Express)"]
        B["Core controller"]
    end

    subgraph ML["ML Service (Python)"]
        M["CNN on FER-2013\n+ majority voting"]
    end

    subgraph Rules["Nutrition Analysis Module"]
        R["IF-THEN rules:\nmood -> nutrient needs"]
        F["Constraint-based filter\nover nutrition CSV"]
    end

    DB[("Database\nMySQL / SQLite")]
    FCM["Notification System\n(Firebase Cloud Messaging)"]

    S -- "face images" --> B
    B -- "5 frames" --> M
    M -- "final mood" --> B
    B --> R --> F
    F -- "suitable foods" --> B
    B <-- "history check" --> DB
    P -- "food entry" --> B
    B -- "results" --> S
    B -- "alerts" --> FCM
    FCM --> P
```

## Data flow (5 stages)

1. **Input** — student attends class, webcam captures a frame every 5 min; parent logs food.
2. **Mood processing** — last 5 frames go through the CNN, majority vote picks final mood.
3. **Decision & logic** — mood mapped to nutrient requirements via IF-THEN rules.
4. **Nutrition & history integration** — nutrient constraints filter the nutrition CSV;
   database history avoids repeating the same food.
5. **Output & feedback** — results shown in the web app and pushed to the parent's phone via
   FCM; everything gets logged to the database.

const mongoose = require('mongoose');

const oddsSchema = new mongoose.Schema({
  sport: { 
    type: String, 
    required: true,
    index: true // Better than declaring separately
  },
  sportKey: { 
    type: String, 
    required: true,
    index: true 
  },
  eventId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  commenceTime: { 
    type: Date, 
    required: true,
    index: true 
  },
  homeTeam: { 
    type: String, 
    required: true 
  },
  awayTeam: { 
    type: String, 
    required: true 
  },
  bookmakers: [{
    key: { 
      type: String, 
      required: true,
      index: true 
    },
    title: { 
      type: String, 
      required: true 
    },
    lastUpdate: { 
      type: Date, 
      required: true 
    },
    markets: [{
      key: { 
        type: String, 
        required: true 
      },
      outcomes: [{
        name: { 
          type: String, 
          required: true 
        },
        price: { 
          type: Number, 
          required: true 
        },
        point: { 
          type: Number 
        }
      }]
    }]
  }],
  lastFetched: { 
    type: Date, 
    default: Date.now,
    index: true // Helps with stale data checks
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  autoIndex: process.env.NODE_ENV === 'development' // Safer option
});

module.exports = mongoose.model('Odds', oddsSchema);
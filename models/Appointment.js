const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  chatId: Number,
  name: String,
  address: String,
  day: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Appointment', appointmentSchema);

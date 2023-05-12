const mongoose = require('mongoose')
const {Schema} = mongoose

const accomodationSchema = new Schema({
  owner: {type:mongoose.Schema.Types.ObjectId, ref:'User'},
  title: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  photos: [String],
  description: String,
  features: [String],
  extraInfo: String,
  checkIn: {
    type: Number,
    default: 14
  },
  checkOut: {
    type: Number,
    default: 11
  },
  maxGuests: {
    type: Number,
    default: 1
  },
  price: {
    type: Number,
    required: true,
    default: 10
  },
})

module.exports = mongoose.model('Accomodation', accomodationSchema)

const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./models/User')
const Accomodation = require('./models/Accomodation')
const Booking = require('./models/Booking')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const downloadImage = require('image-downloader')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

const bcryptSalt = bcrypt.genSaltSync(10)

app.use(express.json())
app.use(cookieParser())
app.use('/images', express.static(__dirname+'/images'))

app.use(cors())

// app.use(function (req, res, next) {
//   res.setHeader('Access-Control-Allow-Origin', 'https://delicate-quokka-3d0637.netlify.app');

//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

//   res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

//   res.setHeader('Access-Control-Allow-Credentials', true);

//   next();
// });

mongoose.connect(process.env.MONGO_URL)

app.post('/register', async (req, res) => {
  const {name, email, password} = req.body

  try{ 
    const userDoc = await User.create({
      name,
      email,
      password:bcrypt.hashSync(password, bcryptSalt),
    })
    res.json(userDoc)
  }catch (e){
    res.status(422).json(e)
  }
})

app.post('/login', async (req, res) => {
  const {email, password} = req.body
  const userDoc = await User.findOne({email})
  if (userDoc) {
    const passOk = bcrypt.compareSync(password, userDoc.password)
    if (passOk) {
      jwt.sign({email:userDoc.email, id:userDoc._id}, process.env.SECRET_KEY, {}, (err, token) => {
        if (err) throw err
        res.cookie('token', token).json(userDoc)
      })
    }else{
      res.status(422).json('pass not ok')
    }
  }else{
    res.json('Not found')
  }
})

app.get('/profile', (req, res) => {
  const {token} = req.cookies
  if (token) {
    jwt.verify(token, process.env.SECRET_KEY, {}, async(err, cookieData) => {
      if (err) throw err
      const {name, email, id} = await User.findById(cookieData.id)
      
      res.json({name, email, id})
    })
  }else{
    res.json(null)
  }
})

app.post('/logout', (req, res) => {
  res.cookie('token', '').json(true)
})

app.post('/upload-photo-link', async (req, res) => {
  const {photoLink} = req.body
  const newName = 'photo' + Date.now() + '.jpg'
  await downloadImage.image({
    url: photoLink,
    dest: __dirname+'/images/' +newName
  })
  res.json(newName)
})

const upload = multer({dest:'images/'})

app.post('/upload-photo', upload.array('file', 100), async (req, res) => {
  const uploadedFiles = []
  for (let i = 0; i < req.files.length; i++) {
    const {originalname} = req.files[i]
    const fileExtension = path.extname(originalname)
    const newPath =  req.files[i].path + fileExtension
    
    fs.renameSync(req.files[i].path, newPath)
    uploadedFiles.push(newPath.replace('images\\',''))
  }
  res.json(uploadedFiles)
})

app.post('/accomodations', (req, res) => {
  const {token} = req.cookies
  const {title, address, photos:addPhoto, 
    description, features, 
    extraInfo, checkIn, checkOut, maxGuests, price,} = req.body
  if (token) {
    jwt.verify(token, process.env.SECRET_KEY, {}, async(err, cookieData) => {
      if (err) throw err
      const accomodationDoc = await Accomodation.create({
        owner:cookieData.id,
        title, address, photos:addPhoto, 
        description, features, 
        extraInfo, checkIn, checkOut, maxGuests, price,
      })
      res.json(accomodationDoc)
    })
  }
})

app.get('/accomodations', (req, res) => {
  const {token} = req.cookies
  jwt.verify(token, process.env.SECRET_KEY, {}, async(err, cookieData) => {
    const {id} = cookieData
    res.json(await Accomodation.find({owner:id}))
  })
})

app.get('/accomodation/:id', async (req, res) => {
  const {id} = req.params
  res.json( await Accomodation.findById(id))
})

app.put('/accomodation/:id', async (req, res) => {
  const {token} = req.cookies
  const {id} = req.params
  const {title, address, photos:addPhoto, 
    description, features, 
    extraInfo, checkIn, checkOut, maxGuests, price,} = req.body
  jwt.verify(token, process.env.SECRET_KEY, {}, async(err, cookieData) => {
    const accomodationDoc = await Accomodation.findById(id)
    if (cookieData.id === accomodationDoc.owner.toString()) {
      accomodationDoc.set({
        title, address, photos:addPhoto, 
        description, features, 
        extraInfo, checkIn, checkOut, maxGuests, price,
      })
      await accomodationDoc.save()
      res.json('ok')
    }
  })
})

app.get('/get-accomodations-for-all-users', async (req, res) => {
  res.json( await Accomodation.find())
})

app.post('/bookings', async (req, res) => {
  const {token} = req.cookies
  const {accomodationId, checkIn, 
    checkOut, noOfGuests, name, 
    mobileNumber, price} = req.body
  jwt.verify(token, process.env.SECRET_KEY, {}, async(err, cookieData) => {
    if (err) throw err
    const bookingDoc = await Booking.create({
      userId:cookieData.id,
      accomodationId, checkIn, 
    checkOut, noOfGuests, name, 
    mobileNumber, price
    })
    res.json(bookingDoc)
  })
})

app.get('/bookings', async (req, res) => {
  const { token } = req.cookies
  jwt.verify(token, process.env.SECRET_KEY, {}, async (err, cookieData) => {
    const { id } = cookieData
    const bookings = await Booking.find({ userId: id }).populate('accomodationId')
    res.json(bookings);
  })
})

app.listen(4000)

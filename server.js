const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const shortid = require("shortid");

const cors = require("cors");

process.env.MONGO_URI =
  "mongodb+srv://EctoBoi:Sw05pgM3ZqhcBzCW@cluster0-yroxl.mongodb.net/test?retryWrites=true&w=majority";

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(process.cwd() + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

//creating mongoose model
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  _id: {
    type: String,
    default: shortid.generate
  },
  username: String,
  count: {
    type: Number,
    default: 0
  },
  log: [{ description: String, duration: Number, date: Date }]
});

var User = mongoose.model("user", UserSchema);

//create user
app.post("/api/exercise/new-user", function(req, res) {
  var username = req.body.username;

  User.find({ username: username }, function(err, data) {
    if (err) return console.error(err);
    console.log(data);
    if (data == false) {
      var newUser = new User({
        username: username
      });
      newUser.save(function(err, data) {
        if (err) return console.error(err);
        res.json({ username: data.username, _id: data._id });
      });
    } else {
      res.send("user already exists");
    }
  });
});

//display users
app.get("/api/exercise/users", function(req, res) {
  User.find({})
    .select("username _id")
    .exec(function(err, data) {
      if (err) return console.error(err);
      res.json(data);
    });
});

//add exercise to log
app.post("/api/exercise/add", function(req, res) {
  var userId = req.body.userId;

  User.find({ _id: userId }, function(err, data) {
    if (err) return console.error(err);
    if (data == false) {
      res.send("user doesn't exists");
    } else {
      var date = new Date();
      if (req.body.date) {
        date = new Date(req.body.date);
      }
      User.updateOne(
        { _id: userId },
        {
          count: data[0].count + 1,
          $push: {
            log: {
              description: req.body.description,
              duration: req.body.duration,
              date: date
            }
          }
        },
        function(err) {
          if (err) return console.error(err);
          res.json({
            username: data[0].username,
            description: req.body.description,
            duration: req.body.duration,
            _id: userId,
            date: date
          });
        }
      );
    }
  });
});

//get exercise log
app.get("/api/exercise/log", function(req, res) {
  var query = User.find({ _id: req.query.userId }).select({
    __v: 0,
    "log._id": 0
  });

  if (req.query.limit != undefined) {
    query.slice("log", parseInt(req.query.limit));
  }

  query.exec(function(err, data) {
    if (err) return console.error(err);

    if (req.query.from != undefined) {
      var dateFrom = new Date(req.query.from);
      data[0].log = data[0].log.filter(exercise => exercise.date >= dateFrom);
    }

    if (req.query.to != undefined) {
      var dateTo = new Date(req.query.to);
      data[0].log = data[0].log.filter(exercise => exercise.date <= dateTo);
    }
    data[0].count = data[0].log.length;
    res.json(data);
  });
});

app.get("/hello", function(req, res) {
  res.json({ hello: "how are you?" });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

//{"username":"ghs","_id":"SyneRsTTB"}
//{"username":"hihello","description":"Pushups","duration":5,"_id":"Skumj9apS","date":"Tue Dec 10 2019"}
//{"_id":"Skumj9apS","username":"hihello","count":1,"log":[{"description":"Pushups","duration":5,"date":"Tue Dec 10 2019"}]}

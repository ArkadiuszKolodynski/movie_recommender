var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mysql = require("mysql");
var axios = require("axios");
var csvWriter = require("csv-write-stream");
var fs = require("fs");
var node_ssh = require("node-ssh");
var config = require("./config");

var con = mysql.createConnection({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name
});

con.connect(err => {
  if (err) {
    return console.error("error: " + err.message);
  }
  console.log("Connected to database");
});

app.set("view engine", "pug");

app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  con.query(
    "SELECT COUNT(*) FROM movies WHERE rtAudienceNumRatings > 10000",
    (error, count, flds) => {
      if (error) throw error;
      con.query(
        "SELECT * FROM movies WHERE rtAudienceNumRatings > 10000 ORDER BY rtAudienceRating DESC LIMIT 100",
        (err, result, fields) => {
          if (err) throw err;
          for (e of result) {
            if (e.imdbPictureURL.startsWith("http:")) {
              e.imdbPictureURL =
                "https" +
                e.imdbPictureURL.substring(4, e.imdbPictureURL.length);
            }
          }
          res.render("index", {
            result: result,
            multiplier: 1,
            count: count[0]["COUNT(*)"],
            num_pages: Math.ceil(count[0]["COUNT(*)"] / 100),
            current_page: 1
          });
        }
      );
    }
  );

  console.log("Requested /");
});

app.get("/page/:page", (req, res) => {
  con.query(
    "SELECT COUNT(*) FROM movies WHERE rtAudienceNumRatings > 10000",
    (error, count, flds) => {
      if (error) throw error;
      con.query(
        "SELECT * FROM movies WHERE rtAudienceNumRatings > 10000 ORDER BY rtAudienceRating DESC LIMIT 100 OFFSET " +
          100 * (req.params.page - 1),
        (err, result, fields) => {
          if (err) throw err;
          res.render("index", {
            result: result,
            multiplier: req.params.page,
            count: count[0]["COUNT(*)"],
            num_pages: Math.ceil(count[0]["COUNT(*)"] / 100),
            current_page: req.params.page
          });
        }
      );
    }
  );

  console.log("Requested /page/" + req.params.page);
});

app.get("/users", (req, res) => {
  con.query(
    "SELECT DISTINCT user_id FROM user_ratedmovies_timestamps",
    (err, result, fields) => {
      if (err) throw err;
      res.render("users", { users: result });
    }
  );
  console.log("Requested /users");
});

app.get("/user/:id", (req, res) => {
  con.query(
    "SELECT rating, timestamp, title, imdbPictureURL FROM user_ratedmovies_timestamps" +
      " INNER JOIN movies ON user_ratedmovies_timestamps.movie_id = movies.id WHERE user_id = " +
      req.params.id +
      " ORDER BY rating DESC",
    (err, result, fields) => {
      if (err) throw err;
      res.json(result);
    }
  );
  console.log("Requested /user/" + req.params.id);
});

app.get("/movie/:id", (req, res) => {
  con.query(
    "SELECT title, imdbPictureURL, year FROM movies WHERE id = " +
      req.params.id,
    (err, result, fields) => {
      if (err) throw err;
      res.json(result);
    }
  );
  console.log("Requested /movie/" + req.params.id);
});

app.get("/find-your-recommendations", (req, res) => {
  res.render("find-recommendation");
  console.log("Requested /find-your-recommendations");
});

app.get("/get100", (req, res) => {
  con.query(
    "SELECT * FROM movies WHERE rtAudienceNumRatings > 10000 ORDER BY rtAudienceRating DESC LIMIT 100",
    (err, result, fields) => {
      if (err) throw err;
      res.json(result);
    }
  );
});

app.get("/lastid", (req, res) => {
  con.query(
    "SELECT user_id FROM user_ratedmovies_timestamps ORDER BY user_id DESC LIMIT 1",
    (err, result, fields) => {
      if (err) throw err;
      res.json(result);
    }
  );
});

app.get("/user-recommendation/:id", (req, res) => {
  res.render("user-recommendation", { id: req.params.id });
});

app.post("/recommendation/:id", (req, res) => {
  con.query("SELECT id FROM movies", (err, result, fields) => {
    if (err) throw err;
    con.query(
      "SELECT movie_id FROM user_ratedmovies_timestamps WHERE user_id = " +
        req.params.id,
      (err2, result2, field2) => {
        if (err2) throw err2;
        for (let e of result2) {
          let index = result.findIndex(x => x.id === e.movie_id);
          if (index > -1) {
            result.splice(index, 1);
          }
        }

        let movieID = [];
        let userID = [];
        for (let e of result) {
          movieID.push(e.id.toString());
          userID.push(req.params.id.toString());
        }

        let obj = {
          signature_name: "predict",
          inputs: { movieID: movieID, userID: userID }
        };
        axios
          .post(config.modelApiUrl, obj)
          .then(resp => {
            for (let i = 0; i < movieID.length; i++) {
              resp.data.outputs[i].push(movieID[i]);
            }

            resp.data.outputs = resp.data.outputs.sort((a, b) => {
              if (a[0] > b[0]) return -1;
              if (a[0] < b[0]) return 1;
              return 0;
            });

            res.json(resp.data.outputs.slice(0, 100));
          })
          .catch(error => {
            console.error(error);
          });
      }
    );
  });
});

app.post("/add-rates", (req, res) => {
  var writer = csvWriter({
    separator: "\t",
    sendHeaders: false
  });

  writer.pipe(fs.createWriteStream(config.csvFilePath, { flags: "a" }));

  for (let e of req.body) {
    writer.write(e);

    let query =
      "INSERT INTO user_ratedmovies_timestamps VALUES (" +
      e.user_id +
      ", " +
      e.movie_id +
      ", " +
      e.rating +
      ", " +
      e.timestamp +
      ")";
    con.query(query, (err, result) => {
      if (err) throw err;
      console.log("1 record inserted");
    });
  }
  writer.end();

  res.json({ msg: "success!" });
});

app.post("/rebuild-model", (req, res) => {
  var ssh = new node_ssh();
  ssh
    .connect({
      host: "xxx",
      port: "xxx",
      username: "xxx",
      password: "xxx"
    })
    .then(() => {
      ssh.exec("docker-compose run model_builder", {
        cwd: "/home/admin/movie_recommender"
      });
    });
  res.json({ msg: "success" });
});

var server = app.listen(8080, () => {
  var host = server.address().address;
  var port = server.address().port;

  console.log("Express app listening at http://%s:%s", host, port);
});

const express = require('express');
const jwt = require('jsonwebtoken');
const io = require('socket.io-client');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();
//global variable
var korv = 0;
//connection socket
var socket = io.connect("http://localhost:4000");

//DB connect
let db = new sqlite3.Database('./db/texts.sqlite', (err) => {
  if (err) {
    console.error(err.message);
} else {
    console.log("connected");
}
});
//Listen to korv if needed
socket.on("korv", function(data){
    korv = parseFloat(data[7][1]);
});
//Config
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());





//Routes
app.get('/api/test', (req, res) => {
  korv_dec = korv.toFixed(2);
  res.json({
    message: korv_dec
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to the API'
  });
});

//check for auth
app.post('/api/auth', verifyToken, async (req, res) => {
    res.json({
      msg: 'token ok'
    });
});

//login POST
app.post("/api/login", async (req, res) => {
    //Check if email exist
    db.each("SELECT COUNT(*) AS total FROM users WHERE email LIKE ?",
    req.body.email, async (err, row) => {
        if (row.total == 0) {
            //Email not exists
            console.log("email does not exist");
            res.json({ msg: "email does not exist"});
        } else {
            db.each("SELECT * FROM users WHERE email LIKE ?",
            req.body.email, async (err, row) => {
                if (err) {
                    console.log("something went wrong");
                    res.json({
                        token: "empty",
                        msg: "something went wrong"
                    });
                } else {
                    //Check if password is correct
                    if (req.body.password == row.password) {
                            const user = req.body

                            jwt.sign({user: user}, 'secretkey', (err, token) => {
                                if (err) {
                                    console.log("something went wrong");
                                    res.json({
                                        token: "empty",
                                        msg: "something went wrong"
                                    });
                                } else {
                                    res.json({
                                      token: token,
                                      msg: "token created"
                                    });
                                }
                            });
                    } else {
                        console.log("wrong pass");
                        res.json({
                            token: "empty",
                            msg: "wrong password"
                        });
                    }
                }
            });
        }
    });
});

//register POST
app.post("/api/register", async (req, res) => {
    //Check if email exist
    db.each("SELECT COUNT(*) AS total FROM users WHERE email LIKE ?",
    req.body.email, async (err, row) => {
        if (row.total == 1) {
            //Email exists
            console.log("email exist");
            res.json({ msg: "email exist"});
        } else {
            //Email does exists
            db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
				req.body.name, req.body.email, req.body.password, (err) => {
				if (err) {
					res.json({ msg: "something went wrong" });
				} else {
                    res.json({ msg: "user created" });
                }
		    });
        }
    });
});

//getuser POST ******************************
app.post("/api/getuser",verifyToken, async (req, res) => {
    //Check if email exist
    db.each("SELECT COUNT(*) AS total FROM users WHERE email LIKE ?",
    req.body.email, async (err, row) => {
        if (row.total == 0) {
            //Email not exists
            console.log("email wrong or not logged in");
            res.json({ msg: "email wrong or not logged in"});
        } else {
            db.each("SELECT * FROM users WHERE email LIKE ?",
            req.body.email, async (err, row) => {
                if (err) {
                    console.log("something went wrong");
                    res.json({
                        msg: "something went wrong"
                    });
                } else {
                    korv_dec = korv.toFixed(2);
                    res.json({
                        funds: row.funds,
                        stock: row.stock,
                        stockprice: korv_dec,
                        msg: "user fetched"
                    });
                }
            });
        }
    });
});

//update POST ******************************
app.post("/api/updateuser",verifyToken,  async (req, res) => {
    //Check if email exist
    db.each("SELECT COUNT(*) AS total FROM users WHERE email LIKE ?",
    req.body.email, async (err, row) => {
        if (row.total == 0) {
            //Email not exists
            console.log("email wrong or not logged in");
            res.json({ msg: "email wrong or not logged in"});
        } else {
            db.each("SELECT * FROM users WHERE email LIKE ?",
            req.body.email, async (err, row) => {
                if (err) {
                    console.log("something went wrong");
                    res.json({
                        msg: "something went wrong"
                    });
                } else {
                    if (req.body.add_funds != "") {
                        let addedFunds = parseFloat(row.funds) + parseFloat(req.body.add_funds);
                        db.run("UPDATE users SET funds = ? WHERE email = ?",
                            addedFunds, req.body.email, (err) => {
                            if (err) {
                                res.json({ msg: "error" });
                            } else {
                                res.json({ msg: "success" });
                            }
                        });
                    } else if (req.body.buy != "") {
                        let cost2buy = parseFloat(req.body.buy) * parseFloat(korv);
                        let fundsAfter = parseFloat(row.funds) - parseFloat(cost2buy);
                        let stockAfter = parseFloat(row.stock) + parseFloat(req.body.buy);

                        db.run("UPDATE users SET funds = ?, stock = ? WHERE email = ?",
                            fundsAfter, stockAfter, req.body.email, (err) => {
                            if (err) {
                                res.json({ msg: "error" });
                            } else {
                                res.json({ msg: "success" });
                            }
                        });
                    } else {
                        let price4sell = parseFloat(req.body.sell) * parseFloat(korv);
                        let fundsAfter = parseFloat(row.funds) + parseFloat(price4sell);
                        let stockAfter = parseFloat(row.stock) - parseFloat(req.body.sell);

                        db.run("UPDATE users SET funds = ?, stock = ? WHERE email = ?",
                            fundsAfter, stockAfter, req.body.email, (err) => {
                            if (err) {
                                res.json({ msg: "error" });
                            } else {
                                res.json({ msg: "success" });
                            }
                        });

                    }
                }
            });
        }
    });
});




// Verify Token
async function verifyToken(req, res, next) {
  // Get auth token value
  let userToken = req.body.token;

  // Check if bearer is empty
  if(userToken != "empty") {
    jwt.verify(userToken, 'secretkey', (err, authData) => {
      if(err) {
          res.json({
            msg: 'something went wrong'
          });
      } else {
          next();
      }
    });
  } else {
      res.json({
        msg: 'not logged in'
      });
  }
}




app.listen(8333, () => console.log('Server started on port 8333'));

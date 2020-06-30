const { admin, db } = require("../util/admin");
module.exports = (req, res, next) => {
  let Idtoken;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    Idtoken = req.headers.authorization.split("Bearer ")[1];
    console.log(Idtoken);
  } else {
    return res.status(400).json({ message: "Authorization failed" });
  }

  admin
    .auth()
    .verifyIdToken(Idtoken)
    .then((decodedToken) => {
      req.user = decodedToken;
      return db
        .collection("user")
        .where("userID", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.handle = data.docs[0].data().handle;
      req.user.imageUrl = data.docs[0].data().imageUrl;
      return next();
    })
    .catch((err) => {
      return res.status(400).json({ error: err.code });
    });
};

const { db, admin } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
firebase.initializeApp(config);

const {
  validateLoginData,
  validateSignupData,
  reduceUserDetails,
} = require("../util/validators");
const { user } = require("firebase-functions/lib/providers/auth");
//User login
exports.login = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
  };
  var token;
  const { errors, valid } = validateLoginData(newUser);
  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(newUser.email, newUser.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((idtoken) => {
      token = idtoken;
      return res.json({ token });
    })
    .catch((err) => {
      if (err.code === "auth/invalid-email") {
        return res.status(403).json({ email: "Email is invalid" });
      } else if (err.code === "auth/user-not-found") {
        return res
          .status(403)
          .json({ general: "Email or Password is incorrect" });
      } else if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "Email or Password is incorrect" });
      } else {
        return res.status(403).json({ error: err.code });
      }
    });
};
//User sign up with info
exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  const { errors, valid } = validateSignupData(newUser);

  if (!valid) return res.status(400).json({ errors });

  var token, userID;
  db.doc(`user/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        res.status(400).json({ message: "THis handle already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userID = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idtoken) => {
      token = idtoken;
      const credentials = {
        email: newUser.email,
        handle: newUser.handle,
        createdAt: new Date().toISOString(),
        userID: userID,
        imageUrl: `https:///firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/no-image.png?alt=media`,
      };
      return db
        .doc(`/user/${newUser.handle}`)
        .set(credentials, { merge: true });
    })
    .then((data) => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ message: "Email already in use" });
      }
      return res
        .status(500)
        .json({ message: `Have some eroor`, error: err.code });
    });
};
//Upload Img to user profile
exports.upLoadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUpload = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (
      mimetype !== "image/jpeg" &&
      mimetype !== "image/png" &&
      mimetype !== "image/jpg"
    ) {
      return res.status(400).json({ error: "Wrong file type" });
    }
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    imageFileName = `${Math.round(
      Math.random() * 10000000000000000000
    )}.${imageExtension}`;

    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUpload = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUpload.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUpload.mimetype,
          },
        },
      })
      .then(() => {
        const imgUrl = `https:///firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/user/${req.user.handle}`).update({ imageUrl: imgUrl });
      })
      .then(() => {
        return res.json({ message: "Upload Successfuly" });
      })
      .catch((err) => {
        return res
          .status(400)
          .json({ message: "Upload failed", err: err.code });
      });
  });
  busboy.end(req.rawBody);
};

//Add user detail to the datbase user
exports.addUserDetails = (req, res) => {
  let UserDetails = reduceUserDetails(req.body);

  db.doc(`/user/${req.user.handle}`)
    .set(UserDetails, { merge: true })
    .then(() => {
      return res.json({ message: "Detail was submited" });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.code });
    });
};

exports.getUserDetails = (req, res) => {
  let userdata = {};
  db.doc(`/user/${req.params.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userdata = doc.data();
        return db
          .collection("screams")
          .where("userHandle", "==", req.params.handle)
          .limit(10)
          .get();
      } else {
        return res.status(400).json({ message: "User not be found" });
      }
    })
    .then((data) => {
      userdata.screams = [];
      data.forEach((doc) => {
        userdata.screams.push(doc.data());
      });
      return res.json(userdata);
    })
    .catch((err) => {
      return res.status(500).json({ error: err.code });
    });
};

exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/user/${req.user.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return (
          db
            .collection("likes")
            .where("userHandle", "==", req.user.handle)
            //.orderBy("createdAt", "desc")fr
            .get()
        );
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      //return res.json(userData);
      return db
        .collection("notifications")
        .where("recipient", "==", req.user.handle)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        userData.notifications.push(
          Object.assign(doc.data(), { notificationsId: doc.id })
        );
      });
      return res.json(userData);
    })
    .catch((err) => {
      return res.status(500).json({ error: err.code });
    });
};

exports.markNotifications = (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: "Notification marked" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

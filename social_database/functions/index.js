const functions = require("firebase-functions");
const app = require("express")();

const {
  getAllScreams,
  postOneScream,
  getScream,
  commentOnScream,
  likeScream,
  unlikeScream,
  deleteScream,
} = require("./handlers/scream");
const {
  login,
  signup,
  upLoadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotifications,
} = require("./handlers/user");
const FBAuth = require("./util/FBAuth");
const firebase = require("firebase");
const { db } = require("./util/admin");
const config = require("./util/config");
const { DataSnapshot } = require("firebase-functions/lib/providers/database");
if (firebase.apps.length === 0) {
  firebase.initializeApp(config);
}

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, postOneScream);

app.get("/scream/:screamId", getScream);
app.post("/scream/:screamId/comment", FBAuth, commentOnScream);
app.get("/scream/:screamId/like", FBAuth, likeScream);
app.get("/scream/:screamId/unlike", FBAuth, unlikeScream);
app.get("/scream/:screamId/delete", FBAuth, deleteScream);

app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, upLoadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user/:handle", getUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.post("/notifications", FBAuth, markNotifications);
exports.api = functions.region("asia-east2").https.onRequest(app);

exports.createNofitication = functions
  .region("asia-east2")
  .firestore.document("likes/{id}")
  .onCreate((snapshot) => {
    db.doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: true,
            read: false,
            screamId: snapshot.data().screamId,
          });
        }
      })
      .catch((err) => {
        return res.status(400).json({ err: err.code });
      });
  });

exports.deleteNotificationOnUnlike = functions
  .region("asia-east2")
  .firestore.document("likes/{id}")
  .onDelete((snapshot) => {
    db.doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        return res.status(400).json({ err: err.code });
      });
  });

exports.createNofiticationOnComment = functions
  .region("asia-east2")
  .firestore.document(`/comments/{id}`)
  .onCreate((snapshot) => {
    db.doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: true,
            read: false,
            screamId: snapshot.data().screamId,
          });
        }
      })
      .catch((err) => {
        return res.status(400).json({ err: err.code });
      });
  });

exports.onUserImageChange = functions
  .region("asia-east2")
  .firestore.document("user/{userId}")
  .onUpdate((snapshot) => {
    if (snapshot.before.data().imageUrl !== snapshot.after.data().imageUrl) {
      const batch = db.batch();
      return db
        .collection(`screams`)
        .where("userHandle", "==", snapshot.before.data().handle)
        .get()
        .then((data) =>
          data.forEach((doc) => {
            const scream = db.doc(`/screams/${doc.id}`);
            batch.update(scream, {
              userImage: snapshot.after.data().imageUrl,
            });
          })
        )
        .then(() => batch.commit())
        .then((err) => {
          console.log(err.code);
        });
    }
  });

exports.deleteScream = functions
  .region("asia-east2")
  .firestore.document("screams/{screamId}")
  .onDelete((snapshot, context) => {
    const batch = db.batch();
    const screamId = context.params.screamId;
    return db
      .collection(`notifications`)
      .where("screamId", "==", screamId)
      .get()
      .then((data) => {
        data.forEach((doc) => batch.delete(db.doc(`/notifications/${doc.id}`)));
        return db.collection(`likes`).where("screamId", "==", screamId).get();
      })
      .then((data) => {
        data.forEach((doc) => batch.delete(db.doc(`/likes/${doc.id}`)));
        return db
          .collection(`comments`)
          .where("screamId", "==", screamId)
          .get();
      })
      .then((data) => {
        return data.forEach((doc) =>
          batch.delete(db.doc(`/comments/${doc.id}`))
        );
      })
      .then(() => {
        return batch.commit();
      })
      .catch((err) => {
        console.log(err.code);
      });
  });

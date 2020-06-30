const { db } = require("../util/admin");

exports.getAllScreams = (req, res) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let screams = [];
      data.forEach((doc) => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage,
        });
      });
      return res.json(screams);
    })
    .catch((err) => console.error(err));
};

exports.postOneScream = (req, res) => {
  if (req.body.body.trim() == "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }
  const newScreams = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
    userImage: req.user.imageUrl,
    likeCount: 0,
    commentCount: 0,
    read: false,
  };

  db.collection("screams")
    .add(newScreams)
    .then((doc) => {
      res.json({ message: "Ok Document has been save" });
    })
    .catch((err) => {
      res.status(500).json({ error: "Some thing wrong" });
      console.error(err);
    });
};

//user with auth get scream
exports.getScream = (req, res) => {
  var screamData = {};
  //console.log(req.params.screamId);
  db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(400).json({ message: "Scream not found" });
      }
      screamData = doc.data();

      screamData.screamId = doc.id;
      return (
        db
          .collection("comments")
          //.orderBy("createdAt", "desc")
          .where("screamId", "==", req.params.screamId)
          .get()
      );
    })
    .then((data) => {
      screamData.comments = [];
      data.forEach((doc) => {
        screamData.comments.push(doc.data());
      });
    })
    .then(() => {
      return res.json(screamData);
    })
    .catch((err) => {
      res.json({ error: err.code });
    });
};

exports.commentOnScream = (req, res) => {
  if (req.body.body.trim() == "")
    return res.status(400).json("body can not empty");
  db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(400).json("Scream Not found");
      }
      const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        screamId: req.params.screamId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
      };
      db.collection("comments").add(newComment);
    })
    .then((data) => {
      return res.json({ newComment });
    })
    .catch((err) => {
      return res.json({ error: err.code });
    });
};

exports.likeScream = (req, res) => {
  let screamData = {};

  let screamDoc = db.doc(`/screams/${req.params.screamId}`);

  screamDoc
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(400).json("Scream Not found");
      } else {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .where("screamId", "==", req.params.screamId)
          .limit(1)
          .get();
      }
    })
    .then((data) => {
      if (data.empty) {
        db.collection("likes")
          .add({
            screamId: screamData.screamId,
            userHandle: req.user.handle,
            createdAt: new Date().toISOString(),
          })
          .then(() => {
            screamData.likeCount++;
            return screamDoc.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            return res.json(screamData);
          });
      } else {
        return res.json("Scream already like");
      }
    })
    .catch((err) => {
      return res.json({
        error: "Some error",
      });
    });
};

exports.unlikeScream = (req, res) => {
  let screamData = {};

  let screamDoc = db.doc(`/screams/${req.params.screamId}`);
  screamDoc
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(400).json("Scream Not found");
      } else {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .where("screamId", "==", req.params.screamId)
          .limit(1)
          .get();
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json("Scream has not been like");
      } else {
        db.doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            return screamDoc.update({ likeCount: screamData.likeCount - 1 });
          });
      }
    })
    .then(() => {
      return res.json({ message: "Unlike" });
    })
    .catch((err) => {
      return res.json({ error: "Scream already liked by user" });
    });
};

exports.deleteScream = (req, res) => {
  db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(400).json("Scream are not create");
      } else {
        if (doc.data().userHandle != req.user.handle) {
          return res
            .status(400)
            .json("You do not have permission to delete it");
        } else {
          db.doc(`/screams/${req.params.screamId}`)
            .delete()
            .then(() => {
              res.status(200).json("Scream deleted");
            });
        }
      }
    })
    .catch((err) => {
      return res.status(400).json({ err: err.code });
    });
};

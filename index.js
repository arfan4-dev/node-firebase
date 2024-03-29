const express = require("express");
const app = express();
const ejs = require("ejs");
const path = require("path");
const cors = require("cors");
const { User, db, doc } = require("./firebase");
const { snapshot, docs } = require("firebase/firestore");
const multer = require("multer");
const admin = require("firebase-admin");
const { getStorage, getDownloadURL } = require("firebase-admin/storage");
const morgan = require("morgan");

const serviceAccount = require("./firebase-admin.json");
const { v4: uuidv4 } = require("uuid");
const methodOverride = require("method-override");

// **************  MIDDLEWARES
app.set("view engine", "ejs");
app.use(cors());
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(morgan("dev"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://crud-nodejs-cb11c.appspot.com",
});

let storage1 = multer.memoryStorage();
const bucket = admin.storage().bucket();
// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage1 });

// ************** ROUTES
app.get("/", (req, res) => {
  res.redirect("/post");
});

// get all posts
app.get("/post", async (req, res) => {
  try {
    const snapshot = await User.get();
    const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    // console.log(list);
    res.render("index", { list });
  } catch (error) {
    // Handling error
    console.error("Error getting documents: ", error);
    res.status(500).send("Error retrieving posts");
  }
});

// route  to create a new post
app.get("/posts/new", (req, res) => {
  res.render("new.ejs");
});
// new post created
app.post("/posts", upload.single("avatar"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  let metadata = {
    metadata: {
      firebaseStorageDownloadTokens: uuidv4(),
    },
    contentType: req.file.mimetype,
    cacheControl: "public, max-age=31536000",
  };
  const file = req.file;

  // Upload the file to Firebase Storage
  const fileUpload = bucket.file(`${Date.now()}-${file.originalname}`);

  const stream = fileUpload.createWriteStream({
    metadata,
    gzip: true,
  });
  stream.on("error", (err) => {
    console.error("Error uploading to Firebase Storage:", err);
    res.status(500).send("Error uploading file.");
  });

  stream.on("finish", async () => {
    const downloadURL = await getDownloadURL(fileUpload);
    // Once the file is uploaded, get the download URL
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;

    let data = req.body;
    data.downloadURL = downloadURL; // Assuming you have a field named 'downloadUrl' in your data
    await User.add({ data });
    // res.render('index.ejs', { fileUpload })
    res.redirect("/post");
  });

  stream.end(req.file.buffer);
});


//patch request
app.patch("/posts/:id", upload.single("avatar"), async (req, res) => {
  const { id } = req.params;
  const newContent = req.body.content;
  // let newDownloadURL = null;

  try {
    const file = req.file;

    if (file) {
      // Upload the file to Firebase Storage
      let metadata = {
        metadata: {
          firebaseStorageDownloadTokens: uuidv4(),
        },
        contentType: file.mimetype,
        cacheControl: "public, max-age=31536000",
      };

      const fileUpload = bucket.file(`${Date.now()}-${file.originalname}`);
      const stream = fileUpload.createWriteStream({
        metadata,
        gzip: true,
      });

      stream.on("error", (err) => {
        console.error("Error uploading to Firebase Storage:", err);
        res.status(500).send("Error uploading file.");
      });

      stream.on("finish", async () => {
        const downloadURL = await getDownloadURL(fileUpload);
        console.log('downloadURL', downloadURL);
        let newDownloadURL = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;
        console.log('newDownloadURL', newDownloadURL);
        await updateFirestoreAndRespond(downloadURL);
      });

      stream.end(req.file.buffer);
    } else {
      await updateFirestoreAndRespond();
    }

    async function updateFirestoreAndRespond(downloadURL) {
      await User.doc(id).update({ "data.content": newContent, "data.downloadURL": downloadURL });

      // res.render('index.ejs', { fileUpload })
      res.redirect("/post");
    }
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).send("Error updating post");
  }
});


//edit post
app.get("/posts/:id/edit", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the specific document using its ID
    const docSnapshot = await User.doc(id).get();

    // Check if the document exists
    if (!docSnapshot.exists) {
      return res.status(404).send("Post not found");
    }

    // Get the document data
    const postData = docSnapshot.data();

    // Render the edit page with the document data
    res.render("edit.ejs", { post: postData, id });
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).send("Error fetching post");
  }
});

//get specific user

// app.get("/posts/:id", (req, res) => {
//   const { id } = req.params;
//   const post = data.find((p) => id === p.id);
//   res.render("show.ejs", { post });
//   console.log(post)
// });


//delete Post

// app.delete("/posts/:id", (req, res) => {
//   const { id } = req.params;
//   data = data.filter((p) => id !== p.id);

// });
app.delete("/posts/:id", async (req, res) => {
  const { id } = req.params;
  await User.doc(id).delete();
  res.redirect("/post");
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

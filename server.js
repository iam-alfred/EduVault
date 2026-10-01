require('dotenv').config();

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'materials.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const PUBLIC_DIR = path.join(ROOT, 'public');

// --------------------------------------------------
// CREATE REQUIRED FOLDERS / FILES
// --------------------------------------------------

for (const dir of [DATA_DIR, UPLOAD_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]');
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, '[]');
}

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(express.json({ limit: '1mb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '100kb'
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(express.static(PUBLIC_DIR));

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function readMaterials() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeMaterials(items) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(items, null, 2)
  );
}

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(
    USERS_FILE,
    JSON.stringify(users, null, 2)
  );
}

function safeName(name) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(401).json({
      error: 'Admin login required.'
    });
  }

  next();
}

// --------------------------------------------------
// PDF UPLOAD CONFIGURATION
// --------------------------------------------------

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const fileName =
      `${Date.now()}-` +
      `${crypto.randomBytes(5).toString('hex')}-` +
      `${safeName(path.basename(file.originalname, ext))}` +
      `${ext}`;

    cb(null, fileName);
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: 25 * 1024 * 1024
  },

  fileFilter: (_req, file, cb) => {
    const isPDF =
      file.mimetype === 'application/pdf' ||
      path.extname(file.originalname).toLowerCase() === '.pdf';

    if (isPDF) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'));
    }
  }
});

// ==================================================
// MATERIALS
// ==================================================

app.get('/api/materials', (req, res) => {
  let items = readMaterials();

  const q = String(req.query.q || '')
    .trim()
    .toLowerCase();

  const category = String(req.query.category || '')
    .trim()
    .toLowerCase();

  if (q) {
    items = items.filter((m) =>
      [
        m.title,
        m.category,
        m.course,
        m.author
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }

  if (category) {
    items = items.filter(
      (m) => String(m.category || '').toLowerCase() === category
    );
  }

  items.sort(
    (a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
  );

  res.json(items);
});

// ==================================================
// ADMIN LOGIN
// ==================================================

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10
});

app.post(
  '/api/admin/login',
  adminLoginLimiter,
  async (req, res) => {
    try {
      const adminUsername = String(
        process.env.ADMIN_USERNAME || ''
      );

      const adminPassword = String(
        process.env.ADMIN_PASSWORD || ''
      );

      const suppliedUsername = String(
        req.body.username || ''
      ).trim();

      const suppliedPassword = String(
        req.body.password || ''
      );

      if (!suppliedUsername || !suppliedPassword) {
        return res.status(400).json({
          error: 'Username and password are required.'
        });
      }

      if (
        suppliedUsername !== adminUsername ||
        suppliedPassword !== adminPassword
      ) {
        return res.status(401).json({
          error: 'Invalid username or password.'
        });
      }

      req.session.isAdmin = true;

      req.session.save((error) => {
        if (error) {
          console.error('Admin session error:', error);

          return res.status(500).json({
            error: 'Unable to create admin session.'
          });
        }

        res.json({
          ok: true,
          message: 'Admin login successful.'
        });
      });

    } catch (error) {
      console.error('Admin login error:', error);

      res.status(500).json({
        error: 'Unable to log in.'
      });
    }
  }
);

// --------------------------------------------------
// ADMIN STATUS
// --------------------------------------------------

app.get('/api/admin/me', (req, res) => {
  res.json({
    isAdmin: !!req.session.isAdmin
  });
});

// --------------------------------------------------
// ADMIN LOGOUT
// --------------------------------------------------

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error('Admin logout error:', error);

      return res.status(500).json({
        error: 'Unable to log out.'
      });
    }

    res.clearCookie('connect.sid');

    res.json({
      ok: true
    });
  });
});

// ==================================================
// ADMIN UPLOAD MATERIAL
// ==================================================

app.post(
  '/api/admin/materials',
  requireAdmin,
  upload.single('pdf'),
  (req, res) => {

    if (!req.file) {
      return res.status(400).json({
        error: 'Please upload a PDF file.'
      });
    }

    const title = String(
      req.body.title || ''
    ).trim();

    const category = String(
      req.body.category || ''
    ).trim();

    const course = String(
      req.body.course || ''
    ).trim();

    const author = String(
      req.body.author || ''
    ).trim();

    if (!title || !category || !course) {

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(400).json({
        error: 'Title, category and course are required.'
      });
    }

    const materials = readMaterials();

    const material = {
      id: crypto.randomUUID(),
      title,
      category,
      course,
      author,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      downloads: 0,
      createdAt: new Date().toISOString()
    };

    materials.push(material);

    writeMaterials(materials);

    res.status(201).json(material);
  }
);

// ==================================================
// ADMIN DELETE MATERIAL
// ==================================================

app.delete(
  '/api/admin/materials/:id',
  requireAdmin,
  (req, res) => {

    const materials = readMaterials();

    const item = materials.find(
      (m) => m.id === req.params.id
    );

    if (!item) {
      return res.status(404).json({
        error: 'Material not found.'
      });
    }

    const filePath = path.join(
      UPLOAD_DIR,
      item.fileName
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const updatedMaterials = materials.filter(
      (m) => m.id !== item.id
    );

    writeMaterials(updatedMaterials);

    res.json({
      ok: true
    });
  }
);

// ==================================================
// STUDENT REGISTRATION
// ==================================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const username = String(
      req.body.username || ''
    ).trim();

    const email = String(
      req.body.email || ''
    ).trim().toLowerCase();

    const password = String(
      req.body.password || ''
    );

    if (
      username.length > 30 ||
      email.length > 254 ||
      password.length > 128
    ) {
      return res.status(400).json({
        error: 'Username, email or password is too long.'
      });
    }

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email and password are required.'
      });
    }

    const users = readUsers();

    const exists = users.some(
      (user) =>
        user.username === username ||
        user.email === email
    );

    if (exists) {
      return res.status(409).json({
        error: 'Username or email already exists.'
      });
    }

    const salt = crypto
      .randomBytes(16)
      .toString('hex');

    const passwordHash = crypto
      .scryptSync(password, salt, 64)
      .toString('hex');

    const storedPassword =
      `${salt}:${passwordHash}`;

    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      passwordHash: storedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    writeUsers(users);

    res.status(201).json({
      ok: true,
      message: 'Account created successfully.'
    });

  } catch (error) {
    console.error('Registration error:', error);

    res.status(500).json({
      error: 'Unable to create account.'
    });
  }
});

// ==================================================
// STUDENT LOGIN
// ==================================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(
      req.body.email || ''
    ).trim().toLowerCase();

    const password = String(
      req.body.password || ''
    );

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.'
      });
    }

    const users = readUsers();

    const user = users.find(
      (u) => u.email === email
    );

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    const [salt, storedHash] =
      user.passwordHash.split(':');

    const hash = crypto
      .scryptSync(password, salt, 64)
      .toString('hex');

    if (hash !== storedHash) {
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Student login error:', error);

    res.status(500).json({
      error: 'Unable to log in.'
    });
  }
});

// ==================================================
// STUDENT SESSION
// ==================================================

app.get('/api/auth/me', (req, res) => {

  if (!req.session.userId) {
    return res.json({
      loggedIn: false
    });
  }

  res.json({
    loggedIn: true,
    user: {
      id: req.session.userId,
      username: req.session.username
    }
  });
});

// ==================================================
// STUDENT LOGOUT
// ==================================================

app.post('/api/auth/logout', (req, res) => {

  req.session.destroy((error) => {

    if (error) {
      console.error('Logout error:', error);

      return res.status(500).json({
        error: 'Unable to log out.'
      });
    }

    res.clearCookie('connect.sid');

    res.json({
      ok: true
    });
  });
});

// ==================================================
// DOWNLOAD MATERIAL
// ==================================================

app.get('/download/:id', (req, res) => {

  const materials = readMaterials();

  const item = materials.find(
    (m) => m.id === req.params.id
  );

  if (!item) {
    return res.status(404).send(
      'Material not found.'
    );
  }

  const filePath = path.join(
    UPLOAD_DIR,
    item.fileName
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).send(
      'PDF file is missing.'
    );
  }

  item.downloads =
    Number(item.downloads || 0) + 1;

  writeMaterials(materials);

  res.download(
    filePath,
    item.originalName ||
      `${item.title}.pdf`
  );
});

// ==================================================
// GEMINI AI TUTOR
// ==================================================

app.post('/api/ai/ask', async (req, res) => {

  try {

    const { GoogleGenAI } =
      require('@google/genai');

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const question = String(
      req.body.question || ''
    ).trim();

    if (!question) {
      return res.status(400).json({
        error: 'Please enter a question.'
      });
    }

    const response =
      await ai.models.generateContent({

        model: 'gemini-3.5-flash-lite',

        contents: question,

        config: {
          systemInstruction:
            'You are EduVault AI, a helpful educational study assistant. Explain concepts clearly and help students learn.'
        }
      });

    res.json({
      answer: response.text
    });

  } catch (error) {

    console.error('AI error:', error);

    res.status(500).json({
      error:
        'EduVault AI is temporarily unavailable.'
    });
  }
});

// ==================================================
// ADMIN PAGE
// ==================================================

app.get('/admin', (_req, res) => {
  res.sendFile(
    path.join(PUBLIC_DIR, 'admin.html')
  );
});

// ==================================================
// HOMEPAGE
// ==================================================

app.get('*', (_req, res) => {
  res.sendFile(
    path.join(PUBLIC_DIR, 'index.html')
  );
});

// ==================================================
// START SERVER
// ==================================================

app.listen(PORT, () => {
  console.log(
    `EduVault running at http://localhost:${PORT}`
  );
});

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { RecaptchaV2 } = require('express-recaptcha');

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }));

// Configure reCAPTCHA
const recaptcha = new RecaptchaV2(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY);

let users = {}; // In-memory user storage, for demo purposes

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'deopranjal0430@gmail.com', // Your email address
        pass: 'kczn uqmx rwpk surq',
    },
});

// Root route
app.get('/', (req, res) => {
    res.render('index'); // Renders the homepage with sign-up and sign-in options
});

// Signup route
app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP

    users[email] = { password: hashedPassword, otp };

    // Send OTP email
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('OTP sent: ' + info.response);
        res.render('otp-verification', { email });
    });
});

// OTP verification route
app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (users[email] && users[email].otp == otp) {
        delete users[email].otp; // OTP verified
        req.session.email = email; // Store user email in session
        res.redirect('/signin'); // Redirect to the sign-in page
    } else {
        res.send('Invalid OTP'); // Handle invalid OTP
    }
});

// Sign-in route
app.get('/signin', (req, res) => {
    res.render('signin', { recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY });
});

app.post('/signin', (req, res) => {
    const { email, password, 'g-recaptcha-response': captchaResponse } = req.body;

    recaptcha.verify(req, (error) => {
        if (error) {
            return res.send('Captcha validation failed');
        }

        if (users[email] && bcrypt.compareSync(password, users[email].password)) {
            req.session.email = email;
            res.redirect('/welcome');
        } else {
            res.send('Invalid email or password');
        }
    });
});

// Welcome route
app.get('/welcome', (req, res) => {
    if (req.session.email) {
        res.render('welcome', { email: req.session.email });
    } else {
        res.redirect('/signin');
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});

# RideCare – Auto Driver Earnings and Lost & Found Mobile App

## Project Overview

RideCare is a mobile application designed to help auto-rickshaw drivers manage their daily earnings and expenses while also helping users report and search for lost and found items.

The application provides a simple and user-friendly interface for recording financial details and connecting people who have lost items with those who have found them.

## Objectives

- Help auto-rickshaw drivers track daily earnings and expenses.
- Calculate net earnings to support better financial management.
- Allow users to report lost and found items.
- Help users search for reported items.
- Provide a simple and convenient mobile application experience.

## Features

### 1. Daily Earnings Management
- Record daily earnings.
- Track income and expenses.
- Calculate net earnings.
- Set and monitor daily earnings targets.

### 2. Lost and Found
- Report lost items.
- Report found items.
- View submitted reports.
- Search for lost or found items.

### 3. My Reports
- View previously submitted reports.
- Keep track of lost and found item information.

### 4. Mobile Application
- User-friendly interface.
- Mobile-focused design.
- Android application support through Capacitor.

### 5. Data Storage
- Store application information using the configured local storage/database mechanism.

## Technologies Used

- **HTML5** – Page structure
- **CSS3** – Styling and responsive design
- **JavaScript** – Application functionality
- **Node.js** – Server-side runtime
- **Express.js** – Web server framework
- **SQLite** – Local database
- **Capacitor** – Android application integration
- **Android Studio** – Android build and development environment
- **Git and GitHub** – Version control and project hosting

## Project Structure

```text
RideCare/
├── android/             # Android application files
├── css/                 # Stylesheets
├── js/                  # JavaScript source files
├── www/                 # Web assets for the mobile app
├── index.html           # Main page
├── earnings.html        # Earnings management
├── my-reports.html      # User reports
├── report-found.html    # Found item reporting
├── report-lost.html     # Lost item reporting
├── search.html          # Item search
├── server.js            # Server application
├── package.json         # Project configuration
└── capacitor.config.json
```

## Installation and Running Instructions

### Prerequisites

Install the following software:

- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/)
- A modern web browser

### Step 1: Clone the Repository

```bash
git clone https://github.com/suranjitha/RideCare.git
```

### Step 2: Open the Project Folder

```bash
cd RideCare
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start the Application

If the project defines a `start` script in `package.json`, run:

```bash
npm start
```

Otherwise, if `server.js` is the configured entry point, run:

```bash
node server.js
```

### Step 5: Open the Application

Open the local URL displayed by the server in your browser. For example, if the server uses port 5000, visit:

```text
http://localhost:5000
```

**Note:** The actual start command and URL depend on the project's configuration.

## Screenshots

Add screenshots of the application here to show its main pages.

Suggested screenshots:
- Home or dashboard page
- Daily earnings page
- Lost item reporting page
- Found item reporting page
- Item search page
- My reports page

Example Markdown syntax:

```markdown
![RideCare Dashboard](screenshots/dashboard.png)
```

Place your screenshots in a folder named `screenshots` in the project directory.

## Future Enhancements

- User authentication and secure profiles.
- Cloud synchronization and online data backup.
- Improved lost and found item matching.
- Notifications for relevant item reports.
- More detailed earnings reports and analytics.

## Author

**Suranjitha S**

BCA Student

GitHub: [suranjitha](https://github.com/suranjitha)

## License

This project is currently available for educational and demonstration purposes. No formal open-source license has been specified.

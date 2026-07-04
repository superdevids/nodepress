# 🔧 Troubleshooting Guide

> **Stuck? Don't worry.**
> Most problems have simple fixes.
> Read the section that matches your issue.

---

## 📖 How to Use This Guide

1. Find the problem that sounds like yours
2. Try the fix in order (Fix 1, then Fix 2, etc.)
3. If nothing works, ask for help at the bottom

---

## 🚫 "I Don't See the Setup Page"

**Problem:** You ran the installer.
But no browser window opened.

**Fix 1: Open your browser manually**

1. Open Chrome, Edge, or Safari
2. Type this in the address bar: `http://localhost:3000`
3. Press Enter

**Fix 2: Wait a bit longer**

The server needs about 30 seconds to start.

Wait 30 seconds. Try again.

**Fix 3: Check if the installer is still running**

Look at the black terminal window.

Do you see text moving? Wait more.

Has it stopped? Look for error messages.

**Fix 4: Run the installer again**

1. Close the black terminal window
2. Double-click `install.bat` or `install.sh` again
3. Wait for it to finish

---

## 🔑 "I Forgot My Admin Password"

**Problem:** You can't log in.

**Fix 1: Use the "Forgot Password" link**

1. Go to `http://localhost:3000/admin/login`
2. Click **"Forgot Password?"**
3. Type your email address
4. Check your email inbox
5. Click the link in the email
6. Create a new password

**Fix 2: Check your spam folder**

Didn't get the email?

Check your Spam or Junk folder.

**Fix 3: The forgot password page might not work yet**

NodePress is still in beta.

The "Forgot Password" feature is still being built.

If the link doesn't work:

1. Ask your website admin to reset it
2. Or reinstall NodePress (you will lose your data)

---

## ⚪ "The Page Is Blank / White"

**Problem:** You see a white screen. Nothing else.

**Fix 1: Refresh the page**

Press `F5` on your keyboard.

Or click the refresh button in your browser.

**Fix 2: Wait and refresh again**

The server might still be starting.

Wait 10 seconds. Refresh again.

**Fix 3: Clear your browser cache**

**In Chrome:**

1. Click the three dots (top-right)
2. Click **Settings**
3. Search for "clear cache"
4. Click **Clear data**

**In Edge:**

1. Click the three dots (top-right)
2. Click **Settings**
3. Search for "clear cache"
4. Click **Choose what to clear**

**In Safari:**

1. Click **Safari** in the top menu
2. Click **Clear History**
3. Choose **All history**
4. Click **Clear**

**Fix 4: Check if Docker is running**

Look for the Docker icon:

- 🐳 On Windows: Look in the system tray (bottom-right)
- 🐳 On Mac: Look in the top menu bar

If you see the Docker icon, it is running.

If not:

1. Open Docker Desktop from your Start Menu or Applications folder
2. Wait for it to be ready
3. Run the installer again

---

## 🔌 "Port Already in Use"

**Problem:** You see an error about a port.

Something like: `port 3000 is already in use`

**What this means:**

Another program is using the same door (port) that NodePress needs.

**Fix 1: Close other programs**

Close programs you are not using:

- Other website builders
- Other coding tools
- Other servers

Then try again.

**Fix 2: Restart your computer**

Sometimes this is the easiest fix.

1. Save your work
2. Restart your computer
3. Run the installer again

**Fix 3: Find what is using the port**

**On Windows:**

1. Open Command Prompt
2. Type: `netstat -ano | findstr :3000`
3. Press Enter
4. You will see a number in the last column (PID)
5. Type: `taskkill /PID <number> /F`
6. Press Enter

**On Mac or Linux:**

1. Open Terminal
2. Type: `lsof -i :3000`
3. Press Enter
4. Type: `kill -9 <number>`
5. Press Enter

**Fix 4: Use a different port (advanced)**

Ask a developer for help with this.

---

## ❌ "npm install Fails"

**Problem:** The installer stops at "Installing dependencies"

**Fix 1: Check your internet**

The installer needs to download files from the internet.

Make sure you are connected to WiFi or ethernet.

**Fix 2: Try again**

Sometimes the download has a hiccup.

Just run the installer again.

**Fix 3: Install Node.js manually**

1. Go to `https://nodejs.org`
2. Download the LTS version (left button)
3. Install it
4. Restart your computer
5. Run the installer again

**Fix 4: Disable your firewall temporarily**

Some firewalls block the installer.

Turn off your firewall for 5 minutes.

Run the installer again.

Turn your firewall back on.

---

## 🐳 "Docker Is Not Working"

**Problem:** The installer says Docker is missing or failing.

**Fix 1: Install Docker Desktop**

1. Go to `https://www.docker.com/products/docker-desktop/`
2. Download Docker Desktop
3. Open the downloaded file
4. Follow the install steps (click Next, Next, Finish)
5. Open Docker Desktop (look for the whale icon 🐳)
6. Wait for it to say "Docker Desktop is running"
7. Run the NodePress installer again

**Fix 2: Restart Docker Desktop**

1. Find the Docker whale icon 🐳
2. Right-click it
3. Click **Restart**
4. Wait 30 seconds
5. Run the installer again

**Fix 3: Skip Docker entirely**

You can use NodePress without Docker.

On Windows:

1. Open Command Prompt
2. Go to your NodePress folder
3. Type: `npm install`
4. Press Enter
5. Wait for it to finish
6. Type: `npm start`
7. Press Enter

On Mac:

1. Open Terminal
2. Go to your NodePress folder
3. Type: `npm install`
4. Press Enter
5. Wait for it to finish
6. Type: `npm start`
7. Press Enter

---

## 🐛 "I See an Error Message I Don't Understand"

**Problem:** The terminal shows red text with errors.

**Fix 1: Read the error**

Look at the last line of the error.

It usually tells you what is wrong.

Common errors:

| Error Message       | What It Means            | What To Do                                |
| ------------------- | ------------------------ | ----------------------------------------- |
| `command not found` | A program is missing     | Install Node.js from `https://nodejs.org` |
| `permission denied` | Your computer blocked it | Run the installer as Administrator        |
| `EADDRINUSE`        | Port is busy             | See "Port Already in Use" above           |
| `ENOTFOUND`         | No internet              | Check your internet connection            |
| `ECONNRESET`        | Connection dropped       | Try again                                 |

**Fix 2: Take a screenshot**

Take a picture of the error.

Ask for help on GitHub.

Include the screenshot in your question.

**Fix 3: Ask for help**

See the "Need Help?" section below.

---

## 🐌 "NodePress Is Running Slowly"

**Problem:** Pages take a long time to load.

**Fix 1: Close other programs**

Your computer might be busy.

Close programs you are not using.

**Fix 2: Restart NodePress**

Close the terminal window.

Run the installer again.

**Fix 3: Restart your computer**

This fixes many problems.

---

## 📂 "I Can't Find My Files"

**Problem:** You downloaded NodePress but can't find it.

**Fix 1: Check your Downloads folder**

Most downloaded files go to:

- Windows: `C:\Users\YourName\Downloads`
- Mac: `~/Downloads`

**Fix 2: Search for "nodepress"**

On Windows:

1. Click the search bar (next to the Start button)
2. Type: `nodepress`
3. Press Enter

On Mac:

1. Press `Command + Space`
2. Type: `nodepress`
3. Press Enter

---

## 🔄 "I Want to Start Over"

**Problem:** Something went wrong. You want a fresh start.

**Fix: Delete and reinstall**

1. Delete the `nodepress` folder
2. Download NodePress again from GitHub
3. Extract the ZIP file
4. Run the installer again

---

## 🆘 Need Help?

If none of these fixes work, ask us!

We are friendly and we want to help.

| Where to Ask          | Link                                                   |
| --------------------- | ------------------------------------------------------ |
| 💬 GitHub Discussions | `https://github.com/superdevids/nodepress/discussions` |
| 🐛 Report a Bug       | `https://github.com/superdevids/nodepress/issues`      |
| 📖 FAQ                | `docs/FAQ.md`                                          |

**When asking for help, please include:**

1. What computer you have (Windows, Mac, or Linux)
2. What you were doing when the problem happened
3. What error message you saw (or a screenshot)
4. What fixes you already tried

This helps us help you faster!

---

**You've got this! Every problem has a solution. 💪**

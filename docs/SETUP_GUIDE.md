# Step-by-step guide: run DET Practice on your Windows PC

Everything here is free. Plan about 30–45 minutes the first time, mostly waiting for downloads.
After that, starting the app takes one command (step 8).

---

## Step 1: Install Python

1. Go to https://www.python.org/downloads/ and download **Python 3.12** (or newer).
2. Run the installer. **On the first screen, tick "Add python.exe to PATH"**, then click
   **Install Now**.
3. Check it worked: open **PowerShell** (Start menu → type `PowerShell` → Enter) and run:
   ```powershell
   python --version
   ```
   You should see something like `Python 3.12.x`.

## Step 2: Install Node.js

The app's web page is built with Node.js.

1. Go to https://nodejs.org and download the **LTS** version.
2. Run the installer and accept the defaults.
3. **Close PowerShell and open a new one** (so it sees Node.js), then check:
   ```powershell
   node --version
   ```

## Step 3: Get the latest code

The app is on the branch `claude/zen-newton-xk6n73`. In PowerShell:

```powershell
cd C:\Users\alero\Documents\GitHub\English_Speaking_AI_Examiner
git fetch origin
git checkout claude/zen-newton-xk6n73
git pull
```

(If you use **GitHub Desktop**: open the repository, click **Fetch origin**, then choose the
branch `claude/zen-newton-xk6n73` from the **Current branch** menu.)

You should now see the folders `backend`, `frontend`, `content` and the file `run.py`.

## Step 4: Install the Python packages

Still in the project folder in PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r backend\requirements.txt
```

This creates a private Python environment in the `.venv` folder and installs the app's packages
into it (about 1–3 minutes).

## Step 5: Install Ollama (the free AI that gives feedback)

1. Go to https://ollama.com/download and install **Ollama for Windows**.
2. In PowerShell, download the AI model (about 3 GB):
   ```powershell
   ollama pull gemma3:4b
   ```
3. Ollama now runs in the background (you'll see its llama icon in the system tray near the
   clock). It starts automatically with Windows.

**Better feedback, if your PC is strong** (16 GB+ RAM or a graphics card): also run
`ollama pull gemma3:12b`, and in step 8 start the app with
`$env:DET_OLLAMA_MODEL="gemma3:12b"; .venv\Scripts\python run.py` instead.

You can skip this step: everything still works except the AI grading. For writing and speaking
answers you can still use the **Copy for Claude** button.

## Step 6: Add photos (for the two photo tasks)

Put 10 or more `.jpg` or `.png` photos in the folder `content\photos\`. Like the real test,
use real photos of people, animals or objects in everyday situations: for example, free
photos from https://unsplash.com or https://www.pexels.com, or your own.

## Step 7: Choose your browser

Use **Microsoft Edge** or **Google Chrome**. Edge has the most natural free voices for the
listening and Interactive Speaking tasks.

## Step 8: Start the app

```powershell
cd C:\Users\alero\Documents\GitHub\English_Speaking_AI_Examiner
.venv\Scripts\python run.py
```

The first time, this builds the web page (about 1 minute). Then your browser opens
**http://localhost:8000** automatically. If it doesn't, open that address yourself.

Keep the PowerShell window open while you practice. To stop the app, click that window and
press **Ctrl + C**.

## Step 9: Check that everything is green

At the top of the home page there are three status lights:

| Light | If it's grey |
|---|---|
| **AI feedback (gemma3:4b)** | Ollama isn't running or the model isn't downloaded: redo step 5 |
| **Speech-to-text** | Redo step 4 |
| **N photos** | Add photos (step 6) |

## Step 10: Practice

- Click any question type, read the tips, choose a difficulty (for the reading and listening
  tasks), and click **Start**.
- **Speaking tasks:** the first time, the browser asks to use your microphone. Click **Allow**.
- **The first recording is slow:** the app downloads the speech-recognition model (about 500 MB)
  once. After that it's much faster.
- **AI feedback takes time:** on a normal laptop, grading can take 30 seconds to a couple of
  minutes. A graphics card makes it much faster.

---

## Every day after that

**Double-click `Start DET Practice.bat`** in the project folder. A black window opens and your
browser opens the app. Keep the window open while you practice; **close it to stop the app**.

For a desktop shortcut: right-click `Start DET Practice.bat` → **Show more options** →
**Send to** → **Desktop (create shortcut)**.

Or, in PowerShell:

```powershell
cd C:\Users\alero\Documents\GitHub\English_Speaking_AI_Examiner
.venv\Scripts\python run.py
```

To stop it from PowerShell, press **Ctrl + C** in that window.

## When there's a new version

```powershell
cd C:\Users\alero\Documents\GitHub\English_Speaking_AI_Examiner
git pull
.venv\Scripts\python -m pip install -r backend\requirements.txt
.venv\Scripts\python run.py
```

`run.py` notices the new code and rebuilds the web page by itself.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `python` is not recognized | Reinstall Python and tick **Add python.exe to PATH**, then open a new PowerShell |
| `Node.js is needed to build the web page` | Install Node.js (step 2) and open a new PowerShell |
| `ollama` is not recognized | Open a new PowerShell after installing Ollama, or restart the PC |
| Page says **Cannot reach the backend** | The PowerShell window running `run.py` was closed. Run step 8 again |
| `address already in use` / port 8000 busy | The app is already running in another window. Use that one, or close it first |
| No sound in listening tasks | Check the volume. Try Edge. In Windows Settings → Time & language → Speech, install an English voice |
| Microphone doesn't work | Click the lock icon left of the address bar → allow **Microphone**. Check Windows Settings → Privacy → Microphone |
| Speech-to-text is too slow | Stop the app, then start it with `$env:DET_WHISPER_MODEL="base"; .venv\Scripts\python run.py` (faster, a bit less accurate) |
| AI feedback is very slow or says it timed out | Use the smaller model (`gemma3:4b`), close other heavy programs, or use **Copy for Claude** |
| A warning about "symlinks" during the first recording | Harmless on Windows. Ignore it |

If something else goes wrong, copy the error text from the PowerShell window and send it to me.

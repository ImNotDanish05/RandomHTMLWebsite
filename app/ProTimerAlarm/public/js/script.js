// --- URL Sound Assets (Google Actions Library) ---
const soundLibrary = {
    'beep': 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
    'digital': 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    'bell': 'https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg',
    'mechanic': 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg',
    'scifi': 'https://actions.google.com/sounds/v1/alarms/sci_fi_alarm.ogg'
};

let interval;
let totalSeconds = 0;
let initialTotalSeconds = 0;
let fired = {}; // Stores which alarms have fired
let isRunning = false;
let isPaused = false;
let audioCtx;
let activeAudioObject = null; // To store looping audio instance

// --- COOKIE & STORAGE LOGIC ---
const COOKIE_NAME = "timer_settings_v1";
const LOGO_STORAGE_KEY = "timer_custom_logo";

window.onload = function() {
    // 1. Load Logo first (from localStorage)
    loadLogo();

    // 2. Check Cookie Consent
    const hasConsent = getCookie("cookieConsent");
    
    if (hasConsent === "true") {
        loadData();
    } else {
        document.getElementById("cookieOverlay").style.display = "flex";
        loadDefaults(); 
    }
};

function acceptCookies() {
    setCookie("cookieConsent", "true", 365); // Simpan izin 1 tahun
    document.getElementById("cookieOverlay").style.display = "none";
    
    // Simpan semua data saat ini (termasuk logo yang mungkin baru diupload sebelum klik accept)
    saveData();
    
    // Simpan logo eksplisit jika ada di tampilan
    const currentLogo = document.getElementById('logoDisplay').src;
    if (currentLogo && currentLogo.startsWith('data:image')) {
        localStorage.setItem(LOGO_STORAGE_KEY, currentLogo);
    }
}

// --- LOGO UPLOAD LOGIC ---
function handleLogoUpload(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
            // Tampilkan gambar
            document.getElementById('logoDisplay').src = e.target.result;
            
            // Simpan ke localStorage jika user sudah memberi izin
            if (getCookie("cookieConsent") === "true") {
                try {
                    localStorage.setItem(LOGO_STORAGE_KEY, e.target.result);
                } catch (err) {
                    alert("Gambar terlalu besar untuk disimpan otomatis. Gunakan gambar yang lebih kecil (< 2MB).");
                }
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function loadLogo() {
    const savedLogo = localStorage.getItem(LOGO_STORAGE_KEY);
    if (savedLogo) {
        document.getElementById('logoDisplay').src = savedLogo;
    }
}

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function saveData() {
    // Hanya simpan jika user sudah setuju
    if (getCookie("cookieConsent") !== "true") return;

    const duration = document.getElementById("timerDuration").value;
    const endSound = document.getElementById("endSoundSelect").value;
    const endLoop = document.getElementById("endLoopCheck").checked;
    
    const alarms = [];
    document.querySelectorAll(".alarm-row").forEach(row => {
        const t = row.querySelector(".alarm-input").value;
        const s = row.querySelector(".sound-select").value;
        if(t) alarms.push({ time: t, sound: s });
    });

    const data = {
        duration: duration,
        endSound: endSound,
        endLoop: endLoop,
        alarms: alarms
    };

    setCookie(COOKIE_NAME, JSON.stringify(data), 30);
}

function loadData() {
    const dataStr = getCookie(COOKIE_NAME);
    if (!dataStr) {
        loadDefaults();
        return;
    }

    try {
        const data = JSON.parse(dataStr);
        
        if(data.duration) document.getElementById("timerDuration").value = data.duration;
        if(data.endSound) document.getElementById("endSoundSelect").value = data.endSound;
        if(data.endLoop !== undefined) document.getElementById("endLoopCheck").checked = data.endLoop;

        const list = document.getElementById("alarmList");
        list.innerHTML = ""; 
        
        if (data.alarms && data.alarms.length > 0) {
            data.alarms.forEach(a => addAlarmField(a.time, a.sound));
        } else {
            // No default alarms if user cleared them previously
        }
    } catch(e) {
        console.error("Gagal memuat cookie", e);
        loadDefaults();
    }
}

function loadDefaults() {
    if(document.getElementById("alarmList").children.length === 0) {
        addAlarmField(5, 'beep');
        addAlarmField(1, 'scifi');
    }
}

// --- APP LOGIC ---

function toggleFullscreen() {
  const body = document.body;
  if (!document.fullscreenElement) {
    body.requestFullscreen().catch(err => alert(`Error: ${err.message}`));
  } else {
    document.exitFullscreen();
  }
}

function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
}

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    document.body.classList.add('fullscreen-mode');
  } else {
    document.body.classList.remove('fullscreen-mode');
  }
});

function getSoundOptionsHTML(selectedValue) {
    const options = [
        {val: 'oscillator', label: 'Bip Standar'},
        {val: 'beep', label: 'Google Beep'},
        {val: 'digital', label: 'Digital Watch'},
        {val: 'bell', label: 'Lonceng (Bell)'},
        {val: 'mechanic', label: 'Jam Mekanik'},
        {val: 'scifi', label: 'Alarm Sci-Fi'}
    ];
    
    return options.map(opt => 
        `<option value="${opt.val}" ${opt.val === selectedValue ? 'selected' : ''}>${opt.label}</option>`
    ).join('');
}

function addAlarmField(timeVal = "", soundVal = "oscillator") {
    const div = document.createElement("div");
    div.className = "alarm-row";
    div.innerHTML = `
        <input type="number" class="alarm-input" value="${timeVal}" placeholder="Menit" onchange="saveData()">
        <select class="sound-select" onchange="saveData()">
            ${getSoundOptionsHTML(soundVal)}
        </select>
        <button class="btn-delete-alarm" onclick="removeAlarm(this)">×</button>
    `;
    document.getElementById("alarmList").appendChild(div);
    saveData(); 
}

function removeAlarm(btn) {
    btn.parentElement.remove();
    saveData();
}

function toggleTimerSmart() {
    if (isRunning) {
        pauseTimer();
    } else {
        if (isPaused && totalSeconds > 0) {
            resumeTimer();
        } else {
            startTimer();
        }
    }
}

function stopActiveAudio() {
    if (activeAudioObject) {
        activeAudioObject.pause();
        activeAudioObject.currentTime = 0;
        activeAudioObject = null;
    }
}

function startTimer() {
  saveData();
  stopActiveAudio();
  clearInterval(interval);
  
  const durationInput = document.getElementById("timerDuration").value;
  if (!durationInput || durationInput <= 0) return alert("Durasi tidak valid");

  initAudio();
  const durationMinutes = parseInt(durationInput);
  totalSeconds = durationMinutes * 60;
  initialTotalSeconds = totalSeconds;
  
  fired = {};
  const alarmRows = document.querySelectorAll(".alarm-row");
  const alarmsConfig = [];

  alarmRows.forEach(row => {
      const timeVal = parseFloat(row.querySelector(".alarm-input").value);
      const soundVal = row.querySelector(".sound-select").value;
      if (!isNaN(timeVal) && timeVal > 0) {
          alarmsConfig.push({ time: timeVal, sound: soundVal });
          fired[timeVal] = false;
      }
  });

  const endSound = document.getElementById("endSoundSelect").value;
  const endLoop = document.getElementById("endLoopCheck").checked;

  isRunning = true;
  isPaused = false;
  
  runInterval(alarmsConfig, endSound, endLoop);
  updateUIState(true);
}

function resumeTimer() {
    // Re-scan in case user edited while paused
    const alarmRows = document.querySelectorAll(".alarm-row");
    const alarmsConfig = [];
    alarmRows.forEach(row => {
        const timeVal = parseFloat(row.querySelector(".alarm-input").value);
        const soundVal = row.querySelector(".sound-select").value;
        if (!isNaN(timeVal) && timeVal > 0) {
            alarmsConfig.push({ time: timeVal, sound: soundVal });
        }
    });

    const endSound = document.getElementById("endSoundSelect").value;
    const endLoop = document.getElementById("endLoopCheck").checked;

    isRunning = true;
    isPaused = false;
    runInterval(alarmsConfig, endSound, endLoop);
    updateUIState(true);
}

function pauseTimer() {
    clearInterval(interval);
    stopActiveAudio();
    isRunning = false;
    isPaused = true;
    updateStatus("⏸ Timer Dijeda");
    updateUIState(false);
}

function runInterval(alarmsConfig, endSound, endLoop) {
    updateStatus("Timer berjalan...");
    updateDisplay();
    updateProgressBar();

    interval = setInterval(() => {
        totalSeconds--;
        updateDisplay();
        updateProgressBar();

        alarmsConfig.forEach(conf => {
            const m = conf.time;
            const targetSeconds = m * 60;
            if (!fired[m] && totalSeconds <= targetSeconds && totalSeconds > (targetSeconds - 2)) {
                fired[m] = true;
                playSound(conf.sound, false);
                updateStatus(`🔔 Alarm menit ke-${m}!`);
            }
        });

        if (totalSeconds <= 0) {
            clearInterval(interval);
            playSound(endSound, endLoop);
            
            isRunning = false;
            isPaused = false;
            updateStatus("Waktu Habis!");
            document.getElementById("progressBar").style.width = "0%";
            updateUIState(false);
        }
    }, 1000);
}

function resetTimer() {
  clearInterval(interval);
  stopActiveAudio();
  isRunning = false;
  isPaused = false;
  totalSeconds = 0;
  document.getElementById("display").textContent = "00:00";
  document.getElementById("progressBar").style.width = "0%";
  updateStatus("Timer di-reset.");
  updateUIState(false);
  if(audioCtx && audioCtx.state === 'running') audioCtx.suspend().then(() => audioCtx.resume());
}

function updateUIState(running) {
    const fsPlayBtn = document.getElementById("fsPlayBtn");
    const mainStartBtn = document.getElementById("mainStartBtn");
    if (running) {
        fsPlayBtn.textContent = "⏸";
        fsPlayBtn.title = "Pause";
        mainStartBtn.textContent = "Pause Timer";
        mainStartBtn.classList.remove('btn-start');
        mainStartBtn.classList.add('btn-reset'); 
    } else {
        fsPlayBtn.textContent = "▶";
        fsPlayBtn.title = "Start";
        mainStartBtn.textContent = isPaused ? "Lanjutkan Timer" : "Mulai Timer";
        mainStartBtn.classList.add('btn-start');
        mainStartBtn.classList.remove('btn-reset');
    }
}

function updateDisplay() {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  document.getElementById("display").textContent =
    `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function updateProgressBar() {
  if (initialTotalSeconds > 0) {
    const percentage = (totalSeconds / initialTotalSeconds) * 100;
    document.getElementById("progressBar").style.width = `${percentage}%`;
  }
}

function updateStatus(text) {
  document.getElementById("statusInfo").textContent = text;
}

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(soundKey, shouldLoop) {
    stopActiveAudio(); 

    if (soundKey === 'oscillator') {
        playOscillator();
        return; 
    }

    const url = soundLibrary[soundKey];
    if (url) {
        const audio = new Audio(url);
        if (shouldLoop) {
            audio.loop = true;
            activeAudioObject = audio;
        }
        audio.play().catch(e => console.log("Audio play failed:", e));
    }
}

function playOscillator() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime); 
    gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 1);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 1);
}
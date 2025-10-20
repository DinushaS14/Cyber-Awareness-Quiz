/* -----------------------
   CONFIG + STATE
------------------------*/
const DURATION_SECONDS = 5 * 60; // 5 minutes

// Base question bank with tags
const QUESTIONS = [
  {
    q: "Which is a common sign of a phishing email?",
    options: [
      "From your saved contacts only",
      "Urgent request to click a link and verify your account",
      "Perfect grammar always",
      "No links inside"
    ],
    answer: 1,
    explain: "Phishing often uses urgency and links to fake sites.",
    tags: ["phishing"]
  },
  {
    q: "Which password is strongest?",
    options: [
      "password123",
      "Ru@2024",
      "L0ng-phrase_with-Symb0ls!",
      "123456"
    ],
    answer: 2,
    explain: "Use long passphrases with a mix of cases, numbers, and symbols.",
    tags: ["passwords"]
  },
  {
    q: "What is MFA/2FA?",
    options: [
      "Two firewalls",
      "Extra verification like code/app/biometrics",
      "Two antivirus tools",
      "Security question only"
    ],
    answer: 1,
    explain: "MFA adds a second factor beyond your password.",
    tags: ["passwords"]
  },
  {
    q: "Public Wi-Fi best practice:",
    options: [
      "Log in to bank sites freely",
      "Use a VPN for sensitive actions",
      "Turn off HTTPS",
      "Share hotspot with strangers"
    ],
    answer: 1,
    explain: "Use a VPN or avoid sensitive logins on public Wi-Fi.",
    tags: ["phishing", "passwords"]
  },
  {
    q: "A malicious program that demands payment to unlock files is:",
    options: ["Adware", "Ransomware", "Worm", "Keylogger"],
    answer: 1,
    explain: "Ransomware encrypts files and asks for payment.",
    tags: ["malware"]
  },
  {
    q: "Best way to check a suspicious link:",
    options: [
      "Link text only matters",
      "Hover to preview the real URL",
      "Click first, check later",
      "Shortened links are always safe"
    ],
    answer: 1,
    explain: "Always hover to see the real destination before clicking.",
    tags: ["phishing"]
  },
  {
    q: "Which is a social engineering tactic?",
    options: ["SQL injection", "Brute force", "Pretexting", "ARP spoofing"],
    answer: 2,
    explain: "Pretexting manipulates people using a made-up scenario.",
    tags: ["phishing"]
  },
  {
    q: "Best practice for software updates:",
    options: [
      "Delay updates for months",
      "Install updates promptly",
      "Disable automatic updates forever",
      "Only update UI themes"
    ],
    answer: 1,
    explain: "Updates fix security vulnerabilities.",
    tags: ["malware"]
  },
  {
    q: "Which email attachment is riskier?",
    options: ["invoice.pdf.exe", "meeting-notes.pdf", "photo.jpg", "readme.txt"],
    answer: 0,
    explain: "Double extensions can hide executables.",
    tags: ["malware", "phishing"]
  },
  {
    q: "HTTPS means:",
    options: [
      "The site is always safe and honest",
      "Traffic is encrypted in transit",
      "The site is government-approved",
      "No certificate is needed"
    ],
    answer: 1,
    explain: "HTTPS encrypts data between your browser and the site.",
    tags: ["phishing"]
  }
];

// Working copy for this attempt
let QUIZ = [];
let timeLeft = DURATION_SECONDS;
let timerId = null;

const form = document.getElementById("quizForm");
const resultBox = document.getElementById("result");
const analyticsBox = document.getElementById("analytics");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");

/* -----------------------
   UTILITIES
------------------------*/
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function deepCopy(obj) { return JSON.parse(JSON.stringify(obj)); }
function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/* -----------------------
   TIMER
------------------------*/
function startTimer() {
  const timerEl = document.querySelector("#timer strong");
  clearInterval(timerId);
  timeLeft = DURATION_SECONDS;
  timerEl.textContent = formatTime(timeLeft);
  timerId = setInterval(() => {
    timeLeft--;
    timerEl.textContent = formatTime(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timerId);
      submitBtn.disabled = true;
      grade(); // auto-submit
    }
  }, 1000);
}

/* -----------------------
   BEST SCORE
------------------------*/
function loadBest() {
  const best = localStorage.getItem("bestScore");
  const el = document.getElementById("bestScore");
  el.textContent = best ? `Best score: ${best}%` : "";
}
function saveBest(score, total) {
  const pct = Math.round((score / total) * 100);
  const best = Number(localStorage.getItem("bestScore") || 0);
  if (pct > best) {
    localStorage.setItem("bestScore", String(pct));
    loadBest();
  }
}

/* -----------------------
   RANDOMIZE + FILTER
------------------------*/
function buildQuizFromFilters() {
  const chosen = Array.from(document.querySelectorAll(".cat:checked")).map(i => i.value);
  let pool = QUESTIONS;
  if (chosen.length && chosen.length < 3) {
    pool = QUESTIONS.filter(q => (q.tags || []).some(t => chosen.includes(t)));
  }
  QUIZ = deepCopy(pool);
  // Shuffle options while preserving correct index
  QUIZ.forEach(q => {
    const mapped = q.options.map((opt, idx) => ({ opt, idx }));
    shuffle(mapped);
    q.options = mapped.map(m => m.opt);
    q.answer = mapped.findIndex(m => m.idx === q.answer);
  });
  shuffle(QUIZ);
}

/* -----------------------
   RENDER
------------------------*/
function renderQuiz() {
  form.innerHTML = "";
  QUIZ.forEach((item, idx) => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "question";
    fieldset.setAttribute("role", "group");
    fieldset.setAttribute("aria-labelledby", `q${idx}-label`);

    fieldset.innerHTML = `
      <h3 id="q${idx}-label">Q${idx + 1}. ${item.q}</h3>
      <div class="options">
        ${item.options.map((opt, i) => `
          <label class="option" tabindex="0">
            <input type="radio" name="q${idx}" value="${i}" aria-label="${opt}" />
            <span>${String.fromCharCode(65 + i)}. ${opt}</span>
          </label>
        `).join("")}
      </div>
    `;

    form.appendChild(fieldset);
  });

  resultBox.classList.add("hidden");
  analyticsBox.classList.add("hidden");
  updateProgress();
}

/* -----------------------
   ANSWERS + PROGRESS
------------------------*/
function getAnswers() {
  return QUIZ.map((_, i) => {
    const checked = form.querySelector(`input[name="q${i}"]:checked`);
    return checked ? Number(checked.value) : null;
  });
}
function updateProgress() {
  const answered = getAnswers().filter(v => v !== null).length;
  const pct = Math.round((answered / QUIZ.length) * 100);
  document.getElementById("bar").style.width = pct + "%";
}

/* -----------------------
   GRADING + RESULTS
------------------------*/
function grade() {
  const userAnswers = getAnswers();
  let score = 0;
  const details = [];

  userAnswers.forEach((ans, i) => {
    const correct = QUIZ[i].answer;
    const isCorrect = ans === correct;
    if (isCorrect) score++;
    details.push({
      index: i,
      isCorrect,
      your: ans,
      correct,
      explain: QUIZ[i].explain
    });
  });

  showResult(score, details);
  showAnalytics(details);
  saveBest(score, QUIZ.length);
}

function showResult(score, details) {
  const total = QUIZ.length;
  const pct = Math.round((score / total) * 100);
  const summary = `
    <div class="result-score"><strong>Score:</strong> ${score}/${total} (${pct}%)</div>
    <div>${pct >= 80 ? "Great job! ✅" : (pct >= 50 ? "Keep going! 💡" : "Start with the basics 🔰")}</div>
  `;

  const list = details.map(d => {
    const yourTxt = d.your !== null
      ? `${String.fromCharCode(65 + d.your)}. ${QUIZ[d.index].options[d.your]}`
      : "No answer";
    const correctTxt = `${String.fromCharCode(65 + d.correct)}. ${QUIZ[d.index].options[d.correct]}`;
    return `
      <div class="result-item ${d.isCorrect ? "correct" : "incorrect"}">
        <div><strong>Q${d.index + 1}:</strong> ${QUIZ[d.index].q}</div>
        <div>Your answer: ${yourTxt}</div>
        ${d.isCorrect ? "" : `<div>Correct answer: <strong>${correctTxt}</strong></div>`}
        <div><em>${d.explain}</em></div>
      </div>
    `;
  }).join("");

  resultBox.innerHTML = summary + `<div class="result-list">${list}</div>`;
  resultBox.classList.remove("hidden");
}

function showAnalytics(details) {
  // Aggregate wrong % by tag
  const agg = {};
  details.forEach(d => {
    const tags = QUIZ[d.index].tags || ["general"];
    tags.forEach(t => {
      agg[t] = agg[t] || { total: 0, wrong: 0 };
      agg[t].total++;
      if (!d.isCorrect) agg[t].wrong++;
    });
  });

  const out = Object.entries(agg).map(([tag, v]) => {
    const wr = Math.round((v.wrong / v.total) * 100);
    return `<div><strong>${tag}</strong>: ${wr}% wrong</div>`;
  }).join("");

  analyticsBox.innerHTML = `<h3>Topic Breakdown</h3>${out}`;
  analyticsBox.classList.remove("hidden");
}

/* -----------------------
   EVENTS
------------------------*/
document.getElementById("applyCats").addEventListener("click", () => {
  buildQuizFromFilters();
  renderQuiz();
  startTimer();
  submitBtn.disabled = false;
  updateProgress();
});

document.getElementById("reviewBtn").addEventListener("click", () => {
  // outline the correct option for each question
  Array.from(form.querySelectorAll(".question")).forEach((qEl, i) => {
    const correct = QUIZ[i].answer;
    const labels = qEl.querySelectorAll("label.option");
    if (labels[correct]) { labels[correct].style.outline = "2px solid #4ade80"; }
  });
});

document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

document.getElementById("quizForm").addEventListener("change", updateProgress);

submitBtn.addEventListener("click", () => {
  clearInterval(timerId);
  submitBtn.disabled = true;
  grade();
});

resetBtn.addEventListener("click", () => { init(); });

/* -----------------------
   INIT
------------------------*/
function init() {
  loadBest();
  buildQuizFromFilters();
  renderQuiz();
  startTimer();
  submitBtn.disabled = false;
  document.getElementById("bar").style.width = "0%";
}
// SHARE QUIZ BUTTON FUNCTIONALITY
const shareBtn = document.getElementById("shareBtn");

shareBtn.addEventListener("click", async () => {
  const url = window.location.href;
  const title = "🛡️ Try this Cyber Awareness Quiz!";
  const text = "Think you know how to stay safe online? Take this 10-question quiz and test your cyber smarts!";

  if (navigator.share) {
    // Mobile native share menu
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      console.log("Share cancelled", err);
    }
  } else {
    // Fallback for desktop browsers
    try {
      await navigator.clipboard.writeText(url);
      alert("✅ Quiz link copied to clipboard! You can paste it anywhere.");
    } catch (err) {
      alert("Couldn't copy link. Please copy it manually:\n" + url);
    }
  }
});


init();

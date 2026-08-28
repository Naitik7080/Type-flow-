import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { RotateCcw, Type, Quote, Code2, Trophy, Gauge, Target, Timer } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const COLORS = {
  bg: "#14161c",
  panel: "#1b1e26",
  panelSoft: "#20232c",
  border: "#2a2e3a",
  text: "#ece9e2",
  muted: "#5c6070",
  mutedDim: "#3a3e4c",
  amber: "#e8a33d",
  amberDim: "#8a6a35",
  green: "#7fb069",
  red: "#d1495b",
};

const WORD_POOL = "the of and to in a is that for it as was with be by on not he i this are or his had at but from they she which you her all we her would there their been if more when will one so up out about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us find here thing tell great small large next early young important few public bad same able light hard cold hot open close near far high low front back left right city road light night morning noon paper table chair phone letter music word world story cloud river forest mountain house river bridge school teacher student garden window door floor kitchen family friend money power result system system value question answer sample number country market energy history nature science culture language memory picture reason season silence signal simple sound space speed spirit strength struggle style summer sunlight surface symbol talent target theory tissue tone touch trade travel treasure trust truth vision voice volume weather winter wisdom wonder writer".split(" ");

const QUOTES = [
  "The quick brown fox jumps over the lazy dog while the sun rises slowly over the quiet hills.",
  "Discipline is choosing between what you want now and what you want most, one keystroke at a time.",
  "Code is read far more often than it is written, so clarity should always outrank cleverness.",
  "Success is the sum of small efforts repeated day in and day out until they compound into mastery.",
  "In the middle of every difficulty lies opportunity, waiting quietly for someone patient enough to find it.",
  "A programmer who types without looking down has already won half the battle against distraction.",
];

const CODE_SNIPPETS = [
  "function factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}",
  "def quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[0]\n    return quicksort([x for x in arr[1:] if x < pivot])",
  "const debounce = (fn, delay) => {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n};",
  "class Node:\n    def __init__(self, value):\n        self.value = value\n        self.next = None\n\n    def __repr__(self):\n        return f'Node({self.value})'",
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function buildWordsText(count, punctuation, numbers) {
  let out = [];
  let sentenceLen = 0;
  let capitalizeNext = true;
  let sentenceTarget = randomInt(6, 11);
  for (let i = 0; i < count; i++) {
    let w = numbers && Math.random() < 0.1 ? String(randomInt(1, 9999)) : sample(WORD_POOL);
    if (capitalizeNext) {
      w = w.charAt(0).toUpperCase() + w.slice(1);
      capitalizeNext = false;
    }
    sentenceLen++;
    if (punctuation) {
      if (sentenceLen >= sentenceTarget && i < count - 1) {
        w += ".";
        capitalizeNext = true;
        sentenceLen = 0;
        sentenceTarget = randomInt(6, 11);
      } else if (Math.random() < 0.1 && sentenceLen > 1) {
        w += ",";
      }
    }
    out.push(w);
  }
  if (punctuation) {
    out[out.length - 1] = out[out.length - 1].replace(/,$/, "");
    if (!/[.!?]$/.test(out[out.length - 1])) out[out.length - 1] += ".";
  }
  return out.join(" ");
}

function generateTarget(mode, lengthMode, wordCount, punctuation, numbers) {
  if (mode === "quote") return sample(QUOTES);
  if (mode === "code") return sample(CODE_SNIPPETS);
  const n = lengthMode === "time" ? 400 : wordCount;
  return buildWordsText(n, punctuation, numbers);
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = mean(arr.map((x) => (x - m) ** 2));
  return Math.sqrt(variance);
}

const MODE_TABS = [
  { id: "words", label: "words", icon: Type },
  { id: "quote", label: "quote", icon: Quote },
  { id: "code", label: "code", icon: Code2 },
];

export default function TypeFlow() {
  const [mode, setMode] = useState("words");
  const [lengthMode, setLengthMode] = useState("time");
  const [timeOption, setTimeOption] = useState(30);
  const [wordCount, setWordCount] = useState(25);
  const [punctuation, setPunctuation] = useState(false);
  const [numbers, setNumbers] = useState(false);

  const [target, setTarget] = useState(() => generateTarget("words", "time", 25, false, false));
  const [typed, setTyped] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [finished, setFinished] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [tick, setTick] = useState(0);
  const [wpmHistory, setWpmHistory] = useState([]);
  const [cadence, setCadence] = useState([]);
  const [bestByKey, setBestByKey] = useState({});
  const [finalStats, setFinalStats] = useState(null);

  const lastKeyTime = useRef(null);
  const charRefs = useRef([]);
  const containerRef = useRef(null);
  const testAreaRef = useRef(null);
  const [caret, setCaret] = useState({ left: 0, top: 0, height: 20 });
  const tickInterval = useRef(null);

  const resetKey = `${mode}-${lengthMode === "time" ? timeOption + "s" : wordCount + "w"}`;

  const regenerate = useCallback(() => {
    const t = generateTarget(mode, mode === "words" ? lengthMode : "n/a", wordCount, punctuation, numbers);
    setTarget(t);
    setTyped(new Array(t.length).fill(null));
    setCurrentIndex(0);
    setStartTime(null);
    setFinished(false);
    setWpmHistory([]);
    setCadence([]);
    setFinalStats(null);
    lastKeyTime.current = null;
    charRefs.current = [];
    if (tickInterval.current) clearInterval(tickInterval.current);
  }, [mode, lengthMode, wordCount, punctuation, numbers]);

  useEffect(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lengthMode, timeOption, wordCount, punctuation, numbers]);

  useEffect(() => {
    testAreaRef.current?.focus();
  }, [target]);

  const elapsedSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
  const timeLeft = lengthMode === "time" ? Math.max(0, timeOption - elapsedSeconds) : null;

  const finishTest = useCallback(() => {
    setFinished(true);
    if (tickInterval.current) clearInterval(tickInterval.current);
    setTyped((prevTyped) => {
      const correctChars = prevTyped.filter((s) => s === "correct").length;
      const incorrectChars = prevTyped.filter((s) => s === "incorrect").length;
      const totalTyped = correctChars + incorrectChars;
      const mins = Math.max(elapsedSeconds / 60, 1 / 120);
      const wpm = Math.round(correctChars / 5 / mins);
      const rawWpm = Math.round(totalTyped / 5 / mins);
      const accuracy = totalTyped ? Math.round((correctChars / totalTyped) * 100) : 100;
      setWpmHistory((hist) => {
        const wpmValues = hist.map((h) => h.wpm);
        const sd = stddev(wpmValues);
        const m = mean(wpmValues) || wpm;
        const consistency = wpmValues.length > 1 ? Math.max(0, Math.round(100 - (sd / m) * 100)) : 100;
        const stats = { wpm, rawWpm, accuracy, consistency, time: Math.round(elapsedSeconds) };
        setFinalStats(stats);
        setBestByKey((prev) => {
          const prevBest = prev[resetKey] || 0;
          if (wpm > prevBest) return { ...prev, [resetKey]: wpm };
          return prev;
        });
        return hist;
      });
      return prevTyped;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, resetKey]);

  useEffect(() => {
    if (!startTime || finished) return;
    tickInterval.current = setInterval(() => {
      setTick((t) => t + 1);
    }, 250);
    return () => clearInterval(tickInterval.current);
  }, [startTime, finished]);

  useEffect(() => {
    if (!startTime || finished) return;
    if (lengthMode === "time" && timeLeft <= 0) {
      finishTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const lastSampleSecond = useRef(-1);
  useEffect(() => {
    if (!startTime || finished) return;
    const sec = Math.floor(elapsedSeconds);
    if (sec > 0 && sec !== lastSampleSecond.current) {
      lastSampleSecond.current = sec;
      const correctChars = typed.filter((s) => s === "correct").length;
      const wpm = Math.round(correctChars / 5 / (sec / 60));
      setWpmHistory((h) => [...h, { t: sec, wpm: Math.max(0, wpm) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  useEffect(() => {
    if (!startTime || finished) return;
    if (lengthMode === "time" && target.length - currentIndex < 40) {
      const more = generateTarget("words", "time", 200, punctuation, numbers);
      setTarget((t) => t + " " + more);
      setTyped((t) => [...t, ...new Array(more.length + 1).fill(null)]);
    }
  }, [currentIndex, target, startTime, finished, lengthMode, punctuation, numbers]);

  useLayoutEffect(() => {
    const idx = Math.min(currentIndex, target.length - 1);
    const el = charRefs.current[idx];
    if (el && containerRef.current) {
      const rect = el.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      let left = rect.left - containerRect.left;
      if (currentIndex >= target.length) left = rect.right - containerRect.left;
      setCaret({ left, top: rect.top - containerRect.top, height: rect.height });
    }
  }, [currentIndex, target]);

  const handleKeyDown = (e) => {
    if (finished) return;
    if (e.key === "Escape") {
      regenerate();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      if (currentIndex > 0) {
        setTyped((prev) => {
          const c = [...prev];
          c[currentIndex - 1] = null;
          return c;
        });
        setCurrentIndex((i) => i - 1);
      }
      return;
    }

    let ch = null;
    if (e.key === "Enter") ch = "\n";
    else if (e.key === " ") ch = " ";
    else if (e.key.length === 1) ch = e.key;
    else return;

    e.preventDefault();

    if (currentIndex === 0 && !startTime) {
      setStartTime(Date.now());
      lastSampleSecond.current = -1;
    }

    const now = Date.now();
    if (lastKeyTime.current) {
      const delta = now - lastKeyTime.current;
      setCadence((c) => {
        const next = [...c, delta];
        return next.length > 45 ? next.slice(next.length - 45) : next;
      });
    }
    lastKeyTime.current = now;

    const targetChar = target[currentIndex];
    const correct = ch === targetChar;
    setTyped((prev) => {
      const c = [...prev];
      c[currentIndex] = correct ? "correct" : "incorrect";
      return c;
    });

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    if (lengthMode !== "time" && nextIndex >= target.length) {
      setTimeout(() => finishTest(), 0);
    }
  };

  const correctChars = typed.filter((s) => s === "correct").length;
  const incorrectChars = typed.filter((s) => s === "incorrect").length;
  const totalTyped = correctChars + incorrectChars;
  const liveMins = Math.max(elapsedSeconds / 60, 1 / 120);
  const liveWpm = startTime ? Math.round(correctChars / 5 / liveMins) : 0;
  const liveAccuracy = totalTyped ? Math.round((correctChars / totalTyped) * 100) : 100;

  const renderTarget = () => {
    const lines = target.split("\n");
    let globalIndex = 0;
    return lines.map((line, li) => {
      const chars = line.split("").map((ch) => {
        const idx = globalIndex++;
        return renderChar(ch, idx, false);
      });
      let nl = null;
      if (li < lines.length - 1) {
        const idx = globalIndex++;
        nl = renderChar("\u21B5", idx, true);
      }
      return (
        <div key={li} style={{ minHeight: mode === "code" ? "1.6em" : undefined }}>
          {chars}
          {nl}
        </div>
      );
    });
  };

  const renderChar = (ch, idx, isNewline) => {
    const status = typed[idx];
    let color = COLORS.muted;
    let extra = {};
    if (status === "correct") color = COLORS.text;
    else if (status === "incorrect") {
      color = COLORS.red;
      extra.textDecoration = "underline";
      extra.textDecorationColor = COLORS.red;
      extra.textDecorationThickness = "2px";
    }
    const display = ch === " " && status === "incorrect" ? "\u00B7" : ch;
    return (
      <span
        key={idx}
        ref={(el) => (charRefs.current[idx] = el)}
        style={{ color, opacity: isNewline ? 0.35 : 1, ...extra }}
      >
        {display}
      </span>
    );
  };

  const cadenceMax = 320;
  const cadencePoints = useMemo(() => {
    const n = cadence.length;
    if (n < 2) return "";
    return cadence
      .map((d, i) => {
        const x = (i / (n - 1)) * 300;
        const clamped = Math.min(d, cadenceMax);
        const y = 24 - (clamped / cadenceMax) * 18;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [cadence]);

  const best = bestByKey[resetKey] || 0;
  const isNewBest = finalStats && finalStats.wpm > 0 && finalStats.wpm >= best && finalStats.wpm === best;

  return (
    <div
      style={{
        background: COLORS.bg,
        color: COLORS.text,
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 20px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .tab-btn { transition: color 0.15s ease, background 0.15s ease; }
        .fade-in { animation: fadeIn 0.35s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 45% { opacity: 1; } 50%, 95% { opacity: 0; } 100% { opacity: 1; } }
        ::selection { background: ${COLORS.amberDim}; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 880, paddingTop: 48 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 40 }}>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
            type<span style={{ color: COLORS.amber }}>flow</span>
          </div>
          {best > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.muted, fontSize: 13 }}>
              <Trophy size={14} color={COLORS.amber} />
              <span className="mono" style={{ color: COLORS.text }}>{best}</span>
              <span>best · {resetKey}</span>
            </div>
          )}
        </div>

        {!finished && (
          <div className="fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 36, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4, background: COLORS.panel, borderRadius: 8, padding: 4 }}>
              {MODE_TABS.map((t) => {
                const Icon = t.icon;
                const active = mode === t.id;
                return (
                  <button
                    key={t.id}
                    className="tab-btn"
                    onClick={() => setMode(t.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      border: "none",
                      cursor: "pointer",
                      background: active ? COLORS.panelSoft : "transparent",
                      color: active ? COLORS.amber : COLORS.muted,
                      padding: "7px 14px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    <Icon size={14} /> {t.label}
                  </button>
                );
              })}
            </div>

            {mode === "words" && (
              <>
                <div style={{ display: "flex", gap: 4, background: COLORS.panel, borderRadius: 8, padding: 4 }}>
                  {["time", "words"].map((lm) => (
                    <button
                      key={lm}
                      className="tab-btn"
                      onClick={() => setLengthMode(lm)}
                      style={{
                        border: "none",
                        cursor: "pointer",
                        background: lengthMode === lm ? COLORS.panelSoft : "transparent",
                        color: lengthMode === lm ? COLORS.amber : COLORS.muted,
                        padding: "7px 14px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {lm}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 4, background: COLORS.panel, borderRadius: 8, padding: 4 }}>
                  {(lengthMode === "time" ? [15, 30, 60, 120] : [25, 50, 100]).map((v) => {
                    const active = lengthMode === "time" ? timeOption === v : wordCount === v;
                    return (
                      <button
                        key={v}
                        className="tab-btn mono"
                        onClick={() => (lengthMode === "time" ? setTimeOption(v) : setWordCount(v))}
                        style={{
                          border: "none",
                          cursor: "pointer",
                          background: active ? COLORS.panelSoft : "transparent",
                          color: active ? COLORS.amber : COLORS.muted,
                          padding: "7px 14px",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 14 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: COLORS.muted, cursor: "pointer" }}>
                    <input type="checkbox" checked={punctuation} onChange={(e) => setPunctuation(e.target.checked)} />
                    punctuation
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: COLORS.muted, cursor: "pointer" }}>
                    <input type="checkbox" checked={numbers} onChange={(e) => setNumbers(e.target.checked)} />
                    numbers
                  </label>
                </div>
              </>
            )}
          </div>
        )}

        {!finished && (
          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 20 }}>
            <StatChip icon={Gauge} label="wpm" value={liveWpm} />
            <StatChip icon={Target} label="acc" value={`${liveAccuracy}%`} />
            <StatChip
              icon={Timer}
              label={lengthMode === "time" && mode === "words" ? "left" : "time"}
              value={
                lengthMode === "time" && mode === "words"
                  ? Math.ceil(timeLeft ?? timeOption)
                  : Math.round(elapsedSeconds)
              }
            />
          </div>
        )}

        {!finished && (
          <div
            ref={testAreaRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              position: "relative",
              background: COLORS.panel,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "32px 36px",
              outline: "none",
              cursor: "text",
            }}
          >
            {!isFocused && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(20,22,28,0.85)",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: COLORS.muted,
                  zIndex: 5,
                }}
              >
                click here or press any key to focus
              </div>
            )}
            <div
              ref={containerRef}
              className="mono"
              style={{
                position: "relative",
                fontSize: mode === "code" ? 17 : 21,
                lineHeight: 1.7,
                letterSpacing: "0.01em",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
                wordBreak: "break-word",
                userSelect: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: 2,
                  background: COLORS.amber,
                  borderRadius: 1,
                  transition: "left 0.08s ease, top 0.08s ease",
                  animation: "blink 1s step-end infinite",
                  left: caret.left,
                  top: caret.top,
                  height: caret.height,
                }}
              />
              {renderTarget()}
            </div>

            <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="100%" height="26" viewBox="0 0 300 26" preserveAspectRatio="none" style={{ display: "block", flex: 1 }}>
                <line x1="0" y1="24" x2="300" y2="24" stroke={COLORS.mutedDim} strokeWidth="1" />
                {cadencePoints && (
                  <polyline
                    points={cadencePoints}
                    fill="none"
                    stroke={COLORS.amber}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                )}
              </svg>
            </div>
          </div>
        )}

        {!finished && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
            <button
              onClick={regenerate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                border: "none",
                color: COLORS.muted,
                cursor: "pointer",
                fontSize: 13,
                padding: "8px 14px",
                borderRadius: 8,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.muted)}
            >
              <RotateCcw size={14} /> restart <span className="mono" style={{ opacity: 0.6 }}>esc</span>
            </button>
          </div>
        )}

        {finished && finalStats && (
          <div className="fade-in">
            {isNewBest && (
              <div style={{ textAlign: "center", color: COLORS.amber, fontSize: 13, marginBottom: 8, letterSpacing: "0.04em" }}>
                new personal best
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 1,
                background: COLORS.border,
                borderRadius: 12,
                overflow: "hidden",
                marginBottom: 24,
              }}
            >
              <ResultCell label="wpm" value={finalStats.wpm} accent />
              <ResultCell label="raw" value={finalStats.rawWpm} />
              <ResultCell label="accuracy" value={`${finalStats.accuracy}%`} />
              <ResultCell label="consistency" value={`${finalStats.consistency}%`} />
            </div>

            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "20px 20px 8px", height: 220, marginBottom: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={wpmHistory} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={COLORS.border} vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: COLORS.muted, fontSize: 11 }} tickLine={false} axisLine={{ stroke: COLORS.border }} unit="s" />
                  <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: COLORS.panelSoft, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: COLORS.muted }}
                    itemStyle={{ color: COLORS.amber }}
                  />
                  <Line type="monotone" dataKey="wpm" stroke={COLORS.amber} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                onClick={regenerate}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: COLORS.amber,
                  border: "none",
                  color: "#1a1305",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "10px 20px",
                  borderRadius: 8,
                }}
              >
                <RotateCcw size={15} /> try again
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 48, marginBottom: 24, fontSize: 12, color: COLORS.mutedDim }}>
          tab to change mode · esc to restart · backspace to correct
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Icon size={14} color={COLORS.muted} />
      <span className="mono" style={{ fontSize: 20, fontWeight: 600, color: COLORS.text }}>{value}</span>
      <span style={{ fontSize: 12, color: COLORS.muted }}>{label}</span>
    </div>
  );
}

function ResultCell({ label, value, accent }) {
  return (
    <div style={{ background: COLORS.panel, padding: "20px 24px" }}>
      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div className="mono" style={{ fontSize: 30, fontWeight: 700, color: accent ? COLORS.amber : COLORS.text }}>{value}</div>
    </div>
  );
}

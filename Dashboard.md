# ⚔️ BRAIN ZEN COCKPIT

> [!NOTE] System Status
> **Mode:** Offline Local Engine | **Model:** Qwen 2.5 3B (Q4_K_M)
> **Engine State:** Auto-Start on Demand / Standby on Idle (0 MB RAM)
> **Distinction:** **💻 Projects** (Codebase monitoring) vs **📚 Courses** (Exam & syllabus prep).

---

## 💻 Monitored Software Codebases
```dataview
TABLE file.mtime AS "Last Audited", file.size AS "Size (Bytes)"
FROM "Projects"
WHERE file.name != "README"
SORT file.mtime DESC
```

---

## 📚 Enrolled Courses & Study Prep
```dataview
TABLE file.folder AS "Course Path", file.mtime AS "Last Reviewed"
FROM "Study/Courses"
WHERE file.name = "Syllabus"
SORT file.folder ASC
```

---

## 🎯 High-Priority Suggestions & Next Steps
```dataview
TABLE file.mtime AS "Generated"
FROM "Suggestions"
WHERE file.name != "README"
SORT file.mtime DESC
LIMIT 5
```

---

## 📝 Recent Progress Logs
```dataview
TABLE file.mtime AS "Date"
FROM "Logs"
WHERE file.name != "README"
SORT file.mtime DESC
LIMIT 5
```

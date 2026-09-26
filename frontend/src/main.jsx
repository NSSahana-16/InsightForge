import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Plotly from "plotly.js-dist-min";
import {
  Upload,
  Send,
  Sparkles,
  Database,
  LayoutDashboard,
  LogOut,
  Plus,
  BarChart3,
  FileText,
  ShieldCheck,
  Menu,
  ChevronRight,
  Download,
  Search,
  RotateCcw,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import "./style.css";
const API = "http://localhost:8000";
async function req(path, opt = {}) {
  let h = { ...(opt.headers || {}) },
    t = localStorage.if_token;
  if (t) h.Authorization = "Bearer " + t;
  let r = await fetch(API + path, { ...opt, headers: h }),
    j = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(j.detail || "Request failed");
  return j;
}
function Auth({ done }) {
  let [m, setM] = useState("login"),
    [f, setF] = useState({ name: "", email: "", password: "" }),
    [e, setE] = useState("");
  let go = async (x) => {
    x.preventDefault();
    try {
      let r = await req("/api/auth/" + m, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      localStorage.if_token = r.access_token;
      done(r.user);
    } catch (x) {
      setE(x.message);
    }
  };
  return (
    <div className="auth">
      <div className="pitch">
        <b>✦ InsightForge</b>
        <h1>Turn raw data into decisions.</h1>
        <p>
          Upload data, ask questions in plain English, and automate profiling,
          preprocessing, analysis and visualization.
        </p>
        <div>
          <span>AI Data Analyst</span>
          <span>Interactive Dashboards</span>
          <span>Automated EDA</span>
        </div>
      </div>
      <form className="card authcard" onSubmit={go}>
        <small>INSIGHTFORGE</small>
        <h2>{m === "login" ? "Welcome back" : "Create your account"}</h2>
        {m === "register" && (
          <input
            placeholder="Name"
            value={f.name}
            onChange={(x) => setF({ ...f, name: x.target.value })}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={f.email}
          onChange={(x) => setF({ ...f, email: x.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password (8+ characters)"
          minLength="8"
          value={f.password}
          onChange={(x) => setF({ ...f, password: x.target.value })}
          required
        />
        {e && <div className="error">{e}</div>}
        <button className="primary">
          {m === "login" ? "Sign in" : "Create account"}{" "}
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className="link"
          onClick={() => setM(m === "login" ? "register" : "login")}
        >
          {m === "login"
            ? "Create an account"
            : "Already have an account? Sign in"}
        </button>
        <div className="secure">
          <ShieldCheck size={15} /> Private per-user dataset access
        </div>
      </form>
    </div>
  );
}
function Chart({ c }) {
  let ref = useRef();
  useEffect(() => {
    if (!ref.current) return;
    let tr = [];
    if (c.type === "bar")
      tr = [
        {
          x: c.orientation === "h" ? c.values : c.labels,
          y: c.orientation === "h" ? c.labels : c.values,
          type: "bar",
          orientation: c.orientation,
          ...(c.color ? { marker: { color: c.color } } : {}),
        },
      ];
    if (c.type === "histogram") tr = [{ x: c.values, type: "histogram" }];
    if (c.type === "line")
      tr = [
        {
          x: c.labels,
          y: c.values,
          type: "scatter",
          mode: "lines+markers",
          line: { color: c.color || "#1678f2", width: 3 },
          marker: { color: c.color || "#1678f2", size: 7 },
        },
      ];
    if (c.type === "scatter")
      tr = [{ x: c.x, y: c.y, type: "scatter", mode: "markers" }];
    Plotly.newPlot(
      ref.current,
      tr,
      {
        title: c.plotTitle || c.title,
        margin: { l: c.orientation === "h" ? 100 : 45, r: 15, t: 42, b: 34 },
        yaxis: c.orientation === "h" ? { autorange: "reversed", automargin: true } : {},
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { family: "Inter" },
      },
      { displayModeBar: false, responsive: true },
    );
    return () => {
      try {
        Plotly.purge(ref.current);
      } catch {}
    };
  }, [c]);
  return <div className="chart" ref={ref} />;
}
function saveBlob(blob, filename) {
  let url = URL.createObjectURL(blob);
  let link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function reportFilename(name, extension) {
  let safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${safeName || "student-performance-report"}.${extension}`;
}
function downloadStudentPdf(report) {
  let pdf = new jsPDF({ unit: "pt", format: "a4" });
  let pageWidth = pdf.internal.pageSize.getWidth();
  let pageHeight = pdf.internal.pageSize.getHeight();
  let y = 54;
  function addText(text, size = 11, bold = false, gap = 17) {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    let lines = pdf.splitTextToSize(String(text), pageWidth - 88);
    if (y + lines.length * gap > pageHeight - 48) {
      pdf.addPage();
      y = 54;
    }
    pdf.text(lines, 44, y);
    y += lines.length * gap + 5;
  }
  addText("Student Performance Report", 20, true, 24);
  addText(`${report.studentName} · ${report.studentId || "Student ID not provided"}`, 13, true);
  addText(`${report.dataset} · Generated ${report.generatedAt}`, 9, false);
  addText("Overall Summary", 14, true, 20);
  report.summary.forEach(([label, value]) => addText(`${label}: ${value}`));
  addText("Personal Details", 14, true, 20);
  report.details.forEach(([label, value]) => addText(`${label}: ${value}`));
  addText("Subject-wise Performance", 14, true, 20);
  report.subjects.forEach(([subject, mark]) => addText(`${subject}: ${mark}`));
  addText("Insights", 14, true, 20);
  report.insights.forEach((insight, index) => addText(`${index + 1}. ${insight}`));
  saveBlob(pdf.output("blob"), reportFilename(report.studentName, "pdf"));
}
async function downloadStudentDoc(report) {
  let paragraphs = [
    new Paragraph({ text: "Student Performance Report", heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: report.studentName, bold: true }), new TextRun(` · ${report.studentId || "Student ID not provided"}`)] }),
    new Paragraph({ text: `${report.dataset} · Generated ${report.generatedAt}` }),
    new Paragraph({ text: "Overall Summary", heading: HeadingLevel.HEADING_1 }),
    ...report.summary.map(([label, value]) => new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(String(value))] })),
    new Paragraph({ text: "Personal Details", heading: HeadingLevel.HEADING_1 }),
    ...report.details.map(([label, value]) => new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(String(value))] })),
    new Paragraph({ text: "Subject-wise Performance", heading: HeadingLevel.HEADING_1 }),
    ...report.subjects.map(([subject, mark]) => new Paragraph({ children: [new TextRun({ text: `${subject}: `, bold: true }), new TextRun(String(mark))] })),
    new Paragraph({ text: "Insights", heading: HeadingLevel.HEADING_1 }),
    ...report.insights.map((insight) => new Paragraph({ text: insight, bullet: { indent: 360 } })),
  ];
  let documentFile = new Document({ sections: [{ children: paragraphs }] });
  saveBlob(await Packer.toBlob(documentFile), reportFilename(report.studentName, "docx"));
}
function StudentReport({ report, students, search, onSearch, onSelect, onBack }) {
  let [exporting, setExporting] = useState("");
  let [exportError, setExportError] = useState("");
  async function exportReport(format) {
    setExporting(format);
    setExportError("");
    try {
      if (format === "pdf") downloadStudentPdf(report);
      else await downloadStudentDoc(report);
    } catch (error) {
      setExportError(error.message || "The report could not be generated.");
    } finally {
      setExporting("");
    }
  }
  if (!report) {
    return (
      <div className="report-empty">
        <FileText size={22} />
        <h2>Select a student to create a report</h2>
        <p>Choose a student-results dataset and record from the dashboard first.</p>
        <button className="secondary" onClick={onBack}>Back to dashboard</button>
      </div>
    );
  }
  return (
    <div className="student-report">
      <div className="report-banner">
        <div>
          <small>INSIGHTFORGE · REPORT &amp; INSIGHTS</small>
          <h1>{report.studentName}</h1>
          <p>{report.studentId || "Student ID not provided"} <span>·</span> {report.dataset}</p>
        </div>
        <div className="report-actions">
          <button onClick={() => exportReport("pdf")} disabled={!!exporting}>
            <Download size={15} /> {exporting === "pdf" ? "Preparing PDF…" : "Download PDF"}
          </button>
          <button onClick={() => exportReport("docx")} disabled={!!exporting}>
            <Download size={15} /> {exporting === "docx" ? "Preparing DOCX…" : "Download DOCX"}
          </button>
        </div>
      </div>
      <div className="report-content">
        {exportError && <p className="report-export-error" role="alert">{exportError}</p>}
        <div className="report-controls">
          <label>
            <span>SEARCH STUDENTS</span>
            <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search by name or ID" />
          </label>
          <label>
            <span>SELECTED STUDENT</span>
            <select value={report.index} onChange={(event) => onSelect(event.target.value)}>
              {students.map(({ row, index }) => (
                <option key={index} value={index}>{report.studentField && row[report.studentField]}{report.idField && row[report.idField] ? ` · ${row[report.idField]}` : ""}</option>
              ))}
            </select>
          </label>
          <button className="report-back" onClick={onBack}>Back to dashboard</button>
          <span className="report-date">Generated {report.generatedAt}</span>
        </div>
        <div className="report-summary">
          {report.summary.map(([label, value]) => (
            <div className="report-metric" key={label}><small>{label}</small><strong>{value}</strong></div>
          ))}
        </div>
        <div className="report-sections">
          <section className="report-section">
            <h2>Personal details</h2>
            <dl>{report.details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          </section>
          <section className="report-section">
            <h2>Subject-wise performance</h2>
            {report.subjects.length ? (
              <div className="report-subjects">
                {report.subjects.map(([subject, mark]) => (
                  <div className="report-subject" key={subject}>
                    <span>{subject}</span><strong>{mark}</strong>
                    <div><i style={{ width: `${report.subjectScale ? Math.min(100, Math.max(0, Number(mark) / report.subjectScale * 100)) : 0}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : <p>No subject marks are available for this student.</p>}
          </section>
          <section className="report-section report-insights">
            <h2>Insights</h2>
            {report.insights.map((insight, index) => <p key={index}>{insight}</p>)}
          </section>
        </div>
      </div>
    </div>
  );
}
function ResultsDashboard({ analysis, busy, tab, navigate }) {
  let academic = analysis.academic;
  let rows = academic?.records || analysis.preview || [];
  let categories = analysis.profile?.categorical_columns || [];
  let numericColumns = analysis.profile?.numeric_columns || [];
  let [groupColumn, setGroupColumn] = useState(categories[0] || "");
  let [groupValue, setGroupValue] = useState("");
  let [branchValue, setBranchValue] = useState("");
  let [search, setSearch] = useState("");
  let [selectedIndex, setSelectedIndex] = useState("");
  useEffect(() => {
    setGroupColumn(academic?.batch_field || categories[0] || "");
    setGroupValue("");
    setBranchValue("");
    setSearch("");
    setSelectedIndex("");
  }, [analysis.active?.id]);
  let primaryField = academic?.batch_field || groupColumn;
  let groupValues = primaryField
    ? [...new Set(rows.map((row) => String(row[primaryField] ?? "Unknown")))].sort()
    : [];
  let branchValues = academic?.branch_field
    ? [...new Set(rows.map((row) => String(row[academic.branch_field] ?? "Unknown")))].sort()
    : [];
  let matchingRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      let matchesValue = !groupValue || String(row[primaryField] ?? "Unknown") === groupValue;
      let matchesBranch = !branchValue || String(row[academic?.branch_field] ?? "Unknown") === branchValue;
      let matchesSearch = !search || Object.values(row).some((value) =>
        String(value ?? "").toLowerCase().includes(search.toLowerCase()),
      );
      return matchesValue && matchesBranch && matchesSearch;
    });
  let selectedRecord =
    matchingRows.find(({ index }) => index === Number(selectedIndex)) || matchingRows[0];
  let recordField = academic?.student_field ||
    categories.find((column) => /student|name|customer|product|id/i.test(column)) ||
    categories[0] ||
    Object.keys(rows[0] || {})[0];
  let identityField = academic?.id_field || academic?.student_field;
  let studentHistory = academic && selectedRecord && identityField
    ? rows.filter((row) => String(row[identityField] ?? "") === String(selectedRecord.row[identityField] ?? ""))
    : [];
  let periods = {};
  if (academic?.trend_field) {
    studentHistory.forEach((row) => {
      let period = String(row[academic.trend_field] ?? "");
      let total = Number(row._total);
      if (period && Number.isFinite(total)) {
        periods[period] ||= [];
        periods[period].push(total);
      }
    });
  }
  let periodTrend = Object.entries(periods)
    .map(([period, totals]) => [period, totals.reduce((sum, total) => sum + total, 0) / totals.length])
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }));
  let hasPeriodTrend = periodTrend.length > 1;
  let recordName = selectedRecord
    ? String(selectedRecord.row[recordField] ?? `Record ${selectedRecord.index + 1}`)
    : "No matching records";
  let chartCards = academic
    ? [
        {
          type: "bar",
          title: "Total marks distribution",
          plotTitle: "Students",
          labels: academic.total_distribution.labels,
          values: academic.total_distribution.values,
          color: "#1678f2",
        },
        {
          type: "bar",
          title: "Subject average marks",
          plotTitle: "Average",
          labels: academic.subject_averages.map((item) => item.label.replace(/_total$/i, "")),
          values: academic.subject_averages.map((item) => item.value),
          color: "#1678f2",
        },
        {
          type: "bar",
          orientation: "h",
          title: "Top students by total marks",
          plotTitle: "Total",
          labels: academic.top_students.labels,
          values: academic.top_students.values,
          color: "#08a895",
        },
      ]
    : (analysis.charts || []).slice(0, 3);
  if (chartCards.length < 3 && rows.length && categories[0]) {
    let counts = {};
    rows.forEach((row) => {
      let value = String(row[categories[0]] ?? "Unknown");
      counts[value] = (counts[value] || 0) + 1;
    });
    chartCards.push({
      type: "bar",
      title: `Records by ${categories[0]} · preview`,
      labels: Object.keys(counts).slice(0, 12),
      values: Object.values(counts).slice(0, 12),
    });
  }
  let recordMetrics = academic?.subject_fields || numericColumns;
  let detailFields = academic && selectedRecord
    ? [
        ...academic.personal_fields.map((field) => [field, selectedRecord.row[field] ?? "Not provided"]),
        ...(academic.attendance_field ? [] : [["Attendance", "Not provided"]]),
        ["Overall marks", selectedRecord.row._total ?? "Not provided"],
        ...(academic.passed_field ? [["Subjects passed", selectedRecord.row[academic.passed_field] ?? "Not provided"]] : []),
        ...(academic.failed_field ? [["Subjects failed", selectedRecord.row[academic.failed_field] ?? "Not provided"]] : []),
      ]
    : [];
  let recordChart = selectedRecord && {
    type: academic ? "line" : "bar",
    title: `${recordName} profile`,
    plotTitle: academic ? hasPeriodTrend ? `Marks by ${academic.trend_field}` : "Subject-wise performance" : undefined,
    color: academic ? "#ef9800" : undefined,
    labels: hasPeriodTrend
      ? periodTrend.map(([period]) => period)
      : recordMetrics
          .filter((column) => selectedRecord.row[column] != null && Number.isFinite(Number(selectedRecord.row[column])))
          .map((column) => column.replace(/_total$/i, "")),
    values: hasPeriodTrend
      ? periodTrend.map(([, average]) => average)
      : recordMetrics
          .filter((column) => selectedRecord.row[column] != null && Number.isFinite(Number(selectedRecord.row[column])))
          .map((column) => Number(selectedRecord.row[column])),
  };
  let profile = analysis.profile || {};
  let stats = academic
    ? [
        ["Students", academic.students],
        ["Average total marks", academic.average_total],
        ["Highest total mark", academic.highest_total],
        ["Pass rate", academic.pass_rate === null ? "Not available" : `${academic.pass_rate}%`],
      ]
    : [
        ["Records", profile.rows],
        ["Fields", profile.columns],
        ["Missing values", profile.missing_values],
        ["Duplicate rows", profile.duplicate_rows],
      ];
  let reportModel = null;
  if (academic && selectedRecord) {
    let selectedTotal = Number(selectedRecord.row._total);
    let rank = academic.records.filter((row) => Number(row._total) > selectedTotal).length + 1;
    let subjectResults = academic.subject_fields
      .map((field) => [field.replace(/_total$/i, ""), selectedRecord.row[field]])
      .filter(([, value]) => value != null && Number.isFinite(Number(value)))
      .map(([field, value]) => [field, Number(value)]);
    let strongest = [...subjectResults].sort((left, right) => right[1] - left[1])[0];
    let weakest = [...subjectResults].sort((left, right) => left[1] - right[1])[0];
    let personalDetails = academic.personal_fields.map((field) => [
      field.replace(/_/g, " "),
      String(selectedRecord.row[field] ?? "Not provided"),
    ]);
    if (academic.attendance_field && !personalDetails.some(([label]) => label.toLowerCase().includes("attendance"))) {
      personalDetails.push([academic.attendance_field.replace(/_/g, " "), String(selectedRecord.row[academic.attendance_field] ?? "Not provided")]);
    } else if (!academic.attendance_field) {
      personalDetails.push(["Attendance", "Not provided"]);
    }
    let passed = academic.passed_field ? selectedRecord.row[academic.passed_field] : null;
    let failed = academic.failed_field ? selectedRecord.row[academic.failed_field] : null;
    let insights = [
      `Total marks are ${Number.isFinite(selectedTotal) ? selectedTotal : "not available"}; cohort average is ${academic.average_total}. Student rank: ${rank} of ${academic.students}.`,
    ];
    if (strongest) insights.push(`${strongest[0]} is the strongest subject (${strongest[1]} marks).`);
    if (weakest && weakest[0] !== strongest?.[0]) insights.push(`${weakest[0]} is the lowest subject score (${weakest[1]} marks) and may need attention.`);
    if (passed != null || failed != null) insights.push(`${passed ?? 0} subjects passed and ${failed ?? 0} subjects failed.`);
    if (academic.attendance_field) insights.push(`Attendance recorded: ${selectedRecord.row[academic.attendance_field] ?? "Not provided"}.`);
    else insights.push("Attendance data is not present in this dataset.");
    if (hasPeriodTrend) insights.push(`Marks ${periodTrend.at(-1)[1] >= periodTrend[0][1] ? "rose" : "fell"} from ${periodTrend[0][0]} to ${periodTrend.at(-1)[0]}.`);
    else insights.push("The dataset has no earlier period for a historical performance comparison.");
    reportModel = {
      studentName: recordName,
      studentId: academic.id_field ? selectedRecord.row[academic.id_field] : "",
      studentField: academic.student_field,
      idField: academic.id_field,
      index: selectedRecord.index,
      dataset: analysis.active.name,
      generatedAt: new Date().toLocaleDateString(),
      summary: [
        ["Overall marks", Number.isFinite(selectedTotal) ? selectedTotal : "Not available"],
        ["Cohort average", academic.average_total],
        ["Cohort rank", `${rank} of ${academic.students}`],
        ["Attendance", academic.attendance_field ? selectedRecord.row[academic.attendance_field] ?? "Not provided" : "Not provided"],
      ],
      details: personalDetails,
      subjects: subjectResults,
      subjectScale: Math.max(0, ...subjectResults.map(([, value]) => value)),
      insights,
    };
  }
  if (tab === "report") {
    return (
      <StudentReport
        report={reportModel}
        students={matchingRows}
        search={search}
        onSearch={setSearch}
        onSelect={setSelectedIndex}
        onBack={() => navigate("dashboard")}
      />
    );
  }
  return (
    <div className="results-dashboard">
      <div className="results-banner">
        <div>
          <small>INSIGHTFORGE · {academic ? "STUDENT RESULTS" : "DATA REPORT"}</small>
          <h1>{analysis.active.name} Dashboard</h1>
          <p>{analysis.active.filename} <span>·</span> {Number(profile.rows || 0).toLocaleString()} {academic ? "students" : "records"} <span>·</span> {profile.columns || 0} fields</p>
        </div>
        <div className="results-banner-mark"><LayoutDashboard size={22} /></div>
      </div>
      <div className="results-body">
        {busy && <div className="loading">Refreshing analysis…</div>}
        <div className="dashboard-filters">
          {academic ? (
            [academic.batch_field, academic.branch_field].filter(Boolean).map((field, index) => {
              let primary = field === primaryField;
              let value = primary ? groupValue : branchValue;
              let options = primary ? groupValues : branchValues;
              return (
                <label key={field}>
                  <span>{field.toUpperCase()}</span>
                  <select
                    value={value}
                    onChange={(event) => primary ? setGroupValue(event.target.value) : setBranchValue(event.target.value)}
                    aria-label={field}
                  >
                    <option value="">All</option>
                    {options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
              );
            })
          ) : (
            <>
              <label>
                <span>GROUP FIELD</span>
                <select
                  value={groupColumn}
                  onChange={(event) => {
                    setGroupColumn(event.target.value);
                    setGroupValue("");
                  }}
                  aria-label="Group field"
                >
                  {categories.map((column) => <option key={column} value={column}>{column}</option>)}
                  {!categories.length && <option value="">No categories</option>}
                </select>
              </label>
              <label>
                <span>GROUP VALUE</span>
                <select
                  value={groupValue}
                  onChange={(event) => setGroupValue(event.target.value)}
                  aria-label="Group value"
                >
                  <option value="">All</option>
                  {groupValues.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            </>
          )}
          <label className="dashboard-search">
            <span>{academic ? "STUDENT SEARCH" : "RECORD SEARCH"}</span>
            <span className="dashboard-search-input"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={academic ? "Search students" : "Search records"} /></span>
          </label>
          <label>
            <span>{academic ? "SELECTED STUDENT" : "SELECTED RECORD"}</span>
            <select
              value={selectedRecord?.index ?? ""}
              onChange={(event) => setSelectedIndex(event.target.value)}
              aria-label={academic ? "Selected student" : "Selected record"}
            >
              {matchingRows.map(({ row, index }) => (
                <option key={index} value={index}>
                  {String(row[recordField] ?? `Record ${index + 1}`)}
                  {academic?.id_field && row[academic.id_field] ? ` — ${row[academic.id_field]}` : ""}
                </option>
              ))}
              {!matchingRows.length && <option value="">No matching records</option>}
            </select>
          </label>
          <button
            className="reset-filters"
            onClick={() => {
              setGroupColumn(categories[0] || "");
              setGroupValue("");
              setBranchValue("");
              setSearch("");
              setSelectedIndex("");
            }}
          >
            <RotateCcw size={14} /> Reset filters
          </button>
        </div>
        <div className="dashboard-stats">
          {stats.map(([label, value]) => (
            <div className="dashboard-stat" key={label}>
              <small>{label}</small>
              <strong>{typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value}</strong>
            </div>
          ))}
        </div>
        <div className="dashboard-charts">
          {chartCards.map((chart, index) => <div className="dashboard-panel" key={`${chart.title}-${index}`}>{academic && <h3>{chart.title}</h3>}<Chart c={chart} /></div>)}
          <div className="dashboard-panel">
            {academic && <h3>Selected student performance</h3>}
            {academic && selectedRecord && (
              <div className="student-details">
                {detailFields.map(([label, value]) => (
                  <div className="student-detail" key={label}>
                    <span>{label.replace(/_/g, " ")}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
                <p className="student-insight">
                  {hasPeriodTrend
                    ? `Overall marks ${periodTrend.at(-1)[1] >= periodTrend[0][1] ? "rose" : "fell"} from ${periodTrend[0][0]} to ${periodTrend.at(-1)[0]}.`
                    : "Subject scores are shown below; no earlier period is available for a historical comparison."}
                </p>
              </div>
            )}
            {recordChart?.labels.length ? (
              <Chart c={recordChart} />
            ) : academic ? (
              <p className="dashboard-empty">No subject marks are available for this student.</p>
            ) : (
              <div className="record-details">
                <h3>{selectedRecord ? `${recordName} profile` : "Selected record profile"}</h3>
                {selectedRecord ? Object.entries(selectedRecord.row).filter(([key]) => !key.startsWith("_")).map(([key, value]) => (
                  <div className="record-detail" key={key}><span>{key}</span><strong>{String(value ?? "—")}</strong></div>
                )) : <p>No records match the current filters.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function App() {
  let [u, setU] = useState(null),
    [ds, setDs] = useState([]),
    [a, setA] = useState(null),
    [tab, setTab] = useState("chat"),
    [msg, setMsg] = useState([]),
    [p, setP] = useState(""),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(window.innerWidth > 850);
  useEffect(() => {
    if (localStorage.if_token)
      req("/api/auth/me")
        .then(setU)
        .catch(() => localStorage.removeItem("if_token"));
  }, []);
  useEffect(() => {
    if (u) load();
  }, [u]);
  async function load() {
    setDs(await req("/api/datasets"));
  }
  function navigate(nextTab) {
    setTab(nextTab);
    if (window.innerWidth <= 850) setOpen(false);
  }
  async function pick(x) {
    navigate("dashboard");
    setBusy(true);
    try {
      setA(await req(`/api/datasets/${x.id}/analyze`));
      setA((v) => ({ ...v, active: x }));
    } finally {
      setBusy(false);
    }
  }
  async function upload(e) {
    let f = e.target.files?.[0];
    if (!f) return;
    let fd = new FormData();
    fd.append("file", f);
    try {
      let x = await req("/api/datasets/upload", { method: "POST", body: fd });
      await load();
      pick(x);
    } catch (x) {
      alert(x.message);
    }
  }
  async function ask(q = p) {
    if (!a?.active || !q.trim()) return;
    setP("");
    setMsg((v) => [...v, { r: "u", c: q }]);
    setBusy(true);
    try {
      let x = await req("/api/chat/" + a.active.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q }),
      });
      setMsg((v) => [...v, { r: "a", c: x.answer }]);
      if (typeof x.answer === "object") setA((v) => ({ ...v, ...x.answer }));
    } catch (x) {
      setMsg((v) => [...v, { r: "a", c: x.message }]);
    }
    setBusy(false);
  }
  function out() {
    localStorage.removeItem("if_token");
    setU(null);
  }
  if (!u) return <Auth done={setU} />;
  return (
    <div className="app">
      <aside className={open ? "side" : "side hide"}>
        <div className="brand">✦ InsightForge</div>
        <button
          className="new"
          onClick={() => {
            setMsg([]);
            setP("");
            navigate("chat");
          }}
        >
          <Plus size={16} /> New chat
        </button>
        <label className="add-dataset">
          <Upload size={15} /> Add dataset
          <input
            hidden
            type="file"
            accept=".csv,.tsv,.xlsx,.xls,.json"
            onChange={upload}
          />
        </label>
        <small>WORKSPACE</small>
        <button
          className={tab === "dashboard" ? "nav active" : "nav"}
          onClick={() => navigate("dashboard")}
        >
          <LayoutDashboard size={16} /> Dashboard
        </button>
        <button
          className={tab === "report" ? "nav active" : "nav"}
          onClick={() => navigate("report")}
          disabled={!a?.academic}
        >
          <FileText size={16} /> Report &amp; Insights
        </button>
        <button
          className={tab === "chat" ? "nav active" : "nav"}
          onClick={() => navigate("chat")}
        >
          <Sparkles size={16} /> AI Analyst
        </button>
        <button
          className={tab === "data" ? "nav active" : "nav"}
          onClick={() => navigate("data")}
        >
          <Database size={16} /> Data
        </button>
        <small>DATASETS</small>
        {ds.map((x) => (
          <button className="dataset" key={x.id} onClick={() => pick(x)}>
            <FileText size={15} />
            {x.name}
          </button>
        ))}
        <div className="bottom">
          <div className="user">
            {u.name[0]}
            <span>
              <b>{u.name}</b>
              <em>{u.email}</em>
            </span>
          </div>
          <button className="nav" onClick={out}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main>
        <header>
          <button className="icon" onClick={() => setOpen(!open)}>
            <Menu size={18} />
          </button>
          <b>{a?.active?.name || "AI Analyst"}</b>
          <span className="ready">● Ready</span>
        </header>
        {!a ? (
          <div className="welcome">
            <div className="welcome-mark"><Sparkles size={17} /></div>
            <h1>What can I help you uncover?</h1>
            <p>
              Start with a question, then add a dataset to explore it with
              InsightForge.
            </p>
            <div className="welcome-composer">
              <textarea
                value={p}
                onChange={(x) => setP(x.target.value)}
                placeholder="Ask a question about your data..."
                aria-label="Ask InsightForge a question"
              />
              <div className="composer-tools">
                <label className="composer-add" title="Upload a dataset">
                  <Plus size={17} /> <span>Add data</span>
                  <input
                    hidden
                    type="file"
                    accept=".csv,.tsv,.xlsx,.xls,.json"
                    onChange={upload}
                  />
                </label>
                <span className="composer-hint">CSV, Excel or JSON</span>
                <button className="send-button" disabled aria-label="Send prompt">
                  <Send size={16} />
                </button>
              </div>
            </div>
            <div className="welcome-prompts" aria-label="Example questions">
              {["Summarize my data", "Find trends", "Check for missing values"].map((x) => (
                <button key={x} onClick={() => setP(x)}>{x}</button>
              ))}
            </div>
          </div>
        ) : (
          <section className={`workspace ${tab === "dashboard" || tab === "report" ? "results-workspace" : ""}`}>
            <div className="head">
              <div>
                <small>DATASET</small>
                <h1>{a.active.name}</h1>
                <p>{a.active.filename}</p>
              </div>
              <button
                className="secondary"
                onClick={() => ask("Build me a dashboard for my dataset")}
              >
                <BarChart3 size={16} /> Auto dashboard
              </button>
            </div>
            <div className="tabs">
              <button
                className={tab === "dashboard" ? "on" : ""}
                onClick={() => navigate("dashboard")}
              >
                Overview
              </button>
              <button
                className={tab === "chat" ? "on" : ""}
                onClick={() => navigate("chat")}
              >
                AI Analyst
              </button>
              <button
                className={tab === "data" ? "on" : ""}
                onClick={() => navigate("data")}
              >
                Data preview
              </button>
              <button
                className={tab === "report" ? "on" : ""}
                onClick={() => navigate("report")}
                disabled={!a.academic}
              >
                Report &amp; Insights
              </button>
            </div>
            {(tab === "dashboard" || tab === "report") && (
              <ResultsDashboard analysis={a} busy={busy} tab={tab} navigate={navigate} />
            )}
            {tab === "chat" && (
              <div className="chat">
                <div className="messages">
                  {!msg.length && (
                    <div className="chatstart">
                      <div className="welcome-mark"><Sparkles size={17} /></div>
                      <h2>What can I do for you today?</h2>
                      <p>Ask a question about <strong>{a.active.name}</strong> or choose a starting point.</p>
                      <div className="prompts">
                        {[
                          "Summarize this dataset",
                          "Find trends and patterns",
                          "Check for missing values",
                          "Build a chart of key metrics",
                        ].map((x) => (
                          <button key={x} onClick={() => ask(x)}>
                            {x}
                            <Send size={13} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.map((x, i) => (
                    <div key={i} className={"message " + x.r}>
                      <b>{x.r === "u" ? u.name[0] : "✦"}</b>
                      <div>
                        {typeof x.c === "string" ? (
                          x.c
                        ) : (
                          <pre>{JSON.stringify(x.c, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  ))}
                  {busy && (
                    <div className="message">
                      <b>✦</b>
                      <div>Thinking…</div>
                    </div>
                  )}
                </div>
                <div className="composer">
                  <textarea
                    value={p}
                    onChange={(x) => setP(x.target.value)}
                    onKeyDown={(x) => {
                      if (x.key === "Enter" && !x.shiftKey) {
                        x.preventDefault();
                        ask();
                      }
                    }}
                    placeholder="Ask a question about your data..."
                    aria-label="Ask InsightForge a question"
                  />
                  <div className="composer-tools">
                    <label className="composer-add" title="Upload a dataset">
                      <Plus size={17} /> <span>Add data</span>
                      <input
                        hidden
                        type="file"
                        accept=".csv,.tsv,.xlsx,.xls,.json"
                        onChange={upload}
                      />
                    </label>
                    <span className="dataset-context"><Database size={14} /> {a.active.name}</span>
                    <button
                      className="send-button"
                      onClick={() => ask()}
                      disabled={!p.trim() || busy}
                      aria-label="Send prompt"
                      title="Send prompt"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {tab === "data" && (
              <div className="card tablecard">
                <div className="tablehead">
                  <h3>Data preview</h3>
                  <button
                    className="secondary"
                    onClick={() => {
                      let b = new Blob([JSON.stringify(a, null, 2)], {
                          type: "application/json",
                        }),
                        x = document.createElement("a");
                      x.href = URL.createObjectURL(b);
                      x.download = "insightforge-analysis.json";
                      x.click();
                    }}
                  >
                    <Download size={15} /> Export
                  </button>
                </div>
                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(a.preview?.[0] || {}).map((c) => (
                          <th>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(a.preview || []).map((r) => (
                        <tr>
                          {Object.keys(a.preview?.[0] || {}).map((c) => (
                            <td>{String(r[c] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Paragraph,
  Packer,
  SectionType,
  TextRun,
} from "../frontend/node_modules/docx/dist/index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(here, "InsightForge_Student_Analytics_IEEE_Paper.docx");
const cohort = {
  students: 62,
  fields: 17,
  subjects: 9,
  sum: 47640,
  mean: 768.4,
  median: 778.0,
  sampleStd: 47.2,
  min: 668,
  max: 846,
  zeroFailed: 58,
  studentsPassRate: 93.5,
  passedAttempts: 554,
  failedAttempts: 4,
  attemptPassRate: 99.3,
  missing: 0,
  duplicates: 0,
  histogram: [
    ["668-690", 6], ["690-712", 3], ["712-735", 6], ["735-757", 8],
    ["757-779", 8], ["779-802", 14], ["802-824", 7], ["824-846", 10],
  ],
  subjects: [
    ["BAD601", 77.5], ["BCS602", 74.4], ["BAD685", 88.2],
    ["BCSL606", 91.2], ["BNSK658", 95.8], ["BIKS609", 96.4],
    ["BAI613", 74.1], ["BEE654", 74.7], ["BCSL657", 96.0],
  ],
  example: {
    marks: [74, 60, 80, 95, 96, 98, 77, 53, 98],
    total: 731,
    rank: 50,
    passed: 9,
    failed: 0,
  },
};
const fallbackPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=",
  "base64",
);
const font = "Times New Roman";
const pt = (text, options = {}) => new Paragraph({
  alignment: options.alignment,
  spacing: options.spacing || { before: 0, after: 70, line: 230 },
  indent: options.indent,
  children: [new TextRun({
    text,
    font: options.font || font,
    size: options.size || 20,
    bold: options.bold || false,
    italics: options.italics || false,
    color: options.color || "111111",
  })],
});
const heading = (text, level = HeadingLevel.HEADING_1) => new Paragraph({
  heading: level,
  spacing: { before: 120, after: 45 },
  keepNext: true,
  children: [new TextRun({ text, font, bold: true, size: level === HeadingLevel.HEADING_1 ? 20 : 18 })],
});
const equation = (text, number) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 45, after: 75 },
  children: [new TextRun({ text: `${text}                                      (${number})`, font: "Cambria Math", size: 17 })],
});
const caption = (text) => pt(text, { alignment: AlignmentType.CENTER, size: 16, spacing: { before: 0, after: 90, line: 200 } });
const esc = (value) => String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[char]);
const svgImage = (svg, title, description, width, height) => new ImageRun({
  type: "svg",
  data: Buffer.from(svg, "utf8"),
  fallback: { type: "png", data: fallbackPng },
  transformation: { width, height },
  altText: { title, description },
});
const figure = (svg, title, description, width, height, label) => [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 70, after: 35 }, children: [svgImage(svg, title, description, width, height)] }),
  caption(label),
];

function workflowSvg() {
  const labels = [
    ["1  INPUT", "XLSX / CSV", "Student View"],
    ["2  INGEST", "JWT access", "User-scoped file"],
    ["3  ANALYZE", "Schema + scores", "Pandas / NumPy"],
    ["4  EXPLORE", "Filters + charts", "Student selector"],
    ["5  REPORT", "Insights", "PDF / DOCX"],
  ];
  const boxes = labels.map((lines, index) => {
    const x = 18 + index * 184;
    const fill = index === 2 ? "#e5f1f7" : "#ffffff";
    const text = lines.map((line, row) => `<text x="${x + 76}" y="${73 + row * 34}" text-anchor="middle" font-family="Arial" font-size="25" fill="${row === 0 ? "#133451" : "#405b70"}" font-weight="${row === 0 ? 700 : 400}">${esc(line)}</text>`).join("");
    const arrow = index < labels.length - 1 ? `<path d="M${x + 154} 102h20m-8-8 8 8-8 8" fill="none" stroke="#1682a2" stroke-width="4"/>` : "";
    return `<rect x="${x}" y="35" width="154" height="132" rx="12" fill="${fill}" stroke="#9db4c4" stroke-width="2"/>${text}${arrow}`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="940" height="205" viewBox="0 0 940 205"><rect width="940" height="205" fill="#f7fafc"/>${boxes}<text x="470" y="196" text-anchor="middle" font-family="Arial" font-size="17" fill="#62788a">Deterministic metrics remain separate from optional natural-language chat.</text></svg>`;
}

function histogramSvg() {
  const width = 940, height = 520, left = 88, right = 25, top = 35, bottom = 95;
  const plotW = width - left - right, plotH = height - top - bottom;
  const maxValue = 16, barW = plotW / cohort.histogram.length * 0.62;
  const grid = [0, 4, 8, 12, 16].map((tick) => {
    const y = top + plotH - tick / maxValue * plotH;
    return `<path d="M${left} ${y}H${width - right}" stroke="#dbe3e9"/><text x="${left - 14}" y="${y + 7}" text-anchor="end" font-family="Arial" font-size="23" fill="#44596a">${tick}</text>`;
  }).join("");
  const bars = cohort.histogram.map(([label, value], index) => {
    const slot = plotW / cohort.histogram.length;
    const x = left + index * slot + (slot - barW) / 2;
    const barH = value / maxValue * plotH;
    const y = top + plotH - barH;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#1678f2"/><text x="${x + barW / 2}" y="${y - 10}" text-anchor="middle" font-family="Arial" font-size="22" fill="#173651">${value}</text><text x="${x + barW / 2}" y="${top + plotH + 31}" text-anchor="middle" font-family="Arial" font-size="18" fill="#344b5d">${label}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${grid}${bars}<path d="M${left} ${top + plotH}H${width - right}M${left} ${top}V${top + plotH}" stroke="#263d50" stroke-width="2"/><text x="${width / 2}" y="${height - 18}" text-anchor="middle" font-family="Arial" font-size="23" fill="#263d50">Total marks (bin range)</text><text x="23" y="${height / 2}" transform="rotate(-90 23 ${height / 2})" text-anchor="middle" font-family="Arial" font-size="23" fill="#263d50">Students</text></svg>`;
}

function subjectSvg() {
  const width = 940, height = 600, left = 145, right = 65, top = 30, rowH = 55;
  const plotW = width - left - right, max = 100;
  const rows = [...cohort.subjects].sort((a, b) => a[1] - b[1]);
  const grid = [0, 20, 40, 60, 80, 100].map((tick) => {
    const x = left + tick / max * plotW;
    return `<path d="M${x} ${top}V${top + rowH * rows.length}" stroke="#e0e7ec"/><text x="${x}" y="${top + rowH * rows.length + 30}" text-anchor="middle" font-family="Arial" font-size="19" fill="#44596a">${tick}</text>`;
  }).join("");
  const bars = rows.map(([subject, value], index) => {
    const y = top + index * rowH + 9;
    const barWidth = value / max * plotW;
    return `<text x="${left - 12}" y="${y + 27}" text-anchor="end" font-family="Arial" font-size="19" fill="#344b5d">${subject}</text><rect x="${left}" y="${y}" width="${barWidth}" height="31" rx="3" fill="#168a82"/><text x="${left + barWidth + 9}" y="${y + 24}" font-family="Arial" font-size="19" fill="#173651">${value.toFixed(1)}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${grid}${bars}<path d="M${left} ${top + rowH * rows.length}H${width - right}" stroke="#263d50" stroke-width="2"/><text x="${width / 2}" y="${height - 15}" text-anchor="middle" font-family="Arial" font-size="22" fill="#263d50">Mean subject marks (source scale)</text></svg>`;
}

const intro = [
  "Student-result workbooks commonly combine identifiers, cohort attributes, total marks, per-subject scores, and pass/fail counts. Reviewing such files manually makes it difficult to compare students consistently, inspect the cohort distribution, and produce a repeatable report. InsightForge is a browser-based data-analysis workflow that uploads user-owned spreadsheets, profiles their schema, computes deterministic student and cohort statistics, and presents interactive filters, charts, and downloadable reports.",
  "This paper documents the implemented workflow and evaluates it descriptively on the Student View sheet stored with the project. The observed file contains 62 records and 17 fields, including nine subject-total columns. Results are computed from the workbook rather than fabricated: the mean total is 768.4, the median is 778.0, and the maximum is 846. Two pass-rate definitions are reported separately: 93.5% of students have zero failed subjects, while 99.3% of recorded subject attempts are passes. Attendance and multi-period history are absent, so the system explicitly marks these measures unavailable instead of imputing them.",
];

const body = [];
const add = (...items) => body.push(...items);
const h1 = (text) => body.push(heading(text, HeadingLevel.HEADING_1));
const h2 = (text) => body.push(heading(text, HeadingLevel.HEADING_2));
const text = (value, options) => body.push(pt(value, options));
const eq = (value, number) => body.push(equation(value, number));

h1("I. INTRODUCTION");
text("Learning analytics applies measurement and data processing to information generated in educational settings [1]. In a practical results workflow, the first challenge is often not a predictive model but dependable ingestion: a workbook may encode identifiers as USN, subjects as suffixed columns, and outcome counts as numeric fields. Misclassifying these fields can omit students from search or produce misleading charts.");
text("InsightForge addresses this operational problem with a per-user upload and analysis path. A spreadsheet is stored under authenticated ownership, parsed with pandas, summarized by deterministic functions, and exposed through a student-aware dashboard. Search and cohort filters select any returned record; the report view derives personal details, marks, cohort rank, insights, and exports from that same selection. Optional LLM chat is separate from the numerical pipeline, so reported values remain traceable to computed context.");

h1("II. SYSTEM ARCHITECTURE");
text("The application uses a React/Vite client, a FastAPI service, JWT authentication, SQLite dataset metadata, and user-scoped file storage. Spreadsheet parsing and calculations use pandas and NumPy; Plotly renders interactive charts. The academic workflow is represented in Fig. 1.");
add(...figure(workflowSvg(), "InsightForge student-analysis workflow", "Authenticated upload, schema-aware analysis, interactive student dashboard, and report export", 315, 69, "Fig. 1. Data flow from a user-owned workbook to an interactive analysis and report."));
text("The API associates each dataset with an owner and checks ownership before analysis. The workbook is loaded from the stored path, and analysis returns both a general profile and, when the columns match a student-results schema, an academic summary. The frontend builds the record selector from all returned student rows. Selecting another student recomputes the displayed details and subject chart from the selected row; the report uses the same state.");

h1("III. DATA AND CASE STUDY");
text("The case study uses the first uploaded copy of the project workbook, sheet Student View. It contains N = 62 students and 17 columns: USN, Student Name, Batch, Branch, Semester, Total_Marks, Subjects_Passed, Subjects_Failed, and nine fields ending in _Total. The workbook has no missing cells and no exact duplicate rows. Its single observed semester cannot support a historical time trend, and it contains no attendance field.");
text("To protect student privacy, this paper reports cohort aggregates and a pseudonymous worked record only. Names and USNs are not reproduced. The analysis is descriptive: the cohort is a single uploaded workbook and does not establish causal effects or population-wide generalizability.");

h1("IV. METHODOLOGY");
h2("A. Ingestion and schema recognition");
text("The user authenticates before upload. Supported files include CSV, TSV, XLSX, XLS, and JSON; Excel is read from its first worksheet. The analyzer normalizes header text for matching while retaining original column names in output. Student identity is detected from a name-like field and an identifier such as USN. Subject measures are numeric fields excluding identifiers, totals, semester/cohort fields, attendance, grade, and passed/failed-count fields. In this workbook the recognized student field is Student Name, identifier is USN, and subject measures are the nine *_Total columns.");
text("General profiling counts rows, fields, numeric/categorical columns, missing cells, duplicates, and numeric correlations. A cleaned copy drops duplicate rows and fills numeric missing values with medians and categorical missing values with modes for general EDA. The academic summary is computed from the original workbook rows so published totals and outcome counts are not silently altered.");

h2("B. Student total and cohort statistics");
text("Let xᵢⱼ denote student i's mark for subject j and let Tᵢ be the workbook's Total_Marks field. The system uses the explicit total where present; otherwise it sums available subject marks:");
eq("Sᵢ = Tᵢ, if Tᵢ is present; otherwise Sᵢ = Σⱼ xᵢⱼ", 1);
text("For N students with valid totals, the cohort mean and sample standard deviation are:");
eq("μ = (1/N) Σᵢ Sᵢ;   s = sqrt(Σᵢ(Sᵢ − μ)²/(N − 1))", 2);
text("The cohort median is the middle ordered score (or mean of the two middle scores when N is even). The maximum is maxᵢ Sᵢ. Subject j's mean uses only valid values for that subject:");
eq("μⱼ = (1/nⱼ) Σᵢ:xᵢⱼ valid xᵢⱼ", 3);

h2("C. Ranking and pass-rate definitions");
text("Competition rank is one plus the number of students with a strictly higher total; equal totals therefore share rank:");
eq("Rᵢ = 1 + Σⱼ I(Sⱼ > Sᵢ)", 4);
text("Two pass rates answer different questions and must not be conflated. Student-level pass rate counts students with no failed subjects. Attempt-level pass rate counts passed subject attempts divided by all recorded attempts:");
eq("Pstudent = 100 × #{i : Failedᵢ = 0}/N", 5);
eq("Pattempt = 100 × Σᵢ Passedᵢ/(Σᵢ Passedᵢ + Σᵢ Failedᵢ)", 6);
text("For the case study, 58/62 students have zero failed subjects, giving 93.5%. Across all subject attempts, 554 passed and 4 failed, giving 554/558 = 99.3%. When passed/failed counts or an explicit pass/fail status are absent, the corresponding rate is unavailable rather than inferred from an undocumented threshold.");

h2("D. Distribution, subject comparison, and trend handling");
text("The total-mark histogram uses B = min(8, max(1, ceil(sqrt(N)))) bins; NumPy determines the edges over the observed score range. With N = 62, B = 8. Subject averages are presented as horizontal bars. For each selected student, the report displays each available subject score and the cohort rank. If a period field varies within the dataset, records for that student are grouped by period and their mean total is plotted. A single-period dataset does not produce a historical trend. Attendance is displayed only when an attendance column exists.");

h2("E. Interactive reporting");
text("The dashboard exposes batch and branch filters, free-text search across student fields, and a selected-student control. All records returned by the analysis are available in the selector. The report view includes available personal details, subject marks, overall total, cohort mean/rank, attendance status, passed/failed counts, and evidence-based insights such as strongest/weakest subject. PDF and DOCX exports are generated from the current report model; therefore a change in selection changes both on-screen values and subsequent exports.");

h1("V. RESULTS");
text("The cohort total sum is 47,640. Consequently μ = 47,640/62 = 768.387…, reported as 768.4. The median is 778.0, sample standard deviation is 47.2, minimum is 668, and maximum is 846. The score histogram is shown in Fig. 2. The subject means in Fig. 3 show the highest cohort mean for BIKS609 (96.4) and the lowest for BAI613 (74.1); these are descriptive cohort comparisons, not measures of difficulty.");
add(...figure(histogramSvg(), "Distribution of student total marks", "Eight-bin histogram of 62 student totals, with anonymized aggregate counts", 315, 174, "Fig. 2. Total-mark distribution (bin counts sum to 62)."));
add(...figure(subjectSvg(), "Mean marks by subject", "Anonymized cohort mean marks across nine subject-total columns", 315, 201, "Fig. 3. Mean subject marks across the cohort."));

h1("VI. WORKED EXAMPLE");
text("Consider an anonymized row from the workbook. In the subject-column order BAD601, BCS602, BAD685, BCSL606, BNSK658, BIKS609, BAI613, BEE654, and BCSL657, its marks are [74, 60, 80, 95, 96, 98, 77, 53, 98]. Their sum is 731, matching the stored Total_Marks value. The row records 9 passed subjects and 0 failed subjects. Applying (4), 49 cohort totals are greater than 731, so the student's competition rank is 50 of 62. This example shows how the displayed record can be independently checked without exposing the student's name or USN.");
text("For an individual subject such as BIKS609, the cohort average is 96.435…, reported as 96.4. For the student-level outcome rate, 58 students with zero failures divided by 62 gives 0.93548…, or 93.5%. For attempt-level outcomes, 554/(554 + 4) gives 0.99283…, or 99.3%. The distinct denominators explain the difference between the rates.");

h1("VII. LIMITATIONS AND VALIDITY");
text("The case study contains one 62-student, single-semester workbook, all under one branch code. No attendance values or repeated periods are available; corresponding dashboard values are reported as unavailable. Subject labels and totals are inferred from column names and numeric types, so heterogeneous workbooks should be checked against their institutional schema. The current descriptive analysis does not normalize subjects to maximum possible marks because no per-subject maximum field is present. It does not infer grades from marks or make predictions. Results characterize this workbook snapshot only.");

h1("VIII. CONCLUSION");
text("InsightForge implements a reproducible upload-to-report workflow for student-result spreadsheets. Schema-aware recognition recovers the USN and nine subject-total fields in the observed workbook, and deterministic calculations expose the full 62-student roster, cohort statistics, two explicitly defined pass rates, distribution, subject means, rank, and selection-specific report. The worked example reconciles to the stored total. Missing attendance and historical data remain explicit limitations. Future work includes validating configurable schemas, importing attendance and multi-semester records, and adding institution-defined grading thresholds with provenance.");

h1("REFERENCES");
text("[1] G. Siemens and P. Long, “Penetrating the fog: Analytics in learning and education,” EDUCAUSE Review, vol. 46, no. 5, pp. 30–40, 2011.", { size: 16 });
text("[2] W. McKinney, “Data structures for statistical computing in Python,” in Proc. 9th Python in Science Conf. (SciPy 2010), 2010, pp. 56–61, doi: 10.25080/Majora-92bf1922-00a.", { size: 16 });
text("[3] The pandas development team, “pandas documentation.” [Online]. Available: https://pandas.pydata.org/docs/ (accessed Sep. 26, 2026).", { size: 16 });
text("[4] Plotly Technologies Inc., “Plotly.js open-source graphing library.” [Online]. Available: https://plotly.com/javascript/ (accessed Sep. 26, 2026).", { size: 16 });
text("[5] FastAPI, “FastAPI documentation.” [Online]. Available: https://fastapi.tiangolo.com/ (accessed Sep. 26, 2026).", { size: 16 });

const titleSection = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 100 }, children: [new TextRun({ text: "InsightForge: A Data-Driven Student Performance Analysis and Reporting Workflow", font, bold: true, size: 34 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "Author Name(s)", font, size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: "Department / Institution, City, Country  |  author email(s)", font, italics: true, size: 18, color: "555555" })] }),
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 20, after: 80, line: 220 }, children: [new TextRun({ text: "Abstract—", font, bold: true, size: 18 }), new TextRun({ text: "Student-result spreadsheets combine identifiers, subject scores, totals, and outcomes but are often analyzed with one-off manual steps. This paper presents InsightForge, a user-scoped upload, analysis, and reporting workflow that recognizes student-result schemas and computes deterministic cohort and student metrics. A 62-student workbook with 17 fields and nine subject-total measures is used for descriptive evaluation. The observed mean total is 768.4 (median 778.0; maximum 846). Student-level pass rate is 93.5%, whereas pass rate over subject attempts is 99.3%; the two values differ because their denominators differ. An anonymized worked record sums to 731 and ranks 50th of 62. The system provides all-student search/filter/selection, aggregate charts, selection-specific insights, and PDF/DOCX reports. Attendance and historical trends are marked unavailable because the source workbook contains neither an attendance field nor multiple periods. The results demonstrate a reproducible descriptive workflow, not a predictive or causal model.", font, size: 18 })] }),
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 150, line: 210 }, children: [new TextRun({ text: "Index Terms—", font, bold: true, italics: true, size: 18 }), new TextRun({ text: "student performance, learning analytics, spreadsheet analysis, cohort statistics, interactive dashboard, report generation.", font, italics: true, size: 18 })] }),
];

const document = new Document({
  creator: "InsightForge project team",
  title: "InsightForge Student Performance Analysis Workflow",
  subject: "IEEE-style conference paper describing the implemented student-results analytics workflow",
  keywords: "student analytics, cohort analysis, spreadsheet workflow, InsightForge",
  sections: [
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 930, right: 900, bottom: 900, left: 900, header: 420, footer: 420 } },
        column: { count: 1 },
      },
      children: titleSection,
    },
    {
      properties: {
        type: SectionType.CONTINUOUS,
        page: { size: { width: 12240, height: 15840 }, margin: { top: 900, right: 900, bottom: 900, left: 900, header: 420, footer: 420 } },
        column: { count: 2, space: 360, equalWidth: true },
      },
      children: body,
    },
  ],
});

await fs.writeFile(outputPath, await Packer.toBuffer(document));
console.log(`Generated ${outputPath}`);

import PDFDocument from "pdfkit";
import { formatPaise } from "../utils/money.js";

const BRAND_ACCENT = "#0F6CFB";
const TEXT_MUTED = "#5B6472";
const TABLE_BORDER = "#DCE1EA";

function drawBrandHeader(doc, subtitle) {
  doc
    .fillColor(BRAND_ACCENT)
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("NexusBank", { continued: true })
    .fillColor(TEXT_MUTED)
    .font("Helvetica")
    .fontSize(10)
    .text(`   ${subtitle}`, { align: "left" });

  doc.moveDown(0.5);

  doc
    .strokeColor(BRAND_ACCENT)
    .lineWidth(1.2)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();

  doc.moveDown(0.75);
  doc.fillColor("#000");
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();

  for (
    let i = range.start;
    i < range.start + range.count;
    i += 1
  ) {
    doc.switchToPage(i);

    doc
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text(
        `NexusBank · This is a system-generated document. Page ${
          i + 1
        } of ${range.count}.`,
        doc.page.margins.left,
        doc.page.height - 40,
        {
          width:
            doc.page.width -
            doc.page.margins.left -
            doc.page.margins.right,
          align: "center",
        }
      );
  }
}

function drawKeyValue(doc, label, value) {
  const startX = doc.x;

  doc
    .font("Helvetica")
    .fillColor(TEXT_MUTED)
    .fontSize(9)
    .text(label, { continued: false });

  doc
    .font("Helvetica-Bold")
    .fillColor("#000")
    .fontSize(11)
    .text(String(value ?? "—"));

  doc.moveDown(0.4);
  doc.x = startX;
}

/* =========================================================
   INTERNAL STATEMENT RENDERER
   Used by both download and email attachment generation.
   ========================================================= */

function renderStatement(
  doc,
  { account, entries = [], dateRange, user, summary }
) {
  drawBrandHeader(doc, "Account Statement");

  /* ---------------- Account metadata ---------------- */

  const metaTop = doc.y;

  const colWidth =
    (doc.page.width -
      doc.page.margins.left -
      doc.page.margins.right) /
    2;

  doc.x = doc.page.margins.left;

  drawKeyValue(
    doc,
    "Account Holder",
    user?.name || "NexusBank Customer"
  );

  drawKeyValue(
    doc,
    "Account Number",
    account.accountNumber
  );

  drawKeyValue(
    doc,
    "Account Type",
    account.accountType || "SAVINGS"
  );

  doc.x = doc.page.margins.left + colWidth;
  doc.y = metaTop;

  drawKeyValue(
    doc,
    "IFSC",
    account.ifsc || "NEXB0000001"
  );

  drawKeyValue(
    doc,
    "Branch",
    account.branch || "NexusBank Digital"
  );

  drawKeyValue(
    doc,
    "Statement Period",
    `${dateRange?.from || "—"}  → ${
      dateRange?.to || "—"
    }`
  );

  doc.x = doc.page.margins.left;
  doc.moveDown(0.8);

  /* ---------------- Closing balance ---------------- */

  const boxWidth =
    doc.page.width -
    doc.page.margins.left -
    doc.page.margins.right;

  const balanceTop = doc.y;

  doc
    .roundedRect(
      doc.x,
      balanceTop,
      boxWidth,
      summary ? 68 : 42,
      6
    )
    .fillAndStroke("#F2F6FF", BRAND_ACCENT);

  doc
    .fillColor(TEXT_MUTED)
    .fontSize(9)
    .text(
      "Closing Balance",
      doc.x + 12,
      balanceTop + 8
    );

  doc
    .fillColor(BRAND_ACCENT)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(
      formatPaise(account.balancePaise ?? 0),
      doc.x + 12,
      balanceTop + 20
    );

  if (summary) {
    doc
      .fillColor(TEXT_MUTED)
      .font("Helvetica")
      .fontSize(8)
      .text(
        `Credits: ${formatPaise(
          summary.credit || 0
        )}   ·   Debits: ${formatPaise(
          summary.debit || 0
        )}   ·   Entries: ${summary.count ?? entries.length}`,
        doc.x + 12,
        balanceTop + 46
      );
  }

  doc.y = balanceTop + (summary ? 78 : 52);
  doc.fillColor("#000");

  /* ---------------- Transactions table ---------------- */

  const columns = [
    {
      key: "date",
      label: "Date",
      width: 80,
    },
    {
      key: "type",
      label: "Type",
      width: 85,
    },
    {
      key: "dir",
      label: "Dr/Cr",
      width: 38,
    },
    {
      key: "desc",
      label: "Description",
      width: 130,
    },
    {
      key: "amount",
      label: "Amount",
      width: 82,
    },
    {
      key: "balance",
      label: "Balance",
      width: 90,
    },
  ];

  const tableLeft = doc.page.margins.left;

  let cursorY = doc.y + 4;

  const rowWidth = columns.reduce(
    (sum, column) => sum + column.width,
    0
  );

  function drawRow(
    cells,
    { bold = false, fill = null } = {}
  ) {
    const rowHeight = 20;

    if (fill) {
      doc
        .rect(
          tableLeft,
          cursorY - 4,
          rowWidth,
          rowHeight
        )
        .fill(fill);
    }

    doc
      .fillColor("#000")
      .font(
        bold ? "Helvetica-Bold" : "Helvetica"
      )
      .fontSize(9);

    let x = tableLeft;

    columns.forEach((column, index) => {
      doc.text(
        String(cells[index] ?? ""),
        x + 4,
        cursorY,
        {
          width: column.width - 8,
          ellipsis: true,
        }
      );

      x += column.width;
    });

    cursorY += rowHeight;

    doc
      .strokeColor(TABLE_BORDER)
      .lineWidth(0.5)
      .moveTo(
        tableLeft,
        cursorY - 4
      )
      .lineTo(
        tableLeft + rowWidth,
        cursorY - 4
      )
      .stroke();
  }

  drawRow(
    columns.map((column) => column.label),
    {
      bold: true,
      fill: "#F5F7FB",
    }
  );

  const rowsPerPage = 30;

  entries.forEach((entry, index) => {
    if (
      index > 0 &&
      index % rowsPerPage === 0
    ) {
      doc.addPage();

      drawBrandHeader(
        doc,
        "Account Statement (contd.)"
      );

      cursorY = doc.y + 4;

      drawRow(
        columns.map(
          (column) => column.label
        ),
        {
          bold: true,
          fill: "#F5F7FB",
        }
      );
    }

    drawRow([
      new Date(
        entry.createdAt || Date.now()
      ).toLocaleDateString("en-IN"),

      entry.entryType || "—",

      entry.direction === "CREDIT"
        ? "Cr"
        : "Dr",

      entry.description ||
        entry.reference?.kind ||
        "—",

      formatPaise(
        entry.amountPaise || 0
      ),

      formatPaise(
        entry.balanceAfterPaise ?? 0
      ),
    ]);
  });

  if (entries.length === 0) {
    doc.moveDown(1);

    doc
      .fillColor(TEXT_MUTED)
      .fontSize(11)
      .text(
        "No transactions in the selected period.",
        {
          align: "center",
        }
      );
  }

  drawFooter(doc);
}

/* =========================================================
   STREAM STATEMENT PDF
   Used by statementController.js
   ========================================================= */

export function streamStatementPdf(res, opts) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    bufferPages: true,
  });

  const accountNumber =
    opts?.account?.accountNumber ||
    "account";

  const filename =
    `statement-${accountNumber}-${Date.now()}.pdf`;

  res.setHeader(
    "Content-Type",
    "application/pdf"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  doc.pipe(res);

  renderStatement(doc, opts);

  doc.end();
}

/*
 * Backward compatibility.
 * Existing controllers using generateStatementPdf()
 * will continue working.
 */
export const generateStatementPdf =
  streamStatementPdf;

/* =========================================================
   BUILD STATEMENT PDF BUFFER
   Used by statementShareService.js
   ========================================================= */

export function buildStatementPdfBuffer(opts) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        bufferPages: true,
      });

      const chunks = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", reject);

      renderStatement(doc, opts);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/* =========================================================
   RECEIPT PDF
   ========================================================= */

export function generateReceiptPdf(
  res,
  {
    transaction,
    user,
    account,
    beneficiary,
  }
) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: true,
  });

  const filename =
    `receipt-${transaction._id}.pdf`;

  res.setHeader(
    "Content-Type",
    "application/pdf"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  doc.pipe(res);

  drawBrandHeader(
    doc,
    "Transaction Receipt"
  );

  /* Amount */

  doc
    .fillColor(TEXT_MUTED)
    .fontSize(10)
    .font("Helvetica")
    .text("Amount");

  doc
    .fillColor(BRAND_ACCENT)
    .font("Helvetica-Bold")
    .fontSize(28)
    .text(
      formatPaise(
        transaction.amountPaise
      )
    );

  doc.moveDown(0.4);

  /* Status */

  const statusColor =
    transaction.status === "COMPLETED"
      ? "#0E9F6E"
      : transaction.status === "BLOCKED"
      ? "#DC2626"
      : "#D97706";

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(statusColor)
    .text(
      transaction.status || "UNKNOWN"
    );

  doc.moveDown(1);
  doc.fillColor("#000");

  /* Details */

  const rows = [
    [
      "Transaction ID",
      String(transaction._id),
    ],
    [
      "Date",
      transaction.createdAt
        ? new Date(
            transaction.createdAt
          ).toLocaleString("en-IN")
        : "—",
    ],
    [
      "Type",
      transaction.type ||
        "TRANSFER",
    ],
    [
      "Category",
      transaction.category ||
        "—",
    ],
    [
      "Description",
      transaction.description ||
        "—",
    ],
    [
      "From Account",
      account?.accountNumber ||
        "—",
    ],
    [
      "Beneficiary Name",
      beneficiary?.name ||
        "—",
    ],
    [
      "Beneficiary Bank",
      beneficiary?.bankName ||
        "—",
    ],
    [
      "Beneficiary A/C",
      beneficiary?.accountNumber ||
        "—",
    ],
    [
      "Risk Level",
      transaction.riskLevel ||
        "—",
    ],
    [
      "Fraud Decision",
      transaction.fraudDecision ||
        "—",
    ],
    [
      "Reference / Idempotency",
      transaction.idempotencyKey ||
        "—",
    ],
  ];

  const rowHeight = 22;

  const labelWidth = 160;

  const boxWidth =
    doc.page.width -
    doc.page.margins.left -
    doc.page.margins.right;

  rows.forEach(
    ([label, value], index) => {
      const y = doc.y;

      if (index % 2 === 0) {
        doc
          .rect(
            doc.page.margins.left,
            y - 4,
            boxWidth,
            rowHeight
          )
          .fill("#FAFBFD");
      }

      doc
        .fillColor(TEXT_MUTED)
        .font("Helvetica")
        .fontSize(9)
        .text(
          label,
          doc.page.margins.left + 8,
          y,
          {
            width: labelWidth,
          }
        );

      doc
        .fillColor("#000")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
          String(value ?? "—"),
          doc.page.margins.left +
            labelWidth +
            12,
          y,
          {
            width:
              boxWidth -
              labelWidth -
              20,
          }
        );

      doc.y = y + rowHeight;
    }
  );

  doc.moveDown(1.5);

  doc
    .fillColor(TEXT_MUTED)
    .fontSize(9)
    .text(
      "This receipt is a digitally generated record of your NexusBank transaction. " +
        "Please retain it for your records. For any dispute, contact NexusBank support " +
        "with the transaction ID shown above.",
      {
        align: "left",
      }
    );

  drawFooter(doc);

  doc.end();
}
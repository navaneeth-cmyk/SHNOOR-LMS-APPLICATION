import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firstExistingPath = (paths = []) => {
  for (const candidate of paths) {
    if (!candidate) continue;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

const generatePDF = async (
  resOrExamName,
  examName,
  score,
  userId,
  percentage = null,
  studentName = null,
  options = {}
) => {
  const hasResponse =
    resOrExamName && typeof resOrExamName.setHeader === "function";

  const res = hasResponse ? resOrExamName : null;
  const exam_name = hasResponse ? examName : resOrExamName;
  const scoreValue = hasResponse ? score : examName;
  const user_id = hasResponse ? userId : score;
  const percentageValue = hasResponse ? percentage : userId;
  const student_name = hasResponse ? studentName : percentage;
  const finalOptions = hasResponse ? options : studentName || {};

  const certificateId = finalOptions.certificateId || `cert_${Date.now()}`;
  const verifyUrl = finalOptions.verifyUrl || "";

  const numericScore = Number(scoreValue);
  const numericPercentage =
    percentageValue !== null && percentageValue !== undefined
      ? Number(percentageValue)
      : null;

  if (
    isNaN(numericScore) &&
    (numericPercentage === null || isNaN(numericPercentage))
  ) {
    if (res) {
      return res.status(400).json({
        success: false,
        message: "Invalid score"
      });
    }

    return { generated: false, message: "Invalid score" };
  }

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 72, bottom: 72, left: 72, right: 72 }
  });

  let outputStream = null;
  let filePath = null;

  if (res) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=certificate_${user_id}.pdf`
    );
    outputStream = res;
  } else {
    const certDir = path.join(process.cwd(), "certificates");
    fs.mkdirSync(certDir, { recursive: true });
    const fileName = `${certificateId}.pdf`;
    filePath = path.join(certDir, fileName);
    outputStream = fs.createWriteStream(filePath);
  }

  doc.pipe(outputStream);

  const logoPath = firstExistingPath([
    process.env.CERTIFICATE_LOGO_PATH,
    path.resolve(process.cwd(), "frontend/public/just_logo.svg"),
    path.resolve(__dirname, "../../frontend/public/just_logo.svg")
  ]);

  const signaturePath = firstExistingPath([
    process.env.CERTIFICATE_SIGNATURE_PATH,
    path.resolve(process.cwd(), "frontend/public/signatures/sign.png"),
    path.resolve(__dirname, "../../frontend/public/signatures/sign.png")
  ]);

  const footerLogoPath = firstExistingPath([
    process.env.CERTIFICATE_FOOTER_LOGO_PATH,
    path.resolve(process.cwd(), "frontend/public/nasscom.jpg"),
    path.resolve(__dirname, "../../frontend/public/nasscom.jpg")
  ]);

  let qrDataUrl = null;
  if (verifyUrl) {
    try {
      qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 170,
        margin: 1,
        errorCorrectionLevel: "M"
      });
    } catch (_) {
      qrDataUrl = null;
    }
  }

  doc
    .lineWidth(3)
    .strokeColor("#b28a2e")
    .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
    .stroke();

  if (logoPath) {
    try {
      doc.image(logoPath, doc.page.width / 2 - 45, 55, { width: 90, height: 90 });
    } catch (_) { }
  }

  doc.moveDown(3);
  doc.font("Times-Bold").fontSize(34).text(
    "CERTIFICATE OF COMPLETION",
    { align: "center" }
  );

  doc.moveDown(2);

  // Body
  doc.font("Times-Roman").fontSize(24).text(
    "This is proudly presented to",
    { align: "center" }
  );

  doc.moveDown(1);
  doc.font("Times-Bold").fontSize(26).text(
    student_name || `Student ID: ${user_id}`,
    { align: "center", underline: true }
  );

  doc.moveDown(1);
  doc.font("Times-Roman").fontSize(23).text(
    `For successfully completing the exam "${exam_name}"`,
    { align: "center" }
  );

  doc.moveDown(1);
  doc.font("Times-Bold").fontSize(22).text(
    `Score Achieved: ${numericScore}`,
    { align: "center" }
  );

  if (numericPercentage !== null) {
    doc.moveDown(0.5);
    doc.font("Times-Roman").fontSize(20).text(
      `Percentage: ${numericPercentage}%`,
      { align: "center" }
    );
  }

  if (signaturePath) {
    try {
      doc.image(signaturePath, 380, 660, { width: 140, height: 40 });
    } catch (_) { }
  }

  if (footerLogoPath) {
    try {
      doc.image(footerLogoPath, 80, 675, { width: 90, height: 42 });
    } catch (_) { }
  }

  if (qrDataUrl) {
    try {
      doc.image(qrDataUrl, 460, 600, { width: 95, height: 95 });
      doc.font("Times-Roman").fontSize(9).fillColor("#222").text(
        "Scan to verify",
        462,
        698
      );
    } catch (_) { }
  }

  doc.moveDown(4);
  doc.fontSize(12);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 80, 720);
  doc.text(`Certificate ID: ${certificateId}`, 80, 738);
  doc.text("Authorized Signature", 400, 720);
  doc.moveTo(380, 710).lineTo(540, 710).stroke();

  doc.end();

  if (res) {
    return { generated: true };
  }

  return new Promise((resolve, reject) => {
    outputStream.on("finish", () =>
      resolve({ generated: true, filePath })
    );
    outputStream.on("error", (err) => reject(err));
    doc.on("error", (err) => reject(err));
  });
};

export default generatePDF;

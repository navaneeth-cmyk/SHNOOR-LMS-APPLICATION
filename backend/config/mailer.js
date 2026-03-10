import { Resend } from "resend";
if (!process.env.RESEND_API_KEY) {
  console.error("[mailer] RESEND_API_KEY is missing. Email sending will fail.");
}
const resend = new Resend(process.env.RESEND_API_KEY);
export const sendMail = async ({ to, subject, html }) => {
  try {
    const response = await resend.emails.send({
      from: "LMS-SHNOOR@lms.shnoor.com", 
      to,
      subject,
      html,
    });
    return response;
  } catch (error) {
    console.error("Resend Email Error:", {
      to,
      subject,
      message: error?.message,
      name: error?.name,
      statusCode: error?.statusCode,
      code: error?.code,
    });
    throw error;
  }
};

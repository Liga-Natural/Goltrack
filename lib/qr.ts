import QRCode from "qrcode";

export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 240,
    color: { dark: "#0a0a0a", light: "#ffffff00" },
  });
}

import { QRCodeSVG } from "qrcode.react";
import type { FC } from "react";
import type { TotpSetup } from "../auth/api";

/** QR stays on white: dark-on-dark codes don't scan reliably. */
export const TotpQr: FC<{ totp: TotpSetup }> = ({ totp }) => (
  <div className="my-2 flex flex-col items-center gap-3">
    <div className="bg-white p-3">
      <QRCodeSVG value={totp.otpauthUri} size={168} />
    </div>
    <code className="select-all break-all text-center font-mono text-xs text-secondary">
      {totp.secret.match(/.{1,4}/g)?.join(" ")}
    </code>
  </div>
);
